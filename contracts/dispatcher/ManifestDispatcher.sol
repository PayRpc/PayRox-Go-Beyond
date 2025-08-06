// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable}      from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IManifestDispatcher} from "./interfaces/IManifestDispatcher.sol";
import {IDiamondLoupe}       from "./enhanced/interfaces/IDiamondLoupe.sol";
import {OrderedMerkle}       from "../utils/OrderedMerkle.sol";

/**
 * @title ManifestDispatcher (compact)
 * @notice Manifest-routed modular proxy (non-EIP-2535 cuts) with EXTCODEHASH gating.
 * @dev Core functionality only: commit/apply/activate, pause/freeze, minimal Loupe views.
 */
contract ManifestDispatcher is
    IManifestDispatcher,
    IDiamondLoupe,
    AccessControl,
    Pausable,
    ReentrancyGuard
{
    // ───────────────────────────────────────────────────────────────────────────
    // Roles
    // ───────────────────────────────────────────────────────────────────────────
    bytes32 public constant COMMIT_ROLE    = keccak256("COMMIT_ROLE");
    bytes32 public constant APPLY_ROLE     = keccak256("APPLY_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // ───────────────────────────────────────────────────────────────────────────
    // Limits
    // ───────────────────────────────────────────────────────────────────────────
    uint256 private constant MAX_BATCH = 100;
    uint256 private constant MAX_FACET_CODE = 24_576; // EIP-170 limit

    // ───────────────────────────────────────────────────────────────────────────
    // Storage
    // ───────────────────────────────────────────────────────────────────────────

    struct ManifestState {
        bytes32 activeRoot;      // current manifest root
        bytes32 pendingRoot;     // committed (not yet active) root
        uint64  activeEpoch;     // current epoch
        uint64  committedAt;     // when pendingRoot was set
        uint64  activationDelay; // governance delay
        uint64  manifestVersion; // bump on every apply/activate
        bool    frozen;          // one-way lock of governance mutators
    }
    ManifestState public manifest;

    // selector → Route
    mapping(bytes4 => IManifestDispatcher.Route) private _routes;
    // selector registry
    mapping(bytes4 => bool) public registeredSelectors;

    // Loupe-lite registries
    mapping(address => bytes4[]) public facetSelectors;
    address[] private _facetAddresses;
    uint256   public routeCount;

    // ───────────────────────────────────────────────────────────────────────────
    // Errors
    // ───────────────────────────────────────────────────────────────────────────
    error FrozenContract();
    error NoRoute();
    error CodehashMismatch();
    error RootZero();
    error BadEpoch();
    error NoPendingRoot();
    error ActivationNotReady(uint64 earliest, uint64 nowTs);
    error BatchTooLarge(uint256 n);
    error LenMismatch();
    error FacetIsSelf();
    error ZeroAddress();
    error ZeroCodeFacet(address facet);
    error CodeSizeExceeded(address facet, uint256 size);
    error FacetCodeMismatch(address facet, bytes32 expected, bytes32 actual);
    error DuplicateSelector(bytes4 selector);
    error InvalidProof();

    // ───────────────────────────────────────────────────────────────────────────
    // Additional Events (contract-specific)
    // ───────────────────────────────────────────────────────────────────────────
    event ManifestVersionUpdated(uint64 indexed oldVersion, uint64 indexed newVersion);
    event RoutesRemoved(bytes4[] selectors);
    event RouteUpdated(bytes4 indexed selector, address indexed oldFacet, address indexed newFacet);

    // ───────────────────────────────────────────────────────────────────────────
    // Constructor
    // ───────────────────────────────────────────────────────────────────────────
    constructor(address admin, uint64 activationDelaySeconds) {
        if (admin == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMMIT_ROLE, admin);
        _grantRole(APPLY_ROLE, admin);
        _grantRole(EMERGENCY_ROLE, admin);

        manifest.activationDelay = activationDelaySeconds;
        manifest.manifestVersion = 1;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Routing (fallback/receive)
    // ───────────────────────────────────────────────────────────────────────────
    receive() external payable {}

    fallback() external payable whenNotPaused {
        bytes4 selector = msg.sig;
        IManifestDispatcher.Route storage r = _routes[selector];
        address facet = r.facet;
        if (facet == address(0)) revert NoRoute();

        // EXTCODEHASH equality gate on every call
        if (facet.codehash != r.codehash) revert CodehashMismatch();

        assembly {
            calldatacopy(0, 0, calldatasize())
            let ok := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            let sz := returndatasize()
            returndatacopy(0, 0, sz)
            switch ok
            case 0 { revert(0, sz) }
            default { return(0, sz) }
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Views (IManifestDispatcher)
    // ───────────────────────────────────────────────────────────────────────────
    function routes(bytes4 selector) external view override returns (address facet, bytes32 codehash) {
        IManifestDispatcher.Route storage r = _routes[selector];
        return (r.facet, r.codehash);
    }
    function pendingRoot()     external view override returns (bytes32) { return manifest.pendingRoot; }
    function pendingEpoch()    external view override returns (uint64)  { return manifest.activeEpoch + 1; }
    function pendingSince()    external view override returns (uint64)  { return manifest.committedAt; }
    function activeRoot()      external view override returns (bytes32) { return manifest.activeRoot; }
    function activeEpoch()     external view override returns (uint64)  { return manifest.activeEpoch; }
    function activationDelay() external view override returns (uint64)  { return manifest.activationDelay; }
    function frozen()          external view override returns (bool)    { return manifest.frozen; }
    function getManifestVersion() external view returns (uint64) { return manifest.manifestVersion; }
    function getRoute(bytes4 selector) external view returns (address) { return _routes[selector].facet; }
    function getRouteCount() external view returns (uint256) { return routeCount; }
    function verifyManifest(bytes32 manifestHash) external view returns (bool ok, bytes32 current) {
        current = manifest.activeRoot; ok = (manifestHash == current);
    }
    function getManifestInfo()
        external
        view
        override
        returns (IManifestDispatcher.ManifestInfo memory info)
    {
        info = IManifestDispatcher.ManifestInfo({
            hash: manifest.activeRoot,
            version: manifest.manifestVersion,
            timestamp: uint64(block.timestamp),
            selectorCount: routeCount
        });
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Manifest lifecycle
    // ───────────────────────────────────────────────────────────────────────────

    /// @notice Commit a new manifest root for the next epoch (last write wins).
    function commitRoot(bytes32 newRoot, uint64 newEpoch)
        external
        override
        onlyRole(COMMIT_ROLE)
        whenNotPaused
    {
        if (manifest.frozen) revert FrozenContract();
        if (newRoot == bytes32(0)) revert RootZero();
        if (newEpoch != manifest.activeEpoch + 1) revert BadEpoch();

        manifest.pendingRoot = newRoot;
        manifest.committedAt = uint64(block.timestamp);

        emit RootCommitted(newRoot, newEpoch);
    }

    /// @notice Apply route updates proven against the committed root.
    function applyRoutes(
        bytes4[] calldata selectors,
        address[] calldata facetAddrs,
        bytes32[] calldata codehashes,
        bytes32[][] calldata proofs,
        bool[][]   calldata isRight
    )
        external
        override
        onlyRole(APPLY_ROLE)
        whenNotPaused
        nonReentrant
    {
        if (manifest.frozen) revert FrozenContract();
        if (manifest.pendingRoot == bytes32(0)) revert NoPendingRoot();
        uint256 n = selectors.length;
        if (n == 0) return;
        if (n != facetAddrs.length || n != codehashes.length || n != proofs.length || n != isRight.length)
            revert LenMismatch();
        if (n > MAX_BATCH) revert BatchTooLarge(n);

        // de-dupe batch
        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = i + 1; j < n; j++) {
                if (selectors[i] == selectors[j]) revert DuplicateSelector(selectors[i]);
            }
        }

        bytes32 root = manifest.pendingRoot;
        for (uint256 i = 0; i < n; i++) {
            address facet = facetAddrs[i];
            if (facet == address(0)) revert ZeroAddress();
            if (facet == address(this)) revert FacetIsSelf();
            uint256 sz = facet.code.length;
            if (sz == 0) revert ZeroCodeFacet(facet);
            if (sz > MAX_FACET_CODE) revert CodeSizeExceeded(facet, sz);

            // verify leaf against committed root (ordered Merkle)
            bytes32 leaf = OrderedMerkle.leafOfSelectorRoute(selectors[i], facet, codehashes[i]);
            bool ok = OrderedMerkle.verify(proofs[i], isRight[i], root, leaf);
            if (!ok) revert InvalidProof();

            _setRoute(selectors[i], facet, codehashes[i]);
        }

        uint64 oldVer = manifest.manifestVersion;
        manifest.manifestVersion = oldVer + 1;
        emit ManifestVersionUpdated(oldVer, manifest.manifestVersion);
    }

    /// @notice Activate the committed root after the delay.
    function activateCommittedRoot()
        external
        override
        onlyRole(APPLY_ROLE)
        whenNotPaused
    {
        if (manifest.frozen) revert FrozenContract();
        bytes32 pending = manifest.pendingRoot;
        if (pending == bytes32(0)) revert NoPendingRoot();

        uint64 earliest = manifest.committedAt + manifest.activationDelay;
        uint64 nowTs = uint64(block.timestamp);
        if (nowTs < earliest) revert ActivationNotReady(earliest, nowTs);

        manifest.activeRoot = pending;
        manifest.activeEpoch += 1;
        manifest.pendingRoot = bytes32(0);
        manifest.committedAt = 0;

        uint64 oldVer = manifest.manifestVersion;
        manifest.manifestVersion = oldVer + 1;

        emit RootActivated(manifest.activeRoot, manifest.activeEpoch);
        emit ManifestVersionUpdated(oldVer, manifest.manifestVersion);
    }

    /// @notice Emergency removal of routes (audit-visible, does not change active root).
    function removeRoutes(bytes4[] calldata selectors)
        external
        override
        onlyRole(EMERGENCY_ROLE)
        whenNotPaused
    {
        uint256 n = selectors.length;
        if (n > MAX_BATCH) revert BatchTooLarge(n);
        for (uint256 i = 0; i < n; i++) {
            bytes4 sel = selectors[i];
            address oldFacet = _routes[sel].facet;
            if (oldFacet != address(0)) {
                delete _routes[sel];
                if (registeredSelectors[sel]) {
                    registeredSelectors[sel] = false;
                    if (routeCount > 0) routeCount--;
                }
                _removeSelectorFromFacet(oldFacet, sel);
                emit RouteRemoved(sel);
            }
        }
        emit RoutesRemoved(selectors);
    }

    /// @notice Update activation delay (admin).
    function setActivationDelay(uint64 newDelay)
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (manifest.frozen) revert FrozenContract();
        uint64 old = manifest.activationDelay;
        manifest.activationDelay = newDelay;
        emit ActivationDelaySet(old, newDelay);
    }

    /// @notice One-way freeze of governance mutators.
    function freeze()
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (manifest.frozen) revert FrozenContract();
        manifest.frozen = true;
        emit Frozen();
    }

    /// @notice Pause/unpause routing (emergency role).
    function pause()  external override onlyRole(EMERGENCY_ROLE) { _pause(); }
    function unpause() external override onlyRole(EMERGENCY_ROLE) { _unpause(); }

    // ───────────────────────────────────────────────────────────────────────────
    // Minimal Diamond Loupe compatibility
    // ───────────────────────────────────────────────────────────────────────────
    function facetAddresses() external view override returns (address[] memory) {
        return _facetAddresses;
    }
    function facetFunctionSelectors(address facet) external view override returns (bytes4[] memory) {
        return facetSelectors[facet];
    }
    function facetAddress(bytes4 selector) external view override returns (address) {
        return _routes[selector].facet;
    }
    function facets() external view override returns (IDiamondLoupe.Facet[] memory out) {
        uint256 n = _facetAddresses.length;
        out = new IDiamondLoupe.Facet[](n);
        for (uint256 i = 0; i < n; i++) {
            address fa = _facetAddresses[i];
            out[i] = IDiamondLoupe.Facet({ facetAddress: fa, functionSelectors: facetSelectors[fa] });
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ───────────────────────────────────────────────────────────────────────────
    function _setRoute(bytes4 selector, address facet, bytes32 codehash) internal {
        // runtime integrity check
        if (facet.codehash != codehash) revert FacetCodeMismatch(facet, codehash, facet.codehash);

        address oldFacet = _routes[selector].facet;
        _routes[selector] = IManifestDispatcher.Route(facet, codehash);

        // registry book-keeping
        if (!registeredSelectors[selector]) {
            registeredSelectors[selector] = true;
            routeCount++;
            _addSelectorToFacet(facet, selector);
            emit RouteAdded(selector, facet, codehash);
        } else if (oldFacet != facet) {
            _removeSelectorFromFacet(oldFacet, selector);
            _addSelectorToFacet(facet, selector);
            emit RouteUpdated(selector, oldFacet, facet);
        }
    }

    function _addSelectorToFacet(address facet, bytes4 selector) internal {
        bytes4[] storage sels = facetSelectors[facet];
        for (uint256 i = 0; i < sels.length; i++) {
            if (sels[i] == selector) return;
        }
        if (sels.length == 0) {
            // first time we see this facet
            _facetAddresses.push(facet);
        }
        sels.push(selector);
    }

    function _removeSelectorFromFacet(address facet, bytes4 selector) internal {
        bytes4[] storage sels = facetSelectors[facet];
        for (uint256 i = 0; i < sels.length; i++) {
            if (sels[i] == selector) {
                sels[i] = sels[sels.length - 1];
                sels.pop();
                break;
            }
        }
        // drop facet if empty
        if (sels.length == 0) {
            uint256 n = _facetAddresses.length;
            for (uint256 i = 0; i < n; i++) {
                if (_facetAddresses[i] == facet) {
                    _facetAddresses[i] = _facetAddresses[n - 1];
                    _facetAddresses.pop();
                    break;
                }
            }
        }
    }
}

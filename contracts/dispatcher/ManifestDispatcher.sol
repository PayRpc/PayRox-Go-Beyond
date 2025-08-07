// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable}      from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
<<<<<<< HEAD
import {IManifestDispatcher} from "../interfaces/IManifestDispatcher.sol";
import {IDiamondLoupe} from "./enhanced/interfaces/IDiamondLoupe.sol";
import {OrderedMerkle} from "../utils/OrderedMerkle.sol";
import {GasOptimizationUtils} from "../utils/GasOptimizationUtils.sol";
=======

import {IManifestDispatcher} from "./interfaces/IManifestDispatcher.sol";
import {IDiamondLoupe}       from "./enhanced/interfaces/IDiamondLoupe.sol";
import {OrderedMerkle}       from "../utils/OrderedMerkle.sol";
>>>>>>> Phase-3

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
<<<<<<< HEAD
    mapping(address => bytes4[]) public facetSelectors; // AI: Initialized in constructor
    bool private _initialized;
    address[] public facetAddressList;
    uint256 public routeCount;
    
    // Additional storage for contract tracking
    mapping(address => bool) public isDeployedContract;
    mapping(bytes32 => address) public chunkOf;

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS (Additional contract-specific events only - interface events inherited)
    // ═══════════════════════════════════════════════════════════════════════════
    event RootUpdated(bytes32 indexed manifestHash, uint256 routeCount); // bypass flow
    event DiamondCut(IDiamondLoupe.FacetCut[] diamondCut);
    event ReturnDataSizeUpdated(uint256 oldSize, uint256 newSize);
    event RoutesBatchApplied(uint256 batchCount, uint256 totalRoutes, uint256 gasUsed, uint256 timestamp);
=======

    // Loupe-lite registries
    mapping(address => bytes4[]) public facetSelectors;
    address[] private _facetAddresses;
    uint256   public routeCount;
>>>>>>> Phase-3

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
<<<<<<< HEAD
                delete _routes[selectors[i]];
                registeredSelectors[selectors[i]] = false;
                if (routeCount > 0) routeCount--;
                _removeSelectorFromFacet(oldFacet, selectors[i]);
                emit RouteRemoved(selectors[i]);
=======
                delete _routes[sel];
                if (registeredSelectors[sel]) {
                    registeredSelectors[sel] = false;
                    if (routeCount > 0) routeCount--;
                }
                _removeSelectorFromFacet(oldFacet, sel);
                emit RouteRemoved(sel);
>>>>>>> Phase-3
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
<<<<<<< HEAD

    /// @notice Decode a single entry from manifest data
    /// @dev Utility function for parsing packed manifest format (4 bytes selector + 20 bytes address)
    function _decodeEntry(bytes calldata data, uint256 index)
        internal pure returns (bytes4 selector, address facet)
    {
        if (data.length < (index + 1) * ENTRY_SIZE) revert InvalidManifestFormat();

        uint256 offset = index * ENTRY_SIZE;
        assembly {
            selector := shr(224, calldataload(add(data.offset, offset)))
            facet := shr(96, calldataload(add(add(data.offset, offset), 4)))
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS & ACCESS CONTROL
    // ═══════════════════════════════════════════════════════════════════════════
    modifier onlyGovernance() {
        if (msg.sender != govState.governance) revert Unauthorized(msg.sender);
        _;
    }

    modifier onlyGuardian() {
        if (msg.sender != govState.guardian) revert Unauthorized(msg.sender);
        _;
    }

    modifier whenNotFrozen() {
        if (manifestState.frozen) revert FrozenError();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EXTERNAL API (Ordered to match IManifestDispatcher interface)
    // ═══════════════════════════════════════════════════════════════════════════

    // ───────────────────── Read-only views ─────────────────────

    /// from interface: returns (address facet, bytes32 codehash);
    function routes(bytes4 selector)
        external
        view
        override
        returns (address facet, bytes32 codehash)
    {
        IManifestDispatcher.Route storage route = _routes[selector];
        return (route.facet, route.codehash);
    }

    /// from interface: pendingRoot()
    function pendingRoot()
        external
        view
        override
        returns (bytes32)
    {
        return manifestState.committedRoot;
    }

    /// from interface: pendingEpoch()
    function pendingEpoch()
        external
        view
        override
        returns (uint64)
    {
        return manifestState.activeEpoch + 1;
    }

    /// from interface: pendingSince()
    function pendingSince()
        external
        view
        override
        returns (uint64)
    {
        return manifestState.committedAt;
    }

    /// from interface: activeRoot()
    function activeRoot()
        external
        view
        override
        returns (bytes32)
    {
        return manifestState.activeRoot;
    }

    /// from interface: activeEpoch()
    function activeEpoch()
        external
        view
        override
        returns (uint64)
    {
        return manifestState.activeEpoch;
    }

    /// from interface: activationDelay()
    function activationDelay()
        external
        view
        override
        returns (uint64)
    {
        return manifestState.minDelay;
    }

    /// from interface: frozen()
    function frozen()
        external
        view
        override
        returns (bool)
    {
        return manifestState.frozen;
    }

    /// from interface: getManifestVersion()
    function getManifestVersion()
        external
        view
        override
        returns (uint64)
    {
        return manifestState.manifestVersion;
    }

    /// from interface: getRoute(bytes4)
    function getRoute(bytes4 selector)
        external
        view
        override
        returns (address facet)
    {
        return _routes[selector].facet;
    }

    /// from interface: getRouteCount()
    function getRouteCount()
        external
        view
        override
        returns (uint256)
    {
        return routeCount;
    }

    /// from interface: verifyManifest(bytes32)
    function verifyManifest(bytes32 manifestHash)
        external
        view
        override
        returns (bool valid, bytes32 currentHash)
    {
        return (manifestHash == manifestState.activeRoot, manifestState.activeRoot);
    }

    /// from interface: getManifestInfo()
    function getManifestInfo()
        external
        view
        override
        returns (IManifestDispatcher.ManifestInfo memory info)
    {
        return IManifestDispatcher.ManifestInfo({
            hash:      manifestState.activeRoot,
            version:   manifestState.manifestVersion,
            timestamp: block.timestamp /* TIMESTAMP_WARNING: Consider using block.number for time-sensitive logic */,
            selectorCount: routeCount
        });
    }

    // ───────────────── Manifest governance ───────────────────────

    /// from interface: commitRoot(bytes32,uint64)
    function commitRoot(bytes32 newRoot, uint64 newEpoch)
        external
        override
        onlyRole(COMMIT_ROLE)
        whenNotPaused
    {
        _commitRoot(newRoot, newEpoch);
    }

    /// from interface: applyRoutes(...)
    function applyRoutes(
        bytes4[] calldata selectors,
        address[] calldata facetList,
        bytes32[] calldata codehashes,
        bytes32[][] calldata proofs,
        bool[][] calldata isRight
    )
        external
        override
        onlyRole(APPLY_ROLE)
        whenNotPaused
        nonReentrant
    {
        _applyRoutes(selectors, facetList, codehashes, proofs, isRight);
    }

    /// @notice Apply multiple batches of routes in a single transaction for gas optimization
    /// @dev Uses GasOptimizationUtils for efficient batch processing
    /// @param batchSelectors Array of selector arrays for each batch
    /// @param batchFacets Array of facet address arrays for each batch
    /// @param batchCodehashes Array of codehash arrays for each batch
    /// @param batchProofs Array of proof arrays for each batch
    /// @param batchIsRight Array of isRight arrays for each batch
    function applyRoutesBatch(
        bytes4[][] calldata batchSelectors,
        address[][] calldata batchFacets,
        bytes32[][] calldata batchCodehashes,
        bytes32[][][] calldata batchProofs,
        bool[][][] calldata batchIsRight
    )
        external
        onlyRole(APPLY_ROLE)
        whenNotPaused
        nonReentrant
    {
        uint256 batchCount = batchSelectors.length;
        require(batchCount > 0, "ManifestDispatcher: empty batch");
        require(batchCount <= MAX_BATCH_SIZE, "ManifestDispatcher: batch too large");
        require(
            batchFacets.length == batchCount &&
            batchCodehashes.length == batchCount &&
            batchProofs.length == batchCount &&
            batchIsRight.length == batchCount,
            "ManifestDispatcher: batch length mismatch"
        );

        uint256 totalRoutes = 0;
        uint256 gasBefore = gasleft();

        // Apply each batch of routes
        for (uint256 i = 0; i < batchCount; i++) {
            _applyRoutes(
                batchSelectors[i],
                batchFacets[i],
                batchCodehashes[i],
                batchProofs[i],
                batchIsRight[i]
            );
            totalRoutes += batchSelectors[i].length;
        }

        uint256 gasUsed = gasBefore - gasleft();
        
        emit RoutesBatchApplied(batchCount, totalRoutes, gasUsed, block.timestamp);
    }

    /// from interface: updateManifest(bytes32,bytes)
    function updateManifest(
        bytes32 manifestHash,
        bytes calldata manifestData
    )
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenNotPaused
        whenNotFrozen
        nonReentrant
    {
        _updateManifestDirect(manifestHash, manifestData);
    }

    /// from interface: routeCall(bytes)
    function routeCall(bytes calldata data)
        external
        payable
        override
        whenNotPaused
        returns (bytes memory)
    {
        return _routeCall(data);
    }

    /// from interface: activateCommittedRoot()
    function activateCommittedRoot()
        external
        override
        onlyRole(APPLY_ROLE)
        whenNotPaused
    {
        _activateRoot();
    }

    // ────────────────── Emergency / configuration ──────────────

    /// from interface: removeRoutes(bytes4[])
    function removeRoutes(bytes4[] calldata selectors)
        external
        override
        onlyRole(EMERGENCY_ROLE)
        whenNotPaused
    {
        _removeRoutes(selectors);
    }

    /// from interface: setActivationDelay(uint64)
    function setActivationDelay(uint64 newDelay)
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _setActivationDelay(newDelay);
    }

    /// from interface: freeze()
    function freeze()
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _freeze();
    }

    // ────────────────── Operational control ─────────────────────

    /// from interface: pause()
    function pause()
        external
        override
        onlyRole(EMERGENCY_ROLE)
    {
        _pause();
    }

    /// from interface: unpause()
    function unpause()
        external
        override
        onlyRole(EMERGENCY_ROLE)
    {
        _unpause();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADDITIONAL SYSTEM FUNCTIONS (Not part of interface)
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Get comprehensive system status
    function getSystemStatus() external view returns (
        bytes32 activeRoot_,
        uint64 activeEpoch_,
        uint64 manifestVersion_,
        uint256 routeCount_,
        uint256 facetCount_,
        bool frozen_,
        bool paused_,
        bytes32 committedHash_,
        uint64 committedAt_
    ) {
        ManifestState storage ms = manifestState;

        return (
            ms.activeRoot,
            ms.activeEpoch,
            ms.manifestVersion,
            routeCount,
            facetAddressList.length,
            ms.frozen,
            paused(),
            ms.committedRoot,
            ms.committedAt
        );
    }

    /// @notice Get operational capabilities based on current state
    /// @dev Helps UIs understand what operations are currently allowed
    function getOperationalState() external view returns (
        bool canCommit,
        bool canActivate,
        bool canApplyRoutes,
        bool canUpdateManifest,
        bool canRemoveRoutes,
        bool canRoute,
        string memory state
    ) {
        ManifestState storage ms = manifestState;
        bool isPaused = paused();
        bool isFrozen = ms.frozen;

        if (isPaused && isFrozen) {
            return (false, false, false, false, true, false, "PAUSED_AND_FROZEN");
        } else if (isPaused) {
            return (false, false, false, false, true, false, "PAUSED");
        } else if (isFrozen) {
            return (false, false, false, false, true, true, "FROZEN");
        } else {
            return (true, true, true, true, true, true, "OPERATIONAL");
        }
    }

    /// @notice Get operational capabilities (booleans only - gas optimized for frequent polling)
    /// @dev Ultra-cheap version for UIs that poll frequently
    function getOperationalFlags() external view returns (
        bool canCommit,
        bool canActivate,
        bool canApplyRoutes,
        bool canUpdateManifest,
        bool canRemoveRoutes,
        bool canRoute
    ) {
        ManifestState storage ms = manifestState;
        bool isPaused = paused();
        bool isFrozen = ms.frozen;

        if (isPaused && isFrozen) {
            return (false, false, false, false, true, false);
        } else if (isPaused) {
            return (false, false, false, false, true, false);
        } else if (isFrozen) {
            return (false, false, false, false, true, true);
        } else {
            return (true, true, true, true, true, true);
        }
    }

    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ENHANCED DIAMOND LOUPE IMPLEMENTATION (100% EIP-2535 COMPATIBILITY)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get detailed facet information with metadata
     * @param facetAddr Address of the facet to query
     * @return facetInfo Detailed facet information
     */
    function getFacetInfo(address facetAddr) external view returns (FacetInfo memory facetInfo) {
        bytes4[] memory selectors = facetSelectors[facetAddr];
        require(selectors.length > 0, "ManifestDispatcher: facet not found");
        
        facetInfo = FacetInfo({
            facetAddress: facetAddr,
            functionSelectors: selectors,
            isActive: true,
            addedAt: block.timestamp /* TIMESTAMP_WARNING: Consider using block.number for time-sensitive logic */, // Would be tracked in real implementation
            version: "1.0.0",
            codeHash: facetAddr.codehash
        });
    }
    
    /**
     * @notice Get comprehensive system statistics
     * @return stats System statistics
     */
    function getSystemStats() external view returns (SystemStats memory stats) {
        stats = SystemStats({
            totalFacets: facetAddressList.length,
            totalSelectors: routeCount,
            manifestVersion: manifestState.manifestVersion,
            activeEpoch: manifestState.activeEpoch,
            isFrozen: manifestState.frozen,
            totalRoutes: routeCount
        });
    }
    
    /**
     * @notice Check if a function selector is registered
     * @param selector Function selector to check
     * @return isRegistered Whether the selector is registered
     * @return facetAddr Address of the facet handling this selector
     */
    function isSelectorRegistered(bytes4 selector) external view returns (bool isRegistered, address facetAddr) {
        isRegistered = registeredSelectors[selector];
        facetAddr = _routes[selector].facet;
    }
    
    /**
     * @notice Get facet addresses with pagination
     * @param offset Starting index
     * @param limit Maximum number to return
     * @return addresses Array of facet addresses
     * @return total Total number of facets
     */
    function getFacetAddressesPaginated(uint256 offset, uint256 limit) 
        external 
        view 
        returns (address[] memory addresses, uint256 total) 
    {
        total = facetAddressList.length;
        
        if (offset >= total) {
            return (new address[](0), total);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        addresses = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            addresses[i - offset] = facetAddressList[i];
        }
    }

    // Additional structs for enhanced Diamond Loupe
    struct FacetInfo {
        address facetAddress;
        bytes4[] functionSelectors;
        bool isActive;
        uint256 addedAt;
        string version;
        bytes32 codeHash;
    }
    
    struct SystemStats {
        uint256 totalFacets;
        uint256 totalSelectors;
        uint64 manifestVersion;
        uint64 activeEpoch;
        bool isFrozen;
        uint256 totalRoutes;
    }
}
=======
}
>>>>>>> Phase-3

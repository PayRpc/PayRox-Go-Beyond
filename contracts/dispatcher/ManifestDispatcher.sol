// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IManifestDispatcher} from "./interfaces/IManifestDispatcher.sol";
import {IDiamondLoupe} from "./enhanced/interfaces/IDiamondLoupe.sol";
import {OrderedMerkle} from "../utils/OrderedMerkle.sol";

/**
 * @title ManifestDispatcher
 * @notice Enterprise-grade dispatcher with Diamond upgradeability, MEV resistance,
 *         and manifest security. Optimized for Layer 2 efficiency.
 * @dev Streamlined implementation focused on core functionality:
 * - Diamond Standard (EIP-2535) proxy pattern
 * - Manifest-based route management with cryptographic verification
 * - Timelock governance with guardian controls
 * - Gas-optimized fallback routing with security checks
 * - Batch operations with duplicate protection
 */
contract ManifestDispatcher is
    IManifestDispatcher,
    IDiamondLoupe,
    AccessControl,
    Pausable,
    ReentrancyGuard
{
    // Remove unused cryptography imports

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS & LIMITS
    // ═══════════════════════════════════════════════════════════════════════════
    bytes32 public constant COMMIT_ROLE     = keccak256("COMMIT_ROLE");
    bytes32 public constant APPLY_ROLE      = keccak256("APPLY_ROLE");
    bytes32 public constant EMERGENCY_ROLE  = keccak256("EMERGENCY_ROLE");
    bytes32 public constant EXECUTOR_ROLE   = keccak256("EXECUTOR_ROLE");

    uint256 public constant MAX_MANIFEST_SIZE = 24_000; // 24KB limit
    uint256 public constant ENTRY_SIZE = 24; // 4 bytes selector + 20 bytes address
    uint256 public constant MAX_BATCH_SIZE = 100; // Prevent DoS via large batches
    uint256 public constant MIN_DELAY = 1 hours;
    uint256 public constant MAX_DELAY = 30 days;

    // Configurable return data limit (can be updated by governance)
    uint256 public maxReturnDataSize = 32_768; // 32KB default

    // ═══════════════════════════════════════════════════════════════════════════
    // STORAGE (Gas-optimized layout for L2)
    // ═══════════════════════════════════════════════════════════════════════════

    // Manifest state (packed for gas efficiency)
    struct ManifestState {
        bytes32 activeRoot;
        bytes32 committedRoot;
        uint64 activeEpoch;
        uint64 committedAt;
        uint64 manifestVersion;
        uint64 minDelay;
        bool frozen;
    }
    ManifestState public manifestState;

    // Governance state
    struct GovernanceState {
        address governance;
        address guardian;
        address pendingGov;
        uint64 etaGov;
    }
    GovernanceState public govState;

    // Diamond compatibility - simplified
    mapping(bytes4 => IManifestDispatcher.Route) private _routes;
    mapping(bytes4 => bool) public registeredSelectors;
    mapping(address => bytes4[]) public facetSelectors;
    address[] public facetAddressList;
    uint256 public routeCount;

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS (Additional contract-specific events only - interface events inherited)
    // ═══════════════════════════════════════════════════════════════════════════
    event RootUpdated(bytes32 indexed manifestHash, uint256 routeCount); // bypass flow
    event DiamondCut(IDiamondLoupe.FacetCut[] diamondCut);
    event ReturnDataSizeUpdated(uint256 oldSize, uint256 newSize);

    // ═══════════════════════════════════════════════════════════════════════════
    // CUSTOM ERRORS (Gas-efficient over revert strings)
    // ═══════════════════════════════════════════════════════════════════════════
    error FrozenError();
    error NoRoute();
    error CodehashMismatch();
    error InvalidSelector();
    error DuplicateSelector(bytes4 selector);
    error BatchTooLarge(uint256 size);
    error ManifestMismatch(bytes32 expected, bytes32 actual);
    error AlreadyApplied(bytes32 hash);
    error HashNotCommitted(bytes32 hash);
    error Unauthorized(address caller);
    error InvalidDelay(uint256 delay);
    error RotationNotReady(uint64 eta, uint64 current);
    error AlreadyPending();
    error InvalidManifest();
    error FacetCodeMismatch(address facet, bytes32 expected, bytes32 actual);
    error ReturnDataTooLarge(uint256 size);
    error CodeSizeExceeded(address facet, uint256 size);
    error ZeroCodeFacet(address facet);
    error InvalidManifestFormat();
    error ManifestTooLarge(uint256 size);
    error RootZero();
    error BadEpoch();
    error NoPendingRoot();
    error ActivationNotReady(uint64 earliestActivation, uint64 currentTime);
    error LenMismatch();
    error FacetIsSelf();
    error ZeroAddress();
    error InvalidProof();

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    constructor(
        address _governance,
        address _guardian,
        uint256 _minDelay
    ) {
        if (_governance == address(0)) revert ZeroAddress();
        if (_guardian == address(0)) revert ZeroAddress();
        if (_minDelay > MAX_DELAY) revert InvalidDelay(_minDelay);

        // Initialize governance state
        govState = GovernanceState({
            governance: _governance,
            guardian: _guardian,
            pendingGov: address(0),
            etaGov: 0
        });

        // Initialize manifest state
        manifestState = ManifestState({
            activeRoot: bytes32(0),
            committedRoot: bytes32(0),
            activeEpoch: 0,
            committedAt: 0,
            manifestVersion: 1,
            minDelay: uint64(_minDelay),
            frozen: false
        });

        // Grant initial roles
        _grantRole(DEFAULT_ADMIN_ROLE, _governance);
        _grantRole(COMMIT_ROLE, _governance);
        _grantRole(APPLY_ROLE, _governance);
        _grantRole(EMERGENCY_ROLE, _guardian);
        _grantRole(EXECUTOR_ROLE, _governance);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GOVERNANCE & UTILITIES (Simplified)
    // ═══════════════════════════════════════════════════════════════════════════
    function queueRotateGovernance(address newGov) external onlyGovernance {
        GovernanceState storage gs = govState;
        if (newGov == address(0)) revert ZeroAddress();
        if (gs.pendingGov != address(0)) revert AlreadyPending();
        gs.pendingGov = newGov;
        gs.etaGov = uint64(block.timestamp + manifestState.minDelay);
        emit GovernanceRotationQueued(newGov, gs.etaGov);
    }

    function executeRotateGovernance() external {
        GovernanceState storage gs = govState;
        if (gs.pendingGov == address(0)) revert Unauthorized(msg.sender);
        if (block.timestamp < gs.etaGov) revert RotationNotReady(gs.etaGov, uint64(block.timestamp));
        address oldGov = gs.governance;
        gs.governance = gs.pendingGov;
        _revokeRole(DEFAULT_ADMIN_ROLE, oldGov);
        _revokeRole(COMMIT_ROLE, oldGov);
        _revokeRole(APPLY_ROLE, oldGov);
        _revokeRole(EXECUTOR_ROLE, oldGov);
        _grantRole(DEFAULT_ADMIN_ROLE, gs.governance);
        _grantRole(COMMIT_ROLE, gs.governance);
        _grantRole(APPLY_ROLE, gs.governance);
        _grantRole(EXECUTOR_ROLE, gs.governance);
        gs.pendingGov = address(0);
        gs.etaGov = 0;
        emit GovernanceRotated(oldGov, gs.governance);
    }

    function guardianPause() external onlyGuardian {
        _pause();
        emit GuardianAction(govState.guardian, "pause", uint64(block.timestamp));
    }

    function setMaxReturnDataSize(uint256 newSize) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (manifestState.frozen) revert FrozenError();
        if (newSize == 0 || newSize > 1_000_000) revert InvalidDelay(newSize);
        uint256 old = maxReturnDataSize;
        maxReturnDataSize = newSize;
        emit ReturnDataSizeUpdated(old, newSize);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PREFLIGHT VALIDATION
    // ═══════════════════════════════════════════════════════════════════════════
    enum PreflightError {
        OK, TOO_LARGE, BAD_FORMAT, INVALID_SELECTOR,
        ZERO_FACET_ADDRESS, FACET_IS_SELF, ZERO_CODE_FACET, CODE_SIZE_EXCEEDED
    }

    function preflightManifest(bytes calldata manifestData)
        external view returns (bool valid, uint256 entryCount, PreflightError error)
    {
        if (manifestData.length > MAX_MANIFEST_SIZE) return (false, 0, PreflightError.TOO_LARGE);
        if (manifestData.length % ENTRY_SIZE != 0) return (false, 0, PreflightError.BAD_FORMAT);

        entryCount = manifestData.length / ENTRY_SIZE;
        for (uint256 i = 0; i < entryCount; i++) {
            (bytes4 selector, address facet) = _decodeEntry(manifestData, i);
            if (selector == bytes4(0)) return (false, 0, PreflightError.INVALID_SELECTOR);
            if (facet == address(0)) return (false, 0, PreflightError.ZERO_FACET_ADDRESS);
            if (facet == address(this)) return (false, 0, PreflightError.FACET_IS_SELF);
            if (facet.code.length == 0) return (false, 0, PreflightError.ZERO_CODE_FACET);
            if (facet.code.length > 24_576) return (false, 0, PreflightError.CODE_SIZE_EXCEEDED);
        }
        return (true, entryCount, PreflightError.OK);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DIAMOND PROXY CORE
    // ═══════════════════════════════════════════════════════════════════════════
    fallback() external payable whenNotPaused {
        bytes4 selector = msg.sig;
        IManifestDispatcher.Route storage route = _routes[selector];
        address facet = route.facet;
        if (facet == address(0)) revert NoRoute();
        if (facet.codehash != route.codehash) revert CodehashMismatch();

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            let size := returndatasize()
            let limit := sload(maxReturnDataSize.slot)
            if gt(size, limit) {
                mstore(0, 0x5a8fbb2e) // ReturnDataTooLarge(uint256)
                mstore(4, size)
                revert(0, 36)
            }
            returndatacopy(0, 0, size)
            switch result
            case 0 { revert(0, size) }
            default { return(0, size) }
        }
    }

    receive() external payable {}

    // ═══════════════════════════════════════════════════════════════════════════
    // DIAMOND LOUPE INTERFACE
    // ═══════════════════════════════════════════════════════════════════════════
    function facetAddresses() external view override returns (address[] memory) { return facetAddressList; }
    function facetFunctionSelectors(address facet) external view override returns (bytes4[] memory) { return facetSelectors[facet]; }
    function facetAddress(bytes4 selector) external view override returns (address) { return _routes[selector].facet; }
    function facets() external view override returns (IDiamondLoupe.Facet[] memory) {
        IDiamondLoupe.Facet[] memory facets_ = new IDiamondLoupe.Facet[](facetAddressList.length);
        for (uint256 i = 0; i < facetAddressList.length; i++) {
            facets_[i] = IDiamondLoupe.Facet({
                facetAddress: facetAddressList[i],
                functionSelectors: facetSelectors[facetAddressList[i]]
            });
        }
        return facets_;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL HELPERS (Consolidated)
    // ═══════════════════════════════════════════════════════════════════════════
    function _commitRoot(bytes32 newRoot, uint64 newEpoch) internal {
        ManifestState storage ms = manifestState;
        if (ms.frozen) revert FrozenError();
        if (newRoot == bytes32(0)) revert RootZero();
        if (newEpoch != ms.activeEpoch + 1) revert BadEpoch();
        ms.committedRoot = newRoot;
        ms.committedAt = uint64(block.timestamp);
        emit RootCommitted(newRoot, newEpoch);
    }

    function _applyRoutes(bytes4[] calldata selectors, address[] calldata facets, bytes32[] calldata codehashes, bytes32[][] calldata proofs, bool[][] calldata isRight) internal whenNotFrozen {
        ManifestState storage ms = manifestState;
        if (ms.frozen) revert FrozenError();
        if (ms.committedRoot == bytes32(0)) revert NoPendingRoot();
        if (selectors.length != facets.length || facets.length != codehashes.length) revert LenMismatch();
        if (selectors.length > MAX_BATCH_SIZE) revert BatchTooLarge(selectors.length);

        for (uint256 i = 0; i < selectors.length; i++) {
            for (uint256 j = i + 1; j < selectors.length; j++) {
                if (selectors[i] == selectors[j]) revert DuplicateSelector(selectors[i]);
            }
        }

        for (uint256 i = 0; i < selectors.length; i++) {
            bytes32 leaf = OrderedMerkle.leafOfSelectorRoute(selectors[i], facets[i], codehashes[i]);
            if (!OrderedMerkle.verify(proofs[i], isRight[i], ms.committedRoot, leaf)) revert InvalidProof();
            _updateRoute(selectors[i], facets[i], codehashes[i]);
        }
        emit ManifestVersionUpdated(ms.manifestVersion, ms.manifestVersion + 1);
        ms.manifestVersion++;
    }

    function _updateManifestDirect(bytes32 manifestHash, bytes calldata manifestData) internal {
        ManifestState storage ms = manifestState;
        if (ms.frozen) revert FrozenError();
        if (manifestData.length > MAX_MANIFEST_SIZE) revert ManifestTooLarge(manifestData.length);
        if (manifestData.length % ENTRY_SIZE != 0) revert InvalidManifestFormat();

        uint256 entryCount = manifestData.length / ENTRY_SIZE;
        if (entryCount > MAX_BATCH_SIZE) revert BatchTooLarge(entryCount);

        for (uint256 i = 0; i < entryCount; i++) {
            (bytes4 selector, address facet) = _decodeEntry(manifestData, i);
            _updateRoute(selector, facet, facet.codehash);
        }

        uint64 oldVer = ms.manifestVersion;
        ms.activeRoot = manifestHash;
        ms.manifestVersion = oldVer + 1;
        emit RootUpdated(manifestHash, entryCount);
        emit ManifestApplied(manifestHash, entryCount);
        emit ManifestVersionUpdated(oldVer, ms.manifestVersion);
    }

    function _routeCall(bytes calldata data) internal returns (bytes memory) {
        if (data.length < 4) revert InvalidSelector();
        bytes4 selector = bytes4(data[:4]);
        IManifestDispatcher.Route storage route = _routes[selector];
        address facet = route.facet;
        if (facet == address(0)) revert NoRoute();
        if (facet.codehash != route.codehash) revert CodehashMismatch();

        (bool success, bytes memory returnData) = facet.delegatecall(data);
        if (returnData.length > maxReturnDataSize) revert ReturnDataTooLarge(returnData.length);
        if (!success) {
            assembly { revert(add(returnData, 32), mload(returnData)) }
        }
        return returnData;
    }

    function _activateRoot() internal {
        ManifestState storage ms = manifestState;
        if (ms.frozen) revert FrozenError();
        if (ms.committedRoot == bytes32(0)) revert NoPendingRoot();
        if (ms.minDelay != 0) {
            uint64 earliestActivation = ms.committedAt + ms.minDelay;
            if (block.timestamp < earliestActivation) revert ActivationNotReady(earliestActivation, uint64(block.timestamp));
        }

        uint64 oldVer = ms.manifestVersion;
        ms.activeRoot = ms.committedRoot;
        ms.activeEpoch += 1;
        ms.manifestVersion = oldVer + 1;
        ms.committedRoot = bytes32(0);
        ms.committedAt = 0;
        emit RootActivated(ms.activeRoot, ms.activeEpoch);
        emit ManifestVersionUpdated(oldVer, ms.manifestVersion);
    }

    function _removeRoutes(bytes4[] calldata selectors) internal {
        if (selectors.length > MAX_BATCH_SIZE) revert BatchTooLarge(selectors.length);
        for (uint256 i = 0; i < selectors.length; i++) {
            address oldFacet = _routes[selectors[i]].facet;
            if (oldFacet != address(0)) {
                delete _routes[selectors[i]];
                registeredSelectors[selectors[i]] = false;
                if (routeCount > 0) routeCount--;
                _removeSelectorFromFacet(oldFacet, selectors[i]);
                emit RouteRemoved(selectors[i], oldFacet);
            }
        }
    }

    function _setActivationDelay(uint64 newDelay) internal {
        if (manifestState.frozen) revert FrozenError();
        if (newDelay > MAX_DELAY) revert InvalidDelay(newDelay);
        uint64 old = manifestState.minDelay;
        manifestState.minDelay = newDelay;
        emit ActivationDelaySet(old, newDelay);
    }

    function _freeze() internal {
        if (manifestState.frozen) revert FrozenError();
        manifestState.frozen = true;
        emit Frozen();
    }

    function _updateRoute(bytes4 selector, address facet, bytes32 codehash) internal {
        if (facet == address(this)) revert FacetIsSelf();
        if (facet == address(0)) revert ZeroAddress();
        if (facet.code.length == 0) revert ZeroCodeFacet(facet);
        if (facet.code.length > 24_576) revert CodeSizeExceeded(facet, facet.code.length);

        // Validate codehash matches current code
        if (facet.codehash != codehash) {
            revert FacetCodeMismatch(facet, codehash, facet.codehash);
        }

        address oldFacet = _routes[selector].facet;
        _routes[selector] = IManifestDispatcher.Route(facet, codehash);

        // Update selector registry
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
        bytes4[] storage selectors = facetSelectors[facet];

        // Check if selector already exists for this facet (prevent duplicate registration)
        for (uint256 i = 0; i < selectors.length; i++) {
            if (selectors[i] == selector) return; // Already registered
        }
        selectors.push(selector);

        // Add facet to list if new
        bool facetExists = false;
        for (uint256 i = 0; i < facetAddressList.length; i++) {
            if (facetAddressList[i] == facet) {
                facetExists = true;
                break;
            }
        }
        if (!facetExists) {
            facetAddressList.push(facet);
        }
    }

    function _removeSelectorFromFacet(address facet, bytes4 selector) internal {
        bytes4[] storage selectors = facetSelectors[facet];

        for (uint256 i = 0; i < selectors.length; i++) {
            if (selectors[i] == selector) {
                selectors[i] = selectors[selectors.length - 1];
                selectors.pop();
                break;
            }
        }

        // Remove facet from list if no selectors left
        if (selectors.length == 0) {
            for (uint256 i = 0; i < facetAddressList.length; i++) {
                if (facetAddressList[i] == facet) {
                    facetAddressList[i] = facetAddressList[facetAddressList.length - 1];
                    facetAddressList.pop();
                    break;
                }
            }
        }
    }

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
            timestamp: block.timestamp,
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
        address[] calldata facets,
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
        _applyRoutes(selectors, facets, codehashes, proofs, isRight);
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
}

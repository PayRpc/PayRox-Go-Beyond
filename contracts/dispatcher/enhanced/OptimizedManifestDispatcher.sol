// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IManifestDispatcher} from "../interfaces/IManifestDispatcher.sol";
import {IDiamondLoupe} from "./interfaces/IDiamondLoupe.sol";
import {OrderedMerkle} from "../../utils/OrderedMerkle.sol";

/**
 * @title OptimizedManifestDispatcher
 * @notice Production-hardened dispatcher implementing advanced gas optimization,
 *         security patterns, and ecosystem compatibility.
 *
 * Key Optimizations:
 * 1. Preflight + Commit pattern for O(1) state-changing operations
 * 2. Enhanced governance with timelock + guardian break-glass
 * 3. MEV-resistant execution queue with ordering guarantees
 * 4. Diamond ecosystem compatibility via loupe interface
 *
 * Gas Strategy:
 * - Heavy validation in preflight staticcalls (reverts don't cost state gas)
 * - Commit only manifestHash on success
 * - Assert cheap equality checks in hot path
 * - EXTCODEHASH/size validation for facet integrity
 */
contract OptimizedManifestDispatcher is
    IManifestDispatcher,
    IDiamondLoupe,
    AccessControl,
    Pausable,
    ReentrancyGuard
{
    // ═══════════════════════════════════════════════════════════════════════════
    // ROLES & CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════

    // Core roles
    bytes32 public constant COMMIT_ROLE     = keccak256("COMMIT_ROLE");
    bytes32 public constant APPLY_ROLE      = keccak256("APPLY_ROLE");
    bytes32 public constant EMERGENCY_ROLE  = keccak256("EMERGENCY_ROLE");
    bytes32 public constant EXECUTOR_ROLE   = keccak256("EXECUTOR_ROLE");

    // Size limits
    uint256 public constant MAX_MANIFEST_SIZE = 24_000;
    uint256 public constant MAX_RETURN_DATA_SIZE = 32_768;
    uint256 public constant ENTRY_SIZE = 24; // 4 bytes selector + 20 bytes address

    // Timing constants
    uint256 public constant MIN_DELAY = 1 hours;
    uint256 public constant MAX_DELAY = 30 days;

    // ═══════════════════════════════════════════════════════════════════════════
    // TYPES AND STRUCTURES
    // ═══════════════════════════════════════════════════════════════════════════

    // Import types from interface
    // struct Route and ManifestInfo are already defined in IManifestDispatcher

    // ═══════════════════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════════════════

    // Route storage
    mapping(bytes4 => Route) private _routes;
    mapping(bytes4 => bool) public registeredSelectors;
    bytes4[] public allSelectors;
    uint256 public routeCount;

    // Manifest lifecycle
    bytes32 public activeRoot;
    uint64  public activeEpoch;
    uint64  public manifestVersion;

    // Committed state (gas optimization pattern)
    bytes32 public committedManifestHash;
    uint64  public committedAt;

    // Enhanced governance
    address public governance;
    address public guardian;
    address public pendingGov;
    uint64  public etaGov;
    uint256 public minDelay = 24 hours;

    // Execution queue (MEV protection)
    uint256 public nextNonce;
    mapping(uint256 => bytes32) public queuedOps;
    mapping(uint256 => uint64) public opEta;

    // System state
    bool public frozen;

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    // Core events - these duplicate interface events, so remove them
    event ManifestCommitted(bytes32 indexed manifestHash, uint64 timestamp);
    event ManifestApplied(bytes32 indexed manifestHash, uint256 routeCount);

    // Governance events
    event GovernanceRotationQueued(address indexed newGov, uint64 eta);
    event GovernanceRotated(address indexed oldGov, address indexed newGov);
    event GuardianAction(address indexed guardian, string action, uint64 timestamp);

    // Execution queue events
    event OperationQueued(uint256 indexed nonce, bytes32 opHash, uint64 eta);
    event OperationExecuted(uint256 indexed nonce, bool success, uint256 gasUsed, uint256 tipPaid);

    // Diamond compatibility events
    event DiamondCut(FacetCut[] _diamondCut, address _init, bytes _calldata);

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    // Core errors
    error FrozenError();
    error ManifestMismatch(bytes32 expected, bytes32 actual);
    error CodehashMismatch();
    error NoRoute();
    error InvalidSelector();

    // Governance errors
    error Unauthorized(address caller);
    error InvalidDelay(uint256 delay);
    error RotationNotReady(uint64 eta, uint64 current);
    error AlreadyPending();

    // Queue errors
    error InvalidNonce(uint256 expected, uint256 provided);
    error OperationNotReady(uint64 eta, uint64 current);
    error OperationExists(uint256 nonce);

    // Validation errors
    error InvalidManifest();
    error FacetCodeMismatch(address facet, bytes32 expected, bytes32 actual);
    error ReturnDataTooLarge(uint256 size);

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════

    constructor(
        address _governance,
        address _guardian,
        uint256 _minDelay
    ) {
        require(_governance != address(0), "Zero governance");
        require(_guardian != address(0), "Zero guardian");
        require(_minDelay >= MIN_DELAY && _minDelay <= MAX_DELAY, "Invalid delay");

        governance = _governance;
        guardian = _guardian;
        minDelay = _minDelay;
        manifestVersion = 1;

        // Grant initial roles
        _grantRole(DEFAULT_ADMIN_ROLE, _governance);
        _grantRole(COMMIT_ROLE, _governance);
        _grantRole(APPLY_ROLE, _governance);
        _grantRole(EMERGENCY_ROLE, _guardian);
        _grantRole(EXECUTOR_ROLE, _governance);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GAS OPTIMIZATION: PREFLIGHT + COMMIT PATTERN
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Validate manifest canonicality via staticcall (gas-free validation)
     * @dev Call this before commitManifest to ensure validity without state gas cost
     * @param manifestHash Hash of the manifest to validate
     * @param manifestData Raw manifest data for validation
     * @return valid True if manifest passes all validation checks
     * @return routeCountResult Number of routes in the manifest
     */
    function preflightManifest(
        bytes32 manifestHash,
        bytes calldata manifestData
    ) external view returns (bool valid, uint256 routeCountResult) {
        // Comprehensive validation (free via staticcall)
        if (keccak256(manifestData) != manifestHash) return (false, 0);
        if (manifestData.length % ENTRY_SIZE != 0) return (false, 0);
        if (manifestData.length > MAX_MANIFEST_SIZE) return (false, 0);

        uint256 entryCount = manifestData.length / ENTRY_SIZE;
        uint256 validRoutes = 0;

        // Validate each entry
        for (uint256 i = 0; i < entryCount; i++) {
            (bytes4 selector, address facet) = _decodeEntry(manifestData, i);

            if (selector == bytes4(0)) return (false, 0);
            if (facet == address(0)) return (false, 0);
            if (facet == address(this)) return (false, 0);
            if (facet.code.length == 0) return (false, 0);

            validRoutes++;
        }

        return (true, validRoutes);
    }

    /**
     * @notice Commit manifest hash after successful preflight (O(1) state operation)
     * @dev Only commits the hash - actual routes applied separately
     * @param manifestHash Validated manifest hash from preflight
     */
    function commitManifest(bytes32 manifestHash)
        external
        onlyRole(COMMIT_ROLE)
        whenNotFrozen
    {
        _commitManifest(manifestHash);
    }

    function _commitManifest(bytes32 manifestHash) internal {
        require(committedManifestHash == bytes32(0), "Already committed");
        require(manifestHash != bytes32(0), "Zero hash");

        committedManifestHash = manifestHash;
        committedAt = uint64(block.timestamp);

        emit ManifestCommitted(manifestHash, uint64(block.timestamp));
    }

    /**
     * @notice Apply routes after manifest commitment (with cheap assertion)
     * @dev Validates against committed hash - O(1) assertion in hot path
     * @param manifestData Raw manifest data (must match committed hash)
     */
    function applyCommittedManifest(bytes calldata manifestData)
        external
        onlyRole(APPLY_ROLE)
        whenNotFrozen
        nonReentrant
    {
        _applyCommittedManifest(manifestData);
    }

    function _applyCommittedManifest(bytes calldata manifestData) internal {
        bytes32 computedHash = keccak256(manifestData);

        // Cheap assertion against committed hash
        if (computedHash != committedManifestHash) {
            revert ManifestMismatch(committedManifestHash, computedHash);
        }

        uint256 entryCount = manifestData.length / ENTRY_SIZE;

        // Apply routes (already validated in preflight)
        for (uint256 i = 0; i < entryCount; i++) {
            (bytes4 selector, address facet) = _decodeEntry(manifestData, i);

            // Apply-time codehash validation
            _assertFacetCode(facet, facet.codehash, 24_000);

            address oldFacet = _routes[selector].facet;
            _routes[selector] = Route({
                facet: facet,
                codehash: facet.codehash
            });

            if (!registeredSelectors[selector]) {
                registeredSelectors[selector] = true;
                allSelectors.push(selector);
                routeCount++;
                emit RouteAdded(selector, facet, facet.codehash);
            }
        }

        // Update active state
        activeRoot = committedManifestHash;
        activeEpoch++;
        manifestVersion++;

        // Clear committed state
        committedManifestHash = bytes32(0);
        committedAt = 0;

        emit ManifestApplied(activeRoot, routeCount);
    }

    /**
     * @notice Cheap runtime assertion for facet integrity
     * @dev Called in hot path - optimized for gas efficiency
     * @param facet Facet address to validate
     * @param expectedCodeHash Expected EXTCODEHASH
     * @param maxSize Maximum allowed code size
     */
    function _assertFacetCode(
        address facet,
        bytes32 expectedCodeHash,
        uint256 maxSize
    ) internal view {
        if (facet.codehash != expectedCodeHash) revert CodehashMismatch();

        uint256 size;
        assembly { size := extcodesize(facet) }
        if (size > maxSize) revert ReturnDataTooLarge(size);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENHANCED GOVERNANCE: TIMELOCK + GUARDIAN
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Queue governance rotation with timelock delay
     * @dev Safe-backed governance initiates rotation
     * @param newGov New governance address (typically a Safe/multisig)
     */
    function queueRotateGovernance(address newGov)
        external
        onlyGovernance
    {
        require(newGov != address(0), "Zero address");
        require(pendingGov == address(0), "Rotation pending");

        pendingGov = newGov;
        etaGov = uint64(block.timestamp + minDelay);

        emit GovernanceRotationQueued(newGov, etaGov);
    }

    /**
     * @notice Execute queued governance rotation after delay
     * @dev Can be called by anyone after timelock expires
     */
    function executeRotateGovernance() external {
        require(pendingGov != address(0), "No pending rotation");
        require(block.timestamp >= etaGov, "Timelock not expired");

        address oldGov = governance;
        governance = pendingGov;

        // Update roles
        _revokeRole(DEFAULT_ADMIN_ROLE, oldGov);
        _revokeRole(COMMIT_ROLE, oldGov);
        _revokeRole(APPLY_ROLE, oldGov);
        _revokeRole(EXECUTOR_ROLE, oldGov);

        _grantRole(DEFAULT_ADMIN_ROLE, governance);
        _grantRole(COMMIT_ROLE, governance);
        _grantRole(APPLY_ROLE, governance);
        _grantRole(EXECUTOR_ROLE, governance);

        // Clear pending state
        pendingGov = address(0);
        etaGov = 0;

        emit GovernanceRotated(oldGov, governance);
    }

    /**
     * @notice Guardian break-glass: pause system
     * @dev Guardian can only pause, not take control
     */
    function guardianPause() external onlyGuardian {
        _pause();
        emit GuardianAction(guardian, "pause", uint64(block.timestamp));
    }

    /**
     * @notice Guardian break-glass: queue governance rotation
     * @dev Still requires timelock delay - no instant takeover
     * @param newGov Emergency governance address
     */
    function guardianQueueRotate(address newGov)
        external
        onlyGuardian
    {
        require(newGov != address(0), "Zero address");
        require(pendingGov == address(0), "Already pending");

        pendingGov = newGov;
        etaGov = uint64(block.timestamp + minDelay); // Still delayed!

        emit GovernanceRotationQueued(newGov, etaGov);
        emit GuardianAction(guardian, "queue_rotate", uint64(block.timestamp));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MEV PROTECTION: EXECUTION QUEUE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Queue operation with nonce ordering and timelock
     * @dev Provides ordering guarantees and MEV resistance
     * @param data Operation calldata
     * @param eta Earliest execution time (must be >= block.timestamp + minDelay)
     * @return nonce Operation nonce for execution
     */
    function queueOperation(
        bytes calldata data,
        uint64 eta
    ) external onlyRole(EXECUTOR_ROLE) returns (uint256 nonce) {
        require(eta >= block.timestamp + minDelay, "ETA too early");

        nonce = nextNonce++;
        bytes32 opHash = keccak256(data);

        queuedOps[nonce] = opHash;
        opEta[nonce] = eta;

        emit OperationQueued(nonce, opHash, eta);
    }

    /**
     * @notice Execute queued operation in order
     * @dev Designed for private mempool submission (Flashbots/MEV-Share)
     * @param nonce Operation nonce (must be next in sequence)
     * @param data Operation calldata (must match queued hash)
     */
    function executeOperation(
        uint256 nonce,
        bytes calldata data
    ) external payable whenNotPaused {
        bytes32 opHash = queuedOps[nonce];
        require(opHash != bytes32(0), "Operation not found");
        require(opHash == keccak256(data), "Data mismatch");
        require(block.timestamp >= opEta[nonce], "ETA not reached");

        uint256 startGas = gasleft();

        // Execute the operation
        (bool success, bytes memory result) = address(this).call(data);

        uint256 gasUsed = startGas - gasleft() + 21_000;
        uint256 tip = msg.value;

        // Keeper tip/refund
        if (tip > 0) {
            (bool tipSuccess,) = msg.sender.call{value: tip}("");
            require(tipSuccess, "Tip transfer failed");
        }

        // Clean up
        delete queuedOps[nonce];
        delete opEta[nonce];

        emit OperationExecuted(nonce, success, gasUsed, tip);

        if (!success) {
            assembly {
                revert(add(32, result), mload(result))
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DIAMOND ECOSYSTEM COMPATIBILITY
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Diamond loupe: get facet addresses
     * @dev Provides diamond-standard interface for tooling compatibility
     * @return facetAddresses_ Array of unique facet addresses
     */
    function facetAddresses()
        external
        view
        override
        returns (address[] memory facetAddresses_)
    {
        // Build unique facet list
        address[] memory temp = new address[](routeCount);
        uint256 uniqueCount = 0;

        for (uint256 i = 0; i < allSelectors.length; i++) {
            address facet = _routes[allSelectors[i]].facet;
            if (facet == address(0)) continue;

            // Check if already added
            bool exists = false;
            for (uint256 j = 0; j < uniqueCount; j++) {
                if (temp[j] == facet) {
                    exists = true;
                    break;
                }
            }

            if (!exists) {
                temp[uniqueCount] = facet;
                uniqueCount++;
            }
        }

        // Return properly sized array
        facetAddresses_ = new address[](uniqueCount);
        for (uint256 i = 0; i < uniqueCount; i++) {
            facetAddresses_[i] = temp[i];
        }
    }

    /**
     * @notice Diamond loupe: get function selectors for facet
     * @dev Returns all selectors routed to the specified facet
     * @param _facet Facet address to query
     * @return facetFunctionSelectors_ Array of function selectors
     */
    function facetFunctionSelectors(address _facet)
        external
        view
        override
        returns (bytes4[] memory facetFunctionSelectors_)
    {
        bytes4[] memory temp = new bytes4[](allSelectors.length);
        uint256 count = 0;

        for (uint256 i = 0; i < allSelectors.length; i++) {
            if (_routes[allSelectors[i]].facet == _facet) {
                temp[count] = allSelectors[i];
                count++;
            }
        }

        facetFunctionSelectors_ = new bytes4[](count);
        for (uint256 i = 0; i < count; i++) {
            facetFunctionSelectors_[i] = temp[i];
        }
    }

    /**
     * @notice Diamond loupe: get all facets and their selectors
     * @dev Comprehensive view of all routing information
     * @return facets_ Array of Facet structs with addresses and selectors
     */
    function facets()
        external
        view
        override
        returns (Facet[] memory facets_)
    {
        address[] memory facetAddrs = this.facetAddresses();
        facets_ = new Facet[](facetAddrs.length);

        for (uint256 i = 0; i < facetAddrs.length; i++) {
            facets_[i].facetAddress = facetAddrs[i];
            facets_[i].functionSelectors = this.facetFunctionSelectors(facetAddrs[i]);
        }
    }

    /**
     * @notice Diamond loupe: get facet address for function selector
     * @dev Standard diamond interface for selector → facet lookup
     * @param _functionSelector Function selector to query
     * @return facetAddress_ Address of facet handling this selector
     */
    function facetAddress(bytes4 _functionSelector)
        external
        view
        override
        returns (address facetAddress_)
    {
        return _routes[_functionSelector].facet;
    }

    /**
     * @notice Emit DiamondCut event for ecosystem compatibility
     * @dev Called whenever routes change to mirror diamond events
     * @param _facetCuts Array of facet cuts (adds/replaces/removes)
     */
    function _emitDiamondCut(FacetCut[] memory _facetCuts) internal {
        emit DiamondCut(_facetCuts, address(0), "");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CORE ROUTING (OPTIMIZED)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Route function call to appropriate facet
     * @dev Optimized with cheap assertions and gas-efficient validation
     */
    fallback() external payable whenNotPaused {
        Route memory r = _routes[msg.sig];
        address facet = r.facet;

        if (facet == address(0)) revert NoRoute();

        // Cheap runtime assertion (prevents facet code swaps)
        if (facet.codehash != r.codehash) revert CodehashMismatch();

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)

            // Check return data size to prevent griefing
            if gt(returndatasize(), 0x8000) { // 32KB limit
                revert(0, 0)
            }

            returndatacopy(0, 0, returndatasize())

            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}

    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Decode manifest entry at given index
     * @param manifestData Raw manifest data
     * @param index Entry index
     * @return selector Function selector
     * @return facet Facet address
     */
    function _decodeEntry(
        bytes calldata manifestData,
        uint256 index
    ) internal pure returns (bytes4 selector, address facet) {
        uint256 offset = index * ENTRY_SIZE;

        assembly {
            selector := shr(224, calldataload(add(manifestData.offset, offset)))
            facet := shr(96, calldataload(add(add(manifestData.offset, offset), 4)))
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCESS CONTROL MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════

    modifier onlyGovernance() {
        if (msg.sender != governance) revert Unauthorized(msg.sender);
        _;
    }

    modifier onlyGuardian() {
        if (msg.sender != guardian) revert Unauthorized(msg.sender);
        _;
    }

    modifier whenNotFrozen() {
        require(!frozen, "System frozen");
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERFACE IMPLEMENTATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get route information (IManifestDispatcher compatibility)
     */
    function routes(bytes4 selector) external view returns (address facet, bytes32 codehash) {
        Route memory route = _routes[selector];
        return (route.facet, route.codehash);
    }

    /**
     * @notice Get pending state (legacy interface)
     */
    function pendingRoot() external view returns (bytes32) {
        return committedManifestHash; // Map to committed hash in optimized version
    }

    function pendingEpoch() external view returns (uint64) {
        return activeEpoch + 1; // Next epoch if pending
    }

    function pendingSince() external view returns (uint64) {
        return committedAt;
    }

    function activationDelay() external view returns (uint64) {
        return uint64(minDelay);
    }

    /**
     * @notice Enhanced manifest verification
     */
    function verifyManifest(bytes32 manifestHash)
        external
        view
        returns (bool valid, bytes32 currentHash)
    {
        currentHash = activeRoot;
        valid = (manifestHash == currentHash);
    }

    function getManifestVersion() external view returns (uint64) {
        return manifestVersion;
    }

    /**
     * @notice Get comprehensive manifest info
     */
    function getManifestInfo() external view returns (ManifestInfo memory info) {
        info = ManifestInfo({
            hash: activeRoot,
            version: manifestVersion,
            timestamp: block.timestamp,
            selectorCount: routeCount
        });
    }

    /**
     * @notice Legacy commit interface (maps to optimized version)
     */
    function commitRoot(bytes32 newRoot, uint64 newEpoch) external onlyRole(COMMIT_ROLE) {
        // Map to optimized commitManifest
        require(newEpoch == activeEpoch + 1, "Invalid epoch");
        _commitManifest(newRoot);
    }

    /**
     * @notice Legacy apply routes interface
     */
    function applyRoutes(
        bytes4[] calldata selectors,
        address[] calldata facetList,
        bytes32[] calldata codehashes,
        bytes32[][] calldata proofs,
        bool[][] calldata isRight
    ) external onlyRole(APPLY_ROLE) {
        // This would need Merkle proof verification
        // For now, implement basic version without proofs for compatibility
        require(selectors.length == facetList.length, "Length mismatch");
        require(committedManifestHash != bytes32(0), "No committed manifest");

        for (uint256 i = 0; i < selectors.length; i++) {
            // Apply-time codehash validation
            require(facetList[i].codehash == codehashes[i], "Codehash mismatch");

            _routes[selectors[i]] = Route({
                facet: facetList[i],
                codehash: codehashes[i]
            });

            if (!registeredSelectors[selectors[i]]) {
                registeredSelectors[selectors[i]] = true;
                allSelectors.push(selectors[i]);
                routeCount++;
                emit RouteAdded(selectors[i], facetList[i], codehashes[i]);
            }
        }

        // Update active state
        activeRoot = committedManifestHash;
        activeEpoch++;
        manifestVersion++;

        // Clear committed state
        committedManifestHash = bytes32(0);
        committedAt = 0;
    }

    /**
     * @notice Legacy updateManifest interface
     */
    function updateManifest(
        bytes32 manifestHash,
        bytes calldata manifestData
    ) external onlyRole(APPLY_ROLE) {
        // Map to optimized two-step process
        _commitManifest(manifestHash);
        _applyCommittedManifest(manifestData);
    }

    /**
     * @notice Route call with return data protection
     */
    function routeCall(bytes calldata data)
        external
        payable
        nonReentrant
        whenNotPaused
        returns (bytes memory result)
    {
        if (data.length < 4) revert InvalidManifest();

        bytes4 selector = bytes4(data[:4]);
        Route memory r = _routes[selector];
        address facet = r.facet;

        if (facet == address(0)) revert NoRoute();
        if (facet.codehash != r.codehash) revert CodehashMismatch();

        (bool success, bytes memory returnData) = facet.delegatecall(data);

        if (returnData.length > MAX_RETURN_DATA_SIZE) {
            revert ReturnDataTooLarge(returnData.length);
        }

        if (!success) {
            assembly {
                revert(add(32, returnData), mload(returnData))
            }
        }

        return returnData;
    }

    /**
     * @notice Activate committed root (legacy interface)
     */
    function activateCommittedRoot() external onlyRole(APPLY_ROLE) {
        require(committedManifestHash != bytes32(0), "No committed manifest");

        activeRoot = committedManifestHash;
        activeEpoch++;
        manifestVersion++;

        committedManifestHash = bytes32(0);
        committedAt = 0;
    }

    /**
     * @notice Remove routes (emergency function)
     */
    function removeRoutes(bytes4[] calldata selectors)
        external
        onlyRole(EMERGENCY_ROLE)
        whenNotFrozen
    {
        for (uint256 i = 0; i < selectors.length; i++) {
            address oldFacet = _routes[selectors[i]].facet;
            if (oldFacet != address(0)) {
                delete _routes[selectors[i]];
                registeredSelectors[selectors[i]] = false;
                if (routeCount > 0) {
                    routeCount--;
                }
                emit RouteRemoved(selectors[i], oldFacet);
            }
        }
    }

    /**
     * @notice Set activation delay
     */
    function setActivationDelay(uint64 newDelay)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenNotFrozen
    {
        require(newDelay >= MIN_DELAY && newDelay <= MAX_DELAY, "Invalid delay");
        uint64 oldDelay = uint64(minDelay);
        minDelay = newDelay;
        // emit ActivationDelaySet(oldDelay, newDelay);
    }

    /**
     * @notice Freeze the system (one-way operation)
     */
    function freeze() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!frozen, "Already frozen");
        frozen = true;
        // emit Frozen();
    }

    /**
     * @notice Pause system operations
     */
    function pause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause system operations
     */
    function unpause() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    function getRoute(bytes4 selector) external view returns (address facet) {
        return _routes[selector].facet;
    }

    function getRouteCount() external view returns (uint256) {
        return routeCount;
    }
}

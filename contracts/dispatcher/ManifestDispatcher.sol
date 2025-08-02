// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IManifestDispatcher} from "./interfaces/IManifestDispatcher.sol";
import {OrderedMerkle} from "../utils/OrderedMerkle.sol";

/**
 * @title ManifestDispatcher
 * @notice Enterprise-grade dispatcher with manifest-gated routes and advanced security features.
 *         Flow: commitRoot(root, epoch) → applyRoutes(...) with proofs → activateCommittedRoot().
 *         Per-call EXTCODEHASH gating ensures the facet's code matches the manifest expectation.
 *
 * Enhanced security features:
 * - Access control on all critical functions
 * - Monotonic version counter to prevent replay/downgrade attacks
 * - Manifest size limits and validation
 * - Selector collision detection
 * - Return data size griefing protection
 * - Re-entrancy protection
 * - EIP-712 signature verification support
 * - MEV-resistant operation patterns
 * - Comprehensive event emission for indexers
 */
contract ManifestDispatcher is IManifestDispatcher, AccessControl, Pausable, ReentrancyGuard {
    using ECDSA for bytes32;
    // ───────────────────────── Roles ─────────────────────────
    bytes32 public constant COMMIT_ROLE     = keccak256("COMMIT_ROLE");
    bytes32 public constant APPLY_ROLE      = keccak256("APPLY_ROLE");
    bytes32 public constant EMERGENCY_ROLE  = keccak256("EMERGENCY_ROLE");
    bytes32 public constant EXECUTOR_ROLE   = keccak256("EXECUTOR_ROLE");

    // ───────────────────────── Constants ─────────────────────
    uint256 public constant MAX_MANIFEST_SIZE = 24_000; // Under 24KB init-code limit
    uint256 public constant MAX_RETURN_DATA_SIZE = 32_768; // 32KB return data limit
    uint256 public constant SELECTOR_SIZE = 4; // 4 bytes
    uint256 public constant ADDRESS_SIZE = 20; // 20 bytes
    uint256 public constant ENTRY_SIZE = SELECTOR_SIZE + ADDRESS_SIZE; // 24 bytes per entry
    uint256 public constant MIN_DELAY = 1 hours; // Minimum delay for governance operations
    uint256 public constant MAX_DELAY = 30 days; // Maximum delay for governance operations

    // ───────────────────────── Storage ─────────────────────────
    // selector => route
    mapping(bytes4 => Route) public routes;

    // Track all registered selectors for collision detection
    mapping(bytes4 => bool) public registeredSelectors;
    bytes4[] public allSelectors;

    // Manifest lifecycle with version control
    bytes32 public pendingRoot;
    uint64  public pendingEpoch;
    uint64  public pendingSince; // commit timestamp
    bytes32 public activeRoot;
    uint64  public activeEpoch;
    uint64  public manifestVersion; // Monotonic counter for replay protection

    // Governance guards
    uint64  public activationDelay; // seconds; 0 = no delay
    bool    public frozen;

    // Route counting for gas cost predictability
    uint256 public routeCount;

    // Enhanced governance and security storage
    struct GovernanceState {
        address governance;
        address guardian;
        address pendingGov;
        uint64 etaGov;
    }
    GovernanceState private _govState;

    // MEV-resistant operation queue
    struct OperationQueue {
        uint256 nextNonce;
        mapping(uint256 => bytes32) queuedOps;
        mapping(uint256 => uint64) opEta;
    }
    OperationQueue private _opQueue;

    // EIP-712 Domain separator for signature verification
    bytes32 public immutable DOMAIN_SEPARATOR;

    // ──────────────────────── Errors ─────────────────────────
    error FrozenError();
    error NoPendingRoot();
    error BadEpoch();
    error ActivationNotReady(uint64 earliestActivation, uint64 nowTs, uint64 pendingEpoch, uint64 epochArg);
    error LenMismatch();
    error NoRoute();
    error UnknownSelector(bytes4 selector);
    error CodehashMismatch(); // Runtime validation (gas-efficient)
    error ApplyCodehashMismatch(address facet, bytes32 expected, bytes32 actual); // Apply-time validation (detailed)
    error FacetIsSelf();
    // Enhanced errors
    error ManifestMismatch(bytes32 expected, bytes32 actual);
    error AlreadyApplied(bytes32 hash);
    error HashNotCommitted(bytes32 hash);
    error Unauthorized(address caller);
    error InvalidDelay(uint256 delay);
    error RotationNotReady(uint64 eta, uint64 current);
    error AlreadyPending();
    error InvalidNonce(uint256 expected, uint256 provided);
    error OperationNotReady(uint64 eta, uint64 current);
    error OperationExists(uint256 nonce);
    error ETATooEarly(uint64 provided, uint64 minimum);
    error InvalidManifest();
    error FacetCodeMismatch(address facet, bytes32 expected, bytes32 actual);
    error ReturnDataTooLarge(uint256 size, uint256 maxSize);
    error CodeSizeExceeded(address facet, uint256 size);
    error ZeroCodeFacet(address facet);
    error RootZero();
    error ManifestTooLarge(uint256 size, uint256 maxSize);
    error InvalidManifestFormat();
    error SelectorCollision(bytes4 selector);
    error VersionDowngrade(uint64 current, uint64 attempted);
    error EmptySelector();
    error ZeroAddress();

    // ───────────────────── Enhanced Constructor ───────────────────────
    constructor(address admin, uint64 _activationDelay) {
        // Security: Zero-address validation for critical parameters
        if (admin == address(0)) revert ZeroAddress();
        if (_activationDelay > MAX_DELAY) revert InvalidDelay(_activationDelay);

        // Initialize governance state
        _govState = GovernanceState({
            governance: admin,
            guardian: admin, // Initially same as governance
            pendingGov: address(0),
            etaGov: 0
        });

        // Initialize EIP-712 domain separator
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("ManifestDispatcher"),
            keccak256("1"),
            block.chainid,
            address(this)
        ));

        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMMIT_ROLE, admin);
        _grantRole(APPLY_ROLE, admin);
        _grantRole(EMERGENCY_ROLE, admin);
        _grantRole(EXECUTOR_ROLE, admin);

        activationDelay = _activationDelay;
        manifestVersion = 1; // Start at version 1
    }

    // ───────────────── Manifest governance ───────────────────

    /**
     * @dev Commit a new manifest root for the next epoch (activeEpoch + 1).
     * @dev Enhanced with version control to prevent replay attacks
     */
    function commitRoot(bytes32 newRoot, uint64 newEpoch)
        external
        override
        onlyRole(COMMIT_ROLE)
    {
        if (frozen) revert FrozenError();
        if (newRoot == bytes32(0)) revert RootZero();
        if (newEpoch != activeEpoch + 1) revert BadEpoch();

        pendingRoot  = newRoot;
        pendingEpoch = newEpoch;
        pendingSince = uint64(block.timestamp);

        emit RootCommitted(newRoot, newEpoch);
    }

    /**
     * @dev Enhanced manifest update with size limits and collision detection
     * @param manifestHash Hash of the manifest for verification
     * @param manifestData Raw manifest data (selectors + addresses)
     */
    function updateManifest(
        bytes32 manifestHash,
        bytes calldata manifestData
    ) external override onlyRole(APPLY_ROLE) nonReentrant {
        if (frozen) revert FrozenError();

        // Validate manifest size to prevent gas limit issues
        if (manifestData.length > MAX_MANIFEST_SIZE) {
            revert ManifestTooLarge(manifestData.length, MAX_MANIFEST_SIZE);
        }

        // Validate manifest format (must be multiple of entry size)
        if (manifestData.length % ENTRY_SIZE != 0) {
            revert InvalidManifestFormat();
        }

        // Verify manifest hash
        if (keccak256(manifestData) != manifestHash) {
            revert InvalidManifestFormat();
        }

        uint256 entryCount = manifestData.length / ENTRY_SIZE;

        // Process manifest entries with collision detection
        for (uint256 i = 0; i < entryCount; i++) {
            uint256 offset = i * ENTRY_SIZE;

            // Extract selector (4 bytes)
            bytes4 selector;
            assembly {
                selector := shr(224, calldataload(add(manifestData.offset, offset)))
            }

            // Extract address (20 bytes, skip 4 byte selector)
            address facet;
            assembly {
                facet := shr(96, calldataload(add(add(manifestData.offset, offset), 4)))
            }

            if (selector == bytes4(0)) revert EmptySelector();
            if (facet == address(0)) revert ZeroAddress();
            if (facet == address(this)) revert FacetIsSelf();

            // Check for selector collision
            if (registeredSelectors[selector] && routes[selector].facet != facet) {
                revert SelectorCollision(selector);
            }

            // Update route
            address oldFacet = routes[selector].facet;
            routes[selector] = Route({
                facet: facet,
                codehash: facet.codehash
            });

            // Track selectors
            if (!registeredSelectors[selector]) {
                registeredSelectors[selector] = true;
                allSelectors.push(selector);
                routeCount++;
                emit RouteAdded(selector, facet, facet.codehash);
            } else {
                emit RouteUpdated(selector, oldFacet, facet);
            }
        }

        // Increment version counter
        uint64 oldVersion = manifestVersion;
        manifestVersion++;
        emit ManifestVersionUpdated(oldVersion, manifestVersion);
    }

    /**
     * @dev Enhanced route call with return data size protection and re-entrancy guard
     * @param data Complete call data including selector
     * @return result Return data from the routed call
     */
    function routeCall(bytes calldata data)
        external
        payable
        override
        nonReentrant
        whenNotPaused
        returns (bytes memory result)
    {
        if (data.length < 4) revert InvalidManifestFormat();

        bytes4 selector = bytes4(data[:4]);
        Route memory r = routes[selector];
        address facet = r.facet;

        if (facet == address(0)) revert NoRoute();

        // Per-call EXTCODEHASH gate (prevents facet code swaps)
        if (facet.codehash != r.codehash) revert CodehashMismatch();

        // Make the call with return data size protection
        (bool success, bytes memory returnData) = facet.delegatecall(data);

        // Protect against return data griefing
        if (returnData.length > MAX_RETURN_DATA_SIZE) {
            revert ReturnDataTooLarge(returnData.length, MAX_RETURN_DATA_SIZE);
        }

        if (!success) {
            // Preserve revert reason
            if (returnData.length > 0) {
                assembly {
                    let returndata_size := mload(returnData)
                    revert(add(32, returnData), returndata_size)
                }
            } else {
                revert("Delegatecall failed");
            }
        }

        return returnData;
    }


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
    {
        if (frozen) revert FrozenError();
        if (pendingRoot == bytes32(0)) revert NoPendingRoot();

        uint256 n = selectors.length;
        if (facets.length != n || codehashes.length != n || proofs.length != n || isRight.length != n) {
            revert LenMismatch();
        }

        for (uint256 i; i < n; ++i) {
            // Use the legacy compatibility function that handles boolean arrays internally
            bytes32 leaf = OrderedMerkle.leafOfSelectorRoute(selectors[i], facets[i], codehashes[i]);
            require(OrderedMerkle.verify(proofs[i], isRight[i], pendingRoot, leaf), "bad proof");

            // Safety: don't allow routing back to the dispatcher itself
            if (facets[i] == address(this)) revert FacetIsSelf();

            // Apply-time EXTCODEHASH validation as fail-fast guard
            bytes32 actualCodehash = facets[i].codehash;
            if (actualCodehash != codehashes[i]) revert ApplyCodehashMismatch(facets[i], codehashes[i], actualCodehash);

            routes[selectors[i]] = Route({facet: facets[i], codehash: codehashes[i]});
            emit RouteAdded(selectors[i], facets[i], codehashes[i]);
        }
    }

    /**
     * @dev Activate the currently committed root after optional delay.
     */
    function activateCommittedRoot()
        external
        override
        onlyRole(APPLY_ROLE)
    {
        if (frozen) revert FrozenError();
        if (pendingRoot == bytes32(0)) revert NoPendingRoot();
        if (activationDelay != 0) {
            uint64 earliestActivation = uint64(pendingSince + activationDelay);
            if (block.timestamp < earliestActivation) {
                revert ActivationNotReady(earliestActivation, uint64(block.timestamp), pendingEpoch, 0);
            }
        }

        activeRoot  = pendingRoot;
        activeEpoch = pendingEpoch;

        pendingRoot  = bytes32(0);
        pendingEpoch = 0;
        pendingSince = 0;

        emit RootActivated(activeRoot, activeEpoch);
    }

    /**
     * @dev Emergency removal of routes (e.g., if a facet is found vulnerable) before freeze().
     * @dev Enhanced to emit RouteRemoved events with old facet address
     */
    function removeRoutes(bytes4[] calldata selectors)
        external
        override
        onlyRole(EMERGENCY_ROLE)
    {
        if (frozen) revert FrozenError();
        for (uint256 i; i < selectors.length; ++i) {
            address oldFacet = routes[selectors[i]].facet;
            if (oldFacet != address(0)) {
                delete routes[selectors[i]];
                registeredSelectors[selectors[i]] = false;
                if (routeCount > 0) {
                    routeCount--;
                }
                emit RouteRemoved(selectors[i], oldFacet);
            }
        }
    }

    // ───────────────────── Enhanced View Functions ───────────────────

    /**
     * @dev Get route for a selector
     */
    function getRoute(bytes4 selector) external view override returns (address facet) {
        return routes[selector].facet;
    }

    /**
     * @dev Get total number of registered routes
     */
    function getRouteCount() external view override returns (uint256) {
        return routeCount;
    }

    /**
     * @dev Verify manifest hash and return current hash for better DX
     */
    function verifyManifest(bytes32 manifestHash)
        external
        view
        override
        returns (bool valid, bytes32 currentHash)
    {
        currentHash = activeRoot;
        valid = (manifestHash == currentHash);
    }

    /**
     * @dev Get comprehensive manifest information
     */
    function getManifestInfo() external view override returns (ManifestInfo memory info) {
        info = ManifestInfo({
            hash: activeRoot,
            version: manifestVersion,
            timestamp: block.timestamp,
            selectorCount: routeCount
        });
    }

    /**
     * @dev Get current manifest version for replay protection
     */
    function getManifestVersion() external view returns (uint64) {
        return manifestVersion;
    }

    /**
     * @dev Set/adjust the activation delay (in seconds). Disabled after freeze().
     */
    function setActivationDelay(uint64 newDelay)
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (frozen) revert FrozenError();
        uint64 old = activationDelay;
        activationDelay = newDelay;
        emit ActivationDelaySet(old, newDelay);
    }

    // ───────────────────── Enhanced Governance ───────────────────

    /**
     * @dev Queue a governance rotation with timelock
     */
    function queueRotateGovernance(address newGov) external onlyGovernance {
        if (newGov == address(0)) revert ZeroAddress();
        if (_govState.pendingGov != address(0)) revert AlreadyPending();

        _govState.pendingGov = newGov;
        _govState.etaGov = uint64(block.timestamp + activationDelay);
        emit GovernanceRotationQueued(newGov, _govState.etaGov);
    }

    /**
     * @dev Execute queued governance rotation after timelock
     */
    function executeRotateGovernance() external {
        if (_govState.pendingGov == address(0)) revert NoPendingRoot();
        if (block.timestamp < _govState.etaGov) revert RotationNotReady(_govState.etaGov, uint64(block.timestamp));

        address oldGov = _govState.governance;
        _govState.governance = _govState.pendingGov;

        // Update roles
        _revokeRole(DEFAULT_ADMIN_ROLE, oldGov);
        _revokeRole(COMMIT_ROLE, oldGov);
        _revokeRole(APPLY_ROLE, oldGov);
        _revokeRole(EXECUTOR_ROLE, oldGov);

        _grantRole(DEFAULT_ADMIN_ROLE, _govState.governance);
        _grantRole(COMMIT_ROLE, _govState.governance);
        _grantRole(APPLY_ROLE, _govState.governance);
        _grantRole(EXECUTOR_ROLE, _govState.governance);

        // Clear pending state
        _govState.pendingGov = address(0);
        _govState.etaGov = 0;
        emit GovernanceRotated(oldGov, _govState.governance);
    }

    /**
     * @dev Guardian emergency pause
     */
    function guardianPause() external onlyGuardian {
        _pause();
        emit GuardianAction(_govState.guardian, "pause", uint64(block.timestamp));
    }

    /**
     * @dev Guardian emergency unpause
     */
    function guardianUnpause() external onlyGuardian {
        _unpause();
        emit GuardianAction(_govState.guardian, "unpause", uint64(block.timestamp));
    }

    // ───────────────────── MEV-Resistant Operations ───────────────────

    /**
     * @dev Queue an operation with timelock for MEV resistance
     */
    function queueOperation(
        bytes calldata data,
        uint64 eta
    ) external onlyRole(EXECUTOR_ROLE) returns (uint256 nonce) {
        if (eta == 0) eta = uint64(block.timestamp + activationDelay);

        uint64 minimumEta = uint64(block.timestamp + activationDelay);
        if (eta < minimumEta) revert ETATooEarly(eta, minimumEta);

        nonce = _opQueue.nextNonce++;
        bytes32 opHash = keccak256(data);

        _opQueue.queuedOps[nonce] = opHash;
        _opQueue.opEta[nonce] = eta;

        emit OperationQueued(nonce, opHash, eta);
    }

    /**
     * @dev Execute a queued operation after timelock
     */
    function executeOperation(
        uint256 nonce,
        bytes calldata data
    ) external payable whenNotPaused nonReentrant {
        bytes32 opHash = _opQueue.queuedOps[nonce];
        if (opHash == bytes32(0)) revert InvalidNonce(nonce, 0);
        if (opHash != keccak256(data)) revert ManifestMismatch(opHash, keccak256(data));
        if (block.timestamp < _opQueue.opEta[nonce]) revert OperationNotReady(_opQueue.opEta[nonce], uint64(block.timestamp));

        uint256 startGas = gasleft();
        (bool success, bytes memory result) = address(this).call(data);
        uint256 gasUsed = startGas - gasleft() + 21_000;

        // Clean up
        delete _opQueue.queuedOps[nonce];
        delete _opQueue.opEta[nonce];

        emit OperationExecuted(nonce, success, gasUsed);

        if (!success) {
            assembly {
                revert(add(32, result), mload(result))
            }
        }
    }

    /**
     * @dev Cancel a queued operation
     */
    function cancelOperation(uint256 nonce) external onlyRole(EMERGENCY_ROLE) {
        bytes32 opHash = _opQueue.queuedOps[nonce];
        if (opHash == bytes32(0)) revert InvalidNonce(nonce, 0);

        delete _opQueue.queuedOps[nonce];
        delete _opQueue.opEta[nonce];

        emit OperationCancelled(nonce, opHash);
    }

    /**
     * @dev One‑way governance freeze. Irreversible.
     *      Disables: commitRoot, applyRoutes, activateCommittedRoot, removeRoutes, setActivationDelay.
     *      Pause/unpause remains available (operational control).
     */
    function freeze()
        external
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (frozen) revert FrozenError();
        frozen = true;
        emit Frozen();
    }

    // ───────────────────── Operational control ───────────────

    function pause() external override onlyRole(EMERGENCY_ROLE) { _pause(); }
    function unpause() external override onlyRole(EMERGENCY_ROLE) { _unpause(); }

    // ──────────────────── Fallback dispatcher ────────────────

    /**
     * @dev Routes all unknown function selectors to the configured facet via DELEGATECALL,
     *      enforcing the facet's EXTCODEHASH per call.
     */
    fallback() external payable whenNotPaused {
        Route memory r = routes[msg.sig];
        address facet = r.facet;
        if (facet == address(0)) revert NoRoute();

        // Per-call EXTCODEHASH gate (cheap, prevents facet code swaps)
        if (facet.codehash != r.codehash) revert CodehashMismatch();

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    // ───────────────────── Enhanced View Functions ───────────────────

    /**
     * @dev Get comprehensive system status
     */
    function getSystemStatus() external view returns (
        bytes32 activeRoot_,
        uint64 activeEpoch_,
        uint64 manifestVersion_,
        uint256 routeCount_,
        bool frozen_,
        bool paused_,
        bytes32 pendingRoot_,
        uint64 pendingSince_,
        uint256 nextNonce_
    ) {
        return (
            activeRoot,
            activeEpoch,
            manifestVersion,
            routeCount,
            frozen,
            paused(),
            pendingRoot,
            pendingSince,
            _opQueue.nextNonce
        );
    }

    /**
     * @dev Validate system invariants
     */
    function validateInvariants() external view returns (bool valid, string[] memory errors) {
        string[] memory errorList = new string[](5);
        uint256 errorCount = 0;

        // Check selector count consistency
        if (allSelectors.length != routeCount) {
            errorList[errorCount++] = "Selector count mismatch";
        }

        // Check governance state
        if (_govState.governance == address(0)) {
            errorList[errorCount++] = "Zero governance address";
        }

        // Resize array to actual error count
        string[] memory finalErrors = new string[](errorCount);
        for (uint256 i = 0; i < errorCount; i++) {
            finalErrors[i] = errorList[i];
        }

        return (errorCount == 0, finalErrors);
    }

    /**
     * @dev Get domain separator for EIP-712
     */
    function domainSeparator() external view returns (bytes32) {
        return DOMAIN_SEPARATOR;
    }

    /**
     * @dev Get governance state
     */
    function getGovernanceState() external view returns (
        address governance,
        address guardian,
        address pendingGov,
        uint64 etaGov
    ) {
        GovernanceState storage gs = _govState;
        return (gs.governance, gs.guardian, gs.pendingGov, gs.etaGov);
    }

    /**
     * @dev Get operation queue info
     */
    function getOperationInfo(uint256 nonce) external view returns (
        bytes32 opHash,
        uint64 eta,
        bool exists
    ) {
        opHash = _opQueue.queuedOps[nonce];
        eta = _opQueue.opEta[nonce];
        exists = opHash != bytes32(0);
    }

    // ───────────────────── Enhanced Access Control Modifiers ───────────────────

    modifier onlyGovernance() {
        if (msg.sender != _govState.governance) revert Unauthorized(msg.sender);
        _;
    }

    modifier onlyGuardian() {
        if (msg.sender != _govState.guardian) revert Unauthorized(msg.sender);
        _;
    }

    modifier whenNotFrozen() {
        if (frozen) revert FrozenError();
        _;
    }

    receive() external payable {}
}

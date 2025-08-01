// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IManifestDispatcher} from "./interfaces/IManifestDispatcher.sol";
import {OrderedMerkle} from "../utils/OrderedMerkle.sol";

/**
 * @title ManifestDispatcher
 * @notice Non-upgradeable dispatcher with manifest-gated routes.
 *         Flow: commitRoot(root, epoch) → applyRoutes(...) with proofs → activateCommittedRoot().
 *         Per-call EXTCODEHASH gating ensures the facet's code matches the manifest expectation.
 *
 * Security hardening:
 * - Access control on all critical functions
 * - Monotonic version counter to prevent replay/downgrade attacks
 * - Manifest size limits and validation
 * - Selector collision detection
 * - Return data size griefing protection
 * - Re-entrancy protection
 * - Comprehensive event emission for indexers
 */
contract ManifestDispatcher is IManifestDispatcher, AccessControl, Pausable, ReentrancyGuard {
    // ───────────────────────── Roles ─────────────────────────
    bytes32 public constant COMMIT_ROLE     = keccak256("COMMIT_ROLE");
    bytes32 public constant APPLY_ROLE      = keccak256("APPLY_ROLE");
    bytes32 public constant EMERGENCY_ROLE  = keccak256("EMERGENCY_ROLE");

    // ───────────────────────── Constants ─────────────────────
    uint256 public constant MAX_MANIFEST_SIZE = 24_000; // Under 24KB init-code limit
    uint256 public constant MAX_RETURN_DATA_SIZE = 32_768; // 32KB return data limit
    uint256 public constant SELECTOR_SIZE = 4; // 4 bytes
    uint256 public constant ADDRESS_SIZE = 20; // 20 bytes
    uint256 public constant ENTRY_SIZE = SELECTOR_SIZE + ADDRESS_SIZE; // 24 bytes per entry

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
    error RootZero();
    error ManifestTooLarge(uint256 size, uint256 maxSize);
    error InvalidManifestFormat();
    error SelectorCollision(bytes4 selector);
    error ReturnDataTooLarge(uint256 size, uint256 maxSize);
    error VersionDowngrade(uint64 current, uint64 attempted);
    error EmptySelector();
    error ZeroAddress();

    // ───────────────────── Constructor ───────────────────────
    constructor(address admin, uint64 _activationDelay) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMMIT_ROLE, admin);
        _grantRole(APPLY_ROLE, admin);
        _grantRole(EMERGENCY_ROLE, admin);
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
            // Merkle inclusion with ordered-pair verification
            bytes32 leaf = keccak256(abi.encode(selectors[i], facets[i], codehashes[i]));
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

    receive() external payable {}
}

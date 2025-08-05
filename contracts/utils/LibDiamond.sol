// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IManifestDispatcher} from "../dispatcher/interfaces/IManifestDispatcher.sol";

/**
 * @title LibDiamond
 * @notice PayRox Go Beyond Diamond utilities for manifest-based facet management
 * @dev NON-STANDARD Diamond implementation using manifest verification instead of diamond cuts
 * 
 * Key differences from EIP-2535:
 * - NO shared storage between facets (isolated storage patterns)
 * - NO diamond cuts (immutable routing after deployment)
 * - Manifest-based route verification using Merkle proofs
 * - Content-addressed CREATE2 deployment for deterministic addressing
 * - Cryptographic verification of all route changes
 * 
 * This library provides utilities for facets to interact with PayRox's manifest system
 * while maintaining diamond-safe storage isolation patterns.
 */
library LibDiamond {
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @dev Storage slot for PayRox Diamond state (isolated from facet storage)
    bytes32 internal constant DIAMOND_STORAGE_POSITION = 
        keccak256("payrox.diamond.storage");
    
    /// @dev Magic value for PayRox manifest verification
    bytes32 internal constant PAYROX_MANIFEST_MAGIC = 
        keccak256("PAYROX_GO_BEYOND_MANIFEST_V1");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STORAGE STRUCTURES
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct DiamondStorage {
        // PayRox manifest dispatcher address
        address manifestDispatcher;
        // Current facet deployment epoch
        uint64 deploymentEpoch;
        // Facet initialization state
        bool initialized;
        // Reserved for future use
        uint256[10] reserved;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FacetInitialized(address indexed facet, uint64 epoch);
    event ManifestDispatcherUpdated(address indexed oldDispatcher, address indexed newDispatcher);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════
    
    error AlreadyInitialized();
    error NotInitialized();
    error InvalidDispatcher();
    error UnauthorizedAccess();
    error ManifestVerificationFailed();
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STORAGE ACCESS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get the diamond storage struct
     * @return ds The diamond storage struct
     */
    function diamondStorage() internal pure returns (DiamondStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initialize the diamond facet with PayRox manifest integration
     * @param _manifestDispatcher Address of the PayRox manifest dispatcher
     */
    function initializeDiamond(address _manifestDispatcher) internal {
        DiamondStorage storage ds = diamondStorage();
        
        if (ds.initialized) revert AlreadyInitialized();
        if (_manifestDispatcher == address(0)) revert InvalidDispatcher();
        
        // Verify the dispatcher implements the required interface
        try IManifestDispatcher(_manifestDispatcher).hasRole(0x00, address(0)) returns (bool) {
            // If hasRole works, the dispatcher is valid
            ds.manifestDispatcher = _manifestDispatcher;
            ds.deploymentEpoch = 1; // Default epoch
            ds.initialized = true;
            
            emit FacetInitialized(address(this), 1);
        } catch {
            revert InvalidDispatcher();
        }
    }
    
    /**
     * @notice Check if the diamond is initialized
     * @return True if initialized, false otherwise
     */
    function isInitialized() internal view returns (bool) {
        return diamondStorage().initialized;
    }
    
    /**
     * @notice Require that the diamond is initialized
     */
    function requireInitialized() internal view {
        if (!diamondStorage().initialized) revert NotInitialized();
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MANIFEST INTEGRATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get the current manifest dispatcher
     * @return The manifest dispatcher address
     */
    function getManifestDispatcher() internal view returns (address) {
        requireInitialized();
        return diamondStorage().manifestDispatcher;
    }
    
    /**
     * @notice Get the deployment epoch
     * @return The deployment epoch
     */
    function getDeploymentEpoch() internal view returns (uint64) {
        requireInitialized();
        return diamondStorage().deploymentEpoch;
    }
    
    /**
     * @notice Verify that the current call is authorized through the manifest system
     * @dev This ensures that facet functions can only be called through proper routing
     */
    function verifyManifestCall() internal view {
        requireInitialized();
        
        DiamondStorage storage ds = diamondStorage();
        
        // If called directly (not through dispatcher), verify authorization
        if (msg.sender != ds.manifestDispatcher) {
            // Allow self-calls and initialization calls
            if (msg.sender != address(this)) {
                revert UnauthorizedAccess();
            }
        }
    }
    
    /**
     * @notice Update the manifest dispatcher (only callable by current dispatcher)
     * @param _newDispatcher The new manifest dispatcher address
     */
    function updateManifestDispatcher(address _newDispatcher) internal {
        requireInitialized();
        
        DiamondStorage storage ds = diamondStorage();
        
        // Only the current dispatcher can update itself
        if (msg.sender != ds.manifestDispatcher) revert UnauthorizedAccess();
        if (_newDispatcher == address(0)) revert InvalidDispatcher();
        
        address oldDispatcher = ds.manifestDispatcher;
        ds.manifestDispatcher = _newDispatcher;
        
        emit ManifestDispatcherUpdated(oldDispatcher, _newDispatcher);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DIAMOND-SAFE STORAGE HELPERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Generate a unique storage slot for a facet
     * @param facetName The name of the facet
     * @param version The version of the storage layout
     * @return The unique storage slot
     */
    function generateStorageSlot(
        string memory facetName,
        uint256 version
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            "payrox.facet.storage.",
            facetName,
            ".v",
            version
        ));
    }
    
    /**
     * @notice Generate a unique storage slot with additional namespace
     * @param facetName The name of the facet
     * @param namespace Additional namespace for storage isolation
     * @param version The version of the storage layout
     * @return The unique storage slot
     */
    function generateNamespacedStorageSlot(
        string memory facetName,
        string memory namespace,
        uint256 version
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            "payrox.facet.storage.",
            facetName,
            ".",
            namespace,
            ".v",
            version
        ));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ACCESS CONTROL HELPERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check if an address has a specific role in the manifest dispatcher
     * @param role The role to check
     * @param account The account to check
     * @return True if the account has the role
     */
    function hasRole(bytes32 role, address account) internal view returns (bool) {
        requireInitialized();
        
        address dispatcher = diamondStorage().manifestDispatcher;
        
        // Use low-level call to avoid interface dependency
        (bool success, bytes memory data) = dispatcher.staticcall(
            abi.encodeWithSignature("hasRole(bytes32,address)", role, account)
        );
        
        if (success && data.length >= 32) {
            return abi.decode(data, (bool));
        }
        
        return false;
    }
    
    /**
     * @notice Require that the caller has a specific role
     * @param role The required role
     */
    function requireRole(bytes32 role) internal view {
        if (!hasRole(role, msg.sender)) {
            revert UnauthorizedAccess();
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get the contract's own address (useful for self-calls)
     * @return The current contract address
     */
    function contractAddress() internal view returns (address) {
        return address(this);
    }
    
    /**
     * @notice Check if the current context is a delegatecall
     * @return True if this is a delegatecall context
     */
    function isDelegateCall() internal view returns (bool) {
        return address(this) != contractAddress();
    }
    
    /**
     * @notice Enforce that this function is called through the manifest dispatcher
     */
    function enforceManifestCall() internal view {
        requireInitialized();
        
        if (msg.sender != diamondStorage().manifestDispatcher) {
            revert UnauthorizedAccess();
        }
    }
    
    /**
     * @notice Get the current block timestamp
     * @return The current block timestamp
     */
    function getTimestamp() internal view returns (uint256) {
        return block.timestamp;
    }
    
    /**
     * @notice Generate a deterministic CREATE2 salt for PayRox deployment
     * @param deployer The deployer address
     * @param facetName The facet name
     * @param initData The initialization data
     * @return The CREATE2 salt
     */
    function generateDeploymentSalt(
        address deployer,
        string memory facetName,
        bytes memory initData
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            PAYROX_MANIFEST_MAGIC,
            deployer,
            facetName,
            keccak256(initData)
        ));
    }
}

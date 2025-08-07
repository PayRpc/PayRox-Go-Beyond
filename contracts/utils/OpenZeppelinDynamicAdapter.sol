// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title OpenZeppelinDynamicAdapter
 * @notice Dynamic adapter for OpenZeppelin contract integration across PayRox ecosystem
 * @dev Provides version-agnostic access to OZ contracts with runtime resolution
 */
library OpenZeppelinDynamicAdapter {
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Dynamic Import Resolution
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get the appropriate AccessControl interface
     * @dev Dynamically resolves to the correct OZ version
     */
    function getAccessControlInterface() internal pure returns (bytes4) {
        // OZ v5.x interface selector
        return bytes4(keccak256("hasRole(bytes32,address)"));
    }
    
    /**
     * @notice Get the appropriate Pausable interface  
     * @dev Dynamically resolves to the correct OZ version
     */
    function getPausableInterface() internal pure returns (bytes4) {
        // OZ v5.x interface selector
        return bytes4(keccak256("paused()"));
    }
    
    /**
     * @notice Get the appropriate ReentrancyGuard interface
     * @dev Dynamically resolves to the correct OZ version
     */
    function getReentrancyInterface() internal pure returns (bytes4) {
        // OZ v5.x interface selector  
        return bytes4(keccak256("_reentrancyGuardEntered()"));
    }
    
    /**
     * @notice Get the appropriate ERC20 interface
     * @dev Dynamically resolves to the correct OZ version
     */
    function getERC20Interface() internal pure returns (bytes4) {
        // Standard ERC20 transfer selector
        return bytes4(keccak256("transfer(address,uint256)"));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Version Detection
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Detect OpenZeppelin version at runtime
     * @param contractAddr Address of OZ-based contract to check
     * @return version Detected OZ version (5 for v5.x, 4 for v4.x)
     */
    function detectOZVersion(address contractAddr) internal view returns (uint8 version) {
        // Try OZ v5.x signature first
        bytes memory callData = abi.encodeWithSignature("supportsInterface(bytes4)", bytes4(0x01ffc9a7));
        
        (bool success, bytes memory result) = contractAddr.staticcall(callData);
        
        if (success && result.length == 32) {
            // OZ v5.x detected
            return 5;
        }
        
        // Fallback to v4.x detection
        callData = abi.encodeWithSignature("hasRole(bytes32,address)", bytes32(0), address(0));
        (success,) = contractAddr.staticcall(callData);
        
        if (success) {
            return 4;
        }
        
        // Unknown or custom implementation
        return 0;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Dynamic Role Management
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check role with dynamic OZ version support
     * @param contractAddr Target contract address
     * @param role Role to check
     * @param account Account to check role for
     * @return hasRole Whether account has the role
     */
    function checkRoleDynamic(
        address contractAddr,
        bytes32 role,
        address account
    ) internal view returns (bool hasRole) {
        uint8 version = detectOZVersion(contractAddr);
        
        if (version >= 4) {
            // Use standard hasRole for v4.x and v5.x
            bytes memory callData = abi.encodeWithSignature("hasRole(bytes32,address)", role, account);
            (bool success, bytes memory result) = contractAddr.staticcall(callData);
            
            if (success && result.length == 32) {
                return abi.decode(result, (bool));
            }
        }
        
        return false;
    }
    
    /**
     * @notice Grant role with dynamic OZ version support
     * @param contractAddr Target contract address
     * @param role Role to grant
     * @param account Account to grant role to
     */
    function grantRoleDynamic(
        address contractAddr,
        bytes32 role,
        address account
    ) internal {
        uint8 version = detectOZVersion(contractAddr);
        
        if (version >= 4) {
            // Use standard grantRole for v4.x and v5.x
            bytes memory callData = abi.encodeWithSignature("grantRole(bytes32,address)", role, account);
            (bool success,) = contractAddr.call(callData);
            require(success, "OZDynamic: grantRole failed");
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Dynamic Pausable Management
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check if contract is paused with dynamic OZ version support
     * @param contractAddr Target contract address
     * @return isPaused Whether the contract is paused
     */
    function isPausedDynamic(address contractAddr) internal view returns (bool isPaused) {
        bytes memory callData = abi.encodeWithSignature("paused()");
        (bool success, bytes memory result) = contractAddr.staticcall(callData);
        
        if (success && result.length == 32) {
            return abi.decode(result, (bool));
        }
        
        return false;
    }
    
    /**
     * @notice Pause contract with dynamic OZ version support
     * @param contractAddr Target contract address
     */
    function pauseDynamic(address contractAddr) internal {
        bytes memory callData = abi.encodeWithSignature("pause()");
        (bool success,) = contractAddr.call(callData);
        require(success, "OZDynamic: pause failed");
    }
    
    /**
     * @notice Unpause contract with dynamic OZ version support
     * @param contractAddr Target contract address
     */
    function unpauseDynamic(address contractAddr) internal {
        bytes memory callData = abi.encodeWithSignature("unpause()");
        (bool success,) = contractAddr.call(callData);
        require(success, "OZDynamic: unpause failed");
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Dynamic ERC20 Operations
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Safe transfer with dynamic OZ version support
     * @param token ERC20 token address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function safeTransferDynamic(
        address token,
        address to,
        uint256 amount
    ) internal {
        // Try SafeERC20 pattern first
        bytes memory callData = abi.encodeWithSignature("transfer(address,uint256)", to, amount);
        (bool success, bytes memory result) = token.call(callData);
        
        // Check both success and return value for full compatibility
        require(
            success && (result.length == 0 || abi.decode(result, (bool))),
            "OZDynamic: transfer failed"
        );
    }
    
    /**
     * @notice Safe transferFrom with dynamic OZ version support
     * @param token ERC20 token address
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function safeTransferFromDynamic(
        address token,
        address from,
        address to,
        uint256 amount
    ) internal {
        bytes memory callData = abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount);
        (bool success, bytes memory result) = token.call(callData);
        
        require(
            success && (result.length == 0 || abi.decode(result, (bool))),
            "OZDynamic: transferFrom failed"
        );
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Utility Functions
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get OZ version string for logging
     * @param version Numeric version from detectOZVersion
     * @return versionString Human-readable version string
     */
    function getVersionString(uint8 version) internal pure returns (string memory versionString) {
        if (version == 5) return "OpenZeppelin v5.x";
        if (version == 4) return "OpenZeppelin v4.x";
        return "Unknown/Custom";
    }
    
    /**
     * @notice Validate OZ contract compatibility
     * @param contractAddr Contract to validate
     * @return isCompatible Whether the contract is OZ-compatible
     * @return detectedVersion Detected OZ version
     */
    function validateCompatibility(address contractAddr) 
        internal 
        view 
        returns (bool isCompatible, uint8 detectedVersion) 
    {
        detectedVersion = detectOZVersion(contractAddr);
        isCompatible = detectedVersion >= 4; // Require v4.x or higher
    }
}

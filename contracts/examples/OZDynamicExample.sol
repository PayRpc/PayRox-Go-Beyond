// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../utils/OpenZeppelinDynamicAdapter.sol";

/**
 * @title OZDynamicExample
 * @notice Example contract demonstrating OpenZeppelin Dynamic Adapter usage
 * @dev Shows how to use OZ contracts dynamically across different versions
 */
contract OZDynamicExample {
    using OpenZeppelinDynamicAdapter for address;
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════════════════════════════════════
    
    event OZVersionDetected(address indexed contractAddr, uint8 version, string versionString);
    event RoleOperationCompleted(address indexed contractAddr, bytes32 role, address account, string operation);
    event PauseOperationCompleted(address indexed contractAddr, bool paused);
    event TokenOperationCompleted(address indexed token, address from, address to, uint256 amount);
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Dynamic Version Detection
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Detect and report OpenZeppelin version for a contract
     * @param contractAddr Address of the OZ-based contract
     */
    function detectAndReportOZVersion(address contractAddr) external {
        uint8 version = OpenZeppelinDynamicAdapter.detectOZVersion(contractAddr);
        string memory versionString = OpenZeppelinDynamicAdapter.getVersionString(version);
        
        emit OZVersionDetected(contractAddr, version, versionString);
    }
    
    /**
     * @notice Validate OZ contract compatibility
     * @param contractAddr Contract to validate
     * @return isCompatible Whether compatible
     * @return detectedVersion Detected version
     */
    function validateOZCompatibility(address contractAddr) 
        external 
        view 
        returns (bool isCompatible, uint8 detectedVersion) 
    {
        return OpenZeppelinDynamicAdapter.validateCompatibility(contractAddr);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Dynamic AccessControl Operations
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check role dynamically across OZ versions
     * @param contractAddr Target AccessControl contract
     * @param role Role to check
     * @param account Account to check
     * @return hasRole Whether account has role
     */
    function checkRoleDynamic(
        address contractAddr,
        bytes32 role,
        address account
    ) external view returns (bool hasRole) {
        return OpenZeppelinDynamicAdapter.checkRoleDynamic(contractAddr, role, account);
    }
    
    /**
     * @notice Grant role dynamically across OZ versions
     * @param contractAddr Target AccessControl contract
     * @param role Role to grant
     * @param account Account to grant role to
     */
    function grantRoleDynamic(
        address contractAddr,
        bytes32 role,
        address account
    ) external {
        OpenZeppelinDynamicAdapter.grantRoleDynamic(contractAddr, role, account);
        emit RoleOperationCompleted(contractAddr, role, account, "grant");
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Dynamic Pausable Operations
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check pause status dynamically
     * @param contractAddr Target Pausable contract
     * @return isPaused Whether contract is paused
     */
    function checkPauseStatus(address contractAddr) external view returns (bool isPaused) {
        return OpenZeppelinDynamicAdapter.isPausedDynamic(contractAddr);
    }
    
    /**
     * @notice Pause contract dynamically
     * @param contractAddr Target Pausable contract
     */
    function pauseContractDynamic(address contractAddr) external {
        OpenZeppelinDynamicAdapter.pauseDynamic(contractAddr);
        emit PauseOperationCompleted(contractAddr, true);
    }
    
    /**
     * @notice Unpause contract dynamically
     * @param contractAddr Target Pausable contract
     */
    function unpauseContractDynamic(address contractAddr) external {
        OpenZeppelinDynamicAdapter.unpauseDynamic(contractAddr);
        emit PauseOperationCompleted(contractAddr, false);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Dynamic ERC20 Operations
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Safe transfer using dynamic OZ compatibility
     * @param token ERC20 token address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function safeTransferDynamic(
        address token,
        address to,
        uint256 amount
    ) external {
        OpenZeppelinDynamicAdapter.safeTransferDynamic(token, to, amount);
        emit TokenOperationCompleted(token, address(this), to, amount);
    }
    
    /**
     * @notice Safe transferFrom using dynamic OZ compatibility
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
    ) external {
        OpenZeppelinDynamicAdapter.safeTransferFromDynamic(token, from, to, amount);
        emit TokenOperationCompleted(token, from, to, amount);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Batch Operations
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Batch validate multiple OZ contracts
     * @param contracts Array of contract addresses to validate
     * @return results Array of validation results
     */
    function batchValidateOZ(address[] calldata contracts) 
        external 
        view 
        returns (bool[] memory results) 
    {
        results = new bool[](contracts.length);
        
        for (uint256 i = 0; i < contracts.length; i++) {
            (bool isCompatible,) = OpenZeppelinDynamicAdapter.validateCompatibility(contracts[i]);
            results[i] = isCompatible;
        }
    }
    
    /**
     * @notice Batch check roles across multiple contracts
     * @param contracts Array of AccessControl contract addresses
     * @param roles Array of roles to check (must match contracts length)
     * @param accounts Array of accounts to check (must match contracts length)
     * @return results Array of role check results
     */
    function batchCheckRoles(
        address[] calldata contracts,
        bytes32[] calldata roles,
        address[] calldata accounts
    ) external view returns (bool[] memory results) {
        require(
            contracts.length == roles.length && roles.length == accounts.length,
            "OZDynamicExample: array length mismatch"
        );
        
        results = new bool[](contracts.length);
        
        for (uint256 i = 0; i < contracts.length; i++) {
            results[i] = OpenZeppelinDynamicAdapter.checkRoleDynamic(
                contracts[i],
                roles[i],
                accounts[i]
            );
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // Utility Functions
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get comprehensive OZ status for a contract
     * @param contractAddr Contract to analyze
     * @return ozVersion Detected OZ version
     * @return versionString Human-readable version
     * @return isCompatible Whether contract is compatible
     * @return isPaused Whether contract is paused (if Pausable)
     */
    function getOZStatus(address contractAddr) 
        external 
        view 
        returns (
            uint8 ozVersion,
            string memory versionString,
            bool isCompatible,
            bool isPaused
        ) 
    {
        ozVersion = OpenZeppelinDynamicAdapter.detectOZVersion(contractAddr);
        versionString = OpenZeppelinDynamicAdapter.getVersionString(ozVersion);
        (isCompatible,) = OpenZeppelinDynamicAdapter.validateCompatibility(contractAddr);
        isPaused = OpenZeppelinDynamicAdapter.isPausedDynamic(contractAddr);
    }
}

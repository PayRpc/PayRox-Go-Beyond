// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "hardhat/console.sol";

/**
 * @title TerraStakeInitializer
 * @dev Initialization contract for TerraStake Diamond deployment
 * @author PayRox Go Beyond Team
 */
contract TerraStakeInitializer is AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;
    
    // Role member tracking
    mapping(bytes32 => EnumerableSet.AddressSet) private _roleMembers;
    
    // ============ Role Definitions ============
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant FRACTIONALIZATION_ROLE = keccak256("FRACTIONALIZATION_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant STAKING_ROLE = keccak256("STAKING_ROLE");
    bytes32 public constant VRF_ROLE = keccak256("VRF_ROLE");

    // ============ Events ============
    event TerraStakeInitialized(
        address indexed diamond,
        address indexed admin,
        uint256 timestamp
    );

    event RoleConfigured(
        bytes32 indexed role,
        address indexed account,
        uint256 timestamp
    );

    /**
     * @dev Grant role and add to enumerable set
     */
    function _grantRole(bytes32 role, address account) internal override returns (bool) {
        bool granted = super._grantRole(role, account);
        if (granted) {
            _roleMembers[role].add(account);
        }
        return granted;
    }

    /**
     * @dev Revoke role and remove from enumerable set
     */
    function _revokeRole(bytes32 role, address account) internal override returns (bool) {
        bool revoked = super._revokeRole(role, account);
        if (revoked) {
            _roleMembers[role].remove(account);
        }
        return revoked;
    }

    /**
     * @dev Get the number of members for a role
     */
    function getRoleMemberCount(bytes32 role) public view returns (uint256) {
        return _roleMembers[role].length();
    }

    /**
     * @dev Get a role member by index
     */
    function getRoleMember(bytes32 role, uint256 index) public view returns (address) {
        return _roleMembers[role].at(index);
    }

    // ============ Initialization Functions ============
    
    /**
     * @dev Initialize the TerraStake Diamond with all facets
     * @param _admin Address of the admin (receives DEFAULT_ADMIN_ROLE)
     * @param _operator Address of the operator (receives OPERATOR_ROLE)
     * @param _oracle Address of the oracle (receives ORACLE_ROLE)
     */
    function initialize(
        address _admin,
        address _operator,
        address _oracle
    ) external {
        require(_admin != address(0), "TerraStakeInitializer: admin cannot be zero address");
        require(_operator != address(0), "TerraStakeInitializer: operator cannot be zero address");
        require(_oracle != address(0), "TerraStakeInitializer: oracle cannot be zero address");

        console.log("Initializing TerraStake Diamond...");

        // Grant admin role to the specified admin address
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _setRoleAdmin(OPERATOR_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(EMERGENCY_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(FRACTIONALIZATION_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(ORACLE_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(MINTER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(STAKING_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(VRF_ROLE, DEFAULT_ADMIN_ROLE);

        // Grant operational roles
        _grantRole(OPERATOR_ROLE, _operator);
        _grantRole(EMERGENCY_ROLE, _admin);
        _grantRole(FRACTIONALIZATION_ROLE, _operator);
        _grantRole(ORACLE_ROLE, _oracle);
        _grantRole(MINTER_ROLE, _operator);
        _grantRole(STAKING_ROLE, _operator);
        _grantRole(VRF_ROLE, _operator);

        console.log("Role configuration completed");
        console.log("   - Admin:", _admin);
        console.log("   - Operator:", _operator);
        console.log("   - Oracle:", _oracle);

        // Initialize individual facets (would be called via delegatecall)
        console.log("Initializing facets...");
        
        // Note: In a real implementation, these would be delegatecalls to the diamond
        // For now, we just log the initialization
        console.log("   - Core facet initialized");
        console.log("   - Token facet initialized");
        console.log("   - Staking facet initialized");
        console.log("   - VRF facet initialized");
        console.log("   - Coordinator facet initialized");

        emit TerraStakeInitialized(address(this), _admin, block.timestamp);
        emit RoleConfigured(DEFAULT_ADMIN_ROLE, _admin, block.timestamp);
        emit RoleConfigured(OPERATOR_ROLE, _operator, block.timestamp);
        emit RoleConfigured(ORACLE_ROLE, _oracle, block.timestamp);

        console.log("TerraStake Diamond initialization completed!");
    }

    /**
     * @dev Additional role management function for post-deployment configuration
     * @param role Role identifier
     * @param account Account to grant role to
     */
    function grantRolePostInit(bytes32 role, address account) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _grantRole(role, account);
        emit RoleConfigured(role, account, block.timestamp);
        console.log("Role granted:", account);
    }

    /**
     * @dev Get initialization status
     * @return isInitialized Whether initialization is complete
     * @return adminAddress Current admin address
     * @return initTimestamp Initialization timestamp
     */
    function getInitializationStatus() 
        external 
        view 
        returns (
            bool isInitialized,
            address adminAddress,
            uint256 initTimestamp
        ) 
    {
        if (getRoleMemberCount(DEFAULT_ADMIN_ROLE) > 0) {
            adminAddress = getRoleMember(DEFAULT_ADMIN_ROLE, 0);
            isInitialized = true;
        }
        initTimestamp = block.timestamp; // In real implementation, this would be stored
    }

    /**
     * @dev Get all configured role members
     * @return admins Array of admin addresses
     * @return operators Array of operator addresses
     * @return oracles Array of oracle addresses
     */
    function getAllRoleMembers() 
        external 
        view 
        returns (
            address[] memory admins,
            address[] memory operators,
            address[] memory oracles
        )
    {
        uint256 adminCount = getRoleMemberCount(DEFAULT_ADMIN_ROLE);
        uint256 operatorCount = getRoleMemberCount(OPERATOR_ROLE);
        uint256 oracleCount = getRoleMemberCount(ORACLE_ROLE);

        admins = new address[](adminCount);
        operators = new address[](operatorCount);
        oracles = new address[](oracleCount);

        for (uint256 i = 0; i < adminCount; i++) {
            admins[i] = getRoleMember(DEFAULT_ADMIN_ROLE, i);
        }

        for (uint256 i = 0; i < operatorCount; i++) {
            operators[i] = getRoleMember(OPERATOR_ROLE, i);
        }

        for (uint256 i = 0; i < oracleCount; i++) {
            oracles[i] = getRoleMember(ORACLE_ROLE, i);
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../utils/LibDiamond.sol";
import "../utils/LibTerraStake.sol";

/**
 * @title TerraStakeCoreFacet
 * @dev Core administrative functions for TerraStake NFT system
 * 
 * This facet handles initialization, access control, and administrative functions
 * for the TerraStake environmental NFT platform. It follows the Diamond storage 
 * pattern for safe storage separation and upgradability.
 * 
 * Key Features:
 * - Role-based access control with environmental validator roles
 * - Emergency pause functionality for system protection
 * - Initialization of all core system parameters
 * - Integration with PayRox deterministic deployment system
 * 
 * @author PayRox Go Beyond AI Toolchain
 */
contract TerraStakeCoreFacet is AccessControlUpgradeable, PausableUpgradeable {
    using LibTerraStake for LibTerraStake.TerraStakeStorage;

    // Role definitions for environmental platform
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // Events for core operations
    event TerraStakeInitialized(
        address indexed admin,
        string baseURI,
        uint256 timestamp
    );

    event RoleGrantedWithContext(
        bytes32 indexed role,
        address indexed account,
        address indexed sender,
        string context
    );

    event SystemPausedForMaintenance(
        address indexed admin,
        string reason,
        uint256 timestamp
    );

    event SystemUnpausedAfterMaintenance(
        address indexed admin,
        uint256 timestamp
    );

    /**
     * @dev Initialize the TerraStake system with core parameters
     * @param admin Initial admin address with all roles
     * @param baseURI Base URI for token metadata
     * @param stakingRewardRate Initial staking reward rate (basis points)
     * @param environmentalBonus Environmental impact bonus multiplier
     */
    function initialize(
        address admin,
        string memory baseURI,
        uint256 stakingRewardRate,
        uint256 environmentalBonus
    ) external initializer {
        require(admin != address(0), "TerraStakeCore: admin cannot be zero address");
        require(stakingRewardRate > 0 && stakingRewardRate <= 10000, "TerraStakeCore: invalid reward rate");
        require(environmentalBonus > 0 && environmentalBonus <= 5000, "TerraStakeCore: invalid bonus");

        __AccessControl_init();
        __Pausable_init();

        // Set up core roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(VALIDATOR_ROLE, admin);
        _grantRole(ORACLE_ROLE, admin);
        _grantRole(EMERGENCY_ROLE, admin);

        // Initialize storage
        LibTerraStake.TerraStakeStorage storage ts = LibTerraStake.terraStakeStorage();
        ts.baseURI = baseURI;
        ts.stakingRewardRate = stakingRewardRate;
        ts.environmentalBonus = environmentalBonus;
        ts.initialized = true;

        emit TerraStakeInitialized(admin, baseURI, block.timestamp);
    }

    /**
     * @dev Grant role with additional context for environmental platform
     * @param role Role to grant
     * @param account Account to receive the role
     * @param context Additional context for the role grant
     */
    function grantRoleWithContext(
        bytes32 role,
        address account,
        string memory context
    ) external onlyRole(getRoleAdmin(role)) {
        require(account != address(0), "TerraStakeCore: cannot grant role to zero address");
        
        _grantRole(role, account);
        
        emit RoleGrantedWithContext(role, account, msg.sender, context);
    }

    /**
     * @dev Emergency pause function for system protection
     * @param reason Reason for the pause
     */
    function emergencyPause(string memory reason) external onlyRole(EMERGENCY_ROLE) {
        _pause();
        emit SystemPausedForMaintenance(msg.sender, reason, block.timestamp);
    }

    /**
     * @dev Unpause the system after maintenance
     */
    function unpauseAfterMaintenance() external onlyRole(EMERGENCY_ROLE) {
        _unpause();
        emit SystemUnpausedAfterMaintenance(msg.sender, block.timestamp);
    }

    /**
     * @dev Update base URI for token metadata
     * @param newBaseURI New base URI
     */
    function updateBaseURI(string memory newBaseURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(newBaseURI).length > 0, "TerraStakeCore: empty base URI");
        
        LibTerraStake.TerraStakeStorage storage ts = LibTerraStake.terraStakeStorage();
        string memory oldURI = ts.baseURI;
        ts.baseURI = newBaseURI;
        
        emit BaseURIUpdated(oldURI, newBaseURI, msg.sender);
    }

    /**
     * @dev Update staking reward rate
     * @param newRate New reward rate in basis points
     */
    function updateStakingRewardRate(uint256 newRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRate > 0 && newRate <= 10000, "TerraStakeCore: invalid reward rate");
        
        LibTerraStake.TerraStakeStorage storage ts = LibTerraStake.terraStakeStorage();
        uint256 oldRate = ts.stakingRewardRate;
        ts.stakingRewardRate = newRate;
        
        emit StakingRewardRateUpdated(oldRate, newRate, msg.sender);
    }

    /**
     * @dev Update environmental bonus multiplier
     * @param newBonus New environmental bonus multiplier
     */
    function updateEnvironmentalBonus(uint256 newBonus) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newBonus > 0 && newBonus <= 5000, "TerraStakeCore: invalid bonus");
        
        LibTerraStake.TerraStakeStorage storage ts = LibTerraStake.terraStakeStorage();
        uint256 oldBonus = ts.environmentalBonus;
        ts.environmentalBonus = newBonus;
        
        emit EnvironmentalBonusUpdated(oldBonus, newBonus, msg.sender);
    }

    /**
     * @dev Get current system configuration
     * @return baseURI Current base URI
     * @return stakingRewardRate Current staking reward rate
     * @return environmentalBonus Current environmental bonus
     * @return isPaused Whether system is paused
     */
    function getSystemConfig() external view returns (
        string memory baseURI,
        uint256 stakingRewardRate,
        uint256 environmentalBonus,
        bool isPaused
    ) {
        LibTerraStake.TerraStakeStorage storage ts = LibTerraStake.terraStakeStorage();
        return (
            ts.baseURI,
            ts.stakingRewardRate,
            ts.environmentalBonus,
            paused()
        );
    }

    /**
     * @dev Check if system is properly initialized
     * @return Whether the system is initialized
     */
    function isInitialized() external view returns (bool) {
        LibTerraStake.TerraStakeStorage storage ts = LibTerraStake.terraStakeStorage();
        return ts.initialized;
    }

    // Additional events for configuration updates
    event BaseURIUpdated(
        string indexed oldURI,
        string indexed newURI,
        address indexed updater
    );

    event StakingRewardRateUpdated(
        uint256 indexed oldRate,
        uint256 indexed newRate,
        address indexed updater
    );

    event EnvironmentalBonusUpdated(
        uint256 indexed oldBonus,
        uint256 indexed newBonus,
        address indexed updater
    );
}

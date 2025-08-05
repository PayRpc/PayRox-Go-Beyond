// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITerraStakeCoreFacet
 * @dev AI-Generated interface for PayRox Go Beyond
 * @notice This interface is PayRox-compatible and future-ready
 * 
 * Compatibility: PayRox, OpenZeppelin, EIP
 * AI-Generated: Yes
 * PayRox Ready: Yes
 */

interface ITerraStakeCoreFacet {
// Events
event TerraStakeInitialized(address indexed, string baseURI, uint256 timestamp);
event RoleGrantedWithContext(bytes32 indexed, address indexed, address indexed, string context);
event SystemPausedForMaintenance(address indexed, string reason, uint256 timestamp);
event SystemUnpausedAfterMaintenance(address indexed, uint256 timestamp);
event BaseURIUpdated(string indexed, string indexed, address indexed);
event StakingRewardRateUpdated(uint256 indexed, uint256 indexed, address indexed);
event EnvironmentalBonusUpdated(uint256 indexed, uint256 indexed, address indexed);

// Interface Functions
function initialize(address admin, string memory, uint256 stakingRewardRate, uint256 environmentalBonus) external;
    function grantRoleWithContext(bytes32 role, address account, string memory) external;
    function emergencyPause(string memory) external;
    function unpauseAfterMaintenance() external;
    function updateBaseURI(string memory) external;
    function updateStakingRewardRate(uint256 newRate) external;
    function updateEnvironmentalBonus(uint256 newBonus) external;
    function getSystemConfig() external view returns (string memory, uint256 stakingRewardRate, uint256 environmentalBonus, bool isPaused);
    function isInitialized() external view returns (bool param74ldq2ybq);
}

/**
 * @dev PayRox Integration Notes:
 * - This interface is designed for facet compatibility
 * - All functions are gas-optimized for dispatcher routing
 * - Custom errors used for efficient error handling
 * - Events follow PayRox monitoring standards
 * 
 * Future Enhancement Ready:
 * - Easy to swap with production interface
 * - Maintains signature compatibility
 * - Supports cross-chain deployment
 * - Compatible with CREATE2 deterministic deployment
 */
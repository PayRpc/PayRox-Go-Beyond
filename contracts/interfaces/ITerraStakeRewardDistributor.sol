// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

/**
 * @title ITerraStakeRewardDistributor
 * @notice Interface for reward distribution system
 */
interface ITerraStakeRewardDistributor {
    function distributeReward(address user, uint256 amount) external returns (bool);
    function addPenaltyRewards(uint256 amount) external;
    function getPendingRewards(address user) external view returns (uint256);
    function getTotalDistributed() external view returns (uint256);
}

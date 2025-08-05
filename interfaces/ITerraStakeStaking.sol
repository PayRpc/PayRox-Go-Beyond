// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.28;

/**
 * @title ITerraStakeStaking
 * @notice Interface for TerraStake staking functionality
 */
interface ITerraStakeStaking {
    function stake(uint256 projectId, uint256 amount, uint256 duration, bool isLP, bool autoCompound) external;
    function unstake(uint256 projectId) external;
    function claimRewards(uint256 projectId) external;
    function calculateRewards(address user, uint256 projectId) external view returns (uint256);
    function getUserStake(address user, uint256 projectId) external view returns (uint256);
    function getUserTotalStake(address user) external view returns (uint256);
    function isValidator(address user) external view returns (bool);
    function getTotalStaked() external view returns (uint256);
}

/**
 * @title ITerraStakeRewardDistributor
 * @notice Interface for reward distribution system
 */
interface ITerraStakeRewardDistributor {
    function distributeReward(address user, uint256 amount) external returns (bool);
    function addPenaltyRewards(uint256 amount) external;
}

/**
 * @title ITerraStakeProjects
 * @notice Interface for project management
 */
interface ITerraStakeProjects {
    function projectExists(uint256 projectId) external view returns (bool);
    function incrementStakerCount(uint256 projectId) external;
    function decrementStakerCount(uint256 projectId) external;
    function getProjectCount() external view returns (uint256);
}

/**
 * @title ITerraStakeGovernance
 * @notice Interface for governance functionality
 */
interface ITerraStakeGovernance {
    function recordVote(uint256 proposalId, address voter, uint256 votingPower, bool support) external;
    function createProposal(
        uint256 nonce,
        address proposer,
        string calldata description,
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas
    ) external returns (uint256);
}

/**
 * @title ITerraStakeSlashing
 * @notice Interface for slashing functionality
 */
interface ITerraStakeSlashing {
    function slashValidator(address validator, uint256 amount) external returns (bool);
}

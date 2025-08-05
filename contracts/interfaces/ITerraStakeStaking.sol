// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITerraStakeStaking
 * @dev AI-Generated interface for PayRox Go Beyond
 * @notice This interface is PayRox-compatible and future-ready
 * 
 * Compatibility: PayRox, OpenZeppelin, EIP
 * AI-Generated: Yes
 * PayRox Ready: Yes
 */

interface ITerraStakeStaking {
// Custom Errors for Gas Efficiency
error ZeroAmount();
error InsufficientStakingDuration(uint256 minimum, uint256 provided);
error ProjectDoesNotExist(uint256 projectId);
error NoActiveStakingPosition(address user, uint256 projectId);
error TransferFailed(address token, address from, address to, uint256 amount);
error InvalidAddress(string parameter, address provided);
error InvalidParameter(string parameter, uint256 provided);
error UnauthorizedCaller(address caller, string requiredRole);
error StakingLocked(uint256 releaseTime);
error GovernanceViolation(address user);
error SlashingFailed(address validator, uint256 amount);
error AlreadyValidator(address validator);
error NotValidator(address account);
error DistributionFailed(uint256 amount);
error EmergencyPaused();
error ActionNotPermittedForValidator();
error RateTooHigh(uint256 provided, uint256 maximum);
error InvalidTierConfiguration();
error BatchTransferFailed();

// Events
event Staked(address indexed, uint256 indexed, uint256 amount, uint256 duration, uint256 timestamp, uint256 newTotal);
event Unstaked(address indexed, uint256 indexed, uint256 amount, uint256 penalty, uint256 timestamp);
event RewardClaimed(address indexed, uint256 indexed, uint256 amount, uint256 timestamp);
event RewardCompounded(address indexed, uint256 indexed, uint256 amount, uint256 timestamp);
event LiquidityInjected(address indexed, uint256 amount, uint256 timestamp);
event PenaltyApplied(address indexed, uint256 indexed, uint256 total, uint256 burned, uint256 redistributed, uint256 toLiquidity);
event ValidatorAdded(address indexed, uint256 timestamp);
event ValidatorRemoved(address indexed, uint256 timestamp);
event ValidatorStatusChanged(address indexed, bool isValidator);
event ValidatorRewardsAccumulated(uint256 amount, uint256 newTotal);
event ValidatorRewardsDistributed(address indexed, uint256 amount);
event GovernanceProposalCreated(uint256 indexed, address creator, string description);
event ProposalVoted(uint256 indexed, address indexed, uint256 votingPower, bool support);
event GovernanceViolatorMarked(address indexed, uint256 timestamp);
event TiersUpdated(uint256[] minDurations, uint256[] multipliers, bool[] votingRights);
event LiquidityInjectionRateUpdated(uint256 newRate);
event AutoLiquidityToggled(bool enabled);
event ValidatorThresholdUpdated(uint256 newThreshold);
event RewardDistributorUpdated(address indexed);
event LiquidityPoolUpdated(address indexed);
event TokenRecovered(address indexed, uint256 amount, address recipient);
event Slashed(address indexed, uint256 amount, uint256 timestamp);
event SlashingContractUpdated(address indexed);
event ProjectApprovalVoted(uint256 indexed, address voter, bool approved, uint256 votingPower);
event RewardRateAdjusted(uint256 oldRate, uint256 newRate);
event ValidatorCommissionUpdated(address indexed, uint256 newCommission);
event HalvingApplied(uint256 indexed, uint256 oldBaseAPR, uint256 newBaseAPR, uint256 oldBoostedAPR, uint256 newBoostedAPR);
event DynamicRewardsToggled(bool enabled);
event GovernanceQuorumUpdated(uint256 newQuorum);

// Interface Functions
function initialize(address _nftContract, address _stakingToken, address _rewardDistributor, address _liquidityPool, address _projectsContract, address _governanceContract, address _admin) external;
    function setSlashingContract(address _slashingContract) external;
    function stake(uint256 projectId, uint256 amount, uint256 duration, bool isLP, bool autoCompound) external;
    function batchStake(uint256[] calldata, uint256[] calldata, uint256[] calldata, bool[] calldata, bool[] calldata) external;
    function unstake(uint256 projectId) external;
    function batchUnstake(uint256[] calldata) external;
    function claimRewards(uint256 projectId) external;
    function becomeValidator() external;
    function claimValidatorRewards() external;
    function updateValidatorCommission(uint256 newCommissionRate) external;
    function voteOnProposal(uint256 proposalId, bool support) external;
    function createProposal(string calldata, address[] calldata, uint256[] calldata, bytes[] calldata) external;
    function markGovernanceViolator(address violator) external;
    function updateTiers(uint256[] calldata, uint256[] calldata, bool[] calldata) external;
    function setLiquidityInjectionRate(uint256 newRate) external;
    function toggleAutoLiquidity(bool enabled) external;
    function setValidatorThreshold(uint256 newThreshold) external;
    function setRewardDistributor(address newDistributor) external;
    function setLiquidityPool(address newPool) external;
    function pause() external;
    function unpause() external;
    function recoverERC20(address token) external;
    function slash(address validator, uint256 amount) external;
    function calculateRewards(address user, uint256 projectId) external view returns (uint256 param8hlrms6zy);
    function getApplicableTier(uint256 duration) external view returns (uint256 param9gcxbmni2);
    function getUserStake(address user, uint256 projectId) external view returns (uint256 paramxmbxhl9bo);
    function getUserTotalStake(address user) external view returns (uint256 param4zbnu1xy8);
    function getUserPositions(address user) external view returns (StakingPosition[] memory);
    function getUserPositionsWithTiers(address user) external view returns (PositionWithTier[] memory);
    function getPenaltyHistory(address user) external view returns (PenaltyEvent[] memory);
    function isValidator(address user) external view returns (bool paramn6cuonx03);
    function getValidatorCommission(address validator) external view returns (uint256 paramzmb632l07);
    function isGovernanceViolator(address user) external view returns (bool params9g6y5tq1);
    function getGovernanceVotes(address user) external view returns (uint256 paramckz4eudtm);
    function getTotalStaked() external view returns (uint256 paramriyfkn6x4);
    function getValidatorRewardPool() external view returns (uint256 paramqjwuiia1i);
    function getAllTiers() external view returns (StakingTier[] memory);
    function getBatchUserStakes(address[] calldata, uint256 projectId) external view returns (uint256[] memory);
    function getTopStakers(uint256 limit) external view returns (address[] memory, uint256[] memory);
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
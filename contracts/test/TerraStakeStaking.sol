// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

import "../interfaces/ITerraStakeRewardDistributor.sol";
import "../interfaces/ITerraStakeProjects.sol";
import "../interfaces/ITerraStakeGovernance.sol";
import "../interfaces/ITerraStakeSlashing.sol";

/**
 * @title TerraStakeStaking
 * @notice Official staking contract for the TerraStake ecosystem.
 * @dev Implements DAO governance integration.
 */
contract TerraStakeStaking is 
    Initializable,
    ERC165Upgradeable,
    AccessControlEnumerableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable, 
    UUPSUpgradeable 
{
    using Math for uint256;

    // -------------------------------------------
    //  Custom Errors
    // -------------------------------------------
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

    // -------------------------------------------
    //  Constants
    // -------------------------------------------
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant SLASHER_ROLE = keccak256("SLASHER_ROLE");
    uint256 public constant BASE_APR = 10; // 10% APR base
    uint256 public constant BOOSTED_APR = 20; // 20% APR if TVL < 1M TSTAKE
    uint256 public constant NFT_APR_BOOST = 10;
    uint256 public constant LP_APR_BOOST = 15;
    uint256 public constant BASE_PENALTY_PERCENT = 10;
    uint256 public constant MAX_PENALTY_PERCENT = 30;
    uint256 public constant LOW_STAKING_THRESHOLD = 1_000_000 * 10**18;
    uint256 public constant GOVERNANCE_VESTING_PERIOD = 7 days;
    uint256 public constant MAX_LIQUIDITY_RATE = 10;
    uint256 public constant MIN_STAKING_DURATION = 30 days;
    uint256 public constant GOVERNANCE_THRESHOLD = 10_000 * 10**18; // 10,000 tokens minimum for governance rights
    address private constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // -------------------------------------------
    //  Structs
    // -------------------------------------------
    struct StakingPosition {
        uint256 amount;
        uint256 stakingStart;
        uint256 lastCheckpoint;
        uint256 duration;
        bool isLPStaker;
        bool hasNFTBoost;
        bool autoCompounding;
        uint256 projectId;
    }

    struct StakingTier {
        uint256 minDuration;
        uint256 multiplier;
        bool governanceRights;
    }

    struct PositionWithTier {
        StakingPosition position;
        uint256 currentTier;
        uint256 currentMultiplier;
        bool nextTierAvailable;
        uint256 nextTierDuration;
        uint256 nextTierMultiplier;
        uint256 timeToNextTier;
        uint256 pendingRewards;
    }

    struct PenaltyEvent {
        uint256 projectId;
        uint256 timestamp;
        uint256 totalPenalty;
        uint256 redistributed;
        uint256 burned;
        uint256 toLiquidity;
    }

    struct ProjectDetails {
        uint256 id;
        string name;
        string description;
        uint256 totalStakers;
    }

    // -------------------------------------------
    //  State Variables
    // -------------------------------------------
    IERC1155Upgradeable public nftContract;
    IERC20Upgradeable public stakingToken;
    ITerraStakeRewardDistributor public rewardDistributor;
    ITerraStakeProjects public projectsContract;
    ITerraStakeGovernance public governanceContract;
    ITerraStakeSlashing public slashingContract;
    address public liquidityPool;
    
    uint256 public liquidityInjectionRate; // Percentage of rewards reinjected
    bool public autoLiquidityEnabled;
    uint256 public halvingPeriod; // In seconds (e.g. 730 days)
    uint256 public lastHalvingTime;
    uint256 public halvingEpoch;
    uint256 public proposalNonce;
    uint256 public validatorThreshold;
    
    mapping(address => mapping(uint256 => StakingPosition)) private _stakingPositions;
    mapping(address => uint256) private _governanceVotes;
    mapping(address => uint256) private _stakingBalance;
    mapping(address => bool) private _governanceViolators;
    mapping(address => bool) private _validators;
    
    uint256 private _totalStaked;
    StakingTier[] private _tiers;
    
    mapping(address => PenaltyEvent[]) private _penaltyHistory;
    
    // -------------------------------------------
    //  Additional State Variables
    // -------------------------------------------
    mapping(address => uint256) private _validatorCommission;
    mapping(uint256 => uint256) private _projectVotes;
    uint256 public validatorRewardPool;
    uint256 public governanceQuorum;
    bool public dynamicRewardsEnabled;
    uint256 public lastRewardAdjustmentTime;
    
    uint256 public dynamicBaseAPR;
    uint256 public dynamicBoostedAPR;

    // -------------------------------------------
    //  Events
    // -------------------------------------------
    event Staked(address indexed user, uint256 indexed projectId, uint256 amount, uint256 duration, uint256 timestamp, uint256 newTotal);
    event Unstaked(address indexed user, uint256 indexed projectId, uint256 amount, uint256 penalty, uint256 timestamp);
    event RewardClaimed(address indexed user, uint256 indexed projectId, uint256 amount, uint256 timestamp);
    event RewardCompounded(address indexed user, uint256 indexed projectId, uint256 amount, uint256 timestamp);
    event LiquidityInjected(address indexed destination, uint256 amount, uint256 timestamp);
    event PenaltyApplied(address indexed user, uint256 indexed projectId, uint256 total, uint256 burned, uint256 redistributed, uint256 toLiquidity);
    event ValidatorAdded(address indexed validator, uint256 timestamp);
    event ValidatorRemoved(address indexed validator, uint256 timestamp);
    event ValidatorStatusChanged(address indexed validator, bool isValidator);
    event ValidatorRewardsAccumulated(uint256 amount, uint256 newTotal);
    event ValidatorRewardsDistributed(address indexed validator, uint256 amount);
    event GovernanceProposalCreated(uint256 indexed proposalId, address creator, string description);
    event ProposalVoted(uint256 indexed proposalId, address indexed voter, uint256 votingPower, bool support);
    event GovernanceViolatorMarked(address indexed violator, uint256 timestamp);
    event TiersUpdated(uint256[] minDurations, uint256[] multipliers, bool[] votingRights);
    event LiquidityInjectionRateUpdated(uint256 newRate);
    event AutoLiquidityToggled(bool enabled);
    event ValidatorThresholdUpdated(uint256 newThreshold);
    event RewardDistributorUpdated(address indexed newDistributor);
    event LiquidityPoolUpdated(address indexed newPool);
    event TokenRecovered(address indexed token, uint256 amount, address recipient);
    event Slashed(address indexed validator, uint256 amount, uint256 timestamp);
    event SlashingContractUpdated(address indexed newContract);
    event ProjectApprovalVoted(uint256 indexed projectId, address voter, bool approved, uint256 votingPower);
    event RewardRateAdjusted(uint256 oldRate, uint256 newRate);
    event ValidatorCommissionUpdated(address indexed validator, uint256 newCommission);
    event HalvingApplied(
        uint256 indexed epoch,
        uint256 oldBaseAPR,
        uint256 newBaseAPR,
        uint256 oldBoostedAPR,
        uint256 newBoostedAPR
    );
    event DynamicRewardsToggled(bool enabled);
    event GovernanceQuorumUpdated(uint256 newQuorum);

    // -------------------------------------------
    //  Constructor & Initializer
    // -------------------------------------------
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _nftContract,
        address _stakingToken,
        address _rewardDistributor,
        address _liquidityPool,
        address _projectsContract,
        address _governanceContract,
        address _admin
    ) external initializer {
        __AccessControlEnumerable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        __ERC165_init();
        if (_nftContract == address(0)) revert InvalidAddress("nftContract", _nftContract);
        if (_stakingToken == address(0)) revert InvalidAddress("stakingToken", _stakingToken);
        if (_rewardDistributor == address(0)) revert InvalidAddress("rewardDistributor", _rewardDistributor);
        if (_liquidityPool == address(0)) revert InvalidAddress("liquidityPool", _liquidityPool);
        if (_projectsContract == address(0)) revert InvalidAddress("projectsContract", _projectsContract);
        if (_governanceContract == address(0)) revert InvalidAddress("governanceContract", _governanceContract);
        if (_admin == address(0)) revert InvalidAddress("admin", _admin);
        nftContract = IERC1155Upgradeable(_nftContract);
        stakingToken = IERC20Upgradeable(_stakingToken);
        rewardDistributor = ITerraStakeRewardDistributor(_rewardDistributor);
        liquidityPool = _liquidityPool;
        projectsContract = ITerraStakeProjects(_projectsContract);
        governanceContract = ITerraStakeGovernance(_governanceContract);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(GOVERNANCE_ROLE, _governanceContract);
        _grantRole(UPGRADER_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        halvingPeriod = 730 days;
        lastHalvingTime = block.timestamp;
        halvingEpoch = 0;
        liquidityInjectionRate = 5;
        autoLiquidityEnabled = true;
        validatorThreshold = 100_000 * 10**18;
        // Initialize tiers – ensure they are ordered by duration ascending
        _tiers.push(StakingTier(30 days, 100, false));
        _tiers.push(StakingTier(90 days, 150, true));
        _tiers.push(StakingTier(180 days, 200, true));
        _tiers.push(StakingTier(365 days, 300, true));
        // Additional parameters
        governanceQuorum = 1000;
        dynamicRewardsEnabled = false;
        lastRewardAdjustmentTime = block.timestamp;
        dynamicBaseAPR = BASE_APR;
        dynamicBoostedAPR = BOOSTED_APR;
    }

    function setSlashingContract(address _slashingContract) external onlyRole(GOVERNANCE_ROLE) {
        if (_slashingContract == address(0)) revert InvalidAddress("slashingContract", _slashingContract);
        slashingContract = ITerraStakeSlashing(_slashingContract);
        _grantRole(SLASHER_ROLE, _slashingContract);
        emit SlashingContractUpdated(_slashingContract);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    // -------------------------------------------
    //  Staking Operations
    // -------------------------------------------

    function stake(
        uint256 projectId,
        uint256 amount,
        uint256 duration,
        bool isLP,
        bool autoCompound
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (duration < MIN_STAKING_DURATION) revert InsufficientStakingDuration(MIN_STAKING_DURATION, duration);
        if (!projectsContract.projectExists(projectId)) revert ProjectDoesNotExist(projectId);
        uint256 userStakingBalance = _stakingBalance[msg.sender];
        uint256 currentTotalStaked = _totalStaked;
        bool hasNFTBoost = nftContract.balanceOf(msg.sender, 1) > 0;
        StakingPosition storage position = _stakingPositions[msg.sender][projectId];
        if (position.amount > 0) {
            _claimRewards(msg.sender, projectId);
        } else {
            position.stakingStart = block.timestamp;
            position.projectId = projectId;
        }
        position.amount += amount;
        position.lastCheckpoint = block.timestamp;
        position.duration = duration;
        position.isLPStaker = isLP;
        position.hasNFTBoost = hasNFTBoost;
        position.autoCompounding = autoCompound;
        currentTotalStaked += amount;
        _totalStaked = currentTotalStaked;
        userStakingBalance += amount;
        _stakingBalance[msg.sender] = userStakingBalance;
        // Update governance votes if threshold reached and not flagged as violator
        if (userStakingBalance >= GOVERNANCE_THRESHOLD && !_governanceViolators[msg.sender]) {
            _governanceVotes[msg.sender] = userStakingBalance;
        }
        bool success = stakingToken.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed(address(stakingToken), msg.sender, address(this), amount);
        projectsContract.incrementStakerCount(projectId);
        if (userStakingBalance >= validatorThreshold && !_validators[msg.sender]) {
            _validators[msg.sender] = true;
            emit ValidatorStatusChanged(msg.sender, true);
        }
        emit Staked(msg.sender, projectId, amount, duration, block.timestamp, position.amount);
    }

    /**
     * @notice Stake tokens across multiple projects in a single transaction
     * @param projectIds Array of project IDs to stake to
     * @param amounts Array of amounts to stake to each project
     * @param durations Array of staking durations for each position
     * @param isLP Array of flags indicating if staking LP tokens
     * @param autoCompound Array of flags indicating if auto-compounding is enabled
     */
    function batchStake(
        uint256[] calldata projectIds,
        uint256[] calldata amounts,
        uint256[] calldata durations,
        bool[] calldata isLP,
        bool[] calldata autoCompound
    ) external nonReentrant whenNotPaused {
        uint256 length = projectIds.length;
        if (length == 0) revert InvalidParameter("projectIds", 0);
        
        // Validate array lengths match
        if (amounts.length != length || durations.length != length || 
            isLP.length != length || autoCompound.length != length) {
            revert InvalidParameter("arrayLengths", length);
        }
        
        // Calculate total amount to stake
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < length; i++) {
            if (amounts[i] == 0) revert ZeroAmount();
            totalAmount += amounts[i];
        }
        
        // Transfer the total amount in one operation
        if (!stakingToken.transferFrom(msg.sender, address(this), totalAmount)) 
            revert TransferFailed(address(stakingToken), msg.sender, address(this), totalAmount);
        
        // Process each staking position
        for (uint256 i = 0; i < length; i++) {
            if (durations[i] < MIN_STAKING_DURATION) 
                revert InsufficientStakingDuration(MIN_STAKING_DURATION, durations[i]);
            
            if (!projectsContract.projectExists(projectIds[i])) 
                revert ProjectDoesNotExist(projectIds[i]);
            
            // Check if user has an NFT boost
            bool hasNFTBoost = nftContract.balanceOf(msg.sender, 1) > 0;
            
            // Get staking position
            StakingPosition storage position = _stakingPositions[msg.sender][projectIds[i]];
            
            // If position exists, claim rewards first
            if (position.amount > 0) {
                _claimRewards(msg.sender, projectIds[i]);
            } else {
                // New position
                position.stakingStart = block.timestamp;
                position.projectId = projectIds[i];
            }
            
            // Update position
            position.amount += amounts[i];
            position.lastCheckpoint = block.timestamp;
            position.duration = durations[i];
            position.isLPStaker = isLP[i];
            position.hasNFTBoost = hasNFTBoost;
            position.autoCompounding = autoCompound[i];
            
            // Update totals
            _totalStaked += amounts[i];
            _stakingBalance[msg.sender] += amounts[i];
            
            // Update project stats
            projectsContract.incrementStakerCount(projectIds[i]);
            
            emit Staked(msg.sender, projectIds[i], amounts[i], durations[i], block.timestamp, position.amount);
        }
        
        // Update governance votes if threshold reached and not flagged as violator
        if (_stakingBalance[msg.sender] >= GOVERNANCE_THRESHOLD && !_governanceViolators[msg.sender]) {
            _governanceVotes[msg.sender] = _stakingBalance[msg.sender];
        }
        
        // Check validator status after all stakes processed
        if (_stakingBalance[msg.sender] >= validatorThreshold && !_validators[msg.sender]) {
            _validators[msg.sender] = true;
            emit ValidatorStatusChanged(msg.sender, true);
        }
    }

    function unstake(uint256 projectId) external nonReentrant {
        StakingPosition storage position = _stakingPositions[msg.sender][projectId];
        if (position.amount == 0) revert NoActiveStakingPosition(msg.sender, projectId);
        _claimRewards(msg.sender, projectId);
        uint256 amount = position.amount;
        uint256 stakingTime = block.timestamp - position.stakingStart;
        uint256 penalty = 0;
        if (stakingTime < position.duration) {
            uint256 remainingTime = position.duration - stakingTime;
            uint256 penaltyPercent = BASE_PENALTY_PERCENT + ((remainingTime * (MAX_PENALTY_PERCENT - BASE_PENALTY_PERCENT)) / position.duration);
            penalty = (amount * penaltyPercent) / 100;
            _handlePenalty(msg.sender, projectId, penalty);
        }
        _totalStaked -= amount;
        _stakingBalance[msg.sender] -= amount;
        if (_stakingBalance[msg.sender] < GOVERNANCE_THRESHOLD) {
            _governanceVotes[msg.sender] = 0;
        } else {
            _governanceVotes[msg.sender] = _stakingBalance[msg.sender];
        }
        projectsContract.decrementStakerCount(projectId);
        uint256 transferAmount = amount - penalty;
        delete _stakingPositions[msg.sender][projectId];
        if (_stakingBalance[msg.sender] < validatorThreshold) {
            _validators[msg.sender] = false;
            emit ValidatorStatusChanged(msg.sender, false);
        }
        bool success = stakingToken.transfer(msg.sender, transferAmount);
        if (!success) revert TransferFailed(address(stakingToken), address(this), msg.sender, transferAmount);
        emit Unstaked(msg.sender, projectId, transferAmount, penalty, block.timestamp);
    }

    /**
     * @notice Unstake tokens from multiple projects in a single transaction
     * @param projectIds Array of project IDs to unstake from
     */
    function batchUnstake(uint256[] calldata projectIds) external nonReentrant whenNotPaused {
        uint256 length = projectIds.length;
        if (length == 0) revert InvalidParameter("projectIds", 0);
        
        uint256 totalAmount = 0;
        uint256 totalPenalty = 0;
        uint256 totalToRedistribute = 0;
        uint256 totalToBurn = 0;
        uint256 totalToLiquidity = 0;
        
        // First pass: calculate totals and claim rewards
        for (uint256 i = 0; i < length; i++) {
            uint256 projectId = projectIds[i];
            StakingPosition storage position = _stakingPositions[msg.sender][projectId];
            
            if (position.amount == 0) revert NoActiveStakingPosition(msg.sender, projectId);
            
            // Claim rewards first
            _claimRewards(msg.sender, projectId);
            
            // Calculate if we need to apply early unstaking penalty
            uint256 stakingEndTime = position.stakingStart + position.duration;
            uint256 amount = position.amount;
            uint256 penalty = 0;
            uint256 toRedistribute = 0;
            uint256 toBurn = 0;
            uint256 toLiquidity = 0;
            
            // If unstaking early, apply penalty
            if (block.timestamp < stakingEndTime) {
                uint256 timeRemaining = stakingEndTime - block.timestamp;
                // Calculate penalty percentage (linear from BASE_PENALTY to MAX_PENALTY)
                uint256 penaltyPercent = BASE_PENALTY_PERCENT + ((timeRemaining * (MAX_PENALTY_PERCENT - BASE_PENALTY_PERCENT)) / position.duration);
                penalty = (amount * penaltyPercent) / 100;
                
                // Calculate penalty distributions
                if (penalty > 0) {
                    toRedistribute = penalty / 2;
                    toBurn = penalty / 4;
                    toLiquidity = penalty - toRedistribute - toBurn;
                    
                    // Record penalty event
                    _penaltyHistory[msg.sender].push(PenaltyEvent({
                        projectId: projectId,
                        timestamp: block.timestamp,
                        totalPenalty: penalty,
                        redistributed: toRedistribute,
                        burned: toBurn,
                        toLiquidity: toLiquidity
                    }));
                }
            }
            
            totalAmount += position.amount - penalty;
            totalPenalty += penalty;
            totalToRedistribute += toRedistribute;
            totalToBurn += toBurn;
            totalToLiquidity += toLiquidity;
            
            // Update totals
            _totalStaked -= position.amount;
            _stakingBalance[msg.sender] -= position.amount;
            
            // Update project stats
            projectsContract.decrementStakerCount(projectId);
            
            // Clear position
            delete _stakingPositions[msg.sender][projectId];
            
            emit Unstaked(msg.sender, projectId, position.amount - penalty, penalty, block.timestamp);
        }
        
        // Update governance votes if threshold no longer met
        if (_stakingBalance[msg.sender] < GOVERNANCE_THRESHOLD) {
            _governanceVotes[msg.sender] = 0;
        } else {
            _governanceVotes[msg.sender] = _stakingBalance[msg.sender];
        }
        
        // Check validator status
        if (_validators[msg.sender] && _stakingBalance[msg.sender] < validatorThreshold) {
            _validators[msg.sender] = false;
            emit ValidatorStatusChanged(msg.sender, false);
        }
        
        // Handle all token transfers
        if (totalAmount > 0) {
            bool success = stakingToken.transfer(msg.sender, totalAmount);
            if (!success) revert TransferFailed(address(stakingToken), address(this), msg.sender, totalAmount);
        }
        
        if (totalPenalty > 0) {
            // Send burn amount
            if (totalToBurn > 0) {
                bool success = stakingToken.transfer(BURN_ADDRESS, totalToBurn);
                if (!success) revert TransferFailed(address(stakingToken), address(this), BURN_ADDRESS, totalToBurn);
            }
            
            // Send redistribution amount
            if (totalToRedistribute > 0) {
                bool success = stakingToken.transfer(address(rewardDistributor), totalToRedistribute);
                if (!success) revert TransferFailed(address(stakingToken), address(this), address(rewardDistributor), totalToRedistribute);
                
                // Inform the reward distributor about the new penalties to redistribute
                rewardDistributor.addPenaltyRewards(totalToRedistribute);
            }
            
            // Send liquidity amount
            if (totalToLiquidity > 0) {
                bool success = stakingToken.transfer(liquidityPool, totalToLiquidity);
                if (!success) revert TransferFailed(address(stakingToken), address(this), liquidityPool, totalToLiquidity);
                
                emit LiquidityInjected(liquidityPool, totalToLiquidity, block.timestamp);
            }
        }
    }

    function claimRewards(uint256 projectId) external nonReentrant {
        _claimRewards(msg.sender, projectId);
    }

    function _claimRewards(address user, uint256 projectId) internal {
        StakingPosition storage position = _stakingPositions[user][projectId];
        if (position.amount == 0) revert NoActiveStakingPosition(user, projectId);
        uint256 reward = calculateRewards(user, projectId);
        if (reward == 0) {
            position.lastCheckpoint = block.timestamp;
            return;
        }
        if (position.autoCompounding) {
            uint256 compoundAmount = (reward * 20) / 100;
            position.amount += compoundAmount;
            _totalStaked += compoundAmount;
            _stakingBalance[user] += compoundAmount;
            if (_stakingBalance[user] >= GOVERNANCE_THRESHOLD && !_governanceViolators[user]) {
                _governanceVotes[user] = _stakingBalance[user];
            }
            reward -= compoundAmount;
            emit RewardCompounded(user, projectId, compoundAmount, block.timestamp);
        }
        if (autoLiquidityEnabled) {
            uint256 liquidityAmount = (reward * liquidityInjectionRate) / 100;
            if (liquidityAmount > 0) {
                reward -= liquidityAmount;
                bool success = stakingToken.transfer(liquidityPool, liquidityAmount);
                if (!success) revert TransferFailed(address(stakingToken), address(this), liquidityPool, liquidityAmount);
                emit LiquidityInjected(liquidityPool, liquidityAmount, block.timestamp);
            }
        }
        _distributeValidatorRewards(reward);
        position.lastCheckpoint = block.timestamp;
        if (reward > 0) {
            bool success = rewardDistributor.distributeReward(user, reward);
            if (!success) revert DistributionFailed(reward);
            emit RewardClaimed(user, projectId, reward, block.timestamp);
        }
    }

    function _distributeValidatorRewards(uint256 rewardAmount) internal {
        uint256 validatorShare = (rewardAmount * 5) / 100;
        if (validatorShare > 0) {
            validatorRewardPool += validatorShare;
            emit ValidatorRewardsAccumulated(validatorShare, validatorRewardPool);
        }
    }

    function _handlePenalty(address user, uint256 projectId, uint256 penaltyAmount) internal {
        uint256 burnAmount = (penaltyAmount * 40) / 100;
        uint256 redistributeAmount = (penaltyAmount * 40) / 100;
        uint256 liquidityAmount = penaltyAmount - burnAmount - redistributeAmount;
        bool success = stakingToken.transfer(BURN_ADDRESS, burnAmount);
        if (!success) revert TransferFailed(address(stakingToken), address(this), BURN_ADDRESS, burnAmount);
        success = stakingToken.transfer(address(rewardDistributor), redistributeAmount);
        if (!success) revert TransferFailed(address(stakingToken), address(this), address(rewardDistributor), redistributeAmount);
        success = stakingToken.transfer(liquidityPool, liquidityAmount);
        if (!success) revert TransferFailed(address(stakingToken), address(this), liquidityPool, liquidityAmount);
        PenaltyEvent memory penEvent = PenaltyEvent({
            projectId: projectId,
            timestamp: block.timestamp,
            totalPenalty: penaltyAmount,
            redistributed: redistributeAmount,
            burned: burnAmount,
            toLiquidity: liquidityAmount
        });
        _penaltyHistory[user].push(penEvent);
        emit PenaltyApplied(user, projectId, penaltyAmount, burnAmount, redistributeAmount, liquidityAmount);
    }

    // -------------------------------------------
    //  Validator Operations
    // -------------------------------------------
    
    function becomeValidator() external nonReentrant whenNotPaused {
        if (_validators[msg.sender]) revert AlreadyValidator(msg.sender);
        if (_stakingBalance[msg.sender] < validatorThreshold) 
            revert InvalidParameter("validatorThreshold", _stakingBalance[msg.sender]);
        
        _validators[msg.sender] = true;
        _validatorCommission[msg.sender] = 500; // Default 5% commission (500 basis points)
        
        emit ValidatorAdded(msg.sender, block.timestamp);
    }
    
    function claimValidatorRewards() external nonReentrant {
        if (!_validators[msg.sender]) revert NotValidator(msg.sender);
        
        uint256 validatorCount = 0;
        for (uint256 i = 0; i < getRoleMemberCount(DEFAULT_ADMIN_ROLE); i++) {
            address validator = getRoleMember(DEFAULT_ADMIN_ROLE, i);
            if (_validators[validator]) {
                validatorCount++;
            }
        }
        
        if (validatorCount == 0) return;
        
        uint256 rewardPerValidator = validatorRewardPool / validatorCount;
        validatorRewardPool = 0;
        
        bool success = rewardDistributor.distributeReward(msg.sender, rewardPerValidator);
        if (!success) revert DistributionFailed(rewardPerValidator);
        
        emit ValidatorRewardsDistributed(msg.sender, rewardPerValidator);
    }
    
    function updateValidatorCommission(uint256 newCommissionRate) external {
        if (!_validators[msg.sender]) revert NotValidator(msg.sender);
        if (newCommissionRate > 2000) revert RateTooHigh(newCommissionRate, 2000); // Max 20%
        
        _validatorCommission[msg.sender] = newCommissionRate;
        emit ValidatorCommissionUpdated(msg.sender, newCommissionRate);
    }
    
    // -------------------------------------------
    //  Governance Operations
    // -------------------------------------------
    
    function voteOnProposal(uint256 proposalId, bool support) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        if (_governanceViolators[msg.sender]) revert GovernanceViolation(msg.sender);
        
        uint256 votingPower = _governanceVotes[msg.sender];
        if (votingPower == 0) revert InvalidParameter("votingPower", votingPower);
        
        governanceContract.recordVote(proposalId, msg.sender, votingPower, support);
        
        emit ProposalVoted(proposalId, msg.sender, votingPower, support);
    }
    
    function createProposal(
        string calldata description,
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata calldatas
    ) external nonReentrant whenNotPaused {
        if (_governanceViolators[msg.sender]) revert GovernanceViolation(msg.sender);
        
        uint256 votingPower = _governanceVotes[msg.sender];
        if (votingPower < GOVERNANCE_THRESHOLD) 
            revert InvalidParameter("votingPower", votingPower);
        
        proposalNonce++;
        uint256 proposalId = governanceContract.createProposal(
            proposalNonce,
            msg.sender,
            description,
            targets,
            values,
            calldatas
        );
        
        emit GovernanceProposalCreated(proposalId, msg.sender, description);
    }
    
    function markGovernanceViolator(address violator) 
        external 
        onlyRole(GOVERNANCE_ROLE) 
    {
        _governanceViolators[violator] = true;
        _governanceVotes[violator] = 0;
        
        emit GovernanceViolatorMarked(violator, block.timestamp);
    }
    
    // -------------------------------------------
    //  Administrative Functions
    // -------------------------------------------
    
    function updateTiers(
        uint256[] calldata minDurations,
        uint256[] calldata multipliers,
        bool[] calldata votingRights
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (minDurations.length != multipliers.length || 
            minDurations.length != votingRights.length) {
            revert InvalidTierConfiguration();
        }
        
        // Clear existing tiers
        delete _tiers;
        
        // Validate and add new tiers
        for (uint256 i = 0; i < minDurations.length; i++) {
            if (minDurations[i] < MIN_STAKING_DURATION) {
                revert InsufficientStakingDuration(MIN_STAKING_DURATION, minDurations[i]);
            }
            
            _tiers.push(StakingTier(minDurations[i], multipliers[i], votingRights[i]));
        }
        
        emit TiersUpdated(minDurations, multipliers, votingRights);
    }
    
    function setLiquidityInjectionRate(uint256 newRate) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (newRate > MAX_LIQUIDITY_RATE) revert RateTooHigh(newRate, MAX_LIQUIDITY_RATE);
        
        liquidityInjectionRate = newRate;
        emit LiquidityInjectionRateUpdated(newRate);
    }
    
    function toggleAutoLiquidity(bool enabled) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        autoLiquidityEnabled = enabled;
        emit AutoLiquidityToggled(enabled);
    }
    
    function setValidatorThreshold(uint256 newThreshold) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (newThreshold == 0) revert InvalidParameter("newThreshold", newThreshold);
        validatorThreshold = newThreshold;
        emit ValidatorThresholdUpdated(newThreshold);
    }
    
    function setRewardDistributor(address newDistributor) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (newDistributor == address(0)) revert InvalidAddress("newDistributor", newDistributor);
        rewardDistributor = ITerraStakeRewardDistributor(newDistributor);
        emit RewardDistributorUpdated(newDistributor);
    }
    
    function setLiquidityPool(address newPool) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (newPool == address(0)) revert InvalidAddress("newPool", newPool);
        liquidityPool = newPool;
        emit LiquidityPoolUpdated(newPool);
    }
    
    function pause() external onlyRole(EMERGENCY_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    function recoverERC20(address token) 
        external 
        onlyRole(EMERGENCY_ROLE) 
        returns (bool) 
    {
        uint256 amount = IERC20Upgradeable(token).balanceOf(address(this));
        if (token == address(stakingToken)) {
            // Can only withdraw excess tokens, not staked ones
            amount = amount - _totalStaked;
        }
        bool success = IERC20Upgradeable(token).transfer(msg.sender, amount);
        if (!success) revert TransferFailed(token, address(this), msg.sender, amount);
        
        emit TokenRecovered(token, amount, msg.sender);
        return true;
    }
    
    // -------------------------------------------
    //  Slashing Functions
    // -------------------------------------------
    
    function slash(address validator, uint256 amount) 
        external 
        onlyRole(SLASHER_ROLE) 
        returns (bool) 
    {
        if (!_validators[validator]) revert NotValidator(validator);
        if (amount == 0) revert ZeroAmount();
        
        uint256 userBalance = _stakingBalance[validator];
        if (userBalance < amount) {
            amount = userBalance;
        }
        
        if (amount == 0) return false;
        
        // Update user balance
        _stakingBalance[validator] -= amount;
        _totalStaked -= amount;
        
        // Remove validator status if staking balance falls below threshold
        if (_stakingBalance[validator] < validatorThreshold) {
            _validators[validator] = false;
            emit ValidatorStatusChanged(validator, false);
        }
        
        // Handle penalty distribution
        _handlePenalty(validator, 0, amount); // Project ID 0 for validator slashing
        
        emit Slashed(validator, amount, block.timestamp);
        return true;
    }
    
    // -------------------------------------------
    //  View Functions
    // -------------------------------------------
    
    function calculateRewards(address user, uint256 projectId) 
        public 
        view 
        returns (uint256) 
    {
        StakingPosition storage position = _stakingPositions[user][projectId];
        
        if (position.amount == 0) return 0;
        
        uint256 stakingTime = block.timestamp - position.lastCheckpoint;
        if (stakingTime == 0) return 0;
        
        uint256 tierId = getApplicableTier(position.duration);
        uint256 tierMultiplier = _tiers[tierId].multiplier;
        
        // Base APR (consider halving)
        uint256 baseRate = _totalStaked < LOW_STAKING_THRESHOLD ? 
            dynamicBoostedAPR : dynamicBaseAPR;
        
        // Additional boosts
        if (position.hasNFTBoost) {
            baseRate += NFT_APR_BOOST;
        }
        
        if (position.isLPStaker) {
            baseRate += LP_APR_BOOST;
        }
        
        // Apply tier multiplier
        uint256 effectiveRate = (baseRate * tierMultiplier) / 100;
        
        // Calculate reward: principal * rate * time / year
        uint256 reward = (position.amount * effectiveRate * stakingTime) / (100 * 365 days);
        
        return reward;
    }
    
    function getApplicableTier(uint256 duration) public view returns (uint256) {
        uint256 applicableTier = 0;
        
        for (uint256 i = 0; i < _tiers.length; i++) {
            if (duration >= _tiers[i].minDuration) {
                applicableTier = i;
            } else {
                break;
            }
        }
        
        return applicableTier;
    }
    
    function getUserStake(address user, uint256 projectId) 
        external 
        view 
        returns (uint256) 
    {
        return _stakingPositions[user][projectId].amount;
    }
    
    function getUserTotalStake(address user) 
        external 
        view 
        returns (uint256) 
    {
        return _stakingBalance[user];
    }
    
    function getUserPositions(address user) 
        external 
        view 
        returns (StakingPosition[] memory positions) 
    {
        // Temporary array to count non-zero positions
        uint256 count = 0;
        
        // Get total projects count from project contract
        uint256 projectCount = projectsContract.getProjectCount();
        
        // First count non-zero positions
        for (uint256 i = 1; i <= projectCount; i++) {
            if (_stakingPositions[user][i].amount > 0) {
                count++;
            }
        }
        
        // Allocate array with correct size
        positions = new StakingPosition[](count);
        
        // Populate array
        uint256 index = 0;
        for (uint256 i = 1; i <= projectCount; i++) {
            if (_stakingPositions[user][i].amount > 0) {
                positions[index] = _stakingPositions[user][i];
                index++;
            }
        }
        
        return positions;
    }
    
    function getUserPositionsWithTiers(address user) 
        external 
        view 
        returns (PositionWithTier[] memory) 
    {
        StakingPosition[] memory positions = this.getUserPositions(user);
        PositionWithTier[] memory result = new PositionWithTier[](positions.length);
        
        for (uint256 i = 0; i < positions.length; i++) {
            // Get position reference
            StakingPosition memory position = positions[i];
            
            // Determine current tier and next tier
            uint256 currentTier = getApplicableTier(position.duration);
            uint256 nextTierIndex = type(uint256).max;
            
            // Find the next tier to upgrade to
            for (uint256 j = 0; j < _tiers.length; j++) {
                if (position.duration < _tiers[j].minDuration && 
                    (nextTierIndex == type(uint256).max || _tiers[j].minDuration < _tiers[nextTierIndex].minDuration)) {
                    nextTierIndex = j;
                }
            }
            
            // Calculate time to next tier
            uint256 timeToNextTier = 0;
            if (nextTierIndex != type(uint256).max) {
                timeToNextTier = _tiers[nextTierIndex].minDuration > position.duration ? 
                    _tiers[nextTierIndex].minDuration - position.duration : 0;
            }
            
            // Calculate remaining lock time
            uint256 remainingLockTime = 0;
            if (position.stakingStart + position.duration > block.timestamp) {
                remainingLockTime = position.stakingStart + position.duration - block.timestamp;
            }
            
            // Calculate pending rewards
            uint256 pendingRewards = calculateRewards(user, position.projectId);
            
            // Create and populate the result
            result[i] = PositionWithTier({
                position: position,
                currentTier: currentTier,
                nextTier: nextTierIndex == type(uint256).max ? type(uint256).max : nextTierIndex,
                timeToNextTier: timeToNextTier,
                pendingRewards: pendingRewards,
                remainingLockTime: remainingLockTime
            });
        }
        
        return result;
    }
    
    function getPenaltyHistory(address user) 
        external 
        view 
        returns (PenaltyEvent[] memory) 
    {
        return _penaltyHistory[user];
    }
    
    function isValidator(address user) external view returns (bool) {
        return _validators[user];
    }
    
    function getValidatorCommission(address validator) external view returns (uint256) {
        return _validatorCommission[validator];
    }
    
    function isGovernanceViolator(address user) external view returns (bool) {
        return _governanceViolators[user];
    }
    
    function getGovernanceVotes(address user) external view returns (uint256) {
        return _governanceVotes[user];
    }
    
    function getTotalStaked() external view returns (uint256) {
        return _totalStaked;
    }
    
    function getValidatorRewardPool() external view returns (uint256) {
        return validatorRewardPool;
    }
    
    function getAllTiers() external view returns (StakingTier[] memory) {
        return _tiers;
    }
    
    // -------------------------------------------
    //  Batch View Functions
    // -------------------------------------------
    
    function getBatchUserStakes(address[] calldata users, uint256 projectId)
        external
        view
        returns (uint256[] memory stakes)
    {
        stakes = new uint256[](users.length);
        
        for (uint256 i = 0; i < users.length; i++) {
            stakes[i] = _stakingPositions[users[i]][projectId].amount;
        }
        
        return stakes;
    }
    
    function getTopStakers(uint256 limit)
        external
        view
        returns (address[] memory stakers, uint256[] memory amounts)
    {
        // This is an inefficient implementation that scans all accounts
        // In a production system, we would maintain a sorted list
        
        // Get total users from some tracking mechanism
        uint256 totalUsers = 100; // Placeholder
        
        // Create temporary arrays
        address[] memory allStakers = new address[](totalUsers);
        uint256[] memory allAmounts = new uint256[](totalUsers);
        
        // Populate arrays (simplified)
        uint256 count = 0;
        for (uint256 i = 0; i < getRoleMemberCount(DEFAULT_ADMIN_ROLE); i++) {
            address user = getRoleMember(DEFAULT_ADMIN_ROLE, i);
            if (_stakingBalance[user] > 0) {
                allStakers[count] = user;
                allAmounts[count] = _stakingBalance[user];
                count++;
            }
        }
        
        // Sort by amount (simplified bubble sort)
        for (uint256 i = 0; i < count; i++) {
            for (uint256 j = i + 1; j < count; j++) {
                if (allAmounts[i] < allAmounts[j]) {
                    // Swap amounts
                    uint256 tempAmount = allAmounts[i];
                    allAmounts[i] = allAmounts[j];
                    allAmounts[j] = tempAmount;
                    
                    // Swap addresses
                    address tempAddr = allStakers[i];
                    allStakers[i] = allStakers[j];
                    allStakers[j] = tempAddr;
                }
            }
        }
        
        // Determine final size
        uint256 resultSize = count < limit ? count : limit;
        
        // Create result arrays
        stakers = new address[](resultSize);
        amounts = new uint256[](resultSize);
        
        // Copy top N entries
        for (uint256 i = 0; i < resultSize; i++) {
            stakers[i] = allStakers[i];
            amounts[i] = allAmounts[i];
        }
        
        return (stakers, amounts);
    }
    
    // -------------------------------------------
    //  Internal Utility Functions
    // -------------------------------------------
    
    /**
     * @dev Initializes the contract with default values
     */
    function _initializeDefaults() internal {
        // Set up initial staking tiers
        _tiers.push(StakingTier(MIN_STAKING_DURATION, 100, false));   // Base tier: 1x multiplier
        _tiers.push(StakingTier(90 days, 125, false));                // 90 days: 1.25x multiplier
        _tiers.push(StakingTier(180 days, 150, true));                // 180 days: 1.5x multiplier
        _tiers.push(StakingTier(365 days, 200, true));                // 365 days: 2x multiplier
        
        // Set default values
        validatorThreshold = 100000 * 10**18;  // 100,000 tokens
        liquidityInjectionRate = 10;           // 10%
        autoLiquidityEnabled = true;
        dynamicBaseAPR = 800;                  // 8% base APR
        dynamicBoostedAPR = 1200;              // 12% boosted APR
    }
}

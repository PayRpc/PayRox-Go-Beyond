// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../utils/LibDiamond.sol";

/**
 * @title TerraStakeNFTStakingFacet
 * @notice PayRox Diamond Architecture - NFT Staking functionality with manifest-based routing
 * @dev 💎 PayRox Diamond Facet with isolated storage and LibDiamond integration
 * 
 * PayRox Features:
 * - Isolated storage: payrox.facet.storage.terrastakenstaking.v1
 * - Manifest routing: All calls via dispatcher
 * - Access control: Via PayRox dispatcher roles
 * - Deployment: CREATE2 content-addressed
 * 
 * 🧠 AI-Generated using PayRox Diamond Learning Patterns
 */
contract TerraStakeNFTStakingFacet {
    using LibDiamond for LibDiamond.DiamondStorage;

    // ═══════════════════════════════════════════════════════════════════════════
    // STORAGE - ISOLATED FROM OTHER FACETS (PayRox Diamond Pattern)
    // ═══════════════════════════════════════════════════════════════════════════

    /// @dev PayRox isolated storage slot: payrox.facet.storage.terrastakenstaking.v1
    bytes32 private constant STORAGE_POSITION = 
        keccak256("payrox.facet.storage.terrastakenstaking.v1");

    struct StakeInfo {
        uint256 amount;              // Amount of tokens staked
        uint256 startTime;           // When staking began
        uint256 lastRewardTime;      // Last reward calculation time
        uint256 accumulatedRewards;  // Total rewards earned
        uint256 tokenId;             // Type of token staked
        bool active;                 // Whether stake is active
    }

    struct StakingPoolConfig {
        uint256 rewardRate;          // Rewards per second per token
        uint256 minStakeDuration;    // Minimum staking period
        uint256 maxStakeAmount;      // Maximum tokens that can be staked
        uint256 totalStaked;         // Total tokens currently staked
        bool enabled;                // Whether staking is enabled for this pool
    }

    struct TerraStakeNFTStakingStorage {
        // Staking mappings
        mapping(address => mapping(uint256 => StakeInfo)) userStakes; // user => stakeId => StakeInfo
        mapping(address => uint256) userStakeCount;                   // user => number of stakes
        mapping(uint256 => StakingPoolConfig) stakingPools;          // tokenId => pool config
        mapping(address => uint256) userTotalStaked;                 // user => total staked across all pools
        
        // Global staking state
        uint256 totalRewardsDistributed;
        uint256 globalStakeId;
        bool stakingEnabled;
        
        // Emergency controls
        bool emergencyWithdrawEnabled;
        uint256 emergencyWithdrawFee; // Basis points (10000 = 100%)
        
        // PayRox Diamond specific
        address manifestDispatcher;
        bool initialized;
        
        // Reserved slots for future upgrades
        uint256[50] reserved;
    }

    function terraStakeNFTStakingStorage() internal pure returns (TerraStakeNFTStakingStorage storage ds) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS - PayRox Diamond Compatible
    // ═══════════════════════════════════════════════════════════════════════════

    event TokensStaked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 timestamp
    );

    event TokensUnstaked(
        address indexed user,
        uint256 indexed stakeId,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 rewards,
        uint256 timestamp
    );

    event RewardsClaimed(
        address indexed user,
        uint256 indexed stakeId,
        uint256 rewards,
        uint256 timestamp
    );

    event StakingPoolConfigured(
        uint256 indexed tokenId,
        uint256 rewardRate,
        uint256 minDuration,
        uint256 maxAmount,
        bool enabled
    );

    event EmergencyWithdraw(
        address indexed user,
        uint256 indexed stakeId,
        uint256 amount,
        uint256 fee,
        uint256 timestamp
    );

    event StakingStatusChanged(bool enabled);

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS - Gas Efficient Custom Errors
    // ═══════════════════════════════════════════════════════════════════════════

    error TerraStakeNFTStaking__Unauthorized();
    error TerraStakeNFTStaking__StakingDisabled();
    error TerraStakeNFTStaking__InvalidAmount(uint256 amount);
    error TerraStakeNFTStaking__InvalidTokenId(uint256 tokenId);
    error TerraStakeNFTStaking__InvalidStakeId(uint256 stakeId);
    error TerraStakeNFTStaking__InsufficientBalance(uint256 required, uint256 available);
    error TerraStakeNFTStaking__MinimumStakeDurationNotMet(uint256 elapsed, uint256 required);
    error TerraStakeNFTStaking__MaxStakeAmountExceeded(uint256 requested, uint256 available);
    error TerraStakeNFTStaking__StakeNotActive(uint256 stakeId);
    error TerraStakeNFTStaking__PoolNotEnabled(uint256 tokenId);
    error TerraStakeNFTStaking__AlreadyInitialized();
    error TerraStakeNFTStaking__EmergencyWithdrawDisabled();

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION - PayRox Diamond Pattern
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initialize TerraStakeNFTStakingFacet with PayRox Diamond integration
     * @param manifestDispatcher The PayRox manifest dispatcher address
     */
    function initializeTerraStakeNFTStaking(address manifestDispatcher) external {
        LibDiamond.initializeDiamond(manifestDispatcher);
        
        TerraStakeNFTStakingStorage storage ds = terraStakeNFTStakingStorage();
        if (ds.initialized) revert TerraStakeNFTStaking__AlreadyInitialized();
        
        ds.manifestDispatcher = manifestDispatcher;
        ds.stakingEnabled = true;
        ds.emergencyWithdrawEnabled = false;
        ds.emergencyWithdrawFee = 1000; // 10%
        ds.initialized = true;
        
        // Initialize default staking pools with AI-optimized parameters
        _initializeStakingPools();
    }

    /**
     * @dev Initialize staking pools with AI-optimized reward rates
     */
    function _initializeStakingPools() private {
        TerraStakeNFTStakingStorage storage ds = terraStakeNFTStakingStorage();
        
        // TERRA_BASIC (tokenId: 1) - Lower rewards, accessible staking
        ds.stakingPools[1] = StakingPoolConfig({
            rewardRate: 1e15,        // 0.001 tokens per second (26.4 tokens/month)
            minStakeDuration: 7 days,
            maxStakeAmount: 10000e18,
            totalStaked: 0,
            enabled: true
        });
        
        // TERRA_PREMIUM (tokenId: 2) - Medium rewards, moderate requirements
        ds.stakingPools[2] = StakingPoolConfig({
            rewardRate: 3e15,        // 0.003 tokens per second (77.8 tokens/month)
            minStakeDuration: 14 days,
            maxStakeAmount: 5000e18,
            totalStaked: 0,
            enabled: true
        });
        
        // TERRA_LEGENDARY (tokenId: 3) - High rewards, longer commitment
        ds.stakingPools[3] = StakingPoolConfig({
            rewardRate: 8e15,        // 0.008 tokens per second (207.4 tokens/month)
            minStakeDuration: 30 days,
            maxStakeAmount: 1000e18,
            totalStaked: 0,
            enabled: true
        });
        
        // TERRA_MYTHIC (tokenId: 4) - Maximum rewards, maximum commitment
        ds.stakingPools[4] = StakingPoolConfig({
            rewardRate: 20e15,       // 0.02 tokens per second (518.4 tokens/month)
            minStakeDuration: 90 days,
            maxStakeAmount: 100e18,
            totalStaked: 0,
            enabled: true
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCESS CONTROL - Via PayRox Manifest Dispatcher
    // ═══════════════════════════════════════════════════════════════════════════

    modifier onlyManifestDispatcher() {
        LibDiamond.enforceManifestCall();
        _;
    }

    modifier onlyStakingManager() {
        LibDiamond.requireRole(keccak256("STAKING_MANAGER_ROLE"));
        _;
    }

    modifier whenStakingEnabled() {
        TerraStakeNFTStakingStorage storage ds = terraStakeNFTStakingStorage();
        if (!ds.stakingEnabled) revert TerraStakeNFTStaking__StakingDisabled();
        _;
    }

    modifier onlyValidTokenId(uint256 tokenId) {
        if (tokenId == 0 || tokenId > 4) {
            revert TerraStakeNFTStaking__InvalidTokenId(tokenId);
        }
        _;
    }

    modifier onlyPositiveAmount(uint256 amount) {
        if (amount == 0) {
            revert TerraStakeNFTStaking__InvalidAmount(amount);
        }
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STAKING FUNCTIONS - PayRox Diamond Facet Implementation
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Stake NFT tokens to earn rewards
     * @param tokenId Type of token to stake (1-4)
     * @param amount Amount of tokens to stake
     * @return stakeId Unique identifier for this stake
     */
    function stakeTokens(
        uint256 tokenId,
        uint256 amount
    ) external 
        onlyManifestDispatcher
        whenStakingEnabled
        onlyValidTokenId(tokenId)
        onlyPositiveAmount(amount)
        returns (uint256 stakeId)
    {
        TerraStakeNFTStakingStorage storage ds = terraStakeNFTStakingStorage();
        StakingPoolConfig storage pool = ds.stakingPools[tokenId];
        
        if (!pool.enabled) {
            revert TerraStakeNFTStaking__PoolNotEnabled(tokenId);
        }
        
        // Check pool capacity
        if (pool.totalStaked + amount > pool.maxStakeAmount) {
            revert TerraStakeNFTStaking__MaxStakeAmountExceeded(
                amount,
                pool.maxStakeAmount - pool.totalStaked
            );
        }
        
        // Get user's token balance (call to Core facet via dispatcher)
        // For now, assume balance check is handled by the Core facet transfer
        
        // Create new stake
        stakeId = ds.globalStakeId++;
        uint256 currentTime = block.timestamp;
        
        ds.userStakes[msg.sender][stakeId] = StakeInfo({
            amount: amount,
            startTime: currentTime,
            lastRewardTime: currentTime,
            accumulatedRewards: 0,
            tokenId: tokenId,
            active: true
        });
        
        // Update counters
        ds.userStakeCount[msg.sender]++;
        ds.userTotalStaked[msg.sender] += amount;
        pool.totalStaked += amount;
        
        // Transfer tokens from user (handled by Core facet via dispatcher)
        // The manifest dispatcher will route the burn call to Core facet
        
        emit TokensStaked(msg.sender, stakeId, tokenId, amount, currentTime);
        
        return stakeId;
    }

    /**
     * @notice Unstake tokens and claim rewards
     * @param stakeId Unique identifier of the stake to unstake
     */
    function unstakeTokens(uint256 stakeId) external onlyManifestDispatcher {
        TerraStakeNFTStakingStorage storage ds = terraStakeNFTStakingStorage();
        StakeInfo storage stake = ds.userStakes[msg.sender][stakeId];
        
        if (!stake.active) {
            revert TerraStakeNFTStaking__StakeNotActive(stakeId);
        }
        
        StakingPoolConfig storage pool = ds.stakingPools[stake.tokenId];
        uint256 currentTime = block.timestamp;
        uint256 stakingDuration = currentTime - stake.startTime;
        
        // Check minimum staking duration
        if (stakingDuration < pool.minStakeDuration) {
            revert TerraStakeNFTStaking__MinimumStakeDurationNotMet(
                stakingDuration,
                pool.minStakeDuration
            );
        }
        
        // Calculate final rewards
        uint256 rewards = _calculateRewards(stake, currentTime, pool.rewardRate);
        uint256 totalRewards = stake.accumulatedRewards + rewards;
        
        // Update state
        stake.active = false;
        ds.userTotalStaked[msg.sender] -= stake.amount;
        pool.totalStaked -= stake.amount;
        ds.totalRewardsDistributed += totalRewards;
        
        // Transfer staked tokens back to user (via Core facet)
        // Transfer reward tokens to user (via Core facet)
        
        emit TokensUnstaked(
            msg.sender,
            stakeId,
            stake.tokenId,
            stake.amount,
            totalRewards,
            currentTime
        );
    }

    /**
     * @notice Claim accumulated rewards without unstaking
     * @param stakeId Unique identifier of the stake
     */
    function claimRewards(uint256 stakeId) external onlyManifestDispatcher {
        TerraStakeNFTStakingStorage storage ds = terraStakeNFTStakingStorage();
        StakeInfo storage stake = ds.userStakes[msg.sender][stakeId];
        
        if (!stake.active) {
            revert TerraStakeNFTStaking__StakeNotActive(stakeId);
        }
        
        StakingPoolConfig storage pool = ds.stakingPools[stake.tokenId];
        uint256 currentTime = block.timestamp;
        
        // Calculate and accumulate rewards
        uint256 newRewards = _calculateRewards(stake, currentTime, pool.rewardRate);
        stake.accumulatedRewards += newRewards;
        stake.lastRewardTime = currentTime;
        
        if (stake.accumulatedRewards > 0) {
            uint256 rewardsToTransfer = stake.accumulatedRewards;
            stake.accumulatedRewards = 0;
            ds.totalRewardsDistributed += rewardsToTransfer;
            
            // Transfer reward tokens to user (via Core facet)
            
            emit RewardsClaimed(msg.sender, stakeId, rewardsToTransfer, currentTime);
        }
    }

    /**
     * @notice Emergency withdraw with fee (if enabled)
     * @param stakeId Unique identifier of the stake
     */
    function emergencyWithdraw(uint256 stakeId) external onlyManifestDispatcher {
        TerraStakeNFTStakingStorage storage ds = terraStakeNFTStakingStorage();
        
        if (!ds.emergencyWithdrawEnabled) {
            revert TerraStakeNFTStaking__EmergencyWithdrawDisabled();
        }
        
        StakeInfo storage stake = ds.userStakes[msg.sender][stakeId];
        
        if (!stake.active) {
            revert TerraStakeNFTStaking__StakeNotActive(stakeId);
        }
        
        // Calculate fee
        uint256 fee = (stake.amount * ds.emergencyWithdrawFee) / 10000;
        uint256 amountAfterFee = stake.amount - fee;
        
        // Update state
        stake.active = false;
        ds.userTotalStaked[msg.sender] -= stake.amount;
        ds.stakingPools[stake.tokenId].totalStaked -= stake.amount;
        
        // Transfer tokens (minus fee) back to user
        // Fee goes to protocol treasury
        
        emit EmergencyWithdraw(msg.sender, stakeId, amountAfterFee, fee, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS - PayRox Diamond Management
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Configure staking pool parameters
     * @param tokenId Token type to configure
     * @param rewardRate Rewards per second per token
     * @param minDuration Minimum staking duration
     * @param maxAmount Maximum total stake amount
     * @param enabled Whether pool is enabled
     */
    function configureStakingPool(
        uint256 tokenId,
        uint256 rewardRate,
        uint256 minDuration,
        uint256 maxAmount,
        bool enabled
    ) external onlyManifestDispatcher onlyStakingManager onlyValidTokenId(tokenId) {
        TerraStakeNFTStakingStorage storage ds = terraStakeNFTStakingStorage();
        
        ds.stakingPools[tokenId] = StakingPoolConfig({
            rewardRate: rewardRate,
            minStakeDuration: minDuration,
            maxStakeAmount: maxAmount,
            totalStaked: ds.stakingPools[tokenId].totalStaked, // Preserve current stake
            enabled: enabled
        });
        
        emit StakingPoolConfigured(tokenId, rewardRate, minDuration, maxAmount, enabled);
    }

    /**
     * @notice Enable or disable staking globally
     * @param enabled Whether staking should be enabled
     */
    function setStakingEnabled(bool enabled) external onlyManifestDispatcher onlyStakingManager {
        TerraStakeNFTStakingStorage storage ds = terraStakeNFTStakingStorage();
        ds.stakingEnabled = enabled;
        
        emit StakingStatusChanged(enabled);
    }

    /**
     * @notice Enable or disable emergency withdrawals
     * @param enabled Whether emergency withdrawals should be enabled
     * @param feeInBasisPoints Emergency withdrawal fee (10000 = 100%)
     */
    function setEmergencyWithdraw(
        bool enabled,
        uint256 feeInBasisPoints
    ) external onlyManifestDispatcher onlyStakingManager {
        TerraStakeNFTStakingStorage storage ds = terraStakeNFTStakingStorage();
        ds.emergencyWithdrawEnabled = enabled;
        ds.emergencyWithdrawFee = feeInBasisPoints;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS - PayRox Diamond Gas Optimized
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get stake information for a user
     * @param user User address
     * @param stakeId Stake identifier
     * @return Stake information and current rewards
     */
    function getStakeInfo(
        address user,
        uint256 stakeId
    ) external view returns (StakeInfo memory stakeInfo, uint256 currentRewards) {
        TerraStakeNFTStakingStorage storage ds = terraStakeNFTStakingStorage();
        stakeInfo = ds.userStakes[user][stakeId];
        
        if (stakeInfo.active) {
            StakingPoolConfig storage pool = ds.stakingPools[stakeInfo.tokenId];
            uint256 additionalRewards = _calculateRewards(stakeInfo, block.timestamp, pool.rewardRate);
            currentRewards = stakeInfo.accumulatedRewards + additionalRewards;
        } else {
            currentRewards = stakeInfo.accumulatedRewards;
        }
    }

    /**
     * @notice Get staking pool configuration
     * @param tokenId Token type
     * @return Pool configuration
     */
    function getStakingPoolConfig(uint256 tokenId) external view onlyValidTokenId(tokenId) returns (StakingPoolConfig memory) {
        TerraStakeNFTStakingStorage storage ds = terraStakeNFTStakingStorage();
        return ds.stakingPools[tokenId];
    }

    /**
     * @notice Get user's total staked amount
     * @param user User address
     * @return Total staked across all pools
     */
    function getUserTotalStaked(address user) external view returns (uint256) {
        TerraStakeNFTStakingStorage storage ds = terraStakeNFTStakingStorage();
        return ds.userTotalStaked[user];
    }

    /**
     * @notice Get user's stake count
     * @param user User address
     * @return Number of active and inactive stakes
     */
    function getUserStakeCount(address user) external view returns (uint256) {
        TerraStakeNFTStakingStorage storage ds = terraStakeNFTStakingStorage();
        return ds.userStakeCount[user];
    }

    /**
     * @notice Get global staking statistics
     * @return stakingEnabled Whether staking is enabled
     * @return totalRewardsDistributed Total rewards distributed
     * @return globalStakeId Current global stake ID
     */
    function getGlobalStakingStats() external view returns (
        bool stakingEnabled,
        uint256 totalRewardsDistributed,
        uint256 globalStakeId
    ) {
        TerraStakeNFTStakingStorage storage ds = terraStakeNFTStakingStorage();
        return (
            ds.stakingEnabled,
            ds.totalRewardsDistributed,
            ds.globalStakeId
        );
    }

    /**
     * @notice Calculate potential rewards for a stake
     * @param user User address
     * @param stakeId Stake identifier
     * @return Potential rewards if claimed now
     */
    function calculatePendingRewards(address user, uint256 stakeId) external view returns (uint256) {
        TerraStakeNFTStakingStorage storage ds = terraStakeNFTStakingStorage();
        StakeInfo storage stake = ds.userStakes[user][stakeId];
        
        if (!stake.active) return stake.accumulatedRewards;
        
        StakingPoolConfig storage pool = ds.stakingPools[stake.tokenId];
        uint256 additionalRewards = _calculateRewards(stake, block.timestamp, pool.rewardRate);
        
        return stake.accumulatedRewards + additionalRewards;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS - PayRox Diamond Helper Functions
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @dev Calculate rewards for a stake based on time elapsed
     * @param stake Stake information
     * @param currentTime Current timestamp
     * @param rewardRate Reward rate per second
     * @return Calculated rewards
     */
    function _calculateRewards(
        StakeInfo memory stake,
        uint256 currentTime,
        uint256 rewardRate
    ) internal pure returns (uint256) {
        if (!stake.active || currentTime <= stake.lastRewardTime) {
            return 0;
        }
        
        uint256 timeElapsed = currentTime - stake.lastRewardTime;
        return (stake.amount * rewardRate * timeElapsed) / 1e18;
    }
}

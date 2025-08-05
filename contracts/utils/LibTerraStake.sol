// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LibTerraStake
 * @dev Diamond storage library for TerraStake environmental NFT system
 * 
 * This library implements the Diamond storage pattern to ensure safe
 * storage separation across facets. All state variables are stored
 * in a single struct to prevent storage collisions during upgrades.
 * 
 * Key Features:
 * - Diamond-safe storage layout with unique storage slot
 * - Environmental data structures for real-world impact tracking
 * - Staking mechanism with reward calculations
 * - Access control and administrative functions
 * - Gas-optimized storage patterns
 * 
 * @author PayRox Go Beyond AI Toolchain
 */
library LibTerraStake {
    // Diamond storage slot - unique hash to prevent collisions
    bytes32 constant TERRA_STAKE_STORAGE_POSITION = keccak256("terrastake.payrox.storage");

    /**
     * @dev Environmental data for each NFT token
     * @param tier Environmental impact tier (1-4: Bronze, Silver, Gold, Platinum)
     * @param carbonOffset Carbon offset amount in tons CO2
     * @param dataHash IPFS hash or JSON data about environmental impact
     * @param validatedBy Address that validated the environmental data
     * @param timestamp When the environmental data was recorded
     * @param isActive Whether the environmental data is currently active
     */
    struct EnvironmentalData {
        uint256 tier;
        uint256 carbonOffset;
        string dataHash;
        address validatedBy;
        uint256 timestamp;
        bool isActive;
    }

    /**
     * @dev Staking information for each user and token
     * @param amount Amount of tokens staked
     * @param startTime When staking began
     * @param lastRewardClaim When rewards were last claimed
     * @param totalRewardsClaimed Total rewards claimed to date
     * @param environmentalBonus Additional bonus for high-tier environmental tokens
     * @param isActive Whether the stake is currently active
     */
    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
        uint256 lastRewardClaim;
        uint256 totalRewardsClaimed;
        uint256 environmentalBonus;
        bool isActive;
    }

    /**
     * @dev VRF request information for random rewards
     * @param requestId Chainlink VRF request ID
     * @param requester Address that requested randomness
     * @param tokenId Token ID associated with the request
     * @param fulfilled Whether the request has been fulfilled
     * @param randomWord The random word received from VRF
     * @param timestamp When the request was made
     */
    struct VRFRequest {
        uint256 requestId;
        address requester;
        uint256 tokenId;
        bool fulfilled;
        uint256 randomWord;
        uint256 timestamp;
    }

    /**
     * @dev Main storage struct containing all TerraStake state
     */
    struct TerraStakeStorage {
        // Core system configuration
        bool initialized;
        string baseURI;
        uint256 stakingRewardRate; // Basis points (e.g., 500 = 5%)
        uint256 environmentalBonus; // Additional bonus for environmental impact
        
        // Token management
        mapping(uint256 => uint256) totalSupply; // tokenId => total supply
        mapping(uint256 => uint256) tierSupply; // tier => total supply for tier
        mapping(uint256 => string) tokenURIs; // tokenId => specific URI
        mapping(uint256 => EnvironmentalData) environmentalData; // tokenId => environmental data
        
        // Staking system
        mapping(address => mapping(uint256 => StakeInfo)) stakes; // user => tokenId => stake info
        mapping(address => uint256) totalStakedByUser; // user => total amount staked
        mapping(uint256 => uint256) totalStakedPerToken; // tokenId => total amount staked
        uint256 totalStaked; // Total amount staked across all tokens
        
        // Rewards and environmental bonuses
        uint256 rewardPool; // Total reward pool
        uint256 lastRewardDistribution; // Timestamp of last reward distribution
        mapping(uint256 => uint256) tierMultipliers; // tier => reward multiplier
        
        // VRF and randomness
        mapping(uint256 => VRFRequest) vrfRequests; // requestId => VRF request info
        mapping(address => uint256[]) userVRFRequests; // user => array of request IDs
        uint256 nextVRFRequestId;
        
        // Oracle and environmental data validation
        address environmentalOracle;
        mapping(address => bool) authorizedValidators;
        mapping(string => bool) usedEnvironmentalHashes; // Prevent duplicate environmental data
        
        // Access control and security
        mapping(bytes32 => mapping(address => bool)) roles; // role => user => has role
        mapping(address => bool) emergencyPausers;
        uint256 lastSecurityCheck;
        
        // Gas optimization and batch operations
        uint256 maxBatchSize;
        mapping(address => uint256) lastBatchOperation; // Rate limiting for batch operations
        
        // Analytics and metrics
        uint256 totalCarbonOffset; // Total carbon offset by all tokens
        mapping(uint256 => uint256) tierCarbonOffset; // tier => total carbon offset
        mapping(address => uint256) userCarbonImpact; // user => total carbon impact
        
        // Fractionalization support
        mapping(uint256 => bool) fractionalizationEnabled; // tokenId => can be fractionalized
        mapping(uint256 => address) fractionalContracts; // tokenId => fractional token contract
        mapping(uint256 => uint256) fractionalSupply; // tokenId => fractional supply
    }

    /**
     * @dev Get the TerraStake storage struct
     * @return ts The storage struct
     */
    function terraStakeStorage() internal pure returns (TerraStakeStorage storage ts) {
        bytes32 position = TERRA_STAKE_STORAGE_POSITION;
        assembly {
            ts.slot := position
        }
    }

    /**
     * @dev Initialize tier multipliers for environmental rewards
     * @param ts Storage reference
     */
    function initializeTierMultipliers(TerraStakeStorage storage ts) internal {
        ts.tierMultipliers[1] = 100; // Bronze: 1x multiplier
        ts.tierMultipliers[2] = 150; // Silver: 1.5x multiplier
        ts.tierMultipliers[3] = 200; // Gold: 2x multiplier
        ts.tierMultipliers[4] = 300; // Platinum: 3x multiplier
    }

    /**
     * @dev Calculate environmental bonus for a token based on its tier and carbon offset
     * @param ts Storage reference
     * @param tokenId Token ID to calculate bonus for
     * @return bonus Environmental bonus amount
     */
    function calculateEnvironmentalBonus(
        TerraStakeStorage storage ts,
        uint256 tokenId
    ) internal view returns (uint256 bonus) {
        EnvironmentalData memory envData = ts.environmentalData[tokenId];
        if (!envData.isActive) return 0;
        
        uint256 tierMultiplier = ts.tierMultipliers[envData.tier];
        uint256 carbonBonus = (envData.carbonOffset * ts.environmentalBonus) / 10000;
        
        return (carbonBonus * tierMultiplier) / 100;
    }

    /**
     * @dev Calculate staking rewards for a user and token
     * @param ts Storage reference
     * @param user User address
     * @param tokenId Token ID
     * @return rewards Calculated rewards amount
     */
    function calculateStakingRewards(
        TerraStakeStorage storage ts,
        address user,
        uint256 tokenId
    ) internal view returns (uint256 rewards) {
        StakeInfo memory stake = ts.stakes[user][tokenId];
        if (!stake.isActive || stake.amount == 0) return 0;
        
        uint256 timeStaked = block.timestamp - stake.lastRewardClaim;
        uint256 baseReward = (stake.amount * ts.stakingRewardRate * timeStaked) / (365 days * 10000);
        uint256 envBonus = calculateEnvironmentalBonus(ts, tokenId);
        
        return baseReward + ((baseReward * envBonus) / 10000);
    }

    /**
     * @dev Update carbon impact metrics
     * @param ts Storage reference
     * @param user User address
     * @param tokenId Token ID
     * @param amount Amount being staked/unstaked
     * @param isStaking Whether this is a staking (true) or unstaking (false) operation
     */
    function updateCarbonImpactMetrics(
        TerraStakeStorage storage ts,
        address user,
        uint256 tokenId,
        uint256 amount,
        bool isStaking
    ) internal {
        EnvironmentalData memory envData = ts.environmentalData[tokenId];
        if (!envData.isActive) return;
        
        uint256 carbonImpact = (envData.carbonOffset * amount);
        
        if (isStaking) {
            ts.userCarbonImpact[user] += carbonImpact;
            ts.tierCarbonOffset[envData.tier] += carbonImpact;
            ts.totalCarbonOffset += carbonImpact;
        } else {
            ts.userCarbonImpact[user] -= carbonImpact;
            ts.tierCarbonOffset[envData.tier] -= carbonImpact;
            ts.totalCarbonOffset -= carbonImpact;
        }
    }

    /**
     * @dev Validate environmental data integrity
     * @param ts Storage reference
     * @param dataHash Environmental data hash
     * @return isValid Whether the data is valid and unique
     */
    function validateEnvironmentalData(
        TerraStakeStorage storage ts,
        string memory dataHash
    ) internal view returns (bool isValid) {
        // Check if hash has been used before
        if (ts.usedEnvironmentalHashes[dataHash]) return false;
        
        // Additional validation logic can be added here
        // For example, checking with external oracles or validators
        
        return bytes(dataHash).length > 0;
    }

    /**
     * @dev Mark environmental data hash as used
     * @param ts Storage reference
     * @param dataHash Environmental data hash to mark as used
     */
    function markEnvironmentalDataUsed(
        TerraStakeStorage storage ts,
        string memory dataHash
    ) internal {
        ts.usedEnvironmentalHashes[dataHash] = true;
    }

    /**
     * @dev Get comprehensive staking statistics for analytics
     * @param ts Storage reference
     * @return totalStaked Total amount staked across all tokens
     * @return totalRewardPool Total reward pool available
     * @return totalCarbonOffset Total carbon offset by all staked tokens
     * @return activeStakers Number of addresses with active stakes
     */
    function getStakingStatistics(TerraStakeStorage storage ts) internal view returns (
        uint256 totalStaked,
        uint256 totalRewardPool,
        uint256 totalCarbonOffset,
        uint256 activeStakers
    ) {
        return (
            ts.totalStaked,
            ts.rewardPool,
            ts.totalCarbonOffset,
            0 // activeStakers would need additional tracking
        );
    }

    // Events for library functions
    event EnvironmentalDataValidated(string indexed dataHash, address indexed validator, uint256 timestamp);
    event CarbonImpactUpdated(address indexed user, uint256 oldImpact, uint256 newImpact);
    event TierMultiplierUpdated(uint256 indexed tier, uint256 oldMultiplier, uint256 newMultiplier);
}

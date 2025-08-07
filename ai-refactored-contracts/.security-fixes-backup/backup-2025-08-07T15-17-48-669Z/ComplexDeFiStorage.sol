/**
 * AI SECURITY FIXES APPLIED - 2025-08-07T15:16:47.555Z
 * 
 * Automatically applied 1 security fixes:
 * - Use block.number instead of timestamp for ordering (timestamp)
 * 
 * Backup created before changes. Review and test thoroughly.
 */
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ComplexDeFiStorage
 * @notice Shared storage library for ComplexDeFi protocol facets
 * @dev Implements REFACTORING_BIBLE namespaced storage pattern
 */
library ComplexDeFiStorage {
    // ✅ REFACTORING_BIBLE: Namespaced storage slots
    bytes32 constant TRADING_SLOT = keccak256("payrox.complexdefi.trading.v1");
    bytes32 constant LENDING_SLOT = keccak256("payrox.complexdefi.lending.v1");
    bytes32 constant STAKING_SLOT = keccak256("payrox.complexdefi.staking.v1");
    bytes32 constant GOVERNANCE_SLOT = keccak256("payrox.complexdefi.governance.v1");
    bytes32 constant INSURANCE_REWARDS_SLOT = keccak256("payrox.complexdefi.insurance.v1");
    
    // Shared enums and structs
    enum OrderType { MARKET, LIMIT, STOP_LOSS }
    enum ProposalType { PARAMETER_CHANGE, UPGRADE, EMERGENCY }
    enum PolicyType { SMART_CONTRACT, LIQUIDATION, ORACLE }
    
    struct Order {
        address trader;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 deadline;
        bool filled;
        OrderType orderType;
    }
    
    struct LendingPool {
        address token;
        uint256 totalDeposits;
        uint256 totalBorrows;
        uint256 interestRate;
        uint256 collateralRatio;
        uint256 utilizationRate;
        bool active;
    }
    
    struct Proposal {
        string description;
        address proposer;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        bool executed;
        ProposalType proposalType;
        bytes callData;
    }
    
    struct InsurancePolicy {
        uint256 coverage;
        uint256 premium;
        uint256 expiry;
        bool active;
        PolicyType policyType;
    }
    
    struct InsuranceClaim {
        address claimer;
        uint256 amount;
        string reason;
        bool approved;
        bool paid;
        uint256 timestamp;
    }
    
    struct StakingTier {
        uint256 tier;
        uint256 multiplier;
        uint256 minStake;
    }
    
    struct RewardTier {
        uint256 minPoints;
        uint256 multiplier;
        string name;
    }
    
    // Trading Storage Layout
    struct TradingLayout {
        uint256 _reentrancy;
        uint256 nonce;
        bool initialized;
        mapping(address => uint256) userBalances;
        mapping(address => mapping(address => uint256)) tokenBalances;
        mapping(address => bool) approvedTokens;
        mapping(bytes32 => Order) orders;
        mapping(address => bytes32[]) userOrders;  // Track user orders
        mapping(address => uint256) tradingFees;
        uint256 totalTradingVolume;
        uint256 tradingFeeRate;
        uint256 nextOrderId;  // For sequential order IDs
        mapping(address => bool) approvedTraders;  // Whitelisted traders
    }
    
    // Lending Storage Layout  
    struct LendingLayout {
        uint256 _reentrancy;
        uint256 nonce;
        bool initialized;
        mapping(address => uint256) lendingBalances;
        mapping(address => uint256) borrowingBalances;
        mapping(address => uint256) collateralBalances;
        mapping(address => LendingPool) lendingPools;
        mapping(address => mapping(address => uint256)) userPoolBalances;  // user => token => balance
        mapping(address => uint256) liquidationThresholds;
        mapping(address => bool) approvedCollaterals;
        uint256 totalLent;
        uint256 totalBorrowed;
        uint256 healthFactorThreshold;  // For liquidation calculations
    }
    
    // Staking Storage Layout
    struct StakingLayout {
        uint256 _reentrancy;
        uint256 nonce;
        bool initialized;
        mapping(address => uint256) stakingBalances;
        mapping(address => uint256) stakingRewards;
        mapping(address => uint256) lastStakeTime;
        mapping(address => StakingTier) userTiers;
        uint256 totalStaked;
        uint256 stakingAPY;
        uint256 stakingPenalty;
    }
    
    // Governance Storage Layout
    struct GovernanceLayout {
        uint256 _reentrancy;
        uint256 nonce;
        bool initialized;
        mapping(address => uint256) votingPower;
        mapping(uint256 => Proposal) proposals;
        mapping(address => mapping(uint256 => bool)) hasVoted;
        mapping(address => uint256) delegatedVotes;
        uint256 proposalCount;
        uint256 votingDelay;
        uint256 votingPeriod;
        uint256 quorumVotes;
    }
    
    // Insurance & Rewards Storage Layout
    struct InsuranceRewardsLayout {
        uint256 _reentrancy;
        uint256 nonce;
        bool initialized;
        mapping(address => uint256) insuranceCoverage;
        mapping(address => InsurancePolicy[]) userPolicies;
        mapping(uint256 => InsuranceClaim) claims;
        uint256 totalInsuranceFund;
        uint256 claimCount;
        uint256 premiumRate;
        mapping(address => uint256) rewardPoints;
        mapping(address => uint256) rewardMultipliers;
        mapping(address => uint256) lastRewardClaim;
        mapping(uint256 => RewardTier) rewardTiers;
        uint256 totalRewardsDistributed;
        uint256 rewardEmissionRate;
    }
    
    // Storage accessors
    function tradingStorage() internal pure returns (TradingLayout storage layout) {
        bytes32 slot = TRADING_SLOT;
        assembly { layout.slot := slot }
    }
    
    function lendingStorage() internal pure returns (LendingLayout storage layout) {
        bytes32 slot = LENDING_SLOT;
        assembly { layout.slot := slot }
    }
    
    function stakingStorage() internal pure returns (StakingLayout storage layout) {
        bytes32 slot = STAKING_SLOT;
        assembly { layout.slot := slot }
    }
    
    function governanceStorage() internal pure returns (GovernanceLayout storage layout) {
        bytes32 slot = GOVERNANCE_SLOT;
        assembly { layout.slot := slot }
    }
    
    function insuranceRewardsStorage() internal pure returns (InsuranceRewardsLayout storage layout) {
        bytes32 slot = INSURANCE_REWARDS_SLOT;
        assembly { layout.slot := slot }
    }
}
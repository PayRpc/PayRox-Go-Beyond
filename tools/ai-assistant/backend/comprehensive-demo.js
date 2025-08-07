/**
 * JavaScript version of the comprehensive demo for better compatibility
 */

const { AIRefactorWizard } = require('./src/analyzers/AIRefactorWizard.js');

// Same complex contract from the TypeScript demo
const complexContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * Complex DeFi Protocol Contract - Monolithic Design
 * This contract demonstrates a typical monolithic DeFi contract that would
 * benefit from PayRox Go Beyond facet-based refactoring.
 */
contract ComplexDeFiProtocol is Ownable, ReentrancyGuard, Pausable {
    
    // State variables
    mapping(address => uint256) public stakes;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public liquidityProvided;
    mapping(address => mapping(address => uint256)) public allowances;
    mapping(address => bool) public authorizedOperators;
    
    IERC20 public stakingToken;
    IERC20 public rewardToken;
    uint256 public totalStaked;
    uint256 public rewardRate;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public constant MINIMUM_STAKE = 1000 * 10**18;
    uint256 public constant LOCK_PERIOD = 30 days;
    uint256 public protocolFee = 100; // 1%
    
    struct UserInfo {
        uint256 stakedAmount;
        uint256 rewardDebt;
        uint256 lastStakeTime;
        bool isVIP;
    }
    
    mapping(address => UserInfo) public users;
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event LiquidityAdded(address indexed provider, uint256 amount);
    event LiquidityRemoved(address indexed provider, uint256 amount);
    event OperatorAuthorized(address indexed operator);
    event OperatorRevoked(address indexed operator);
    event ProtocolFeeUpdated(uint256 newFee);
    event EmergencyWithdrawal(address indexed user, uint256 amount);
    
    // Modifiers
    modifier onlyAuthorizedOperator() {
        require(authorizedOperators[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    modifier validAmount(uint256 amount) {
        require(amount > 0, "Amount must be greater than 0");
        _;
    }
    
    modifier lockPeriodPassed(address user) {
        require(block.timestamp >= users[user].lastStakeTime + LOCK_PERIOD, "Lock period not passed");
        _;
    }
    
    // Constructor
    constructor(address _stakingToken, address _rewardToken, uint256 _rewardRate) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        rewardRate = _rewardRate;
        lastUpdateTime = block.timestamp;
    }
    
    // Administrative Functions (Admin Facet Candidates)
    function setRewardRate(uint256 _rewardRate) external onlyOwner {
        updateReward(address(0));
        rewardRate = _rewardRate;
    }
    
    function setProtocolFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high"); // Max 10%
        protocolFee = _fee;
        emit ProtocolFeeUpdated(_fee);
    }
    
    function authorizeOperator(address operator) external onlyOwner {
        authorizedOperators[operator] = true;
        emit OperatorAuthorized(operator);
    }
    
    function revokeOperator(address operator) external onlyOwner {
        authorizedOperators[operator] = false;
        emit OperatorRevoked(operator);
    }
    
    function emergencyPause() external onlyOwner {
        _pause();
    }
    
    function emergencyUnpause() external onlyOwner {
        _unpause();
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = stakingToken.balanceOf(address(this));
        stakingToken.transfer(owner(), balance);
        emit EmergencyWithdrawal(owner(), balance);
    }
    
    function upgradeContract(address newImplementation) external onlyOwner {
        require(newImplementation != address(0), "Invalid implementation");
    }
    
    // Core Staking Functions (Core Facet Candidates)
    function stake(uint256 amount) external nonReentrant whenNotPaused validAmount(amount) {
        require(amount >= MINIMUM_STAKE, "Below minimum stake");
        
        updateReward(msg.sender);
        
        stakingToken.transferFrom(msg.sender, address(this), amount);
        
        users[msg.sender].stakedAmount += amount;
        users[msg.sender].lastStakeTime = block.timestamp;
        stakes[msg.sender] += amount;
        totalStaked += amount;
        
        emit Staked(msg.sender, amount);
    }
    
    function unstake(uint256 amount) external nonReentrant whenNotPaused validAmount(amount) lockPeriodPassed(msg.sender) {
        require(users[msg.sender].stakedAmount >= amount, "Insufficient stake");
        
        updateReward(msg.sender);
        
        users[msg.sender].stakedAmount -= amount;
        stakes[msg.sender] -= amount;
        totalStaked -= amount;
        
        uint256 fee = (amount * protocolFee) / 10000;
        uint256 netAmount = amount - fee;
        
        stakingToken.transfer(msg.sender, netAmount);
        if (fee > 0) {
            stakingToken.transfer(owner(), fee);
        }
        
        emit Unstaked(msg.sender, amount);
    }
    
    function claimRewards() external nonReentrant whenNotPaused {
        updateReward(msg.sender);
        
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No rewards to claim");
        
        rewards[msg.sender] = 0;
        rewardToken.transfer(msg.sender, reward);
        
        emit RewardsClaimed(msg.sender, reward);
    }
    
    function compound() external nonReentrant whenNotPaused {
        updateReward(msg.sender);
        
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No rewards to compound");
        require(reward >= MINIMUM_STAKE, "Reward below minimum stake");
        
        rewards[msg.sender] = 0;
        users[msg.sender].stakedAmount += reward;
        stakes[msg.sender] += reward;
        totalStaked += reward;
        
        emit Staked(msg.sender, reward);
    }
    
    // Liquidity Functions (Liquidity Facet Candidates)
    function addLiquidity(uint256 amount) external nonReentrant whenNotPaused validAmount(amount) {
        stakingToken.transferFrom(msg.sender, address(this), amount);
        liquidityProvided[msg.sender] += amount;
        
        emit LiquidityAdded(msg.sender, amount);
    }
    
    function removeLiquidity(uint256 amount) external nonReentrant whenNotPaused validAmount(amount) {
        require(liquidityProvided[msg.sender] >= amount, "Insufficient liquidity");
        
        liquidityProvided[msg.sender] -= amount;
        stakingToken.transfer(msg.sender, amount);
        
        emit LiquidityRemoved(msg.sender, amount);
    }
    
    function batchAddLiquidity(address[] calldata users, uint256[] calldata amounts) external onlyAuthorizedOperator {
        require(users.length == amounts.length, "Array length mismatch");
        
        for (uint256 i = 0; i < users.length; i++) {
            liquidityProvided[users[i]] += amounts[i];
            emit LiquidityAdded(users[i], amounts[i]);
        }
    }
    
    // View Functions (View Facet Candidates)
    function getStakeInfo(address user) external view returns (
        uint256 stakedAmount,
        uint256 pendingRewards,
        uint256 lastStakeTime,
        bool canUnstake
    ) {
        stakedAmount = users[user].stakedAmount;
        pendingRewards = calculatePendingRewards(user);
        lastStakeTime = users[user].lastStakeTime;
        canUnstake = block.timestamp >= lastStakeTime + LOCK_PERIOD;
    }
    
    function getTotalValueLocked() external view returns (uint256) {
        return totalStaked;
    }
    
    function getProtocolMetrics() external view returns (
        uint256 totalStakedAmount,
        uint256 currentRewardRate,
        uint256 totalUsers,
        uint256 protocolFeeRate
    ) {
        totalStakedAmount = totalStaked;
        currentRewardRate = rewardRate;
        totalUsers = 0;
        protocolFeeRate = protocolFee;
    }
    
    function getUserLiquidity(address user) external view returns (uint256) {
        return liquidityProvided[user];
    }
    
    function isVIPUser(address user) external view returns (bool) {
        return users[user].isVIP;
    }
    
    function calculateAPY() external view returns (uint256) {
        if (totalStaked == 0) return 0;
        return (rewardRate * 365 days * 100) / totalStaked;
    }
    
    // Internal Functions
    function updateReward(address account) internal {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = block.timestamp;
        
        if (account != address(0)) {
            rewards[account] = calculatePendingRewards(account);
            users[account].rewardDebt = rewardPerTokenStored;
        }
    }
    
    function rewardPerToken() internal view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored + 
            (((block.timestamp - lastUpdateTime) * rewardRate * 1e18) / totalStaked);
    }
    
    function calculatePendingRewards(address account) internal view returns (uint256) {
        return ((users[account].stakedAmount * 
            (rewardPerToken() - users[account].rewardDebt)) / 1e18) + rewards[account];
    }
    
    // Storage Functions (Storage Facet Candidates)
    function updateUserVIPStatus(address user, bool isVIP) external onlyAuthorizedOperator {
        users[user].isVIP = isVIP;
    }
    
    function batchUpdateUserData(
        address[] calldata userAddresses,
        uint256[] calldata stakedAmounts,
        bool[] calldata vipStatuses
    ) external onlyAuthorizedOperator {
        require(
            userAddresses.length == stakedAmounts.length && 
            userAddresses.length == vipStatuses.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < userAddresses.length; i++) {
            users[userAddresses[i]].stakedAmount = stakedAmounts[i];
            users[userAddresses[i]].isVIP = vipStatuses[i];
        }
    }
    
    function bulkTransfer(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyAuthorizedOperator {
        require(recipients.length == amounts.length, "Array length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            stakingToken.transfer(recipients[i], amounts[i]);
        }
    }
}
`;

async function runComprehensiveDemo() {
    console.log('🚀 PayRox Go Beyond AI Refactor Wizard - Comprehensive Demo');
    console.log('='.repeat(70));
    console.log();
    
    try {
        const wizard = new AIRefactorWizard();
        
        console.log('📝 Analyzing complex monolithic DeFi contract...');
        console.log(`Contract size: ${complexContract.length} characters`);
        console.log(`Estimated lines of code: ~${complexContract.split('\n').length}`);
        console.log();
        
        // Analyze the contract for refactoring opportunities
        const refactorPlan = await wizard.analyzeContractForRefactoring(
            complexContract,
            'ComplexDeFiProtocol'
        );
        
        console.log('✅ Refactoring Analysis Complete!');
        console.log();
        
        // Display the facet recommendations
        console.log('🎯 Intelligent Facet Recommendations:');
        console.log('-'.repeat(50));
        refactorPlan.facets.forEach((facet, index) => {
            console.log(`${index + 1}. ${facet.name}`);
            console.log(`   📝 Description: ${facet.description}`);
            console.log(`   🔧 Functions (${facet.functions.length}): ${facet.functions.join(', ')}`);
            console.log(`   🔐 Security Rating: ${facet.securityRating}`);
            console.log(`   ⛽ Gas Optimization: ${facet.gasOptimization}`);
            console.log(`   📊 Estimated Size: ${facet.estimatedSize.toLocaleString()} gas`);
            console.log(`   🔗 Dependencies: ${facet.dependencies.length > 0 ? facet.dependencies.join(', ') : 'None'}`);
            console.log(`   💡 Reasoning: ${facet.reasoning}`);
            console.log();
        });
        
        // Display deployment strategy
        console.log('🏗️ Deployment Strategy Analysis:');
        console.log(`   Strategy: ${refactorPlan.deploymentStrategy}`);
        console.log(`   Estimated Gas Savings: ${refactorPlan.estimatedGasSavings.toLocaleString()} gas units`);
        console.log();
        
        // Display shared components
        console.log('🔗 Shared Components Analysis:');
        refactorPlan.sharedComponents.forEach(component => {
            console.log(`   • ${component}`);
        });
        console.log();
        
        // Display warnings
        if (refactorPlan.warnings.length > 0) {
            console.log('⚠️ Important Warnings:');
            refactorPlan.warnings.forEach(warning => {
                console.log(`   ${warning}`);
            });
            console.log();
        }
        
        // Apply the refactoring plan
        console.log('🔧 Applying refactoring plan and generating facet contracts...');
        const refactoredResult = await wizard.applyRefactoring(
            complexContract,
            'ComplexDeFiProtocol',
            refactorPlan
        );
        
        console.log('✅ Refactoring Complete!');
        console.log();
        
        // Display generated facets
        console.log('📜 Generated Facet Contracts:');
        console.log('-'.repeat(50));
        refactoredResult.facets.forEach((facet, index) => {
            console.log(`${index + 1}. ${facet.name}`);
            console.log(`   🔍 Selector: ${facet.selector}`);
            console.log(`   🔐 Security Level: ${facet.securityLevel}`);
            console.log(`   ⛽ Estimated Gas: ${facet.estimatedGas.toLocaleString()}`);
            console.log(`   🔗 Dependencies: ${facet.dependencies.join(', ') || 'None'}`);
            console.log(`   📄 Source Code: ${facet.sourceCode.length.toLocaleString()} characters`);
            console.log();
        });
        
        // Display PayRox manifest
        console.log('📋 PayRox Go Beyond Deployment Manifest:');
        console.log('-'.repeat(50));
        console.log(`Version: ${refactoredResult.manifest.version}`);
        console.log(`Generator: ${refactoredResult.manifest.metadata.generator}`);
        console.log(`Original Contract: ${refactoredResult.manifest.metadata.originalContract}`);
        console.log(`Refactoring Strategy: ${refactoredResult.manifest.metadata.refactoringStrategy}`);
        console.log(`Estimated Gas Savings: ${refactoredResult.manifest.metadata.estimatedGasSavings.toLocaleString()} gas`);
        console.log(`Total Chunks: ${refactoredResult.manifest.chunks.length}`);
        console.log(`Deployment Strategy: ${refactoredResult.manifest.deployment.strategy}`);
        console.log(`Verification Method: ${refactoredResult.manifest.deployment.verificationMethod}`);
        console.log(`Critical Facets: ${refactoredResult.manifest.security.criticalFacets.join(', ')}`);
        console.log(`Access Control: ${refactoredResult.manifest.security.accessControl}`);
        console.log();
        
        // Display deployment instructions (first 15 steps)
        console.log('📚 PayRox Deployment Instructions (Overview):');
        console.log('-'.repeat(50));
        refactoredResult.deploymentInstructions.slice(0, 15).forEach(instruction => {
            console.log(instruction);
        });
        
        if (refactoredResult.deploymentInstructions.length > 15) {
            console.log(`... and ${refactoredResult.deploymentInstructions.length - 15} more steps`);
        }
        
        console.log();
        console.log('🎉 Comprehensive AI Refactor Wizard Demo Complete!');
        console.log();
        console.log('🏆 Summary:');
        console.log(`   • Successfully analyzed a ${complexContract.length.toLocaleString()}-character monolithic contract`);
        console.log(`   • Generated ${refactoredResult.facets.length} intelligent facet recommendations`);
        console.log(`   • Created production-ready PayRox Go Beyond deployment manifest`);
        console.log(`   • Estimated ${refactorPlan.estimatedGasSavings.toLocaleString()} gas units in optimization savings`);
        console.log(`   • Provided ${refactoredResult.deploymentInstructions.length} detailed deployment steps`);
        console.log();
        console.log('✨ The monolithic DeFi protocol has been intelligently refactored into a');
        console.log('   modular, secure, and gas-optimized facet-based architecture that is');
        console.log('   fully compatible with PayRox Go Beyond deterministic deployment system.');
        
    } catch (error) {
        console.error('❌ Demo failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

runComprehensiveDemo();

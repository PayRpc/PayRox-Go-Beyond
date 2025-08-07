/**
 * Extended demo to show generated facet contract code
 */

const { AIRefactorWizard } = require('./src/analyzers/AIRefactorWizard.js');

const complexContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract StakingContract {
    address public owner;
    mapping(address => uint256) public stakes;
    mapping(address => uint256) public rewards;
    uint256 public totalStaked;
    uint256 public rewardRate;
    bool public paused;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract paused");
        _;
    }

    constructor(uint256 _rewardRate) {
        owner = msg.sender;
        rewardRate = _rewardRate;
    }

    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function setRewardRate(uint256 newRate) external onlyOwner {
        rewardRate = newRate;
    }

    function pause() external onlyOwner {
        paused = true;
    }

    function unpause() external onlyOwner {
        paused = false;
    }

    function emergencyWithdraw() external onlyOwner {
        // Emergency withdrawal logic
    }

    function stake(uint256 amount) external whenNotPaused {
        require(amount > 0, "Invalid amount");
        stakes[msg.sender] += amount;
        totalStaked += amount;
    }

    function unstake(uint256 amount) external whenNotPaused {
        require(stakes[msg.sender] >= amount, "Insufficient stake");
        stakes[msg.sender] -= amount;
        totalStaked -= amount;
    }

    function claimRewards() external whenNotPaused {
        uint256 reward = calculateReward(msg.sender);
        rewards[msg.sender] = 0;
        // Transfer reward logic
    }

    function calculateReward(address user) public view returns (uint256) {
        return stakes[user] * rewardRate / 100;
    }

    function getStakeInfo(address user) external view returns (uint256, uint256) {
        return (stakes[user], calculateReward(user));
    }

    function getTotalStaked() external view returns (uint256) {
        return totalStaked;
    }

    function isPaused() external view returns (bool) {
        return paused;
    }

    function getOwner() external view returns (address) {
        return owner;
    }
}
`;

async function showFacetGeneration() {
    console.log('🎨 PayRox AI Refactor Wizard - Facet Generation Demo');
    console.log('='.repeat(60));
    console.log();

    try {
        const wizard = new AIRefactorWizard();
        
        console.log('📝 Analyzing staking contract for facet opportunities...');
        const refactorPlan = await wizard.analyzeContractForRefactoring(
            complexContract,
            'StakingContract'
        );
        
        console.log('✅ Analysis Complete!');
        console.log(`   Found ${refactorPlan.facets.length} facet opportunities`);
        console.log();
        
        console.log('🔧 Generating facet contracts...');
        const result = await wizard.applyRefactoring(complexContract, 'StakingContract', refactorPlan);
        
        console.log('📜 Generated Facet Contracts:');
        console.log('='.repeat(60));
        
        // Show the first generated facet contract as an example
        if (result.facets.length > 0) {
            const adminFacet = result.facets.find(f => f.name === 'AdminFacet');
            if (adminFacet) {
                console.log('🔐 AdminFacet Contract (Sample):');
                console.log('-'.repeat(40));
                console.log(adminFacet.sourceCode);
                console.log('-'.repeat(40));
                console.log();
            }
        }
        
        console.log('📋 PayRox Manifest Summary:');
        console.log(`   Version: ${result.manifest.version}`);
        console.log(`   Chunks: ${result.manifest.chunks.length}`);
        console.log(`   Strategy: ${result.manifest.deployment.strategy}`);
        console.log(`   Critical Facets: ${result.manifest.security.criticalFacets.join(', ')}`);
        console.log();
        
        console.log('🏗️ Deployment Instructions (First 10 steps):');
        result.deploymentInstructions.slice(0, 10).forEach(instruction => {
            console.log(instruction);
        });
        
        console.log();
        console.log('🎉 Facet Generation Complete!');
        console.log('   Your monolithic contract has been intelligently refactored');
        console.log('   into modular, secure, and gas-optimized facets ready for');
        console.log('   PayRox Go Beyond deterministic deployment.');
        
    } catch (error) {
        console.error('❌ Demo failed:', error.message);
    }
}

showFacetGeneration();

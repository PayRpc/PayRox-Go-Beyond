/**
 * Simple demo to test the AI Refactor Wizard JavaScript version
 */

const { AIRefactorWizard } = require('./src/analyzers/AIRefactorWizard.js');

// Simple contract for testing
const testContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TestContract {
    address public owner;
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    bool public paused;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        totalSupply = 1000000;
    }

    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        balances[to] += amount;
        totalSupply += amount;
    }

    function transfer(address to, uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }

    function pause() external onlyOwner {
        paused = true;
    }

    function unpause() external onlyOwner {
        paused = false;
    }

    function getBalance(address account) external view returns (uint256) {
        return balances[account];
    }

    function isPaused() external view returns (bool) {
        return paused;
    }
}
`;

async function runSimpleDemo() {
    console.log('🚀 PayRox AI Refactor Wizard - Simple Demo');
    console.log('='.repeat(50));
    console.log();

    try {
        const wizard = new AIRefactorWizard();
        
        console.log('📝 Analyzing test contract...');
        const refactorPlan = await wizard.analyzeContractForRefactoring(
            testContract,
            'TestContract'
        );
        
        console.log('✅ Analysis Complete!');
        console.log();
        
        console.log('🎯 Facet Recommendations:');
        refactorPlan.facets.forEach((facet, index) => {
            console.log(`${index + 1}. ${facet.name}:`);
            console.log(`   • Description: ${facet.description}`);
            console.log(`   • Functions: ${facet.functions.join(', ')}`);
            console.log(`   • Security: ${facet.securityRating}`);
            console.log(`   • Gas Optimization: ${facet.gasOptimization}`);
            console.log(`   • Estimated Size: ${facet.estimatedSize} gas`);
            console.log();
        });
        
        console.log('📋 Deployment Strategy:', refactorPlan.deploymentStrategy);
        console.log('💰 Estimated Gas Savings:', refactorPlan.estimatedGasSavings);
        console.log();
        
        if (refactorPlan.warnings.length > 0) {
            console.log('⚠️ Warnings:');
            refactorPlan.warnings.forEach(warning => console.log(`   ${warning}`));
            console.log();
        }
        
        console.log('🔧 Applying refactoring...');
        const result = await wizard.applyRefactoring(testContract, 'TestContract', refactorPlan);
        
        console.log('📜 Generated Facets:');
        result.facets.forEach((facet, index) => {
            console.log(`${index + 1}. ${facet.name} (${facet.selector})`);
        });
        
        console.log();
        console.log('🎉 Demo Complete! The AI Refactor Wizard successfully analyzed');
        console.log('   and refactored the contract into modular facets.');
        
    } catch (error) {
        console.error('❌ Demo failed:', error.message);
        console.error(error.stack);
    }
}

runSimpleDemo();

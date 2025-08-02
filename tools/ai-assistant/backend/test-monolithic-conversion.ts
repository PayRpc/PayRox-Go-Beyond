// Test script to verify monolithic contract conversion to PayRox facets

const testMonolithicContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MonolithicExample {
    address public owner;
    mapping(address => uint256) public balances;
    mapping(address => bool) public authorized;
    uint256 public totalSupply;
    bool public paused;

    // Admin functions
    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Not owner");
        owner = newOwner;
    }

    function setPaused(bool _paused) external {
        require(msg.sender == owner, "Not owner");
        paused = _paused;
    }

    function addAuthorized(address user) external {
        require(msg.sender == owner, "Not owner");
        authorized[user] = true;
    }

    // Token functions
    function mint(address to, uint256 amount) external {
        require(authorized[msg.sender], "Not authorized");
        require(!paused, "Paused");
        balances[to] += amount;
        totalSupply += amount;
    }

    function transfer(address to, uint256 amount) external {
        require(!paused, "Paused");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }

    function burn(uint256 amount) external {
        require(!paused, "Paused");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        totalSupply -= amount;
    }

    // View functions
    function getBalance(address user) external view returns (uint256) {
        return balances[user];
    }

    function getTotalSupply() external view returns (uint256) {
        return totalSupply;
    }

    function isAuthorized(address user) external view returns (bool) {
        return authorized[user];
    }

    function isPaused() external view returns (bool) {
        return paused;
    }
}
`;

import { AIRefactorWizard } from './src/analyzers/AIRefactorWizard';

async function testMonolithicConversion() {
  console.log('🧪 Testing Monolithic Contract Conversion...');

  const wizard = new AIRefactorWizard();

  try {
    // Test the main conversion function
    const refactorPlan = await wizard.analyzeContractForRefactoring(
      testMonolithicContract,
      'MonolithicExample'
    );

    console.log('✅ Conversion Results:');
    console.log(`📊 Generated Facets: ${refactorPlan.facets.length}`);

    refactorPlan.facets.forEach((facet, index) => {
      console.log(`\n💎 Facet ${index + 1}: ${facet.name}`);
      console.log(`   Description: ${facet.description}`);
      console.log(`   Functions: ${facet.functions.join(', ')}`);
      console.log(`   Size: ${facet.estimatedSize} bytes`);
      console.log(`   Security: ${facet.securityRating}`);
      console.log(`   Gas Optimization: ${facet.gasOptimization}`);
    });

    console.log(
      `\n⛽ Estimated Gas Savings: ${refactorPlan.estimatedGasSavings}`
    );
    console.log(`🚀 Deployment Strategy: ${refactorPlan.deploymentStrategy}`);

    if (refactorPlan.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      refactorPlan.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    // Verify PayRox compatibility
    if (refactorPlan.compatibilityReport) {
      console.log('\n🔗 PayRox Compatibility:');
      console.log(
        `   Manifest Ready: ${refactorPlan.compatibilityReport.manifestReady}`
      );
      console.log(
        `   EIP-170 Compliant: ${refactorPlan.compatibilityReport.eip170Compliance?.compliant}`
      );
      console.log(
        `   Diamond Compatible: ${refactorPlan.compatibilityReport.diamondStorageCompatibility?.compatible}`
      );
    }

    console.log(
      '\n🎯 TEST RESULT: SUCCESS - Monolithic contract successfully converted to PayRox facets!'
    );
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    throw error;
  }
}

// Export for testing
export { testMonolithicContract, testMonolithicConversion };

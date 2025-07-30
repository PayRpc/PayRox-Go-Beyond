/* eslint-env node */
import SolidityAnalyzer from './src/analyzers/SolidityAnalyzer.ts';

// Test PayRox Go Beyond specific features
async function testPayRoxFeatures() {
  console.log('🚀 Testing PayRox Go Beyond Enhanced SolidityAnalyzer\n');

  const analyzer = new SolidityAnalyzer();
  
  // Sample contract for testing
  const sampleContract = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ExampleContract {
    address public owner;
    mapping(address => uint256) public balances;
    uint256 public totalSupply;
    bool public paused;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    constructor() {
        owner = msg.sender;
        totalSupply = 1000000;
    }

    // Admin functions
    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function pause() external onlyOwner {
        paused = true;
    }

    function unpause() external onlyOwner {
        paused = false;
    }

    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    // Core business logic
    function transfer(address to, uint256 amount) external whenNotPaused {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        balances[to] += amount;
        totalSupply += amount;
    }

    // View functions
    function getBalance(address account) external view returns (uint256) {
        return balances[account];
    }

    function getTotalSupply() external view returns (uint256) {
        return totalSupply;
    }

    function isPaused() external view returns (bool) {
        return paused;
    }

    function getOwner() external view returns (address) {
        return owner;
    }
}`;

  try {
    const result = await analyzer.parseContract(sampleContract, 'ExampleContract');
    
    console.log('✅ Contract Analysis Complete!\n');
    console.log('📊 Basic Metrics:');
    console.log(`   • Contract Name: ${result.name}`);
    console.log(`   • Total Functions: ${result.functions.length}`);
    console.log(`   • Total Variables: ${result.variables.length}`);
    console.log(`   • Contract Size: ${result.totalSize} bytes`);
    console.log(`   • Deployment Strategy: ${result.deploymentStrategy}`);
    console.log(`   • Chunking Required: ${result.chunkingRequired ? 'Yes' : 'No'}\n`);

    console.log('🎯 PayRox Go Beyond Specific Analysis:\n');
    
    console.log('📦 Facet Candidates:');
    for (const [facetName, functions] of result.facetCandidates) {
      console.log(`   • ${facetName}: ${functions.length} functions`);
      functions.forEach(fn => {
        console.log(`     - ${fn.name} (${fn.stateMutability}, ${fn.visibility})`);
      });
    }
    
    console.log('\n🛣️  Manifest Routes:');
    result.manifestRoutes.slice(0, 5).forEach(route => {
      console.log(`   • ${route.functionName}: ${route.selector} (${route.securityLevel} security)`);
    });
    
    if (result.storageCollisions.length > 0) {
      console.log('\n⚠️  Storage Warnings:');
      result.storageCollisions.forEach(warning => {
        console.log(`   • ${warning}`);
      });
    }

    console.log(`\n🔐 Runtime Codehash: ${result.runtimeCodehash?.slice(0, 20)}...`);
    
    // Generate facet analysis report
    const report = analyzer.generateFacetAnalysisReport(result);
    
    console.log('\n📋 Facet Analysis Report:');
    console.log(`   • Deployment Strategy: ${report.deploymentStrategy}`);
    console.log(`   • Facet Recommendations: ${report.facetRecommendations.length}`);
    
    console.log('\n💡 Gas Optimizations:');
    report.gasOptimizations.forEach(opt => {
      console.log(`   • ${opt}`);
    });
    
    console.log('\n🔒 Security Considerations:');
    report.securityConsiderations.forEach(sec => {
      console.log(`   • ${sec}`);
    });

    if (report.chunkingStrategy) {
      console.log(`\n📦 Chunking Strategy: ${report.chunkingStrategy}`);
    }

    console.log('\n🎉 PayRox Go Beyond Analysis Successful!');
    console.log('   Ready for manifest-based modular deployment! 🚀');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPayRoxFeatures();
}

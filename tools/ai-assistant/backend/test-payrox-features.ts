import SolidityAnalyzer from './src/analyzers/SolidityAnalyzer.js';
import type { ParsedContract, FunctionInfo, ManifestRoute } from './src/types/index.js';

/**
 * Test PayRox Go Beyond specific features
 * Analyzes contract structure and generates modular deployment recommendations
 */
async function testPayRoxFeatures(): Promise<void> {
  console.log('Testing PayRox Go Beyond Enhanced SolidityAnalyzer\n');

  const analyzer = new SolidityAnalyzer();
  
  // Sample contract for testing PayRox modular deployment analysis
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
    
    printBasicMetrics(result);
    printPayRoxAnalysis(result);
    printFacetAnalysisReport(analyzer, result);

  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

/**
 * Print basic contract metrics
 */
function printBasicMetrics(result: ParsedContract): void {
  console.log('Contract Analysis Complete!\n');
  console.log('Basic Metrics:');
  console.log(`   Contract Name: ${result.name}`);
  console.log(`   Total Functions: ${result.functions.length}`);
  console.log(`   Total Variables: ${result.variables.length}`);
  console.log(`   Contract Size: ${result.totalSize} bytes`);
  console.log(`   Deployment Strategy: ${result.deploymentStrategy}`);
  console.log(`   Chunking Required: ${result.chunkingRequired ? 'Yes' : 'No'}\n`);
}

/**
 * Print PayRox-specific analysis results
 */
function printPayRoxAnalysis(result: ParsedContract): void {
  console.log('PayRox Go Beyond Specific Analysis:\n');
  
  console.log('Facet Candidates:');
  for (const [facetName, functions] of result.facetCandidates) {
    console.log(`   ${facetName}: ${functions.length} functions`);
    functions.forEach((fn: FunctionInfo) => {
      console.log(`     - ${fn.name} (${fn.stateMutability}, ${fn.visibility})`);
    });
  }
  
  console.log('\nManifest Routes:');
  result.manifestRoutes.slice(0, 5).forEach((route: ManifestRoute) => {
    console.log(`   ${route.functionName}: ${route.selector} (${route.securityLevel} security)`);
  });
  
  if (result.storageCollisions.length > 0) {
    console.log('\nStorage Warnings:');
    result.storageCollisions.forEach((warning: string) => {
      console.log(`   ${warning}`);
    });
  }

  if (result.runtimeCodehash) {
    console.log(`\nRuntime Codehash: ${result.runtimeCodehash.slice(0, 20)}...`);
  }
}

/**
 * Print detailed facet analysis report
 */
function printFacetAnalysisReport(analyzer: SolidityAnalyzer, result: ParsedContract): void {
  const report = analyzer.generateFacetAnalysisReport(result);
  
  console.log('\nFacet Analysis Report:');
  console.log(`   Deployment Strategy: ${report.deploymentStrategy}`);
  console.log(`   Facet Recommendations: ${report.facetRecommendations.length}`);
  
  if (report.gasOptimizations.length > 0) {
    console.log('\nGas Optimizations:');
    report.gasOptimizations.forEach((opt: string) => {
      console.log(`   ${opt}`);
    });
  }
  
  if (report.securityConsiderations.length > 0) {
    console.log('\nSecurity Considerations:');
    report.securityConsiderations.forEach((sec: string) => {
      console.log(`   ${sec}`);
    });
  }

  if (report.chunkingStrategy) {
    console.log(`\nChunking Strategy: ${report.chunkingStrategy}`);
  }

  console.log('\nPayRox Go Beyond Analysis Successful!');
  console.log('   Ready for manifest-based modular deployment!');
}

// Execute the test function
testPayRoxFeatures().catch(console.error);

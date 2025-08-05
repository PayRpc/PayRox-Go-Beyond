import { ethers } from "hardhat";
import { createAIDeploymentSystem, smartDeploy } from "./enhanced-ai-deployment-system";

/**
 * @title AI-Powered Smart Contract Deployment Demo
 * @notice Demonstrates how the AI system automatically handles duplicate artifacts and learns from deployments
 */
async function main() {
  console.log("🤖 === Enhanced AI Deployment System Demo === 🤖");
  
  const [deployer] = await ethers.getSigners();
  const { network } = require('hardhat');
  
  console.log(`Network: ${network.name} (${network.config.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Block: ${await ethers.provider.getBlockNumber()}`);

  // Create the AI deployment system
  const aiSystem = createAIDeploymentSystem();

  console.log("\n🧠 AI System will automatically:");
  console.log("   ✅ Detect duplicate contract artifacts");
  console.log("   ✅ Select the best artifact based on context");
  console.log("   ✅ Learn from successful deployments");
  console.log("   ✅ Apply optimizations for future deployments");
  console.log("   ✅ Auto-retry with fixes on failures");

  // Test contracts that have duplicate artifacts
  const testContracts = [
    { name: "TerraStakeCoreFacet", args: [] },
    { name: "TerraStakeTokenFacet", args: [] },
    { name: "TerraStakeStakingFacet", args: [] },
    { name: "TerraStakeVRFFacet", args: [] }
  ];

  const deploymentResults: any[] = [];
  let totalGasUsed = BigInt(0);

  console.log("\n🚀 Starting AI-powered deployments...");

  for (const contract of testContracts) {
    console.log(`\n📍 AI Smart Deploy: ${contract.name}`);
    
    try {
      // Use the enhanced AI deployment system
      const result = await aiSystem.deployContract(contract.name, contract.args);
      
      if (result.success) {
        deploymentResults.push(result);
        totalGasUsed += BigInt(result.gasUsed);
        
        console.log(`   ✅ Successfully deployed: ${result.address}`);
        console.log(`   ⛽ Gas used: ${result.gasUsed}`);
        console.log(`   📏 Code size: ${result.codeSize} bytes`);
      } else {
        console.log(`   ❌ Deployment failed: ${result.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Unexpected error: ${error}`);
    }
  }

  // Demonstrate learning capabilities by deploying the same contracts again
  console.log("\n🧠 === Demonstrating AI Learning === 🧠");
  console.log("The AI system has now learned optimal deployment patterns...");
  console.log("Deploying TerraStakeCoreFacet again to show learned optimizations:");

  const learnedResult = await aiSystem.deployContract("TerraStakeCoreFacet", []);
  
  if (learnedResult.success) {
    console.log(`   🎯 AI-optimized deployment: ${learnedResult.address}`);
    console.log(`   🚀 Using learned patterns for faster deployment`);
  }

  // Summary
  console.log("\n📊 === AI Deployment Summary ===");
  console.log(`✅ Successful deployments: ${deploymentResults.length}/${testContracts.length}`);
  console.log(`⛽ Total gas used: ${totalGasUsed.toString()}`);
  console.log(`🧠 AI patterns learned: ${deploymentResults.length}`);

  if (deploymentResults.length > 0) {
    console.log("\n📍 Deployed Contracts:");
    deploymentResults.forEach(result => {
      console.log(`   ${result.contractName}: ${result.address}`);
    });
  }

  console.log("\n🔮 Future deployments will automatically:");
  console.log("   ✅ Use the same artifact selections");
  console.log("   ✅ Apply optimal gas settings");
  console.log("   ✅ Skip duplicate artifact resolution");
  console.log("   ✅ Deploy faster with learned patterns");

  console.log("\n🎉 AI Deployment System Demo Complete!");
  
  return {
    deployedContracts: deploymentResults,
    totalGasUsed: totalGasUsed.toString(),
    aiPatternsLearned: deploymentResults.length
  };
}

// Alternative usage: Simple smart deploy function
async function demonstrateSimpleUsage() {
  console.log("\n🔥 === Simple AI Deploy Demo === 🔥");
  
  // One-liner smart deployment that handles everything automatically
  const result1 = await smartDeploy("TerraStakeCoreFacet");
  const result2 = await smartDeploy("TerraStakeTokenFacet");
  
  console.log(`Simple Deploy 1: ${result1.success ? '✅' : '❌'} ${result1.address}`);
  console.log(`Simple Deploy 2: ${result2.success ? '✅' : '❌'} ${result2.address}`);
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => demonstrateSimpleUsage())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { main as aiDeploymentDemo };

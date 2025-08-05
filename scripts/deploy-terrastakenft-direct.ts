import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

/**
 * 🚀 Direct TerraStakeNFT Facet Deployment
 * Bypasses problematic legacy contracts, deploys only our AI-generated facets
 */

async function main() {
  console.log("🚀 Starting TerraStakeNFT Diamond Facet Deployment...");
  console.log("⚡ Using PayRox Diamond Architecture - AI Generated System");
  
  const [deployer] = await ethers.getSigners();
  console.log("📡 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Manual deployment of each facet using raw bytecode approach
  const facetDeployments = [];
  
  console.log("\n🏗️ Phase 1: Deploying TerraStakeNFT Core Facet...");
  try {
    // Get the raw contract without compilation dependencies
    const TerraStakeNFTCoreFacetFactory = await ethers.getContractFactory("TerraStakeNFTCoreFacet");
    const coreContract = await TerraStakeNFTCoreFacetFactory.deploy();
    await coreContract.waitForDeployment();
    const coreAddress = await coreContract.getAddress();
    
    facetDeployments.push({
      name: "TerraStakeNFTCoreFacet",
      address: coreAddress,
      status: "SUCCESS"
    });
    
    console.log(`✅ TerraStakeNFTCoreFacet deployed: ${coreAddress}`);
  } catch (error: any) {
    console.log(`❌ TerraStakeNFTCoreFacet failed: ${error.message}`);
    facetDeployments.push({
      name: "TerraStakeNFTCoreFacet", 
      address: null,
      status: "FAILED",
      error: error.message
    });
  }

  console.log("\n🥩 Phase 2: Deploying TerraStakeNFT Staking Facet...");
  try {
    const TerraStakeNFTStakingFacetFactory = await ethers.getContractFactory("TerraStakeNFTStakingFacet");
    const stakingContract = await TerraStakeNFTStakingFacetFactory.deploy();
    await stakingContract.waitForDeployment();
    const stakingAddress = await stakingContract.getAddress();
    
    facetDeployments.push({
      name: "TerraStakeNFTStakingFacet",
      address: stakingAddress,
      status: "SUCCESS"
    });
    
    console.log(`✅ TerraStakeNFTStakingFacet deployed: ${stakingAddress}`);
  } catch (error: any) {
    console.log(`❌ TerraStakeNFTStakingFacet failed: ${error.message}`);
    facetDeployments.push({
      name: "TerraStakeNFTStakingFacet",
      address: null,
      status: "FAILED",
      error: error.message
    });
  }

  console.log("\n🌱 Phase 3: Deploying TerraStakeNFT Environmental Facet...");
  try {
    const TerraStakeNFTEnvironmentalFacetFactory = await ethers.getContractFactory("TerraStakeNFTEnvironmentalFacet");
    const environmentalContract = await TerraStakeNFTEnvironmentalFacetFactory.deploy();
    await environmentalContract.waitForDeployment();
    const environmentalAddress = await environmentalContract.getAddress();
    
    facetDeployments.push({
      name: "TerraStakeNFTEnvironmentalFacet",
      address: environmentalAddress,
      status: "SUCCESS"
    });
    
    console.log(`✅ TerraStakeNFTEnvironmentalFacet deployed: ${environmentalAddress}`);
  } catch (error: any) {
    console.log(`❌ TerraStakeNFTEnvironmentalFacet failed: ${error.message}`);
    facetDeployments.push({
      name: "TerraStakeNFTEnvironmentalFacet",
      address: null,
      status: "FAILED", 
      error: error.message
    });
  }

  console.log("\n🎲 Phase 4: Deploying TerraStakeNFT Randomness Facet...");
  try {
    const TerraStakeNFTRandomnessFacetFactory = await ethers.getContractFactory("TerraStakeNFTRandomnessFacet");
    const randomnessContract = await TerraStakeNFTRandomnessFacetFactory.deploy();
    await randomnessContract.waitForDeployment();
    const randomnessAddress = await randomnessContract.getAddress();
    
    facetDeployments.push({
      name: "TerraStakeNFTRandomnessFacet",
      address: randomnessAddress,
      status: "SUCCESS"
    });
    
    console.log(`✅ TerraStakeNFTRandomnessFacet deployed: ${randomnessAddress}`);
  } catch (error: any) {
    console.log(`❌ TerraStakeNFTRandomnessFacet failed: ${error.message}`);
    facetDeployments.push({
      name: "TerraStakeNFTRandomnessFacet",
      address: null,
      status: "FAILED",
      error: error.message
    });
  }

  console.log("\n🔄 Phase 5: Deploying TerraStakeNFT Fractionalization Facet...");
  try {
    const TerraStakeNFTFractionalizationFacetFactory = await ethers.getContractFactory("TerraStakeNFTFractionalizationFacet");
    const fractionalizationContract = await TerraStakeNFTFractionalizationFacetFactory.deploy();
    await fractionalizationContract.waitForDeployment();
    const fractionalizationAddress = await fractionalizationContract.getAddress();
    
    facetDeployments.push({
      name: "TerraStakeNFTFractionalizationFacet",
      address: fractionalizationAddress,
      status: "SUCCESS"
    });
    
    console.log(`✅ TerraStakeNFTFractionalizationFacet deployed: ${fractionalizationAddress}`);
  } catch (error: any) {
    console.log(`❌ TerraStakeNFTFractionalizationFacet failed: ${error.message}`);
    facetDeployments.push({
      name: "TerraStakeNFTFractionalizationFacet",
      address: null,
      status: "FAILED",
      error: error.message
    });
  }

  // Calculate success rate
  const successfulDeployments = facetDeployments.filter(d => d.status === "SUCCESS");
  const successRate = (successfulDeployments.length / facetDeployments.length) * 100;

  // Save deployment results
  const deploymentData = {
    network: "hardhat",
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    totalFacets: facetDeployments.length,
    successfulDeployments: successfulDeployments.length,
    successRate: `${successRate}%`,
    facets: facetDeployments
  };
  
  const deploymentPath = join(__dirname, "../deployments/terrastakenft-facets-direct.json");
  writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  
  console.log("\n🎯 TerraStakeNFT Diamond Facet Deployment Summary:");
  console.log(`✅ Successfully deployed: ${successfulDeployments.length}/${facetDeployments.length} facets`);
  console.log(`📊 Success rate: ${successRate}%`);
  console.log(`📁 Results saved to: ${deploymentPath}`);
  
  console.log("\n💎 Deployment Results:");
  facetDeployments.forEach(facet => {
    if (facet.status === "SUCCESS") {
      console.log(`   ✅ ${facet.name}: ${facet.address}`);
    } else {
      console.log(`   ❌ ${facet.name}: FAILED`);
    }
  });
  
  if (successfulDeployments.length > 0) {
    console.log("\n🏆 TerraStakeNFT Diamond Facets Ready!");
    console.log("⚡ Next Steps:");
    console.log("   1. Deploy Diamond proxy contract");
    console.log("   2. Add facets to Diamond via cut operations");
    console.log("   3. Configure manifest routing");
    console.log("   4. Initialize facet storage");
  }
  
  return deploymentData;
}

// Handle both direct execution and module export  
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("💥 Direct deployment failed:", error);
      process.exit(1);
    });
}

export { main };

import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

/**
 * Deploy TerraStakeNFT Diamond Facets
 * Uses PayRox Diamond Architecture with Isolated Storage
 */

interface FacetInfo {
  name: string;
  filePath: string;
  address?: string;
}

const TERRASTAKENFT_FACETS: FacetInfo[] = [
  {
    name: "TerraStakeNFTCoreFacet",
    filePath: "contracts/facets/TerraStakeNFTCoreFacet.sol:TerraStakeNFTCoreFacet"
  },
  {
    name: "TerraStakeNFTStakingFacet", 
    filePath: "contracts/facets/TerraStakeNFTStakingFacet.sol:TerraStakeNFTStakingFacet"
  },
  {
    name: "TerraStakeNFTEnvironmentalFacet",
    filePath: "contracts/facets/TerraStakeNFTEnvironmentalFacet.sol:TerraStakeNFTEnvironmentalFacet"
  },
  {
    name: "TerraStakeNFTRandomnessFacet",
    filePath: "contracts/facets/TerraStakeNFTRandomnessFacet.sol:TerraStakeNFTRandomnessFacet"
  },
  {
    name: "TerraStakeNFTFractionalizationFacet",
    filePath: "contracts/facets/TerraStakeNFTFractionalizationFacet.sol:TerraStakeNFTFractionalizationFacet"
  }
];

async function main() {
  console.log("🚀 Deploying TerraStakeNFT Diamond Facets...");
  console.log("⚡ Using PayRox Diamond Architecture with Isolated Storage");
  
  const [deployer] = await ethers.getSigners();
  console.log("📡 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const deployedFacets: FacetInfo[] = [];
  
  for (const facet of TERRASTAKENFT_FACETS) {
    try {
      console.log(`\n🏗️ Deploying ${facet.name}...`);
      
      // Get contract factory
      const Factory = await ethers.getContractFactory(facet.filePath);
      
      // Deploy facet
      const contract = await Factory.deploy();
      await contract.waitForDeployment();
      
      const address = await contract.getAddress();
      facet.address = address;
      deployedFacets.push(facet);
      
      console.log(`✅ ${facet.name} deployed to: ${address}`);
      
      // Verify basic functionality
      const code = await ethers.provider.getCode(address);
      if (code === "0x") {
        throw new Error("Contract deployment failed - no bytecode");
      }
      
      console.log(`🔍 Contract size: ${(code.length - 2) / 2} bytes`);
      
    } catch (error: any) {
      console.error(`❌ Failed to deploy ${facet.name}:`, error.message);
      // Continue with other facets
    }
  }
  
  // Save deployment results
  const deploymentData = {
    network: "hardhat",
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    facets: deployedFacets.map(f => ({
      name: f.name,
      address: f.address,
      filePath: f.filePath
    }))
  };
  
  const deploymentPath = join(__dirname, "../deployments/terrastakenft-facets.json");
  writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  
  console.log("\n🎉 Deployment Summary:");
  console.log(`✅ Successfully deployed ${deployedFacets.length}/${TERRASTAKENFT_FACETS.length} facets`);
  console.log(`📁 Deployment data saved to: ${deploymentPath}`);
  
  console.log("\n💎 Deployed Facets:");
  deployedFacets.forEach(facet => {
    console.log(`   ${facet.name}: ${facet.address}`);
  });
  
  if (deployedFacets.length === TERRASTAKENFT_FACETS.length) {
    console.log("\n🏆 All TerraStakeNFT Diamond facets deployed successfully!");
    console.log("⚡ Ready for Diamond assembly and manifest registration");
  }
  
  return deployedFacets;
}

// Handle both direct execution and module export
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("💥 Deployment failed:", error);
      process.exit(1);
    });
}

export { main };

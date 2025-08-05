import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

/**
 * 🎯 Pure TerraStakeNFT Diamond Facet Deployment
 * Deploys ONLY the 5 AI-generated TerraStakeNFT facets
 */

async function deployTerraStakeNFTFacets() {
  console.log("🚀 Pure TerraStakeNFT Diamond Facet Deployment");
  console.log("⚡ AI-Generated PayRox Diamond Architecture");
  
  const [deployer] = await ethers.getSigners();
  console.log("📡 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const deployments = [];
  
  // TerraStakeNFT Facet Definitions
  const terraStakeNFTFacets = [
    {
      name: "TerraStakeNFTCoreFacet",
      description: "🏗️ Core ERC1155 functionality with PayRox Diamond routing"
    },
    {
      name: "TerraStakeNFTStakingFacet", 
      description: "🥩 Multi-tiered staking with AI-optimized rewards"
    },
    {
      name: "TerraStakeNFTEnvironmentalFacet",
      description: "🌱 Environmental tracking and carbon credit integration"
    },
    {
      name: "TerraStakeNFTRandomnessFacet",
      description: "🎲 VRF integration with lottery and randomness systems"
    },
    {
      name: "TerraStakeNFTFractionalizationFacet",
      description: "🔄 NFT fractionalization with DAO governance"
    }
  ];

  console.log(`\n💎 Deploying ${terraStakeNFTFacets.length} TerraStakeNFT Diamond Facets...\n`);

  for (let i = 0; i < terraStakeNFTFacets.length; i++) {
    const facet = terraStakeNFTFacets[i];
    console.log(`[${i+1}/${terraStakeNFTFacets.length}] ${facet.description}`);
    
    try {
      console.log(`🔨 Deploying ${facet.name}...`);
      
      // Get contract factory for specific facet
      const FacetFactory = await ethers.getContractFactory(facet.name);
      
      // Deploy the facet
      const contract = await FacetFactory.deploy();
      await contract.waitForDeployment();
      
      const address = await contract.getAddress();
      
      // Verify deployment
      const deployedCode = await ethers.provider.getCode(address);
      if (deployedCode === "0x") {
        throw new Error("No bytecode deployed");
      }
      
      const deployment = {
        name: facet.name,
        description: facet.description,
        address: address,
        bytecodeSize: (deployedCode.length - 2) / 2,
        status: "SUCCESS",
        gasUsed: "N/A", // Would need gas estimation
        timestamp: new Date().toISOString()
      };
      
      deployments.push(deployment);
      
      console.log(`✅ ${facet.name}`);
      console.log(`   📍 Address: ${address}`);
      console.log(`   📏 Size: ${deployment.bytecodeSize} bytes`);
      console.log("");
      
    } catch (error: any) {
      console.log(`❌ ${facet.name} FAILED: ${error.message}`);
      
      deployments.push({
        name: facet.name,
        description: facet.description,
        address: null,
        status: "FAILED",
        error: error.message,
        timestamp: new Date().toISOString()
      });
      console.log("");
    }
  }

  // Calculate results
  const successful = deployments.filter(d => d.status === "SUCCESS");
  const failed = deployments.filter(d => d.status === "FAILED");
  const successRate = (successful.length / deployments.length) * 100;

  // Save detailed deployment report
  const deploymentReport = {
    metadata: {
      timestamp: new Date().toISOString(),
      network: "hardhat",
      deployer: deployer.address,
      deployerBalance: ethers.formatEther(await ethers.provider.getBalance(deployer.address))
    },
    summary: {
      totalFacets: deployments.length,
      successful: successful.length,
      failed: failed.length,
      successRate: `${successRate}%`
    },
    deployments: deployments
  };

  const reportPath = join(__dirname, "../deployments/terrastakenft-diamond-facets.json");
  writeFileSync(reportPath, JSON.stringify(deploymentReport, null, 2));

  // Display final results
  console.log("🎯 TerraStakeNFT Diamond Facet Deployment Results");
  console.log("═".repeat(50));
  console.log(`✅ Successful: ${successful.length}/${deployments.length} (${successRate}%)`);
  console.log(`❌ Failed: ${failed.length}/${deployments.length}`);
  console.log(`📁 Report saved: ${reportPath}`);
  
  if (successful.length > 0) {
    console.log("\n💎 Successfully Deployed TerraStakeNFT Diamond Facets:");
    successful.forEach(deployment => {
      console.log(`   ✅ ${deployment.name}: ${deployment.address}`);
    });
  }
  
  if (failed.length > 0) {
    console.log("\n❌ Failed Deployments:");
    failed.forEach(deployment => {
      const error = 'error' in deployment ? deployment.error : 'Unknown error';
      console.log(`   ❌ ${deployment.name}: ${error}`);
    });
  }

  if (successful.length === terraStakeNFTFacets.length) {
    console.log("\n🏆 COMPLETE SUCCESS!");
    console.log("🎉 All TerraStakeNFT Diamond facets deployed successfully!");
    console.log("⚡ Ready for Diamond proxy assembly and manifest integration!");
  } else if (successful.length > 0) {
    console.log("\n⚠️ PARTIAL SUCCESS!");
    console.log("🔧 Some facets deployed successfully, others need debugging.");
  } else {
    console.log("\n💥 DEPLOYMENT FAILED!");
    console.log("🛠️ All facets failed - check compilation and dependencies.");
  }

  return deploymentReport;
}

// Main execution
if (require.main === module) {
  deployTerraStakeNFTFacets()
    .then((report) => {
      const successRate = parseFloat(report.summary.successRate);
      if (successRate === 100) {
        console.log("\n🚀 TerraStakeNFT Diamond facets ready for action!");
        process.exit(0);
      } else if (successRate > 0) {
        console.log("\n⚡ Partial deployment completed.");
        process.exit(0);
      } else {
        console.log("\n❌ Deployment failed completely.");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("💥 Fatal deployment error:", error);
      process.exit(1);
    });
}

export { deployTerraStakeNFTFacets };

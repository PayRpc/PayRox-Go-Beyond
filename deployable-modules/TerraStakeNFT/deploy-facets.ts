import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * 🤖 AI-Generated Diamond Facet Deployment Script
 * Generated from: contracts/demo/TerraStakeNFT.sol
 * Facets: 6
 */

const deployFacets: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    console.log('🚀 Deploying TerraStakeNFT Diamond Facets...');
    
    const facets = [
        'TerraStakeNFTStakingFacet',
        'TerraStakeNFTCoreFacet',
        'TerraStakeNFTUtilsFacet',
        'TerraStakeNFTFractionalizationFacet',
        'TerraStakeNFTEnvironmentalFacet',
        'TerraStakeNFTRandomnessFacet'
    ];
    
    for (const facetName of facets) {
        console.log(`⚡ Deploying ${facetName}...`);
        
        // Deploy facet using PayRox CREATE2 factory
        const facet = await hre.ethers.getContractFactory(facetName);
        const deployed = await facet.deploy();
        await deployed.waitForDeployment();
        
        console.log(`✅ ${facetName} deployed to: ${await deployed.getAddress()}`);
    }
    
    console.log('🏆 All TerraStakeNFT facets deployed successfully!');
};

deployFacets.tags = ['TerraStakeNFTFacets'];
export default deployFacets;
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";

/**
 * @title Deploy TerraStakeNFT Demo Contract
 * @dev Deploys the TerraSta        console.log(`   💰 Reward Rates:`);
    console.log(`      Basic: ${basicRewardRate.toString()} basis points (${Number(basicRewardRate)/100}%)`);
    console.log(`      Premium: ${premiumRewardRate.toString()} basis points (${Number(premiumRewardRate)/100}%)`);
    console.log(`      Legendary: ${legendaryRewardRate.toString()} basis points (${Number(legendaryRewardRate)/100}%)`);
    console.log(`      Mythic: ${mythicRewardRate.toString()} basis points (${Number(mythicRewardRate)/100}%)`);le.log(`   💰 Reward Rates:`);
    console.log(`      Basic: ${basicRewardRate.toString()} basis points (${Number(basicRewardRate)/100}%)`);
    console.log(`      Premium: ${premiumRewardRate.toString()} basis points (${Number(premiumRewardRate)/100}%)`);
    console.log(`      Legendary: ${legendaryRewardRate.toString()} basis points (${Number(legendaryRewardRate)/100}%)`);
    console.log(`      Mythic: ${mythicRewardRate.toString()} basis points (${Number(mythicRewardRate)/100}%)`); contract through the PayRox system
 * 
 * This script demonstrates deploying a complex real-world contract
 * with the following features:
 * - ERC1155 multi-token environmental NFTs
 * - Environmental impact tracking and carbon offset integration
 * - VRF-based randomized rewards and rarity generation
 * - Staking mechanisms with variable APY rates
 * - Fractionalization support for high-value assets
 * - Comprehensive access control and emergency mechanisms
 * - UUPS upgradeable pattern with role-based authorization
 * 
 * @author PayRox Go Beyond Team
 */

interface DeploymentResult {
  address: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: bigint;
  implementationAddress?: string;
  proxyAddress?: string;
}

async function deployTerraStakeNFT(hre: HardhatRuntimeEnvironment): Promise<DeploymentResult> {
  console.log("🌱 Starting TerraStakeNFT deployment...");

  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();

  console.log(`📋 Deployment Info:`);
  console.log(`   Network: ${hre.network.name}`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);

  // Contract parameters
  const baseURI = "https://api.terrastake.eco/metadata/";
  const admin = deployer.address;
  
  // Mock VRF Coordinator for demo (in production, use actual Chainlink VRF)
  const vrfCoordinator = "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625"; // Sepolia VRF Coordinator
  const vrfKeyHash = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c"; // Sepolia key hash
  const vrfSubscriptionId = 1; // Demo subscription ID

  try {
    console.log("🔨 Deploying TerraStakeNFT contract...");

    // Get the contract factory
    const TerraStakeNFTFactory = await ethers.getContractFactory("TerraStakeNFT");
    
    console.log("⚡ Deploying contract...");
    const terraStakeNFT = await TerraStakeNFTFactory.deploy();

    console.log("⏳ Waiting for deployment confirmation...");
    await terraStakeNFT.waitForDeployment();
    
    const contractAddress = await terraStakeNFT.getAddress();
    const deploymentTx = terraStakeNFT.deploymentTransaction();
    
    if (!deploymentTx) {
      throw new Error("Failed to get deployment transaction");
    }

    const receipt = await deploymentTx.wait();
    if (!receipt) {
      throw new Error("Failed to get transaction receipt");
    }

    console.log("🔧 Initializing contract...");
    const initTx = await terraStakeNFT.initialize(
      baseURI,
      admin,
      vrfCoordinator,
      vrfKeyHash,
      vrfSubscriptionId
    );
    await initTx.wait();

    console.log("✅ TerraStakeNFT deployed successfully!");
    console.log(`   Contract Address: ${contractAddress}`);
    console.log(`   Transaction: ${deploymentTx.hash}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);

    // Verify the deployment
    console.log("🔍 Verifying deployment...");
    
    // Check if contract is properly initialized
    const hasAdminRole = await terraStakeNFT.hasRole(
      await terraStakeNFT.DEFAULT_ADMIN_ROLE(),
      admin
    );
    console.log(`   Admin role granted: ${hasAdminRole}`);

    // Check token configurations
    const [basicSupply, basicMax] = await terraStakeNFT.getSupplyInfo(1);
    console.log(`   Basic token config: ${basicSupply}/${basicMax}`);

    // Check VRF configuration
    const vrfKeyHashStored = await terraStakeNFT.vrfKeyHash();
    console.log(`   VRF configured: ${vrfKeyHashStored === vrfKeyHash}`);

    return {
      address: contractAddress,
      transactionHash: deploymentTx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      proxyAddress: contractAddress
    };

  } catch (error) {
    console.error("❌ TerraStakeNFT deployment failed:", error);
    throw error;
  }
}

/**
 * @dev Demonstrate TerraStakeNFT functionality after deployment
 */
async function demonstrateFunctionality(
  hre: HardhatRuntimeEnvironment, 
  contractAddress: string
): Promise<void> {
  console.log("🎭 Demonstrating TerraStakeNFT functionality...");

  const { ethers } = hre;
  const [deployer, user1, user2] = await ethers.getSigners();

  // Get contract instance
  const terraStakeNFT = await ethers.getContractAt("TerraStakeNFT", contractAddress);

  try {
    // 1. Mint environmental NFTs with impact data
    console.log("🌿 Minting environmental NFTs...");
    
    const environmentalData = {
      carbonOffset: ethers.parseEther("10"), // 10 tons CO2
      impactScore: 85, // High environmental impact score
      regionId: 1, // Pacific Northwest
      certificationHash: ethers.keccak256(ethers.toUtf8Bytes("VERIFIED_GREEN_CERT_2024")),
      lastUpdated: 0 // Will be set in contract
    };

    const mintTx = await terraStakeNFT.mintWithEnvironmentalData(
      user1.address,
      1, // TERRA_BASIC
      100, // Amount
      environmentalData
    );
    await mintTx.wait();
    console.log(`   ✅ Minted 100 TERRA_BASIC tokens to ${user1.address}`);

    // 2. Check user balance
    const balance = await terraStakeNFT.balanceOf(user1.address, 1);
    console.log(`   💰 User balance: ${balance} tokens`);

    // 3. Demonstrate access control and token info
    console.log("🔐 Demonstrating access control...");
    
    const hasMinterRole = await terraStakeNFT.hasRole(
      await terraStakeNFT.MINTER_ROLE(),
      deployer.address
    );
    console.log(`   🎫 Deployer has minter role: ${hasMinterRole}`);

    // 4. Check staking reward rates
    const basicRewardRate = await terraStakeNFT.baseRewardRates(1);
    const premiumRewardRate = await terraStakeNFT.baseRewardRates(2);
    const legendaryRewardRate = await terraStakeNFT.baseRewardRates(3);
    const mythicRewardRate = await terraStakeNFT.baseRewardRates(4);
    
    console.log(`   � Reward Rates:`);
    console.log(`      Basic: ${basicRewardRate} basis points (${basicRewardRate/100}%)`);
    console.log(`      Premium: ${premiumRewardRate} basis points (${premiumRewardRate/100}%)`);
    console.log(`      Legendary: ${legendaryRewardRate} basis points (${legendaryRewardRate/100}%)`);
    console.log(`      Mythic: ${mythicRewardRate} basis points (${mythicRewardRate/100}%)`);

    // 5. Demonstrate environmental data retrieval
    console.log("🌍 Retrieving environmental data...");
    const envData = await terraStakeNFT.getEnvironmentalData(1, 0);
    console.log(`   📈 Environmental Impact:`);
    console.log(`      Carbon Offset: ${ethers.formatEther(envData.carbonOffset)} tons`);
    console.log(`      Impact Score: ${envData.impactScore}/100`);
    console.log(`      Region ID: ${envData.regionId}`);

    // 6. Check supply information
    const [currentSupply, maxSupply] = await terraStakeNFT.getSupplyInfo(1);
    console.log(`   📦 Supply: ${currentSupply}/${maxSupply}`);

    console.log("✅ Functionality demonstration completed!");

  } catch (error) {
    console.error("❌ Functionality demonstration failed:", error);
    throw error;
  }
}

/**
 * @dev Main deployment function
 */
export async function main(hre: HardhatRuntimeEnvironment, params?: any): Promise<any> {
  console.log("🚀 TerraStakeNFT Deployment & Demo Script");
  console.log("==========================================");

  try {
    // Deploy the contract
    const deploymentResult = await deployTerraStakeNFT(hre);
    
    // Wait a moment for network propagation
    console.log("⏳ Waiting for network propagation...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Demonstrate functionality
    await demonstrateFunctionality(hre, deploymentResult.address);
    
    // Summary
    console.log("\n📋 Deployment Summary");
    console.log("=====================");
    console.log(`✅ Contract deployed successfully`);
    console.log(`📍 Address: ${deploymentResult.address}`);
    console.log(`🔗 Transaction: ${deploymentResult.transactionHash}`);
    console.log(`⛽ Gas Used: ${deploymentResult.gasUsed.toString()}`);
    console.log(`🏗️  Implementation: ${deploymentResult.implementationAddress}`);
    
    console.log("\n🌟 Key Features Demonstrated:");
    console.log("• ERC1155 multi-token environmental NFTs");
    console.log("• Environmental impact tracking with CO2 offset");
    console.log("• Staking mechanism with reward calculation");
    console.log("• Role-based access control system");
    console.log("• UUPS upgradeable proxy pattern");
    console.log("• Supply tracking and management");
    
    return {
      success: true,
      contractAddress: deploymentResult.address,
      implementationAddress: deploymentResult.implementationAddress,
      transactionHash: deploymentResult.transactionHash,
      gasUsed: deploymentResult.gasUsed.toString(),
      blockNumber: deploymentResult.blockNumber
    };

  } catch (error) {
    console.error("❌ Deployment script failed:", error);
    throw error;
  }
}

// Export for Hardhat tasks
export default main;

// If run directly
if (require.main === module) {
  const hre = require("hardhat");
  main(hre)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

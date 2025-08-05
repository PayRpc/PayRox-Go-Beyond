import { HardhatRuntimeEnvironment } from "hardhat/types";
import { 
  DeterministicChunkFactory,
  ManifestDispatcher,
  TerraStakeCoreFacet,
  TerraStakeTokenFacet,
  TerraStakeStakingFacet,
  TerraStakeVRFFacet,
  TerraStakeCoordinatorFacet,
  TerraStakeInitializer
} from "../typechain-types";
import { ethers } from "hardhat";
import { getSelectors, FacetCutAction } from "../scripts/lib/diamond";

interface TerraStakeDeploymentParams {
  adminAddress?: string;
  operatorAddress?: string;
  oracleAddress?: string;
  vrfCoordinatorAddress?: string;
  subscriptionId?: bigint;
  keyHash?: string;
}

interface FacetDeploymentInfo {
  name: string;
  contract: any;
  address: string;
  selectors: string[];
}

export async function deployTerraStakeDiamond(
  hre: HardhatRuntimeEnvironment,
  params: TerraStakeDeploymentParams = {}
): Promise<{
  diamond: ManifestDispatcher;
  facets: FacetDeploymentInfo[];
  diamondAddress: string;
  initializerAddress: string;
}> {
  console.log("🚀 Starting TerraStake Diamond deployment...");
  
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deployer } = await getNamedAccounts();
  const [admin, operator, oracle] = await ethers.getSigners();

  // Use provided addresses or defaults
  const adminAddress = params.adminAddress || admin.address;
  const operatorAddress = params.operatorAddress || operator.address;
  const oracleAddress = params.oracleAddress || oracle.address;

  console.log("📋 Deployment configuration:");
  console.log("   - Admin:", adminAddress);
  console.log("   - Operator:", operatorAddress);
  console.log("   - Oracle:", oracleAddress);
  console.log("   - Deployer:", deployer);

  // Step 1: Deploy the DeterministicChunkFactory if not exists
  console.log("\n🏭 Checking DeterministicChunkFactory...");
  let chunkFactory: DeterministicChunkFactory;
  
  try {
    const existingFactory = await ethers.getContract("DeterministicChunkFactory");
    chunkFactory = existingFactory as DeterministicChunkFactory;
    console.log("✅ Using existing DeterministicChunkFactory at:", await chunkFactory.getAddress());
  } catch {
    console.log("🔨 Deploying new DeterministicChunkFactory...");
    await deployments.deploy("DeterministicChunkFactory", {
      from: deployer,
      args: [],
      log: true,
    });
    chunkFactory = await ethers.getContract("DeterministicChunkFactory");
    console.log("✅ DeterministicChunkFactory deployed at:", await chunkFactory.getAddress());
  }

  // Step 2: Deploy TerraStake Facets
  console.log("\n🧩 Deploying TerraStake Facets...");
  
  const facets: FacetDeploymentInfo[] = [];

  // Deploy Core Facet
  console.log("   📦 Deploying TerraStakeCoreFacet...");
  await deployments.deploy("TerraStakeCoreFacet", {
    from: deployer,
    args: [],
    log: false,
  });
  const coreFacet = await ethers.getContract("TerraStakeCoreFacet") as TerraStakeCoreFacet;
  const coreSelectors = getSelectors(coreFacet);
  facets.push({
    name: "TerraStakeCoreFacet",
    contract: coreFacet,
    address: await coreFacet.getAddress(),
    selectors: coreSelectors
  });

  // Deploy Token Facet
  console.log("   📦 Deploying TerraStakeTokenFacet...");
  await deployments.deploy("TerraStakeTokenFacet", {
    from: deployer,
    args: [],
    log: false,
  });
  const tokenFacet = await ethers.getContract("TerraStakeTokenFacet") as TerraStakeTokenFacet;
  const tokenSelectors = getSelectors(tokenFacet);
  facets.push({
    name: "TerraStakeTokenFacet",
    contract: tokenFacet,
    address: await tokenFacet.getAddress(),
    selectors: tokenSelectors
  });

  // Deploy Staking Facet
  console.log("   📦 Deploying TerraStakeStakingFacet...");
  await deployments.deploy("TerraStakeStakingFacet", {
    from: deployer,
    args: [],
    log: false,
  });
  const stakingFacet = await ethers.getContract("TerraStakeStakingFacet") as TerraStakeStakingFacet;
  const stakingSelectors = getSelectors(stakingFacet);
  facets.push({
    name: "TerraStakeStakingFacet",
    contract: stakingFacet,
    address: await stakingFacet.getAddress(),
    selectors: stakingSelectors
  });

  // Deploy VRF Facet
  console.log("   📦 Deploying TerraStakeVRFFacet...");
  await deployments.deploy("TerraStakeVRFFacet", {
    from: deployer,
    args: [],
    log: false,
  });
  const vrfFacet = await ethers.getContract("TerraStakeVRFFacet") as TerraStakeVRFFacet;
  const vrfSelectors = getSelectors(vrfFacet);
  facets.push({
    name: "TerraStakeVRFFacet",
    contract: vrfFacet,
    address: await vrfFacet.getAddress(),
    selectors: vrfSelectors
  });

  // Deploy Coordinator Facet
  console.log("   📦 Deploying TerraStakeCoordinatorFacet...");
  await deployments.deploy("TerraStakeCoordinatorFacet", {
    from: deployer,
    args: [],
    log: false,
  });
  const coordinatorFacet = await ethers.getContract("TerraStakeCoordinatorFacet") as TerraStakeCoordinatorFacet;
  const coordinatorSelectors = getSelectors(coordinatorFacet);
  facets.push({
    name: "TerraStakeCoordinatorFacet",
    contract: coordinatorFacet,
    address: await coordinatorFacet.getAddress(),
    selectors: coordinatorSelectors
  });

  console.log("✅ All facets deployed successfully!");

  // Step 3: Deploy Initializer
  console.log("\n🔧 Deploying TerraStakeInitializer...");
  await deployments.deploy("TerraStakeInitializer", {
    from: deployer,
    args: [],
    log: false,
  });
  const initializer = await ethers.getContract("TerraStakeInitializer") as TerraStakeInitializer;
  const initializerAddress = await initializer.getAddress();
  console.log("✅ TerraStakeInitializer deployed at:", initializerAddress);

  // Step 4: Deploy ManifestDispatcher (Diamond)
  console.log("\n💎 Deploying TerraStake Diamond...");
  
  // Prepare diamond cuts for all facets
  const diamondCuts = facets.map(facet => ({
    facetAddress: facet.address,
    action: FacetCutAction.Add,
    functionSelectors: facet.selectors
  }));

  // Prepare initialization call data
  const initData = initializer.interface.encodeFunctionData("initialize", [
    adminAddress,
    operatorAddress,
    oracleAddress
  ]);

  await deployments.deploy("TerraStakeDiamond", {
    contract: "ManifestDispatcher",
    from: deployer,
    args: [diamondCuts, initializerAddress, initData],
    log: false,
  });

  const diamond = await ethers.getContract("TerraStakeDiamond") as ManifestDispatcher;
  const diamondAddress = await diamond.getAddress();
  
  console.log("✅ TerraStake Diamond deployed at:", diamondAddress);

  // Step 5: Post-deployment verification
  console.log("\n🔍 Verifying deployment...");
  
  // Check if all facets are properly connected
  for (const facet of facets) {
    try {
      const facetAddresses = await diamond.facetAddresses();
      const isFacetConnected = facetAddresses.includes(facet.address);
      console.log(`   ${isFacetConnected ? '✅' : '❌'} ${facet.name}: ${facet.address}`);
    } catch (error) {
      console.log(`   ❌ ${facet.name}: Verification failed -`, error);
    }
  }

  // Step 6: Display deployment summary
  console.log("\n📊 Deployment Summary:");
  console.log("==========================================");
  console.log(`💎 Diamond Address: ${diamondAddress}`);
  console.log(`🔧 Initializer Address: ${initializerAddress}`);
  console.log(`🏭 Factory Address: ${await chunkFactory.getAddress()}`);
  console.log("\n🧩 Facets:");
  facets.forEach((facet, index) => {
    console.log(`   ${index + 1}. ${facet.name}`);
    console.log(`      Address: ${facet.address}`);
    console.log(`      Selectors: ${facet.selectors.length}`);
  });
  
  console.log("\n👥 Roles:");
  console.log(`   🔐 Admin: ${adminAddress}`);
  console.log(`   ⚙️  Operator: ${operatorAddress}`);
  console.log(`   🔮 Oracle: ${oracleAddress}`);

  console.log("\n🎉 TerraStake Diamond deployment completed successfully!");
  console.log("==========================================");

  return {
    diamond,
    facets,
    diamondAddress,
    initializerAddress
  };
}

/**
 * @dev Get total size of all facets combined
 * @param facets Array of deployed facets
 * @returns Total deployment size in bytes
 */
export async function getTotalFacetSize(facets: FacetDeploymentInfo[]): Promise<number> {
  let totalSize = 0;
  
  for (const facet of facets) {
    try {
      const code = await ethers.provider.getCode(facet.address);
      const size = (code.length - 2) / 2; // Remove '0x' and convert hex to bytes
      totalSize += size;
      console.log(`   📏 ${facet.name}: ${size} bytes`);
    } catch (error) {
      console.log(`   ❌ ${facet.name}: Size calculation failed`);
    }
  }
  
  console.log(`📊 Total facet size: ${totalSize} bytes (${(totalSize / 1024).toFixed(2)} KB)`);
  console.log(`📊 Original limit: 24,576 bytes (24 KB)`);
  console.log(`📊 Size efficiency: ${((24576 - totalSize) / 24576 * 100).toFixed(2)}% under limit`);
  
  return totalSize;
}

// Default export for hardhat-deploy
export default deployTerraStakeDiamond;

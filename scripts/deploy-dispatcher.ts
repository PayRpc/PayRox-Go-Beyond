import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy the ManifestDispatcher contract
 */
export async function main(hre: HardhatRuntimeEnvironment, params?: any) {
  console.log("📡 Deploying ManifestDispatcher...");
  
  const { ethers, network } = hre;
  const [deployer] = await ethers.getSigners();
  
  // Get contract factory
  const DispatcherContract = await ethers.getContractFactory("ManifestDispatcher");
  
  // Deploy contract
  console.log("📡 Deploying contract...");
  const dispatcher = await DispatcherContract.deploy(
    deployer.address,  // admin
    60  // activationDelay (60 seconds)
  );
  await dispatcher.waitForDeployment();
  
  const dispatcherAddress = await dispatcher.getAddress();
  console.log(`✅ ManifestDispatcher deployed to: ${dispatcherAddress}`);
  
  // Verify deployment
  const activationDelay = await dispatcher.activationDelay();
  const frozen = await dispatcher.frozen();
  const activeRoot = await dispatcher.activeRoot();
  
  console.log(`  ⏱️  Activation delay: ${activationDelay} seconds`);
  console.log(`  ❄️  Frozen: ${frozen}`);
  console.log(`  🌳 Active root: ${activeRoot}`);
  
  // Save deployment information
  await saveDeploymentInfo({
    contractName: "ManifestDispatcher",
    address: dispatcherAddress,
    deployer: deployer.address,
    network: network.name,
    timestamp: new Date().toISOString(),
    transactionHash: dispatcher.deploymentTransaction()?.hash,
    constructorArguments: [deployer.address, 60],
    activationDelay: activationDelay.toString(),
    frozen: frozen
  });
  
  return dispatcherAddress;
}

async function saveDeploymentInfo(deploymentInfo: any) {
  const deploymentsDir = path.join(__dirname, "..", "deployments", deploymentInfo.network);
  
  // Ensure deployments directory exists
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Save deployment info
  const deploymentPath = path.join(deploymentsDir, "dispatcher.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`💾 Deployment info saved: ${deploymentPath}`);
}

// Export for CLI usage
if (require.main === module) {
  import("hardhat").then(async (hre) => {
    await main(hre.default);
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

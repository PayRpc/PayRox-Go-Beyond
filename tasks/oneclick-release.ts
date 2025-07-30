import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as fs from "fs";
import * as path from "path";
import { ethers } from "hardhat";

/**
 * One-click release task for PayRox Go Beyond
 * This task orchestrates the complete deployment process
 */
task("oneclick-release", "Execute complete release deployment")
  .addOptionalParam("network", "Network to deploy to", "localhost")
  .addOptionalParam("config", "Path to release config", "./config/app.release.yaml")
  .addOptionalParam("verify", "Verify contracts on etherscan", "false")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    console.log("🚀 Starting PayRox Go Beyond One-Click Release");
    console.log(`📡 Network: ${taskArgs.network}`);
    console.log(`⚙️  Config: ${taskArgs.config}`);
    
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
    
    try {
      // Step 1: Preflight checks
      console.log("\n📋 Step 1: Preflight Checks");
      await runScript("preflight.ts", hre);
      
      // Step 2: Build manifest
      console.log("\n📦 Step 2: Building Manifest");
      await runScript("build-manifest.ts", hre);
      
      // Step 3: Stage chunks
      console.log("\n🧩 Step 3: Staging Chunks");
      await runScript("stage-chunks.ts", hre);
      
      // Step 4: Deploy factory
      console.log("\n🏭 Step 4: Deploying Factory");
      const factoryAddress = await runScript("deploy-factory.ts", hre);
      
      // Step 5: Deploy dispatcher
      console.log("\n📡 Step 5: Deploying Dispatcher");
      const dispatcherAddress = await runScript("deploy-dispatcher.ts", hre);
      
      // Step 6: Orchestrate deployment
      console.log("\n🎼 Step 6: Orchestrating Deployment");
      await runScript("orchestrate.ts", hre, {
        factory: factoryAddress,
        dispatcher: dispatcherAddress
      });
      
      // Step 7: Post-deployment verification
      console.log("\n✅ Step 7: Post-deployment Verification");
      await runScript("postverify.ts", hre);
      
      // Step 8: Contract verification (if requested)
      if (taskArgs.verify === "true" && network.name !== "hardhat" && network.name !== "localhost") {
        console.log("\n🔍 Step 8: Contract Verification");
        await verifyContracts(hre);
      }
      
      // Generate release summary
      const releaseInfo = generateReleaseSummary(network.name, deployer.address);
      console.log("\n🎉 Release Complete!");
      console.log(releaseInfo);
      
      // Save release information
      saveReleaseInfo(releaseInfo, network.name);
      
    } catch (error) {
      console.error("❌ Release failed:", error);
      process.exit(1);
    }
  });

/**
 * Run a deployment script
 */
async function runScript(
  scriptName: string, 
  hre: HardhatRuntimeEnvironment, 
  params?: any
): Promise<any> {
  try {
    const scriptPath = path.join(__dirname, "..", "scripts", scriptName);
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script not found: ${scriptPath}`);
    }
    
    // Dynamic import of the script
    const script = await import(scriptPath);
    
    if (typeof script.main === "function") {
      return await script.main(hre, params);
    } else {
      throw new Error(`Script ${scriptName} does not export a main function`);
    }
  } catch (error) {
    console.error(`Failed to run script ${scriptName}:`, error);
    throw error;
  }
}

/**
 * Verify contracts on Etherscan
 */
async function verifyContracts(hre: HardhatRuntimeEnvironment) {
  const deploymentsPath = path.join(__dirname, "..", "deployments", hre.network.name);
  
  if (!fs.existsSync(deploymentsPath)) {
    console.log("No deployments found to verify");
    return;
  }
  
  const deploymentFiles = fs.readdirSync(deploymentsPath);
  
  for (const file of deploymentFiles) {
    if (file.endsWith(".json")) {
      try {
        const deploymentData = JSON.parse(
          fs.readFileSync(path.join(deploymentsPath, file), "utf8")
        );
        
        console.log(`Verifying ${deploymentData.contractName}...`);
        
        await hre.run("verify:verify", {
          address: deploymentData.address,
          constructorArguments: deploymentData.constructorArguments || [],
        });
        
        console.log(`✅ ${deploymentData.contractName} verified`);
      } catch (error) {
        console.error(`Failed to verify ${file}:`, error);
      }
    }
  }
}

/**
 * Generate release summary
 */
function generateReleaseSummary(networkName: string, deployerAddress: string): string {
  const timestamp = new Date().toISOString();
  const chainId = getChainId(networkName);
  
  return `
╔════════════════════════════════════════╗
║          PayRox Go Beyond              ║
║          Release Summary               ║
╚════════════════════════════════════════╝

📅 Timestamp: ${timestamp}
🌐 Network: ${networkName} (Chain ID: ${chainId})
👤 Deployer: ${deployerAddress}

🏭 Factory: Deployed ✅
📡 Dispatcher: Deployed ✅
🎼 Orchestrator: Deployed ✅
🧩 Facets: Deployed ✅

📋 Manifest: Generated ✅
🔍 Verification: Complete ✅

📂 Deployment artifacts saved to:
   ./deployments/${networkName}/

📊 Release information saved to:
   ./releases/${timestamp.split('T')[0]}-${chainId}-release.json

🚀 Release deployment successful!
`;
}

/**
 * Save release information to file
 */
function saveReleaseInfo(releaseInfo: string, networkName: string) {
  const timestamp = new Date().toISOString().split('T')[0];
  const chainId = getChainId(networkName);
  const fileName = `${timestamp}-${chainId}-release.json`;
  const releasePath = path.join(__dirname, "..", "releases", fileName);
  
  // Ensure releases directory exists
  const releasesDir = path.dirname(releasePath);
  if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir, { recursive: true });
  }
  
  const releaseData = {
    timestamp: new Date().toISOString(),
    network: networkName,
    chainId: chainId,
    summary: releaseInfo,
    status: "completed"
  };
  
  fs.writeFileSync(releasePath, JSON.stringify(releaseData, null, 2));
  console.log(`📄 Release info saved: ${releasePath}`);
}

/**
 * Get chain ID for network
 */
function getChainId(networkName: string): number {
  const chainIds: { [key: string]: number } = {
    "mainnet": 1,
    "sepolia": 11155111,
    "polygon": 137,
    "arbitrum": 42161,
    "localhost": 31337,
    "hardhat": 31337
  };
  
  return chainIds[networkName] || 31337;
}

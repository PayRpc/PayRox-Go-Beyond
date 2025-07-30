import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Deploying staged chunks via DeterministicChunkFactory...");

  // Get the factory contract
  const factoryAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const factory = await ethers.getContractAt("DeterministicChunkFactory", factoryAddress);
  
  // Load staged chunks
  const stagedChunksPath = path.join(__dirname, "..", "manifests", "staged-chunks.json");
  const stagedChunks = JSON.parse(fs.readFileSync(stagedChunksPath, "utf8"));
  
  console.log(`  ✓ Found ${stagedChunks.length} staged chunks`);

  // Deploy each chunk
  for (const chunk of stagedChunks) {
    console.log(`\n📦 Deploying chunk: ${chunk.name}`);
    console.log(`  Target address: ${chunk.predictedAddress}`);
    
    // Check if already deployed by looking for actual deployed address from factory events
    try {
      // Query factory events to find if this chunk was already deployed
      const filter = factory.filters.ChunkDeployed();
      const events = await factory.queryFilter(filter);
      
      let actualAddress = null;
      for (const event of events) {
        if ('args' in event) {
          const chunkHash = event.args.hash;
          if (chunkHash === chunk.hash) {
            actualAddress = event.args.chunk;
            break;
          }
        }
      }
      
      if (actualAddress) {
        console.log(`  ✅ Already deployed at: ${actualAddress}`);
        chunk.actualAddress = actualAddress; // Update with real address
        continue;
      }
    } catch (error) {
      console.log("  ⚠️  Could not check existing deployments, proceeding...");
    }

    // Deploy via factory (with required fee)
    try {
      const baseFeeWei = ethers.parseEther("0.001"); // 0.001 ETH fee
      const tx = await factory.stage(chunk.bytecode, { value: baseFeeWei });
      const receipt = await tx.wait();
      
      console.log(`  ✅ Deployed successfully!`);
      console.log(`  📧 Transaction: ${receipt.hash}`);
      console.log(`  ⛽ Gas used: ${receipt.gasUsed}`);
      console.log(`  💰 Fee paid: ${ethers.formatEther(baseFeeWei)} ETH`);
      
      // Verify deployment
      const deployedCode = await ethers.provider.getCode(chunk.predictedAddress);
      if (deployedCode === "0x") {
        throw new Error("Deployment failed - no code at predicted address");
      }
      
      console.log(`  🔍 Verification: ${deployedCode.length / 2 - 1} bytes deployed`);
      
    } catch (error) {
      console.error(`  ❌ Failed to deploy ${chunk.name}:`, error);
      throw error;
    }
  }

  console.log("\n🎉 All chunks deployed successfully via manifest system!");
  
  // Update deployment records
  await updateDeploymentRecords(stagedChunks);
  
  return stagedChunks;
}

async function updateDeploymentRecords(stagedChunks: any[]) {
  const deploymentsDir = path.join(__dirname, "..", "deployments", "localhost");
  
  for (const chunk of stagedChunks) {
    const deploymentRecord = {
      contractName: chunk.name,
      address: chunk.predictedAddress,
      deployer: "DeterministicChunkFactory",
      network: "localhost",
      timestamp: new Date().toISOString(),
      deploymentMethod: "manifest-staged",
      salt: chunk.salt,
      bytecodeHash: chunk.hash,
      selectorsCount: chunk.selectorsCount
    };
    
    const filename = chunk.name.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '') + ".json";
    const deploymentFile = path.join(deploymentsDir, filename);
    
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentRecord, null, 2));
    console.log(`  💾 Updated deployment record: ${filename}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

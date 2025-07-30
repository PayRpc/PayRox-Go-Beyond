import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🔗 Step 1: Committing manifest root to dispatcher...");

  // Load merkle data
  const merklePath = path.join(__dirname, "../manifests/current.merkle.json");
  const merkleData = JSON.parse(fs.readFileSync(merklePath, "utf8"));

  console.log("🌳 Merkle root:", merkleData.root);

  // Connect to the dispatcher
  const dispatcherAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const dispatcher = await ethers.getContractAt("ManifestDispatcher", dispatcherAddress);

  console.log("📡 Connected to dispatcher at:", dispatcherAddress);

  // Step 1: Commit the merkle root (epoch 1 to replace the old pending root)
  console.log("\n1️⃣ Committing updated merkle root (replacing old pending)...");
  
  try {
    const commitTx = await dispatcher.commitRoot(merkleData.root, 1);
    console.log("⏳ Transaction submitted:", commitTx.hash);
    
    const commitReceipt = await commitTx.wait();
    console.log("✅ Merkle root committed. Gas used:", commitReceipt?.gasUsed.toString());
    
    // Check updated state
    const pendingRoot = await dispatcher.pendingRoot();
    const pendingEpoch = await dispatcher.pendingEpoch();
    
    console.log("Updated state:");
    console.log("  Pending root:", pendingRoot);
    console.log("  Pending epoch:", pendingEpoch.toString());
    
  } catch (error) {
    console.error("❌ Error committing root:", error instanceof Error ? error.message : String(error));
    throw error;
  }

  console.log("\n🎉 Root commitment successful!");
  console.log("📝 Next step: Apply individual routes with merkle proofs");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🔗 Testing dispatcher connectivity...");

  // Load merkle data
  const merklePath = path.join(__dirname, "../manifests/current.merkle.json");
  const merkleData = JSON.parse(fs.readFileSync(merklePath, "utf8"));

  // Connect to the dispatcher
  const dispatcherAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const dispatcher = await ethers.getContractAt("ManifestDispatcher", dispatcherAddress);

  console.log("📡 Connected to dispatcher at:", dispatcherAddress);
  
  // Check current state
  const activeEpoch = await dispatcher.activeEpoch();
  const pendingEpoch = await dispatcher.pendingEpoch();
  const activeRoot = await dispatcher.activeRoot();
  const pendingRoot = await dispatcher.pendingRoot();
  
  console.log("Current state:");
  console.log("  Active epoch:", activeEpoch.toString());
  console.log("  Pending epoch:", pendingEpoch.toString());
  console.log("  Active root:", activeRoot);
  console.log("  Pending root:", pendingRoot);
  
  console.log("\n✅ Dispatcher connectivity test complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

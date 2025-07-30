// ⚠️  DEPRECATED: Use manifest-based deployment instead
// This script bypasses the PayRox Go Beyond deterministic deployment system
// 
// Proper deployment flow:
// 1. npm run build-manifest
// 2. npm run stage-chunks  
// 3. npm run deploy-via-manifest
//
// See: scripts/deploy-via-manifest.ts

import { ethers } from "hardhat";

async function main() {
  console.log("⚠️  WARNING: This script bypasses the manifest system!");
  console.log("🎯 Use the proper manifest-based deployment instead:");
  console.log("   1. npx hardhat run scripts/build-manifest.ts --network localhost");
  console.log("   2. npx hardhat run scripts/stage-chunks.ts --network localhost");
  console.log("   3. npx hardhat run scripts/deploy-via-manifest.ts --network localhost");
  console.log("");
  console.log("❌ Aborting direct deployment...");
  
  throw new Error("Use manifest-based deployment for ExampleFacetB");
}

// Handle both direct execution and module import
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

export { main };

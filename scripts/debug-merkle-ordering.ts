import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🔍 Debugging merkle leaf ordering...");

  // Load the current manifest and merkle data
  const manifestPath = path.join(__dirname, "../manifests/current.manifest.json");
  const merklePath = path.join(__dirname, "../manifests/current.merkle.json");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const merkleData = JSON.parse(fs.readFileSync(merklePath, "utf8"));

  console.log("📋 Routes in manifest:", manifest.routes.length);
  console.log("🌳 Leaves in merkle:", merkleData.leaves.length);

  // Calculate expected leaf for each route and find its index in the merkle tree
  const coder = ethers.AbiCoder.defaultAbiCoder();
  
  console.log("\n🔍 Mapping routes to leaf indices:");
  
  for (let i = 0; i < Math.min(5, manifest.routes.length); i++) {
    const route = manifest.routes[i];
    
    const expectedLeaf = ethers.keccak256(
      coder.encode(["bytes4", "address", "bytes32"], [route.selector, route.facet, route.codehash])
    );
    
    const leafIndex = merkleData.leaves.indexOf(expectedLeaf);
    
    console.log(`Route ${i}:`);
    console.log(`  Selector: ${route.selector}`);
    console.log(`  Expected leaf: ${expectedLeaf}`);
    console.log(`  Found at leaf index: ${leafIndex}`);
    console.log(`  Actual leaf: ${leafIndex >= 0 ? merkleData.leaves[leafIndex] : 'NOT FOUND'}`);
    console.log();
  }

  // Also show the first few leaves to understand the ordering
  console.log("🌿 First 5 merkle leaves:");
  for (let i = 0; i < Math.min(5, merkleData.leaves.length); i++) {
    console.log(`  [${i}]: ${merkleData.leaves[i]}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

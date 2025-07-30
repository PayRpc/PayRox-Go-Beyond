import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Calculate the isRight array for a merkle proof based on leaf index
 */
function calculateIsRight(leafIndex: number, totalLeaves: number): boolean[] {
  const isRight: boolean[] = [];
  let idx = leafIndex;
  let currentLevelSize = totalLeaves;

  while (currentLevelSize > 1) {
    const isLastOdd = currentLevelSize % 2 === 1 && idx === currentLevelSize - 1;
    
    if (isLastOdd) {
      // For odd last element that gets duplicated, it's not right
      isRight.push(false);
    } else {
      // Normal case: if index is even, sibling is on right; if odd, sibling is on left
      isRight.push(idx % 2 === 0);
    }

    idx = Math.floor(idx / 2);
    currentLevelSize = Math.ceil(currentLevelSize / 2);
  }

  return isRight;
}

async function main() {
  console.log("🔗 Step 2: Applying single route test...");

  // Load the current manifest and merkle data
  const manifestPath = path.join(__dirname, "../manifests/current.manifest.json");
  const merklePath = path.join(__dirname, "../manifests/current.merkle.json");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const merkleData = JSON.parse(fs.readFileSync(merklePath, "utf8"));

  console.log("📋 Loaded manifest with", manifest.facets.length, "facets");
  console.log("🌳 Merkle root:", merkleData.root);

  // Connect to the dispatcher
  const dispatcherAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const dispatcher = await ethers.getContractAt("ManifestDispatcher", dispatcherAddress);

  console.log("📡 Connected to dispatcher at:", dispatcherAddress);

  // Get the first route for testing and find its leaf index
  const firstRoute = manifest.routes[0];
  
  console.log("\n🧪 Testing with first route:");
  console.log("  Selector:", firstRoute.selector);
  console.log("  Facet:", firstRoute.facet);
  console.log("  Codehash:", firstRoute.codehash);

  // Calculate the expected leaf and find its index in the sorted merkle tree
  const coder = ethers.AbiCoder.defaultAbiCoder();
  const expectedLeaf = ethers.keccak256(
    coder.encode(["bytes4", "address", "bytes32"], [firstRoute.selector, firstRoute.facet, firstRoute.codehash])
  );
  const leafIndex = merkleData.leaves.indexOf(expectedLeaf);
  
  if (leafIndex === -1) {
    throw new Error("Route leaf not found in merkle tree!");
  }

  const totalLeaves = merkleData.leaves.length;
  const proof = merkleData.proofs[leafIndex];
  const isRight = calculateIsRight(leafIndex, totalLeaves);
  
  console.log("  Expected leaf:", expectedLeaf);
  console.log("  Leaf index:", leafIndex);
  console.log("  Total leaves:", totalLeaves);
  console.log("  Proof length:", proof.length);
  console.log("  IsRight array:", isRight);

  try {
    console.log("\n⚡ Applying single route...");
    const applyTx = await dispatcher.applyRoutes(
      [firstRoute.selector],  // selectors
      [firstRoute.facet],     // facets
      [firstRoute.codehash],  // codehashes
      [proof],               // proofs
      [isRight]              // isRight arrays
    );
    
    console.log("⏳ Transaction submitted:", applyTx.hash);
    const applyReceipt = await applyTx.wait();
    console.log("✅ Route applied! Gas used:", applyReceipt?.gasUsed.toString());
    
    // Verify the route was set
    const route = await dispatcher.routes(firstRoute.selector);
    console.log("✅ Route verified:");
    console.log("  Facet:", route.facet);
    console.log("  Codehash:", route.codehash);
    
  } catch (error) {
    console.error("❌ Error applying route:", error instanceof Error ? error.message : String(error));
    
    // Let's debug the leaf calculation
    const coder = ethers.AbiCoder.defaultAbiCoder();
    const expectedLeaf = ethers.keccak256(
      coder.encode(["bytes4", "address", "bytes32"], [firstRoute.selector, firstRoute.facet, firstRoute.codehash])
    );
    const actualLeaf = merkleData.leaves[leafIndex];
    
    console.log("\n🔍 Debug info:");
    console.log("  Expected leaf:", expectedLeaf);
    console.log("  Actual leaf:  ", actualLeaf);
    console.log("  Leaves match:", expectedLeaf === actualLeaf);
    
    throw error;
  }

  console.log("\n🎉 Single route application successful!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

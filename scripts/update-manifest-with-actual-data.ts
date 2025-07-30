import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🔄 Updating manifest with actual deployment data...");

  // Actual deployed addresses from our testing
  const actualAddresses = {
    factory: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    dispatcher: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    facetA: "0x5559b2606FeBa7bd5121757FD7F5E6351f294b47",
    facetB: "0xf55dF1aBE3Fd06f7a4028480A16e1ca842D682BF"
  };

  // Load current manifest
  const manifestPath = path.join(__dirname, "../manifests/current.manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  console.log("📋 Original manifest:");
  console.log("  FacetA predicted:", manifest.facets[0].address);
  console.log("  FacetB predicted:", manifest.facets[1].address);

  // Get actual runtime codehashes
  const facetACode = await ethers.provider.getCode(actualAddresses.facetA);
  const facetBCode = await ethers.provider.getCode(actualAddresses.facetB);
  const facetACodehash = ethers.keccak256(facetACode);
  const facetBCodehash = ethers.keccak256(facetBCode);

  console.log("\n🔍 Actual deployment data:");
  console.log("  FacetA actual:   ", actualAddresses.facetA);
  console.log("  FacetB actual:   ", actualAddresses.facetB);
  console.log("  FacetA codehash: ", facetACodehash);
  console.log("  FacetB codehash: ", facetBCodehash);

  // Update facet addresses and codehashes
  manifest.facets[0].address = actualAddresses.facetA;
  manifest.facets[1].address = actualAddresses.facetB;
  manifest.facets[0].bytecodeHash = facetACodehash;
  manifest.facets[1].bytecodeHash = facetBCodehash;

  // Update routes with actual addresses and codehashes
  for (const route of manifest.routes) {
    if (route.facet === "0x893779B6cDcD5FbA62c072e49a38d5901Ed7Bef4") {
      // This was FacetA predicted address, update to actual
      route.facet = actualAddresses.facetA;
      route.codehash = facetACodehash;
    } else if (route.facet === "0x7D9523612fa13981cD9a2A9b1E85713984FE9c12") {
      // This was FacetB predicted address, update to actual
      route.facet = actualAddresses.facetB;
      route.codehash = facetBCodehash;
    }
  }

  // Rebuild merkle tree with updated routes
  console.log("\n🌳 Rebuilding merkle tree...");
  
  // Build new merkle tree (copied from build-manifest.ts)
  const { root, leaves, proofs } = buildMerkleOverRoutes(manifest.routes, ethers);
  
  manifest.merkleRoot = root;

  // Update manifest timestamp
  manifest.timestamp = new Date().toISOString();

  // Save updated manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("💾 Updated manifest saved");

  // Save updated merkle data
  const merklePath = path.join(__dirname, "../manifests/current.merkle.json");
  fs.writeFileSync(merklePath, JSON.stringify({
    root,
    leaves,
    proofs
  }, null, 2));
  console.log("💾 Updated merkle data saved");

  console.log("\n✅ Manifest updated with actual deployment data!");
  console.log("   New merkle root:", root);
  console.log("   Routes updated:", manifest.routes.length);
}

/**
 * Build merkle tree (simplified version from build-manifest.ts)
 */
function buildMerkleOverRoutes(routes: any[], ethers: any) {
  const coder = ethers.AbiCoder.defaultAbiCoder();

  // Build leaves from routes
  const leaves = routes.map((r) =>
    ethers.keccak256(
      coder.encode(["bytes4", "address", "bytes32"], [r.selector, r.facet, r.codehash])
    )
  );

  // Sort leaves for determinism
  leaves.sort((a, b) => a.localeCompare(b));

  const tree: string[][] = [];
  tree.push(leaves.slice());

  let current = leaves.slice();
  while (current.length > 1) {
    const next: string[] = [];

    for (let i = 0; i < current.length; i += 2) {
      const a = current[i];
      const b = i + 1 < current.length ? current[i + 1] : current[i]; // duplicate odd
      next.push(ethers.keccak256(ethers.concat([a, b])));
    }

    tree.push(next);
    current = next;
  }

  const root = current[0] ?? ethers.ZeroHash;

  // Generate proofs for each leaf
  const proofs: string[][] = [];
  for (let i = 0; i < leaves.length; i++) {
    const proof: string[] = [];
    let idx = i;

    for (let level = 0; level < tree.length - 1; level++) {
      const levelNodes = tree[level];
      const isLastOdd = levelNodes.length % 2 === 1 && idx === levelNodes.length - 1;
      const siblingIndex = isLastOdd ? idx : (idx ^ 1);
      
      if (siblingIndex < levelNodes.length) {
        proof.push(levelNodes[siblingIndex]);
      }

      idx = Math.floor(idx / 2);
    }
    proofs[i] = proof;
  }

  return { root, tree, leaves, proofs };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

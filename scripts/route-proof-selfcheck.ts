import { ethers } from "hardhat";
import { readFileSync } from "fs";
import { join } from "path";
import { MerkleTree } from "merkletreejs";
import { keccak256 } from "ethers";

/**
 * Route Proof Self-Check
 * Verifies manifest Merkle proofs against computed leaves
 */

interface ManifestEntry {
  selector: string;
  facet: string;
  codehash: string;
}

interface Manifest {
  routes?: ManifestEntry[];
  merkleRoot?: string;
  proofs?: { [selector: string]: string[] };
  selectors?: any; // For backward compatibility
}

function computeLeaf(selector: string, facet: string, codehash: string): string {
  // Compute leaf: keccak256(abi.encode(selector, facet, codehash))
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes4", "address", "bytes32"],
    [selector, facet, codehash]
  );
  return keccak256(encoded);
}

function buildMerkleTree(leaves: string[]): MerkleTree {
  // Use ordered-pair hashing (no internal sorting)
  return new MerkleTree(leaves, keccak256, { 
    sortPairs: false,  // Preserve order for OpenZeppelin compatibility
    hashLeaves: false  // Leaves already hashed
  });
}

async function main() {
  console.log("🔍 Starting Route Proof Self-Check...");

  // Load manifest with configurable path
  const manifestPath = process.env.MANIFEST_PATH || join(__dirname, "../manifests/current.manifest.json");
  console.log(`📁 Loading manifest from: ${manifestPath}`);
  
  let manifest: Manifest;
  
  try {
    const manifestData = readFileSync(manifestPath, "utf8");
    manifest = JSON.parse(manifestData);
  } catch (error) {
    console.error("❌ Failed to load manifest:", error);
    process.exit(1);
  }

  // Check if this is a routes-based manifest or legacy format
  if (!manifest.routes || manifest.routes.length === 0) {
    if (Object.keys(manifest.selectors || {}).length === 0) {
      console.error("❌ No routes found. Build a manifest before running self-check.");
      console.error("💡 Try: npx hardhat run scripts/create-smoke-manifest.ts");
      process.exit(1);
    }
    
    // Convert legacy format if needed
    console.log("📋 Converting legacy manifest format...");
    manifest.routes = [];
    // Legacy conversion logic would go here if needed
  }

  console.log(`📋 Loaded manifest with ${manifest.routes.length} routes`);

  if (manifest.routes.length === 0) {
    console.error("❌ No routes found. Build a manifest before running self-check.");
    console.error("💡 Try: npx hardhat run scripts/create-smoke-manifest.ts");
    process.exit(1);
  }

  // Compute leaves from manifest entries
  const leaves = manifest.routes.map(route => 
    computeLeaf(route.selector, route.facet, route.codehash)
  );

  console.log("🌳 Building Merkle tree from computed leaves...");

  // Build Merkle tree (ordered pairs)
  const tree = buildMerkleTree(leaves);
  const computedRoot = tree.getHexRoot();

  console.log(`📊 Computed root: ${computedRoot}`);
  console.log(`📊 Manifest root: ${manifest.merkleRoot || "not set"}`);

  // If no merkle root is set, this is likely a template
  if (!manifest.merkleRoot) {
    console.log("⚠️  No Merkle root found in manifest - this is likely a template");
    console.log("✅ Route Proof Self-Check completed (no root to verify against)");
    return;
  }

  // Verify root matches
  if (computedRoot !== manifest.merkleRoot) {
    console.error("❌ Merkle root mismatch!");
    console.error(`  Expected: ${manifest.merkleRoot}`);
    console.error(`  Computed: ${computedRoot}`);
    process.exit(1);
  }

  console.log("✅ Merkle root matches computed value");

  // Verify each proof if proofs are available
  if (!manifest.proofs) {
    console.log("⚠️  No proofs found in manifest - verification limited to root check");
    console.log("✅ Route Proof Self-Check completed");
    return;
  }

  let allProofsValid = true;
  
  for (let i = 0; i < manifest.routes.length; i++) {
    const route = manifest.routes[i];
    const leaf = leaves[i];
    const proof = manifest.proofs[route.selector];

    if (!proof) {
      console.error(`❌ No proof found for selector ${route.selector}`);
      allProofsValid = false;
      continue;
    }

    // For empty tree or single leaf, proof verification is different
    if (leaves.length === 1 && proof.length === 0) {
      if (leaf === manifest.merkleRoot) {
        console.log(`✅ Valid proof for selector ${route.selector} (single leaf)`);
        continue;
      }
    }

    // Verify proof using manual verification
    let computedHash = leaf;
    
    // For ordered-pair Merkle trees, we need to know the position of our leaf
    // to correctly reconstruct the parent hash
    const leafIndex = leaves.indexOf(leaf);
    
    for (let i = 0; i < proof.length; i++) {
      const proofElement = proof[i];
      
      // Determine if we're the left or right child at this level
      const isRightChild = (leafIndex >> i) & 1;
      
      if (isRightChild) {
        // We're the right child, proof element is left sibling
        computedHash = keccak256(ethers.concat([proofElement, computedHash]));
      } else {
        // We're the left child, proof element is right sibling  
        computedHash = keccak256(ethers.concat([computedHash, proofElement]));
      }
    }

    const isValid = computedHash === manifest.merkleRoot;
    
    if (!isValid) {
      console.error(`❌ Invalid proof for selector ${route.selector}`);
      console.error(`  📄 Facet: ${route.facet}`);
      console.error(`  🔍 Code Hash: ${route.codehash}`);
      console.error(`  🍃 Leaf: ${leaf}`);
      console.error(`  📋 Proof: [${proof.join(", ")}]`);
      console.error(`  🧮 Computed: ${computedHash}`);
      console.error(`  🎯 Expected: ${manifest.merkleRoot}`);
      allProofsValid = false;
    } else {
      console.log(`✅ Valid proof for selector ${route.selector}`);
      console.log(`  📄 Facet: ${route.facet}`);
      console.log(`  🔍 Code Hash: ${route.codehash.slice(0, 10)}...`);
      console.log(`  📊 Proof elements: ${proof.length}`);
    }
  }

  if (!allProofsValid) {
    console.error("❌ Some proofs are invalid");
    process.exit(1);
  }

  console.log("🎯 All route proofs verified successfully!");
  console.log("✅ Route Proof Self-Check completed");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Route proof self-check failed:", error);
    process.exit(1);
  });
}

export { main as routeProofSelfCheck };

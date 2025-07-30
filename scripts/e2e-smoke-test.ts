import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * End-to-End Smoke Test: Deploy PingFacet and create proper manifest
 */
async function main() {
  console.log("🧪 Starting end-to-end smoke test...");

  // 1) Deploy the PingFacet
  console.log("📦 Deploying PingFacet...");
  const [deployer] = await ethers.getSigners();
  const PingFacet = await ethers.getContractFactory("PingFacet");
  const facet = await PingFacet.deploy();
  await facet.waitForDeployment();
  
  const facetAddress = await facet.getAddress();
  console.log(`  ✅ PingFacet deployed at: ${facetAddress}`);

  // 2) Compute EXTCODEHASH(facet)
  console.log("🔍 Computing EXTCODEHASH...");
  const code = await ethers.provider.getCode(facetAddress);
  const codehash = ethers.keccak256(code);
  console.log(`  🔍 Code hash: ${codehash}`);

  // 3) Compute the function selector
  console.log("🎯 Computing function selectors...");
  const pingSelector = ethers.id("ping()").slice(0, 10);
  const echoSelector = ethers.id("echo(bytes32)").slice(0, 10);
  console.log(`  🎯 ping() selector: ${pingSelector}`);
  console.log(`  🎯 echo(bytes32) selector: ${echoSelector}`);

  // 4) Build Merkle leaves for both functions
  console.log("🌳 Building Merkle tree...");
  const coder = ethers.AbiCoder.defaultAbiCoder();
  
  const routes = [
    { selector: pingSelector, facet: facetAddress, codehash },
    { selector: echoSelector, facet: facetAddress, codehash }
  ];

  const leaves = routes.map(route =>
    ethers.keccak256(
      coder.encode(["bytes4", "address", "bytes32"], [route.selector, route.facet, route.codehash])
    )
  );

  console.log(`  🍃 Leaves: [${leaves.join(", ")}]`);

  // For 2 leaves, ordered-pair root = keccak256(concat(leaf0, leaf1))
  const root = ethers.keccak256(ethers.concat([leaves[0], leaves[1]]));
  console.log(`  🌳 Root: ${root}`);

  // 5) Create proper manifest structure
  console.log("📄 Creating manifest...");
  const network = await ethers.provider.getNetwork();
  
  const manifest = {
    version: "1.0.0-e2e",
    timestamp: new Date().toISOString(),
    merkleRoot: root,
    network: {
      name: "hardhat", 
      chainId: Number(network.chainId)
    },
    routes: routes,
    proofs: {
      // For leaf0 (ping), the proof is leaf1 (echo) - to get root = keccak256(leaf0 || leaf1)
      [pingSelector]: [leaves[1]], 
      // For leaf1 (echo), the proof is leaf0 (ping) - to get root = keccak256(leaf0 || leaf1) 
      // But since we're at position 1, we need to compute keccak256(leaf0 || leaf1) where leaf0 is the proof
      [echoSelector]: [leaves[0]]
    },
    deployment: {
      facetAddress,
      deployer: deployer.address,
      blockNumber: await ethers.provider.getBlockNumber()
    }
  };

  // 6) Save manifest
  const manifestsDir = path.join(__dirname, "..", "manifests");
  if (!fs.existsSync(manifestsDir)) {
    fs.mkdirSync(manifestsDir, { recursive: true });
  }

  const manifestPath = path.join(manifestsDir, "e2e-test.manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  
  console.log(`  💾 Manifest saved: ${manifestPath}`);
  console.log("✅ End-to-end smoke test setup completed!");
  
  return {
    facetAddress,
    codehash,
    root,
    manifestPath: "manifests/e2e-test.manifest.json"
  };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { main };

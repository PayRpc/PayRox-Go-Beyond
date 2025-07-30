import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  // ENV overrides (optional):
  // - FACET_ADDRESS: use an existing facet instead of deploying
  // - FN_SIG:        function signature to route (default "ping()")
  // - MANIFEST_PATH: output file (default "manifests/manifest.smoke.json")
  const FACET_ADDRESS = process.env.FACET_ADDRESS?.toLowerCase();
  const FN_SIG = process.env.FN_SIG ?? "ping()";
  const OUT = process.env.MANIFEST_PATH ?? "manifests/manifest.smoke.json";

  console.log("🧪 Creating smoke test manifest...");
  console.log(`  📋 Function signature: ${FN_SIG}`);
  console.log(`  📄 Output path: ${OUT}`);

  let facetAddr: string;

  if (FACET_ADDRESS) {
    facetAddr = FACET_ADDRESS;
    console.log(`  📦 Using existing facet: ${facetAddr}`);
  } else {
    console.log("  📦 Deploying PingFacet...");
    const Facet = await ethers.getContractFactory("PingFacet");
    const facet = await Facet.deploy();
    await facet.waitForDeployment();
    facetAddr = await facet.getAddress();
    console.log(`  ✅ Deployed facet at: ${facetAddr}`);
  }

  // EXTCODEHASH == keccak256(runtime code). Hardhat doesn't expose extcodehash RPC,
  // so compute it locally from the runtime code bytes.
  console.log("  🔍 Computing EXTCODEHASH...");
  const runtimeCode = await ethers.provider.getCode(facetAddr);
  const codehash = ethers.keccak256(runtimeCode);

  // Function selector (first 4 bytes of keccak256(signature))
  console.log("  🎯 Computing function selector...");
  const selector = ethers.id(FN_SIG).slice(0, 10); // First 4 bytes = 8 hex chars + 0x

  // Leaf = keccak256(abi.encode(selector, facet, codehash))
  console.log("  🌳 Building Merkle leaf...");
  const leaf = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes4", "address", "bytes32"],
      [selector, facetAddr, codehash]
    )
  );

  // With a single route, root == leaf
  const [signer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();

  const manifest = {
    header: {
      version: `smoke-${Date.now()}`,
      timestamp: Math.floor(Date.now() / 1000),
      deployer: signer.address,
      chainId: Number(net.chainId),
      previousHash: "0x" + "0".repeat(64),
    },
    routes: [
      {
        selector,
        facet: facetAddr,
        codehash,
      },
    ],
    merkleRoot: leaf, // Use merkleRoot field that the self-check script expects
    root: leaf,       // Also include root for compatibility
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2));
  
  console.log(`  💾 Wrote ${OUT}`);
  console.log("");
  console.log("📊 Manifest Details:");
  console.log(`  🎯 Selector: ${selector}`);
  console.log(`  📦 Facet   : ${facetAddr}`);
  console.log(`  � Codehash: ${codehash}`);
  console.log(`  🌳 Root    : ${manifest.root}`);
  console.log("");
  console.log("✅ Smoke test manifest created successfully!");
  console.log("");
  console.log("🧪 Next steps:");
  console.log(`  💡 Test verification: $env:MANIFEST_PATH="${OUT}"; npx hardhat run scripts/route-proof-selfcheck.ts --network hardhat`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error("❌ Error creating smoke manifest:", e);
    process.exit(1);
  });
}

export { main };

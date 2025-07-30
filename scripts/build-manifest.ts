import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

/**
 * Build a manifest & Merkle tree compatible with ManifestDispatcher:
 * leaf = keccak256(abi.encode(bytes4 selector, address facet, bytes32 codehash))
 * Uses ordered-pair hashing for OpenZeppelin MerkleProof compatibility.
 */

/** Ordered pair hash (preserves left/right order for OpenZeppelin MerkleProof compatibility) */
function pairHash(a: string, b: string, ethers: any): string {
  return ethers.keccak256(ethers.concat([a, b]));
}
export async function main(hre: HardhatRuntimeEnvironment) {
  const { ethers, artifacts, network } = hre;

  console.log("📦 Building deployment manifest for network:", network.name);

  // 1) Load configs + factory address
  const release = await loadReleaseConfig();
  const chainId = (await ethers.provider.getNetwork()).chainId.toString();
  const factory = await resolveFactoryAddress(chainId);

  // 2) Build facet entries: codehash (runtime), creation bytecode, salt, predicted address
  const facets = await buildFacetEntries(release, artifacts, ethers, factory);

  // 3) Build route list: (selector, facetAddress, codehash)
  const routes = buildRoutesFromConfig(release, facets);

  // 4) Build Merkle tree over routes (sorted-pair hashing)
  const { root, leaves, proofs, tree } = buildMerkleOverRoutes(routes, ethers);

  // 5) Compose manifest object
  const manifest = {
    version: release.version,
    timestamp: new Date().toISOString(),
    description: release.description ?? "",
    network: { name: network.name, chainId },
    factory,
    facets: facets.map((f) => ({
      name: f.name,
      contract: f.contract,
      address: f.predictedAddress,
      salt: f.salt,
      bytecodeHash: f.runtimeHash,
      bytecodeSize: f.runtimeSize,
      selectors: f.selectors, // list of bytes4 strings
      priority: f.priority ?? 0,
      gasLimit: f.gasLimit ?? null,
    })),
    routes: routes.map((r) => ({
      selector: r.selector,
      facet: r.facet,
      codehash: r.codehash,
    })),
    merkleRoot: root,
  };

  // 6) Persist all artifacts
  await saveManifestFiles(manifest, { root, leaves, proofs, tree });

  console.log("✅ Manifest built successfully!");
  console.log("   Merkle root:", root);
  return manifest;
}

/* ───────────────────────────── Helpers ───────────────────────────── */

async function loadReleaseConfig() {
  const configPath = path.join(__dirname, "..", "config", "app.release.yaml");
  if (!fs.existsSync(configPath)) throw new Error("Release configuration not found at config/app.release.yaml");
  const config = yaml.load(fs.readFileSync(configPath, "utf8")) as any;
  if (!config?.version || !Array.isArray(config?.facets)) {
    throw new Error("Invalid release configuration (missing version or facets[])");
  }
  console.log(`  ✓ Loaded release config v${config.version}`);
  return config;
}

async function resolveFactoryAddress(chainId: string): Promise<string> {
  // 1) Try deployments/<chainId>/factory.json
  const depPath = path.join(__dirname, "..", "deployments", chainId, "factory.json");
  if (fs.existsSync(depPath)) {
    const { address } = JSON.parse(fs.readFileSync(depPath, "utf8"));
    if (address) {
      console.log(`  ✓ Using factory from deployments: ${address}`);
      return address;
    }
  }

  // 2) Fallback to config/networks.json
  const networksPath = path.join(__dirname, "..", "config", "networks.json");
  if (fs.existsSync(networksPath)) {
    const networks = JSON.parse(fs.readFileSync(networksPath, "utf8"));
    const found = networks?.[chainId]?.factory;
    if (found) {
      console.log(`  ✓ Using factory from networks.json: ${found}`);
      return found;
    }
  }

  throw new Error(`Factory address not found for chainId=${chainId}. Add deployments/${chainId}/factory.json or config/networks.json.`);
}

type FacetEntry = {
  name: string;
  contract: string;
  creation: string;         // creation bytecode (0x…)
  runtime: string;          // deployed bytecode (0x…)
  runtimeHash: string;      // keccak256(runtime)
  runtimeSize: number;      // bytes
  salt: string;             // 0x…
  predictedAddress: string; // CREATE2(factory, salt, keccak256(creation))
  selectors: string[];      // bytes4 strings
  priority?: number;
  gasLimit?: number;
};

/**
 * Build facet entries and predicted addresses deterministically:
 * salt = keccak256(runtime) unless a salt is provided in release.deployment[facetName].salt
 */
async function buildFacetEntries(release: any, artifacts: any, ethers: any, factory: string): Promise<FacetEntry[]> {
  const coder = ethers.AbiCoder.defaultAbiCoder();
  const out: FacetEntry[] = [];

  for (const facetCfg of release.facets) {
    console.log(`Processing facet: ${facetCfg.name} (${facetCfg.contract})`);
    
    const artifact = await artifacts.readArtifact(facetCfg.contract);
    
    if (!artifact) {
      throw new Error(`Failed to load artifact for ${facetCfg.contract}`);
    }
    
    if (!artifact.abi) {
      console.warn(`Warning: No ABI found for ${facetCfg.contract}`);
    }

    const creation = normalizeHex(artifact.bytecode);
    const runtime  = normalizeHex(artifact.deployedBytecode);

    if (!runtime || runtime === "0x") {
      throw new Error(`Artifact ${facetCfg.contract} has empty deployedBytecode (is it abstract or an interface?)`);
    }

    const runtimeHash = ethers.keccak256(runtime);
    const runtimeSize = (runtime.length - 2) / 2;

    // Salt: prefer override in release, else deterministic keccak(runtime)
    const releaseSalt = release?.deployment?.[facetCfg.name]?.salt;
    const salt = normalizeHex(releaseSalt ?? ethers.keccak256(runtime));

    // Predicted address (CREATE2)
    const initCodeHash = ethers.keccak256(creation);
    const predictedAddress = getCreate2Address(factory, salt, initCodeHash, ethers);

    // Selectors: prefer explicit list, else derive from ABI (external/public, exclude constructor/fallback/receive)
    const selectors: string[] = Array.isArray(facetCfg.selectors) && facetCfg.selectors.length > 0
      ? facetCfg.selectors.map(normalizeSelector)
      : deriveSelectorsFromAbi(artifact.abi, ethers);

    out.push({
      name: facetCfg.name,
      contract: facetCfg.contract,
      creation,
      runtime,
      runtimeHash,
      runtimeSize,
      salt,
      predictedAddress,
      selectors,
      priority: facetCfg.priority,
      gasLimit: facetCfg.gasLimit,
    });

    console.log(`  📦 Facet ${facetCfg.name}: codehash=${runtimeHash} size=${runtimeSize}B addr=${predictedAddress}`);
    console.log(`    ✓ ${selectors.length} selectors`);
  }

  return out;
}

/**
 * Build route triplets (selector, facet address, codehash) for the dispatcher.
 */
function buildRoutesFromConfig(release: any, facets: FacetEntry[]) {
  const routes: { selector: string; facet: string; codehash: string }[] = [];

  for (const facet of facets) {
    for (const sel of facet.selectors) {
      routes.push({
        selector: normalizeSelector(sel),
        facet: facet.predictedAddress,
        codehash: facet.runtimeHash,
      });
    }
  }

  console.log(`  ✓ Built ${routes.length} routes`);
  return routes;
}

/**
 * Build an ordered-pair Merkle tree over ABI-encoded route leaves:
 * leaf = keccak256(abi.encode(bytes4, address, bytes32))
 * Sibling hashing: keccak256(left || right) - preserves order for OpenZeppelin compatibility
 * Odd node: duplicate last.
 */
function buildMerkleOverRoutes(
  routes: { selector: string; facet: string; codehash: string }[],
  ethers: any
) {
  const coder = ethers.AbiCoder.defaultAbiCoder();

  // Deterministic leaf list
  const leaves = routes.map((r) =>
    ethers.keccak256(
      coder.encode(["bytes4", "address", "bytes32"], [r.selector, r.facet, r.codehash])
    )
  );

  // Optional: sort leaves for determinism (not strictly required, but helpful)
  leaves.sort(lexi);

  const tree: string[][] = [];
  tree.push(leaves.slice());

  let current = leaves.slice();
  while (current.length > 1) {
    const next: string[] = [];

    for (let i = 0; i < current.length; i += 2) {
      const a = current[i];
      const b = i + 1 < current.length ? current[i + 1] : current[i]; // duplicate odd
      // Use ordered-pair hashing (preserves left/right order)
      next.push(pairHash(a, b, ethers));
    }

    tree.push(next);
    current = next;
  }

  const root = current[0] ?? ethers.ZeroHash;

  // Per-leaf proofs (by leaf index)
  const proofs: string[][] = [];
  for (let i = 0; i < leaves.length; i++) {
    proofs[i] = generateOrderedProof(tree, i, ethers);
  }

  return { root, tree, leaves, proofs };
}

/**
 * Generate proof for ordered-pair trees (OpenZeppelin compatible).
 */
function generateOrderedProof(tree: string[][], leafIndex: number, ethers: any): string[] {
  const proof: string[] = [];
  let idx = leafIndex;

  for (let level = 0; level < tree.length - 1; level++) {
    const levelNodes = tree[level];
    const isLastOdd = levelNodes.length % 2 === 1 && idx === levelNodes.length - 1;

    const siblingIndex = isLastOdd ? idx : (idx ^ 1); // if odd dup, sibling is itself; else flip last bit
    if (siblingIndex < levelNodes.length) {
      proof.push(levelNodes[siblingIndex]);
    }

    idx = Math.floor(idx / 2);
  }
  return proof;
}

/* ───────────────────────────── IO ───────────────────────────── */

async function saveManifestFiles(manifest: any, merkle: any) {
  const manifestsDir = path.join(__dirname, "..", "manifests");
  if (!fs.existsSync(manifestsDir)) fs.mkdirSync(manifestsDir, { recursive: true });

  // Manifest
  const manifestPath = path.join(manifestsDir, "current.manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`  💾 Manifest saved: ${manifestPath}`);

  // Merkle meta
  const merklePath = path.join(manifestsDir, "current.merkle.json");
  fs.writeFileSync(merklePath, JSON.stringify({
    root: merkle.root,
    leaves: merkle.leaves,
    proofs: merkle.proofs, // index-aligned with manifest.routes order (after sort, we saved routes independently)
  }, null, 2));
  console.log(`  💾 Merkle data saved: ${merklePath}`);

  // Chunk mapping (content-addressed facets)
  const chunkMap = manifest.facets.reduce((acc: any, f: any) => {
    acc[f.name] = {
      address: f.address,
      salt: f.salt,
      hash: f.bytecodeHash,
      size: f.bytecodeSize,
      gasLimit: f.gasLimit,
    };
    return acc;
  }, {});
  const chunkMapPath = path.join(manifestsDir, "chunks.map.json");
  fs.writeFileSync(chunkMapPath, JSON.stringify(chunkMap, null, 2));
  console.log(`  💾 Chunk mapping saved: ${chunkMapPath}`);
}

/* ───────────────────────────── Utils ───────────────────────────── */

function normalizeHex(x: string): string {
  if (!x) return "0x";
  return x.startsWith("0x") ? x : ("0x" + x);
}

function normalizeSelector(sel: string): string {
  const s = sel.toLowerCase();
  if (!s.startsWith("0x")) return "0x" + s;
  return "0x" + s.slice(2).padStart(8, "0"); // ensure 4 bytes / 8 hex chars after 0x
}

/**
 * Lexicographic compare of 0x‑hex strings.
 */
function lexi(a: string, b: string): number {
  const aa = a.toLowerCase();
  const bb = b.toLowerCase();
  if (aa === bb) return 0;
  return aa < bb ? -1 : 1;
}

/**
 * Ethers v6–safe CREATE2 address derivation.
 */
function getCreate2Address(factory: string, salt: string, initCodeHash: string, ethers: any): string {
  const packed = ethers.concat([
    "0xff",
    factory,
    salt,
    initCodeHash,
  ]);
  const hash = ethers.keccak256(packed);
  return ethers.getAddress("0x" + hash.slice(26)); // last 20 bytes
}

/**
 * Derive selectors from ABI (external/public functions only).
 */
function deriveSelectorsFromAbi(abi: any[], ethers: any): string[] {
  // Check if ABI is valid
  if (!abi || !Array.isArray(abi) || abi.length === 0) {
    console.warn("Warning: ABI is undefined, null, or empty. Returning empty selectors array.");
    return [];
  }

  try {
    const iface = new ethers.Interface(abi);
    const selectors: string[] = [];

    // Use fragments instead of functions for better compatibility
    const fragments = iface.fragments || [];
    const functionFragments = fragments.filter((fragment: any) => fragment.type === 'function');
    
    if (functionFragments.length === 0) {
      console.warn("Warning: No function fragments found in ABI");
      return [];
    }

    for (const fragment of functionFragments) {
      // skip constructors / fallback / receive
      const name = fragment.name ?? "";
      if (!name || name === "constructor") continue;
      
      try {
        // Use getFunction to get the function descriptor, then get its selector
        const func = iface.getFunction(name);
        const sel = func.selector;
        selectors.push(sel);
        console.log(`  Found function: ${name} -> ${sel}`);
      } catch (fnError) {
        console.warn(`Warning: Could not process function ${name}:`, fnError);
        continue;
      }
    }

    // De‑dupe and sort for stability
    return Array.from(new Set(selectors)).sort(lexi);
  } catch (error) {
    console.error("Error processing ABI:", error);
    console.error("ABI content:", JSON.stringify(abi, null, 2));
    throw new Error(`Failed to derive selectors from ABI: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/* ───────────────────────── CLI entrypoint ───────────────────────── */

if (require.main === module) {
  // When run via: npx hardhat run scripts/build-manifest.ts --network <net>
  // Hardhat injects HRE, so the below is only for direct node execution fallback.
  const hre: HardhatRuntimeEnvironment = require("hardhat");
  main(hre)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

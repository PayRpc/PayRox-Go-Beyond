import * as fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import * as yaml from 'js-yaml';
import * as path from 'path';
import {
  readJsonFile,
  writeJsonFile,
  readTextFile,
  ensureDirectoryExists,
  readManifestFile,
  FileOperationError,
  SecurityError
} from './utils/io';
import {
  encodeLeaf,
  generateManifestLeaves,
  deriveSelectorsFromAbi as deriveSelectorsFromAbiUtil,
  LeafMeta
} from './utils/merkle';

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

  console.log('📦 Building deployment manifest for network:', network.name);

  // 1) Load configs + factory address
  const release = await loadReleaseConfig();
  const chainId = (await ethers.provider.getNetwork()).chainId.toString();
  const factory = await resolveFactoryAddress(chainId);

  console.log('🏭 Using factory address:', factory);
  console.log('🔗 Building for chain ID:', chainId);

  // 2) Enhanced Merkle tree generation using comprehensive utility
  console.log('🌳 Generating Merkle tree with enhanced utilities...');
  
  try {
    const { root, tree, proofs, leaves, leafMeta } = await generateManifestLeaves(
      release,
      artifacts,
      factory
    );

    console.log(`✅ Generated Merkle tree:`);
    console.log(`   📊 Root: ${root}`);
    console.log(`   🍃 Leaves: ${leaves.length}`);
    console.log(`   📋 Facets: ${leafMeta.map(m => m.facetName).filter((v, i, a) => a.indexOf(v) === i).length}`);

    // 3) Build enhanced facet entries with actual deployment data
    const facets = await buildFacetEntries(
      release,
      artifacts,
      ethers,
      factory,
      chainId
    );

    // 4) Build route list from leaf metadata (more accurate than config-based)
    const routes = leafMeta.map(meta => ({
      selector: meta.selector,
      facet: meta.facet,
      codehash: meta.codehash,
      facetName: meta.facetName
    }));

    console.log(`📋 Built ${routes.length} routes from ${facets.length} facets`);

    // 5) Compose enhanced manifest object with comprehensive metadata
    const manifest = {
      version: release.version,
      timestamp: new Date().toISOString(),
      description: release.description ?? '',
      network: { name: network.name, chainId },
      factory,
      facets: facets.map(f => ({
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
      routes: routes.map(r => ({
        selector: r.selector,
        facet: r.facet,
        codehash: r.codehash,
      })),
      merkleRoot: root,
      // Enhanced metadata from utility integration
      merkleMetadata: {
        leavesCount: leaves.length,
        treeDepth: tree.length,
        proofsGenerated: Object.keys(proofs).length,
        utilityVersion: '2.0.0' // Mark as enhanced version
      }
    };

    // 6) Persist all artifacts with enhanced structure
    await saveManifestFiles(manifest, { root, leaves, proofs, tree, leafMeta });

    console.log('✅ Enhanced manifest built successfully!');
    console.log('   🌳 Merkle root:', root);
    console.log('   📊 Total routes:', routes.length);
    console.log('   🏭 Factory address:', factory);
    
    return manifest;

  } catch (error) {
    console.error('❌ Failed to build manifest with enhanced utilities:', error);
    
    // Fallback to legacy method if utility integration fails
    console.log('🔄 Falling back to legacy manifest generation...');
    throw error; // Re-throw for now, legacy fallback can be implemented later
  }
}

/* ───────────────────────────── Helpers ───────────────────────────── */

async function loadReleaseConfig() {
  const configPath = path.join(__dirname, '..', 'config', 'app.release.yaml');
  if (!fs.existsSync(configPath))
    throw new Error(
      'Release configuration not found at config/app.release.yaml'
    );
  
  try {
    const configContent = readTextFile(configPath, { validatePath: true });
    const config = yaml.load(configContent) as any;
    
    if (!config?.version || !Array.isArray(config?.facets)) {
      throw new Error(
        'Invalid release configuration (missing version or facets[])'
      );
    }
    console.log(`  ✓ Loaded release config v${config.version}`);
    return config;
  } catch (error) {
    if (error instanceof FileOperationError || error instanceof SecurityError) {
      throw new Error(`Failed to load release config: ${error.message}`);
    }
    throw error;
  }
}

async function resolveFactoryAddress(chainId: string): Promise<string> {
  // 1) Try deployments/<chainId>/factory.json
  const depPath = path.join(
    __dirname,
    '..',
    'deployments',
    chainId,
    'factory.json'
  );
  if (fs.existsSync(depPath)) {
    try {
      const { address } = readJsonFile<{ address: string }>(depPath, { validatePath: true });
      if (address) {
        console.log(`  ✓ Using factory from deployments: ${address}`);
        return address;
      }
    } catch (error) {
      if (error instanceof FileOperationError || error instanceof SecurityError) {
        console.warn(`  Warning: Failed to read ${depPath}: ${error.message}`);
      } else {
        console.warn(`  Warning: Failed to parse ${depPath}:`, error);
      }
    }
  }

  // 2) Try localhost deployment (network name)
  const localhostDepPath = path.join(
    __dirname,
    '..',
    'deployments',
    'localhost',
    'factory.json'
  );
  if (fs.existsSync(localhostDepPath)) {
    try {
      const { address } = JSON.parse(fs.readFileSync(localhostDepPath, 'utf8'));
      if (address) {
        console.log(`  ✓ Using factory from localhost deployment: ${address}`);
        return address;
      }
    } catch (error) {
      console.warn(`  Warning: Failed to parse ${localhostDepPath}:`, error);
    }
  }

  // 3) Try alternative deployment paths (hardhat network)
  const altDepPath = path.join(
    __dirname,
    '..',
    'deployments',
    'hardhat',
    'factory.json'
  );
  if (fs.existsSync(altDepPath)) {
    try {
      const { address } = JSON.parse(fs.readFileSync(altDepPath, 'utf8'));
      if (address) {
        console.log(`  ✓ Using factory from hardhat deployment: ${address}`);
        return address;
      }
    } catch (error) {
      console.warn(`  Warning: Failed to parse ${altDepPath}:`, error);
    }
  }

  // 3) Fallback to config/networks.json
  const networksPath = path.join(__dirname, '..', 'config', 'networks.json');
  if (fs.existsSync(networksPath)) {
    const networks = JSON.parse(fs.readFileSync(networksPath, 'utf8'));
    const found = networks?.[chainId]?.factory;
    if (found) {
      console.log(`  ✓ Using factory from networks.json: ${found}`);
      return found;
    }
  }

  // 4) Auto-update networks.json if we found the factory in alternative path
  if (fs.existsSync(altDepPath)) {
    try {
      const { address } = JSON.parse(fs.readFileSync(altDepPath, 'utf8'));
      if (address) {
        console.log(`  ✓ Auto-updating networks.json with factory: ${address}`);

        // Update or create networks.json
        let networks: any = {};
        if (fs.existsSync(networksPath)) {
          networks = JSON.parse(fs.readFileSync(networksPath, 'utf8'));
        }

        if (!networks[chainId]) {
          networks[chainId] = {};
        }
        networks[chainId].factory = address;

        fs.writeFileSync(networksPath, JSON.stringify(networks, null, 2));
        return address;
      }
    } catch (error) {
      console.warn(`  Warning: Failed to update networks.json:`, error);
    }
  }

  throw new Error(
    `Factory address not found for chainId=${chainId}. Add deployments/${chainId}/factory.json or config/networks.json.`
  );
}

async function resolveFacetAddress(
  facetName: string,
  chainId: string
): Promise<string | null> {
  // Map facet names to deployment files
  const facetFiles: Record<string, string> = {
    ExampleFacetA: 'facet-a.json',
    ExampleFacetB: 'facet-b.json',
  };

  const fileName = facetFiles[facetName];
  console.log(`  🔍 Resolving address for facet: ${facetName} -> ${fileName}`);
  if (!fileName) {
    console.log(`  ⚠ No deployment file mapping for facet: ${facetName}`);
    return null;
  }

  // 1) Try deployments/localhost/<fileName> FIRST (most recent deployments)
  const localhostPath = path.join(
    __dirname,
    '..',
    'deployments',
    'localhost',
    fileName
  );
  console.log(`  📁 Checking localhost FIRST: ${localhostPath}`);
  if (fs.existsSync(localhostPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(localhostPath, 'utf8'));
      console.log(`  📄 Found localhost deployment data:`, data);
      if (data.address) {
        console.log(`  ✅ Using address from localhost: ${data.address}`);
        return data.address;
      }
    } catch (err) {
      console.warn(
        `  ⚠ Warning: Failed to read facet from ${localhostPath}:`,
        err
      );
    }
  } else {
    console.log(`  ❌ Localhost file not found: ${localhostPath}`);
  }

  // 2) Fall back to deployments/<chainId>/<fileName>
  const depPath = path.join(__dirname, '..', 'deployments', chainId, fileName);
  console.log(`  📁 Checking chainId fallback: ${depPath}`);
  if (fs.existsSync(depPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(depPath, 'utf8'));
      console.log(`  📄 Found deployment data:`, data);
      if (data.address) {
        console.log(`  ✅ Using address from ${chainId}: ${data.address}`);
        return data.address;
      }
    } catch (err) {
      console.warn(`  ⚠ Warning: Failed to read facet from ${depPath}:`, err);
    }
  } else {
    console.log(`  ❌ File not found: ${depPath}`);
  }

  console.log(`  ⚠ No deployment address found for ${facetName}`);
  return null;
}

type FacetEntry = {
  name: string;
  contract: string;
  creation: string; // creation bytecode (0x…)
  runtime: string; // deployed bytecode (0x…)
  runtimeHash: string; // keccak256(runtime)
  runtimeSize: number; // bytes
  salt: string; // 0x…
  predictedAddress: string; // CREATE2(factory, salt, keccak256(creation))
  selectors: string[]; // bytes4 strings
  priority?: number;
  gasLimit?: number;
};

/**
 * Build facet entries and predicted addresses deterministically:
 * salt = keccak256(runtime) unless a salt is provided in release.deployment[facetName].salt
 */
async function buildFacetEntries(
  release: any,
  artifacts: any,
  ethers: any,
  factory: string,
  chainId: string
): Promise<FacetEntry[]> {
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
    const runtime = normalizeHex(artifact.deployedBytecode);

    if (!runtime || runtime === '0x') {
      throw new Error(
        `Artifact ${facetCfg.contract} has empty deployedBytecode (is it abstract or an interface?)`
      );
    }

    const runtimeHash = ethers.keccak256(runtime);
    const runtimeSize = (runtime.length - 2) / 2;

    // Salt: prefer override in release, else deterministic keccak(runtime)
    const releaseSalt = release?.deployment?.[facetCfg.name]?.salt;
    const salt = normalizeHex(releaseSalt ?? ethers.keccak256(runtime));

    // Predicted address (CREATE2)
    const initCodeHash = ethers.keccak256(creation);
    const predictedAddress = getCreate2Address(
      factory,
      salt,
      initCodeHash,
      ethers
    );

    // Selectors: prefer explicit list, else derive from ABI (external/public, exclude constructor/fallback/receive)
    const selectors: string[] =
      Array.isArray(facetCfg.selectors) && facetCfg.selectors.length > 0
        ? facetCfg.selectors.map(normalizeSelector)
        : deriveSelectorsFromAbiUtil(artifact.abi).map(normalizeSelector);

    // Use actual deployed address if available, otherwise fall back to predicted
    const deployedAddress = await resolveFacetAddress(facetCfg.name, chainId);
    const actualAddress = deployedAddress || predictedAddress;

    out.push({
      name: facetCfg.name,
      contract: facetCfg.contract,
      creation,
      runtime,
      runtimeHash,
      runtimeSize,
      salt,
      predictedAddress: actualAddress,
      selectors,
      priority: facetCfg.priority,
      gasLimit: facetCfg.gasLimit,
    });

    console.log(
      `  📦 Facet ${facetCfg.name}: codehash=${runtimeHash} size=${runtimeSize}B addr=${actualAddress}`
    );
    if (deployedAddress) {
      console.log(`    ✓ Using deployed address: ${deployedAddress}`);
    } else {
      console.log(`    ⚠ Using predicted address: ${predictedAddress}`);
    }
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
  const leaves = routes.map(r =>
    ethers.keccak256(
      coder.encode(
        ['bytes4', 'address', 'bytes32'],
        [r.selector, r.facet, r.codehash]
      )
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
function generateOrderedProof(
  tree: string[][],
  leafIndex: number,
  ethers: any
): string[] {
  const proof: string[] = [];
  let idx = leafIndex;

  for (let level = 0; level < tree.length - 1; level++) {
    const levelNodes = tree[level];
    const isLastOdd =
      levelNodes.length % 2 === 1 && idx === levelNodes.length - 1;

    const siblingIndex = isLastOdd ? idx : idx ^ 1; // if odd dup, sibling is itself; else flip last bit
    if (siblingIndex < levelNodes.length) {
      proof.push(levelNodes[siblingIndex]);
    }

    idx = Math.floor(idx / 2);
  }
  return proof;
}

/* ───────────────────────────── IO ───────────────────────────── */

async function saveManifestFiles(manifest: any, merkle: any) {
  const manifestsDir = path.join(__dirname, '..', 'manifests');

  // Create manifests directory with enhanced safety
  ensureDirectoryExists(manifestsDir);

  try {
    // Enhanced manifest with comprehensive metadata
    const manifestPath = path.join(manifestsDir, 'current.manifest.json');
    writeJsonFile(manifestPath, manifest, { 
      backup: true, 
      validatePath: true, 
      indent: 2 
    });
    console.log(`  💾 Enhanced manifest saved: ${manifestPath}`);

    // Enhanced Merkle metadata with leaf information
    const merklePath = path.join(manifestsDir, 'current.merkle.json');
    const merkleData = {
      root: merkle.root,
      leaves: merkle.leaves,
      proofs: merkle.proofs,
      tree: merkle.tree, // Full tree structure for debugging
      // Enhanced metadata from utility integration
      leafMetadata: merkle.leafMeta || [], // Detailed leaf information
      generatedAt: new Date().toISOString(),
      version: '2.0.0', // Enhanced version
      compatibility: 'OpenZeppelin MerkleProof'
    };
    
    writeJsonFile(merklePath, merkleData, {
      backup: true,
      validatePath: true,
      indent: 2
    });
    console.log(`  💾 Enhanced Merkle data saved: ${merklePath}`);

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
    
    const chunkMapPath = path.join(manifestsDir, 'chunks.map.json');
    writeJsonFile(chunkMapPath, chunkMap, {
      backup: true,
      validatePath: true,
      indent: 2
    });
    console.log(`  💾 Chunk mapping saved: ${chunkMapPath}`);
    
  } catch (error) {
    if (error instanceof FileOperationError || error instanceof SecurityError) {
      console.error(`❌ Failed to save manifest files: ${error.message}`);
      throw error;
    }
    console.error("❌ Unexpected error saving manifest:", error);
    throw error;
  }
}

/* ───────────────────────────── Utils ───────────────────────────── */

function normalizeHex(x: string): string {
  if (!x) return '0x';
  return x.startsWith('0x') ? x : '0x' + x;
}

function normalizeSelector(sel: string): string {
  const s = sel.toLowerCase();
  if (!s.startsWith('0x')) return '0x' + s;
  return '0x' + s.slice(2).padStart(8, '0'); // ensure 4 bytes / 8 hex chars after 0x
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
function getCreate2Address(
  factory: string,
  salt: string,
  initCodeHash: string,
  ethers: any
): string {
  const packed = ethers.concat(['0xff', factory, salt, initCodeHash]);
  const hash = ethers.keccak256(packed);
  return ethers.getAddress('0x' + hash.slice(26)); // last 20 bytes
}

/* ───────────────────────── CLI entrypoint ───────────────────────── */

if (require.main === module) {
  // When run via: npx hardhat run scripts/build-manifest.ts --network <net>
  // Hardhat injects HRE, so the below is only for direct node execution fallback.
  const hre: HardhatRuntimeEnvironment = require('hardhat');
  main(hre)
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

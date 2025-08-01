// tasks/payrox.ts
import { keccak256 } from 'ethers';
import { task, types } from 'hardhat/config';
import {
  computeManifestHash,
  verifyRouteAgainstRoot,
} from '../src/payrox/orderedMerkle';
import {
  logError,
  logInfo,
  logSuccess,
  logWarning,
  NetworkError,
} from '../src/utils/errors';
import {
  fileExists,
  getPathManager,
  readFileContent,
  safeParseJSON,
} from '../src/utils/paths';

type Manifest = {
  header?: {
    version: string; // human readable
    versionBytes32: string; // bytes32 hash of version
    timestamp: number;
    deployer: string;
    chainId: number;
    previousHash: string;
  };
  epoch?: number;
  root?: string;
  merkleRoot?: string; // Alternative field name for root
  routes: Array<{
    selector: string;
    facet: string;
    codehash: string;
    proof?: string[];
    positions?: string;
  }>;
};

async function extcodehashOffchain(
  addr: string,
  provider: any
): Promise<string> {
  const code: string = await provider.getCode(addr);
  if (code === '0x') {
    return keccak256('0x'); // empty account codehash (will not match route.codehash)
  }
  return keccak256(code).toLowerCase();
}

/**
 * Safely read and parse file content as hex data
 */
function readFileAsHex(filePath: string): string {
  const pathManager = getPathManager();
  const absolutePath = pathManager.getAbsolutePath(filePath);

  if (!fileExists(absolutePath)) {
    throw new NetworkError(`File not found: ${absolutePath}`, 'FILE_NOT_FOUND');
  }

  try {
    // Try reading as text first (for hex files)
    const content = readFileContent(absolutePath);
    const trimmed = content.trim();

    if (trimmed.startsWith('0x') && /^0x[0-9a-fA-F]*$/.test(trimmed)) {
      return trimmed;
    } else if (/^[0-9a-fA-F]+$/.test(trimmed)) {
      return '0x' + trimmed;
    }
  } catch {
    // If text reading fails, try binary
  }

  // Read as binary and convert to hex
  try {
    const fs = require('fs');
    const raw = fs.readFileSync(absolutePath);
    return '0x' + raw.toString('hex');
  } catch (error) {
    throw new NetworkError(
      `Failed to read file ${absolutePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'FILE_READ_ERROR'
    );
  }
}

/** ----------------------------------------------------------------------------
 *  payrox:manifest:selfcheck
 *  - Verifies ordered proofs (positions + leaf)
 *  - Recomputes manifestHash
 *  - (Optional) compares off-chain EXTCODEHASH via provider.getCode()
 * ---------------------------------------------------------------------------*/
task(
  'payrox:manifest:selfcheck',
  'Verify a manifest JSON against ordered Merkle rules'
)
  .addParam('path', 'Path to manifest JSON', undefined, types.string)
  .addOptionalParam(
    'checkFacets',
    'Also verify facet EXTCODEHASH off-chain',
    false,
    types.boolean
  )
  .setAction(async (args, hre) => {
    try {
      logInfo(`Starting manifest selfcheck for: ${args.path}`);

      const pathManager = getPathManager();
      const manifestPath = pathManager.getAbsolutePath(args.path);

      if (!fileExists(manifestPath)) {
        throw new NetworkError(
          `Manifest not found at ${manifestPath}`,
          'MANIFEST_NOT_FOUND'
        );
      }

      const manifestContent = readFileContent(manifestPath);
      const manifest: Manifest = safeParseJSON(manifestContent, manifestPath);

      // Basic shape checks
      const root = manifest.merkleRoot || manifest.root;
      if (!root || !manifest.routes?.length) {
        throw new Error('Manifest missing merkleRoot/root or routes');
      }
      const rootLower = root.toLowerCase();

      // 1) Verify each route proof is valid and positions mask has no extra bits (if proofs available)
      let proofsVerified = 0;
      for (const r of manifest.routes) {
        if (r.proof && r.positions) {
          verifyRouteAgainstRoot(r, rootLower);
          proofsVerified++;
        }
      }

      if (proofsVerified > 0) {
        logSuccess(`${proofsVerified} route proofs verified against root`);
        console.log(`✅ ${proofsVerified} route proofs verified against root.`);
      } else {
        logInfo('No route proofs found in manifest for verification');
        console.log('ℹ️  No route proofs found in manifest for verification');
      }

      // 2) Recompute manifestHash and display (if header exists)
      if (manifest.header) {
        logInfo('Computing manifest hash from header...');
        const mHash = computeManifestHash(
          {
            versionBytes32: manifest.header.versionBytes32,
            timestamp: manifest.header.timestamp,
            deployer: manifest.header.deployer,
            chainId: manifest.header.chainId,
            previousHash: manifest.header.previousHash,
          },
          rootLower
        );
        logSuccess('Manifest hash computed successfully');
        console.log(`📦 manifestHash: ${mHash}`);
      } else {
        logWarning('No header found for manifest hash computation');
        console.log('ℹ️  No header found for manifest hash computation');
      }

      // 3) Optional: off-chain EXTCODEHASH parity for each facet
      if (args.checkFacets) {
        const provider = hre.ethers.provider;
        let ok = 0,
          bad = 0,
          empty = 0;
        for (const r of manifest.routes) {
          const off = await extcodehashOffchain(r.facet, provider);
          if (off === keccak256('0x')) {
            console.warn(`⚠️  facet ${r.facet} has empty code`);
            empty++;
          }
          if (r.codehash && off === r.codehash.toLowerCase()) {
            ok++;
          } else if (r.codehash) {
            console.error(
              `❌ codehash mismatch for selector ${r.selector} facet ${r.facet}\n  expected: ${r.codehash}\n  got:      ${off}`
            );
            bad++;
          } else {
            console.warn(
              `⚠️  no codehash in manifest for selector ${r.selector} facet ${r.facet}`
            );
          }
        }
        if (bad === 0) {
          logSuccess(
            `EXTCODEHASH parity ok for ${ok} route(s). Empty facets: ${empty}.`
          );
        } else {
          throw new NetworkError(
            `Facet codehash mismatches detected: ${bad}`,
            'CODEHASH_MISMATCH'
          );
        }
      }

      logSuccess('Manifest selfcheck completed successfully');
    } catch (error) {
      logError(error, 'Manifest selfcheck');
      throw error;
    }
  });

/** ----------------------------------------------------------------------------
 *  payrox:chunk:predict
 *  - Delegates to IChunkFactory.predict(data)
 *  - Ensures exact same creation code/salt policy as the contract
 * ---------------------------------------------------------------------------*/
task(
  'payrox:chunk:predict',
  'Predict chunk address using the on-chain factory.predict(data)'
)
  .addParam(
    'factory',
    'Deployed DeterministicChunkFactory address',
    undefined,
    types.string
  )
  .addOptionalParam(
    'data',
    '0x-prefixed hex data to stage',
    undefined,
    types.string
  )
  .addOptionalParam(
    'file',
    'Path to a file containing raw bytes (hex or binary)',
    undefined,
    types.string
  )
  .setAction(async (args, hre) => {
    try {
      logInfo(`Predicting chunk address using factory: ${args.factory}`);

      const { ethers } = hre;
      const factoryAddr = args.factory;

      // Enhanced validation using consolidated utilities
      if (!factoryAddr || factoryAddr.length !== 42) {
        throw new NetworkError(
          'Invalid factory address format',
          'INVALID_FACTORY_ADDRESS'
        );
      }

      let bytesHex: string | undefined = args.data;
      if (!bytesHex && args.file) {
        bytesHex = readFileAsHex(args.file);
      }
      if (!bytesHex) {
        throw new NetworkError(
          'Provide --data 0x... or --file path',
          'MISSING_DATA'
        );
      }

      logInfo(`Processing ${bytesHex.length} characters of hex data`);

      const factory = await ethers.getContractAt(
        'DeterministicChunkFactory',
        factoryAddr
      );

      // The predict function returns (address predicted, bytes32 hash)
      const result = await factory.predict(bytesHex);

      // Result is a tuple with [predicted, hash]
      logSuccess('Chunk prediction successful');
      console.log(`📍 predicted chunk: ${result[0]}`);
      console.log(`🔎 content hash:   ${result[1]}`);
    } catch (error) {
      logError(error, 'Chunk prediction');
      throw error;
    }
  });

/** ----------------------------------------------------------------------------
 *  payrox:chunk:stage
 *  - Stages a data chunk via factory.stage(data)
 *  - Lets the factory enforce fees and size limits
 * ---------------------------------------------------------------------------*/
task(
  'payrox:chunk:stage',
  'Stage a data chunk via DeterministicChunkFactory.stage(data)'
)
  .addParam('factory', 'Factory address', undefined, types.string)
  .addOptionalParam('data', '0x-prefixed hex data', undefined, types.string)
  .addOptionalParam(
    'file',
    'File path with hex or binary content',
    undefined,
    types.string
  )
  .addOptionalParam(
    'value',
    'ETH value to send for base fee (e.g. 0.001)',
    '0',
    types.string
  )
  .setAction(async (args, hre) => {
    try {
      logInfo(`Staging chunk via factory: ${args.factory}`);

      const { ethers } = hre;
      const factoryAddr = args.factory;

      // Enhanced validation using consolidated utilities
      if (!factoryAddr || factoryAddr.length !== 42) {
        throw new NetworkError(
          'Invalid factory address format',
          'INVALID_FACTORY_ADDRESS'
        );
      }

      let bytesHex: string | undefined = args.data;
      if (!bytesHex && args.file) {
        bytesHex = readFileAsHex(args.file);
      }
      if (!bytesHex) {
        throw new NetworkError(
          'Provide --data 0x... or --file path',
          'MISSING_DATA'
        );
      }

      logInfo(
        `Processing ${bytesHex.length} characters of hex data with ${args.value} ETH fee`
      );

      const [signer] = await ethers.getSigners();
      const factory = await ethers.getContractAt(
        'DeterministicChunkFactory',
        factoryAddr,
        signer
      );

      const valueWei = args.value === '0' ? 0n : ethers.parseEther(args.value);

      logInfo('Submitting staging transaction...');
      const tx = await factory.stage(bytesHex, { value: valueWei });
      console.log(`⛓️  stage(tx): ${tx.hash}`);

      const rcpt = await tx.wait();
      logSuccess(`Chunk staged successfully in block ${rcpt?.blockNumber}`);
      console.log(`✅ mined in block ${rcpt?.blockNumber}`);
    } catch (error) {
      logError(error, 'Chunk staging');
      throw error;
    }
  });

/** ----------------------------------------------------------------------------
 *  payrox:orchestrator:start
 *  - Start a new orchestration plan
 * ---------------------------------------------------------------------------*/
task(
  'payrox:orchestrator:start',
  'Start a new orchestration plan'
)
  .addParam('orchestrator', 'Orchestrator contract address', undefined, types.string)
  .addParam('id', 'Orchestration ID (bytes32)', undefined, types.string)
  .addParam('gasLimit', 'Gas limit for orchestration', undefined, types.string)
  .setAction(async (args, hre) => {
    try {
      logInfo(`Starting orchestration: ${args.id}`);
      
      const { ethers } = hre;
      const [signer] = await ethers.getSigners();
      
      const orchestrator = await ethers.getContractAt(
        'Orchestrator',
        args.orchestrator,
        signer
      );
      
      const tx = await orchestrator.startOrchestration(args.id, args.gasLimit);
      console.log(`⛓️  orchestration started: ${tx.hash}`);
      
      const receipt = await tx.wait();
      logSuccess(`Orchestration started in block ${receipt?.blockNumber}`);
      
    } catch (error) {
      logError(error, 'Orchestrator start');
      throw error;
    }
  });

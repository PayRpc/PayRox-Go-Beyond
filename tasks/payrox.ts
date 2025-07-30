// tasks/payrox.ts
import { keccak256 } from 'ethers';
import fs from 'fs';
import { task, types } from 'hardhat/config';
import path from 'path';
import {
  computeManifestHash,
  verifyRouteAgainstRoot,
} from '../src/payrox/orderedMerkle';

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
    const p = path.resolve(process.cwd(), args.path);
    if (!fs.existsSync(p)) {
      throw new Error(`Manifest not found at ${p}`);
    }
    const manifest: Manifest = JSON.parse(fs.readFileSync(p, 'utf8'));

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
      console.log(`✅ ${proofsVerified} route proofs verified against root.`);
    } else {
      console.log('ℹ️  No route proofs found in manifest for verification');
    }

    // 2) Recompute manifestHash and display (if header exists)
    if (manifest.header) {
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
      console.log(`📦 manifestHash: ${mHash}`);
    } else {
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
        if (off === r.codehash.toLowerCase()) {
          ok++;
        } else {
          console.error(
            `❌ codehash mismatch for selector ${r.selector} facet ${r.facet}\n  expected: ${r.codehash}\n  got:      ${off}`
          );
          bad++;
        }
      }
      if (bad === 0) {
        console.log(
          `✅ EXTCODEHASH parity ok for ${ok} route(s). Empty facets: ${empty}.`
        );
      } else {
        throw new Error(`Facet codehash mismatches detected: ${bad}`);
      }
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
    const { ethers } = hre;
    const factoryAddr = args.factory;
    if (!factoryAddr || factoryAddr.length !== 42) {
      throw new Error('Invalid factory address');
    }

    let bytesHex: string | undefined = args.data;
    if (!bytesHex && args.file) {
      const raw = fs.readFileSync(path.resolve(process.cwd(), args.file));
      // If the file looks like hex (starts with 0x or only hex chars), treat accordingly; else binary
      const str = raw.toString('utf8').trim();
      if (str.startsWith('0x') && /^0x[0-9a-fA-F]*$/.test(str)) {
        bytesHex = str;
      } else if (/^[0-9a-fA-F]+$/.test(str)) {
        bytesHex = '0x' + str;
      } else {
        // binary file → hex
        bytesHex = '0x' + raw.toString('hex');
      }
    }
    if (!bytesHex) {
      throw new Error('Provide --data 0x... or --file path');
    }

    const factory = await ethers.getContractAt(
      'DeterministicChunkFactory',
      factoryAddr
    );
    // Prefer the on-chain view for parity with stage()
    const predicted = await factory.predict(bytesHex);
    // Some implementations return (address) only; others return (address,hash). Print both if present.
    if (Array.isArray(predicted)) {
      console.log(`📍 predicted chunk: ${predicted[0]}`);
      if (predicted[1]) {
        console.log(`🔎 content hash:   ${predicted[1]}`);
      }
    } else {
      console.log(`📍 predicted chunk: ${predicted}`);
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
    const { ethers } = hre;
    const factoryAddr = args.factory;
    if (!factoryAddr || factoryAddr.length !== 42) {
      throw new Error('Invalid factory address');
    }

    let bytesHex: string | undefined = args.data;
    if (!bytesHex && args.file) {
      const raw = fs.readFileSync(path.resolve(process.cwd(), args.file));
      const str = raw.toString('utf8').trim();
      if (str.startsWith('0x') && /^0x[0-9a-fA-F]*$/.test(str)) {
        bytesHex = str;
      } else if (/^[0-9a-fA-F]+$/.test(str)) {
        bytesHex = '0x' + str;
      } else {
        bytesHex = '0x' + raw.toString('hex');
      }
    }
    if (!bytesHex) {
      throw new Error('Provide --data 0x... or --file path');
    }

    const [signer] = await ethers.getSigners();
    const factory = await ethers.getContractAt(
      'DeterministicChunkFactory',
      factoryAddr,
      signer
    );

    const valueWei = args.value === '0' ? 0n : ethers.parseEther(args.value);
    const tx = await factory.stage(bytesHex, { value: valueWei });
    console.log(`⛓️  stage(tx): ${tx.hash}`);
    const rcpt = await tx.wait();
    console.log(`✅ mined in block ${rcpt?.blockNumber}`);
  });

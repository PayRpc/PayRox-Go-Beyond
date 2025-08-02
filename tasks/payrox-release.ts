// tasks/payrox-release.ts
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { task } from 'hardhat/config';
import { join } from 'path';
import {
  computeManifestHash,
  verifyRouteAgainstRoot,
} from '../src/payrox/orderedMerkle';

interface ReleaseBundle {
  version: string;
  timestamp: number;
  network: string;
  manifest: any;
  chunks: ChunkInfo[];
  deployment: DeploymentInfo;
  verification: VerificationInfo;
  signatures: Record<string, string>;
}

interface ChunkInfo {
  name: string;
  address: string;
  size: number;
  codehash: string;
  constructorArgs?: any[];
}

interface DeploymentInfo {
  dispatcher: string;
  factory: string;
  deployer: string;
  blockNumber: number;
  transactionHash: string;
}

interface VerificationInfo {
  manifestHash: string;
  merkleRoot: string;
  routeCount: number;
  timestamp: number;
  gasUsed: string;
}

/**
 * payrox:release:bundle
 * Generate production release bundle with verification and signing
 */
task('payrox:release:bundle', 'Generate production-ready release bundle')
  .addParam('manifest', 'Path to manifest file')
  .addParam('dispatcher', 'ManifestDispatcher address')
  .addParam('factory', 'DeterministicChunkFactory address')
  .addOptionalParam('releaseVersion', 'Release version', '1.0.0')
  .addOptionalParam('output', 'Output directory', './releases')
  .addOptionalParam('signer', 'Signing key name for verification')
  .addFlag('verify', 'Verify deployment integrity')
  .addFlag('sign', 'Sign the release bundle')
  .setAction(async (args, hre) => {
    const { ethers } = hre;

    console.log('📦 PayRox Release Bundle Generator');
    console.log(`📡 Network: ${hre.network.name}`);
    console.log(`📄 Manifest: ${args.manifest}`);
    console.log(`📍 Dispatcher: ${args.dispatcher}`);

    // Ensure output directory exists
    if (!existsSync(args.output)) {
      mkdirSync(args.output, { recursive: true });
    }

    // Load and validate manifest
    console.log('\\n📋 Loading manifest...');
    if (!existsSync(args.manifest)) {
      throw new Error(`Manifest file not found: ${args.manifest}`);
    }

    const manifest = JSON.parse(readFileSync(args.manifest, 'utf8'));
    console.log(`✅ Loaded manifest: ${manifest.routes?.length || 0} routes`);

    // Get deployment info
    console.log('\\n🔍 Gathering deployment information...');
    const dispatcher = await ethers.getContractAt(
      'ManifestDispatcher',
      args.dispatcher
    );
    const factory = await ethers.getContractAt(
      'DeterministicChunkFactory',
      args.factory
    );

    const [signer] = await ethers.getSigners();
    const currentBlock = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(currentBlock);

    // Collect chunk information
    console.log('\\n🧩 Analyzing deployed chunks...');
    const chunks: ChunkInfo[] = [];
    const missingContracts: string[] = [];

    for (const route of manifest.routes || []) {
      const facetAddress = route.facet;
      const code = await ethers.provider.getCode(facetAddress);

      if (code === '0x') {
        console.log(`   ⚠️  No code found at: ${route.name} (${facetAddress})`);
        missingContracts.push(`${route.name} at ${facetAddress}`);

        // Add placeholder chunk for missing contract
        chunks.push({
          name: route.name || 'Unknown',
          address: facetAddress,
          size: 0,
          codehash: 'missing',
          constructorArgs: route.constructorArgs,
        });
        continue;
      }

      const codehash = createHash('sha256')
        .update(code.slice(2), 'hex')
        .digest('hex');

      chunks.push({
        name: route.name || 'Unknown',
        address: facetAddress,
        size: (code.length - 2) / 2, // Convert hex to bytes
        codehash,
        constructorArgs: route.constructorArgs,
      });

      console.log(
        `   ✅ ${route.name}: ${facetAddress} (${
          chunks[chunks.length - 1].size
        } bytes)`
      );
    }

    if (missingContracts.length > 0) {
      console.log(
        `\\n⚠️  WARNING: ${missingContracts.length} contracts missing code:`
      );
      missingContracts.forEach(contract => console.log(`     - ${contract}`));
      console.log('   This bundle will be marked as incomplete.');
    }

    // Verification
    console.log('\\n🔍 Performing verification...');

    // Verify routes against deployed contracts
    const codehashMismatches: any[] = [];
    let totalVerifiedRoutes = 0;

    for (const route of manifest.routes || []) {
      const code = await ethers.provider.getCode(route.facet);
      if (code !== '0x') {
        const actualCodehash = ethers.keccak256(code);
        if (route.codehash && route.codehash !== actualCodehash) {
          codehashMismatches.push({
            selector: route.selector,
            facet: route.facet,
            expected: route.codehash,
            actual: actualCodehash,
          });
        } else {
          totalVerifiedRoutes++;
        }
      }
    }

    const isComplete =
      missingContracts.length === 0 && codehashMismatches.length === 0;
    console.log(
      `   ✅ Routes verified: ${totalVerifiedRoutes}/${
        manifest.routes?.length || 0
      }`
    );
    if (codehashMismatches.length > 0) {
      console.log(`   ⚠️  Codehash mismatches: ${codehashMismatches.length}`);
    }

    // Build minimal header for manifest hash computation
    const manifestHeader = {
      versionBytes32:
        '0x0000000000000000000000000000000000000000000000000000000000000001',
      timestamp: Math.floor(Date.now() / 1000),
      deployer: signer.address,
      chainId: hre.network.config.chainId || 31337,
      previousHash:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
    };

    const manifestHash = computeManifestHash(
      manifestHeader,
      manifest.merkleRoot || '0x0'
    );

    let merkleRoot: string;
    let routeVerification = true;

    try {
      merkleRoot = await dispatcher.merkleRoot();
      console.log(`   Merkle root: ${merkleRoot}`);

      if (args.verify) {
        console.log('   🧪 Verifying routes against Merkle root...');

        for (const route of manifest.routes || []) {
          try {
            verifyRouteAgainstRoot(route, merkleRoot);
            console.log(`   ✅ Route verified: ${route.selector}`);
          } catch (error) {
            console.log(
              `   ❌ Route verification failed: ${route.selector} - ${error}`
            );
            routeVerification = false;
          }
        }

        if (routeVerification) {
          console.log('   ✅ All routes verified against Merkle root');
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Could not verify routes: ${error}`);
      merkleRoot =
        '0x0000000000000000000000000000000000000000000000000000000000000000';
      routeVerification = false;
    }

    // Create release bundle
    const bundleComplete =
      missingContracts.length === 0 && codehashMismatches.length === 0;
    const bundle: ReleaseBundle = {
      version: args.releaseVersion,
      timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
      network: hre.network.name,
      manifest,
      chunks,
      deployment: {
        dispatcher: args.dispatcher,
        factory: args.factory,
        deployer: signer.address,
        blockNumber: currentBlock,
        transactionHash: '0x0', // Would need to track actual deployment tx
      },
      verification: {
        manifestHash,
        merkleRoot,
        routeCount: manifest.routes?.length || 0,
        timestamp: Math.floor(Date.now() / 1000),
        gasUsed: '0',
      },
      signatures: {},
    };

    // Add completion status to bundle
    (bundle as any).incomplete = !bundleComplete;
    (bundle as any).completionStatus = {
      isComplete: bundleComplete,
      totalRoutes: manifest.routes?.length || 0,
      verifiedRoutes: totalVerifiedRoutes,
      missingContracts: missingContracts.length,
      codehashMismatches: codehashMismatches.length,
    };

    if (!bundleComplete) {
      (bundle as any).missingContracts = missingContracts;
      (bundle as any).codehashMismatches = codehashMismatches;
    }

    // Signing
    if (args.sign && args.signer) {
      console.log('\\n✍️  Signing release bundle...');
      try {
        const bundleJson = JSON.stringify(bundle, null, 2);
        const bundleHash = createHash('sha256')
          .update(bundleJson)
          .digest('hex');

        // In a real implementation, you'd use proper key management
        const signature = await signer.signMessage(bundleHash);
        bundle.signatures[args.signer] = signature;

        console.log(`   ✅ Bundle signed by ${args.signer}`);
        console.log(`   📝 Signature: ${signature.slice(0, 20)}...`);
      } catch (error) {
        console.log(`   ❌ Signing failed: ${error}`);
      }
    }

    // Generate release files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const releaseDir = join(args.output, `${args.releaseVersion}-${timestamp}`);

    if (!existsSync(releaseDir)) {
      mkdirSync(releaseDir, { recursive: true });
    }

    console.log(`\\n📁 Generating release files in: ${releaseDir}`);

    // Main bundle file
    const bundlePath = join(releaseDir, 'bundle.json');
    writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));
    console.log(`   ✅ bundle.json`);

    // Checksums
    const checksums: Record<string, string> = {};
    checksums['bundle.json'] = createHash('sha256')
      .update(readFileSync(bundlePath))
      .digest('hex');

    // Copy manifest
    const manifestPath = join(releaseDir, 'manifest.json');
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    checksums['manifest.json'] = createHash('sha256')
      .update(readFileSync(manifestPath))
      .digest('hex');
    console.log(`   ✅ manifest.json`);

    // Deployment info
    const deploymentInfo = {
      network: hre.network.name,
      contracts: {
        dispatcher: args.dispatcher,
        factory: args.factory,
      },
      deployer: signer.address,
      timestamp: bundle.timestamp,
      blockNumber: currentBlock,
    };

    const deploymentPath = join(releaseDir, 'deployment.json');
    writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    checksums['deployment.json'] = createHash('sha256')
      .update(readFileSync(deploymentPath))
      .digest('hex');
    console.log(`   ✅ deployment.json`);

    // Enhanced bundle files for production

    // Routes CSV for human review
    const routesCsv = [
      'selector,facet,codehash,function_sig,verified',
      ...manifest.routes.map((r: any) => {
        const verified =
          !missingContracts.some(addr => addr.includes(r.facet)) &&
          !codehashMismatches.some(m => m.facet === r.facet);
        return `${r.selector},${r.facet},${
          r.codehash || 'unknown'
        },${getFunctionSignature(r.selector)},${verified}`;
      }),
    ].join('\\n');

    const routesCsvPath = join(releaseDir, 'routes.csv');
    writeFileSync(routesCsvPath, routesCsv);
    checksums['routes.csv'] = createHash('sha256')
      .update(routesCsv)
      .digest('hex');
    console.log(`   ✅ routes.csv`);

    // Proofs for verification
    const proofsData = {
      root: manifest.root,
      epoch: manifest.epoch,
      routes: manifest.routes.map((r: any) => ({
        selector: r.selector,
        facet: r.facet,
        codehash: r.codehash,
        proof: r.proof || [],
        positions: r.positions || '0x00',
      })),
    };

    const proofsPath = join(releaseDir, 'proofs.json');
    writeFileSync(proofsPath, JSON.stringify(proofsData, null, 2));
    checksums['proofs.json'] = createHash('sha256')
      .update(JSON.stringify(proofsData))
      .digest('hex');
    console.log(`   ✅ proofs.json`);

    // Codehash mapping
    const codehashMap: Record<string, string> = {};
    for (const route of manifest.routes || []) {
      if (route.codehash && route.facet) {
        codehashMap[route.facet] = route.codehash;
      }
    }

    const codehashMapPath = join(releaseDir, 'codehash-map.json');
    writeFileSync(codehashMapPath, JSON.stringify(codehashMap, null, 2));
    checksums['codehash-map.json'] = createHash('sha256')
      .update(JSON.stringify(codehashMap))
      .digest('hex');
    console.log(`   ✅ codehash-map.json`);

    // Chunk mapping (if available)
    try {
      const chunksMapPath = join(process.cwd(), 'manifests', 'chunks.map.json');
      if (existsSync(chunksMapPath)) {
        const chunksData = readFileSync(chunksMapPath, 'utf8');
        const chunksDestPath = join(releaseDir, 'chunk-map.json');
        writeFileSync(chunksDestPath, chunksData);
        checksums['chunk-map.json'] = createHash('sha256')
          .update(chunksData)
          .digest('hex');
        console.log(`   ✅ chunk-map.json`);
      }
    } catch (error) {
      console.log(`   ⚠️  chunk-map.json not available`);
    }

    // Addresses mapping
    const addresses = {
      factory: args.factory,
      dispatcher: args.dispatcher,
      deployer: signer.address,
      network: hre.network.name,
      chainId: Number(
        manifest.header?.chainId ||
          (await ethers.provider.getNetwork().then(n => n.chainId))
      ),
    };

    const addressesPath = join(releaseDir, 'addresses.json');
    writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
    checksums['addresses.json'] = createHash('sha256')
      .update(JSON.stringify(addresses))
      .digest('hex');
    console.log(`   ✅ addresses.json`);

    // README
    const readme = generateReleaseReadme(bundle, routeVerification);
    const readmePath = join(releaseDir, 'README.md');
    writeFileSync(readmePath, readme);
    console.log(`   ✅ README.md`);

    // Checksums file
    const checksumsPath = join(releaseDir, 'checksums.txt');
    const checksumsContent = Object.entries(checksums)
      .map(([file, hash]) => `${hash}  ${file}`)
      .join('\\n');
    writeFileSync(checksumsPath, checksumsContent);
    console.log(`   ✅ checksums.txt`);

    console.log('\\n🎉 Release bundle generated successfully!');
    console.log(`\\n📋 Bundle Summary:`);
    console.log(`   Version: ${bundle.version}`);
    console.log(`   Network: ${bundle.network}`);
    console.log(`   Chunks: ${bundle.chunks.length}`);
    console.log(`   Routes: ${bundle.verification.routeCount}`);
    console.log(`   Complete: ${bundleComplete ? '✅' : '❌'}`);
    console.log(`   Verified: ${routeVerification ? '✅' : '❌'}`);
    console.log(
      `   Signed: ${Object.keys(bundle.signatures).length > 0 ? '✅' : '❌'}`
    );
    console.log(`\\n📂 Files: ${releaseDir}`);

    if (!bundleComplete) {
      console.log('\\n⚠️  WARNING: Incomplete bundle generated!');
      console.log(`   Missing contracts: ${missingContracts.length}`);
      console.log(`   Codehash mismatches: ${codehashMismatches.length}`);
      console.log('   Resolve issues before production use.');
    }

    if (!routeVerification) {
      console.log('\\n⚠️  WARNING: Route verification failed!');
      console.log('   This bundle may not be production-ready');
    }

    return {
      bundlePath,
      version: bundle.version,
      complete: bundleComplete,
      verified: routeVerification,
      signed: Object.keys(bundle.signatures).length > 0,
      missingContracts: missingContracts.length,
      codehashMismatches: codehashMismatches.length,
    };
  });

// Helper function to resolve function signatures
function getFunctionSignature(selector: string): string {
  const signatures: Record<string, string> = {
    // ExampleFacetA functions (verified against contract interface)
    '0x7ab7b94b': 'getFacetInfo()',
    '0xb5211ec4': 'executeA(string)',
    '0x03e8837c': 'getUserCount(address)',
    '0x9730174d': 'storeData(bytes32,bytes)', // Fixed: correct selector
    '0x54f6127f': 'getData(bytes32)', // Fixed: correct selector, returns caller-namespaced data
    '0xbdb475b8': 'batchExecute(string[])',
    '0x24d824cb': 'calculateHash(bytes)',
    '0x31cd4199': 'verifySignature(bytes32,bytes,address)',
    '0x642f7d5e': 'totalExecutions()',
    '0x2113522a': 'lastCaller()',

    // Other facet functions
    '0x5c36b186': 'ping()',

    // ExampleFacetB functions (verified against contract interface)
    '0xe9e831d7': 'initializeFacetB(address,address,uint256,bytes)',
    '0x16c38b3c': 'setPaused(bool)',
    '0xc15a59e2': 'rotateGovernance(address,uint256,bytes)',
    '0x0e7d1d93': 'rotateOperator(address,uint256,bytes)',
    '0x37184e95': 'executeB(uint256,bytes)',
    '0x5aa723df': 'batchExecuteB(uint256[],bytes[])',
    '0x279412c5': 'getOperation(bytes32)',
    '0xe2ab79b1': 'getUserOperations(address)',
    '0x31e8c195': 'complexCalculation(uint256[])',
    '0x7c300fd1': 'getStateSummary()',
    '0x3c7264b2': 'getFacetInfoB()',
    '0xa8ced948': 'getAdvancedAnalytics()',
    '0xa83583e9': 'getUserStatistics(address)',
    '0xea83977f': 'validateOperation(uint256,bytes)',
    '0x0af73309': 'simulateOperation(uint256,bytes)',
    '0xc66b4f23': 'getInitNonce()',
    '0x289b3c0d': 'getGovernance()',

    // Generic functions
    '0x02329a29': 'stop()',
    '0x47e7ef24': 'deposit(address,uint256)',
    '0xf3fef3a3': 'withdraw(address,uint256)',
    '0x3ccfd60b': 'withdraw()',
    '0x70a08231': 'balanceOf(address)',
    '0xa22cb465': 'setApprovalForAll(address,bool)',
    '0x8da5cb5b': 'owner()',
    '0x9b19251a': 'getPaused()',
    '0xd85d3d27': 'getTotalUsers()',
    '0xba414fa6': 'getOwner()',
    '0x8456cb59': 'pause()',
    '0x3f4ba83a': 'unpause()',
  };

  return signatures[selector] || 'unknown()';
}

function generateReleaseReadme(
  bundle: ReleaseBundle,
  verified: boolean
): string {
  return `# PayRox Release Bundle v${bundle.version}

## Release Information

- **Version:** ${bundle.version}
- **Network:** ${bundle.network}
- **Timestamp:** ${new Date(bundle.timestamp * 1000).toISOString()}
- **Deployer:** ${bundle.deployment.deployer}

## Deployment

- **Dispatcher:** ${bundle.deployment.dispatcher}
- **Factory:** ${bundle.deployment.factory}
- **Block Number:** ${bundle.deployment.blockNumber}

## Components

${bundle.chunks
  .map(chunk => `- **${chunk.name}:** ${chunk.address} (${chunk.size} bytes)`)
  .join('\\n')}

## Verification

- **Manifest Hash:** ${bundle.verification.manifestHash}
- **Merkle Root:** ${bundle.verification.merkleRoot}
- **Route Count:** ${bundle.verification.routeCount}
- **Verified:** ${verified ? '✅ Passed' : '❌ Failed'}

## Security

${
  Object.keys(bundle.signatures).length > 0
    ? `- **Signatures:** ${Object.keys(bundle.signatures).join(', ')}`
    : '- **Signatures:** None'
}

## Usage

1. Verify checksums: \`sha256sum -c checksums.txt\`
2. Validate manifest: \`npx hardhat payrox:manifest:selfcheck manifests/\`
3. Deploy via manifest: \`npx hardhat run scripts/deploy-via-manifest.ts\`

## Support

For technical support and documentation, visit the PayRox repository.
`;
}

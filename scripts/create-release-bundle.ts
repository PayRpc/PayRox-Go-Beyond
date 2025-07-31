// scripts/create-release-bundle.ts
/**
 * Enhanced Release Bundle Generator with Production Integration
 *
 * Creates comprehensive production-ready release packages with:
 * - Manifest verification and validation
 * - Etherscan verification links
 * - SBOM (Software Bill of Materials)
 * - Freeze readiness assessment
 * - Security audit trails
 * - Deployment documentation
 */

import crypto from 'crypto';
import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import path from 'path';

interface ReleaseConfig {
  version: string;
  network: string;
  tag?: string;
  includeVerification?: boolean;
  includeSBOM?: boolean;
  includeFreeze?: boolean;
  outputDir?: string;
}

interface DeploymentInfo {
  factory: string;
  dispatcher: string;
  orchestrator: string;
  deployer: string;
  timestamp: number;
  blockNumber: number;
  gasUsed: string;
  txHashes: {
    factory: string;
    dispatcher: string;
    orchestrator: string;
  };
}

interface ReleaseMetadata {
  bundleId: string;
  version: string;
  network: string;
  createdAt: string;
  manifestHash: string;
  deploymentHash: string;
  verificationStatus: 'pending' | 'verified' | 'failed' | 'skipped';
  sbomIncluded: boolean;
  freezeAssessed: boolean;
  securityLevel: 'development' | 'staging' | 'production';
}

export async function createReleaseBundle(
  hre: HardhatRuntimeEnvironment,
  config: ReleaseConfig
): Promise<string> {
  console.log('🚀 Creating enhanced release bundle...');

  // Generate unique bundle ID
  const bundleId = generateBundleId(config);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const bundleDir =
    config.outputDir ||
    path.join(process.cwd(), 'releases', `${config.version}-${timestamp}`);

  // Create bundle directory structure
  await createBundleStructure(bundleDir);

  try {
    // 1. Load and validate manifest
    const manifestPath = findLatestManifest();
    const manifest = await loadAndValidateManifest(manifestPath);
    const manifestHash = hashManifest(manifest);

    // 2. Load deployment information
    const deploymentInfo = await loadDeploymentInfo(hre, config.network);
    const deploymentHash = hashDeployment(deploymentInfo);

    // 3. Create release metadata
    const metadata: ReleaseMetadata = {
      bundleId,
      version: config.version,
      network: config.network,
      createdAt: new Date().toISOString(),
      manifestHash,
      deploymentHash,
      verificationStatus: 'pending',
      sbomIncluded: false,
      freezeAssessed: false,
      securityLevel: determineSecurityLevel(config.network),
    };

    // 4. Copy core files
    await copyManifestFiles(bundleDir, manifestPath);
    await copyDeploymentFiles(bundleDir, deploymentInfo);
    await copyContractArtifacts(bundleDir);

    // 5. Generate documentation
    await generateReleaseDocumentation(
      bundleDir,
      manifest,
      deploymentInfo,
      metadata
    );

    // 6. Optional: Etherscan verification
    if (config.includeVerification) {
      console.log('📋 Running Etherscan verification...');
      try {
        await runEtherscanVerification(
          hre,
          bundleDir,
          deploymentInfo,
          config.network
        );
        metadata.verificationStatus = 'verified';
      } catch (error) {
        console.warn('⚠️ Etherscan verification failed:', error);
        metadata.verificationStatus = 'failed';
      }
    } else {
      metadata.verificationStatus = 'skipped';
    }

    // 7. Optional: Generate SBOM
    if (config.includeSBOM) {
      console.log('📦 Generating SBOM...');
      try {
        await generateSBOM(bundleDir);
        metadata.sbomIncluded = true;
      } catch (error) {
        console.warn('⚠️ SBOM generation failed:', error);
      }
    }

    // 8. Optional: Freeze readiness assessment
    if (config.includeFreeze) {
      console.log('🔒 Assessing freeze readiness...');
      try {
        await assessFreezeReadiness(bundleDir, deploymentInfo);
        metadata.freezeAssessed = true;
      } catch (error) {
        console.warn('⚠️ Freeze assessment failed:', error);
      }
    }

    // 9. Create security checksums
    await generateSecurityChecksums(bundleDir);

    // 10. Write final metadata
    await writeMetadata(bundleDir, metadata);

    // 11. Create bundle archive
    const archivePath = await createBundleArchive(bundleDir, bundleId);

    console.log(`✅ Release bundle created successfully:`);
    console.log(`   Bundle ID: ${bundleId}`);
    console.log(`   Directory: ${bundleDir}`);
    console.log(`   Archive: ${archivePath}`);
    console.log(`   Network: ${config.network}`);
    console.log(`   Verification: ${metadata.verificationStatus}`);
    console.log(`   SBOM: ${metadata.sbomIncluded ? 'included' : 'skipped'}`);
    console.log(
      `   Freeze Assessment: ${
        metadata.freezeAssessed ? 'included' : 'skipped'
      }`
    );

    return bundleDir;
  } catch (error) {
    console.error('❌ Release bundle creation failed:', error);
    // Clean up partial bundle
    if (fs.existsSync(bundleDir)) {
      fs.rmSync(bundleDir, { recursive: true, force: true });
    }
    throw error;
  }
}

function generateBundleId(config: ReleaseConfig): string {
  const data = `${config.version}-${config.network}-${Date.now()}`;
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
    .substring(0, 16);
}

async function createBundleStructure(bundleDir: string): Promise<void> {
  const dirs = [
    'manifests',
    'contracts',
    'deployments',
    'verification',
    'security',
    'docs',
    'sbom',
    'freeze',
  ];

  fs.mkdirSync(bundleDir, { recursive: true });

  for (const dir of dirs) {
    fs.mkdirSync(path.join(bundleDir, dir), { recursive: true });
  }
}

function findLatestManifest(): string {
  const manifestsDir = path.join(process.cwd(), 'manifests');
  const files = fs
    .readdirSync(manifestsDir)
    .filter(f => f.endsWith('.manifest.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error('No manifest files found');
  }

  return path.join(manifestsDir, files[0]);
}

async function loadAndValidateManifest(manifestPath: string): Promise<any> {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Basic validation
  if (!manifest.routes || !Array.isArray(manifest.routes)) {
    throw new Error('Invalid manifest: missing or invalid routes');
  }

  if (!manifest.merkleRoot && !manifest.root) {
    throw new Error('Invalid manifest: missing merkle root');
  }

  return manifest;
}

function hashManifest(manifest: any): string {
  const manifestStr = JSON.stringify(manifest, null, 0);
  return crypto.createHash('sha256').update(manifestStr).digest('hex');
}

async function loadDeploymentInfo(
  hre: HardhatRuntimeEnvironment,
  network: string
): Promise<DeploymentInfo> {
  const deploymentsDir = path.join(process.cwd(), 'deployments', network);

  if (!fs.existsSync(deploymentsDir)) {
    throw new Error(`No deployments found for network: ${network}`);
  }

  // Load deployment artifacts
  const factoryPath = path.join(
    deploymentsDir,
    'DeterministicChunkFactory.json'
  );
  const dispatcherPath = path.join(deploymentsDir, 'ManifestDispatcher.json');
  const orchestratorPath = path.join(deploymentsDir, 'PayRoxOrchestrator.json');

  if (!fs.existsSync(factoryPath) || !fs.existsSync(dispatcherPath)) {
    throw new Error('Missing required deployment artifacts');
  }

  const factory = JSON.parse(fs.readFileSync(factoryPath, 'utf8'));
  const dispatcher = JSON.parse(fs.readFileSync(dispatcherPath, 'utf8'));
  const orchestrator = fs.existsSync(orchestratorPath)
    ? JSON.parse(fs.readFileSync(orchestratorPath, 'utf8'))
    : null;

  return {
    factory: factory.address,
    dispatcher: dispatcher.address,
    orchestrator:
      orchestrator?.address || '0x0000000000000000000000000000000000000000',
    deployer:
      factory.receipt?.from || '0x0000000000000000000000000000000000000000',
    timestamp: factory.receipt?.timestamp || Date.now(),
    blockNumber: factory.receipt?.blockNumber || 0,
    gasUsed: factory.receipt?.gasUsed?.toString() || '0',
    txHashes: {
      factory: factory.transactionHash || '',
      dispatcher: dispatcher.transactionHash || '',
      orchestrator: orchestrator?.transactionHash || '',
    },
  };
}

function hashDeployment(deployment: DeploymentInfo): string {
  const deploymentStr = JSON.stringify(deployment, null, 0);
  return crypto.createHash('sha256').update(deploymentStr).digest('hex');
}

function determineSecurityLevel(
  network: string
): 'development' | 'staging' | 'production' {
  if (
    network === 'mainnet' ||
    network === 'polygon' ||
    network === 'arbitrum'
  ) {
    return 'production';
  } else if (
    network.includes('test') ||
    network.includes('goerli') ||
    network.includes('sepolia')
  ) {
    return 'staging';
  } else {
    return 'development';
  }
}

async function copyManifestFiles(
  bundleDir: string,
  manifestPath: string
): Promise<void> {
  const manifestsDir = path.join(bundleDir, 'manifests');
  const manifestFilename = path.basename(manifestPath);

  fs.copyFileSync(manifestPath, path.join(manifestsDir, manifestFilename));

  // Also copy merkle file if it exists
  const merkleFile = manifestPath.replace('.manifest.json', '.merkle.json');
  if (fs.existsSync(merkleFile)) {
    fs.copyFileSync(
      merkleFile,
      path.join(manifestsDir, path.basename(merkleFile))
    );
  }
}

async function copyDeploymentFiles(
  bundleDir: string,
  deploymentInfo: DeploymentInfo
): Promise<void> {
  const deploymentsDir = path.join(bundleDir, 'deployments');

  // Create deployment summary
  const summary = {
    addresses: {
      factory: deploymentInfo.factory,
      dispatcher: deploymentInfo.dispatcher,
      orchestrator: deploymentInfo.orchestrator,
    },
    metadata: {
      deployer: deploymentInfo.deployer,
      timestamp: deploymentInfo.timestamp,
      blockNumber: deploymentInfo.blockNumber,
      gasUsed: deploymentInfo.gasUsed,
    },
    transactions: deploymentInfo.txHashes,
  };

  fs.writeFileSync(
    path.join(deploymentsDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );
}

async function copyContractArtifacts(bundleDir: string): Promise<void> {
  const contractsDir = path.join(bundleDir, 'contracts');
  const artifactsDir = path.join(process.cwd(), 'artifacts', 'contracts');

  if (!fs.existsSync(artifactsDir)) {
    console.warn('⚠️ No contract artifacts found');
    return;
  }

  // Copy key contract artifacts
  const keyContracts = [
    'factory/DeterministicChunkFactory.sol/DeterministicChunkFactory.json',
    'dispatcher/ManifestDispatcher.sol/ManifestDispatcher.json',
    'orchestrator/PayRoxOrchestrator.sol/PayRoxOrchestrator.json',
  ];

  for (const contractPath of keyContracts) {
    const srcPath = path.join(artifactsDir, contractPath);
    if (fs.existsSync(srcPath)) {
      const destPath = path.join(contractsDir, path.basename(contractPath));
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function generateReleaseDocumentation(
  bundleDir: string,
  manifest: any,
  deploymentInfo: DeploymentInfo,
  metadata: ReleaseMetadata
): Promise<void> {
  const docsDir = path.join(bundleDir, 'docs');

  // Generate README
  const readme = generateReadme(manifest, deploymentInfo, metadata);
  fs.writeFileSync(path.join(docsDir, 'README.md'), readme);

  // Generate deployment guide
  const deploymentGuide = generateDeploymentGuide(deploymentInfo, metadata);
  fs.writeFileSync(path.join(docsDir, 'DEPLOYMENT.md'), deploymentGuide);

  // Generate API reference
  const apiReference = generateApiReference(manifest);
  fs.writeFileSync(path.join(docsDir, 'API.md'), apiReference);
}

function generateReadme(
  manifest: any,
  deploymentInfo: DeploymentInfo,
  metadata: ReleaseMetadata
): string {
  return `# PayRox Go Beyond Release Bundle

## Release Information

- **Bundle ID**: ${metadata.bundleId}
- **Version**: ${metadata.version}
- **Network**: ${metadata.network}
- **Created**: ${metadata.createdAt}
- **Security Level**: ${metadata.securityLevel}

## Deployment Addresses

- **Factory**: ${deploymentInfo.factory}
- **Dispatcher**: ${deploymentInfo.dispatcher}
- **Orchestrator**: ${deploymentInfo.orchestrator}

## Manifest Summary

- **Routes**: ${manifest.routes?.length || 0}
- **Merkle Root**: ${manifest.merkleRoot || manifest.root}
- **Manifest Hash**: ${metadata.manifestHash}

## Verification Status

- **Etherscan**: ${metadata.verificationStatus}
- **SBOM**: ${metadata.sbomIncluded ? 'Included' : 'Not Generated'}
- **Freeze Assessment**: ${
    metadata.freezeAssessed ? 'Completed' : 'Not Assessed'
  }

## Usage

This bundle contains all necessary files for deploying and operating the PayRox Go Beyond system.

### Key Files

- \`manifests/\` - Deployment manifests and merkle proofs
- \`contracts/\` - Contract artifacts and ABIs
- \`deployments/\` - Deployment information and addresses
- \`verification/\` - Etherscan verification reports
- \`security/\` - Security checksums and audit trails
- \`docs/\` - Documentation and guides

### Security

Always verify file checksums before use:

\`\`\`bash
sha256sum -c security/checksums.txt
\`\`\`

## Support

For technical support and documentation, visit the project repository.
`;
}

function generateDeploymentGuide(
  deploymentInfo: DeploymentInfo,
  metadata: ReleaseMetadata
): string {
  return `# Deployment Guide

## Network Configuration

- **Network**: ${metadata.network}
- **Deployer**: ${deploymentInfo.deployer}
- **Block Number**: ${deploymentInfo.blockNumber}
- **Gas Used**: ${deploymentInfo.gasUsed}

## Contract Addresses

### Core Contracts

\`\`\`
DeterministicChunkFactory: ${deploymentInfo.factory}
ManifestDispatcher:        ${deploymentInfo.dispatcher}
PayRoxOrchestrator:        ${deploymentInfo.orchestrator}
\`\`\`

## Transaction Hashes

- **Factory**: ${deploymentInfo.txHashes.factory}
- **Dispatcher**: ${deploymentInfo.txHashes.dispatcher}
- **Orchestrator**: ${deploymentInfo.txHashes.orchestrator}

## Verification

${
  metadata.verificationStatus === 'verified'
    ? '✅ All contracts have been verified on Etherscan. See verification/ directory for details.'
    : '⚠️ Contract verification status: ' + metadata.verificationStatus
}

## Security Considerations

- Verify all contract addresses before interaction
- Check file checksums in security/checksums.txt
- Review manifest proofs before applying routes
- Use multi-sig for critical operations

## Emergency Procedures

In case of security issues:

1. Immediately pause all operations
2. Contact the security team
3. Review audit trails in security/ directory
4. Follow incident response procedures
`;
}

function generateApiReference(manifest: any): string {
  const routes = manifest.routes || [];

  let apiDocs = `# API Reference

## Available Routes

This manifest contains ${routes.length} function routes:

`;

  for (const route of routes) {
    apiDocs += `### ${route.selector}

- **Facet**: ${route.facet}
- **Code Hash**: ${route.codehash}
${
  route.proof
    ? `- **Proof**: Available (${route.proof.length} elements)`
    : '- **Proof**: Not included'
}

`;
  }

  return apiDocs;
}

async function runEtherscanVerification(
  hre: HardhatRuntimeEnvironment,
  bundleDir: string,
  deploymentInfo: DeploymentInfo,
  network: string
): Promise<void> {
  const verificationDir = path.join(bundleDir, 'verification');

  // Run our enhanced verification script
  const { spawn } = require('child_process');

  return new Promise((resolve, reject) => {
    const proc = spawn(
      'npx',
      [
        'hardhat',
        'run',
        'scripts/verify-on-etherscan.ts',
        '--network',
        network,
      ],
      {
        cwd: process.cwd(),
        stdio: 'pipe',
      }
    );

    let output = '';
    proc.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      output += data.toString();
    });

    proc.on('close', (code: number) => {
      // Save verification output
      fs.writeFileSync(
        path.join(verificationDir, 'etherscan-verification.txt'),
        output
      );

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Verification failed with code ${code}`));
      }
    });
  });
}

async function generateSBOM(bundleDir: string): Promise<void> {
  const sbomDir = path.join(bundleDir, 'sbom');

  // Run our SBOM generation script
  const { spawn } = require('child_process');

  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['hardhat', 'run', 'scripts/generate-sbom.ts'], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    let output = '';
    proc.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    proc.on('close', (code: number) => {
      // Copy generated SBOM files
      const generatedSbom = path.join(process.cwd(), 'sbom.json');
      if (fs.existsSync(generatedSbom)) {
        fs.copyFileSync(generatedSbom, path.join(sbomDir, 'sbom.json'));
      }

      // Save generation log
      fs.writeFileSync(path.join(sbomDir, 'generation.log'), output);

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`SBOM generation failed with code ${code}`));
      }
    });
  });
}

async function assessFreezeReadiness(
  bundleDir: string,
  deploymentInfo: DeploymentInfo
): Promise<void> {
  const freezeDir = path.join(bundleDir, 'freeze');

  // Run our freeze readiness assessment
  const { spawn } = require('child_process');

  return new Promise((resolve, reject) => {
    const proc = spawn(
      'npx',
      ['hardhat', 'run', 'scripts/assess-freeze-readiness.ts'],
      {
        cwd: process.cwd(),
        stdio: 'pipe',
      }
    );

    let output = '';
    proc.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    proc.on('close', (code: number) => {
      // Copy generated assessment files
      const assessmentFile = path.join(process.cwd(), 'freeze-assessment.json');
      if (fs.existsSync(assessmentFile)) {
        fs.copyFileSync(
          assessmentFile,
          path.join(freezeDir, 'assessment.json')
        );
      }

      // Save assessment log
      fs.writeFileSync(path.join(freezeDir, 'assessment.log'), output);

      resolve(); // Don't fail bundle creation if assessment fails
    });
  });
}

async function generateSecurityChecksums(bundleDir: string): Promise<void> {
  const securityDir = path.join(bundleDir, 'security');

  // Generate checksums for all files
  const checksums: string[] = [];

  function hashFile(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  function processDirectory(dir: string, relativeTo: string = bundleDir): void {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && item !== 'security') {
        processDirectory(fullPath, relativeTo);
      } else if (stat.isFile()) {
        const relativePath = path.relative(relativeTo, fullPath);
        const hash = hashFile(fullPath);
        checksums.push(`${hash}  ${relativePath}`);
      }
    }
  }

  processDirectory(bundleDir);

  // Write checksums file
  fs.writeFileSync(
    path.join(securityDir, 'checksums.txt'),
    checksums.join('\n') + '\n'
  );

  // Create audit trail
  const auditTrail = {
    timestamp: new Date().toISOString(),
    files: checksums.length,
    generator: 'create-release-bundle.ts',
    algorithm: 'SHA256',
  };

  fs.writeFileSync(
    path.join(securityDir, 'audit-trail.json'),
    JSON.stringify(auditTrail, null, 2)
  );
}

async function writeMetadata(
  bundleDir: string,
  metadata: ReleaseMetadata
): Promise<void> {
  fs.writeFileSync(
    path.join(bundleDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );
}

async function createBundleArchive(
  bundleDir: string,
  bundleId: string
): Promise<string> {
  const archivePath = `${bundleDir}.tar.gz`;
  const { spawn } = require('child_process');

  return new Promise((resolve, reject) => {
    const proc = spawn('tar', [
      '-czf',
      archivePath,
      '-C',
      path.dirname(bundleDir),
      path.basename(bundleDir),
    ]);

    proc.on('close', (code: number) => {
      if (code === 0) {
        resolve(archivePath);
      } else {
        reject(new Error(`Archive creation failed with code ${code}`));
      }
    });
  });
}

// CLI interface
export async function main(hre: HardhatRuntimeEnvironment, params?: any) {
  const config: ReleaseConfig = {
    version: params?.version || '1.0.0',
    network: hre.network.name,
    tag: params?.tag,
    includeVerification: params?.verification !== false,
    includeSBOM: params?.sbom !== false,
    includeFreeze: params?.freeze !== false,
    outputDir: params?.output,
  };

  try {
    const bundleDir = await createReleaseBundle(hre, config);
    console.log(`\n🎉 Release bundle created successfully at: ${bundleDir}`);
    return bundleDir;
  } catch (error) {
    console.error('❌ Failed to create release bundle:', error);
    process.exit(1);
  }
}

// Allow direct execution
if (require.main === module) {
  const hre = require('hardhat');
  main(hre).catch(console.error);
}

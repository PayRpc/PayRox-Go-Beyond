/**
 * Manifest Preflight Checker
 *
 * Implements "no-hash-miss" validation for cross-chain deployments
 * Validates manifest canonicality, Merkle trees, and EIP-712 signatures
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import * as path from 'path';
import { NetworkManager, getNetworkManager } from '../src/utils/network';

/* ═══════════════════════════════════════════════════════════════════════════
   MANIFEST VALIDATION TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export interface ManifestEntry {
  selector: string;
  facetAddress: string;
  functionSignature: string;
  gasLimit: number;
  priority: number;
}

export interface ManifestChunk {
  chunkId: string;
  bytecode: string;
  bytecodeHash: string;
  size: number;
  gasEstimate: number;
}

export interface CrossChainManifest {
  version: string;
  timestamp: string;
  chainId: string;
  factoryAddress: string;
  dispatcherAddress: string;
  entries: ManifestEntry[];
  chunks: ManifestChunk[];
  merkleRoot: string;
  manifestHash: string;
  previousHash?: string;
  signature?: string;
}

export interface PreflightValidation {
  networkName: string;
  chainId: string;
  passed: boolean;
  checks: {
    merkleConsistency: boolean;
    manifestHash: boolean;
    selectorSorting: boolean;
    selectorUniqueness: boolean;
    previousHashLinkage: boolean;
    bytecodeIntegrity: boolean;
    gasEstimation: boolean;
    signatureVerification: boolean;
  };
  computedHashes: {
    merkleRoot: string;
    manifestHash: string;
    onChainHash?: string;
  };
  errors: string[];
  warnings: string[];
}

/* ═══════════════════════════════════════════════════════════════════════════
   MANIFEST PREFLIGHT CHECKER CLASS
   ═══════════════════════════════════════════════════════════════════════════ */

export class ManifestPreflightChecker {
  private networkManager: NetworkManager;

  constructor() {
    this.networkManager = getNetworkManager();
  }

  /**
   * MANIFEST PREFLIGHT: "no-hash-miss" validation across all chains
   */
  async validateManifestAcrossChains(
    manifestPath: string,
    networks: string[],
    hre: HardhatRuntimeEnvironment
  ): Promise<{ valid: boolean; results: PreflightValidation[] }> {
    console.log('🔍 MANIFEST PREFLIGHT: Validating across chains...');
    console.log(`📋 Manifest: ${manifestPath}`);
    console.log(`🌐 Networks: ${networks.join(', ')}`);

    // Load base manifest
    const baseManifest = await this.loadManifest(manifestPath);
    console.log(
      `📦 Loaded manifest v${baseManifest.version} with ${baseManifest.entries.length} entries`
    );

    const results: PreflightValidation[] = [];
    let allValid = true;

    for (const networkName of networks) {
      console.log(`\n🔍 Validating ${networkName}...`);

      const result = await this.validateManifestForNetwork(
        baseManifest,
        networkName,
        hre
      );
      results.push(result);

      if (!result.passed) {
        allValid = false;
        console.log(`❌ ${networkName}: Validation failed`);
        result.errors.forEach(err => console.log(`   Error: ${err}`));
      } else {
        console.log(`✅ ${networkName}: Manifest validation passed`);
      }

      // Show warnings
      result.warnings.forEach(warn =>
        console.log(`⚠️  ${networkName}: ${warn}`)
      );
    }

    return { valid: allValid, results };
  }

  /**
   * Validate manifest for a specific network
   */
  private async validateManifestForNetwork(
    manifest: CrossChainManifest,
    networkName: string,
    hre: HardhatRuntimeEnvironment
  ): Promise<PreflightValidation> {
    try {
      // Switch to target network
      await hre.changeNetwork(networkName);
      const { ethers } = hre;

      const networkConfig = this.networkManager.getNetworkConfig(networkName);
      if (!networkConfig) {
        throw new Error(`Network ${networkName} not configured`);
      }

      // Create network-specific manifest
      const networkManifest = {
        ...manifest,
        chainId: networkConfig.chainId,
      };

      // Run all validation checks
      const checks = {
        merkleConsistency: await this.validateMerkleConsistency(
          networkManifest
        ),
        manifestHash: await this.validateManifestHash(networkManifest),
        selectorSorting: this.validateSelectorSorting(networkManifest.entries),
        selectorUniqueness: this.validateSelectorUniqueness(
          networkManifest.entries
        ),
        previousHashLinkage: this.validatePreviousHashLinkage(networkManifest),
        bytecodeIntegrity: await this.validateBytecodeIntegrity(
          networkManifest.chunks
        ),
        gasEstimation: await this.validateGasEstimation(
          networkManifest.chunks,
          ethers
        ),
        signatureVerification: await this.validateSignature(
          networkManifest,
          ethers
        ),
      };

      // Compute hashes
      const computedHashes = {
        merkleRoot: await this.computeMerkleRoot(networkManifest),
        manifestHash: await this.computeManifestHash(networkManifest),
        onChainHash: await this.getOnChainManifestHash(networkManifest, ethers),
      };

      const errors: string[] = [];
      const warnings: string[] = [];

      // Collect errors
      if (!checks.merkleConsistency)
        errors.push('Merkle tree consistency check failed');
      if (!checks.manifestHash) errors.push('Manifest hash validation failed');
      if (!checks.selectorSorting)
        errors.push('Function selectors not properly sorted');
      if (!checks.selectorUniqueness)
        errors.push('Duplicate function selectors found');
      if (!checks.previousHashLinkage)
        warnings.push('Previous hash linkage not verified');
      if (!checks.bytecodeIntegrity)
        errors.push('Bytecode integrity check failed');
      if (!checks.gasEstimation)
        warnings.push('Gas estimation issues detected');
      if (!checks.signatureVerification)
        errors.push('EIP-712 signature verification failed');

      // Validate hash consistency
      if (computedHashes.manifestHash !== networkManifest.manifestHash) {
        errors.push(
          `Manifest hash mismatch: expected ${networkManifest.manifestHash}, computed ${computedHashes.manifestHash}`
        );
      }

      if (
        computedHashes.onChainHash &&
        computedHashes.onChainHash !== computedHashes.manifestHash
      ) {
        errors.push(
          `On-chain hash mismatch: ${computedHashes.onChainHash} != ${computedHashes.manifestHash}`
        );
      }

      const passed = errors.length === 0;

      return {
        networkName,
        chainId: networkConfig.chainId,
        passed,
        checks,
        computedHashes,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        networkName,
        chainId: '0',
        passed: false,
        checks: {
          merkleConsistency: false,
          manifestHash: false,
          selectorSorting: false,
          selectorUniqueness: false,
          previousHashLinkage: false,
          bytecodeIntegrity: false,
          gasEstimation: false,
          signatureVerification: false,
        },
        computedHashes: {
          merkleRoot: '',
          manifestHash: '',
        },
        errors: [
          `Validation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ],
        warnings: [],
      };
    }
  }

  /**
   * Load manifest from JSON file
   */
  private async loadManifest(
    manifestPath: string
  ): Promise<CrossChainManifest> {
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest file not found: ${manifestPath}`);
    }

    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent) as CrossChainManifest;

    // Validate required fields
    const requiredFields = [
      'version',
      'entries',
      'chunks',
      'merkleRoot',
      'manifestHash',
    ];
    for (const field of requiredFields) {
      if (!(field in manifest)) {
        throw new Error(`Missing required field in manifest: ${field}`);
      }
    }

    return manifest;
  }

  /**
   * Validate Merkle tree consistency (duplicate-last strategy)
   */
  private async validateMerkleConsistency(
    manifest: CrossChainManifest
  ): Promise<boolean> {
    try {
      const computedRoot = await this.computeMerkleRoot(manifest);
      return computedRoot === manifest.merkleRoot;
    } catch {
      return false;
    }
  }

  /**
   * Compute Merkle root using duplicate-last strategy
   */
  private async computeMerkleRoot(
    manifest: CrossChainManifest
  ): Promise<string> {
    const leaves = manifest.chunks.map(chunk => chunk.bytecodeHash);

    if (leaves.length === 0) {
      return ethers.keccak256('0x');
    }

    if (leaves.length === 1) {
      return leaves[0];
    }

    // Duplicate last element if odd number of leaves
    const paddedLeaves = [...leaves];
    if (paddedLeaves.length % 2 !== 0) {
      paddedLeaves.push(paddedLeaves[paddedLeaves.length - 1]);
    }

    // Build Merkle tree bottom-up
    let currentLevel = paddedLeaves;
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1];
        const combined = ethers.concat([left, right]);
        nextLevel.push(ethers.keccak256(combined));
      }

      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  /**
   * Validate manifest hash computation
   */
  private async validateManifestHash(
    manifest: CrossChainManifest
  ): Promise<boolean> {
    try {
      const computedHash = await this.computeManifestHash(manifest);
      return computedHash === manifest.manifestHash;
    } catch {
      return false;
    }
  }

  /**
   * Compute canonical manifest hash
   */
  private async computeManifestHash(
    manifest: CrossChainManifest
  ): Promise<string> {
    // Create canonical representation
    const canonical = {
      version: manifest.version,
      chainId: manifest.chainId,
      factoryAddress: manifest.factoryAddress?.toLowerCase(),
      dispatcherAddress: manifest.dispatcherAddress?.toLowerCase(),
      merkleRoot: manifest.merkleRoot,
      entryCount: manifest.entries.length,
      chunkCount: manifest.chunks.length,
      timestamp: manifest.timestamp,
    };

    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      [
        'string',
        'string',
        'address',
        'address',
        'bytes32',
        'uint256',
        'uint256',
        'string',
      ],
      [
        canonical.version,
        canonical.chainId,
        canonical.factoryAddress || ethers.ZeroAddress,
        canonical.dispatcherAddress || ethers.ZeroAddress,
        canonical.merkleRoot,
        canonical.entryCount,
        canonical.chunkCount,
        canonical.timestamp,
      ]
    );

    return ethers.keccak256(encoded);
  }

  /**
   * Validate function selector sorting
   */
  private validateSelectorSorting(entries: ManifestEntry[]): boolean {
    const selectors = entries.map(entry => entry.selector);
    const sortedSelectors = [...selectors].sort();

    return JSON.stringify(selectors) === JSON.stringify(sortedSelectors);
  }

  /**
   * Validate function selector uniqueness
   */
  private validateSelectorUniqueness(entries: ManifestEntry[]): boolean {
    const selectors = entries.map(entry => entry.selector);
    const uniqueSelectors = new Set(selectors);

    return selectors.length === uniqueSelectors.size;
  }

  /**
   * Validate previous hash linkage
   */
  private validatePreviousHashLinkage(manifest: CrossChainManifest): boolean {
    // For now, just check if previousHash is present for non-initial manifests
    // In production, this would validate against stored previous manifest
    return !manifest.previousHash || manifest.previousHash.length === 66;
  }

  /**
   * Validate bytecode integrity
   */
  private async validateBytecodeIntegrity(
    chunks: ManifestChunk[]
  ): Promise<boolean> {
    for (const chunk of chunks) {
      // Verify bytecode hash
      const computedHash = ethers.keccak256(chunk.bytecode);
      if (computedHash !== chunk.bytecodeHash) {
        return false;
      }

      // Verify size
      const actualSize = (chunk.bytecode.length - 2) / 2; // Remove 0x and convert to bytes
      if (actualSize !== chunk.size) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate gas estimation
   */
  private async validateGasEstimation(
    chunks: ManifestChunk[],
    ethers: any
  ): Promise<boolean> {
    for (const chunk of chunks) {
      // Basic validation: gas estimate should be reasonable
      if (chunk.gasEstimate <= 0 || chunk.gasEstimate > 10000000) {
        return false;
      }

      // Check if gas estimate is proportional to bytecode size
      const gasPerByte = chunk.gasEstimate / chunk.size;
      if (gasPerByte < 1 || gasPerByte > 1000) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate EIP-712 signature
   */
  private async validateSignature(
    manifest: CrossChainManifest,
    ethers: any
  ): Promise<boolean> {
    if (!manifest.signature) {
      return true; // Signature is optional
    }

    try {
      // Define EIP-712 domain
      const domain = {
        name: 'PayRox Go Beyond',
        version: '1',
        chainId: parseInt(manifest.chainId),
        verifyingContract: manifest.dispatcherAddress || ethers.ZeroAddress,
      };

      // Define message types
      const types = {
        Manifest: [
          { name: 'version', type: 'string' },
          { name: 'merkleRoot', type: 'bytes32' },
          { name: 'manifestHash', type: 'bytes32' },
          { name: 'timestamp', type: 'string' },
        ],
      };

      const message = {
        version: manifest.version,
        merkleRoot: manifest.merkleRoot,
        manifestHash: manifest.manifestHash,
        timestamp: manifest.timestamp,
      };

      // Recover signer
      const recoveredAddress = ethers.verifyTypedData(
        domain,
        types,
        message,
        manifest.signature
      );

      // For now, just check if recovery succeeds
      // In production, validate against authorized governance addresses
      return ethers.isAddress(recoveredAddress);
    } catch {
      return false;
    }
  }

  /**
   * Get on-chain manifest hash (if dispatcher is deployed)
   */
  private async getOnChainManifestHash(
    manifest: CrossChainManifest,
    ethers: any
  ): Promise<string | undefined> {
    if (!manifest.dispatcherAddress) {
      return undefined;
    }

    try {
      // Check if dispatcher is deployed
      const code = await ethers.provider.getCode(manifest.dispatcherAddress);
      if (code === '0x') {
        return undefined;
      }

      // Try to read manifest hash from dispatcher
      // This would use the actual ManifestDispatcher interface
      const dispatcher = new ethers.Contract(
        manifest.dispatcherAddress,
        ['function getCurrentManifestHash() view returns (bytes32)'],
        ethers.provider
      );

      const onChainHash = await dispatcher.getCurrentManifestHash();
      return onChainHash;
    } catch {
      return undefined;
    }
  }

  /**
   * Generate preflight report
   */
  async generatePreflightReport(
    results: PreflightValidation[],
    outputPath?: string
  ): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalNetworks: results.length,
        passedNetworks: results.filter(r => r.passed).length,
        failedNetworks: results.filter(r => !r.passed).length,
        overallStatus: results.every(r => r.passed) ? 'PASS' : 'FAIL',
      },
      details: results,
    };

    const reportPath =
      outputPath ||
      path.join(
        process.cwd(),
        'reports',
        `manifest-preflight-${Date.now()}.json`
      );

    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`💾 Preflight report saved: ${reportPath}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORT UTILITIES
   ═══════════════════════════════════════════════════════════════════════════ */

export async function validateManifestPreflight(
  manifestPath: string,
  networks: string[],
  hre: HardhatRuntimeEnvironment,
  outputPath?: string
): Promise<boolean> {
  const checker = new ManifestPreflightChecker();
  const result = await checker.validateManifestAcrossChains(
    manifestPath,
    networks,
    hre
  );

  await checker.generatePreflightReport(result.results, outputPath);

  return result.valid;
}

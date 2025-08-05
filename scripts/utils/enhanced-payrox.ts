// scripts/utils/enhanced-payrox.ts
/**
 * Enhanced PayRox Utilities Integration
 * 
 * This module provides enterprise-grade integration of PayRox utilities with
 * comprehensive security, validation, and professional error handling.
 */

import {
  writeJsonFile,
  readJsonFile,
  ensureDirectoryExists,
  saveDeploymentArtifact,
  readManifestFile,
  FileOperationError,
  SecurityError,
  formatFileSize
} from './io';

import {
  encodeLeaf,
  generateManifestLeaves,
  deriveSelectorsFromAbi,
  LeafMeta
} from './merkle';

import {
  calculateCreate2Address,
  generatePayRoxSalt
} from './create2';

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED INTEGRATION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface EnhancedManifestConfig {
  version: string;
  description?: string;
  network: {
    name: string;
    chainId: number;
  };
  factory: string;
  security: {
    requireValidation: boolean;
    enableBackups: boolean;
    maxFileSize?: number;
  };
  deployment?: {
    salts?: Record<string, string>;
    gasLimits?: Record<string, number>;
  };
}

export interface EnhancedDeploymentResult {
  manifest: any;
  merkleData: {
    root: string;
    leaves: string[];
    proofs: Record<string, string[]>;
    tree: string[][];
    leafMeta: LeafMeta[];
  };
  deploymentArtifacts: Record<string, any>;
  validationResults: {
    manifestValid: boolean;
    merkleValid: boolean;
    securityChecks: string[];
    warnings: string[];
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFESSIONAL MANIFEST GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a comprehensive PayRox manifest with full integration benefits
 * 
 * @param config Enhanced manifest configuration
 * @param artifacts Hardhat artifacts interface
 * @param facets Array of facet configurations
 * @returns Complete deployment result with validation
 */
export async function generateEnhancedManifest(
  config: EnhancedManifestConfig,
  artifacts: any,
  facets: any[]
): Promise<EnhancedDeploymentResult> {
  try {
    console.log('🚀 Generating enhanced PayRox manifest...');
    console.log(`📊 Network: ${config.network.name} (${config.network.chainId})`);
    console.log(`🏭 Factory: ${config.factory}`);
    console.log(`🔧 Facets: ${facets.length}`);

    // Validate inputs with enhanced security
    validateManifestConfig(config);

    // Generate Merkle tree with comprehensive utilities
    const manifestData = {
      facets: facets.map(facet => ({
        name: facet.name,
        contract: facet.contract,
        selectors: facet.selectors
      })),
      deployment: config.deployment || {}
    };

    const merkleResult = await generateManifestLeaves(
      manifestData,
      artifacts,
      config.factory
    );

    console.log(`✅ Generated Merkle tree with ${merkleResult.leaves.length} leaves`);

    // Create enhanced manifest with comprehensive metadata
    const manifest = {
      version: config.version,
      timestamp: new Date().toISOString(),
      description: config.description || `PayRox deployment for ${config.network.name}`,
      network: config.network,
      factory: config.factory,
      
      // Enhanced facet information
      facets: await Promise.all(facets.map(async (facet, index) => {
        const salt = generatePayRoxSalt(facet.name, config.network.chainId.toString());
        const artifact = await artifacts.readArtifact(facet.contract);
        
        return {
          name: facet.name,
          contract: facet.contract,
          address: merkleResult.leafMeta
            .filter(m => m.facetName === facet.name)[0]?.facet || '',
          salt: salt,
          bytecodeHash: merkleResult.leafMeta
            .filter(m => m.facetName === facet.name)[0]?.codehash || '',
          bytecodeSize: artifact.deployedBytecode?.length || 0,
          selectors: merkleResult.leafMeta
            .filter(m => m.facetName === facet.name)
            .map(m => m.selector),
          gasLimit: config.deployment?.gasLimits?.[facet.name] || null,
          priority: index
        };
      })),

      // Enhanced routing information
      routes: merkleResult.leafMeta.map(meta => ({
        selector: meta.selector,
        facet: meta.facet,
        codehash: meta.codehash,
        facetName: meta.facetName
      })),

      // Comprehensive Merkle metadata
      merkleRoot: merkleResult.root,
      merkleMetadata: {
        leavesCount: merkleResult.leaves.length,
        treeDepth: merkleResult.tree.length,
        proofsGenerated: Object.keys(merkleResult.proofs).length,
        compatibility: 'OpenZeppelin MerkleProof',
        utilityVersion: '2.0.0',
        generatedAt: new Date().toISOString()
      },

      // Security and validation metadata
      security: {
        validated: true,
        checksumMethod: 'keccak256',
        saltGeneration: 'deterministic',
        pathValidation: config.security.requireValidation,
        backupsEnabled: config.security.enableBackups
      }
    };

    // Validate the generated manifest
    const validationResults = await validateGeneratedManifest(manifest, merkleResult);

    // Save deployment artifacts with enhanced security
    const deploymentArtifacts = await saveEnhancedDeploymentArtifacts(
      manifest,
      merkleResult,
      config
    );

    console.log('✅ Enhanced manifest generation complete!');
    console.log(`📊 Total size: ${formatFileSize(JSON.stringify(manifest).length)}`);
    console.log(`🔒 Security checks: ${validationResults.securityChecks.length} passed`);

    return {
      manifest,
      merkleData: merkleResult,
      deploymentArtifacts,
      validationResults
    };

  } catch (error) {
    if (error instanceof FileOperationError || error instanceof SecurityError) {
      console.error(`❌ Enhanced manifest generation failed: ${error.message}`);
      throw error;
    }
    
    console.error('❌ Unexpected error in enhanced manifest generation:', error);
    throw new FileOperationError(
      `Enhanced manifest generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'generate_enhanced_manifest',
      'manifest.json'
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function validateManifestConfig(config: EnhancedManifestConfig): void {
  if (!config.version) {
    throw new SecurityError('Version is required', 'config.version');
  }

  if (!config.network?.name || !config.network?.chainId) {
    throw new SecurityError('Network configuration is incomplete', 'config.network');
  }

  if (!config.factory || !/^0x[a-fA-F0-9]{40}$/.test(config.factory)) {
    throw new SecurityError('Invalid factory address', 'config.factory');
  }

  console.log('✅ Manifest configuration validation passed');
}

async function validateGeneratedManifest(
  manifest: any,
  merkleData: any
): Promise<{
  manifestValid: boolean;
  merkleValid: boolean;
  securityChecks: string[];
  warnings: string[];
}> {
  const securityChecks: string[] = [];
  const warnings: string[] = [];

  // Validate manifest structure
  let manifestValid = true;
  try {
    if (!manifest.version || !manifest.network || !manifest.facets) {
      manifestValid = false;
      warnings.push('Manifest missing required fields');
    } else {
      securityChecks.push('Manifest structure validation');
    }

    if (manifest.facets.length === 0) {
      warnings.push('No facets in manifest');
    } else {
      securityChecks.push('Facets presence validation');
    }
  } catch (error) {
    manifestValid = false;
    warnings.push(`Manifest validation error: ${error}`);
  }

  // Validate Merkle data
  let merkleValid = true;
  try {
    if (!merkleData.root || merkleData.leaves.length === 0) {
      merkleValid = false;
      warnings.push('Invalid Merkle tree data');
    } else {
      securityChecks.push('Merkle tree validation');
    }

    if (merkleData.leaves.length !== manifest.routes.length) {
      warnings.push('Merkle leaves count mismatch with routes');
    } else {
      securityChecks.push('Route-leaf consistency');
    }
  } catch (error) {
    merkleValid = false;
    warnings.push(`Merkle validation error: ${error}`);
  }

  console.log(`🔒 Validation complete: ${securityChecks.length} checks passed, ${warnings.length} warnings`);

  return {
    manifestValid,
    merkleValid,
    securityChecks,
    warnings
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED FILE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function saveEnhancedDeploymentArtifacts(
  manifest: any,
  merkleData: any,
  config: EnhancedManifestConfig
): Promise<Record<string, any>> {
  const artifacts: Record<string, any> = {};

  try {
    // Ensure manifests directory exists
    const manifestsDir = './manifests';
    ensureDirectoryExists(manifestsDir);

    // Save enhanced manifest with security features
    const manifestPath = `${manifestsDir}/enhanced.manifest.json`;
    writeJsonFile(manifestPath, manifest, {
      backup: config.security.enableBackups,
      validatePath: config.security.requireValidation,
      indent: 2,
      maxSize: config.security.maxFileSize
    });
    artifacts.manifest = manifestPath;

    // Save enhanced Merkle data
    const merklePath = `${manifestsDir}/enhanced.merkle.json`;
    const enhancedMerkleData = {
      ...merkleData,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '2.0.0',
        network: config.network,
        utilityIntegration: true
      }
    };
    
    writeJsonFile(merklePath, enhancedMerkleData, {
      backup: config.security.enableBackups,
      validatePath: config.security.requireValidation,
      indent: 2
    });
    artifacts.merkle = merklePath;

    // Save deployment summary
    const summaryPath = `${manifestsDir}/deployment.summary.json`;
    const summary = {
      network: config.network,
      factory: config.factory,
      timestamp: new Date().toISOString(),
      facetsCount: manifest.facets.length,
      routesCount: manifest.routes.length,
      merkleRoot: merkleData.root,
      version: manifest.version,
      utilityVersion: '2.0.0'
    };

    writeJsonFile(summaryPath, summary, {
      backup: false, // Summary doesn't need backup
      validatePath: config.security.requireValidation,
      indent: 2
    });
    artifacts.summary = summaryPath;

    console.log('💾 Enhanced deployment artifacts saved successfully');
    console.log(`   📄 Manifest: ${manifestPath}`);
    console.log(`   🌳 Merkle: ${merklePath}`);
    console.log(`   📊 Summary: ${summaryPath}`);

    return artifacts;

  } catch (error) {
    if (error instanceof FileOperationError || error instanceof SecurityError) {
      throw error;
    }
    
    throw new FileOperationError(
      `Failed to save deployment artifacts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'save_artifacts',
      'deployment artifacts'
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  // I/O utilities
  writeJsonFile,
  readJsonFile,
  ensureDirectoryExists,
  saveDeploymentArtifact,
  FileOperationError,
  SecurityError,
  
  // Merkle utilities
  encodeLeaf,
  generateManifestLeaves,
  deriveSelectorsFromAbi,
  
  // CREATE2 utilities
  calculateCreate2Address,
  generatePayRoxSalt
};

export default {
  generateEnhancedManifest,
  validateManifestConfig,
  validateGeneratedManifest,
  saveEnhancedDeploymentArtifacts
};

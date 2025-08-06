#!/usr/bin/env ts-node

/**
 * AI Compilation Validator & Fixer
 * 
 * Applies the learned compilation patterns to ensure all PayRox components
 * compile correctly with optimal Hardhat configuration.
 */

import * as fs from 'fs';
import * as path from 'path';

interface CompilationValidation {
  file: string;
  pragma: string;
  hasConstructor: boolean;
  hasPublicInStruct: boolean;
  hasDuplicateFields: boolean;
  hasNamespacedStorage: boolean;
  hasInitializeFunction: boolean;
  status: 'OPTIMAL' | 'NEEDS_FIXES' | 'COMPILATION_ERROR';
  issues: string[];
}

class AICompilationValidator {

  async validateAllContracts(): Promise<void> {
    console.log('🔧 AI Compilation Validation...');
    console.log('═'.repeat(50));

    // Validate facets
    await this.validateFacets();
    
    // Validate dispatcher
    await this.validateDispatcher();
    
    // Check hardhat config alignment
    await this.validateHardhatConfig();
  }

  private async validateFacets(): Promise<void> {
    console.log('\\n📄 Validating Generated Facets...');
    
    const facetsDir = './contracts/generated-facets-v2';
    if (!fs.existsSync(facetsDir)) {
      console.log('❌ Generated facets directory not found');
      return;
    }

    const files = fs.readdirSync(facetsDir).filter(f => f.endsWith('.sol'));
    const results: CompilationValidation[] = [];

    for (const file of files) {
      const filePath = path.join(facetsDir, file);
      const result = this.validateSingleContract(filePath, 'facet');
      results.push(result);
    }

    this.reportResults(results, 'FACETS');
  }

  private async validateDispatcher(): Promise<void> {
    console.log('\\n🚦 Validating ManifestDispatcher...');
    
    const dispatcherPath = './contracts/dispatcher/ManifestDispatcher.sol';
    if (!fs.existsSync(dispatcherPath)) {
      console.log('❌ ManifestDispatcher not found');
      return;
    }

    const result = this.validateSingleContract(dispatcherPath, 'dispatcher');
    this.reportResults([result], 'DISPATCHER');
  }

  private validateSingleContract(filePath: string, type: 'facet' | 'dispatcher'): CompilationValidation {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);

    const pragma = this.extractPragma(content);
    const hasConstructor = content.includes('constructor(');
    const hasPublicInStruct = this.checkPublicInStruct(content);
    const hasDuplicateFields = this.checkDuplicateFields(content);
    const hasNamespacedStorage = content.includes('bytes32 constant STORAGE_SLOT');
    const hasInitializeFunction = /function initialize\w*Facet\s*\(/.test(content);

    const issues: string[] = [];
    
    // Check pragma alignment
    if (type === 'facet' && !pragma.startsWith('^0.8.20')) {
      issues.push(`❌ Expected pragma ^0.8.20 for facets, got: ${pragma}`);
    }
    if (type === 'dispatcher' && pragma !== '0.8.30') {
      issues.push(`❌ Expected pragma 0.8.30 for dispatcher, got: ${pragma}`);
    }

    // Check facet-specific patterns
    if (type === 'facet') {
      if (hasConstructor) {
        issues.push('❌ Facet has constructor - use initialize pattern instead');
      }
      if (!hasNamespacedStorage) {
        issues.push('❌ Missing namespaced storage slot pattern');
      }
      if (!hasInitializeFunction) {
        issues.push('❌ Missing initializeFacet function');
      }
    }

    // Check common issues
    if (hasPublicInStruct) {
      issues.push('❌ COMPILATION BLOCKER: Public visibility in struct fields');
    }
    if (hasDuplicateFields) {
      issues.push('❌ COMPILATION BLOCKER: Duplicate fields in storage struct');
    }

    let status: CompilationValidation['status'] = 'OPTIMAL';
    if (issues.some(i => i.includes('COMPILATION BLOCKER'))) {
      status = 'COMPILATION_ERROR';
    } else if (issues.length > 0) {
      status = 'NEEDS_FIXES';
    }

    return {
      file: fileName,
      pragma,
      hasConstructor,
      hasPublicInStruct,
      hasDuplicateFields,
      hasNamespacedStorage,
      hasInitializeFunction,
      status,
      issues
    };
  }

  private extractPragma(content: string): string {
    const match = content.match(/pragma solidity ([^;]+);/);
    return match ? match[1] : 'NOT_FOUND';
  }

  private checkPublicInStruct(content: string): boolean {
    return /struct\s+\w+\s*{[^}]*\b(public|private|internal|external)\s+\w+/.test(content);
  }

  private checkDuplicateFields(content: string): boolean {
    const structMatches = content.match(/struct\s+\w+\s*{([^}]*)}/g);
    if (!structMatches) return false;

    for (const structContent of structMatches) {
      const fields = structContent.match(/\b\w+\s+\w+;/g) || [];
      const fieldNames = fields.map(f => f.trim().split(/\s+/).pop()?.replace(';', ''));
      const uniqueNames = new Set(fieldNames);
      if (fieldNames.length !== uniqueNames.size) {
        return true;
      }
    }
    return false;
  }

  private reportResults(results: CompilationValidation[], section: string): void {
    console.log(`\\n📊 ${section} COMPILATION REPORT`);
    console.log('═'.repeat(40));

    results.forEach(result => {
      const statusIcon = this.getStatusIcon(result.status);
      console.log(`\\n${statusIcon} ${result.file}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Pragma: ${result.pragma}`);
      
      if (result.status === 'OPTIMAL') {
        console.log('   ✅ All compilation patterns optimal');
      } else {
        console.log('   Issues:');
        result.issues.forEach(issue => console.log(`     ${issue}`));
      }
    });

    // Summary
    const optimal = results.filter(r => r.status === 'OPTIMAL').length;
    const total = results.length;
    
    console.log(`\\n📈 ${section} Summary: ${optimal}/${total} optimal`);
    if (optimal === total) {
      console.log(`🎉 All ${section.toLowerCase()} ready for compilation!`);
    }
  }

  private getStatusIcon(status: CompilationValidation['status']): string {
    switch (status) {
      case 'OPTIMAL': return '🟢';
      case 'NEEDS_FIXES': return '🟡';
      case 'COMPILATION_ERROR': return '🔴';
      default: return '⚪';
    }
  }

  private async validateHardhatConfig(): Promise<void> {
    console.log('\\n⚙️  Validating Hardhat Configuration...');
    
    const configPath = './hardhat.config.ts';
    if (!fs.existsSync(configPath)) {
      console.log('❌ hardhat.config.ts not found');
      return;
    }

    const content = fs.readFileSync(configPath, 'utf8');
    
    // Check for multi-compiler setup
    const hasMultiCompiler = content.includes('compilers:') && 
                            content.includes('0.8.20') && 
                            content.includes('0.8.30');
    
    // Check for deterministic metadata
    const hasDeterministicMetadata = content.includes('bytecodeHash') && 
                                   content.includes('none');
    
    // Check for optimizer
    const hasOptimizer = content.includes('optimizer') && 
                        content.includes('enabled: true');

    console.log(`✅ Multi-compiler setup: ${hasMultiCompiler ? 'Yes' : 'No (using single 0.8.30)'}`);
    console.log(`✅ Deterministic metadata: ${hasDeterministicMetadata ? 'Yes' : 'No'}`);
    console.log(`✅ Optimizer enabled: ${hasOptimizer ? 'Yes' : 'No'}`);

    if (!hasMultiCompiler) {
      console.log('\\n💡 Recommendation: Consider multi-compiler setup for optimal facet compilation');
      console.log('   Current: Single 0.8.30 (works but not optimal)');
      console.log('   Optimal: 0.8.20 for facets + 0.8.30 for dispatcher');
    }
  }

  async generateOptimalHardhatConfig(): Promise<void> {
    console.log('\\n🚀 Generating Optimal Hardhat Configuration...');
    
    const optimalConfig = `import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";

// ✅ LEARNED: Common settings for deterministic CREATE2 builds
const COMMON_SETTINGS = {
  optimizer: { enabled: true, runs: 200 },
  viaIR: false, // Set to true for complex contracts if needed
  metadata: { bytecodeHash: "none" as const }, // Deterministic for CREATE2
};

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      // ✅ LEARNED: For facets with pragma ^0.8.20
      { version: "0.8.20", settings: COMMON_SETTINGS },
      // ✅ LEARNED: For dispatcher with pragma 0.8.30  
      { version: "0.8.30", settings: COMMON_SETTINGS },
    ],
    overrides: {
      // ✅ LEARNED: Force dispatcher to use 0.8.30
      "contracts/dispatcher/ManifestDispatcher.sol": {
        version: "0.8.30",
        settings: COMMON_SETTINGS,
      },
    },
  },

  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },

  contractSizer: {
    runOnCompile: true,
    strict: false,
    disambiguatePaths: true,
  },

  paths: {
    sources: "contracts",
    tests: "test", 
    cache: "cache",
    artifacts: "artifacts",
  },
};

export default config;`;

    fs.writeFileSync('./hardhat.config.optimal.ts', optimalConfig);
    console.log('✅ Generated optimal configuration: hardhat.config.optimal.ts');
    console.log('💡 Review and replace current config if desired');
  }
}

// Execute validation
if (require.main === module) {
  const validator = new AICompilationValidator();
  validator.validateAllContracts()
    .then(() => validator.generateOptimalHardhatConfig())
    .catch(console.error);
}

export { AICompilationValidator };

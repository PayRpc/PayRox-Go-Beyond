#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * AI Native Pattern Validator for PayRox Go Beyond
 * Learns from actual native contracts to validate AI-generated facets
 */

interface NativePattern {
  name: string;
  correctUsage: string;
  commonMistakes: string[];
  realExample: string;
}

interface ValidationResult {
  contractName: string;
  totalChecks: number;
  passed: number;
  failed: number;
  criticalFailures: string[];
  warnings: string[];
  nativePatternViolations: string[];
  compilationBlockers: string[];
}

class NativePatternValidator {
  private nativePatterns: Map<string, NativePattern> = new Map();
  private libDiamondFunctions: Set<string> = new Set();

  constructor() {
    this.loadNativePatterns();
    this.loadLibDiamondFunctions();
  }

  private loadNativePatterns(): void {
    // Native patterns learned from studying actual contracts
    this.nativePatterns.set('dispatcherEnforcement', {
      name: 'Dispatcher Enforcement',
      correctUsage: 'LibDiamond.enforceManifestCall()',
      commonMistakes: ['LibDiamond.enforceIsDispatcher()', 'LibDiamond.enforceDispatcher()'],
      realExample: 'From SecureTestFacet: Uses enforceManifestCall() for dispatcher validation'
    });

    this.nativePatterns.set('roleEnforcement', {
      name: 'Role Enforcement',
      correctUsage: 'LibDiamond.requireRole(ROLE)',
      commonMistakes: ['LibDiamond.enforceRole(ROLE, msg.sender)', 'LibDiamond.checkRole()'],
      realExample: 'Native LibDiamond only has requireRole(bytes32 role) function'
    });

    this.nativePatterns.set('storagePattern', {
      name: 'Storage Isolation',
      correctUsage: 'bytes32 internal constant STORAGE_SLOT = keccak256("payrox.diamond.facetname.storage")',
      commonMistakes: ['using shared storage', 'missing assembly pattern', 'wrong slot naming'],
      realExample: 'SecureTestFacet uses isolated storage with assembly slot assignment'
    });

    this.nativePatterns.set('reentrancyPattern', {
      name: 'Reentrancy Protection',
      correctUsage: 'Use storage field (_reentrancyStatus or testValue) for reentrancy detection',
      commonMistakes: ['OpenZeppelin ReentrancyGuard', 'external reentrancy libraries'],
      realExample: 'SecureTestFacet uses ds.testValue for reentrancy protection'
    });

    this.nativePatterns.set('initPattern', {
      name: 'Initialization',
      correctUsage: 'onlyDispatcher + storage.initialized check + direct assignment',
      commonMistakes: ['missing dispatcher check', 'complex initialization logic'],
      realExample: 'SecureTestFacet: simple bool flag in storage with onlyDispatcher modifier'
    });
  }

  private loadLibDiamondFunctions(): void {
    // Actual functions available in LibDiamond.sol
    const actualFunctions = [
      'diamondStorage',
      'initializeDiamond',
      'isInitialized',
      'requireInitialized',
      'getManifestDispatcher',
      'getDeploymentEpoch',
      'verifyManifestCall',
      'updateManifestDispatcher',
      'generateStorageSlot',
      'generateNamespacedStorageSlot',
      'hasRole',
      'requireRole',
      'contractAddress',
      'isDelegateCall',
      'enforceManifestCall',
      'getTimestamp',
      'generateDeploymentSalt'
    ];

    actualFunctions.forEach(fn => this.libDiamondFunctions.add(fn));
  }

  validateContract(filePath: string): ValidationResult {
    if (!existsSync(filePath)) {
      throw new Error(`Contract file not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf8');
    const contractName = this.extractContractName(content);
    
    const result: ValidationResult = {
      contractName,
      totalChecks: 0,
      passed: 0,
      failed: 0,
      criticalFailures: [],
      warnings: [],
      nativePatternViolations: [],
      compilationBlockers: []
    };

    // Critical Check 1: LibDiamond function existence
    this.validateLibDiamondCalls(content, result);
    
    // Critical Check 2: Native pattern compliance
    this.validateNativePatterns(content, result);
    
    // Critical Check 3: Compilation readiness
    this.validateCompilationReadiness(content, result);
    
    // Critical Check 4: Storage isolation
    this.validateStorageIsolation(content, result);
    
    // Critical Check 5: Modifier patterns
    this.validateModifierPatterns(content, result);

    // Calculate final scores
    result.totalChecks = result.passed + result.failed;
    
    return result;
  }

  private validateLibDiamondCalls(content: string, result: ValidationResult): void {
    const libDiamondCalls = content.match(/LibDiamond\.(\w+)\s*\(/g) || [];
    
    for (const call of libDiamondCalls) {
      result.totalChecks++;
      const functionName = call.match(/LibDiamond\.(\w+)/)?.[1];
      
      if (functionName && this.libDiamondFunctions.has(functionName)) {
        result.passed++;
      } else {
        result.failed++;
        result.compilationBlockers.push(`CRITICAL: LibDiamond.${functionName}() does not exist`);
        result.criticalFailures.push(`Non-existent LibDiamond function: ${functionName}`);
      }
    }
  }

  private validateNativePatterns(content: string, result: ValidationResult): void {
    // Check for common AI-generated mistakes
    const mistakes = [
      { pattern: /LibDiamond\\.enforceIsDispatcher\\(\\)/, message: 'Should use LibDiamond.enforceManifestCall()' },
      { pattern: /LibDiamond\\.enforceRole\\([^,]+,\\s*msg\\.sender\\)/, message: 'Should use LibDiamond.requireRole(role)' },
      { pattern: /LibDiamond\\.enforceIsContractOwner\\(\\)/, message: 'Function does not exist in LibDiamond' },
      { pattern: /ReentrancyGuard/, message: 'Use native storage-based reentrancy pattern' },
      { pattern: /struct\\s+\\w+\\s*{[^}]*public/, message: 'Struct members cannot have visibility keywords' }
    ];

    mistakes.forEach(({ pattern, message }) => {
      if (pattern.test(content)) {
        result.totalChecks++;
        result.failed++;
        result.nativePatternViolations.push(message);
        if (message.includes('does not exist')) {
          result.compilationBlockers.push(`BLOCKER: ${message}`);
        }
      } else {
        result.totalChecks++;
        result.passed++;
      }
    });
  }

  private validateCompilationReadiness(content: string, result: ValidationResult): void {
    // Check for undefined structs used in mappings
    const mappingMatches = content.match(/mapping\\([^)]*=>\\s*(\\w+)\\s*\\)/g) || [];
    const structDefs = content.match(/struct\\s+(\\w+)/g) || [];
    const definedStructs = new Set(structDefs.map(s => s.match(/struct\\s+(\\w+)/)?.[1]).filter(Boolean));

    mappingMatches.forEach(mapping => {
      result.totalChecks++;
      const structType = mapping.match(/=>\\s*(\\w+)\\s*\\)/)?.[1];
      
      if (structType && !definedStructs.has(structType) && !this.isBuiltinType(structType)) {
        result.failed++;
        result.compilationBlockers.push(`CRITICAL: Undefined struct '${structType}' used in mapping`);
        result.criticalFailures.push(`Undefined struct: ${structType}`);
      } else {
        result.passed++;
      }
    });

    // Check for illegal struct member visibility
    const structVisibility = /struct\\s+\\w+\\s*{[^}]*\\b(public|private|internal|external)\\b/;
    if (structVisibility.test(content)) {
      result.totalChecks++;
      result.failed++;
      result.compilationBlockers.push('CRITICAL: Struct members cannot have visibility keywords');
      result.criticalFailures.push('Illegal struct member visibility');
    } else {
      result.totalChecks++;
      result.passed++;
    }
  }

  private validateStorageIsolation(content: string, result: ValidationResult): void {
    result.totalChecks++;
    
    // Check for proper storage library pattern
    const hasStorageLibrary = /library\\s+\\w+Storage\\s*{/.test(content);
    const hasStorageSlot = /bytes32\\s+internal\\s+constant\\s+STORAGE_SLOT/.test(content);
    const hasLayoutStruct = /struct\\s+Layout\\s*{/.test(content);
    const hasAssemblySlot = /assembly\\s*{[^}]*slot\\s*:=\\s*slot[^}]*}/.test(content);

    if (hasStorageLibrary && hasStorageSlot && hasLayoutStruct && hasAssemblySlot) {
      result.passed++;
    } else {
      result.failed++;
      result.warnings.push('Storage isolation pattern incomplete');
    }
  }

  private validateModifierPatterns(content: string, result: ValidationResult): void {
    const expectedModifiers = [
      'onlyDispatcher',
      'onlyInitialized', 
      'whenNotPaused',
      'nonReentrant'
    ];

    expectedModifiers.forEach(modifier => {
      result.totalChecks++;
      
      if (content.includes(`modifier ${modifier}(`)) {
        result.passed++;
      } else {
        result.failed++;
        result.warnings.push(`Missing expected modifier: ${modifier}`);
      }
    });
  }

  private extractContractName(content: string): string {
    const match = content.match(/contract\\s+(\\w+)/);
    return match?.[1] || 'Unknown';
  }

  private isBuiltinType(type: string): boolean {
    const builtins = ['uint256', 'address', 'bool', 'bytes32', 'string', 'bytes'];
    return builtins.includes(type);
  }

  printResults(result: ValidationResult): void {
    console.log(`\\n🔍 AI NATIVE PATTERN VALIDATION: ${result.contractName}`);
    console.log('═'.repeat(60));
    
    const passRate = ((result.passed / result.totalChecks) * 100).toFixed(1);
    const status = result.compilationBlockers.length > 0 ? '❌ COMPILATION BLOCKED' : 
                   result.criticalFailures.length > 0 ? '⚠️  CRITICAL ISSUES' :
                   parseFloat(passRate) >= 90 ? '✅ PRODUCTION READY' : '🔄 NEEDS IMPROVEMENT';
    
    console.log(`Status: ${status}`);
    console.log(`Pass Rate: ${result.passed}/${result.totalChecks} (${passRate}%)`);
    
    if (result.compilationBlockers.length > 0) {
      console.log('\\n🚫 COMPILATION BLOCKERS:');
      result.compilationBlockers.forEach(blocker => console.log(`   ${blocker}`));
    }
    
    if (result.criticalFailures.length > 0) {
      console.log('\\n💥 CRITICAL FAILURES:');
      result.criticalFailures.forEach(failure => console.log(`   ${failure}`));
    }
    
    if (result.nativePatternViolations.length > 0) {
      console.log('\\n🔧 NATIVE PATTERN VIOLATIONS:');
      result.nativePatternViolations.forEach(violation => console.log(`   ${violation}`));
    }
    
    if (result.warnings.length > 0) {
      console.log('\\n⚠️  WARNINGS:');
      result.warnings.forEach(warning => console.log(`   ${warning}`));
    }

    console.log('\\n📚 NATIVE PATTERNS REFERENCE:');
    this.nativePatterns.forEach((pattern, key) => {
      console.log(`   ${pattern.name}: ${pattern.correctUsage}`);
    });
  }
}

// CLI usage
if (require.main === module) {
  const contractPath = process.argv[2];
  if (!contractPath) {
    console.error('Usage: node ai-native-validator.ts <contract-path>');
    process.exit(1);
  }

  const validator = new NativePatternValidator();
  const result = validator.validateContract(contractPath);
  validator.printResults(result);
  
  // Exit with error code if compilation blocked
  if (result.compilationBlockers.length > 0) {
    process.exit(1);
  }
}

export { NativePatternValidator, ValidationResult, NativePattern };

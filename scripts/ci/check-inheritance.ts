/**
 * CI Guard: Check inheritance patterns in facets - Fix #8
 * 
 * Validates that generated facets don't inherit from OpenZeppelin 
 * contracts that conflict with Diamond pattern (Ownable, Pausable, ReentrancyGuard)
 */

import * as fs from 'fs';
import * as path from 'path';

interface InheritanceValidationResult {
  file: string;
  errors: string[];
  warnings: string[];
  inheritedContracts: string[];
}

class InheritanceValidator {
  private results: InheritanceValidationResult[] = [];
  
  // Problematic contracts that conflict with Diamond pattern
  private prohibitedInheritance = [
    'Ownable',
    'Pausable', 
    'ReentrancyGuard',
    'AccessControl', // Should use LibDiamond access control
    'Initializable' // Diamond has its own initialization
  ];

  async validateFacetsDirectory(facetsPath: string): Promise<void> {
    console.log('🔍 Validating facet inheritance patterns...');
    
    if (!fs.existsSync(facetsPath)) {
      console.error(`❌ Facets directory not found: ${facetsPath}`);
      return;
    }

    const files = fs.readdirSync(facetsPath)
      .filter(file => file.endsWith('.sol'))
      .map(file => path.join(facetsPath, file));

    for (const file of files) {
      await this.validateFacet(file);
    }

    this.printResults();
  }

  private async validateFacet(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result: InheritanceValidationResult = {
      file: path.basename(filePath),
      errors: [],
      warnings: [],
      inheritedContracts: []
    };

    // Extract contract inheritance
    const contractMatch = content.match(/contract\s+\w+\s+is\s+([^{]+)\s*\{/);
    if (contractMatch) {
      const inheritanceList = contractMatch[1];
      const inherited = inheritanceList.split(',').map(c => c.trim());
      result.inheritedContracts = inherited;

      // Check for prohibited inheritance
      for (const contract of inherited) {
        if (this.prohibitedInheritance.some(prohibited => contract.includes(prohibited))) {
          result.errors.push(`Prohibited inheritance: ${contract} - Use LibDiamond patterns instead`);
        }
      }
    }

    // Check for direct OpenZeppelin imports that suggest problematic inheritance
    const ozImports = [...content.matchAll(/@openzeppelin\/contracts\/(access|security|utils)\/(Ownable|Pausable|ReentrancyGuard|AccessControl)/g)];
    for (const [, category, contractName] of ozImports) {
      result.warnings.push(`OpenZeppelin import detected: ${contractName} - Ensure compatibility with Diamond pattern`);
    }

    // Check for constructor presence (should be none in facets)
    if (/constructor\s*\(/g.test(content)) {
      result.errors.push('Facets must not have constructors - use initialization functions');
    }

    // Check for proper modifier patterns
    const hasOnlyDispatcher = content.includes('onlyDispatcher');
    const hasLibDiamondUsage = content.includes('LibDiamond');
    
    if (!hasOnlyDispatcher && !hasLibDiamondUsage) {
      result.warnings.push('No Diamond-specific access control detected - ensure proper security');
    }

    // Check for state variable initialization (should be in storage structs)
    const stateInitializations = [...content.matchAll(/(\w+)\s+(public|private|internal)\s+\w+\s*=\s*[^;]+;/g)];
    if (stateInitializations.length > 0) {
      result.warnings.push(`${stateInitializations.length} initialized state variables - use storage structs for Diamond compatibility`);
    }

    this.results.push(result);
  }

  private printResults(): void {
    let totalErrors = 0;
    let totalWarnings = 0;

    console.log('\n📊 Inheritance Validation Results:');
    console.log('═'.repeat(50));

    for (const result of this.results) {
      if (result.errors.length > 0 || result.warnings.length > 0) {
        console.log(`\n📄 ${result.file}:`);
        
        if (result.inheritedContracts.length > 0) {
          console.log(`  📋 Inherits: ${result.inheritedContracts.join(', ')}`);
        }
        
        for (const error of result.errors) {
          console.log(`  ❌ ERROR: ${error}`);
          totalErrors++;
        }
        
        for (const warning of result.warnings) {
          console.log(`  ⚠️  WARNING: ${warning}`);
          totalWarnings++;
        }
      } else {
        console.log(`✅ ${result.file}: Inheritance patterns are Diamond-compatible`);
      }
    }

    console.log('\n📈 Summary:');
    console.log(`  📄 Files checked: ${this.results.length}`);
    console.log(`  ❌ Total errors: ${totalErrors}`);
    console.log(`  ⚠️  Total warnings: ${totalWarnings}`);

    if (totalErrors > 0) {
      console.log('\n❌ Inheritance validation FAILED');
      console.log('\n💡 Diamond Pattern Guidelines:');
      console.log('  • No Ownable - use LibDiamond.requireRole()');
      console.log('  • No Pausable - use onlyDispatcher + whenNotPaused');
      console.log('  • No ReentrancyGuard - use nonReentrant modifier');
      console.log('  • No constructors - use init functions');
      console.log('  • Use storage structs - avoid direct state variables');
      process.exit(1);
    } else {
      console.log('\n✅ Inheritance validation PASSED');
    }
  }
}

// Main execution
async function main() {
  const validator = new InheritanceValidator();
  
  // Check multiple potential facet directories
  const facetDirectories = [
    'contracts/facets',
    'contracts/demo/generated-facets',
    'demo-value-proposition/generated-facets'
  ];

  for (const dir of facetDirectories) {
    if (fs.existsSync(dir)) {
      await validator.validateFacetsDirectory(dir);
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { InheritanceValidator };

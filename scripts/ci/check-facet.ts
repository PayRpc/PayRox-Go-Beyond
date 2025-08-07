/**
 * CI Guard: Check generated facets for proper structure - Fix #8
 * 
 * Validates:
 * - No constructor in facets
 * - No public state variables 
 * - No duplicates in Layout
 * - Proper modifiers on functions
 */

import * as fs from 'fs';
import * as path from 'path';

interface FacetValidationResult {
  file: string;
  errors: string[];
  warnings: string[];
}

class FacetValidator {
  private results: FacetValidationResult[] = [];

  async validateFacetsDirectory(facetsPath: string): Promise<void> {
    console.log('🔍 Validating generated facets...');
    
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
    const result: FacetValidationResult = {
      file: path.basename(filePath),
      errors: [],
      warnings: []
    };

    // Check #1: No constructor
    if (/constructor\s*\(/g.test(content)) {
      result.errors.push('Facets must not have constructors');
    }

    // Check #2: No public state variables
    const publicStateVars = content.match(/^\s*(uint|int|bool|bytes|address|mapping).*\s+public\s+/gm);
    if (publicStateVars) {
      result.errors.push(`Found ${publicStateVars.length} public state variables - use internal/private only`);
    }

    // Check #3: No duplicates in Layout struct
    const layoutMatch = content.match(/struct\s+Layout\s*\{([^}]+)\}/s);
    if (layoutMatch) {
      const layoutContent = layoutMatch[1];
      const fieldNames = [...layoutContent.matchAll(/(\w+)\s*;/g)].map(m => m[1]);
      const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
      if (duplicates.length > 0) {
        result.errors.push(`Duplicate fields in Layout: ${duplicates.join(', ')}`);
      }
    }

    // Check #4: Proper modifiers on non-view functions
    const functions = [...content.matchAll(/function\s+(\w+)\([^)]*\)\s+(external|public)(?:\s+(\w+(?:\s+\w+)*))?(?:\s+returns\s*\([^)]*\))?\s*\{/g)];
    for (const func of functions) {
      const [, funcName, visibility, modifiers] = func;
      const isViewOrPure = modifiers && /\b(view|pure)\b/.test(modifiers);
      
      if (!isViewOrPure) {
        const hasOnlyDispatcher = modifiers && modifiers.includes('onlyDispatcher');
        const hasOnlyInitialized = modifiers && modifiers.includes('onlyInitialized');
        const hasNonReentrant = modifiers && modifiers.includes('nonReentrant');
        const hasWhenNotPaused = modifiers && modifiers.includes('whenNotPaused');

        if (!hasOnlyDispatcher) {
          result.errors.push(`Function ${funcName} missing onlyDispatcher modifier`);
        }
        if (!hasOnlyInitialized) {
          result.errors.push(`Function ${funcName} missing onlyInitialized modifier`);
        }
        if (!hasNonReentrant) {
          result.warnings.push(`Function ${funcName} missing nonReentrant modifier`);
        }
        if (!hasWhenNotPaused) {
          result.warnings.push(`Function ${funcName} missing whenNotPaused modifier`);
        }
      }
    }

    // Check #5: External over public preference
    const publicFunctions = [...content.matchAll(/function\s+(\w+)\([^)]*\)\s+public/g)];
    if (publicFunctions.length > 0) {
      result.warnings.push(`Prefer external over public for ${publicFunctions.length} functions`);
    }

    this.results.push(result);
  }

  private printResults(): void {
    let totalErrors = 0;
    let totalWarnings = 0;

    console.log('\n📊 Facet Validation Results:');
    console.log('═'.repeat(50));

    for (const result of this.results) {
      if (result.errors.length > 0 || result.warnings.length > 0) {
        console.log(`\n📄 ${result.file}:`);
        
        for (const error of result.errors) {
          console.log(`  ❌ ERROR: ${error}`);
          totalErrors++;
        }
        
        for (const warning of result.warnings) {
          console.log(`  ⚠️  WARNING: ${warning}`);
          totalWarnings++;
        }
      } else {
        console.log(`✅ ${result.file}: All checks passed`);
      }
    }

    console.log('\n📈 Summary:');
    console.log(`  📄 Files checked: ${this.results.length}`);
    console.log(`  ❌ Total errors: ${totalErrors}`);
    console.log(`  ⚠️  Total warnings: ${totalWarnings}`);

    if (totalErrors > 0) {
      console.log('\n❌ Facet validation FAILED - Fix errors before deployment');
      process.exit(1);
    } else {
      console.log('\n✅ Facet validation PASSED');
    }
  }
}

// Main execution
async function main() {
  const validator = new FacetValidator();
  
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

export { FacetValidator };

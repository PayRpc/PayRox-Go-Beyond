#!/usr/bin/env ts-node

/**
 * PayRox Template Generator Must-Fix Validator
 * 
 * Validates generated facets against PayRox Go Beyond standards
 * Ensures Template Generator compliance and production readiness
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  passed: boolean;
  score: number;
  violations: string[];
  warnings: string[];
  facetPath?: string;
}

export class MustFixValidator {
  private payRoxRules = {
    // Critical Rules (Must-Fix)
    noConstructors: true,
    requireInit: true,
    requireDispatcherGating: true,
    requireProperModifiers: true,
    
    // Important Rules (Should-Fix)
    requireEvents: true,
    requireNatSpec: true,
    requireErrorHandling: true,
    
    // Style Rules (Nice-to-Fix)
    requireConsistentNaming: true,
    requireASCIIOnly: true
  };

  async validateFacet(facetPath: string): Promise<ValidationResult> {
    console.log(`🔍 Validating facet: ${path.basename(facetPath)}`);
    
    if (!fs.existsSync(facetPath)) {
      return {
        passed: false,
        score: 0,
        violations: [`File not found: ${facetPath}`],
        warnings: []
      };
    }

    const content = fs.readFileSync(facetPath, 'utf8');
    const violations: string[] = [];
    const warnings: string[] = [];
    
    // Critical validations
    if (this.payRoxRules.noConstructors && content.includes('constructor(')) {
      violations.push('CRITICAL: Constructors not allowed in facets - use init() pattern');
    }
    
    if (this.payRoxRules.requireInit && !content.includes('initialize')) {
      violations.push('CRITICAL: Missing initialization function');
    }
    
    if (this.payRoxRules.requireDispatcherGating && !content.includes('onlyDispatcher')) {
      violations.push('CRITICAL: Missing dispatcher gating (onlyDispatcher modifier)');
    }
    
    if (this.payRoxRules.requireProperModifiers) {
      if (!content.includes('whenInitialized')) {
        violations.push('CRITICAL: Missing whenInitialized modifier');
      }
      if (!content.includes('nonReentrant') && this.isStateChangingFacet(content)) {
        warnings.push('Missing nonReentrant modifier for state-changing functions');
      }
    }
    
    // Important validations
    if (this.payRoxRules.requireEvents && !content.includes('event ')) {
      warnings.push('No events defined - consider adding for transparency');
    }
    
    if (this.payRoxRules.requireNatSpec && !content.includes('/**')) {
      warnings.push('Missing NatSpec documentation');
    }
    
    if (this.payRoxRules.requireErrorHandling && !content.includes('error ')) {
      warnings.push('No custom errors defined - consider adding for gas efficiency');
    }
    
    // Style validations
    if (this.payRoxRules.requireConsistentNaming) {
      const facetNameMatch = content.match(/contract\s+(\w+)/);
      if (facetNameMatch && !facetNameMatch[1].endsWith('Facet')) {
        warnings.push('Contract name should end with "Facet"');
      }
    }
    
    if (this.payRoxRules.requireASCIIOnly) {
      // Check for non-ASCII characters
      for (let i = 0; i < content.length; i++) {
        if (content.charCodeAt(i) > 127) {
          violations.push('CRITICAL: Non-ASCII characters detected - incompatible with deterministic deployment');
          break;
        }
      }
    }
    
    // Calculate score
    const totalChecks = Object.keys(this.payRoxRules).length;
    const passedChecks = totalChecks - violations.length;
    const score = Math.round((passedChecks / totalChecks) * 100);
    const passed = violations.length === 0;
    
    console.log(`📊 Score: ${score}% (${passedChecks}/${totalChecks} checks passed)`);
    if (violations.length > 0) {
      console.log(`❌ ${violations.length} critical violations found`);
    }
    if (warnings.length > 0) {
      console.log(`⚠️  ${warnings.length} warnings found`);
    }
    
    return {
      passed,
      score,
      violations,
      warnings,
      facetPath
    };
  }

  private isStateChangingFacet(content: string): boolean {
    // Check if facet has state-changing functions
    const stateChangingPatterns = [
      /function\s+\w+.*\)\s+external(?!\s+view)(?!\s+pure)/g,
      /function\s+\w+.*\)\s+public(?!\s+view)(?!\s+pure)/g
    ];
    
    return stateChangingPatterns.some(pattern => pattern.test(content));
  }

  async validateGeneratedFacets(outputDir: string = './contracts/generated-facets'): Promise<ValidationResult[]> {
    console.log('🏗️ Validating all generated facets...');
    
    if (!fs.existsSync(outputDir)) {
      console.log(`⚠️  Output directory not found: ${outputDir}`);
      return [];
    }
    
    const facetFiles = fs.readdirSync(outputDir)
      .filter(file => file.endsWith('.sol'))
      .map(file => path.join(outputDir, file));
    
    if (facetFiles.length === 0) {
      console.log('📭 No generated facets found');
      return [];
    }
    
    const results: ValidationResult[] = [];
    
    for (const facetFile of facetFiles) {
      const result = await this.validateFacet(facetFile);
      results.push(result);
    }
    
    // Summary
    const totalFacets = results.length;
    const passedFacets = results.filter(r => r.passed).length;
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / totalFacets;
    
    console.log('\n📋 Validation Summary:');
    console.log(`📊 Facets: ${passedFacets}/${totalFacets} passed`);
    console.log(`📈 Average Score: ${averageScore.toFixed(1)}%`);
    
    if (passedFacets === totalFacets) {
      console.log('✅ All facets passed validation!');
    } else {
      console.log('❌ Some facets need fixes before production use');
    }
    
    return results;
  }
}

// CLI Interface
if (require.main === module) {
  const validator = new MustFixValidator();
  
  const command = process.argv[2];
  
  if (command === 'all' || !command) {
    validator.validateGeneratedFacets()
      .then(results => {
        const allPassed = results.every(r => r.passed);
        process.exit(allPassed ? 0 : 1);
      })
      .catch(error => {
        console.error('❌ Validation failed:', error.message);
        process.exit(1);
      });
  } else if (command && fs.existsSync(command)) {
    validator.validateFacet(command)
      .then(result => {
        process.exit(result.passed ? 0 : 1);
      })
      .catch(error => {
        console.error('❌ Validation failed:', error.message);
        process.exit(1);
      });
  } else {
    console.log('PayRox Template Generator Must-Fix Validator');
    console.log('Usage:');
    console.log('  npm run templates:validate [all]     - Validate all generated facets');
    console.log('  npm run templates:validate <file>    - Validate specific facet file');
  }
}

export default MustFixValidator;

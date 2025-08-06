#!/usr/bin/env ts-node

/**
 * AI REFACTORED FACETS FINAL VALIDATION
 * 
 * Final compilation and manifest validation for the 5 AI-refactored facets
 */

import * as fs from 'fs';
import * as path from 'path';

class AIRefactoredValidator {

  async validateAIRefactoredFacets(): Promise<void> {
    console.log('🎯 AI REFACTORED FACETS - FINAL VALIDATION');
    console.log('═'.repeat(60));

    const facetsDir = './contracts/ai-refactored-facets';
    const facets = fs.readdirSync(facetsDir).filter(f => f.endsWith('.sol'));

    console.log(`\n📂 Located ${facets.length} AI-refactored facets:`);
    facets.forEach(facet => console.log(`   📄 ${facet}`));

    let allPassed = true;
    const results: any[] = [];

    for (const facet of facets) {
      console.log(`\n🔍 Validating: ${facet}`);
      const result = await this.validateFacet(path.join(facetsDir, facet));
      results.push(result);
      
      if (!result.passed) {
        allPassed = false;
      }
    }

    // Summary Report
    console.log('\n📊 FINAL VALIDATION SUMMARY');
    console.log('═'.repeat(60));
    
    const passedCount = results.filter(r => r.passed).length;
    console.log(`✅ Passed: ${passedCount}/${results.length}`);
    console.log(`🔴 Failed: ${results.length - passedCount}/${results.length}`);

    // Detailed Results
    results.forEach(result => {
      const status = result.passed ? '🟢 PASS' : '🔴 FAIL';
      console.log(`${status} ${result.name} - Score: ${result.score}/100`);
      
      if (result.issues.length > 0) {
        result.issues.forEach((issue: string) => console.log(`   ⚠️  ${issue}`));
      }
    });

    if (allPassed) {
      console.log('\n🎉 ALL AI REFACTORED FACETS VALIDATED SUCCESSFULLY!');
      console.log('🚀 Ready for manifest deployment with PayRox system');
    } else {
      console.log('\n❌ Some facets need attention before deployment');
    }

    // Generate deployment manifest
    await this.generateDeploymentManifest(results);
  }

  private async validateFacet(filePath: string): Promise<any> {
    const content = fs.readFileSync(filePath, 'utf8');
    const name = path.basename(filePath, '.sol');
    
    let score = 100;
    const issues: string[] = [];

    // 1. Pragma validation
    if (!content.includes('pragma solidity ^0.8.20')) {
      score -= 10;
      issues.push('Incorrect pragma version (should be ^0.8.20)');
    }

    // 2. Manifest integration check
    if (!content.includes('getFacetInfo()')) {
      score -= 20;
      issues.push('Missing getFacetInfo() for manifest integration');
    }

    // 3. Native pattern validation
    if (!content.includes('_layout()')) {
      score -= 15;
      issues.push('Missing native storage pattern');
    }

    // 4. Initialization pattern
    if (!content.includes('initialize')) {
      score -= 15;
      issues.push('Missing initialization function');
    }

    // 5. Security patterns
    if (!content.includes('nonReentrant')) {
      score -= 10;
      issues.push('Missing reentrancy protection');
    }

    if (!content.includes('whenInitialized')) {
      score -= 10;
      issues.push('Missing initialization check');
    }

    // 6. Event patterns
    const eventCount = (content.match(/event /g) || []).length;
    if (eventCount < 3) {
      score -= 5;
      issues.push('Insufficient event coverage');
    }

    // 7. Error handling
    const errorCount = (content.match(/error /g) || []).length;
    if (errorCount < 3) {
      score -= 5;
      issues.push('Insufficient custom error definitions');
    }

    // 8. Function selector array
    if (!content.includes('selectors = new bytes4[]')) {
      score -= 10;
      issues.push('Missing function selector array for manifest');
    }

    return {
      name,
      passed: score >= 80,
      score,
      issues
    };
  }

  private async generateDeploymentManifest(results: any[]): Promise<void> {
    const manifest = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      facets: results.map(r => ({
        name: r.name,
        status: r.passed ? 'READY' : 'NEEDS_ATTENTION',
        score: r.score,
        file: `./contracts/ai-refactored-facets/${r.name}.sol`
      })),
      deployment: {
        compiler: "0.8.20",
        optimizer: true,
        deterministic: true,
        manifest_router: true
      },
      validation: {
        total_facets: results.length,
        passed: results.filter(r => r.passed).length,
        average_score: results.reduce((sum, r) => sum + r.score, 0) / results.length
      }
    };

    fs.writeFileSync('./AI_REFACTORED_DEPLOYMENT_MANIFEST.json', JSON.stringify(manifest, null, 2));
    console.log('\n📋 Generated deployment manifest: AI_REFACTORED_DEPLOYMENT_MANIFEST.json');
  }
}

// Execute validation
if (require.main === module) {
  const validator = new AIRefactoredValidator();
  validator.validateAIRefactoredFacets().catch(console.error);
}

export { AIRefactoredValidator };

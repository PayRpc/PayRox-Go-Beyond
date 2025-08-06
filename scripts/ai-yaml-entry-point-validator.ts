#!/usr/bin/env ts-node

/**
 * AI YAML Entry Point Validator
 * 
 * Ensures all AI learning components are properly connected to YAML configuration
 * and provides a comprehensive system health check.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface YamlConfig {
  entryPoints?: {
    ai?: {
      [key: string]: string;
    };
    orchestration?: {
      [key: string]: string;
    };
  };
  aiRefactoring?: {
    [key: string]: any;
  };
}

interface ValidationResult {
  component: string;
  connected: boolean;
  yamlEntry: string;
  scriptExists: boolean;
  npmScript: string;
  status: 'CONNECTED' | 'MISSING_YAML' | 'MISSING_SCRIPT' | 'MISSING_NPM' | 'DISCONNECTED';
}

class AIYamlEntryPointValidator {

  async validateConnection(): Promise<void> {
    console.log('🔗 Validating AI Learning System → YAML Entry Point Connections...');
    console.log('═'.repeat(70));

    // Load YAML config
    const yamlPath = './config/app.release.yaml';
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    const config = yaml.load(yamlContent) as YamlConfig;

    // Load package.json
    const packagePath = './package.json';
    const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    // Check AI components
    const results: ValidationResult[] = [];

    // Core AI Learning Components
    const aiComponents = [
      {
        component: 'AI Manifest Learning',
        yamlEntry: 'manifestLearning',
        script: 'scripts/ai-manifest-aware-validator.ts',
        npmScript: 'ai:manifest:validate'
      },
      {
        component: 'AI Facet Fixing', 
        yamlEntry: 'facetValidation',
        script: 'scripts/ai-complete-facet-fixer.ts',
        npmScript: 'ai:facet:fix'
      },
      {
        component: 'AI Architecture Mastery',
        yamlEntry: 'architectureMastery',
        script: 'AI_COMPLETE_ARCHITECTURE_MASTERY.md',
        npmScript: 'ai:architecture:mastery'
      },
      {
        component: 'AI Learning Status',
        yamlEntry: 'status',
        script: 'scripts/ai-status-check.ts',
        npmScript: 'ai:learning:status'
      }
    ];

    for (const component of aiComponents) {
      const result = this.validateComponent(component, config, packageContent);
      results.push(result);
    }

    // Report results
    this.generateReport(results);

    // Validate generated facets
    await this.validateGeneratedFacets();

    // Test key connections
    await this.testConnections(config);
  }

  private validateComponent(
    component: { component: string; yamlEntry: string; script: string; npmScript: string },
    config: YamlConfig,
    packageContent: any
  ): ValidationResult {
    const yamlConnected = config.entryPoints?.ai?.[component.yamlEntry] !== undefined;
    const scriptExists = fs.existsSync(component.script);
    const npmScriptExists = packageContent.scripts?.[component.npmScript] !== undefined;

    let status: ValidationResult['status'] = 'CONNECTED';
    if (!yamlConnected) status = 'MISSING_YAML';
    else if (!scriptExists) status = 'MISSING_SCRIPT';
    else if (!npmScriptExists) status = 'MISSING_NPM';

    return {
      component: component.component,
      connected: yamlConnected && scriptExists && npmScriptExists,
      yamlEntry: config.entryPoints?.ai?.[component.yamlEntry] || 'MISSING',
      scriptExists,
      npmScript: component.npmScript,
      status
    };
  }

  private generateReport(results: ValidationResult[]): void {
    console.log('\\n📊 AI LEARNING SYSTEM CONNECTION REPORT');
    console.log('═'.repeat(50));

    results.forEach(result => {
      const statusIcon = this.getStatusIcon(result.status);
      console.log(`\\n${statusIcon} ${result.component}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   YAML Entry: ${result.yamlEntry}`);
      console.log(`   Script Exists: ${result.scriptExists ? '✅' : '❌'}`);
      console.log(`   NPM Script: ${result.npmScript}`);
    });

    // Summary
    const connected = results.filter(r => r.connected).length;
    const total = results.length;
    
    console.log('\\n📈 CONNECTION SUMMARY');
    console.log('═'.repeat(30));
    console.log(`Connected: ${connected}/${total}`);
    console.log(`Success Rate: ${((connected/total) * 100).toFixed(1)}%`);

    if (connected === total) {
      console.log('\\n🎉 ALL AI COMPONENTS PROPERLY CONNECTED TO YAML!');
    } else {
      console.log(`\\n⚠️  ${total - connected} components need attention`);
    }
  }

  private getStatusIcon(status: ValidationResult['status']): string {
    switch (status) {
      case 'CONNECTED': return '🟢';
      case 'MISSING_YAML': return '🟡';
      case 'MISSING_SCRIPT': return '🟠';
      case 'MISSING_NPM': return '🔴';
      case 'DISCONNECTED': return '⚫';
      default: return '⚪';
    }
  }

  private async validateGeneratedFacets(): Promise<void> {
    console.log('\\n🔍 Validating Generated Facets Integration...');
    
    const facetsDir = './contracts/generated-facets-v2';
    if (!fs.existsSync(facetsDir)) {
      console.log('❌ Generated facets directory not found');
      return;
    }

    const files = fs.readdirSync(facetsDir).filter(f => f.endsWith('.sol'));
    console.log(`✅ Found ${files.length} generated facets`);

    // Check if facets have manifest integration
    let manifestReady = 0;
    for (const file of files) {
      const content = fs.readFileSync(path.join(facetsDir, file), 'utf8');
      if (content.includes('getFacetInfo()')) {
        manifestReady++;
      }
    }

    console.log(`✅ ${manifestReady}/${files.length} facets have manifest integration`);
    
    if (manifestReady === files.length) {
      console.log('🎯 All facets are manifest-ready!');
    }
  }

  private async testConnections(config: YamlConfig): Promise<void> {
    console.log('\\n🧪 Testing Key AI Entry Points...');

    // Test manifest check
    try {
      const manifestEntry = config.entryPoints?.orchestration?.manifest;
      if (manifestEntry) {
        console.log(`✅ Manifest entry point found: ${manifestEntry}`);
      }
    } catch (error) {
      console.log('❌ Manifest entry point test failed');
    }

    // Test AI learning documentation
    const learningDocs = [
      'AI_MANIFEST_SYSTEM_LEARNING.md',
      'AI_COMPLETE_ARCHITECTURE_MASTERY.md',
      'AI_DEEP_LEARNING_COMPLETE.md'
    ];

    learningDocs.forEach(doc => {
      const exists = fs.existsSync(doc);
      console.log(`${exists ? '✅' : '❌'} ${doc}`);
    });

    console.log('\\n🔗 Entry Point Validation Complete!');
  }

  async runFullValidation(): Promise<void> {
    console.log('🚀 Running Full AI System Validation...');
    console.log('═'.repeat(60));

    // 1. Validate connections
    await this.validateConnection();

    // 2. Run manifest-aware validation
    console.log('\\n🔧 Running AI Manifest Validation...');
    try {
      const { ManifestAwareFacetValidator } = await import('./ai-manifest-aware-validator');
      const validator = new ManifestAwareFacetValidator();
      await validator.validateAllFacets();
    } catch (error) {
      console.log('❌ Manifest validation failed:', error);
    }

    console.log('\\n✅ Full AI System Validation Complete!');
  }
}

// Execute validation
if (require.main === module) {
  const validator = new AIYamlEntryPointValidator();
  validator.runFullValidation().catch(console.error);
}

export { AIYamlEntryPointValidator };

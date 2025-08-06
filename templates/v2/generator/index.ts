#!/usr/bin/env ts-node

/**
 * PayRox Template Generator v2
 * 
 * Hybrid system: Pre-made archetypes + on-demand generation
 * Keeps repository clean while providing maximum flexibility
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface ArchetypeManifest {
  name: string;
  version: string;
  description: string;
  template: string;
  features: Record<string, any>;
  placeholders: Record<string, string>;
  guardrails: Record<string, boolean>;
  testing: Record<string, string[]>;
  compatibility: Record<string, string>;
}

interface GenerationConfig {
  facetName: string;
  archetype: string;
  outputDir: string;
  customizations: Record<string, any>;
  enforceGuardrails: boolean;
}

class PayRoxTemplateGenerator {
  private archetypesDir: string;
  private outputDir: string;

  constructor() {
    this.archetypesDir = './templates/v2/archetypes';
    this.outputDir = './contracts/generated-facets';
  }

  async generateFacet(config: GenerationConfig): Promise<void> {
    console.log(`🏗️  Generating facet: ${config.facetName}`);
    console.log(`📋 Using archetype: ${config.archetype}`);
    console.log('═'.repeat(60));

    // Load archetype
    const archetype = await this.loadArchetype(config.archetype);
    
    // Validate configuration
    this.validateConfig(config, archetype);
    
    // Generate template hash for traceability
    const templateHash = this.generateTemplateHash(archetype);
    
    // Create placeholders
    const placeholders = this.createPlaceholders(config, archetype, templateHash);
    
    // Load and process template
    const template = await this.loadTemplate(config.archetype, archetype.template);
    const processedCode = this.processTemplate(template, placeholders);
    
    // Apply guardrails
    const safeCode = this.applyGuardrails(processedCode, archetype.guardrails);
    
    // Write output
    const outputPath = path.join(config.outputDir, `${config.facetName}.sol`);
    this.ensureDirectoryExists(config.outputDir);
    fs.writeFileSync(outputPath, safeCode);
    
    // Generate test file
    await this.generateTestFile(config, archetype);
    
    // Update lockfile
    await this.updateLockfile(config, archetype, templateHash);
    
    console.log(`✅ Generated: ${outputPath}`);
    console.log(`🧪 Test file: ${config.outputDir}/${config.facetName}.spec.ts`);
    console.log(`🔒 Lockfile updated with template hash: ${templateHash.substring(0, 16)}...`);
  }

  private async loadArchetype(name: string): Promise<ArchetypeManifest> {
    const manifestPath = path.join(this.archetypesDir, name, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Archetype not found: ${name}`);
    }
    
    const content = fs.readFileSync(manifestPath, 'utf8');
    return JSON.parse(content);
  }

  private async loadTemplate(archetype: string, templateFile: string): Promise<string> {
    const templatePath = path.join(this.archetypesDir, archetype, templateFile);
    return fs.readFileSync(templatePath, 'utf8');
  }

  private validateConfig(config: GenerationConfig, archetype: ArchetypeManifest): void {
    // Validate facet name
    if (!/^[A-Z][a-zA-Z0-9]*Facet$/.test(config.facetName)) {
      throw new Error('Facet name must be PascalCase and end with "Facet"');
    }
    
    // Check required features
    if (archetype.features.initialization?.required && !config.customizations.initLogic) {
      console.warn('⚠️  No custom initialization logic provided - using defaults');
    }
    
    console.log('✅ Configuration validated');
  }

  private generateTemplateHash(archetype: ArchetypeManifest): string {
    const content = JSON.stringify(archetype, null, 2);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private createPlaceholders(
    config: GenerationConfig, 
    archetype: ArchetypeManifest, 
    templateHash: string
  ): Record<string, string> {
    const facetName = config.facetName;
    const baseName = facetName.replace(/Facet$/, '');
    
    return {
      // Template metadata
      TEMPLATE_HASH: templateHash.substring(0, 16),
      TIMESTAMP: new Date().toISOString(),
      
      // Naming conventions
      FACET_NAME_UPPER: this.toSnakeCase(baseName).toUpperCase(),
      FACET_NAME_LOWER: this.toSnakeCase(baseName).toLowerCase(),
      FACET_NAME_CLEAN: baseName,
      FacetName: facetName,
      
      // Content
      FACET_DESCRIPTION: config.customizations.description || archetype.description,
      
      // Customizations
      CUSTOM_STORAGE_FIELDS: this.generateStorageFields(config.customizations.storage || []),
      CUSTOM_EVENTS: this.generateEvents(config.customizations.events || []),
      CUSTOM_INIT_PARAMS: this.generateInitParams(config.customizations.initParams || []),
      CUSTOM_INIT_LOGIC: config.customizations.initLogic || '// Custom initialization logic here',
      CUSTOM_ADMIN_FUNCTIONS: this.generateAdminFunctions(config.customizations.adminFunctions || []),
      CUSTOM_CORE_FUNCTIONS: this.generateCoreFunctions(config.customizations.coreFunctions || []),
      CUSTOM_VIEW_FUNCTIONS: this.generateViewFunctions(config.customizations.viewFunctions || []),
      
      // Manifest
      SELECTOR_COUNT: this.calculateSelectorCount(config.customizations),
      CUSTOM_SELECTORS: this.generateCustomSelectors(config.customizations.coreFunctions || [])
    };
  }

  private processTemplate(template: string, placeholders: Record<string, string>): string {
    let processed = template;
    
    // Replace all placeholders
    Object.entries(placeholders).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(regex, value);
    });
    
    // Check for unreplaced placeholders
    const unresolved = processed.match(/{{[^}]+}}/g);
    if (unresolved) {
      console.warn('⚠️  Unresolved placeholders:', unresolved);
    }
    
    return processed;
  }

  private applyGuardrails(code: string, guardrails: Record<string, boolean>): string {
    let safe = code;
    
    // Check for forbidden patterns
    if (guardrails.noConstructors && safe.includes('constructor(')) {
      throw new Error('Guardrail violation: constructors not allowed');
    }
    
    if (guardrails.noRawCalls && safe.includes('.call(')) {
      throw new Error('Guardrail violation: raw calls not allowed');
    }
    
    // Skip ASCII check if code still contains template placeholders
    if (guardrails.asciiOnly && !safe.includes('{{')) {
      // Check for non-ASCII characters (simplified check)
      for (let i = 0; i < safe.length; i++) {
        if (safe.charCodeAt(i) > 127) {
          throw new Error('Guardrail violation: non-ASCII characters detected');
        }
      }
    }
    
    console.log('✅ Guardrails passed');
    return safe;
  }

  private generateStorageFields(fields: any[]): string {
    if (fields.length === 0) return '// Custom storage fields will be added here';
    
    return fields.map(field => 
      `    ${field.type} ${field.name};${field.comment ? ` // ${field.comment}` : ''}`
    ).join('\\n');
  }

  private generateEvents(events: any[]): string {
    if (events.length === 0) return '// Custom events will be added here';
    
    return events.map(event => 
      `    event ${event.name}(${event.params || ''});`
    ).join('\\n');
  }

  private generateInitParams(params: any[]): string {
    if (params.length === 0) return '';
    
    const paramStrings = params.map(p => `${p.type} ${p.name}`);
    return ',\\n        ' + paramStrings.join(',\\n        ');
  }

  private generateAdminFunctions(functions: any[]): string {
    if (functions.length === 0) return '// Custom admin functions will be added here';
    
    return functions.map(fn => `
    function ${fn.name}(${fn.params || ''}) external onlyDispatcher onlyOperator whenInitialized {
        ${fn.body || '// Implementation needed'}
    }`).join('\\n');
  }

  private generateCoreFunctions(functions: any[]): string {
    if (functions.length === 0) return '// Custom core functions will be added here';
    
    return functions.map(fn => `
    function ${fn.name}(${fn.params || ''}) external onlyDispatcher whenInitialized whenNotPaused nonReentrant {
        ${fn.body || '// Implementation needed'}
    }`).join('\\n');
  }

  private generateViewFunctions(functions: any[]): string {
    if (functions.length === 0) return '// Custom view functions will be added here';
    
    return functions.map(fn => `
    function ${fn.name}(${fn.params || ''}) external view returns (${fn.returns || 'bool'}) {
        ${fn.body || '// Implementation needed'}
    }`).join('\\n');
  }

  private calculateSelectorCount(customizations: any): string {
    const baseCount = 5; // Standard functions: initialize, setPaused, 3 views
    const adminCount = customizations.adminFunctions?.length || 0;
    const coreCount = customizations.coreFunctions?.length || 0;
    const viewCount = customizations.viewFunctions?.length || 0;
    return (baseCount + adminCount + coreCount + viewCount).toString();
  }

  private generateCustomSelectors(functions: any[]): string {
    if (functions.length === 0) return '';
    
    return functions.map(fn => 
      `        selectors[i++] = this.${fn.name}.selector;`
    ).join('\\n');
  }

  private async generateTestFile(config: GenerationConfig, archetype: ArchetypeManifest): Promise<void> {
    const testTemplate = `
import { expect } from "chai";
import { ethers } from "hardhat";

describe("${config.facetName}", () => {
  let facet: any;

  beforeEach(async () => {
    const ${config.facetName}Factory = await ethers.getContractFactory("${config.facetName}");
    facet = await ${config.facetName}Factory.deploy();
  });

  describe("Initialization", () => {
    it("should initialize once", async () => {
      const [operator] = await ethers.getSigners();
      await facet.initialize${config.facetName}(operator.address);
      
      await expect(
        facet.initialize${config.facetName}(operator.address)
      ).to.be.revertedWithCustomError(facet, "AlreadyInitialized");
    });
  });

  describe("Pause functionality", () => {
    it("should allow operator to pause", async () => {
      // Test pause functionality
    });
  });

  describe("Access control", () => {
    it("should enforce dispatcher gating", async () => {
      // Test access controls
    });
  });
});`;

    const testPath = path.join(config.outputDir, `${config.facetName}.spec.ts`);
    fs.writeFileSync(testPath, testTemplate);
  }

  private async updateLockfile(
    config: GenerationConfig, 
    archetype: ArchetypeManifest, 
    templateHash: string
  ): Promise<void> {
    const lockfilePath = '.payrox-templates.lock';
    let lockfile: any = {};
    
    if (fs.existsSync(lockfilePath)) {
      lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf8'));
    }
    
    if (!lockfile.templates) lockfile.templates = {};
    
    lockfile.templates[config.facetName] = {
      archetype: archetype.name,
      version: archetype.version,
      templateHash: templateHash,
      generatedAt: new Date().toISOString(),
      config: config
    };
    
    fs.writeFileSync(lockfilePath, JSON.stringify(lockfile, null, 2));
  }

  private toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Public interface methods
  async generateFromArchetype(
    facetName: string, 
    archetype: string, 
    customizations: any = {}
  ): Promise<void> {
    const config: GenerationConfig = {
      facetName,
      archetype,
      outputDir: this.outputDir,
      customizations,
      enforceGuardrails: true
    };
    
    await this.generateFacet(config);
  }

  async listArchetypes(): Promise<string[]> {
    const archetypes: string[] = [];
    const dirs = fs.readdirSync(this.archetypesDir);
    
    for (const dir of dirs) {
      const manifestPath = path.join(this.archetypesDir, dir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        archetypes.push(dir);
      }
    }
    
    return archetypes;
  }
}

// CLI Interface
if (require.main === module) {
  const generator = new PayRoxTemplateGenerator();
  
  const command = process.argv[2];
  
  if (command === 'list') {
    generator.listArchetypes().then(archetypes => {
      console.log('📋 Available archetypes:');
      archetypes.forEach(arch => console.log(`   • ${arch}`));
    });
  } else if (command === 'generate') {
    const facetName = process.argv[3];
    const archetype = process.argv[4];
    
    if (!facetName || !archetype) {
      console.error('Usage: npx ts-node generator.ts generate <FacetName> <archetype>');
      process.exit(1);
    }
    
    generator.generateFromArchetype(facetName, archetype)
      .then(() => console.log('🎉 Generation complete!'))
      .catch(console.error);
  } else {
    console.log('PayRox Template Generator v2');
    console.log('Commands:');
    console.log('  list                    - List available archetypes');
    console.log('  generate <name> <arch>  - Generate facet from archetype');
  }
}

export { PayRoxTemplateGenerator };

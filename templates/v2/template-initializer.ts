#!/usr/bin/env ts-node

/**
 * PayRox Template Generator Initialization Script
 * 
 * Initializes the Template Generator v2 system with proper environment setup
 * Ensures all paths, configurations, and guardrails are properly configured
 */

import * as fs from 'fs';
import * as path from 'path';

interface InitializationConfig {
  archetypesDir: string;
  outputDir: string;
  configFile: string;
  guardrailsEnabled: boolean;
}

export class TemplateInitializer {
  private config: InitializationConfig;

  constructor() {
    this.config = {
      archetypesDir: process.env.PAYROX_ARCHETYPES_DIR || './templates/v2/archetypes',
      outputDir: process.env.PAYROX_OUTPUT_DIR || './contracts/generated-facets',
      configFile: './app.release.yaml',
      guardrailsEnabled: process.env.TEMPLATE_GENERATOR_ENABLED === 'true'
    };
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing PayRox Template Generator v2...');
    
    // Step 1: Verify environment
    await this.verifyEnvironment();
    
    // Step 2: Create required directories
    await this.createDirectories();
    
    // Step 3: Validate configuration
    await this.validateConfiguration();
    
    // Step 4: Setup template cache
    await this.setupTemplateCache();
    
    // Step 5: Initialize guardrails
    await this.initializeGuardrails();
    
    console.log('✅ Template Generator v2 initialization complete!');
  }

  private async verifyEnvironment(): Promise<void> {
    console.log('🔍 Verifying environment...');
    
    const requiredEnvVars = [
      'PAYROX_ARCHETYPES_DIR',
      'PAYROX_OUTPUT_DIR'
    ];
    
    const missingVars: string[] = [];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        missingVars.push(envVar);
      }
    }
    
    if (missingVars.length > 0) {
      console.log(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
      console.log('Using default values...');
    }
    
    console.log(`📁 Archetypes Directory: ${this.config.archetypesDir}`);
    console.log(`📁 Output Directory: ${this.config.outputDir}`);
    console.log(`⚙️  Guardrails: ${this.config.guardrailsEnabled ? 'ENABLED' : 'DISABLED'}`);
  }

  private async createDirectories(): Promise<void> {
    console.log('📁 Creating required directories...');
    
    const directories = [
      this.config.archetypesDir,
      this.config.outputDir,
      path.join(this.config.archetypesDir, 'basic'),
      path.join(this.config.archetypesDir, 'advanced'),
      path.join(this.config.outputDir, 'validated'),
      './templates/v2/cache'
    ];
    
    for (const dir of directories) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📂 Created: ${dir}`);
      } else {
        console.log(`✓ Exists: ${dir}`);
      }
    }
  }

  private async validateConfiguration(): Promise<void> {
    console.log('⚙️  Validating configuration...');
    
    if (!fs.existsSync(this.config.configFile)) {
      console.log(`⚠️  Configuration file not found: ${this.config.configFile}`);
      return;
    }
    
    try {
      const configContent = fs.readFileSync(this.config.configFile, 'utf8');
      
      // Check for Template Generator section
      if (configContent.includes('templateGenerator:')) {
        console.log('✓ Template Generator configuration found');
      } else {
        console.log('⚠️  Template Generator configuration section missing');
      }
      
      // Validate required configuration keys
      const requiredKeys = [
        'paths:',
        'features:',
        'guardrails:',
        'aiIntegration:'
      ];
      
      const missingKeys = requiredKeys.filter(key => !configContent.includes(key));
      if (missingKeys.length > 0) {
        console.log(`⚠️  Missing configuration keys: ${missingKeys.join(', ')}`);
      } else {
        console.log('✓ All configuration keys present');
      }
      
    } catch (error) {
      console.error(`❌ Configuration validation failed: ${error}`);
    }
  }

  private async setupTemplateCache(): Promise<void> {
    console.log('💾 Setting up template cache...');
    
    const cacheDir = './templates/v2/cache';
    const cacheFile = path.join(cacheDir, 'template-cache.json');
    
    const defaultCache = {
      version: '2.0.0',
      lastUpdated: new Date().toISOString(),
      templates: {
        basic: [],
        advanced: []
      },
      guardrails: {
        noConstructors: true,
        asciiOnly: true,
        namingValidation: true,
        payRoxCompliance: true
      }
    };
    
    if (!fs.existsSync(cacheFile)) {
      fs.writeFileSync(cacheFile, JSON.stringify(defaultCache, null, 2));
      console.log(`📝 Created cache file: ${cacheFile}`);
    } else {
      console.log(`✓ Cache file exists: ${cacheFile}`);
    }
  }

  private async initializeGuardrails(): Promise<void> {
    console.log('🛡️  Initializing guardrails...');
    
    if (!this.config.guardrailsEnabled) {
      console.log('⚠️  Guardrails disabled - Template Generator in permissive mode');
      return;
    }
    
    const guardrailsConfig = {
      enforceNoConstructors: true,
      enforceASCIIOnly: true,
      enforceNamingConventions: true,
      enforcePayRoxPatterns: true,
      validateBeforeGeneration: true,
      validateAfterGeneration: true
    };
    
    console.log('✓ Guardrails configuration:');
    Object.entries(guardrailsConfig).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value ? 'ENABLED' : 'DISABLED'}`);
    });
    
    // Create guardrails validation file
    const guardrailsFile = './templates/v2/guardrails-config.json';
    if (!fs.existsSync(guardrailsFile)) {
      fs.writeFileSync(guardrailsFile, JSON.stringify(guardrailsConfig, null, 2));
      console.log(`📝 Created guardrails config: ${guardrailsFile}`);
    }
  }

  async createSampleArchetypes(): Promise<void> {
    console.log('📋 Creating sample archetypes...');
    
    // Basic Facet Archetype
    const basicFacetTemplate = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IERC165.sol";
import "../libraries/LibDiamond.sol";

/**
 * @title {{FACET_NAME}}
 * @dev Basic PayRox Diamond Facet Template
 * @notice Auto-generated by PayRox Template Generator v2
 */
contract {{FACET_NAME}} is IERC165 {
    
    /**
     * @dev Initialize the facet
     * @notice Called once during diamond deployment
     */
    function initialize() external {
        LibDiamond.enforceIsContractOwner();
        // Initialization logic here
    }
    
    /**
     * @dev Check if contract supports interface
     * @param interfaceId The interface identifier
     * @return True if interface is supported
     */
    function supportsInterface(bytes4 interfaceId) 
        external 
        pure 
        override 
        returns (bool) 
    {
        return interfaceId == type(IERC165).interfaceId;
    }
}`;

    const basicFacetPath = path.join(this.config.archetypesDir, 'basic', 'BasicFacet.template.sol');
    if (!fs.existsSync(basicFacetPath)) {
      fs.writeFileSync(basicFacetPath, basicFacetTemplate);
      console.log(`📝 Created basic facet template: ${basicFacetPath}`);
    }

    // Advanced Facet Archetype
    const advancedFacetTemplate = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IERC165.sol";
import "../libraries/LibDiamond.sol";
import "../modifiers/PayRoxModifiers.sol";

/**
 * @title {{FACET_NAME}}
 * @dev Advanced PayRox Diamond Facet Template with full features
 * @notice Auto-generated by PayRox Template Generator v2
 * @author PayRox Go Beyond System
 */
contract {{FACET_NAME}} is IERC165, PayRoxModifiers {
    
    // Events
    event {{FACET_NAME}}Initialized(address indexed diamond);
    event {{FACET_NAME}}Action(address indexed user, bytes32 indexed action);
    
    // Errors
    error {{FACET_NAME}}__InvalidInput();
    error {{FACET_NAME}}__NotAuthorized();
    
    /**
     * @dev Initialize the facet with advanced configuration
     * @notice Called once during diamond deployment
     */
    function initialize() 
        external 
        onlyDispatcher 
        whenNotInitialized 
    {
        LibDiamond.enforceIsContractOwner();
        _setInitialized();
        emit {{FACET_NAME}}Initialized(address(this));
    }
    
    /**
     * @dev Example advanced function with full modifiers
     * @param data The input data to process
     */
    function advancedFunction(bytes calldata data) 
        external 
        onlyDispatcher 
        whenInitialized 
        nonReentrant 
    {
        if (data.length == 0) {
            revert {{FACET_NAME}}__InvalidInput();
        }
        
        // Advanced logic here
        emit {{FACET_NAME}}Action(msg.sender, keccak256(data));
    }
    
    /**
     * @dev Check if contract supports interface
     * @param interfaceId The interface identifier
     * @return True if interface is supported
     */
    function supportsInterface(bytes4 interfaceId) 
        external 
        pure 
        override 
        returns (bool) 
    {
        return interfaceId == type(IERC165).interfaceId;
    }
}`;

    const advancedFacetPath = path.join(this.config.archetypesDir, 'advanced', 'AdvancedFacet.template.sol');
    if (!fs.existsSync(advancedFacetPath)) {
      fs.writeFileSync(advancedFacetPath, advancedFacetTemplate);
      console.log(`📝 Created advanced facet template: ${advancedFacetPath}`);
    }
  }
}

// CLI Interface
if (require.main === module) {
  const initializer = new TemplateInitializer();
  
  const command = process.argv[2];
  
  if (command === 'samples') {
    initializer.createSampleArchetypes()
      .then(() => {
        console.log('✅ Sample archetypes created successfully!');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Sample creation failed:', error.message);
        process.exit(1);
      });
  } else {
    initializer.initialize()
      .then(() => {
        console.log('✅ Template Generator v2 ready for use!');
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Initialization failed:', error.message);
        process.exit(1);
      });
  }
}

export default TemplateInitializer;

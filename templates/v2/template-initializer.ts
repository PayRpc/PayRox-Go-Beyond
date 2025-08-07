#!/usr/bin/env ts-node

/**
 * PayRox Template Generator Initialization Script
 * 
 * Initializes the Template Generator v2 system with proper environment setup
 * Ensures all paths, configurations, and guardrails are properly configured
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface InitializationConfig {
  archetypesDir: string;
  outputDir: string;
  configFile: string;
  guardrailsEnabled: boolean;
}

export class TemplateInitializer {
  private config: InitializationConfig;

  constructor(configFileOverride?: string) {
    this.config = {
      archetypesDir: process.env.PAYROX_ARCHETYPES_DIR || path.resolve(__dirname, '../../templates/v2/archetypes'),
      outputDir: process.env.PAYROX_OUTPUT_DIR || path.resolve(__dirname, '../../contracts/generated-facets'),
      configFile: configFileOverride || process.env.PAYROX_CONFIG_FILE || path.resolve(__dirname, '../../config/app.release.yaml'),
      guardrailsEnabled: process.env.TEMPLATE_GENERATOR_ENABLED !== 'false' // default to enabled
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
      path.resolve(__dirname, '../../templates/v2/cache')
    ];
    for (const dir of directories) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`📂 Created: ${dir}`);
        } else {
          console.log(`✓ Exists: ${dir}`);
        }
      } catch (err) {
        console.error(`❌ Failed to create directory ${dir}: ${err}`);
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
      const configYaml = yaml.load(configContent) as any;
      if (configYaml && configYaml.templateGenerator) {
        console.log('✓ Template Generator configuration found');
        // Validate required configuration keys
        const requiredKeys = ['paths', 'features', 'guardrails', 'aiIntegration'];
        const missingKeys = requiredKeys.filter(key => !(key in configYaml.templateGenerator));
        if (missingKeys.length > 0) {
          console.log(`⚠️  Missing configuration keys: ${missingKeys.join(', ')}`);
        } else {
          console.log('✓ All configuration keys present');
        }
      } else {
        console.log('⚠️  Template Generator configuration section missing');
      }
    } catch (error) {
      console.error(`❌ Configuration validation failed: ${error}`);
    }
  }

  private async setupTemplateCache(): Promise<void> {
    console.log('💾 Setting up template cache...');
    const cacheDir = path.resolve(__dirname, '../../templates/v2/cache');
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
    try {
      if (!fs.existsSync(cacheFile)) {
        fs.writeFileSync(cacheFile, JSON.stringify(defaultCache, null, 2));
        console.log(`📝 Created cache file: ${cacheFile}`);
      } else {
        // Validate cache file content
        try {
          const cacheContent = fs.readFileSync(cacheFile, 'utf8');
          JSON.parse(cacheContent); // Throws if invalid
          console.log(`✓ Cache file exists and is valid: ${cacheFile}`);
        } catch (err) {
          fs.writeFileSync(cacheFile, JSON.stringify(defaultCache, null, 2));
          console.log(`📝 Cache file was corrupted, reset: ${cacheFile}`);
        }
      }
    } catch (err) {
      console.error(`❌ Failed to setup cache: ${err}`);
    }
  }

  private async initializeGuardrails(forceOverwrite = false): Promise<void> {
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
    // Create/overwrite guardrails validation file
    const guardrailsFile = path.resolve(__dirname, '../../templates/v2/guardrails-config.json');
    try {
      if (!fs.existsSync(guardrailsFile) || forceOverwrite) {
        fs.writeFileSync(guardrailsFile, JSON.stringify(guardrailsConfig, null, 2));
        console.log(`📝 Guardrails config written: ${guardrailsFile}`);
      } else {
        console.log(`✓ Guardrails config exists: ${guardrailsFile}`);
      }
    } catch (err) {
      console.error(`❌ Failed to write guardrails config: ${err}`);
    }
  }
  public async forceInitializeGuardrails(): Promise<void> {
    await this.initializeGuardrails(true);
  }

  async createSampleArchetypes(forceOverwrite = false): Promise<void> {
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
    try {
      if (!fs.existsSync(basicFacetPath) || forceOverwrite) {
        fs.writeFileSync(basicFacetPath, basicFacetTemplate);
        console.log(`📝 Basic facet template written: ${basicFacetPath}`);
      } else {
        console.log(`✓ Basic facet template exists: ${basicFacetPath}`);
      }
    } catch (err) {
      console.error(`❌ Failed to write basic facet template: ${err}`);
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
    try {
      if (!fs.existsSync(advancedFacetPath) || forceOverwrite) {
        fs.writeFileSync(advancedFacetPath, advancedFacetTemplate);
        console.log(`📝 Advanced facet template written: ${advancedFacetPath}`);
      } else {
        console.log(`✓ Advanced facet template exists: ${advancedFacetPath}`);
      }
    } catch (err) {
      console.error(`❌ Failed to write advanced facet template: ${err}`);
    }
  }
}

// CLI Interface
if (require.main === module) {
  // Allow config file override and force options via CLI
  const configFileArg = process.argv.find(arg => arg.endsWith('.yaml'));
  const forceFlag = process.argv.includes('--force');
  const initializer = new TemplateInitializer(configFileArg);
  const command = process.argv[2];
  if (command === 'samples') {
    initializer.createSampleArchetypes(forceFlag)
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
        .then(async () => {
          if (forceFlag) {
            await initializer.forceInitializeGuardrails();
          }
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

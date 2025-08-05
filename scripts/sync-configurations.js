#!/usr/bin/env node

/**
 * CONFIGURATION SYNC SCRIPT
 * Synchronizes all contract addresses to match the latest deployments
 * Enhanced with validation, backup, and error recovery
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration paths with environment variable support
const DEPLOYMENTS_DIR =
  process.env.DEPLOYMENTS_DIR ||
  path.join(__dirname, '../deployments/localhost');
const MAIN_CONFIG =
  process.env.MAIN_CONFIG ||
  path.join(__dirname, '../config/deployed-contracts.json');
const FRONTEND_CONFIG =
  process.env.FRONTEND_CONFIG ||
  path.join(
    __dirname,
    '../tools/ai-assistant/frontend/src/contracts/config.json'
  );
const BACKUP_DIR = path.join(__dirname, '../config/backups');

// Contract mapping for validation
const EXPECTED_CONTRACTS = {
  factory: 'DeterministicChunkFactory',
  dispatcher: 'ManifestDispatcher',
  orchestrator: 'Orchestrator',
  'governance-orchestrator': 'GovernanceOrchestrator',
  'audit-registry': 'AuditRegistry',
  'ping-facet': 'PingFacet',
  'facet-a': 'ExampleFacetA',
  'facet-b': 'ExampleFacetB',
};

// Validation utilities
const ethers = require('ethers');

function isValidAddress(address) {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

function loadJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      return {};
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    console.log(
      `✅ Loaded ${path.basename(filePath)} (${
        Object.keys(parsed).length
      } keys)`
    );
    return parsed;
  } catch (error) {
    console.error(`❌ Failed to load ${filePath}: ${error.message}`);
    return {};
  }
}

function saveJSON(filePath, data) {
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Validate JSON before saving
    const jsonString = JSON.stringify(data, null, 2) + '\n';
    JSON.parse(jsonString); // Validate

    fs.writeFileSync(filePath, jsonString);
    console.log(
      `✅ Saved ${path.basename(filePath)} (${
        JSON.stringify(data).length
      } bytes)`
    );
    return true;
  } catch (error) {
    console.error(`❌ Failed to save ${filePath}: ${error.message}`);
    return false;
  }
}

function createBackup(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${path.basename(filePath, '.json')}-${timestamp}.json`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    fs.copyFileSync(filePath, backupPath);
    console.log(`💾 Backup created: ${backupName}`);
    return backupPath;
  } catch (error) {
    console.warn(`⚠️  Backup failed for ${filePath}: ${error.message}`);
    return null;
  }
}

function validateContract(deployment, expectedName) {
  const issues = [];

  if (!deployment.address || !isValidAddress(deployment.address)) {
    issues.push('Invalid or missing address');
  }

  if (!deployment.contractName) {
    issues.push('Missing contract name');
  } else if (expectedName && deployment.contractName !== expectedName) {
    issues.push(`Expected ${expectedName}, got ${deployment.contractName}`);
  }

  if (!deployment.timestamp) {
    issues.push('Missing deployment timestamp');
  } else {
    const deployTime = new Date(deployment.timestamp);
    if (isNaN(deployTime.getTime())) {
      issues.push('Invalid timestamp format');
    }
  }

  return issues;
}

function validateDeployments(deployments) {
  console.log('\n🔍 Validating deployments...');
  let totalIssues = 0;

  for (const [contractKey, deployment] of Object.entries(deployments)) {
    const expectedName = EXPECTED_CONTRACTS[contractKey];
    const issues = validateContract(deployment, expectedName);

    if (issues.length > 0) {
      console.warn(`⚠️  ${contractKey}: ${issues.join(', ')}`);
      totalIssues += issues.length;
    } else {
      console.log(`✅ ${contractKey}: Valid`);
    }
  }

  if (totalIssues > 0) {
    console.warn(`⚠️  Found ${totalIssues} validation issues`);
  } else {
    console.log('✅ All deployments validated successfully');
  }

  return totalIssues === 0;
}

async function syncConfigurations() {
  console.log('🔄 CONFIGURATION SYNC SCRIPT v2.0');
  console.log('=====================================');
  console.log('Enhanced with validation, backup, and error recovery\n');

  // Check if deployments directory exists
  if (!fs.existsSync(DEPLOYMENTS_DIR)) {
    console.error(`❌ Deployments directory not found: ${DEPLOYMENTS_DIR}`);
    console.log(
      '💡 Run deployment first: npm run deploy or npm run hardhat:deploy'
    );
    process.exit(1);
  }

  // Create backups before sync
  console.log('💾 Creating configuration backups...');
  createBackup(MAIN_CONFIG);
  createBackup(FRONTEND_CONFIG);

  // Load deployment files (source of truth)
  console.log('\n📂 Loading deployment files...');
  const deploymentFiles = fs
    .readdirSync(DEPLOYMENTS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  if (deploymentFiles.length === 0) {
    console.error('❌ No deployment files found');
    console.log('💡 Deploy contracts first before running sync');
    process.exit(1);
  }

  const deployments = {};
  let loadedCount = 0;

  for (const file of deploymentFiles) {
    const deployment = loadJSON(path.join(DEPLOYMENTS_DIR, file));
    if (deployment.address && deployment.contractName) {
      const contractKey = file.replace('.json', '');
      deployments[contractKey] = deployment;
      console.log(`📍 ${deployment.contractName}: ${deployment.address}`);
      loadedCount++;
    } else {
      console.warn(`⚠️  Skipping invalid deployment: ${file}`);
    }
  }

  console.log(`\n✅ Loaded ${loadedCount} valid deployments`);

  // Validate deployments
  const isValid = validateDeployments(deployments);
  if (!isValid) {
    console.warn('\n⚠️  Proceeding with warnings. Check deployment integrity.');
  }

  // Update main config
  console.log('\n📝 Updating main configuration...');
  const mainConfig = loadJSON(MAIN_CONFIG);

  // Initialize structure if needed
  if (!mainConfig.contracts) {
    mainConfig.contracts = { core: {}, orchestrators: {}, facets: {} };
  }
  if (!mainConfig.contracts.core) mainConfig.contracts.core = {};
  if (!mainConfig.contracts.orchestrators)
    mainConfig.contracts.orchestrators = {};
  if (!mainConfig.contracts.facets) mainConfig.contracts.facets = {};

  let updatedCount = 0;

  // Update core contracts
  if (deployments.factory) {
    mainConfig.contracts.core.factory = {
      ...mainConfig.contracts.core.factory,
      address: deployments.factory.address,
      name: deployments.factory.contractName,
    };
    console.log(`✅ Updated factory: ${deployments.factory.address}`);
    updatedCount++;
  }

  if (deployments.dispatcher) {
    mainConfig.contracts.core.dispatcher = {
      ...mainConfig.contracts.core.dispatcher,
      address: deployments.dispatcher.address,
      name: deployments.dispatcher.contractName,
    };
    console.log(`✅ Updated dispatcher: ${deployments.dispatcher.address}`);
    updatedCount++;
  }

  // Update orchestrators
  const orchestratorMappings = {
    orchestrator: 'main',
    'governance-orchestrator': 'governance',
    'audit-registry': 'auditRegistry',
  };

  for (const [deployKey, configKey] of Object.entries(orchestratorMappings)) {
    if (deployments[deployKey]) {
      mainConfig.contracts.orchestrators[configKey] = {
        ...mainConfig.contracts.orchestrators[configKey],
        address: deployments[deployKey].address,
        name: deployments[deployKey].contractName,
      };
      console.log(`✅ Updated ${configKey}: ${deployments[deployKey].address}`);
      updatedCount++;
    }
  }

  // Update facets
  const facetMappings = {
    'ping-facet': 'ping',
    'facet-a': 'facet-a',
    'facet-b': 'facet-b',
  };

  for (const [deployKey, configKey] of Object.entries(facetMappings)) {
    if (deployments[deployKey]) {
      const contractName = deployments[deployKey].contractName;
      let abiPath;

      if (contractName === 'PingFacet') {
        abiPath = './artifacts/contracts/facets/PingFacet.sol/PingFacet.json';
      } else if (contractName === 'ExampleFacetA') {
        abiPath =
          './artifacts/contracts/facets/ExampleFacetA.sol/ExampleFacetA.json';
      } else if (contractName === 'ExampleFacetB') {
        abiPath =
          './artifacts/contracts/facets/ExampleFacetB.sol/ExampleFacetB.json';
      }

      mainConfig.contracts.facets[configKey] = {
        name: contractName,
        address: deployments[deployKey].address,
        abi: abiPath,
        deploymentFile: `./deployments/localhost/${deployKey}.json`,
      };
      console.log(`✅ Updated ${configKey}: ${deployments[deployKey].address}`);
      updatedCount++;
    }
  }

  // Update metadata
  mainConfig.timestamp = new Date().toISOString();
  mainConfig.version = mainConfig.version
    ? (parseFloat(mainConfig.version) + 0.1).toFixed(1)
    : '1.0.0';
  mainConfig.description = `PayRox Go Beyond Deployed Contracts - Address Synchronized v${mainConfig.version}`;
  mainConfig.syncDetails = {
    deploymentsFound: loadedCount,
    configsUpdated: updatedCount,
    lastSync: mainConfig.timestamp,
    sourceDirectory: DEPLOYMENTS_DIR,
  };

  if (saveJSON(MAIN_CONFIG, mainConfig)) {
    console.log(`✅ Main configuration updated (${updatedCount} contracts)`);
  } else {
    console.error('❌ Failed to save main configuration');
    process.exit(1);
  }

  // Update frontend config
  console.log('\n📝 Updating frontend configuration...');
  const frontendConfig = loadJSON(FRONTEND_CONFIG);

  // Initialize structure if needed
  if (!frontendConfig.contracts) {
    frontendConfig.contracts = {};
  }

  let frontendUpdated = 0;

  // Map deployments to frontend config structure
  const frontendMappings = {
    factory: 'factory',
    dispatcher: 'dispatcher',
    orchestrator: 'orchestrator',
    'governance-orchestrator': 'governance-orchestrator',
    'audit-registry': 'audit-registry',
    'ping-facet': 'ping-facet',
    'facet-a': 'facet-a',
    'facet-b': 'facet-b',
  };

  for (const [deployKey, frontendKey] of Object.entries(frontendMappings)) {
    if (deployments[deployKey]) {
      const deployment = deployments[deployKey];

      frontendConfig.contracts[frontendKey] = {
        name: deployment.contractName,
        address: deployment.address,
        hasABI: true,
        timestamp: deployment.timestamp || new Date().toISOString(),
      };

      console.log(`✅ Updated frontend ${frontendKey}: ${deployment.address}`);
      frontendUpdated++;
    }
  }

  // Update frontend metadata
  frontendConfig.timestamp = new Date().toISOString();
  frontendConfig.version = frontendConfig.version
    ? (parseFloat(frontendConfig.version) + 0.1).toFixed(1)
    : '1.0.0';
  frontendConfig.network = 'localhost';
  frontendConfig.syncSource = 'automated-sync-script';

  if (saveJSON(FRONTEND_CONFIG, frontendConfig)) {
    console.log(
      `✅ Frontend configuration updated (${frontendUpdated} contracts)`
    );
  } else {
    console.error('❌ Failed to save frontend configuration');
    process.exit(1);
  }

  // Generate summary report
  console.log('\n📊 SYNC SUMMARY REPORT');
  console.log('========================');
  console.log(`📂 Source Directory: ${DEPLOYMENTS_DIR}`);
  console.log(`📁 Deployments Found: ${loadedCount}`);
  console.log(`📝 Main Config Updates: ${updatedCount}`);
  console.log(`🎨 Frontend Updates: ${frontendUpdated}`);
  console.log(`⏰ Sync Completed: ${new Date().toLocaleString()}`);

  // Validation summary
  if (isValid) {
    console.log('✅ All validations passed');
  } else {
    console.log('⚠️  Some validation warnings (check logs above)');
  }

  console.log('\n🎉 SYNC COMPLETE!');
  console.log('================');
  console.log(
    'All configuration files have been synchronized with deployment addresses.'
  );

  // Next steps
  console.log('\n📋 Next steps:');
  console.log('1. ✅ Run verification: npm run verify:mapping');
  console.log('2. 🧪 Test frontend/backend integration');
  console.log('3. 💾 Commit the configuration changes');
  console.log('4. 🚀 Deploy to other networks if needed');

  // Return sync results for programmatic usage
  return {
    success: true,
    deploymentsFound: loadedCount,
    mainConfigUpdates: updatedCount,
    frontendUpdates: frontendUpdated,
    validationPassed: isValid,
    timestamp: new Date().toISOString(),
  };
}

// Error handling wrapper
async function handleErrors(fn) {
  try {
    return await fn();
  } catch (error) {
    console.error('\n💥 SYNC FAILED');
    console.error('==============');
    console.error(`Error: ${error.message}`);

    if (error.stack) {
      console.error('\n🔍 Stack trace:');
      console.error(error.stack);
    }

    console.error('\n🛠️  Troubleshooting:');
    console.error(
      '1. Check that deployment files exist in deployments/localhost/'
    );
    console.error('2. Verify file permissions for config files');
    console.error('3. Ensure all deployments completed successfully');
    console.error(
      '4. Check backup files in config/backups/ if recovery needed'
    );

    process.exit(1);
  }
}

// CLI argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--network':
      case '-n':
        options.network = args[i + 1];
        i++;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--force':
        options.force = true;
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
🔄 PayRox Configuration Sync Script v2.0
==========================================

USAGE:
  node sync-configurations.js [options]

OPTIONS:
  --help, -h         Show this help message
  --dry-run          Show what would be updated without making changes
  --network, -n      Specify network (default: localhost)
  --verbose, -v      Enable detailed logging
  --force           Skip validation warnings

EXAMPLES:
  node sync-configurations.js
  node sync-configurations.js --dry-run
  node sync-configurations.js --network sepolia
  node sync-configurations.js --verbose --force

ENVIRONMENT VARIABLES:
  DEPLOYMENTS_DIR    Override deployment directory path
  MAIN_CONFIG        Override main config file path
  FRONTEND_CONFIG    Override frontend config file path

FILES UPDATED:
  - config/deployed-contracts.json (main configuration)
  - tools/ai-assistant/frontend/src/contracts/config.json (frontend config)

BACKUPS:
  Automatic backups are created in config/backups/ before any changes.
`);
}

// Dry run functionality
async function dryRunSync(options) {
  console.log('🔍 DRY RUN MODE - No files will be modified');
  console.log('============================================\n');

  // Load and validate deployments
  const deploymentFiles = fs
    .readdirSync(DEPLOYMENTS_DIR)
    .filter(f => f.endsWith('.json'));
  const deployments = {};

  for (const file of deploymentFiles) {
    const deployment = loadJSON(path.join(DEPLOYMENTS_DIR, file));
    if (deployment.address) {
      deployments[file.replace('.json', '')] = deployment;
    }
  }

  console.log(`📂 Found ${Object.keys(deployments).length} deployments:`);
  for (const [key, deploy] of Object.entries(deployments)) {
    console.log(`   ${key}: ${deploy.contractName} at ${deploy.address}`);
  }

  // Show what would be updated
  const mainConfig = loadJSON(MAIN_CONFIG);
  const frontendConfig = loadJSON(FRONTEND_CONFIG);

  console.log('\n📝 Main config changes:');
  let mainChanges = 0;

  if (
    deployments.factory?.address !==
    mainConfig.contracts?.core?.factory?.address
  ) {
    console.log(
      `   factory: ${mainConfig.contracts?.core?.factory?.address} → ${deployments.factory?.address}`
    );
    mainChanges++;
  }

  if (
    deployments.dispatcher?.address !==
    mainConfig.contracts?.core?.dispatcher?.address
  ) {
    console.log(
      `   dispatcher: ${mainConfig.contracts?.core?.dispatcher?.address} → ${deployments.dispatcher?.address}`
    );
    mainChanges++;
  }

  console.log(`\n🎨 Frontend config changes:`);
  let frontendChanges = 0;

  for (const [key, deployment] of Object.entries(deployments)) {
    const currentAddr = frontendConfig.contracts?.[key]?.address;
    if (deployment.address !== currentAddr) {
      console.log(
        `   ${key}: ${currentAddr || 'missing'} → ${deployment.address}`
      );
      frontendChanges++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Main config changes: ${mainChanges}`);
  console.log(`   Frontend changes: ${frontendChanges}`);
  console.log(`\n� Run without --dry-run to apply changes`);

  return { dryRun: true, mainChanges, frontendChanges };
}

if (require.main === module) {
  const options = parseArgs();

  if (options.dryRun) {
    dryRunSync(options).catch(error => {
      console.error('Dry run failed:', error.message);
      process.exit(1);
    });
  } else {
    handleErrors(() => syncConfigurations(options));
  }
}

module.exports = {
  syncConfigurations,
  loadJSON,
  saveJSON,
  validateContract,
  validateDeployments,
  createBackup,
  isValidAddress,
  parseArgs,
  dryRunSync,
};

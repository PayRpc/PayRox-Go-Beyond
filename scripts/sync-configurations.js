#!/usr/bin/env node

/**
 * CONFIGURATION SYNC SCRIPT
 * Synchronizes all contract addresses to match the latest deployments
 */

const fs = require('fs');
const path = require('path');

// Configuration paths
const DEPLOYMENTS_DIR = path.join(__dirname, '../deployments/localhost');
const MAIN_CONFIG = path.join(__dirname, '../config/deployed-contracts.json');
const FRONTEND_CONFIG = path.join(
  __dirname,
  '../tools/ai-assistant/frontend/src/contracts/config.json'
);

function loadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Failed to load ${filePath}: ${error.message}`);
    return {};
  }
}

function saveJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    return true;
  } catch (error) {
    console.error(`Failed to save ${filePath}: ${error.message}`);
    return false;
  }
}

async function syncConfigurations() {
  console.log('🔄 CONFIGURATION SYNC SCRIPT');
  console.log('============================');
  console.log('Synchronizing all addresses to match latest deployments...\n');

  // Load deployment files (source of truth)
  const deploymentFiles = fs
    .readdirSync(DEPLOYMENTS_DIR)
    .filter(f => f.endsWith('.json'));
  const deployments = {};

  for (const file of deploymentFiles) {
    const deployment = loadJSON(path.join(DEPLOYMENTS_DIR, file));
    if (deployment.address) {
      deployments[file.replace('.json', '')] = deployment;
      console.log(`📍 ${deployment.contractName}: ${deployment.address}`);
    }
  }

  // Update main config
  console.log('\n📝 Updating main configuration...');
  const mainConfig = loadJSON(MAIN_CONFIG);

  if (deployments.factory) {
    mainConfig.contracts.core.factory.address = deployments.factory.address;
    console.log(`✅ Updated factory address to ${deployments.factory.address}`);
  }

  if (deployments.dispatcher) {
    mainConfig.contracts.core.dispatcher.address =
      deployments.dispatcher.address;
    console.log(
      `✅ Updated dispatcher address to ${deployments.dispatcher.address}`
    );
  }

  // Add facets to main config if missing
  if (!mainConfig.contracts.facets) {
    mainConfig.contracts.facets = {};
  }

  if (deployments['facet-a']) {
    mainConfig.contracts.facets['facet-a'] = {
      name: deployments['facet-a'].contractName,
      address: deployments['facet-a'].address,
      abi: './artifacts/contracts/facets/ExampleFacetA.sol/ExampleFacetA.json',
    };
    console.log(`✅ Added facet-a address: ${deployments['facet-a'].address}`);
  }

  if (deployments['facet-b']) {
    mainConfig.contracts.facets['facet-b'] = {
      name: deployments['facet-b'].contractName,
      address: deployments['facet-b'].address,
      abi: './artifacts/contracts/facets/ExampleFacetB.sol/ExampleFacetB.json',
    };
    console.log(`✅ Added facet-b address: ${deployments['facet-b'].address}`);
  }

  // Update timestamp
  mainConfig.timestamp = new Date().toISOString();
  mainConfig.version = '1.0.4';
  mainConfig.description =
    'PayRox Go Beyond Deployed Contracts - Address Synchronized v1.0.4';

  if (saveJSON(MAIN_CONFIG, mainConfig)) {
    console.log('✅ Main configuration updated successfully');
  }

  // Update frontend config
  console.log('\n📝 Updating frontend configuration...');
  const frontendConfig = loadJSON(FRONTEND_CONFIG);

  if (deployments.factory) {
    frontendConfig.contracts.factory.address = deployments.factory.address;
    frontendConfig.contracts.factory.timestamp = deployments.factory.timestamp;
    console.log(
      `✅ Updated frontend factory address to ${deployments.factory.address}`
    );
  }

  if (deployments.dispatcher) {
    frontendConfig.contracts.dispatcher.address =
      deployments.dispatcher.address;
    frontendConfig.contracts.dispatcher.timestamp =
      deployments.dispatcher.timestamp;
    console.log(
      `✅ Updated frontend dispatcher address to ${deployments.dispatcher.address}`
    );
  }

  if (deployments['facet-a']) {
    frontendConfig.contracts['facet-a'].address =
      deployments['facet-a'].address;
    frontendConfig.contracts['facet-a'].timestamp =
      deployments['facet-a'].timestamp;
    console.log(
      `✅ Updated frontend facet-a address to ${deployments['facet-a'].address}`
    );
  }

  if (deployments['facet-b']) {
    frontendConfig.contracts['facet-b'].address =
      deployments['facet-b'].address;
    frontendConfig.contracts['facet-b'].timestamp =
      deployments['facet-b'].timestamp;
    console.log(
      `✅ Updated frontend facet-b address to ${deployments['facet-b'].address}`
    );
  }

  // Update frontend config metadata
  frontendConfig.timestamp = new Date().toISOString();
  frontendConfig.version = '1.0.1';

  if (saveJSON(FRONTEND_CONFIG, frontendConfig)) {
    console.log('✅ Frontend configuration updated successfully');
  }

  console.log('\n🎉 SYNC COMPLETE!');
  console.log('================');
  console.log(
    'All configuration files have been synchronized with deployment addresses.'
  );
  console.log('\n📋 Next steps:');
  console.log('1. Run verification: npm run verify:mapping');
  console.log('2. Test frontend/backend integration');
  console.log('3. Commit the configuration changes');
}

if (require.main === module) {
  syncConfigurations().catch(error => {
    console.error('💥 Sync failed:', error);
    process.exit(1);
  });
}

module.exports = { syncConfigurations };

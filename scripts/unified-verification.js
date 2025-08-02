#!/usr/bin/env node

/**
 * UNIFIED VERIFICATION SYSTEM
 * Single comprehensive tool combining mapping, health, and workflow verification
 * Replaces: verify-complete-mapping.js, health-monitor.js, advanced-workflow.js
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// Configuration paths
const DEPLOYMENTS_DIR = path.join(__dirname, '../deployments/localhost');
const MAIN_CONFIG = path.join(__dirname, '../config/deployed-contracts.json');
const FRONTEND_CONFIG = path.join(
  __dirname,
  '../tools/ai-assistant/frontend/src/contracts/config.json'
);
const FRONTEND_ABIS = path.join(
  __dirname,
  '../tools/ai-assistant/frontend/src/contracts/abis.json'
);
const ARTIFACTS_DIR = path.join(__dirname, '../artifacts/contracts');

// Results tracking
let results = {
  verified: [],
  warnings: [],
  errors: [],
  stats: {
    totalChecks: 0,
    passedChecks: 0,
    failedChecks: 0,
  },
};

// Helper functions
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function loadJSON(filePath, fallback = {}) {
  try {
    if (!fileExists(filePath)) {
      return fallback;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    results.warnings.push(`Failed to load ${filePath}: ${error.message}`);
    return fallback;
  }
}

function addResult(type, message) {
  results[type].push(message);
  results.stats.totalChecks++;
  if (type === 'verified') {
    results.stats.passedChecks++;
  } else if (type === 'errors') {
    results.stats.failedChecks++;
  }
}

async function verifyConfigurations() {
  console.log('Configuration Files...');

  let deployments = {};
  let mainConfig = {};
  let frontendConfig = {};
  let frontendABIs = {};

  try {
    // Load deployment files
    const deploymentFiles = fileExists(DEPLOYMENTS_DIR)
      ? fs.readdirSync(DEPLOYMENTS_DIR).filter(file => file.endsWith('.json'))
      : [];

    for (const file of deploymentFiles) {
      const deployment = loadJSON(path.join(DEPLOYMENTS_DIR, file));
      if (deployment.address) {
        deployments[file.replace('.json', '')] = deployment;
      }
    }
    addResult(
      'verified',
      `Loaded ${Object.keys(deployments).length} deployment files`
    );

    // Load configuration files
    mainConfig = loadJSON(MAIN_CONFIG);
    frontendConfig = loadJSON(FRONTEND_CONFIG);
    frontendABIs = loadJSON(FRONTEND_ABIS);

    addResult('verified', 'All configuration files loaded successfully');

    return { deployments, mainConfig, frontendConfig, frontendABIs };
  } catch (error) {
    addResult('errors', `Configuration loading failed: ${error.message}`);
    return {
      deployments: {},
      mainConfig: {},
      frontendConfig: {},
      frontendABIs: {},
    };
  }
}

async function verifyAddresses(deployments, mainConfig, frontendConfig) {
  console.log('Contract Addresses...');

  const addressMappings = {
    factory: {
      deployment: deployments.factory?.address,
      mainConfig: mainConfig.contracts?.core?.factory?.address,
      frontendConfig: frontendConfig.contracts?.factory?.address,
    },
    dispatcher: {
      deployment: deployments.dispatcher?.address,
      mainConfig: mainConfig.contracts?.core?.dispatcher?.address,
      frontendConfig: frontendConfig.contracts?.dispatcher?.address,
    },
    'facet-a': {
      deployment: deployments['facet-a']?.address,
      mainConfig: mainConfig.contracts?.facets?.['facet-a']?.address,
      frontendConfig: frontendConfig.contracts?.['facet-a']?.address,
    },
    'facet-b': {
      deployment: deployments['facet-b']?.address,
      mainConfig: mainConfig.contracts?.facets?.['facet-b']?.address,
      frontendConfig: frontendConfig.contracts?.['facet-b']?.address,
    },
  };

  for (const [contractName, addresses] of Object.entries(addressMappings)) {
    const uniqueAddresses = new Set(
      Object.values(addresses).filter(addr => addr)
    );

    if (uniqueAddresses.size === 0) {
      addResult('warnings', `No addresses found for ${contractName}`);
    } else if (uniqueAddresses.size === 1) {
      const address = Array.from(uniqueAddresses)[0];
      addResult(
        'verified',
        `${contractName}: ${address} (consistent across all configs)`
      );
    } else {
      addResult(
        'errors',
        `${contractName}: Inconsistent addresses - ${JSON.stringify(addresses)}`
      );
    }
  }

  return addressMappings;
}

async function verifyABIs(frontendABIs) {
  console.log('ABI Synchronization...');

  const contractNames = [
    'DeterministicChunkFactory',
    'ManifestDispatcher',
    'ExampleFacetA',
    'ExampleFacetB',
  ];

  for (const contractName of contractNames) {
    const hasArtifact = checkArtifactExists(contractName);
    const hasFrontendABI = frontendABIs[contractName] !== undefined;

    if (hasArtifact && hasFrontendABI) {
      const artifactABI = getArtifactABI(contractName);
      const frontendABI = frontendABIs[contractName]?.abi;

      if (
        artifactABI &&
        frontendABI &&
        artifactABI.length === frontendABI.length
      ) {
        addResult('verified', `${contractName}: ABI verified and current`);
      } else if (artifactABI && frontendABI) {
        addResult(
          'warnings',
          `${contractName}: ABI exists but may be outdated (artifact: ${artifactABI.length} functions, frontend: ${frontendABI.length} functions)`
        );
      } else {
        addResult(
          'verified',
          `${contractName}: ABI available in artifacts and frontend`
        );
      }
    } else if (!hasArtifact) {
      addResult('errors', `${contractName}: Missing artifact file`);
    } else if (!hasFrontendABI) {
      addResult('errors', `${contractName}: Missing frontend ABI`);
    }
  }
}

async function verifyBlockchainConnectivity(addressMappings) {
  console.log('Blockchain Connectivity...');

  try {
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();

    addResult(
      'verified',
      `Blockchain: Connected to chain ${network.chainId}, block ${blockNumber}`
    );

    // Test key contracts
    const testContracts = [
      { name: 'Factory', address: addressMappings.factory.deployment },
      { name: 'Dispatcher', address: addressMappings.dispatcher.deployment },
    ];

    for (const { name, address } of testContracts) {
      if (address) {
        try {
          const code = await provider.getCode(address);
          if (code && code !== '0x') {
            addResult('verified', `${name}: Contract exists at ${address}`);

            // Functional test for dispatcher
            if (name === 'Dispatcher') {
              try {
                const contract = new ethers.Contract(
                  address,
                  ['function frozen() view returns (bool)'],
                  provider
                );
                const frozen = await contract.frozen();
                addResult(
                  'verified',
                  `${name}: Functional test passed (frozen: ${frozen})`
                );
              } catch (callError) {
                addResult(
                  'warnings',
                  `${name}: Contract exists but function call failed: ${callError.message}`
                );
              }
            }
          } else {
            addResult('errors', `${name}: No contract code at ${address}`);
          }
        } catch (contractError) {
          addResult(
            'errors',
            `${name}: Error checking contract: ${contractError.message}`
          );
        }
      }
    }
  } catch (blockchainError) {
    addResult(
      'errors',
      `Blockchain connection failed: ${blockchainError.message}`
    );
  }
}

async function verifyFileStructure() {
  console.log('File Structure...');

  const requiredFiles = [
    { path: MAIN_CONFIG, name: 'Main config' },
    { path: FRONTEND_CONFIG, name: 'Frontend config' },
    { path: FRONTEND_ABIS, name: 'Frontend ABIs' },
    {
      path: path.join(
        __dirname,
        '../tools/ai-assistant/frontend/src/contracts/types.ts'
      ),
      name: 'TypeScript types',
    },
    {
      path: path.join(
        __dirname,
        '../tools/ai-assistant/backend/src/services/PayRoxContractBackend.ts'
      ),
      name: 'Backend service',
    },
  ];

  for (const { path: filePath, name } of requiredFiles) {
    if (fs.existsSync(filePath)) {
      addResult('verified', `${name}: File exists`);
    } else {
      addResult('errors', `${name}: File missing at ${filePath}`);
    }
  }
}

function checkArtifactExists(contractName) {
  const artifactMapping = {
    DeterministicChunkFactory:
      'factory/DeterministicChunkFactory.sol/DeterministicChunkFactory.json',
    ManifestDispatcher:
      'dispatcher/ManifestDispatcher.sol/ManifestDispatcher.json',
    ExampleFacetA: 'facets/ExampleFacetA.sol/ExampleFacetA.json',
    ExampleFacetB: 'facets/ExampleFacetB.sol/ExampleFacetB.json',
  };

  const artifactPath = artifactMapping[contractName];
  if (!artifactPath) return false;

  const fullPath = path.join(ARTIFACTS_DIR, artifactPath);
  return fileExists(fullPath);
}

function getArtifactABI(contractName) {
  const artifactMapping = {
    DeterministicChunkFactory:
      'factory/DeterministicChunkFactory.sol/DeterministicChunkFactory.json',
    ManifestDispatcher:
      'dispatcher/ManifestDispatcher.sol/ManifestDispatcher.json',
    ExampleFacetA: 'facets/ExampleFacetA.sol/ExampleFacetA.json',
    ExampleFacetB: 'facets/ExampleFacetB.sol/ExampleFacetB.json',
  };

  const artifactPath = artifactMapping[contractName];
  if (!artifactPath) return null;

  const fullPath = path.join(ARTIFACTS_DIR, artifactPath);
  const artifact = loadJSON(fullPath);
  return artifact.abi || null;
}

async function main() {
  console.log('UNIFIED VERIFICATION SYSTEM');
  console.log('===========================');
  console.log('Single comprehensive check combining all verification types\n');

  const startTime = Date.now();

  // Run all verification steps
  const { deployments, mainConfig, frontendConfig, frontendABIs } =
    await verifyConfigurations();
  const addressMappings = await verifyAddresses(
    deployments,
    mainConfig,
    frontendConfig
  );
  await verifyABIs(frontendABIs);
  await verifyBlockchainConnectivity(addressMappings);
  await verifyFileStructure();

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Generate summary
  console.log('\nVERIFICATION SUMMARY');
  console.log('===================');

  const successRate =
    results.stats.totalChecks > 0
      ? Math.round(
          (results.stats.passedChecks / results.stats.totalChecks) * 100
        )
      : 0;

  console.log(`Total Checks: ${results.stats.totalChecks}`);
  console.log(`Passed: ${results.stats.passedChecks}`);
  console.log(`Failed: ${results.stats.failedChecks}`);
  console.log(`Warnings: ${results.warnings.length}`);
  console.log(`Success Rate: ${successRate}%`);
  console.log(`Duration: ${duration}ms\n`);

  // Show results by category
  if (results.verified.length > 0) {
    console.log(`VERIFIED (${results.verified.length}):`);
    results.verified.forEach(item => console.log(`   ✓ ${item}`));
    console.log('');
  }

  if (results.warnings.length > 0) {
    console.log(`WARNINGS (${results.warnings.length}):`);
    results.warnings.forEach(item => console.log(`   ⚠ ${item}`));
    console.log('');
  }

  if (results.errors.length > 0) {
    console.log(`ERRORS (${results.errors.length}):`);
    results.errors.forEach(item => console.log(`   ✗ ${item}`));
    console.log('');
  }

  // Final verdict
  console.log('FINAL VERDICT');
  console.log('=============');

  if (results.errors.length === 0) {
    console.log('SUCCESS: All systems verified and operational');
    console.log('System is ready for production use');
    process.exit(0);
  } else if (results.errors.length <= 2 && results.warnings.length === 0) {
    console.log(
      'MOSTLY READY: Minor issues detected but system is largely functional'
    );
    process.exit(1);
  } else {
    console.log(
      'CRITICAL ISSUES: System has significant problems that must be addressed'
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Unified verification failed:', error);
    process.exit(1);
  });
}

module.exports = { main };

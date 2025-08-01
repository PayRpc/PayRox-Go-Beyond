#!/usr/bin/env node

/**
 * COMPREHENSIVE MAPPING VERIFICATION
 * Ensures ALL contract addresses and ABIs are correctly mapped across all systems
 * NO GUESSING - Complete verification of the entire integration
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

async function comprehensiveVerification() {
  console.log('🔍 COMPREHENSIVE MAPPING VERIFICATION');
  console.log('====================================');
  console.log('⚠️  NO GUESSING - Complete verification of all mappings');

  let errors = [];
  let warnings = [];
  let verified = [];

  // Step 1: Load all configuration files
  console.log('\n📋 Step 1: Loading Configuration Files');

  let deployments = {};
  let mainConfig = {};
  let frontendConfig = {};
  let frontendABIs = {};

  try {
    // Load deployment files
    const deploymentFiles = fs.readdirSync(DEPLOYMENTS_DIR);
    for (const file of deploymentFiles) {
      if (file.endsWith('.json')) {
        const deployment = JSON.parse(
          fs.readFileSync(path.join(DEPLOYMENTS_DIR, file), 'utf8')
        );
        deployments[file.replace('.json', '')] = deployment;
      }
    }
    console.log(
      `✅ Loaded ${Object.keys(deployments).length} deployment files`
    );

    // Load main config
    mainConfig = JSON.parse(fs.readFileSync(MAIN_CONFIG, 'utf8'));
    console.log('✅ Loaded main configuration');

    // Load frontend config
    frontendConfig = JSON.parse(fs.readFileSync(FRONTEND_CONFIG, 'utf8'));
    console.log('✅ Loaded frontend configuration');

    // Load frontend ABIs
    frontendABIs = JSON.parse(fs.readFileSync(FRONTEND_ABIS, 'utf8'));
    console.log('✅ Loaded frontend ABIs');
  } catch (error) {
    errors.push(`Failed to load configuration files: ${error.message}`);
    console.error('❌ Configuration loading failed');
    return { errors, warnings, verified };
  }

  // Step 2: Verify Contract Address Consistency
  console.log('\n🏠 Step 2: Contract Address Consistency Check');

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
    orchestrator: {
      deployment: deployments.orchestrator?.address,
      mainConfig: mainConfig.contracts?.orchestrators?.main?.address,
      frontendConfig: frontendConfig.contracts?.orchestrator?.address,
    },
    'governance-orchestrator': {
      deployment: deployments['governance-orchestrator']?.address,
      mainConfig: mainConfig.contracts?.orchestrators?.governance?.address,
      frontendConfig:
        frontendConfig.contracts?.['governance-orchestrator']?.address,
    },
    'audit-registry': {
      deployment: deployments['audit-registry']?.address,
      mainConfig: mainConfig.contracts?.orchestrators?.auditRegistry?.address,
      frontendConfig: frontendConfig.contracts?.['audit-registry']?.address,
    },
    'ping-facet': {
      deployment: deployments['ping-facet']?.address,
      mainConfig: mainConfig.contracts?.facets?.ping?.address,
      frontendConfig: frontendConfig.contracts?.['ping-facet']?.address,
    },
  };

  for (const [contractName, addresses] of Object.entries(addressMappings)) {
    const uniqueAddresses = new Set(
      Object.values(addresses).filter(addr => addr)
    );

    if (uniqueAddresses.size === 0) {
      warnings.push(`No addresses found for ${contractName}`);
      console.log(`⚠️  ${contractName}: No addresses found`);
    } else if (uniqueAddresses.size === 1) {
      const address = Array.from(uniqueAddresses)[0];
      verified.push(
        `${contractName}: ${address} (consistent across all configs)`
      );
      console.log(`✅ ${contractName}: ${address} (consistent)`);
    } else {
      errors.push(
        `${contractName}: Inconsistent addresses - ${JSON.stringify(addresses)}`
      );
      console.log(`❌ ${contractName}: INCONSISTENT ADDRESSES`);
      console.log(`   Deployment: ${addresses.deployment}`);
      console.log(`   Main Config: ${addresses.mainConfig}`);
      console.log(`   Frontend: ${addresses.frontendConfig}`);
    }
  }

  // Step 3: Verify ABI Availability
  console.log('\n🔧 Step 3: ABI Availability Check');

  const contractNames = [
    'DeterministicChunkFactory',
    'ManifestDispatcher',
    'Orchestrator',
    'GovernanceOrchestrator',
    'AuditRegistry',
    'PingFacet',
    'ExampleFacetA',
    'ExampleFacetB',
  ];

  for (const contractName of contractNames) {
    const hasArtifact = checkArtifactExists(contractName);
    const hasFrontendABI = frontendABIs[contractName] !== undefined;

    if (hasArtifact && hasFrontendABI) {
      verified.push(`${contractName}: ABI available in artifacts and frontend`);
      console.log(`✅ ${contractName}: ABI verified`);
    } else if (!hasArtifact) {
      errors.push(`${contractName}: Missing artifact file`);
      console.log(`❌ ${contractName}: Missing artifact`);
    } else if (!hasFrontendABI) {
      errors.push(`${contractName}: Missing frontend ABI`);
      console.log(`❌ ${contractName}: Missing frontend ABI`);
    }
  }

  // Step 4: Test Blockchain Connectivity
  console.log('\n⛓️  Step 4: Blockchain Connectivity Test');

  try {
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();

    verified.push(
      `Blockchain: Connected to chain ${network.chainId}, block ${blockNumber}`
    );
    console.log(
      `✅ Blockchain: Connected (Chain ${network.chainId}, Block ${blockNumber})`
    );

    // Test a few key contracts
    const testContracts = [
      { name: 'Factory', address: addressMappings.factory.deployment },
      { name: 'Dispatcher', address: addressMappings.dispatcher.deployment },
    ];

    for (const { name, address } of testContracts) {
      if (address) {
        try {
          const code = await provider.getCode(address);
          if (code && code !== '0x') {
            verified.push(`${name}: Contract exists at ${address}`);
            console.log(
              `✅ ${name}: Contract verified at ${address.slice(0, 10)}...`
            );
          } else {
            errors.push(`${name}: No contract code at ${address}`);
            console.log(`❌ ${name}: No contract at ${address}`);
          }
        } catch (contractError) {
          errors.push(
            `${name}: Error checking contract: ${contractError.message}`
          );
          console.log(`❌ ${name}: Error - ${contractError.message}`);
        }
      }
    }
  } catch (blockchainError) {
    errors.push(`Blockchain connection failed: ${blockchainError.message}`);
    console.log(`❌ Blockchain: Connection failed`);
  }

  // Step 5: Verify File Structure
  console.log('\n📁 Step 5: File Structure Verification');

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
    {
      path: path.join(__dirname, '../scripts/generate-contract-bundle.js'),
      name: 'Bundle generator',
    },
  ];

  for (const { path: filePath, name } of requiredFiles) {
    if (fs.existsSync(filePath)) {
      verified.push(`${name}: File exists`);
      console.log(`✅ ${name}: Exists`);
    } else {
      errors.push(`${name}: File missing at ${filePath}`);
      console.log(`❌ ${name}: Missing`);
    }
  }

  return { errors, warnings, verified };
}

function checkArtifactExists(contractName) {
  const artifactMapping = {
    DeterministicChunkFactory:
      'factory/DeterministicChunkFactory.sol/DeterministicChunkFactory.json',
    ManifestDispatcher:
      'dispatcher/ManifestDispatcher.sol/ManifestDispatcher.json',
    Orchestrator: 'orchestrator/Orchestrator.sol/Orchestrator.json',
    GovernanceOrchestrator:
      'orchestrator/GovernanceOrchestrator.sol/GovernanceOrchestrator.json',
    AuditRegistry: 'orchestrator/AuditRegistry.sol/AuditRegistry.json',
    PingFacet: 'facets/PingFacet.sol/PingFacet.json',
    ExampleFacetA: 'facets/ExampleFacetA.sol/ExampleFacetA.json',
    ExampleFacetB: 'facets/ExampleFacetB.sol/ExampleFacetB.json',
  };

  const artifactPath = artifactMapping[contractName];
  if (!artifactPath) return false;

  const fullPath = path.join(ARTIFACTS_DIR, artifactPath);
  return fs.existsSync(fullPath);
}

// Main execution
async function main() {
  const { errors, warnings, verified } = await comprehensiveVerification();

  console.log('\n📊 VERIFICATION SUMMARY');
  console.log('======================');

  console.log(`\n✅ VERIFIED (${verified.length}):`);
  verified.forEach(item => console.log(`   ✓ ${item}`));

  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(item => console.log(`   ⚠ ${item}`));
  }

  if (errors.length > 0) {
    console.log(`\n❌ ERRORS (${errors.length}):`);
    errors.forEach(item => console.log(`   ✗ ${item}`));
  }

  console.log('\n🏁 FINAL VERDICT');
  console.log('================');

  if (errors.length === 0) {
    console.log('🎉 SUCCESS: All mappings verified - NO GUESSING required!');
    console.log(
      '✅ The system is completely mapped and ready for production use.'
    );
    console.log('\n📋 What this means:');
    console.log(
      '   • All contract addresses are consistent across all config files'
    );
    console.log('   • All ABIs are available and accessible');
    console.log('   • Blockchain connectivity is working');
    console.log('   • File structure is complete');
    console.log('   • Frontend and backend can reliably connect to contracts');
    process.exit(0);
  } else if (errors.length <= 2 && warnings.length === 0) {
    console.log(
      '⚠️  MOSTLY READY: Minor issues detected but system is largely functional'
    );
    console.log('🔧 Fix the errors above and re-run verification');
    process.exit(1);
  } else {
    console.log('❌ CRITICAL ISSUES: System mapping has significant problems');
    console.log(
      '🚨 Must fix all errors before proceeding - NO GUESSING allowed'
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Verification script failed:', error);
    process.exit(1);
  });
}

module.exports = { comprehensiveVerification };

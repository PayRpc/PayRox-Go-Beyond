#!/usr/bin/env node

/**
 * Contract ABI Bundle Generator
 * Combines all deployed contract ABIs into a single JSON file for frontend use
 */

const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = path.join(__dirname, '../artifacts/contracts');
const DEPLOYMENTS_DIR = path.join(__dirname, '../deployments/localhost');
const CONFIG_DIR = path.join(__dirname, '../config');
const OUTPUT_FILE = path.join(
  __dirname,
  '../tools/ai-assistant/frontend/src/contracts/abis.json'
);
const OUTPUT_CONFIG = path.join(
  __dirname,
  '../tools/ai-assistant/frontend/src/contracts/config.json'
);

// Contract mapping - from deployment files to artifact locations
const CONTRACT_MAPPING = {
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

function loadDeploymentInfo() {
  const deployments = {};

  try {
    const deploymentFiles = fs.readdirSync(DEPLOYMENTS_DIR);

    for (const file of deploymentFiles) {
      if (file.endsWith('.json')) {
        const filePath = path.join(DEPLOYMENTS_DIR, file);
        const deployment = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        const key = file.replace('.json', '');
        deployments[key] = {
          contractName: deployment.contractName,
          address: deployment.address,
          deployer: deployment.deployer,
          network: deployment.network,
          timestamp: deployment.timestamp,
          transactionHash: deployment.transactionHash,
        };
      }
    }

    return deployments;
  } catch (error) {
    console.error('Error loading deployment info:', error.message);
    return {};
  }
}

function loadContractABI(contractName) {
  const artifactPath = CONTRACT_MAPPING[contractName];
  if (!artifactPath) {
    console.warn(`No artifact mapping found for contract: ${contractName}`);
    return null;
  }

  const fullPath = path.join(ARTIFACTS_DIR, artifactPath);

  try {
    const artifact = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    return {
      contractName: artifact.contractName,
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      linkReferences: artifact.linkReferences,
      deployedBytecode: artifact.deployedBytecode,
    };
  } catch (error) {
    console.error(`Error loading ABI for ${contractName}:`, error.message);
    return null;
  }
}

function generateContractBundle() {
  console.log('🔄 Generating contract ABI bundle...');

  const deployments = loadDeploymentInfo();
  const abis = {};
  const config = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    network: 'localhost',
    contracts: {},
  };

  // Process each deployment
  for (const [deploymentKey, deployment] of Object.entries(deployments)) {
    const contractName = deployment.contractName;
    console.log(`📋 Processing ${contractName}...`);

    const contractInfo = loadContractABI(contractName);
    if (contractInfo) {
      abis[contractName] = contractInfo;

      config.contracts[deploymentKey] = {
        name: contractName,
        address: deployment.address,
        hasABI: true,
        timestamp: deployment.timestamp,
      };

      console.log(`✅ Added ${contractName} (${deployment.address})`);
    } else {
      config.contracts[deploymentKey] = {
        name: contractName,
        address: deployment.address,
        hasABI: false,
        error: 'ABI not found',
      };

      console.log(`⚠️  Warning: Could not load ABI for ${contractName}`);
    }
  }

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write ABI bundle
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(abis, null, 2));
  console.log(`💾 ABI bundle saved to: ${OUTPUT_FILE}`);

  // Write config
  fs.writeFileSync(OUTPUT_CONFIG, JSON.stringify(config, null, 2));
  console.log(`💾 Config saved to: ${OUTPUT_CONFIG}`);

  // Generate summary
  const totalContracts = Object.keys(abis).length;
  const totalDeployments = Object.keys(deployments).length;

  console.log(`\n📊 Bundle Summary:`);
  console.log(`   📋 Total deployments: ${totalDeployments}`);
  console.log(`   🔧 Contracts with ABIs: ${totalContracts}`);
  console.log(`   📁 Output directory: ${outputDir}`);

  if (totalContracts > 0) {
    console.log(`\n🎉 Contract bundle generation complete!`);
    console.log(`   Frontend can now import ABIs from: ./contracts/abis.json`);
    console.log(`   Contract addresses from: ./contracts/config.json`);
  } else {
    console.log(
      `\n⚠️  No contract ABIs were bundled. Check deployment and artifacts.`
    );
  }

  return { abis, config };
}

// Generate TypeScript definitions
function generateTypeScriptDefs(abis) {
  const tsDefPath = path.join(path.dirname(OUTPUT_FILE), 'types.ts');

  let tsContent = `// Auto-generated TypeScript definitions for PayRox contracts
// Generated at: ${new Date().toISOString()}

export interface ContractABI {
  contractName: string;
  abi: any[];
  bytecode: string;
  linkReferences: any;
  deployedBytecode: string;
}

export interface ContractInfo {
  name: string;
  address: string;
  hasABI: boolean;
  timestamp?: string;
  error?: string;
}

export interface PayRoxContracts {
`;

  for (const contractName of Object.keys(abis)) {
    tsContent += `  ${contractName}: ContractABI;\n`;
  }

  tsContent += `}

export const CONTRACT_ADDRESSES = {
`;

  const config = JSON.parse(fs.readFileSync(OUTPUT_CONFIG, 'utf8'));
  for (const [key, contract] of Object.entries(config.contracts)) {
    tsContent += `  ${key.toUpperCase()}: '${contract.address}',\n`;
  }

  tsContent += `} as const;
`;

  fs.writeFileSync(tsDefPath, tsContent);
  console.log(`📝 TypeScript definitions saved to: ${tsDefPath}`);
}

// Main execution
if (require.main === module) {
  try {
    const { abis, config } = generateContractBundle();
    generateTypeScriptDefs(abis);

    console.log(`\n🚀 Ready for frontend integration!`);
    console.log(`   Import ABIs: import abis from './contracts/abis.json';`);
    console.log(
      `   Import config: import config from './contracts/config.json';`
    );
    console.log(
      `   Import types: import { PayRoxContracts } from './contracts/types';`
    );
  } catch (error) {
    console.error('❌ Bundle generation failed:', error);
    process.exit(1);
  }
}

module.exports = {
  generateContractBundle,
  CONTRACT_MAPPING,
  loadDeploymentInfo,
  loadContractABI,
};

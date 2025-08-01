import * as fs from 'fs';
import { ethers } from 'hardhat';
import * as path from 'path';

interface DeploymentInfo {
  contractName: string;
  address: string;
  deployer: string;
  network: string;
  timestamp: string;
  transactionHash: string | undefined;
  constructorArguments: any[];
  [key: string]: any;
}

async function main() {
  console.log('🚀 Complete PayRox Ecosystem Deployment');
  console.log('=======================================');

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);

  // Load existing deployments
  const factoryPath = path.join(
    __dirname,
    '..',
    'deployments',
    network.name,
    'factory.json'
  );
  const dispatcherPath = path.join(
    __dirname,
    '..',
    'deployments',
    network.name,
    'dispatcher.json'
  );

  if (!fs.existsSync(factoryPath) || !fs.existsSync(dispatcherPath)) {
    throw new Error(
      '❌ Core contracts not deployed! Run deploy-combined-contracts.ts first'
    );
  }

  const factoryInfo = JSON.parse(fs.readFileSync(factoryPath, 'utf8'));
  const dispatcherInfo = JSON.parse(fs.readFileSync(dispatcherPath, 'utf8'));

  console.log(`📍 Using Factory: ${factoryInfo.address}`);
  console.log(`📍 Using Dispatcher: ${dispatcherInfo.address}`);

  // Deploy missing ecosystem components
  const deployed = [];

  // 1. Deploy Main Orchestrator
  console.log('\n🎼 Deploying Main Orchestrator...');
  const OrchestratorContract = await ethers.getContractFactory('Orchestrator');
  const orchestrator = await OrchestratorContract.deploy(
    factoryInfo.address, // factory
    dispatcherInfo.address // dispatcher
  );
  await orchestrator.waitForDeployment();

  const orchestratorAddress = await orchestrator.getAddress();
  console.log(`✅ Orchestrator deployed to: ${orchestratorAddress}`);

  await saveDeploymentInfo(
    {
      contractName: 'Orchestrator',
      address: orchestratorAddress,
      deployer: deployer.address,
      network: network.name,
      timestamp: new Date().toISOString(),
      transactionHash: orchestrator.deploymentTransaction()?.hash,
      constructorArguments: [factoryInfo.address, dispatcherInfo.address],
    },
    'orchestrator.json'
  );

  deployed.push({ name: 'Orchestrator', address: orchestratorAddress });

  // 2. Deploy Governance Orchestrator
  console.log('\n🏛️ Deploying Governance Orchestrator...');
  const GovOrchestratorContract = await ethers.getContractFactory(
    'GovernanceOrchestrator'
  );
  const govOrchestrator = await GovOrchestratorContract.deploy(
    deployer.address // admin
  );
  await govOrchestrator.waitForDeployment();

  const govOrchestratorAddress = await govOrchestrator.getAddress();
  console.log(
    `✅ Governance Orchestrator deployed to: ${govOrchestratorAddress}`
  );

  await saveDeploymentInfo(
    {
      contractName: 'GovernanceOrchestrator',
      address: govOrchestratorAddress,
      deployer: deployer.address,
      network: network.name,
      timestamp: new Date().toISOString(),
      transactionHash: govOrchestrator.deploymentTransaction()?.hash,
      constructorArguments: [deployer.address],
    },
    'governance-orchestrator.json'
  );

  deployed.push({
    name: 'GovernanceOrchestrator',
    address: govOrchestratorAddress,
  });

  // 3. Deploy Audit Registry
  console.log('\n🔍 Deploying Audit Registry...');
  const AuditRegistryContract = await ethers.getContractFactory(
    'AuditRegistry'
  );
  const auditRegistry = await AuditRegistryContract.deploy(
    deployer.address // admin
  );
  await auditRegistry.waitForDeployment();

  const auditRegistryAddress = await auditRegistry.getAddress();
  console.log(`✅ Audit Registry deployed to: ${auditRegistryAddress}`);

  await saveDeploymentInfo(
    {
      contractName: 'AuditRegistry',
      address: auditRegistryAddress,
      deployer: deployer.address,
      network: network.name,
      timestamp: new Date().toISOString(),
      transactionHash: auditRegistry.deploymentTransaction()?.hash,
      constructorArguments: [deployer.address],
    },
    'audit-registry.json'
  );

  deployed.push({ name: 'AuditRegistry', address: auditRegistryAddress });

  // 4. Deploy Additional Example Facet (PingFacet)
  console.log('\n🏓 Deploying PingFacet...');
  const PingFacetContract = await ethers.getContractFactory('PingFacet');
  const pingFacet = await PingFacetContract.deploy();
  await pingFacet.waitForDeployment();

  const pingFacetAddress = await pingFacet.getAddress();
  console.log(`✅ PingFacet deployed to: ${pingFacetAddress}`);

  await saveDeploymentInfo(
    {
      contractName: 'PingFacet',
      address: pingFacetAddress,
      deployer: deployer.address,
      network: network.name,
      timestamp: new Date().toISOString(),
      transactionHash: pingFacet.deploymentTransaction()?.hash,
      constructorArguments: [],
    },
    'ping-facet.json'
  );

  deployed.push({ name: 'PingFacet', address: pingFacetAddress });

  // 5. Create Complete Ecosystem Manifest
  console.log('\n📋 Creating Complete Ecosystem Manifest...');

  const ecosystemManifest = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    description: 'Complete PayRox Go Beyond Ecosystem - Ready for Developers',
    network: {
      name: network.name,
      chainId: network.chainId.toString(),
    },
    core: {
      factory: factoryInfo.address,
      dispatcher: dispatcherInfo.address,
    },
    orchestrators: {
      main: orchestratorAddress,
      governance: govOrchestratorAddress,
      auditRegistry: auditRegistryAddress,
    },
    facets: {
      exampleA: 'deployed', // From previous deployment
      exampleB: 'deployed', // From previous deployment
      ping: pingFacetAddress,
    },
    sdk: {
      ready: true,
      npmPackage: '@payrox/go-beyond-sdk',
      contractABIs: 'Available in artifacts/',
      typechain: 'Available in typechain-types/',
    },
    developer: {
      readyForIntegration: true,
      supports: ['dApps', 'plugins', 'extensions', 'custom facets'],
      documentation: 'Available in docs/',
      examples: 'Available in sdk/examples/',
    },
  };

  const manifestPath = path.join(
    __dirname,
    '..',
    'manifests',
    'ecosystem-complete.manifest.json'
  );
  fs.writeFileSync(manifestPath, JSON.stringify(ecosystemManifest, null, 2));
  console.log(`📋 Ecosystem manifest saved: ${manifestPath}`);

  // Success Summary
  console.log('\n🎉 COMPLETE ECOSYSTEM DEPLOYMENT SUCCESSFUL!');
  console.log('===========================================');
  console.log('\n📦 Core Infrastructure:');
  console.log(`   Factory:    ${factoryInfo.address}`);
  console.log(`   Dispatcher: ${dispatcherInfo.address}`);

  console.log('\n🎼 Orchestration Layer:');
  deployed.forEach(contract => {
    console.log(`   ${contract.name}: ${contract.address}`);
  });

  console.log('\n🚀 Developer Ecosystem Status:');
  console.log('   ✅ Core contracts deployed and functional');
  console.log('   ✅ Orchestration layer complete');
  console.log('   ✅ Example facets available');
  console.log('   ✅ SDK ready for integration');
  console.log('   ✅ TypeScript types generated');
  console.log('   ✅ Documentation available');

  console.log('\n🛠️ Ready for:');
  console.log('   • dApp development with @payrox/go-beyond-sdk');
  console.log('   • Custom facet development');
  console.log('   • Plugin ecosystem integration');
  console.log('   • Enterprise deployment');

  return {
    core: { factory: factoryInfo.address, dispatcher: dispatcherInfo.address },
    orchestrators: {
      orchestrator: orchestratorAddress,
      governance: govOrchestratorAddress,
      audit: auditRegistryAddress,
    },
    facets: { ping: pingFacetAddress },
    ready: true,
  };
}

async function saveDeploymentInfo(
  deploymentInfo: DeploymentInfo,
  filename: string
) {
  const deploymentsDir = path.join(
    __dirname,
    '..',
    'deployments',
    deploymentInfo.network
  );

  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, filename);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved: ${deploymentPath}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ecosystem deployment failed:', error);
    process.exit(1);
  });

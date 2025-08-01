import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

interface DeploymentInfo {
  contractName: string;
  address: string;
  deployer: string;
  network: string;
  timestamp: string;
  transactionHash: string | undefined;
  constructorArguments: any[];
}

async function saveDeploymentInfo(
  networkName: string,
  info: DeploymentInfo
): Promise<void> {
  const deploymentsDir = path.join(process.cwd(), 'deployments', networkName);
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const serializableInfo = JSON.parse(JSON.stringify(info, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));

  const filePath = path.join(deploymentsDir, `${info.contractName.toLowerCase()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(serializableInfo, null, 2));
  console.log(`   📄 Saved deployment info: ${filePath}`);
}

/**
 * Deploy Orchestrator contracts as part of complete system deployment
 */
export async function deployOrchestrators(
  networkName: string, 
  factoryAddress: string, 
  dispatcherAddress: string,
  saveInfo: Function
) {
  console.log(`\n🎯 Deploying Orchestrator contracts...`);
  
  const [deployer] = await ethers.getSigners();
  
  // 1. Deploy main Orchestrator
  console.log(`\n🎼 Deploying Orchestrator...`);
  const OrchestratorContract = await ethers.getContractFactory('Orchestrator');
  const orchestrator = await OrchestratorContract.deploy(
    factoryAddress,  // IChunkFactory
    dispatcherAddress // IManifestDispatcher
  );
  await orchestrator.waitForDeployment();
  
  const orchestratorAddress = await orchestrator.getAddress();
  console.log(`✅ Orchestrator deployed to: ${orchestratorAddress}`);
  
  // Save orchestrator deployment info
  await saveInfo(networkName, {
    contractName: 'orchestrator',
    address: orchestratorAddress,
    deployer: deployer.address,
    network: networkName,
    timestamp: new Date().toISOString(),
    transactionHash: orchestrator.deploymentTransaction()?.hash,
    constructorArguments: [factoryAddress, dispatcherAddress]
  });
  
  // 2. Deploy GovernanceOrchestrator
  console.log(`\n🏛️ Deploying GovernanceOrchestrator...`);
  const GovernanceContract = await ethers.getContractFactory('GovernanceOrchestrator');
  const governance = await GovernanceContract.deploy(
    deployer.address // admin
  );
  await governance.waitForDeployment();
  
  const governanceAddress = await governance.getAddress();
  console.log(`✅ GovernanceOrchestrator deployed to: ${governanceAddress}`);
  
  // Save governance deployment info
  await saveInfo(networkName, {
    contractName: 'governance',
    address: governanceAddress,
    deployer: deployer.address,
    network: networkName,
    timestamp: new Date().toISOString(),
    transactionHash: governance.deploymentTransaction()?.hash,
    constructorArguments: [deployer.address]
  });
  
  // 3. Deploy AuditRegistry
  console.log(`\n🔍 Deploying AuditRegistry...`);
  const AuditContract = await ethers.getContractFactory('AuditRegistry');
  const auditRegistry = await AuditContract.deploy(
    deployer.address // admin
  );
  await auditRegistry.waitForDeployment();
  
  const auditAddress = await auditRegistry.getAddress();
  console.log(`✅ AuditRegistry deployed to: ${auditAddress}`);
  
  // Save audit registry deployment info
  await saveInfo(networkName, {
    contractName: 'auditregistry',
    address: auditAddress,
    deployer: deployer.address,
    network: networkName,
    timestamp: new Date().toISOString(),
    transactionHash: auditRegistry.deploymentTransaction()?.hash,
    constructorArguments: [deployer.address]
  });
  
  return {
    orchestrator: orchestratorAddress,
    governance: governanceAddress,
    auditRegistry: auditAddress
  };
}

// Standalone deployment if run directly
async function main() {
  console.log('🎯 PayRox Go Beyond - Orchestrator Contracts Deployment');
  console.log('======================================================');

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === 'unknown' ? 'localhost' : network.name;

  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`📡 Network: ${networkName} (Chain ID: ${network.chainId})`);

  // Load factory and dispatcher addresses from deployments
  const deploymentsDir = path.join(process.cwd(), 'deployments', networkName);
  
  let factoryAddress: string;
  let dispatcherAddress: string;
  
  try {
    const factoryInfo = JSON.parse(fs.readFileSync(path.join(deploymentsDir, 'factory.json'), 'utf8'));
    factoryAddress = factoryInfo.address;
    console.log(`📍 Using Factory at: ${factoryAddress}`);
  } catch (error) {
    throw new Error(`❌ Could not load factory address. Deploy factory first.`);
  }
  
  try {
    const dispatcherInfo = JSON.parse(fs.readFileSync(path.join(deploymentsDir, 'dispatcher.json'), 'utf8'));
    dispatcherAddress = dispatcherInfo.address;
    console.log(`📍 Using Dispatcher at: ${dispatcherAddress}`);
  } catch (error) {
    throw new Error(`❌ Could not load dispatcher address. Deploy dispatcher first.`);
  }

  try {
    const addresses = await deployOrchestrators(
      networkName,
      factoryAddress,
      dispatcherAddress,
      saveDeploymentInfo
    );

    console.log(`\n🎉 ORCHESTRATOR DEPLOYMENT COMPLETE!`);
    console.log(`=====================================`);
    console.log(`🎼 Orchestrator: ${addresses.orchestrator}`);
    console.log(`🏛️ Governance: ${addresses.governance}`);
    console.log(`🔍 AuditRegistry: ${addresses.auditRegistry}`);
    console.log(`\n✅ All orchestrator contracts deployed successfully!`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

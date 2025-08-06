import * as fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import * as path from 'path';

/**
 * Deploy the DeterministicChunkFactory contract
 */
export async function main(hre: HardhatRuntimeEnvironment, params?: any) {
  console.log('🏭 Deploying DeterministicChunkFactory...');

  const { ethers, network } = hre;
  const [deployer] = await ethers.getSigners();

  // Get contract factory
  const FactoryContract = await ethers.getContractFactory(
    'DeterministicChunkFactory'
  );

  // Deploy contract
  console.log('📡 Deploying contract...');
  
  // Generate placeholder hashes for the constructor
  const manifestHash = ethers.keccak256(ethers.toUtf8Bytes("PayRoxManifest_v1.0"));
  const factoryBytecodeHash = ethers.keccak256(ethers.toUtf8Bytes("PayRoxFactory_v1.0"));
  
  const factory = await FactoryContract.deploy(
    deployer.address, // _feeRecipient
    deployer.address, // _manifestDispatcher (placeholder for now)
    manifestHash,     // _manifestHash
    factoryBytecodeHash, // _factoryBytecodeHash
    ethers.parseEther('0.0007'), // _baseFeeWei (0.0007 ETH)
    true              // _feesEnabled
  );
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log(`✅ DeterministicChunkFactory deployed to: ${factoryAddress}`);

  // Verify deployment
  const feeRecipient = await factory.feeRecipient();
  const baseFeeWei = await factory.baseFeeWei();
  const feesEnabled = await factory.feesEnabled();

  console.log(`  � Fee recipient: ${feeRecipient}`);
  console.log(`  📊 Base fee: ${ethers.formatEther(baseFeeWei)} ETH`);
  console.log(`  ⚙️  Fees enabled: ${feesEnabled}`);

  // Save deployment information
  await saveDeploymentInfo({
    contractName: 'DeterministicChunkFactory',
    address: factoryAddress,
    deployer: deployer.address,
    network: network.name,
    timestamp: new Date().toISOString(),
    transactionHash: factory.deploymentTransaction()?.hash,
    constructorArguments: [deployer.address, deployer.address, '0.001 ETH'],
    feeRecipient: feeRecipient,
  });

  return factoryAddress;
}

async function saveDeploymentInfo(deploymentInfo: any) {
  const deploymentsDir = path.join(
    __dirname,
    '..',
    'deployments',
    deploymentInfo.network
  );

  // Ensure deployments directory exists
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info
  const deploymentPath = path.join(deploymentsDir, 'factory.json');
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log(`💾 Deployment info saved: ${deploymentPath}`);
}

// Export for CLI usage
if (require.main === module) {
  import('hardhat')
    .then(async hre => {
      await main(hre.default);
      process.exit(0);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

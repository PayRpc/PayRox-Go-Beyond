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
  const factory = await FactoryContract.deploy(
    deployer.address, // admin
    deployer.address, // feeRecipient
    ethers.parseEther('0.0007') // baseFeeWei (0.0007 ETH)
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

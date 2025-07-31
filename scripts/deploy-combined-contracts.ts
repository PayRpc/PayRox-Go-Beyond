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
  console.log('🚀 Combined Factory + Dispatcher Deployment');
  console.log('===========================================');

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);

  const initialNonce = await ethers.provider.getTransactionCount(
    deployer.address
  );
  console.log(`🔢 Starting Nonce: ${initialNonce}`);

  // Step 1: Deploy Factory
  console.log(`\n🏭 Deploying DeterministicChunkFactory...`);

  const FactoryContract = await ethers.getContractFactory(
    'DeterministicChunkFactory'
  );
  const factory = await FactoryContract.deploy(
    deployer.address, // admin
    deployer.address, // feeRecipient
    ethers.parseEther('0.001') // baseFeeWei (0.001 ETH)
  );
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log(`✅ Factory deployed to: ${factoryAddress}`);

  // Verify factory deployment
  const feeRecipient = await factory.feeRecipient();
  const baseFeeWei = await factory.baseFeeWei();
  console.log(`   💰 Fee recipient: ${feeRecipient}`);
  console.log(`   📊 Base fee: ${ethers.formatEther(baseFeeWei)} ETH`);

  // Step 2: Deploy Dispatcher (immediately after, same session)
  console.log(`\n📡 Deploying ManifestDispatcher...`);

  const DispatcherContract = await ethers.getContractFactory(
    'ManifestDispatcher'
  );
  const dispatcher = await DispatcherContract.deploy(
    deployer.address, // admin
    60 // activationDelay (60 seconds)
  );
  await dispatcher.waitForDeployment();

  const dispatcherAddress = await dispatcher.getAddress();
  console.log(`✅ Dispatcher deployed to: ${dispatcherAddress}`);

  // Verify dispatcher deployment
  const activationDelay = await dispatcher.activationDelay();
  const frozen = await dispatcher.frozen();
  console.log(`   ⏱️  Activation delay: ${activationDelay} seconds`);
  console.log(`   ❄️  Frozen: ${frozen}`);

  // Step 3: Verify addresses are different
  if (factoryAddress === dispatcherAddress) {
    throw new Error(
      '❌ CRITICAL ERROR: Factory and Dispatcher have the same address!'
    );
  }

  console.log(`\n✅ Address Verification Passed:`);
  console.log(`   🏭 Factory:    ${factoryAddress}`);
  console.log(`   📡 Dispatcher: ${dispatcherAddress}`);

  const finalNonce = await ethers.provider.getTransactionCount(
    deployer.address
  );
  console.log(`🔢 Final Nonce: ${finalNonce}`);
  console.log(`📊 Transactions Used: ${finalNonce - initialNonce}`);

  // Step 4: Save deployment artifacts
  await saveDeploymentInfo(
    {
      contractName: 'DeterministicChunkFactory',
      address: factoryAddress,
      deployer: deployer.address,
      network: network.name,
      timestamp: new Date().toISOString(),
      transactionHash: factory.deploymentTransaction()?.hash,
      constructorArguments: [deployer.address, deployer.address, '0.001 ETH'],
      feeRecipient: feeRecipient,
    },
    'factory.json'
  );

  await saveDeploymentInfo(
    {
      contractName: 'ManifestDispatcher',
      address: dispatcherAddress,
      deployer: deployer.address,
      network: network.name,
      timestamp: new Date().toISOString(),
      transactionHash: dispatcher.deploymentTransaction()?.hash,
      constructorArguments: [deployer.address, 60],
      activationDelay: activationDelay.toString(),
      frozen: frozen,
    },
    'dispatcher.json'
  );

  console.log(`\n🎉 Combined Deployment Complete!`);
  console.log(`   Both contracts deployed successfully with unique addresses.`);

  return { factoryAddress, dispatcherAddress };
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

  // Ensure deployments directory exists
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info
  const deploymentPath = path.join(deploymentsDir, filename);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log(`💾 Deployment info saved: ${deploymentPath}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Combined deployment failed:', error);
    process.exit(1);
  });

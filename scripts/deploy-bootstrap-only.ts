import { ethers } from 'hardhat';

async function main() {
  console.log('🔧 Fixed Bootstrap Deployment Process');
  console.log('=====================================');

  const [deployer] = await ethers.getSigners();

  // Step 1: Deploy Dispatcher
  console.log('\n📡 Deploying ManifestDispatcher...');

  const DispatcherContract = await ethers.getContractFactory(
    'ManifestDispatcher'
  );
  const dispatcher = await DispatcherContract.deploy(
    deployer.address, // admin
    0 // activationDelay = 0 for immediate activation
  );
  await dispatcher.waitForDeployment();

  const dispatcherAddress = await dispatcher.getAddress();
  console.log(`✅ Dispatcher deployed to: ${dispatcherAddress}`);

  // Step 2: Create and commit empty manifest (for bootstrap)
  console.log('\n🔧 Committing empty manifest for bootstrap...');

  // Use zero hash for bootstrap - no routes initially
  const emptyManifestHash = ethers.ZeroHash;
  console.log(`   📝 Empty manifest hash: ${emptyManifestHash}`);

  const commitTx = await dispatcher.commitRoot(emptyManifestHash, 1);
  await commitTx.wait();
  console.log('   ✅ Empty manifest committed');

  const activateTx = await dispatcher.activateCommittedRoot();
  await activateTx.wait();
  console.log('   ✅ Empty manifest activated');

  // Step 3: Deploy Factory with empty manifest hash
  console.log('\n🏭 Deploying DeterministicChunkFactory...');

  const FactoryContract = await ethers.getContractFactory(
    'DeterministicChunkFactory'
  );

  // Use empty hashes for bootstrap
  const expectedManifestHash = emptyManifestHash; // matches dispatcher
  const expectedFactoryBytecodeHash = ethers.keccak256('0x'); // empty during construction

  console.log(`   🔐 Expected Manifest Hash: ${expectedManifestHash}`);
  console.log(
    `   🔐 Expected Factory Bytecode Hash: ${expectedFactoryBytecodeHash}`
  );

  const factory = await FactoryContract.deploy(
    deployer.address, // admin
    deployer.address, // feeRecipient
    ethers.parseEther('0.001'), // baseFeeWei
    expectedManifestHash, // matches dispatcher's active root
    expectedFactoryBytecodeHash, // empty during construction
    dispatcherAddress // manifestDispatcher
  );
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log(`✅ Factory deployed to: ${factoryAddress}`);

  console.log('\n🎉 Bootstrap Deployment Complete!');
  console.log(`   Factory: ${factoryAddress}`);
  console.log(`   Dispatcher: ${dispatcherAddress}`);
  console.log(`   Both using empty manifest hash for bootstrap`);

  return { factoryAddress, dispatcherAddress };
}

main().catch(console.error);

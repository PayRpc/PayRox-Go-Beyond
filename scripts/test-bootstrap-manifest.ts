import { ethers } from 'hardhat';

async function main() {
  console.log('🔧 Testing Bootstrap Manifest Commitment...');

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log(`Deployer: ${deployer.address}`);
  console.log(`Network: ${network.name}`);

  // Step 1: Deploy dispatcher
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

  // Step 2: Create a minimal manifest and commit it
  const manifestHash = ethers.keccak256(
    ethers.toUtf8Bytes('bootstrap-manifest-v1')
  );
  console.log(`Manifest hash to commit: ${manifestHash}`);

  try {
    // Commit the manifest
    const commitTx = await dispatcher.commitRoot(manifestHash, 1);
    await commitTx.wait();
    console.log('✅ Manifest committed to dispatcher');

    // Activate immediately (delay = 0)
    const activateTx = await dispatcher.activateCommittedRoot();
    await activateTx.wait();
    console.log('✅ Manifest activated');

    // Verify it's active
    const activeRoot = await dispatcher.activeRoot();
    console.log(`Active root: ${activeRoot}`);

    if (activeRoot === manifestHash) {
      console.log('🎉 Success! Dispatcher now has the manifest hash active');
      console.log(
        `You can now deploy factory with expectedManifestHash: ${manifestHash}`
      );
    } else {
      console.log('❌ Failed to activate manifest');
    }
  } catch (error) {
    console.log('❌ Failed to commit/activate manifest:', error);
  }
}

main().catch(console.error);

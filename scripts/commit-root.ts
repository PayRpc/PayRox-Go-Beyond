import fs from 'fs';
import { ethers } from 'hardhat';
import path from 'path';

async function main() {
  console.log('🔗 Step 1: Committing manifest root to dispatcher...');

  // Load merkle data
  const merklePath = path.join(__dirname, '../manifests/current.merkle.json');

  if (!fs.existsSync(merklePath)) {
    console.log('⚠️  No merkle data found - skipping root commit');
    return;
  }

  const merkleData = JSON.parse(fs.readFileSync(merklePath, 'utf8'));
  console.log('🌳 Merkle root:', merkleData.root);

  // Find dispatcher address dynamically
  let dispatcherAddress = '';

  // Try network-specific deployment first
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();
  const dispatcherPath = path.join(
    __dirname,
    `../deployments/${chainId}/dispatcher.json`
  );

  if (fs.existsSync(dispatcherPath)) {
    const dispatcherData = JSON.parse(fs.readFileSync(dispatcherPath, 'utf8'));
    dispatcherAddress = dispatcherData.address;
  } else {
    // Fallback to hardhat deployment
    const hardhatDispatcherPath = path.join(
      __dirname,
      '../deployments/hardhat/dispatcher.json'
    );
    if (fs.existsSync(hardhatDispatcherPath)) {
      const dispatcherData = JSON.parse(
        fs.readFileSync(hardhatDispatcherPath, 'utf8')
      );
      dispatcherAddress = dispatcherData.address;
    }
  }

  if (!dispatcherAddress) {
    throw new Error('Dispatcher address not found in deployment artifacts');
  }

  console.log('📡 Using dispatcher at:', dispatcherAddress);

  // Connect to the dispatcher
  const dispatcher = await ethers.getContractAt(
    'ManifestDispatcher',
    dispatcherAddress
  );

  // Step 1: Check if we can read the current state
  console.log('\n🔍 Checking dispatcher state...');

  try {
    let currentRoot =
      '0x0000000000000000000000000000000000000000000000000000000000000000';
    try {
      currentRoot = await dispatcher.currentRoot();
      console.log('📋 Current root:', currentRoot);
    } catch (error) {
      console.log('📋 Current root: Not set (new deployment)');
    }

    let pendingRoot =
      '0x0000000000000000000000000000000000000000000000000000000000000000';
    try {
      pendingRoot = await dispatcher.pendingRoot();
      console.log('⏳ Pending root:', pendingRoot);
    } catch (error) {
      console.log('⏳ Pending root: Not set');
    }

    // Step 2: Commit the merkle root
    console.log('\n1️⃣ Committing merkle root...');

    const commitTx = await dispatcher.commitRoot(merkleData.root, 1);
    console.log('⏳ Transaction submitted:', commitTx.hash);

    const commitReceipt = await commitTx.wait();
    console.log(
      '✅ Merkle root committed. Gas used:',
      commitReceipt?.gasUsed.toString()
    );

    // Check updated state
    const newPendingRoot = await dispatcher.pendingRoot();
    const pendingEpoch = await dispatcher.pendingEpoch();

    console.log('Updated state:');
    console.log('  Pending root:', newPendingRoot);
    console.log('  Pending epoch:', pendingEpoch.toString());
  } catch (error) {
    console.error(
      '❌ Error committing root:',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }

  console.log('\n🎉 Root commitment successful!');
  console.log('📝 Next step: Apply individual routes with merkle proofs');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

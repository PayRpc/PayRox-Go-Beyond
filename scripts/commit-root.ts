import fs from 'fs';
import { artifacts, ethers } from 'hardhat';
import path from 'path';

// Defensive function to read pending fields from dispatcher
async function readPendingFields(dispatcherAddr: string) {
  const art = await artifacts.readArtifact('ManifestDispatcher');
  const disp = new ethers.Contract(
    dispatcherAddr,
    art.abi,
    (await ethers.getSigners())[0]
  );

  // Sanity: ensure we're at a contract
  const code = await ethers.provider.getCode(dispatcherAddr);
  if (code === '0x')
    throw new Error(`No code at dispatcher address ${dispatcherAddr}`);

  console.log('   Dispatcher code size:', code.length, 'bytes');

  // Try newer layout: public vars have their own getters
  try {
    const [root, epoch, ts] = await Promise.all([
      disp.pendingRoot?.().catch(() => null),
      disp.pendingEpoch?.().catch(() => null),
      disp.earliestActivation?.().catch(() => null),
    ]);
    if (root !== null) {
      console.log('   Using individual getter layout');
      return { root, epoch, ts };
    }
  } catch {
    /* fallthrough */
  }

  // Try struct layout: pending() returns tuple
  if (typeof disp.pending === 'function') {
    console.log('   Using struct getter layout');
    const p = await disp.pending();
    // support both named and indexed tuple returns
    const root = p.root ?? p[0];
    const epoch = p.epoch ?? p[1];
    const ts = p.earliestActivation ?? p[2];
    return { root, epoch, ts };
  }

  throw new Error('Dispatcher ABI mismatch: cannot read pending fields');
}

async function readCurrentRoot(dispatcherAddr: string) {
  const art = await artifacts.readArtifact('ManifestDispatcher');
  const disp = new ethers.Contract(
    dispatcherAddr,
    art.abi,
    (await ethers.getSigners())[0]
  );

  try {
    return await disp.activeRoot();
  } catch (error) {
    console.log(
      '   [WARN] Could not read active root:',
      error instanceof Error ? error.message : String(error)
    );
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }
}

async function main() {
  console.log('[INFO] Committing manifest root to dispatcher...');

  // Load merkle data
  const merklePath = path.join(__dirname, '../manifests/current.merkle.json');

  if (!fs.existsSync(merklePath)) {
    console.log('[WARN] No merkle data found - skipping root commit');
    return;
  }

  const merkleData = JSON.parse(fs.readFileSync(merklePath, 'utf8'));
  console.log('[INFO] Merkle root:', merkleData.root);

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

  console.log('[INFO] Using dispatcher at:', dispatcherAddress);

  // Connect to the dispatcher with defensive ABI handling
  const dispatcher = await ethers.getContractAt(
    'ManifestDispatcher',
    dispatcherAddress
  );

  // Step 1: Check if we can read the current state using defensive methods
  console.log('\n[INFO] Checking dispatcher state...');

  try {
    // Use defensive reading for current root
    const currentRoot = await readCurrentRoot(dispatcherAddress);
    console.log('[INFO] Current root:', currentRoot);

    // Use defensive reading for pending state
    let pendingState;
    try {
      pendingState = await readPendingFields(dispatcherAddress);
      console.log('[INFO] Pending root:', pendingState.root);
      console.log(
        '[INFO] Pending epoch:',
        pendingState.epoch?.toString() || 'N/A'
      );
    } catch (error) {
      console.log(
        '[WARN] Could not read pending state:',
        error instanceof Error ? error.message : String(error)
      );
      pendingState = {
        root: '0x0000000000000000000000000000000000000000000000000000000000000000',
        epoch: 0,
      };
    }

    // Step 2: Commit the merkle root
    console.log('\n[INFO] Committing merkle root...');

    const commitTx = await dispatcher.commitRoot(merkleData.root, 1);
    console.log('[INFO] Transaction submitted:', commitTx.hash);

    const commitReceipt = await commitTx.wait();
    console.log(
      '[OK] Merkle root committed. Gas used:',
      commitReceipt?.gasUsed.toString()
    );

    // Check updated state using defensive reading
    try {
      const updatedState = await readPendingFields(dispatcherAddress);
      console.log('[INFO] Updated state:');
      console.log('   Pending root:', updatedState.root);
      console.log('   Pending epoch:', updatedState.epoch?.toString() || 'N/A');
    } catch (error) {
      console.log(
        '[WARN] Could not read updated state:',
        error instanceof Error ? error.message : String(error)
      );
    }
  } catch (error) {
    console.error(
      '[ERROR] Error committing root:',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }

  console.log('\n[OK] Root commitment successful!');
  console.log('[INFO] Next step: Apply individual routes with merkle proofs');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[ERROR] Fatal error:', error);
    process.exit(1);
  });

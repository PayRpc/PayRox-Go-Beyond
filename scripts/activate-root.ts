// scripts/activate-root.ts
import fs from 'fs';
import { artifacts, ethers } from 'hardhat';
import path from 'path';

async function main() {
  console.log('[INFO] Activating committed root...');

  // Get dispatcher address and epoch
  let dispatcherAddr = process.env.DISPATCHER || process.argv[2];
  let epoch = process.env.EPOCH ? BigInt(process.env.EPOCH) : undefined;

  // If not provided via args, try to read from deployment artifacts
  if (!dispatcherAddr) {
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId.toString();

    // Try network-specific deployment first
    let dispatcherPath = path.join(
      __dirname,
      `../deployments/${chainId}/dispatcher.json`
    );

    if (!fs.existsSync(dispatcherPath)) {
      // Fallback to hardhat deployment
      dispatcherPath = path.join(
        __dirname,
        '../deployments/hardhat/dispatcher.json'
      );
    }

    if (fs.existsSync(dispatcherPath)) {
      const dispatcherData = JSON.parse(
        fs.readFileSync(dispatcherPath, 'utf8')
      );
      dispatcherAddr = dispatcherData.address;
      console.log(
        '[INFO] Found dispatcher address from deployment artifacts:',
        dispatcherAddr
      );
    }
  }

  // Try to get epoch from manifest if not provided
  if (epoch === undefined) {
    const manifestPath = path.join(
      __dirname,
      '../manifests/current.manifest.json'
    );
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.epoch !== undefined) {
        epoch = BigInt(manifest.epoch);
        console.log('[INFO] Found epoch from manifest:', epoch.toString());
      } else {
        // Try header epoch or use default
        epoch = manifest.header?.epoch ? BigInt(manifest.header.epoch) : 1n;
        console.log('[INFO] Using default epoch:', epoch.toString());
      }
    } else {
      // Fallback to epoch 1
      epoch = 1n;
      console.log('[INFO] Using fallback epoch:', epoch.toString());
    }
  }

  if (!dispatcherAddr || epoch === undefined) {
    console.error(
      '[ERROR] Usage: DISPATCHER=0x... EPOCH=N npx hardhat run scripts/activate-root.ts'
    );
    console.error(
      '   Or provide as command line args: npx hardhat run scripts/activate-root.ts -- 0x... N'
    );
    process.exit(1);
  }

  console.log('[INFO] Dispatcher:', dispatcherAddr);
  console.log('[INFO] Epoch to activate:', epoch.toString());

  // Verify contract exists
  const code = await ethers.provider.getCode(dispatcherAddr);
  if (code === '0x') {
    throw new Error(`No code at dispatcher address ${dispatcherAddr}`);
  }

  const art = await artifacts.readArtifact('ManifestDispatcher');
  const disp = new ethers.Contract(
    dispatcherAddr,
    art.abi,
    (await ethers.getSigners())[0]
  );

  // Check current state
  try {
    const currentEpoch = (await disp.activeEpoch?.()) || 0n;
    console.log('[INFO] Current active epoch:', currentEpoch.toString());

    if (currentEpoch >= epoch) {
      console.log(
        '[WARN] Epoch',
        epoch.toString(),
        'is already active or superseded'
      );
      return;
    }
  } catch (error) {
    console.log(
      '[WARN] Could not read current epoch, proceeding with activation'
    );
  }

  // Check if we need to fast-forward time for hardhat
  const networkName = (await ethers.provider.getNetwork()).name;
  if (networkName === 'hardhat' || networkName === 'localhost') {
    console.log(
      '[INFO] Hardhat network detected - fast-forwarding time if needed'
    );
    try {
      // Fast-forward 1 hour to handle any activation delay
      await ethers.provider.send('evm_increaseTime', [3600]);
      await ethers.provider.send('evm_mine', []);
      console.log('[INFO] Time advanced by 1 hour');
    } catch (error) {
      console.log(
        '[WARN] Could not advance time:',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  // Activate the root
  try {
    console.log('[INFO] Activating committed root...');
    const tx = await disp.activateCommittedRoot();
    console.log('[INFO] Transaction submitted:', tx.hash);

    const rc = await tx.wait();
    console.log('[OK] Root activated successfully!');
    console.log('[INFO] Gas used:', rc?.gasUsed?.toString() || 'N/A');
    console.log('[INFO] Block number:', rc?.blockNumber || 'N/A');

    // Verify activation
    try {
      const newCurrentEpoch = (await disp.activeEpoch?.()) || 0n;
      const newCurrentRoot = (await disp.activeRoot?.()) || '0x0';
      console.log('[INFO] New active epoch:', newCurrentEpoch.toString());
      console.log('[INFO] New active root:', newCurrentRoot);

      if (newCurrentEpoch === epoch) {
        console.log('[OK] Activation verified successfully!');
      } else {
        console.log('[WARN] Activation may not have taken effect as expected');
      }
    } catch (error) {
      console.log(
        '[WARN] Could not verify activation state:',
        error instanceof Error ? error.message : String(error)
      );
    }
  } catch (error) {
    console.error(
      '[ERROR] Activation failed:',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

main().catch(e => {
  console.error('[ERROR] Fatal error:', e);
  process.exit(1);
});

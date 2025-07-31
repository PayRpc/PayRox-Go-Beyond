/**
 * Commit Root Script
 *
 * Commits a merkle root to the ManifestDispatcher contract
 * with proper error handling and defensive ABI compatibility
 */

import type { Contract } from 'ethers';
import fs from 'fs';
import { artifacts, ethers } from 'hardhat';
import path from 'path';

// Types
interface PendingState {
  root: string;
  epoch: bigint | number;
  ts?: bigint | number;
}

interface MerkleData {
  root: string;
  leaves?: any[];
}

interface DeploymentArtifact {
  address: string;
  contractName: string;
  network: string;
}

/**
 * Defensive function to read pending fields from dispatcher
 * Handles multiple ABI layouts for compatibility
 * @param dispatcherAddr - Address of the dispatcher contract
 * @returns Pending state object with root, epoch, and timestamp
 */
async function readPendingFields(
  dispatcherAddr: string
): Promise<PendingState> {
  const art = await artifacts.readArtifact('ManifestDispatcher');
  const disp = new ethers.Contract(
    dispatcherAddr,
    art.abi,
    (await ethers.getSigners())[0]
  );

  // Sanity check: ensure we're at a contract
  await validateContractAddress(dispatcherAddr);

  // Strategy 1: Try newer layout with individual getters
  const individualGettersResult = await tryIndividualGetters(disp);
  if (individualGettersResult) {
    console.log('   Using individual getter layout');
    return individualGettersResult;
  }

  // Strategy 2: Try struct layout
  const structResult = await tryStructGetter(disp);
  if (structResult) {
    console.log('   Using struct getter layout');
    return structResult;
  }

  throw new Error('Dispatcher ABI mismatch: cannot read pending fields');
}

/**
 * Validates that a contract exists at the given address
 */
async function validateContractAddress(address: string): Promise<void> {
  const code = await ethers.provider.getCode(address);
  if (code === '0x') {
    throw new Error(`No code at dispatcher address ${address}`);
  }
  console.log('   Dispatcher code size:', code.length, 'bytes');
}

/**
 * Attempts to read pending state using individual getter methods
 */
async function tryIndividualGetters(
  disp: Contract
): Promise<PendingState | null> {
  try {
    const [root, epoch, ts] = await Promise.all([
      disp.pendingRoot?.().catch(() => null),
      disp.pendingEpoch?.().catch(() => null),
      disp.earliestActivation?.().catch(() => null),
    ]);

    if (root !== null) {
      return { root, epoch, ts };
    }
  } catch (error) {
    console.warn('   Individual getters failed:', error);
  }
  return null;
}

/**
 * Attempts to read pending state using struct getter method
 */
async function tryStructGetter(disp: Contract): Promise<PendingState | null> {
  if (typeof disp.pending === 'function') {
    try {
      const p = await disp.pending();
      // Support both named and indexed tuple returns
      const root = p.root ?? p[0];
      const epoch = p.epoch ?? p[1];
      const ts = p.earliestActivation ?? p[2];
      return { root, epoch, ts };
    } catch (error) {
      console.warn('   Struct getter failed:', error);
    }
  }
  return null;
}

/**
 * Reads the current active root from the dispatcher
 * @param dispatcherAddr - Address of the dispatcher contract
 * @returns Current active root hash
 */
async function readCurrentRoot(dispatcherAddr: string): Promise<string> {
  const art = await artifacts.readArtifact('ManifestDispatcher');
  const disp = new ethers.Contract(
    dispatcherAddr,
    art.abi,
    (await ethers.getSigners())[0]
  );

  try {
    return await disp.activeRoot();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('   [WARN] Could not read active root:', errorMessage);
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }
}

/**
 * Loads merkle data from the manifest file
 * @returns Parsed merkle data object
 */
function loadMerkleData(): MerkleData {
  const merklePath = path.join(__dirname, '../manifests/current.merkle.json');

  if (!fs.existsSync(merklePath)) {
    throw new Error('No merkle data found - cannot commit root');
  }

  const merkleData = JSON.parse(fs.readFileSync(merklePath, 'utf8'));
  console.log('[INFO] Merkle root:', merkleData.root);
  return merkleData;
}

/**
 * Finds the dispatcher address from deployment artifacts
 * @returns Dispatcher contract address
 */
async function findDispatcherAddress(): Promise<string> {
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();

  // Try network-specific deployment first
  const networkPaths = [
    `../deployments/localhost/dispatcher.json`,
    `../deployments/${chainId}/dispatcher.json`,
    `../deployments/hardhat/dispatcher.json`,
  ];

  for (const relativePath of networkPaths) {
    const fullPath = path.join(__dirname, relativePath);
    if (fs.existsSync(fullPath)) {
      const dispatcherData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      console.log(`[INFO] Found dispatcher deployment: ${relativePath}`);
      return dispatcherData.address;
    }
  }

  throw new Error('Dispatcher address not found in deployment artifacts');
}

/**
 * Main function to commit manifest root to dispatcher
 */
async function main(): Promise<void> {
  console.log('[INFO] Committing manifest root to dispatcher...');

  try {
    // Load merkle data
    const merkleData = loadMerkleData();

    // Find dispatcher address
    const dispatcherAddress = await findDispatcherAddress();
    console.log('[INFO] Using dispatcher at:', dispatcherAddress);

    // Connect to the dispatcher
    const dispatcher = await ethers.getContractAt(
      'ManifestDispatcher',
      dispatcherAddress
    );

    // Check current state
    console.log('\n[INFO] Checking dispatcher state...');
    await checkDispatcherState(dispatcherAddress);

    // Commit the merkle root
    console.log('\n[INFO] Committing merkle root...');
    await commitMerkleRoot(dispatcher, merkleData);

    // Verify the commitment
    await verifyCommitment(dispatcherAddress);

    console.log('\n[OK] Root commitment successful!');
    console.log('[INFO] Next step: Apply individual routes with merkle proofs');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ERROR] Error committing root:', errorMessage);
    throw error;
  }
}

/**
 * Checks the current state of the dispatcher
 */
async function checkDispatcherState(dispatcherAddress: string): Promise<void> {
  // Use defensive reading for current root
  const currentRoot = await readCurrentRoot(dispatcherAddress);
  console.log('[INFO] Current root:', currentRoot);

  // Use defensive reading for pending state
  try {
    const pendingState = await readPendingFields(dispatcherAddress);
    console.log('[INFO] Pending root:', pendingState.root);
    console.log(
      '[INFO] Pending epoch:',
      pendingState.epoch?.toString() || 'N/A'
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('[WARN] Could not read pending state:', errorMessage);
  }
}

/**
 * Commits the merkle root to the dispatcher
 */
async function commitMerkleRoot(
  dispatcher: Contract,
  merkleData: MerkleData
): Promise<void> {
  // Calculate correct epoch (activeEpoch + 1)
  const currentActiveEpoch = await dispatcher.activeEpoch();
  const nextEpoch = Number(currentActiveEpoch) + 1;
  console.log(
    `[INFO] Current active epoch: ${currentActiveEpoch}, committing epoch: ${nextEpoch}`
  );

  const commitTx = await dispatcher.commitRoot(merkleData.root, nextEpoch);
  console.log('[INFO] Transaction submitted:', commitTx.hash);

  const commitReceipt = await commitTx.wait();
  console.log(
    '[OK] Merkle root committed. Gas used:',
    commitReceipt?.gasUsed.toString()
  );
}

/**
 * Verifies the commitment was successful
 */
async function verifyCommitment(dispatcherAddress: string): Promise<void> {
  try {
    const updatedState = await readPendingFields(dispatcherAddress);
    console.log('[INFO] Updated state:');
    console.log('   Pending root:', updatedState.root);
    console.log('   Pending epoch:', updatedState.epoch?.toString() || 'N/A');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log('[WARN] Could not read updated state:', errorMessage);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ERROR] Fatal error:', errorMessage);
    process.exit(1);
  });

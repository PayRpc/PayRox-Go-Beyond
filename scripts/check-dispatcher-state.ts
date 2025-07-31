import { ethers } from 'hardhat';

async function main() {
  const dispatcherAddress = process.env.DISPATCHER;
  if (!dispatcherAddress) {
    throw new Error('DISPATCHER environment variable is required');
  }

  console.log(`[INFO] Reading dispatcher state from ${dispatcherAddress}`);

  const dispatcher = await ethers.getContractAt(
    'ManifestDispatcher',
    dispatcherAddress
  );

  try {
    const activeEpoch = await dispatcher.activeEpoch();
    console.log('activeEpoch:', activeEpoch.toString());
  } catch (error) {
    console.log('activeEpoch: failed to read');
  }

  try {
    const pendingEpoch = await dispatcher.pendingEpoch();
    console.log('pendingEpoch:', pendingEpoch.toString());
  } catch (error) {
    console.log('pendingEpoch: failed to read');
  }

  try {
    const activeRoot = await dispatcher.activeRoot();
    console.log('activeRoot:', activeRoot);
  } catch (error) {
    console.log('activeRoot: failed to read');
  }

  try {
    const pendingRoot = await dispatcher.pendingRoot();
    console.log('pendingRoot:', pendingRoot);
  } catch (error) {
    console.log('pendingRoot: failed to read');
  }
}

main().catch(e => {
  console.error('[ERROR] State check failed:', e);
  process.exit(1);
});

import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

/**
 * Calculate the isRight array for a merkle proof based on leaf index
 */
function calculateIsRight(leafIndex: number, totalLeaves: number): boolean[] {
  const isRight: boolean[] = [];
  let idx = leafIndex;
  let currentLevelSize = totalLeaves;

  while (currentLevelSize > 1) {
    const isLastOdd =
      currentLevelSize % 2 === 1 && idx === currentLevelSize - 1;

    if (isLastOdd) {
      // For odd last element that gets duplicated, it's not right
      isRight.push(false);
    } else {
      // Normal case: if index is even, sibling is on right; if odd, sibling is on left
      isRight.push(idx % 2 === 0);
    }

    idx = Math.floor(idx / 2);
    currentLevelSize = Math.ceil(currentLevelSize / 2);
  }

  return isRight;
}

async function main() {
  console.log('🔗 Applying manifest routes to dispatcher...');

  // Load the current manifest and merkle data
  const manifestPath = path.join(
    __dirname,
    '../manifests/current.manifest.json'
  );
  const merklePath = path.join(__dirname, '../manifests/current.merkle.json');

  if (!fs.existsSync(manifestPath) || !fs.existsSync(merklePath)) {
    throw new Error(
      'Manifest or merkle files not found. Run build-manifest.ts first.'
    );
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const merkleData = JSON.parse(fs.readFileSync(merklePath, 'utf8'));

  console.log('📋 Loaded manifest with', manifest.facets.length, 'facets');
  console.log('🌳 Merkle root:', merkleData.root);

  // Connect to the dispatcher
  const dispatcherAddress = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
  const dispatcher = await ethers.getContractAt(
    'ManifestDispatcher',
    dispatcherAddress
  );

  console.log('📡 Connected to dispatcher at:', dispatcherAddress);

  // Step 1: Commit the merkle root (epoch 1 = activeEpoch + 1)
  console.log('\n1️⃣ Committing merkle root...');
  const commitTx = await dispatcher.commitRoot(merkleData.root, 1);
  const commitReceipt = await commitTx.wait();
  console.log(
    '✅ Merkle root committed. Gas used:',
    commitReceipt?.gasUsed.toString()
  );

  // Step 2: Create route mapping and apply routes with merkle proofs
  console.log('\n2️⃣ Collecting all routes...');

  interface RouteInfo {
    selector: string;
    facet: string;
    codehash: string;
    leafIndex: number;
  }

  const allRoutes: RouteInfo[] = [];

  // Build route mapping with leaf indices
  let leafIndex = 0;
  for (const facet of manifest.facets) {
    // Get codehash for this facet
    const code = await ethers.provider.getCode(facet.address);
    const codehash = ethers.keccak256(code);

    for (const selector of facet.selectors) {
      allRoutes.push({
        selector,
        facet: facet.address,
        codehash,
        leafIndex,
      });
      leafIndex++;
    }
  }

  console.log(`📦 Found ${allRoutes.length} routes to apply`);

  // Step 3: Apply routes in batches (to avoid gas limits)
  console.log('\n3️⃣ Applying routes with merkle proofs...');

  const batchSize = 5; // Process in smaller batches
  for (let i = 0; i < allRoutes.length; i += batchSize) {
    const batch = allRoutes.slice(i, i + batchSize);
    console.log(
      `\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
        allRoutes.length / batchSize
      )}`
    );

    const selectors = batch.map(r => r.selector);
    const facets = batch.map(r => r.facet);
    const codehashes = batch.map(r => r.codehash);
    const proofs = batch.map(r => merkleData.proofs[r.leafIndex]);
    const isRightArrays = batch.map(r =>
      calculateIsRight(r.leafIndex, allRoutes.length)
    );

    console.log('  Selectors:', selectors);
    console.log('  Facets:', facets);

    try {
      const applyTx = await dispatcher.applyRoutes(
        selectors,
        facets,
        codehashes,
        proofs,
        isRightArrays
      );
      const applyReceipt = await applyTx.wait();
      console.log(
        `  ✅ Applied batch. Gas used: ${applyReceipt?.gasUsed.toString()}`
      );
    } catch (error) {
      console.error(
        `  ❌ Error applying batch:`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  // Step 4: Activate the committed root
  console.log('\n4️⃣ Activating committed root...');
  const activateTx = await dispatcher.activateCommittedRoot();
  const activateReceipt = await activateTx.wait();
  console.log(
    '✅ Root activated. Gas used:',
    activateReceipt?.gasUsed.toString()
  );

  console.log('\n🎉 Manifest routes successfully applied to dispatcher!');
  console.log('💎 Diamond pattern routing is now active');

  // Verify routing is working
  console.log('\n🔍 Verifying routing...');

  // Test a few function selectors
  const testSelectors = [
    '0x7ab7b94b', // getFacetInfoB from ExampleFacetB (renamed)
    '0x31cd4199', // getFacetInfo from ExampleFacetA
    '0x5aa723df', // another function
  ];

  for (const selector of testSelectors) {
    try {
      const route = await dispatcher.routes(selector);
      console.log(
        `✅ Selector ${selector} routes to: ${
          route.facet
        } (codehash: ${route.codehash.slice(0, 10)}...)`
      );
    } catch (error) {
      console.log(
        `❌ Selector ${selector} not routed:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  console.log('\n🚀 Diamond pattern communication chain is complete!');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error applying manifest routes:', error);
    process.exit(1);
  });

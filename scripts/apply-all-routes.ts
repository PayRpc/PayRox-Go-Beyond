import * as fs from 'fs';
import { ethers } from 'hardhat';
import * as path from 'path';

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
  console.log('🔗 Applying all manifest routes to dispatcher...');

  // Load the current manifest and merkle data
  const manifestPath = path.join(
    __dirname,
    '../manifests/current.manifest.json'
  );
  const merklePath = path.join(__dirname, '../manifests/current.merkle.json');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const merkleData = JSON.parse(fs.readFileSync(merklePath, 'utf8'));

  console.log('📋 Loaded manifest with', manifest.routes.length, 'routes');
  console.log('🌳 Merkle root:', merkleData.root);

  // Connect to the dispatcher - read from deployment artifacts
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

  const dispatcher = await ethers.getContractAt(
    'ManifestDispatcher',
    dispatcherAddress
  );

  console.log('📡 Connected to dispatcher at:', dispatcherAddress);

  // Calculate leaf indices for all routes
  console.log('\n📝 Building route mapping...');
  const coder = ethers.AbiCoder.defaultAbiCoder();
  const routeMappings: Array<{
    route: any;
    leafIndex: number;
    proof: string[];
    isRight: boolean[];
  }> = [];

  for (const route of manifest.routes) {
    const expectedLeaf = ethers.keccak256(
      coder.encode(
        ['bytes4', 'address', 'bytes32'],
        [route.selector, route.facet, route.codehash]
      )
    );
    const leafIndex = merkleData.leaves.indexOf(expectedLeaf);

    if (leafIndex === -1) {
      throw new Error(`Route leaf not found for selector ${route.selector}`);
    }

    const proof = merkleData.proofs[leafIndex];
    const isRight = calculateIsRight(leafIndex, merkleData.leaves.length);

    routeMappings.push({
      route,
      leafIndex,
      proof,
      isRight,
    });
  }

  console.log(`✅ Mapped ${routeMappings.length} routes to leaf indices`);

  // Apply routes in batches
  console.log('\n⚡ Applying routes in batches...');
  const batchSize = 3; // Small batches to avoid gas limits
  let totalGasUsed = 0;

  for (let i = 0; i < routeMappings.length; i += batchSize) {
    const batch = routeMappings.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(routeMappings.length / batchSize);

    console.log(
      `\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} routes):`
    );

    const selectors = batch.map(m => m.route.selector);
    const facets = batch.map(m => m.route.facet);
    const codehashes = batch.map(m => m.route.codehash);
    const proofs = batch.map(m => m.proof);
    const isRightArrays = batch.map(m => m.isRight);

    console.log('  Selectors:', selectors.join(', '));

    try {
      const applyTx = await dispatcher.applyRoutes(
        selectors,
        facets,
        codehashes,
        proofs,
        isRightArrays
      );

      console.log('  ⏳ Transaction submitted:', applyTx.hash);
      const applyReceipt = await applyTx.wait();
      const gasUsed = Number(applyReceipt?.gasUsed || 0);
      totalGasUsed += gasUsed;

      console.log(`  ✅ Batch applied! Gas used: ${gasUsed.toLocaleString()}`);
    } catch (error) {
      console.error(
        `  ❌ Error applying batch ${batchNum}:`,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  // Activate the committed root
  console.log('\n🚀 Activating committed root...');
  const activateTx = await dispatcher.activateCommittedRoot();
  const activateReceipt = await activateTx.wait();
  const activateGas = Number(activateReceipt?.gasUsed || 0);
  totalGasUsed += activateGas;

  console.log('✅ Root activated! Gas used:', activateGas.toLocaleString());

  // Verify some routes
  console.log('\n🔍 Verifying routes...');
  const testSelectors = [
    manifest.routes[0].selector, // First route
    manifest.routes[10].selector, // Middle route
    manifest.routes[18].selector, // Last route
  ];

  for (const selector of testSelectors) {
    try {
      const route = await dispatcher.routes(selector);
      console.log(
        `✅ ${selector} → ${route.facet} (${route.codehash.slice(0, 10)}...)`
      );
    } catch (error) {
      console.log(
        `❌ ${selector}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  console.log('\n🎉 All manifest routes successfully applied!');
  console.log('💎 Diamond pattern routing is now fully active!');
  console.log(`⛽ Total gas used: ${totalGasUsed.toLocaleString()}`);
  console.log(`📊 Routes configured: ${manifest.routes.length}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error applying manifest routes:', error);
    process.exit(1);
  });

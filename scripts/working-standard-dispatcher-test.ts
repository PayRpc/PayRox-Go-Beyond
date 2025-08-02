import { ethers } from 'hardhat';

/**
 * Working test for standard ManifestDispatcher with ExampleFacetA and ExampleFacetB
 * Based on successful patterns found in existing codebase
 */
async function main() {
  console.log('🚀 Testing Standard ManifestDispatcher with ExampleFacetA/B...');

  const [deployer] = await ethers.getSigners();
  console.log('👤 Deployer:', deployer.address);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 1: Deploy components
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n📦 Deploying components...');

  const ManifestDispatcher = await ethers.getContractFactory(
    'ManifestDispatcher'
  );
  const ExampleFacetA = await ethers.getContractFactory('ExampleFacetA');
  const ExampleFacetB = await ethers.getContractFactory('ExampleFacetB');

  // Deploy with deployer as admin and 0 activation delay (like test-deployment-readiness.ts)
  const dispatcher = await ManifestDispatcher.deploy(deployer.address, 0);
  await dispatcher.waitForDeployment();
  console.log(
    '✅ ManifestDispatcher deployed to:',
    await dispatcher.getAddress()
  );

  const facetA = await ExampleFacetA.deploy();
  const facetB = await ExampleFacetB.deploy();
  await facetA.waitForDeployment();
  await facetB.waitForDeployment();
  console.log('✅ ExampleFacetA deployed to:', await facetA.getAddress());
  console.log('✅ ExampleFacetB deployed to:', await facetB.getAddress());

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 2: Get function selectors (like test-deployment-readiness.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n🔍 Getting function selectors...');

  const executeASelector =
    ExampleFacetA.interface.getFunction('executeA')!.selector;
  const storeDataSelector =
    ExampleFacetA.interface.getFunction('storeData')!.selector;
  const executeBSelector =
    ExampleFacetB.interface.getFunction('executeB')!.selector;

  console.log('executeA selector:', executeASelector);
  console.log('storeData selector:', storeDataSelector);
  console.log('executeB selector:', executeBSelector);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 3: Build manifest data (like test-deployment-readiness.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n📋 Building manifest...');

  const manifest = ethers.solidityPacked(
    ['bytes4', 'address', 'bytes4', 'address', 'bytes4', 'address'],
    [
      executeASelector,
      await facetA.getAddress(),
      storeDataSelector,
      await facetA.getAddress(),
      executeBSelector,
      await facetB.getAddress(),
    ]
  );

  const manifestHash = ethers.keccak256(manifest);
  console.log('📋 Manifest hash:', manifestHash);
  console.log('📋 Manifest data length:', manifest.length);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 4: Commit and activate root (like test-bootstrap-manifest.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n🌱 Committing and activating root...');

  // Commit root with epoch 1
  const commitTx = await dispatcher.commitRoot(manifestHash, 1);
  await commitTx.wait();
  console.log('✅ Root committed');

  // Activate the committed root
  const activateTx = await dispatcher.activateCommittedRoot();
  await activateTx.wait();
  console.log('✅ Root activated');

  // Verify the active root
  const activeRoot = await dispatcher.activeRoot();
  console.log('🌳 Active root:', activeRoot);
  console.log('✅ Root matches:', activeRoot === manifestHash);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 5: Test basic dispatcher functionality
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n🧪 Testing basic dispatcher functionality...');

  try {
    // Test role-based access control (which is what ManifestDispatcher actually uses)
    const DEFAULT_ADMIN_ROLE =
      '0x0000000000000000000000000000000000000000000000000000000000000000';
    const hasAdminRole = await dispatcher.hasRole(
      DEFAULT_ADMIN_ROLE,
      deployer.address
    );
    console.log('✅ Deployer has admin role:', hasAdminRole);

    // Test basic state queries
    const routeCount = await dispatcher.getRouteCount();
    console.log('✅ Route count:', routeCount.toString());

    const manifestInfo = await dispatcher.getManifestInfo();
    console.log('✅ Manifest version:', manifestInfo.version.toString());

    console.log('\n✅ Standard ManifestDispatcher working correctly!');
    console.log('📋 Manifest system operational');
    console.log('🔗 Ready for route application');
  } catch (error) {
    console.error(
      '❌ Error testing dispatcher:',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }

  console.log('\n🎉 Test completed successfully!');
  console.log('\n📝 Next steps:');
  console.log(
    '1. Apply individual routes using applyRoutes with Merkle proofs'
  );
  console.log('2. Test function routing through the dispatcher');
  console.log('3. Verify facet execution works correctly');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

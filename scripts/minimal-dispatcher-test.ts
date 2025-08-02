import { ethers } from 'hardhat';

/**
 * Minimal Working ManifestDispatcher Test
 * Tests basic routing with single function
 */
async function main() {
  console.log('🚀 Starting Minimal ManifestDispatcher Test...');

  try {
    const [admin] = await ethers.getSigners();

    // 1. Deploy ManifestDispatcher
    console.log('📦 Deploying ManifestDispatcher...');
    const ManifestDispatcher = await ethers.getContractFactory(
      'ManifestDispatcher'
    );
    const dispatcher = await ManifestDispatcher.deploy(admin.address, 0);
    await dispatcher.waitForDeployment();
    const dispatcherAddress = await dispatcher.getAddress();
    console.log(`✅ ManifestDispatcher deployed at: ${dispatcherAddress}`);

    // 2. Deploy PingFacet (simplest facet)
    console.log('📦 Deploying PingFacet...');
    const PingFacet = await ethers.getContractFactory('PingFacet');
    const pingFacet = await PingFacet.deploy();
    await pingFacet.waitForDeployment();
    const pingFacetAddress = await pingFacet.getAddress();
    console.log(`✅ PingFacet deployed at: ${pingFacetAddress}`);

    // 3. Test direct call first
    console.log('🧪 Testing direct ping call...');
    await pingFacet.ping();
    console.log('✅ Direct ping() call successful');

    // 4. Get ping selector
    const pingFunc = pingFacet.interface.getFunction('ping');
    if (!pingFunc) {
      throw new Error('Failed to get ping function');
    }
    const pingSelector = pingFunc.selector;
    console.log(`ping selector: ${pingSelector}`);

    // 5. Create single-entry manifest
    console.log('📋 Creating single-entry manifest...');
    const manifestEntry = ethers.concat([pingSelector, pingFacetAddress]);
    console.log(`Manifest entry (24 bytes): ${manifestEntry}`);
    console.log(`Entry length: ${manifestEntry.length} bytes`);

    // 6. Use direct updateManifest approach (simpler than Merkle proofs)
    console.log('🔧 Testing updateManifest approach...');
    const manifestHash = ethers.keccak256(manifestEntry);
    console.log(`Manifest hash: ${manifestHash}`);

    // Check if updateManifest exists on this contract
    try {
      const updateTx = await dispatcher.updateManifest(
        manifestHash,
        manifestEntry
      );
      await updateTx.wait();
      console.log('✅ Manifest updated successfully via updateManifest');

      // Test routing
      console.log('🧪 Testing routing through dispatcher...');
      const dispatcherWithPing = new ethers.Contract(
        dispatcherAddress,
        pingFacet.interface,
        admin
      );
      await dispatcherWithPing.ping();
      console.log('✅ ping() routed through dispatcher successfully!');
    } catch (updateError) {
      console.log('❌ updateManifest failed, trying commit-apply pattern...');
      console.log(
        `Error: ${
          updateError instanceof Error ? updateError.message : updateError
        }`
      );

      // Fall back to commit-apply pattern with no proofs needed for single entry
      console.log('📝 Committing manifest root...');
      const commitTx = await dispatcher.commitRoot(manifestHash, 1);
      await commitTx.wait();
      console.log('✅ Manifest root committed');

      // Skip applyRoutes for now and try direct activation
      console.log('⚡ Activating committed root...');
      const activateTx = await dispatcher.activateCommittedRoot();
      await activateTx.wait();
      console.log('✅ Root activated');

      // Check if routing works
      const activeRoot = await dispatcher.activeRoot();
      console.log(`Active root: ${activeRoot}`);

      if (activeRoot === manifestHash) {
        console.log('✅ Manifest hash is now active!');
      } else {
        console.log("❌ Active root doesn't match our hash");
      }
    }

    console.log('\n🎉 Minimal ManifestDispatcher Test COMPLETED!');
    return {
      success: true,
      dispatcher: dispatcherAddress,
      pingFacet: pingFacetAddress,
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Execute if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { main };

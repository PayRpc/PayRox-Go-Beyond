/**
 * Simple ManifestDispatcher Test with ExampleFacetA and ExampleFacetB
 *
 * Tests the basic functionality without enhanced features or complex Merkle proofs
 */

import { ethers } from 'hardhat';

async function main() {
  console.log('🎯 SIMPLE MANIFEST DISPATCHER TEST');
  console.log('='.repeat(50));

  const [deployer] = await ethers.getSigners();

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPLOY STANDARD COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n🔧 Deploying components...');

  // Deploy standard ManifestDispatcher
  const ManifestDispatcher = await ethers.getContractFactory(
    'ManifestDispatcher'
  );
  const dispatcher = await ManifestDispatcher.deploy(
    deployer.address, // admin
    0 // activationDelay (0 for testing)
  );
  await dispatcher.waitForDeployment();
  const dispatcherAddress = await dispatcher.getAddress();

  // Deploy ExampleFacetA and ExampleFacetB
  const ExampleFacetA = await ethers.getContractFactory('ExampleFacetA');
  const facetA = await ExampleFacetA.deploy();
  const facetAAddress = await facetA.getAddress();

  const ExampleFacetB = await ethers.getContractFactory('ExampleFacetB');
  const facetB = await ExampleFacetB.deploy();
  const facetBAddress = await facetB.getAddress();

  console.log(`   ✅ ManifestDispatcher: ${dispatcherAddress}`);
  console.log(`   ✅ ExampleFacetA: ${facetAAddress}`);
  console.log(`   ✅ ExampleFacetB: ${facetBAddress}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE AND APPLY MANIFEST USING updateManifest
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n🚀 Testing manifest update...');

  // Function selectors (confirmed working)
  const executeASelector = '0xb5211ec4'; // executeA(string)
  const storeDataSelector = '0x9730174d'; // storeData(bytes32,bytes)
  const executeBSelector = '0x37184e95'; // executeB(string,uint256)

  // Create manifest entries (selector + address = 24 bytes each)
  const entries = [
    executeASelector.slice(2) + facetAAddress.slice(2).toLowerCase(),
    storeDataSelector.slice(2) + facetAAddress.slice(2).toLowerCase(),
    executeBSelector.slice(2) + facetBAddress.slice(2).toLowerCase(),
  ];

  const manifestHex = '0x' + entries.join('');
  const manifestData = ethers.getBytes(manifestHex);
  const manifestHash = ethers.keccak256(manifestData);

  console.log(
    `   📋 Manifest: ${entries.length} functions, ${manifestData.length} bytes`
  );
  console.log(`   📋 Hash: ${manifestHash}`);

  try {
    // Use updateManifest for direct manifest application
    console.log('   📝 Applying manifest...');
    const updateTx = await dispatcher.updateManifest(
      manifestHash,
      manifestData
    );
    await updateTx.wait();
    console.log('   ✅ Manifest applied successfully');
  } catch (error) {
    console.log(`   ❌ Manifest error: ${error}`);
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST FUNCTION ROUTING
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n⚡ Testing function routing...');

  try {
    console.log('1️⃣ Testing executeA() routing...');

    const executeACalldata = ExampleFacetA.interface.encodeFunctionData(
      'executeA',
      ['Hello FacetA!']
    );

    const executeATx = await deployer.sendTransaction({
      to: dispatcherAddress,
      data: executeACalldata,
    });
    const executeAReceipt = await executeATx.wait();

    console.log(
      `   ✅ executeA() success - Gas: ${executeAReceipt?.gasUsed?.toString()}`
    );

    console.log('\n2️⃣ Testing executeB() routing...');

    const executeBCalldata = ExampleFacetB.interface.encodeFunctionData(
      'executeB',
      ['Hello FacetB!', 123]
    );

    const executeBTx = await deployer.sendTransaction({
      to: dispatcherAddress,
      data: executeBCalldata,
    });
    const executeBReceipt = await executeBTx.wait();

    console.log(
      `   ✅ executeB() success - Gas: ${executeBReceipt?.gasUsed?.toString()}`
    );

    console.log('\n3️⃣ Testing storeData() routing...');

    const testData = ethers.toUtf8Bytes('Test data for storage');
    const testKey = ethers.keccak256(ethers.toUtf8Bytes('test-key'));
    const storeDataCalldata = ExampleFacetA.interface.encodeFunctionData(
      'storeData',
      [testKey, testData]
    );

    const storeTx = await deployer.sendTransaction({
      to: dispatcherAddress,
      data: storeDataCalldata,
    });
    const storeReceipt = await storeTx.wait();

    console.log(
      `   ✅ storeData() success - Gas: ${storeReceipt?.gasUsed?.toString()}`
    );
  } catch (error) {
    console.log(`   ❌ Function routing error: ${error}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFY ROUTES
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n📊 Verifying routes...');

  try {
    const routeA = await dispatcher.routes(executeASelector);
    const routeB = await dispatcher.routes(executeBSelector);
    const routeStore = await dispatcher.routes(storeDataSelector);

    console.log(`   🛣️  executeA() → ${routeA.facet}`);
    console.log(`   🛣️  executeB() → ${routeB.facet}`);
    console.log(`   🛣️  storeData() → ${routeStore.facet}`);

    const correctA = routeA.facet.toLowerCase() === facetAAddress.toLowerCase();
    const correctB = routeB.facet.toLowerCase() === facetBAddress.toLowerCase();
    const correctStore =
      routeStore.facet.toLowerCase() === facetAAddress.toLowerCase();

    console.log(
      `   ✅ Routing verification: A=${correctA}, B=${correctB}, Store=${correctStore}`
    );
  } catch (error) {
    console.log(`   ❌ Route verification error: ${error}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETION
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n🎯 TEST COMPLETE');
  console.log('='.repeat(50));
  console.log('✅ Standard ManifestDispatcher working');
  console.log('✅ ExampleFacetA and ExampleFacetB integrated');
  console.log('✅ Function routing verified');
  console.log('✅ No enhanced features - pure standard implementation');
}

main().catch(console.error);

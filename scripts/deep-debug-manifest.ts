import { ethers } from 'hardhat';

async function main() {
  console.log('🔍 DEEP MANIFEST DEBUG: Contract-level validation');
  console.log('='.repeat(60));

  const [, governance, guardian] = await ethers.getSigners();

  // Deploy Enhanced Dispatcher
  const EnhancedDispatcher = await ethers.getContractFactory(
    'EnhancedManifestDispatcher'
  );
  const dispatcher = await EnhancedDispatcher.deploy(
    governance.address,
    guardian.address,
    0
  );

  // Deploy facets
  const PingFacet = await ethers.getContractFactory('PingFacet');
  const pingFacet = await PingFacet.deploy();

  const ExampleFacetA = await ethers.getContractFactory('ExampleFacetA');
  const exampleFacetA = await ExampleFacetA.deploy();

  const pingFacetAddress = await pingFacet.getAddress();
  const exampleFacetAAddress = await exampleFacetA.getAddress();

  console.log(`PingFacet: ${pingFacetAddress}`);
  console.log(`ExampleFacetA: ${exampleFacetAAddress}`);

  // Test the functions exist and work
  console.log('\n🔧 Testing facet functions...');
  try {
    const pingResult = await pingFacet.ping();
    console.log(`ping() returns: ${pingResult}`);

    const echoResult = await pingFacet.echo(
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    );
    console.log(`echo() returns: ${echoResult}`);
  } catch (error) {
    console.log(`❌ Facet function error: ${error}`);
  }

  // Build and test a minimal manifest with just ping()
  console.log('\n📋 Testing minimal manifest (ping only)...');

  const pingSelector = '0x5c36b186';
  const pingAddr = pingFacetAddress.slice(2).toLowerCase();

  const minimalEntry = pingSelector.slice(2) + pingAddr;
  const minimalManifestHex = '0x' + minimalEntry;
  const minimalManifestData = ethers.getBytes(minimalManifestHex);
  const minimalManifestHash = ethers.keccak256(minimalManifestData);

  console.log(`Minimal manifest: ${minimalManifestHex}`);
  console.log(`Length: ${minimalManifestData.length} bytes`);

  try {
    const [minimalValid, minimalCount] = await dispatcher.preflightManifest(
      minimalManifestHash,
      minimalManifestData
    );
    console.log(`✅ Minimal Valid: ${minimalValid}`);
    console.log(`📊 Minimal Count: ${minimalCount}`);
  } catch (error) {
    console.log(`❌ Minimal preflight error: ${error}`);
  }

  // If minimal works, try progressive expansion
  if (true) {
    // Always try the full test
    console.log('\n📋 Testing full manifest (3 functions)...');

    const echoSelector = '0xb5531d21';
    const storeDataSelector = '0x9730174d';
    const exampleAddr = exampleFacetAAddress.slice(2).toLowerCase();

    const entry1 = pingSelector.slice(2) + pingAddr;
    const entry2 = echoSelector.slice(2) + pingAddr;
    const entry3 = storeDataSelector.slice(2) + exampleAddr;

    const fullManifestHex = '0x' + entry1 + entry2 + entry3;
    const fullManifestData = ethers.getBytes(fullManifestHex);
    const fullManifestHash = ethers.keccak256(fullManifestData);

    console.log(`Full manifest: ${fullManifestHex}`);
    console.log(`Length: ${fullManifestData.length} bytes`);

    // Validate each step the contract would do
    console.log('\n🔍 Manual contract validation...');

    // Check 1: Hash
    const contractComputedHash = ethers.keccak256(fullManifestData);
    console.log(`1. Hash match: ${contractComputedHash === fullManifestHash}`);

    // Check 2: Length divisible by 24
    console.log(`2. Length % 24 == 0: ${fullManifestData.length % 24 === 0}`);

    // Check 3: Under max size
    console.log(`3. Under max size: ${fullManifestData.length <= 24000}`);

    // Check 4: Entry validation (simulate what contract does)
    console.log('4. Entry-by-entry validation:');
    let simulatedValidRoutes = 0;

    for (let i = 0; i < 3; i++) {
      console.log(`   Entry ${i}:`);

      const offset = i * 24;

      // Extract selector (first 4 bytes)
      const selectorBytes = fullManifestData.slice(offset, offset + 4);
      const selector = ethers.hexlify(selectorBytes);

      // Extract address (next 20 bytes)
      const addressBytes = fullManifestData.slice(offset + 4, offset + 24);
      const facetAddress = ethers.getAddress(
        '0x' +
          Array.from(addressBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
      );

      console.log(`     Selector: ${selector}`);
      console.log(`     Facet: ${facetAddress}`);

      // Check conditions
      const selectorNotZero = selector !== '0x00000000';
      const addressNotZero = facetAddress !== ethers.ZeroAddress;
      const addressNotSelf = facetAddress !== (await dispatcher.getAddress());

      const code = await ethers.provider.getCode(facetAddress);
      const hasCode = code.length > 2;

      console.log(`     ✓ Selector != 0: ${selectorNotZero}`);
      console.log(`     ✓ Address != 0: ${addressNotZero}`);
      console.log(`     ✓ Address != self: ${addressNotSelf}`);
      console.log(
        `     ✓ Has code: ${hasCode} (${(code.length - 2) / 2} bytes)`
      );

      if (selectorNotZero && addressNotZero && addressNotSelf && hasCode) {
        simulatedValidRoutes++;
        console.log(`     ✅ Entry ${i} valid`);
      } else {
        console.log(`     ❌ Entry ${i} invalid`);
        break;
      }
    }

    console.log(`Simulated valid routes: ${simulatedValidRoutes}`);

    // Final test
    try {
      const [fullValid, fullCount] = await dispatcher.preflightManifest(
        fullManifestHash,
        fullManifestData
      );
      console.log(`✅ Full Valid: ${fullValid}`);
      console.log(`📊 Full Count: ${fullCount}`);
    } catch (error) {
      console.log(`❌ Full preflight error: ${error}`);
    }
  }
}

main().catch(console.error);

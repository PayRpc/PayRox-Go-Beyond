import { ethers } from 'hardhat';

async function main() {
  console.log('🔍 MANIFEST DEBUG: Checking Validation Logic');
  console.log('='.repeat(60));

  const [deployer, governance, guardian] = await ethers.getSigners();

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

  // Check facet code
  const pingCode = await ethers.provider.getCode(pingFacetAddress);
  const exampleCode = await ethers.provider.getCode(exampleFacetAAddress);
  console.log(`PingFacet code length: ${pingCode.length / 2 - 1} bytes`);
  console.log(`ExampleFacetA code length: ${exampleCode.length / 2 - 1} bytes`);

  // Correct selectors
  const pingSelector = '0x5c36b186'; // ping()
  const echoSelector = '0xb5531d21'; // echo(bytes32)
  const storeDataSelector = '0x9730174d'; // storeData(bytes32,bytes)

  console.log('\n📋 Building manifest...');

  // Ensure addresses are checksummed/lowercase consistently
  const pingAddr = pingFacetAddress.slice(2).toLowerCase();
  const exampleAddr = exampleFacetAAddress.slice(2).toLowerCase();

  console.log(`Ping address: ${pingAddr} (${pingAddr.length} chars)`);
  console.log(`Example address: ${exampleAddr} (${exampleAddr.length} chars)`);

  // Build manifest: selector(4) + address(20) = 24 bytes per entry
  const entry1 = pingSelector.slice(2) + pingAddr;
  const entry2 = echoSelector.slice(2) + pingAddr;
  const entry3 = storeDataSelector.slice(2) + exampleAddr;

  console.log(`Entry 1: ${entry1} (${entry1.length / 2} bytes)`);
  console.log(`Entry 2: ${entry2} (${entry2.length / 2} bytes)`);
  console.log(`Entry 3: ${entry3} (${entry3.length / 2} bytes)`);

  const manifestHex = '0x' + entry1 + entry2 + entry3;
  const manifestData = ethers.getBytes(manifestHex);
  const manifestHash = ethers.keccak256(manifestData);

  console.log(`Manifest hex: ${manifestHex}`);
  console.log(`Manifest length: ${manifestData.length} bytes`);
  console.log(`Manifest hash: ${manifestHash}`);

  // Test preflight validation step by step
  console.log('\n🔍 Step-by-step validation...');

  console.log('1. Hash check...');
  const computedHash = ethers.keccak256(manifestData);
  console.log(`   Computed: ${computedHash}`);
  console.log(`   Expected: ${manifestHash}`);
  console.log(`   Match: ${computedHash === manifestHash}`);

  console.log('2. Length check...');
  console.log(`   Length: ${manifestData.length}`);
  console.log(`   Divisible by 24: ${manifestData.length % 24 === 0}`);
  console.log(`   Entry count: ${manifestData.length / 24}`);

  console.log('3. Max size check...');
  const MAX_MANIFEST_SIZE = 2048; // Assumed from contract
  console.log(`   Length: ${manifestData.length}, Max: ${MAX_MANIFEST_SIZE}`);
  console.log(`   Under limit: ${manifestData.length <= MAX_MANIFEST_SIZE}`);

  console.log('4. Entry validation...');
  for (let i = 0; i < 3; i++) {
    const offset = i * 24;
    const selectorBytes = manifestData.slice(offset, offset + 4);
    const addressBytes = manifestData.slice(offset + 4, offset + 24);

    const selector =
      '0x' +
      Array.from(selectorBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    const address =
      '0x' +
      Array.from(addressBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    console.log(`   Entry ${i}:`);
    console.log(`     Selector: ${selector}`);
    console.log(`     Address: ${address}`);
    console.log(`     Selector != 0: ${selector !== '0x00000000'}`);
    console.log(`     Address != 0: ${address !== '0x' + '00'.repeat(20)}`);
    console.log(
      `     Address != dispatcher: ${
        address.toLowerCase() !== (await dispatcher.getAddress()).toLowerCase()
      }`
    );

    const codeAtAddress = await ethers.provider.getCode(address);
    console.log(
      `     Has code: ${codeAtAddress.length > 2} (${
        codeAtAddress.length / 2 - 1
      } bytes)`
    );
  }

  // Now test the actual preflight
  console.log('\n🎯 Actual preflight test...');
  try {
    const [valid, routeCount] = await dispatcher.preflightManifest(
      manifestHash,
      manifestData
    );
    console.log(`✅ Valid: ${valid}`);
    console.log(`📊 Route Count: ${routeCount}`);
  } catch (error) {
    console.log(`❌ Preflight error: ${error}`);
  }
}

main().catch(console.error);

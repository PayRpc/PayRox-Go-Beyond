import { ethers } from 'hardhat';

async function main() {
  console.log('🔍 DEBUG: Manifest Construction');
  console.log('='.repeat(40));

  const [deployer] = await ethers.getSigners();

  // Deploy facets to get real addresses
  const ExampleFacetA = await ethers.getContractFactory('ExampleFacetA');
  const facetA = await ExampleFacetA.deploy();
  const facetAAddress = await facetA.getAddress();

  const ExampleFacetB = await ethers.getContractFactory('ExampleFacetB');
  const facetB = await ExampleFacetB.deploy();
  const facetBAddress = await facetB.getAddress();

  console.log(`FacetA: ${facetAAddress}`);
  console.log(`FacetB: ${facetBAddress}`);

  // Function selectors
  const executeASelector = '0xb5211ec4';
  const storeDataSelector = '0x9730174d';
  const executeBSelector = '0x37184e95';

  console.log(`\nSelectors:`);
  console.log(`executeA: ${executeASelector}`);
  console.log(`storeData: ${storeDataSelector}`);
  console.log(`executeB: ${executeBSelector}`);

  // Build manifest step by step
  console.log(`\nBuilding manifest entries:`);

  const entry1 =
    executeASelector.slice(2) + facetAAddress.slice(2).toLowerCase();
  const entry2 =
    storeDataSelector.slice(2) + facetAAddress.slice(2).toLowerCase();
  const entry3 =
    executeBSelector.slice(2) + facetBAddress.slice(2).toLowerCase();

  console.log(`Entry 1: ${entry1} (${entry1.length / 2} bytes)`);
  console.log(`Entry 2: ${entry2} (${entry2.length / 2} bytes)`);
  console.log(`Entry 3: ${entry3} (${entry3.length / 2} bytes)`);

  const manifestHex = '0x' + entry1 + entry2 + entry3;
  const manifestData = ethers.getBytes(manifestHex);

  console.log(`\nManifest hex: ${manifestHex}`);
  console.log(`Manifest length: ${manifestData.length} bytes`);
  console.log(`Expected: ${3 * 24} bytes`);

  // Parse back to verify
  console.log(`\nParsing back:`);
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

    console.log(`Entry ${i}: ${selector} → ${address}`);
  }
}

main().catch(console.error);

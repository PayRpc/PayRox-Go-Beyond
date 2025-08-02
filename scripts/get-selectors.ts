/**
 * Get function selectors from real contracts
 */

import { ethers } from 'hardhat';

async function main() {
  // Get selectors from PingFacet
  const PingFacet = await ethers.getContractFactory('PingFacet');
  console.log('PingFacet selectors:');
  console.log('  ping():', PingFacet.interface.getFunction('ping').selector);
  console.log('  echo():', PingFacet.interface.getFunction('echo').selector);

  // Get selectors from ExampleFacetA
  const ExampleFacetA = await ethers.getContractFactory('ExampleFacetA');
  console.log('\nExampleFacetA selectors:');
  console.log(
    '  storeData():',
    ExampleFacetA.interface.getFunction('storeData').selector
  );
  console.log(
    '  batchStoreData():',
    ExampleFacetA.interface.getFunction('batchStoreData').selector
  );
  console.log(
    '  getData():',
    ExampleFacetA.interface.getFunction('getData').selector
  );
}

main().catch(console.error);

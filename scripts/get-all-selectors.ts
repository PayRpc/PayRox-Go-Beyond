import { ethers } from 'hardhat';

async function main() {
  console.log('🔍 Getting Correct Function Selectors for Standard Facets');
  console.log('='.repeat(60));

  // Get selectors for ExampleFacetA
  const ExampleFacetA = await ethers.getContractFactory('ExampleFacetA');
  const facetAInterface = ExampleFacetA.interface;

  console.log('\n📋 ExampleFacetA selectors:');
  console.log(
    '  executeA(): ' + facetAInterface.getFunction('executeA')?.selector
  );
  console.log(
    '  storeData(): ' + facetAInterface.getFunction('storeData')?.selector
  );
  console.log(
    '  getData(): ' + facetAInterface.getFunction('getData')?.selector
  );
  console.log(
    '  getUserCount(): ' + facetAInterface.getFunction('getUserCount')?.selector
  );

  // Get selectors for ExampleFacetB
  const ExampleFacetB = await ethers.getContractFactory('ExampleFacetB');
  const facetBInterface = ExampleFacetB.interface;

  console.log('\n📋 ExampleFacetB selectors:');
  console.log(
    '  executeB(): ' + facetBInterface.getFunction('executeB')?.selector
  );
  console.log(
    '  batchExecuteB(): ' +
      facetBInterface.getFunction('batchExecuteB')?.selector
  );
  console.log(
    '  complexCalculation(): ' +
      facetBInterface.getFunction('complexCalculation')?.selector
  );
  console.log(
    '  getStateSummary(): ' +
      facetBInterface.getFunction('getStateSummary')?.selector
  );

  // Also include PingFacet for comparison
  const PingFacet = await ethers.getContractFactory('PingFacet');
  const pingInterface = PingFacet.interface;

  console.log('\n📋 PingFacet selectors:');
  console.log('  ping(): ' + pingInterface.getFunction('ping')?.selector);
  console.log('  echo(): ' + pingInterface.getFunction('echo')?.selector);
}

main().catch(console.error);

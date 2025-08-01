const { ethers } = require('hardhat');

async function main() {
  console.log('=== ExampleFacetB Function Selectors ===');
  const ExampleFacetB = await ethers.getContractFactory('ExampleFacetB');
  const iface = ExampleFacetB.interface;

  iface.forEachFunction(func => {
    console.log(`'${func.selector}': '${func.format('full')}',`);
  });

  console.log('\n=== PingFacet Function Selectors ===');
  const PingFacet = await ethers.getContractFactory('PingFacet');
  const ifacePing = PingFacet.interface;

  ifacePing.forEachFunction(func => {
    console.log(`'${func.selector}': '${func.format('full')}',`);
  });
}

main().catch(console.error);

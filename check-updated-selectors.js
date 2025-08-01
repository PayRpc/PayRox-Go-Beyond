const { ethers } = require('hardhat');

async function main() {
  const ExampleFacetB = await ethers.getContractFactory('ExampleFacetB');
  const iface = ExampleFacetB.interface;

  console.log('=== Updated ExampleFacetB Function Selectors ===');
  iface.forEachFunction(func => {
    console.log(`'${func.selector}': '${func.format('full')}',`);
  });
}

main().catch(console.error);

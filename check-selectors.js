const { ethers } = require('hardhat');

async function main() {
  const ExampleFacetA = await ethers.getContractFactory('ExampleFacetA');
  const iface = ExampleFacetA.interface;

  console.log('=== ExampleFacetA Function Selectors ===');
  iface.forEachFunction(func => {
    console.log(`'${func.selector}': '${func.format('full')}',`);
  });
}

main().catch(console.error);

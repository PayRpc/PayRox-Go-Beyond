const hre = require('hardhat');

async function main() {
  const ExampleFacetB = await hre.ethers.getContractFactory('ExampleFacetB');
  const iface = ExampleFacetB.interface;

  console.log('=== Current ExampleFacetB Function Selectors ===');
  Object.keys(iface.functions).forEach(sig => {
    const func = iface.getFunction(sig);
    console.log(`${func.selector}: ${func.format()}`);
  });

  console.log(`\nTotal functions: ${Object.keys(iface.functions).length}`);
}

main().catch(console.error);

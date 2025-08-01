const hre = require('hardhat');

async function main() {
  console.log(
    '🔍 Checking ExampleFacetB function selectors after high-impact fixes...\n'
  );

  const ExampleFacetB = await hre.ethers.getContractFactory('ExampleFacetB');
  const iface = ExampleFacetB.interface;

  console.log('=== ExampleFacetB Function Selectors ===');
  iface.forEachFunction(func => {
    console.log(`${func.selector}: ${func.format()}`);
  });

  console.log(`\n=== Summary ===`);
  console.log(`Total functions: ${Object.keys(iface.functions).length}`);

  // Check if our key new functions are present
  const hasInitNonce = iface.getFunction('getInitNonce') !== null;
  const hasInit = iface.getFunction('initializeFacetB') !== null;

  console.log(`\n✅ Key functions present:`);
  console.log(`  - initializeFacetB: ${hasInit ? '✅' : '❌'}`);
  console.log(`  - getInitNonce: ${hasInitNonce ? '✅' : '❌'}`);

  // Get the init function selector specifically
  if (hasInit) {
    const initFunc = iface.getFunction('initializeFacetB');
    console.log(`\n🔧 initializeFacetB selector: ${initFunc.selector}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

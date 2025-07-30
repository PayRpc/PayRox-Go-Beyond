// scripts/deploy-facet-b-direct.ts
import { ethers } from 'hardhat';

async function main() {
  console.log('🧩 Deploying ExampleFacetB directly...');

  // Deploy FacetB normally first, then we'll get its bytecode
  const ExampleFacetB = await ethers.getContractFactory('ExampleFacetB');
  const facetB = await ExampleFacetB.deploy();
  await facetB.waitForDeployment();

  const address = await facetB.getAddress();
  console.log(`✅ ExampleFacetB deployed to: ${address}`);

  // Get the bytecode
  const code = await ethers.provider.getCode(address);
  console.log(`📏 Bytecode size: ${(code.length - 2) / 2} bytes`);

  return {
    address,
    contract: facetB,
    bytecodeSize: (code.length - 2) / 2,
  };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Deployment failed:', error);
      process.exit(1);
    });
}

export { main };

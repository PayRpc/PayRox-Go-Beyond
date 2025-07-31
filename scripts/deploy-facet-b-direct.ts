// scripts/deploy-facet-b-direct.ts
import * as fs from 'fs';
import { ethers } from 'hardhat';
import * as path from 'path';

async function main() {
  console.log('🧩 Deploying ExampleFacetB directly...');

  const [deployer] = await ethers.getSigners();
  console.log('📄 Deploying with account:', deployer.address);

  // Get network name from Hardhat
  const { network } = require('hardhat');
  const networkName = network.name;

  // Deploy FacetB normally first, then we'll get its bytecode
  const ExampleFacetB = await ethers.getContractFactory('ExampleFacetB');
  const facetB = await ExampleFacetB.deploy();
  await facetB.waitForDeployment();

  const address = await facetB.getAddress();
  console.log(`✅ ExampleFacetB deployed to: ${address}`);

  // Get the bytecode
  const code = await ethers.provider.getCode(address);
  console.log(`📏 Bytecode size: ${(code.length - 2) / 2} bytes`);

  // Save deployment info
  const deploymentInfo = {
    contractName: 'ExampleFacetB',
    address: address,
    deployer: deployer.address,
    network: networkName,
    timestamp: new Date().toISOString(),
    transactionHash: facetB.deploymentTransaction()?.hash || 'unknown',
    bytecodeSize: (code.length - 2) / 2,
  };

  // Ensure deployment directory exists
  const deployDir = path.join(__dirname, '..', 'deployments', networkName);
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  // Save to file
  const deployFile = path.join(deployDir, 'facet-b.json');
  fs.writeFileSync(deployFile, JSON.stringify(deploymentInfo, null, 2));

  console.log('💾 Deployment info saved:', deployFile);
  console.log('🎉 ExampleFacetB deployment complete!');

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

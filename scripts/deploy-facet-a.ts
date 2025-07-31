import * as fs from 'fs';
import { ethers } from 'hardhat';
import * as path from 'path';

async function main() {
  console.log('🧩 Deploying ExampleFacetA...');

  const [deployer] = await ethers.getSigners();
  console.log('📄 Deploying with account:', deployer.address);

  // Get network name from Hardhat
  const { network } = require('hardhat');
  const networkName = network.name;

  // Deploy ExampleFacetA
  const FacetFactory = await ethers.getContractFactory('ExampleFacetA');
  const facet = await FacetFactory.deploy();
  await facet.waitForDeployment();

  const address = await facet.getAddress();
  console.log('✅ ExampleFacetA deployed to:', address);

  // Save deployment info
  const deploymentInfo = {
    contractName: 'ExampleFacetA',
    address: address,
    deployer: deployer.address,
    network: networkName,
    timestamp: new Date().toISOString(),
    transactionHash: facet.deploymentTransaction()?.hash || 'unknown',
  };

  // Ensure deployment directory exists
  const deployDir = path.join(__dirname, '..', 'deployments', networkName);
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  // Save to file
  const deployFile = path.join(deployDir, 'facet-a.json');
  fs.writeFileSync(deployFile, JSON.stringify(deploymentInfo, null, 2));

  console.log('💾 Deployment info saved:', deployFile);
  console.log('🎉 ExampleFacetA deployment complete!');

  return deploymentInfo;
}

// Execute the deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

export { main };

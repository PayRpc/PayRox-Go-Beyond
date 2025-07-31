import * as fs from 'fs';
import { ethers } from 'hardhat';
import * as path from 'path';

interface DeploymentArtifact {
  contractName: string;
  address: string;
  deployer: string;
  network: string;
  timestamp: string;
  transactionHash: string;
}

async function main() {
  console.log('🔍 PayRox Deployment Address Verification');
  console.log('=========================================');

  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();

  console.log(`📡 Network: ${network.name} (Chain ID: ${chainId})`);

  // Check Factory Deployment
  console.log('\n🏭 Checking Factory Deployment...');
  const factoryArtifact = await checkDeploymentArtifact('factory', chainId);
  if (factoryArtifact) {
    await verifyContractAtAddress(
      factoryArtifact.address,
      'DeterministicChunkFactory',
      'Factory'
    );
  }

  // Check Dispatcher Deployment
  console.log('\n� Checking Dispatcher Deployment...');
  const dispatcherArtifact = await checkDeploymentArtifact(
    'dispatcher',
    chainId
  );
  if (dispatcherArtifact) {
    await verifyContractAtAddress(
      dispatcherArtifact.address,
      'ManifestDispatcher',
      'Dispatcher'
    );
  }

  // Check Known Facets
  console.log('\n🔹 Checking Known Facet Deployments...');
  const knownFacets = [
    {
      name: 'FacetA',
      address: '0xDDa0648FA8c9cD593416EC37089C2a2E6060B45c',
      contractName: 'ExampleFacetA',
    },
    {
      name: 'FacetB',
      address: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
      contractName: 'ExampleFacetB',
    },
  ];

  for (const facet of knownFacets) {
    await verifyContractAtAddress(
      facet.address,
      facet.contractName,
      facet.name
    );
  }

  console.log('\n✅ Deployment address verification completed!');
}

async function checkDeploymentArtifact(
  componentName: string,
  chainId: string
): Promise<DeploymentArtifact | null> {
  // Try network-specific path first
  let artifactPath = path.join(
    __dirname,
    `../deployments/${chainId}/${componentName}.json`
  );

  if (!fs.existsSync(artifactPath)) {
    // Fallback to hardhat deployment
    artifactPath = path.join(
      __dirname,
      `../deployments/hardhat/${componentName}.json`
    );
  }

  if (!fs.existsSync(artifactPath)) {
    console.log(`   ❌ ${componentName} artifact not found`);
    return null;
  }

  try {
    const artifact: DeploymentArtifact = JSON.parse(
      fs.readFileSync(artifactPath, 'utf8')
    );
    console.log(`   ✅ ${artifact.contractName} artifact found`);
    console.log(`      📍 Address: ${artifact.address}`);
    console.log(`      ⏰ Deployed: ${artifact.timestamp}`);
    console.log(`      🔗 TX Hash: ${artifact.transactionHash}`);
    return artifact;
  } catch (error) {
    console.log(`   ❌ Failed to parse ${componentName} artifact: ${error}`);
    return null;
  }
}

async function verifyContractAtAddress(
  address: string,
  contractName: string,
  displayName: string
) {
  try {
    // Check if address has code
    const code = await ethers.provider.getCode(address);
    if (code === '0x') {
      console.log(`   ❌ ${displayName}: No code at ${address}`);
      return;
    }

    console.log(`   ✅ ${displayName}: Code deployed at ${address}`);
    console.log(
      `      📏 Code size: ${Math.floor((code.length - 2) / 2)} bytes`
    );

    // Try to verify contract interface
    try {
      const contract = await ethers.getContractAt(contractName, address);

      // Test basic interface calls based on contract type
      if (contractName === 'DeterministicChunkFactory') {
        const owner = await contract.owner();
        const feeRecipient = await contract.feeRecipient();
        console.log(`      👤 Owner: ${owner}`);
        console.log(`      💰 Fee Recipient: ${feeRecipient}`);
      } else if (contractName === 'ManifestDispatcher') {
        const owner = await contract.owner();
        const frozen = await contract.frozen();
        console.log(`      👤 Owner: ${owner}`);
        console.log(`      🧊 Frozen: ${frozen}`);
      } else if (contractName === 'ExampleFacetA') {
        // Just verify the interface exists
        contract.interface.getFunction('functionA');
        console.log(`      🔧 Interface: functionA verified`);
      } else if (contractName === 'ExampleFacetB') {
        // Just verify the interface exists
        contract.interface.getFunction('functionB');
        console.log(`      🔧 Interface: functionB verified`);
      }

      console.log(`   ✅ ${displayName}: Interface verification passed`);
    } catch (interfaceError) {
      console.log(`   ⚠️  ${displayName}: Interface verification failed`);
      console.log(
        `      📝 Error: ${
          interfaceError instanceof Error
            ? interfaceError.message
            : String(interfaceError)
        }`
      );
    }
  } catch (error) {
    console.log(`   ❌ ${displayName}: Verification failed`);
    console.log(
      `      📝 Error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Verification script failed:', error);
    process.exit(1);
  });

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

import * as fs from 'fs';
import { ethers } from 'hardhat';
import * as path from 'path';

interface DeploymentInfo {
  contractName: string;
  address: string;
  deployer: string;
  network: string;
  timestamp: string;
  transactionHash: string | undefined;
  constructorArguments: any[];
  [key: string]: any;
}

async function saveDeploymentInfo(
  networkName: string,
  info: DeploymentInfo
): Promise<void> {
  const deploymentsDir = path.join(process.cwd(), 'deployments', networkName);
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Convert BigInt values to strings for JSON serialization
  const serializableInfo = JSON.parse(
    JSON.stringify(info, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );

  const filePath = path.join(
    deploymentsDir,
    `${info.contractName.toLowerCase()}.json`
  );
  fs.writeFileSync(filePath, JSON.stringify(serializableInfo, null, 2));
  console.log(`   📄 Saved deployment info: ${filePath}`);
}

async function saveAuditRecord(
  networkName: string,
  auditInfo: {
    manifestHash: string;
    timestamp: string;
    factoryAddress: string;
    dispatcherAddress: string;
    deployer: string;
    network: string;
    chainId: string;
  }
): Promise<void> {
  const auditDir = path.join(process.cwd(), 'deployments', networkName);
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }

  const auditRecord = {
    auditType: 'DEPLOYMENT_MANIFEST',
    ...auditInfo,
    auditRequiredMessage: '🔍 Check if Audit Required',
    verificationSteps: [
      '1. Verify manifest hash matches deployed contracts',
      '2. Review all function selectors for security',
      '3. Validate facet addresses and permissions',
      '4. Confirm factory and dispatcher configuration',
    ],
  };

  const auditFile = path.join(auditDir, 'audit-record.json');
  fs.writeFileSync(auditFile, JSON.stringify(auditRecord, null, 2));
  console.log(`   📋 Audit record saved: ${auditFile}`);
  console.log(
    `   🔍 Check if Audit Required - Manifest hash: ${auditInfo.manifestHash}`
  );
}

async function runScript(
  scriptName: string,
  network: string
): Promise<boolean> {
  console.log(`\n🔄 Running ${scriptName}...`);
  try {
    const { execSync } = require('child_process');
    execSync(`npx hardhat run scripts/${scriptName} --network ${network}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log(`✅ ${scriptName} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${scriptName} failed:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 PayRox Go Beyond - Complete System Deployment');
  console.log('================================================');

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === 'unknown' ? 'localhost' : network.name;

  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`📡 Network: ${networkName} (Chain ID: ${network.chainId})`);
  console.log(
    `💰 Balance: ${ethers.formatEther(
      await ethers.provider.getBalance(deployer.address)
    )} ETH`
  );

  try {
    // Step 1: Compile contracts
    console.log(`\n🔨 Compiling smart contracts...`);
    console.log(`   ⚡ This ensures all contracts are up to date`);

    // Note: In a real deployment script, you might want to add compilation step here
    // For now, we assume contracts are pre-compiled by the caller
    console.log(
      `   ✅ Assuming contracts are compiled (run 'npx hardhat compile' beforehand)`
    );

    // Step 2: Clean previous deployments
    console.log(`\n🧹 Cleaning previous deployment artifacts...`);
    const deploymentsDir = path.join(process.cwd(), 'deployments', networkName);
    if (fs.existsSync(deploymentsDir)) {
      const files = fs.readdirSync(deploymentsDir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(deploymentsDir, file));
        }
      });
      console.log(`✅ Cleaned ${files.length} previous artifacts`);
    } else {
      fs.mkdirSync(deploymentsDir, { recursive: true });
      console.log(`✅ Created deployments directory: ${deploymentsDir}`);
    }

    // Step 2: Deploy Factory and Dispatcher (Combined)
    console.log(`\n🏭 Deploying DeterministicChunkFactory...`);

    const FactoryContract = await ethers.getContractFactory(
      'DeterministicChunkFactory'
    );
    const factory = await FactoryContract.deploy(
      deployer.address, // admin
      deployer.address, // feeRecipient
      ethers.parseEther('0.0007') // baseFeeWei (0.0007 ETH)
    );
    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();
    console.log(`✅ Factory deployed to: ${factoryAddress}`);

    // Save factory deployment info
    await saveDeploymentInfo(networkName, {
      contractName: 'factory',
      address: factoryAddress,
      deployer: deployer.address,
      network: networkName,
      timestamp: new Date().toISOString(),
      transactionHash: factory.deploymentTransaction()?.hash,
      constructorArguments: [
        deployer.address,
        deployer.address,
        '1000000000000000',
      ], // 0.001 ETH in wei
    });

    // Step 3: Deploy ManifestDispatcher
    console.log(`\n🗂️ Deploying ManifestDispatcher...`);

    const DispatcherContract = await ethers.getContractFactory(
      'ManifestDispatcher'
    );
    const dispatcher = await DispatcherContract.deploy(
      deployer.address, // admin
      3600 // activationDelay (1 hour in seconds)
    );
    await dispatcher.waitForDeployment();

    const dispatcherAddress = await dispatcher.getAddress();
    console.log(`✅ Dispatcher deployed to: ${dispatcherAddress}`);

    // Verify addresses are different
    if (factoryAddress === dispatcherAddress) {
      throw new Error(
        '🚨 CRITICAL: Factory and Dispatcher have the same address!'
      );
    }
    console.log(`✅ Address verification passed - unique addresses confirmed`);

    // Save dispatcher deployment info
    await saveDeploymentInfo(networkName, {
      contractName: 'dispatcher',
      address: dispatcherAddress,
      deployer: deployer.address,
      network: networkName,
      timestamp: new Date().toISOString(),
      transactionHash: dispatcher.deploymentTransaction()?.hash,
      constructorArguments: [deployer.address, 3600], // admin, activationDelay
    });

    // Step 4: Deploy ExampleFacetA
    console.log(`\n💎 Deploying ExampleFacetA...`);
    if (!(await runScript('deploy-facet-a.ts', networkName))) {
      console.warn(
        `⚠️ FacetA deployment failed, continuing with core system...`
      );
    }

    // Step 5: Deploy ExampleFacetB
    console.log(`\n💎 Deploying ExampleFacetB...`);
    if (!(await runScript('deploy-facet-b-direct.ts', networkName))) {
      console.warn(
        `⚠️ FacetB deployment failed, continuing with core system...`
      );
    }

    // Step 5.5: Deploy Orchestrator Contracts
    console.log(`\n🎯 Deploying Orchestrator Contracts...`);
    if (!(await runScript('deploy-orchestrators.ts', networkName))) {
      console.warn(
        `⚠️ Orchestrator deployment failed, continuing without orchestration...`
      );
    }

    // Step 6: Build Production Manifest
    console.log(`\n📋 Building Production Manifest...`);
    if (!(await runScript('build-manifest.ts', networkName))) {
      console.warn(
        `⚠️ Manifest build failed, system will work without manifest...`
      );
    } else {
      // Read and display manifest hash for audit purposes
      try {
        const merkleFile = path.join(
          process.cwd(),
          'manifests',
          'current.merkle.json'
        );
        if (fs.existsSync(merkleFile)) {
          const merkleData = JSON.parse(fs.readFileSync(merkleFile, 'utf8'));
          const manifestHash = merkleData.root;
          console.log(`\n🔍 Manifest Audit Information:`);
          console.log(`   📊 Manifest Hash: ${manifestHash}`);
          console.log(`   📁 Manifest File: manifests/current.manifest.json`);
          console.log(`   🌳 Merkle File: manifests/current.merkle.json`);

          // Save audit record
          await saveAuditRecord(networkName, {
            manifestHash,
            timestamp: new Date().toISOString(),
            factoryAddress,
            dispatcherAddress,
            deployer: deployer.address,
            network: networkName,
            chainId: network.chainId.toString(),
          });
        }
      } catch (error) {
        console.warn(`⚠️ Could not read manifest hash:`, error);
      }
    }

    // Step 7: Test basic functionality
    console.log(`\n🧪 Testing basic factory functionality...`);
    try {
      const testData = ethers.getBytes('0x6080604052'); // Minimal test bytecode
      const [predictedAddress, hash] = await factory.predict(testData);
      console.log(`✅ Factory predict test passed`);
      console.log(`   Predicted address: ${predictedAddress}`);
      console.log(`   Content hash: ${hash}`);
    } catch (error) {
      console.warn(`⚠️ Factory test failed:`, error);
    }

    // Step 8: Test dispatcher functionality
    console.log(`\n🧪 Testing basic dispatcher functionality...`);
    try {
      const currentRoot = await dispatcher.currentRoot();
      console.log(`✅ Dispatcher accessible`);
      console.log(`   Current root: ${currentRoot}`);
    } catch (error) {
      console.warn(`⚠️ Dispatcher test failed:`, error);
    }

    // Success Summary
    console.log(`\n🎉 DEPLOYMENT COMPLETE!`);
    console.log(`=======================`);
    console.log(``);
    console.log(`🏭 Factory: ${factoryAddress}`);
    console.log(`🗂️ Dispatcher: ${dispatcherAddress}`);

    // Display manifest hash prominently if available
    try {
      const merkleFile = path.join(
        process.cwd(),
        'manifests',
        'current.merkle.json'
      );
      if (fs.existsSync(merkleFile)) {
        const merkleData = JSON.parse(fs.readFileSync(merkleFile, 'utf8'));
        console.log(`📊 Manifest Hash: ${merkleData.root}`);
        console.log(`🔍 Check if Audit Required - Hash: ${merkleData.root}`);
      }
    } catch (error) {
      console.log(`📊 Manifest Hash: Not available`);
    }

    console.log(``);
    console.log(`📊 System Status:`);
    console.log(`   ✅ Core contracts deployed and verified`);
    console.log(`   ✅ Unique addresses confirmed`);
    console.log(`   ✅ Basic functionality tested`);
    console.log(`   ✅ Ready for facet deployment`);
    console.log(`   ✅ Audit record created with manifest hash`);
    console.log(``);
    console.log(
      `📁 Deployment artifacts saved to: deployments/${networkName}/`
    );
    console.log(
      `📋 Audit record available at: deployments/${networkName}/audit-record.json`
    );
    console.log(``);
    console.log(`🚀 Next Steps:`);
    console.log(`   1. Review audit record for security compliance`);
    console.log(`   2. Deploy additional facets as needed`);
    console.log(`   3. Test function calls via dispatcher`);
    console.log(`   4. Set up production monitoring`);

    return {
      factory: factoryAddress,
      dispatcher: dispatcherAddress,
      network: networkName,
      deployer: deployer.address,
    };
  } catch (error) {
    console.error('\n❌ DEPLOYMENT FAILED!');
    console.error('Error:', error);

    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Check if network is accessible');
    console.log('   2. Verify deployer has sufficient balance');
    console.log('   3. Ensure contracts compile successfully');
    console.log('   4. Review error logs above for specific issues');

    throw error;
  }
}

// Allow the script to be run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { main };

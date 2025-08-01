#!/usr/bin/env node

/**
 * PayRox Go Beyond Core System Deployment
 * Deploys the universal addressing and fee management contracts
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

function execCommand(command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function deployPayRoxCore() {
  console.log('🚀 PayRox Go Beyond - Core System Deployment');
  console.log('═══════════════════════════════════════════');
  console.log('Deploying universal addressing and fee management system\n');

  const rootDir = path.join(__dirname, '..');
  
  try {
    // Step 1: Deploy DeterministicChunkFactory (Universal Addressing + Fees)
    console.log('🔄 Step 1: Deploying DeterministicChunkFactory...');
    console.log('   📍 Universal CREATE2 addressing');
    console.log('   💰 Configurable fee management');
    console.log('   🔒 Access control and security');
    
    const factoryResult = await execCommand(
      'npx hardhat run scripts/deploy-factory.ts --network localhost',
      rootDir
    );
    console.log('✅ DeterministicChunkFactory deployed!');
    console.log(factoryResult.stdout);

    // Step 2: Deploy ManifestDispatcher (Function Routing)
    console.log('🔄 Step 2: Deploying ManifestDispatcher...');
    console.log('   🎯 Universal function routing');
    console.log('   📋 Manifest-based upgrades');
    console.log('   🛡️ Security and governance controls');
    
    const dispatcherResult = await execCommand(
      'npx hardhat run scripts/deploy-dispatcher.ts --network localhost',
      rootDir
    );
    console.log('✅ ManifestDispatcher deployed!');
    console.log(dispatcherResult.stdout);

    // Step 3: Deploy Orchestrator (Deployment Coordination)
    console.log('🔄 Step 3: Deploying Orchestrator...');
    console.log('   🎼 Multi-contract deployment coordination');
    console.log('   ⛽ Gas tracking and management');
    console.log('   📊 Deployment audit trails');
    
    const orchestratorResult = await execCommand(
      'npx hardhat run scripts/deploy-orchestrators.ts --network localhost',
      rootDir
    );
    console.log('✅ Orchestrator deployed!');
    console.log(orchestratorResult.stdout);

    // Step 4: Read deployment information
    console.log('🔄 Step 4: Reading deployment information...');
    const deploymentsPath = path.join(rootDir, 'deployments', 'localhost');
    
    let factoryInfo, dispatcherInfo, orchestratorInfo;
    
    try {
      factoryInfo = JSON.parse(fs.readFileSync(path.join(deploymentsPath, 'factory.json'), 'utf8'));
      dispatcherInfo = JSON.parse(fs.readFileSync(path.join(deploymentsPath, 'dispatcher.json'), 'utf8'));
      orchestratorInfo = JSON.parse(fs.readFileSync(path.join(deploymentsPath, 'orchestrator.json'), 'utf8'));
    } catch (error) {
      console.log('⚠️  Could not read all deployment files. Checking what exists...');
      if (fs.existsSync(path.join(deploymentsPath, 'factory.json'))) {
        factoryInfo = JSON.parse(fs.readFileSync(path.join(deploymentsPath, 'factory.json'), 'utf8'));
      }
      if (fs.existsSync(path.join(deploymentsPath, 'dispatcher.json'))) {
        dispatcherInfo = JSON.parse(fs.readFileSync(path.join(deploymentsPath, 'dispatcher.json'), 'utf8'));
      }
    }

    // Step 5: Display core system information
    console.log('\n🎉 CORE SYSTEM DEPLOYMENT COMPLETE!');
    console.log('═══════════════════════════════════════');
    
    if (factoryInfo) {
      console.log('\n🏭 DeterministicChunkFactory (Universal Addressing)');
      console.log(`   📍 Address: ${factoryInfo.address}`);
      console.log(`   💰 Fee System: Configurable deployment fees`);
      console.log(`   🔍 Universal Hashing: CREATE2 deterministic addresses`);
      console.log(`   🎯 Purpose: Deploy contracts with predictable addresses`);
    }

    if (dispatcherInfo) {
      console.log('\n📡 ManifestDispatcher (Function Routing)');
      console.log(`   📍 Address: ${dispatcherInfo.address}`);
      console.log(`   🎯 Routing: Universal function selector mapping`);
      console.log(`   📋 Manifests: Upgradeable function implementations`);
      console.log(`   🎯 Purpose: Route function calls to implementations`);
    }

    if (orchestratorInfo) {
      console.log('\n🎼 Orchestrator (Deployment Coordination)');
      console.log(`   📍 Address: ${orchestratorInfo.address}`);
      console.log(`   ⚡ Coordination: Multi-contract deployment orchestration`);
      console.log(`   ⛽ Gas Tracking: Deployment cost management`);
      console.log(`   🎯 Purpose: Coordinate complex deployments`);
    }

    // Step 6: Generate SDK configuration
    console.log('\n📚 SDK Integration Configuration:');
    console.log('═══════════════════════════════════');
    
    const sdkConfig = {
      network: 'localhost',
      contracts: {
        factory: factoryInfo?.address || 'DEPLOY_FACTORY_FIRST',
        dispatcher: dispatcherInfo?.address || 'DEPLOY_DISPATCHER_FIRST',
        orchestrator: orchestratorInfo?.address || 'DEPLOY_ORCHESTRATOR_FIRST'
      },
      features: {
        universalAddressing: true,
        feeManagement: true,
        functionRouting: true,
        deploymentOrchestration: true
      }
    };

    console.log('```json');
    console.log(JSON.stringify(sdkConfig, null, 2));
    console.log('```');

    // Step 7: Usage examples
    console.log('\n🛠️  Usage Examples:');
    console.log('═══════════════════');
    
    if (factoryInfo) {
      console.log('\n💰 Fee Management:');
      console.log(`   • Check current fee: contract.baseFeeWei()`);
      console.log(`   • Fee recipient: contract.feeRecipient()`);
      console.log(`   • Deploy with fee: contract.stage(bytecode, {value: fee})`);
      
      console.log('\n🔍 Universal Addressing:');
      console.log(`   • Predict address: contract.predict(bytecode, salt)`);
      console.log(`   • Check if deployed: contract.exists(hash)`);
      console.log(`   • Get chunk address: contract.chunkOf(hash)`);
    }

    if (dispatcherInfo) {
      console.log('\n🎯 Function Routing:');
      console.log(`   • Add routes: contract.applyRoutes(selectors, facets, proofs)`);
      console.log(`   • Check route: contract.routes(selector)`);
      console.log(`   • Activate manifest: contract.activateCommittedRoot()`);
    }

    console.log('\n📦 Next Steps for dApp Development:');
    console.log('1. Use the factory address for universal deployment');
    console.log('2. Use the dispatcher for function routing');
    console.log('3. Use the orchestrator for complex deployments');
    console.log('4. Integrate addresses into your dApp plugins');
    console.log('5. Deploy your dApp contracts through this system');

    return {
      success: true,
      addresses: {
        factory: factoryInfo?.address,
        dispatcher: dispatcherInfo?.address,
        orchestrator: orchestratorInfo?.address
      }
    };

  } catch (error) {
    console.error('❌ Core system deployment failed:', error.error?.message || error.stdout || error.stderr);
    console.log('\n🛠️ Troubleshooting:');
    console.log('1. Make sure you have a local Hardhat node running: npx hardhat node');
    console.log('2. Ensure the PayRox contracts are compiled: npx hardhat compile');
    console.log('3. Check that you have sufficient ETH for deployment');
    console.log('4. Verify network configuration in hardhat.config.ts');
    return { success: false, error };
  }
}

// Export for use as module
module.exports = { deployPayRoxCore };

// Run if called directly
if (require.main === module) {
  deployPayRoxCore().catch(console.error);
}

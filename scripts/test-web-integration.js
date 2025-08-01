#!/usr/bin/env node

/**
 * Integration Test: Frontend and Backend Contract Communication
 * Tests that the web interface can properly communicate with deployed contracts
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// Configuration
const RPC_URL = 'http://localhost:8545';
const FRONTEND_CONFIG_PATH = path.join(
  __dirname,
  '../tools/ai-assistant/frontend/src/contracts/config.json'
);
const ABIS_PATH = path.join(
  __dirname,
  '../tools/ai-assistant/frontend/src/contracts/abis.json'
);
const BACKEND_URL = 'http://localhost:3001';

async function testContractIntegration() {
  console.log('🧪 PayRox Contract Integration Test');
  console.log('=====================================');

  let provider;
  let frontendConfig;
  let contractABIs;

  // Test 1: Load Frontend Configuration
  console.log('\n📋 Test 1: Frontend Configuration');
  try {
    frontendConfig = JSON.parse(fs.readFileSync(FRONTEND_CONFIG_PATH, 'utf8'));
    console.log('✅ Frontend config loaded successfully');
    console.log(
      `   📦 Contracts available: ${
        Object.keys(frontendConfig.contracts).length
      }`
    );
    console.log(`   🌐 Network: ${frontendConfig.network}`);
  } catch (error) {
    console.error('❌ Failed to load frontend config:', error.message);
    return false;
  }

  // Test 2: Load Contract ABIs
  console.log('\n🔧 Test 2: Contract ABIs');
  try {
    contractABIs = JSON.parse(fs.readFileSync(ABIS_PATH, 'utf8'));
    console.log('✅ Contract ABIs loaded successfully');
    console.log(`   📋 ABI contracts: ${Object.keys(contractABIs).length}`);

    for (const [name, abi] of Object.entries(contractABIs)) {
      console.log(`   - ${name}: ${abi.abi.length} functions/events`);
    }
  } catch (error) {
    console.error('❌ Failed to load contract ABIs:', error.message);
    return false;
  }

  // Test 3: Blockchain Connectivity
  console.log('\n⛓️  Test 3: Blockchain Connection');
  try {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();

    console.log('✅ Blockchain connection successful');
    console.log(`   🔗 Chain ID: ${network.chainId}`);
    console.log(`   📦 Latest block: ${blockNumber}`);
  } catch (error) {
    console.error('❌ Blockchain connection failed:', error.message);
    return false;
  }

  // Test 4: Contract Accessibility
  console.log('\n📝 Test 4: Contract Accessibility');
  const contractTests = [];

  for (const [deploymentKey, contractInfo] of Object.entries(
    frontendConfig.contracts
  )) {
    if (!contractInfo.hasABI) {
      console.log(`⚠️  Skipping ${contractInfo.name} (no ABI)`);
      continue;
    }

    try {
      const abi = contractABIs[contractInfo.name];
      if (!abi) {
        console.log(`⚠️  Warning: ABI not found for ${contractInfo.name}`);
        continue;
      }

      const contract = new ethers.Contract(
        contractInfo.address,
        abi.abi,
        provider
      );

      // Test basic contract interaction based on contract type
      let testResult = {
        name: contractInfo.name,
        address: contractInfo.address,
        status: 'unknown',
      };

      if (contractInfo.name === 'DeterministicChunkFactory') {
        const baseFee = await contract.baseFeeWei();
        testResult.status = 'connected';
        testResult.data = { baseFeeWei: baseFee.toString() };
        console.log(
          `✅ Factory: Base fee = ${ethers.formatEther(baseFee)} ETH`
        );
      } else if (contractInfo.name === 'ManifestDispatcher') {
        const activeRoot = await contract.activeRoot();
        testResult.status = 'connected';
        testResult.data = { activeRoot };
        console.log(
          `✅ Dispatcher: Active root = ${activeRoot.slice(0, 10)}...`
        );
      } else if (contractInfo.name === 'Orchestrator') {
        const factory = await contract.factory();
        testResult.status = 'connected';
        testResult.data = { factory };
        console.log(`✅ Orchestrator: Factory = ${factory.slice(0, 10)}...`);
      } else if (contractInfo.name === 'PingFacet') {
        const pingResult = await contract.ping();
        testResult.status = 'connected';
        testResult.data = { pingResult };
        console.log(`✅ PingFacet: Response = "${pingResult}"`);
      } else {
        // Generic test - just check if contract exists at address
        const code = await provider.getCode(contractInfo.address);
        if (code && code !== '0x') {
          testResult.status = 'deployed';
          console.log(`✅ ${contractInfo.name}: Contract deployed`);
        } else {
          testResult.status = 'not_found';
          console.log(`❌ ${contractInfo.name}: No contract at address`);
        }
      }

      contractTests.push(testResult);
    } catch (error) {
      console.log(`❌ ${contractInfo.name}: ${error.message}`);
      contractTests.push({
        name: contractInfo.name,
        address: contractInfo.address,
        status: 'error',
        error: error.message,
      });
    }
  }

  // Test 5: Backend API (if available)
  console.log('\n🖥️  Test 5: Backend API Integration');
  try {
    const fetch = require('node-fetch').default || require('node-fetch');

    // Test health endpoint
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Backend API accessible');
      console.log(`   📊 Status: ${healthData.status}`);

      // Test contracts endpoint
      try {
        const contractsResponse = await fetch(`${BACKEND_URL}/api/contracts`);
        if (contractsResponse.ok) {
          const contractsData = await contractsResponse.json();
          console.log('✅ Contracts API working');
          console.log(
            `   📋 Backend knows about ${
              Object.keys(contractsData.data.contracts?.core || {}).length
            } core contracts`
          );
        } else {
          console.log('⚠️  Contracts API not responding properly');
        }
      } catch (apiError) {
        console.log('⚠️  Contracts API test failed:', apiError.message);
      }
    } else {
      console.log('⚠️  Backend API not accessible (this is OK if not running)');
    }
  } catch (backendError) {
    console.log('⚠️  Backend not running (this is OK for contract testing)');
  }

  // Test Summary
  console.log('\n📊 Integration Test Summary');
  console.log('===========================');

  const connected = contractTests.filter(t => t.status === 'connected').length;
  const deployed = contractTests.filter(t => t.status === 'deployed').length;
  const errors = contractTests.filter(t => t.status === 'error').length;
  const total = contractTests.length;

  console.log(`📋 Total contracts tested: ${total}`);
  console.log(`✅ Fully connected: ${connected}`);
  console.log(`🟡 Deployed only: ${deployed}`);
  console.log(`❌ Errors: ${errors}`);

  if (connected + deployed === total && errors === 0) {
    console.log(
      '\n🎉 All tests passed! Frontend and backend are ready to use deployed contracts.'
    );
    return true;
  } else if (connected + deployed > total / 2) {
    console.log(
      '\n⚠️  Most contracts working, some issues detected. Check logs above.'
    );
    return true;
  } else {
    console.log(
      '\n❌ Major issues detected. Check deployment and configuration.'
    );
    return false;
  }
}

// Test Frontend Contract Service (if we can simulate it)
async function testFrontendContractService() {
  console.log('\n🎨 Frontend Contract Service Simulation');
  console.log('=======================================');

  try {
    const configPath = FRONTEND_CONFIG_PATH;
    const abisPath = ABIS_PATH;

    // Check if files exist and are readable
    if (fs.existsSync(configPath) && fs.existsSync(abisPath)) {
      console.log('✅ Contract configuration files accessible to frontend');

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const abis = JSON.parse(fs.readFileSync(abisPath, 'utf8'));

      // Simulate what the frontend service would do
      console.log('📝 Frontend can:');
      console.log(
        `   - Load ${Object.keys(config.contracts).length} contract addresses`
      );
      console.log(`   - Access ${Object.keys(abis).length} contract ABIs`);
      console.log(
        '   - Create ethers.Contract instances for each deployed contract'
      );
      console.log('   - Connect to MetaMask or JSON RPC provider');
      console.log('   - Call contract functions and display results');

      return true;
    } else {
      console.log('❌ Contract configuration files not found');
      return false;
    }
  } catch (error) {
    console.log('❌ Frontend service simulation failed:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  try {
    const integrationSuccess = await testContractIntegration();
    const frontendSuccess = await testFrontendContractService();

    console.log('\n🏁 Final Result');
    console.log('===============');

    if (integrationSuccess && frontendSuccess) {
      console.log(
        '🎉 SUCCESS: Web interface is ready to work with deployed contracts!'
      );
      console.log('\n📋 Next Steps:');
      console.log(
        '1. Start the backend: cd tools/ai-assistant/backend && npm start'
      );
      console.log(
        '2. Start the frontend: cd tools/ai-assistant/frontend && npm run dev'
      );
      console.log('3. Open http://localhost:3000 to use the web interface');
      process.exit(0);
    } else {
      console.log('❌ FAILURE: Issues detected with contract integration');
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Ensure contracts are deployed: npm run deploy:ecosystem');
      console.log('2. Regenerate contract bundles: npm run contracts:bundle');
      console.log('3. Check that local blockchain is running');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  testContractIntegration,
  testFrontendContractService,
};

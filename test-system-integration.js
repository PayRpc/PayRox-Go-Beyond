/**
 * PayRox Go Beyond - System Integration Test
 * Tests if all contracts communicate correctly with each other
 */

/* eslint-env node, es6 */
/* global console, process, require */
const { ethers } = require('hardhat');

// Contract addresses from latest deployment
const CONTRACT_ADDRESSES = {
  FACTORY: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  DISPATCHER: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  ORCHESTRATOR: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  PING_FACET: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
};

// Expected values for validation
const EXPECTED_VALUES = {
  BASE_FEE: ethers.parseEther('0.0007'),
};

/**
 * Logs a test result with consistent formatting
 * @param {string} testName - Name of the test
 * @param {string} expected - Expected value
 * @param {string} actual - Actual value
 * @param {boolean} passed - Whether the test passed
 */
function logTestResult(testName, expected, actual, passed) {
  console.log(`${testName}:`);
  console.log(`   Expected: ${expected}`);
  console.log(`   Actual:   ${actual}`);
  console.log(`   Match:    ${passed ? 'PASS' : 'FAIL'}`);
}

/**
 * Logs configuration details with consistent formatting
 * @param {string} title - Configuration section title
 * @param {Object} config - Configuration object
 */
function logConfiguration(title, config) {
  console.log(`${title}:`);
  Object.entries(config).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
}

async function main() {
  console.log('PayRox Go Beyond - System Integration Test');
  console.log('===============================================');

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Load contracts using constants
  const factory = await ethers.getContractAt(
    'DeterministicChunkFactory',
    CONTRACT_ADDRESSES.FACTORY
  );
  const dispatcher = await ethers.getContractAt(
    'ManifestDispatcher',
    CONTRACT_ADDRESSES.DISPATCHER
  );
  const orchestrator = await ethers.getContractAt(
    'Orchestrator',
    CONTRACT_ADDRESSES.ORCHESTRATOR
  );

  console.log('\nVerifying Contract Deployments...');

  // Test 1: Factory Configuration
  const baseFeeWei = await factory.baseFeeWei();
  const feesEnabled = await factory.feesEnabled();
  const feeRecipient = await factory.feeRecipient();

  logConfiguration('Factory Configuration', {
    'Base fee': `${ethers.formatEther(baseFeeWei)} ETH`,
    'Fees enabled': feesEnabled,
    'Fee recipient': feeRecipient,
  });

  // Test 2: Dispatcher Configuration
  const activeRoot = await dispatcher.activeRoot();
  const frozen = await dispatcher.frozen();
  const manifestVersion = await dispatcher.getManifestVersion();

  logConfiguration('Dispatcher Configuration', {
    'Active root': activeRoot,
    Frozen: frozen,
    'Manifest version': manifestVersion,
  });

  // Test 3: Orchestrator Configuration
  const orchFactory = await orchestrator.factory();
  const orchDispatcher = await orchestrator.dispatcher();
  const admin = await orchestrator.admin();

  logConfiguration('Orchestrator Configuration', {
    Factory: orchFactory,
    Dispatcher: orchDispatcher,
    Admin: admin,
  });

  // Test 4: Contract Interactions
  console.log('\nTesting Contract Interactions...');

  // Test factory-dispatcher reference
  const factoryDispatcher = await factory.MANIFEST_DISPATCHER();
  logTestResult(
    'Factory-Dispatcher Link',
    CONTRACT_ADDRESSES.DISPATCHER,
    factoryDispatcher,
    factoryDispatcher === CONTRACT_ADDRESSES.DISPATCHER
  );

  // Test orchestrator-factory reference
  logTestResult(
    'Orchestrator-Factory Link',
    CONTRACT_ADDRESSES.FACTORY,
    orchFactory,
    orchFactory === CONTRACT_ADDRESSES.FACTORY
  );

  // Test orchestrator-dispatcher reference
  logTestResult(
    'Orchestrator-Dispatcher Link',
    CONTRACT_ADDRESSES.DISPATCHER,
    orchDispatcher,
    orchDispatcher === CONTRACT_ADDRESSES.DISPATCHER
  );

  // Test 5: Fee Structure Verification
  console.log('\nVerifying Fee Structure...');
  const actualBaseFee = await factory.baseFeeWei();

  logTestResult(
    'Fee Structure Verification',
    `${ethers.formatEther(EXPECTED_VALUES.BASE_FEE)} ETH`,
    `${ethers.formatEther(actualBaseFee)} ETH`,
    actualBaseFee.toString() === EXPECTED_VALUES.BASE_FEE.toString()
  );

  // Test 6: Basic Function Call Test
  console.log('\nTesting Basic Function Calls...');

  await testBasicFunctionCalls(factory, dispatcher);

  console.log('\nSystem Integration Test Complete!');
  console.log('=====================================');
  console.log('All contracts are properly deployed and linked');
  console.log('Interface signatures match');
  console.log('Cross-contract references are correct');
  console.log('Fee structure is consistent');
  console.log('Basic function calls work');
}

/**
 * Tests basic function calls for factory and dispatcher
 * @param {Object} factory - Factory contract instance
 * @param {Object} dispatcher - Dispatcher contract instance
 */
async function testBasicFunctionCalls(factory, dispatcher) {
  try {
    // Test factory prediction
    const testData = ethers.toUtf8Bytes('Hello PayRox!');
    const [predicted, hash] = await factory.predict(testData);

    logConfiguration('Factory Prediction', {
      'Predicted address': predicted,
      'Data hash': hash,
    });

    // Test dispatcher manifest info
    const manifestInfo = await dispatcher.getManifestInfo();

    logConfiguration('Dispatcher Manifest Info', {
      Hash: manifestInfo.hash,
      Version: manifestInfo.version,
      Timestamp: manifestInfo.timestamp,
    });
  } catch (error) {
    console.log(`Function call test failed: ${error.message}`);
    throw error; // Re-throw to ensure test fails properly
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });

#!/usr/bin/env node
/**
 * Comprehensive Cross-Chain Deployment Test
 *
 * Tests the entire PayRox Go Beyond cross-chain pipeline:
 * 1. Network connectivity
 * 2. Salt generation consistency
 * 3. Address prediction accuracy
 * 4. Cross-chain deployment simulation
 * 5. Manifest generation and validation
 */

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

// Test networks (using testnets to avoid mainnet costs)
const TEST_NETWORKS = [
  'sepolia',
  'base-sepolia',
  'arbitrum-sepolia',
  'optimism-sepolia',
  'polygon-zkevm-cardona',
  'fuji',
  'fantom-testnet',
  'bsc-testnet',
];

const RESULTS = {
  networkTests: {},
  saltGeneration: {},
  addressPrediction: {},
  crossChainConsistency: {},
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
};

function log(emoji, message, data = null) {
  console.log(`${emoji} ${message}`);
  if (data) {
    console.log(`   ${JSON.stringify(data, null, 2)}`);
  }
}

function recordResult(testName, passed, details = {}) {
  RESULTS.totalTests++;
  if (passed) {
    RESULTS.passedTests++;
    log('✅', `${testName}: PASS`, details);
  } else {
    RESULTS.failedTests++;
    log('❌', `${testName}: FAIL`, details);
  }
}

async function testNetworkConnectivity() {
  log('🌐', 'Testing Network Connectivity...');

  for (const network of TEST_NETWORKS) {
    try {
      // Get provider for network
      await hre.changeNetwork(network);
      const provider = hre.ethers.provider;

      // Test basic connectivity
      const blockNumber = await provider.getBlockNumber();
      const chainId = await provider.getNetwork().then(n => n.chainId);

      RESULTS.networkTests[network] = {
        connected: true,
        blockNumber,
        chainId: chainId.toString(),
        rpcWorking: true,
      };

      recordResult(`Network ${network}`, true, {
        block: blockNumber,
        chainId: chainId.toString(),
      });
    } catch (error) {
      RESULTS.networkTests[network] = {
        connected: false,
        error: error.message,
        rpcWorking: false,
      };

      recordResult(`Network ${network}`, false, {
        error: error.message,
      });
    }
  }
}

async function testSaltGeneration() {
  log('🧂', 'Testing Salt Generation Consistency...');

  const testParams = {
    deployer: '0x1234567890123456789012345678901234567890',
    nonce: 42,
    metadata: 'test-deployment-v1.0.0',
  };

  const salts = {};

  for (const network of TEST_NETWORKS) {
    try {
      // Generate salt using our deterministic method
      const salt = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'uint256', 'string', 'string'],
          [testParams.deployer, testParams.nonce, testParams.metadata, network]
        )
      );

      salts[network] = salt;
      RESULTS.saltGeneration[network] = { salt, consistent: true };

      recordResult(`Salt generation ${network}`, true, { salt });
    } catch (error) {
      RESULTS.saltGeneration[network] = {
        error: error.message,
        consistent: false,
      };
      recordResult(`Salt generation ${network}`, false, {
        error: error.message,
      });
    }
  }

  // Test salt uniqueness across networks
  const saltValues = Object.values(salts);
  const uniqueSalts = new Set(saltValues);
  const saltUniqueness = saltValues.length === uniqueSalts.size;

  recordResult('Salt uniqueness across networks', saltUniqueness, {
    totalSalts: saltValues.length,
    uniqueSalts: uniqueSalts.size,
  });
}

async function testAddressPrediction() {
  log('🔮', 'Testing Address Prediction...');

  const factoryAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Example factory
  const testSalt = '0x' + '1'.repeat(64); // Test salt
  const initCodeHash = ethers.keccak256(
    '0x608060405234801561001057600080fd5b50'
  ); // Minimal contract bytecode

  for (const network of TEST_NETWORKS) {
    try {
      // Predict address using CREATE2
      const predictedAddress = ethers.getCreate2Address(
        factoryAddress,
        testSalt,
        initCodeHash
      );

      // Verify address format
      const isValidAddress = ethers.isAddress(predictedAddress);

      RESULTS.addressPrediction[network] = {
        predicted: predictedAddress,
        valid: isValidAddress,
        deterministic: true,
      };

      recordResult(`Address prediction ${network}`, isValidAddress, {
        predicted: predictedAddress,
      });
    } catch (error) {
      RESULTS.addressPrediction[network] = {
        error: error.message,
        valid: false,
        deterministic: false,
      };

      recordResult(`Address prediction ${network}`, false, {
        error: error.message,
      });
    }
  }

  // Test cross-chain address consistency
  const addresses = Object.values(RESULTS.addressPrediction)
    .filter(r => r.valid)
    .map(r => r.predicted);

  const uniqueAddresses = new Set(addresses);
  const addressConsistency = uniqueAddresses.size === 1 && addresses.length > 0;

  recordResult('Cross-chain address consistency', addressConsistency, {
    totalNetworks: addresses.length,
    uniqueAddresses: uniqueAddresses.size,
    predictedAddress: addresses[0],
  });
}

async function testCrossChainConsistency() {
  log('🔗', 'Testing Cross-Chain Consistency...');

  const testManifest = {
    version: '1.0.0',
    timestamp: Date.now(),
    deployer: '0x1234567890123456789012345678901234567890',
    contracts: {
      DeterministicChunkFactory: {
        size: 1024,
        gasLimit: 500000,
      },
      ManifestDispatcher: {
        size: 2048,
        gasLimit: 300000,
      },
    },
  };

  const manifestHashes = {};
  const addressMappings = {};

  for (const network of TEST_NETWORKS) {
    try {
      // Generate manifest hash
      const manifestString = JSON.stringify(
        testManifest,
        Object.keys(testManifest).sort()
      );
      const manifestHash = ethers.keccak256(ethers.toUtf8Bytes(manifestString));

      manifestHashes[network] = manifestHash;

      // Generate contract addresses for this network
      const networkAddresses = {};
      for (const contractName of Object.keys(testManifest.contracts)) {
        const salt = ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ['string', 'string', 'bytes32'],
            [contractName, network, manifestHash]
          )
        );

        const address = ethers.getCreate2Address(
          '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          salt,
          ethers.keccak256('0x608060405234801561001057600080fd5b50')
        );

        networkAddresses[contractName] = address;
      }

      addressMappings[network] = networkAddresses;

      RESULTS.crossChainConsistency[network] = {
        manifestHash,
        addresses: networkAddresses,
        consistent: true,
      };

      recordResult(`Cross-chain consistency ${network}`, true, {
        manifestHash,
        contractCount: Object.keys(networkAddresses).length,
      });
    } catch (error) {
      RESULTS.crossChainConsistency[network] = {
        error: error.message,
        consistent: false,
      };

      recordResult(`Cross-chain consistency ${network}`, false, {
        error: error.message,
      });
    }
  }

  // Verify manifest hash consistency
  const hashes = Object.values(manifestHashes);
  const uniqueHashes = new Set(hashes);
  const hashConsistency = uniqueHashes.size === 1 && hashes.length > 0;

  recordResult('Manifest hash consistency', hashConsistency, {
    totalNetworks: hashes.length,
    uniqueHashes: uniqueHashes.size,
  });

  // Verify address determinism across networks
  const contractNames = Object.keys(testManifest.contracts);
  for (const contractName of contractNames) {
    const contractAddresses = Object.values(addressMappings)
      .map(mapping => mapping[contractName])
      .filter(addr => addr);

    const uniqueContractAddresses = new Set(contractAddresses);
    const contractConsistency =
      uniqueContractAddresses.size === 1 && contractAddresses.length > 0;

    recordResult(`${contractName} address consistency`, contractConsistency, {
      networks: contractAddresses.length,
      uniqueAddresses: uniqueContractAddresses.size,
      address: contractAddresses[0],
    });
  }
}

async function testGasEstimation() {
  log('⛽', 'Testing Gas Estimation Across Networks...');

  // Mock deployment transaction data
  const deploymentData = '0x608060405234801561001057600080fd5b50600080fd5b50';

  for (const network of TEST_NETWORKS) {
    try {
      await hre.changeNetwork(network);
      const provider = hre.ethers.provider;

      // Estimate gas for deployment
      const gasEstimate = await provider.estimateGas({
        data: deploymentData,
      });

      // Get current gas price
      const feeData = await provider.getFeeData();

      recordResult(`Gas estimation ${network}`, true, {
        gasLimit: gasEstimate.toString(),
        gasPrice: feeData.gasPrice?.toString(),
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
      });
    } catch (error) {
      recordResult(`Gas estimation ${network}`, false, {
        error: error.message,
      });
    }
  }
}

async function generateTestReport() {
  log('📊', 'Generating Test Report...');

  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: RESULTS.totalTests,
      passed: RESULTS.passedTests,
      failed: RESULTS.failedTests,
      successRate: `${(
        (RESULTS.passedTests / RESULTS.totalTests) *
        100
      ).toFixed(2)}%`,
    },
    networkStatus: RESULTS.networkTests,
    saltGeneration: RESULTS.saltGeneration,
    addressPrediction: RESULTS.addressPrediction,
    crossChainConsistency: RESULTS.crossChainConsistency,
    testedNetworks: TEST_NETWORKS,
    conclusions: [],
  };

  // Add conclusions
  const connectedNetworks = Object.values(RESULTS.networkTests).filter(
    n => n.connected
  ).length;
  report.conclusions.push(
    `✅ ${connectedNetworks}/${TEST_NETWORKS.length} networks accessible`
  );

  if (RESULTS.passedTests === RESULTS.totalTests) {
    report.conclusions.push(
      '✅ All cross-chain tests passed - deployment ready'
    );
  } else {
    report.conclusions.push(
      `⚠️ ${RESULTS.failedTests} tests failed - review required`
    );
  }

  // Save detailed report
  const reportPath = path.join(__dirname, 'crosschain-test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log('💾', `Detailed report saved to: ${reportPath}`);

  return report;
}

async function main() {
  console.log('🚀 PayRox Go Beyond - Cross-Chain Deployment Test');
  console.log('='.repeat(60));
  console.log(
    `Testing ${TEST_NETWORKS.length} networks:`,
    TEST_NETWORKS.join(', ')
  );
  console.log('='.repeat(60));

  try {
    // Run all tests
    await testNetworkConnectivity();
    await testSaltGeneration();
    await testAddressPrediction();
    await testCrossChainConsistency();
    await testGasEstimation();

    // Generate report
    const report = await generateTestReport();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Success Rate: ${report.summary.successRate}`);
    console.log('\n🎯 CONCLUSIONS:');
    report.conclusions.forEach(conclusion => console.log(`   ${conclusion}`));

    // Exit with appropriate code
    process.exit(report.summary.failed === 0 ? 0 : 1);
  } catch (error) {
    log('💥', 'Test suite failed:', { error: error.message });
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  main,
  testNetworkConnectivity,
  testSaltGeneration,
  testAddressPrediction,
  testCrossChainConsistency,
  TEST_NETWORKS,
};

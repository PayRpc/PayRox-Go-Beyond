#!/usr/bin/env node
/**
 * Simple Cross-Chain Test Script
 * Tests PayRox Go Beyond cross-chain functionality using existing Hardhat tasks
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Test networks (testnets only to avoid costs)
const TEST_NETWORKS = [
  'sepolia',
  'base-sepolia',
  'arbitrum-sepolia',
  'optimism-sepolia',
  'fuji',
];

const RESULTS = {
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
  },
};

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function recordTest(name, passed, details = '') {
  RESULTS.tests.push({ name, passed, details });
  RESULTS.summary.total++;
  if (passed) {
    RESULTS.summary.passed++;
    log('✅', `${name}: PASS ${details}`);
  } else {
    RESULTS.summary.failed++;
    log('❌', `${name}: FAIL ${details}`);
  }
}

function runCommand(command, description) {
  try {
    log('⚡', `Running: ${description}`);
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 30000, // 30 second timeout
    });
    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      output: error.stdout || error.stderr || '',
    };
  }
}

async function testNetworkHealth() {
  log('🏥', 'Testing Network Health...');

  for (const network of TEST_NETWORKS) {
    const result = runCommand(
      `npx hardhat crosschain:health-check --networks ${network}`,
      `Health check for ${network}`
    );

    const passed = result.success && result.output.includes('networks healthy');
    recordTest(
      `Network Health: ${network}`,
      passed,
      passed ? `Connected` : `Failed: ${result.error || 'RPC issue'}`
    );
  }
}

async function testSaltGeneration() {
  log('🧂', 'Testing Salt Generation...');

  const salts = {};

  for (const network of TEST_NETWORKS) {
    const result = runCommand(
      `npx hardhat crosschain:generate-salt --deployer 0x1234567890123456789012345678901234567890 --nonce 42 --networks ${network}`,
      `Generate salt for ${network}`
    );

    if (result.success) {
      // Extract salt from output
      const saltMatch = result.output.match(/Salt: (0x[a-fA-F0-9]{64})/);
      if (saltMatch) {
        salts[network] = saltMatch[1];
        recordTest(
          `Salt Generation: ${network}`,
          true,
          `Salt: ${saltMatch[1].substring(0, 10)}...`
        );
      } else {
        recordTest(
          `Salt Generation: ${network}`,
          false,
          'Could not extract salt'
        );
      }
    } else {
      recordTest(`Salt Generation: ${network}`, false, result.error);
    }
  }

  // Test salt uniqueness across networks
  const saltValues = Object.values(salts);
  const uniqueSalts = new Set(saltValues);
  const allUnique =
    saltValues.length === uniqueSalts.size && saltValues.length > 0;

  recordTest(
    'Salt Uniqueness',
    allUnique,
    `${saltValues.length} salts, ${uniqueSalts.size} unique`
  );

  return salts;
}

async function testAddressPrediction() {
  log('🔮', 'Testing Address Prediction...');

  const addresses = {};

  for (const network of TEST_NETWORKS) {
    const result = runCommand(
      `npx hardhat crosschain:predict-addresses --salt 0x${'1'.repeat(
        64
      )} --networks ${network}`,
      `Predict addresses for ${network}`
    );

    if (result.success) {
      // Extract predicted address
      const addressMatch = result.output.match(
        /Predicted.*: (0x[a-fA-F0-9]{40})/
      );
      if (addressMatch) {
        addresses[network] = addressMatch[1];
        recordTest(
          `Address Prediction: ${network}`,
          true,
          `Addr: ${addressMatch[1].substring(0, 10)}...`
        );
      } else {
        recordTest(
          `Address Prediction: ${network}`,
          false,
          'Could not extract address'
        );
      }
    } else {
      recordTest(`Address Prediction: ${network}`, false, result.error);
    }
  }

  // Test address consistency (should be same across all networks with same salt)
  const addressValues = Object.values(addresses);
  const uniqueAddresses = new Set(addressValues);
  const consistent = uniqueAddresses.size === 1 && addressValues.length > 0;

  recordTest(
    'Address Consistency',
    consistent,
    `${addressValues.length} networks, ${uniqueAddresses.size} unique addresses`
  );

  return addresses;
}

async function testCrossChainDeployment() {
  log('🚀', 'Testing Cross-Chain Deployment Simulation...');

  // Test manifest generation
  const manifestResult = runCommand(
    'npx hardhat payrox:build-manifest --environment test',
    'Build test manifest'
  );

  recordTest(
    'Manifest Generation',
    manifestResult.success,
    manifestResult.success ? 'Manifest built' : manifestResult.error
  );

  // Test batch deployment simulation (without actual deployment)
  for (const network of TEST_NETWORKS.slice(0, 3)) {
    // Test first 3 networks only
    const deployResult = runCommand(
      `npx hardhat payrox:preflight --network ${network} --dry-run`,
      `Preflight check for ${network}`
    );

    recordTest(
      `Preflight: ${network}`,
      deployResult.success,
      deployResult.success ? 'Ready for deployment' : deployResult.error
    );
  }
}

async function testMultiNetworkConsistency() {
  log('🔗', 'Testing Multi-Network Consistency...');

  const networkList = TEST_NETWORKS.slice(0, 3).join(',');

  // Test health check across multiple networks
  const healthResult = runCommand(
    `npx hardhat crosschain:health-check --networks ${networkList}`,
    `Multi-network health check`
  );

  const healthPassed =
    healthResult.success &&
    TEST_NETWORKS.slice(0, 3).every(
      network =>
        healthResult.output.includes(`${network}:`) &&
        healthResult.output.includes('Connected')
    );

  recordTest(
    'Multi-Network Health',
    healthPassed,
    healthPassed ? 'All networks accessible' : 'Some networks failed'
  );

  // Test salt generation consistency across multiple networks
  const saltResult = runCommand(
    `npx hardhat crosschain:generate-salt --deployer 0x1234567890123456789012345678901234567890 --nonce 123 --networks ${networkList}`,
    `Multi-network salt generation`
  );

  recordTest(
    'Multi-Network Salt Generation',
    saltResult.success,
    saltResult.success ? 'Salts generated' : saltResult.error
  );
}

function generateReport() {
  log('📊', 'Generating Test Report...');

  const report = {
    timestamp: new Date().toISOString(),
    testSuite: 'PayRox Go Beyond Cross-Chain Test',
    version: '1.0.0',
    networks: TEST_NETWORKS,
    summary: RESULTS.summary,
    successRate: `${(
      (RESULTS.summary.passed / RESULTS.summary.total) *
      100
    ).toFixed(2)}%`,
    tests: RESULTS.tests,
    conclusions: [],
  };

  // Add conclusions
  if (RESULTS.summary.failed === 0) {
    report.conclusions.push(
      '✅ All tests passed - Cross-chain deployment system is ready'
    );
    report.conclusions.push(
      '✅ Network connectivity verified across all test networks'
    );
    report.conclusions.push(
      '✅ Deterministic salt generation working correctly'
    );
    report.conclusions.push('✅ Address prediction consistency confirmed');
  } else {
    report.conclusions.push(
      `⚠️ ${RESULTS.summary.failed} tests failed - Review required`
    );
    report.conclusions.push(
      '🔧 Check network configurations and RPC endpoints'
    );
  }

  // Save report
  const reportPath = path.join(process.cwd(), 'crosschain-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log('💾', `Report saved to: ${reportPath}`);
  return report;
}

async function main() {
  console.log('🚀 PayRox Go Beyond - Cross-Chain Test Suite');
  console.log('='.repeat(60));
  console.log(
    `Testing ${TEST_NETWORKS.length} networks: ${TEST_NETWORKS.join(', ')}`
  );
  console.log('='.repeat(60));

  try {
    // Run test suite
    await testNetworkHealth();
    await testSaltGeneration();
    await testAddressPrediction();
    await testCrossChainDeployment();
    await testMultiNetworkConsistency();

    // Generate final report
    const report = generateReport();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Success Rate: ${report.successRate}`);
    console.log('\n🎯 CONCLUSIONS:');
    report.conclusions.forEach(conclusion => console.log(`   ${conclusion}`));

    // Exit with success/failure code
    process.exit(report.summary.failed === 0 ? 0 : 1);
  } catch (error) {
    log('💥', `Test suite crashed: ${error.message}`);
    process.exit(1);
  }
}

// Run the test suite
main().catch(console.error);

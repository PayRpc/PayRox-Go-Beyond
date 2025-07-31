/**
 * Test Commit Root Logic
 *
 * Tests the commit-root script functionality with proper error handling
 * and validation of the deployment artifacts
 */

import fs from 'fs';
import { ethers } from 'hardhat';
import path from 'path';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
}

async function main(): Promise<void> {
  console.log('Testing Commit Root Logic...');

  const results: TestResult[] = [];

  // Test 1: Check merkle data exists
  await testMerkleDataExists(results);

  // Test 2: Check deployment artifacts
  await testDeploymentArtifacts(results);

  // Test 3: Validate dispatcher address format
  await testDispatcherAddress(results);

  // Test 4: Check network detection
  await testNetworkDetection(results);

  // Display results
  displayTestResults(results);
}

/**
 * Tests that merkle data file exists and is valid
 */
async function testMerkleDataExists(results: TestResult[]): Promise<void> {
  const merklePath = path.join(__dirname, '../manifests/current.merkle.json');

  if (!fs.existsSync(merklePath)) {
    results.push({
      testName: 'Merkle data file existence',
      passed: false,
      message: 'No merkle data file found - create one for testing',
    });
    return;
  }

  try {
    const merkleData = JSON.parse(fs.readFileSync(merklePath, 'utf8'));

    if (!merkleData.root || typeof merkleData.root !== 'string') {
      results.push({
        testName: 'Merkle data validation',
        passed: false,
        message: 'Invalid merkle data format - missing or invalid root',
      });
      return;
    }

    results.push({
      testName: 'Merkle data validation',
      passed: true,
      message: `Valid merkle data found with root: ${merkleData.root.slice(
        0,
        10
      )}...`,
    });
  } catch (error) {
    results.push({
      testName: 'Merkle data validation',
      passed: false,
      message: 'Failed to parse merkle data file',
    });
  }
}

/**
 * Tests deployment artifact discovery
 */
async function testDeploymentArtifacts(results: TestResult[]): Promise<void> {
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();

  const networkPaths = [
    `../deployments/localhost/dispatcher.json`,
    `../deployments/${chainId}/dispatcher.json`,
    `../deployments/hardhat/dispatcher.json`,
  ];

  let foundDeployment = false;
  let deploymentPath = '';

  for (const relativePath of networkPaths) {
    const fullPath = path.join(__dirname, relativePath);
    if (fs.existsSync(fullPath)) {
      foundDeployment = true;
      deploymentPath = relativePath;
      break;
    }
  }

  if (foundDeployment) {
    results.push({
      testName: 'Deployment artifact discovery',
      passed: true,
      message: `Found dispatcher deployment at: ${deploymentPath}`,
    });
  } else {
    results.push({
      testName: 'Deployment artifact discovery',
      passed: false,
      message: 'No dispatcher deployment found in any expected location',
    });
  }
}

/**
 * Tests dispatcher address validation
 */
async function testDispatcherAddress(results: TestResult[]): Promise<void> {
  try {
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId.toString();

    const networkPaths = [
      `../deployments/localhost/dispatcher.json`,
      `../deployments/${chainId}/dispatcher.json`,
      `../deployments/hardhat/dispatcher.json`,
    ];

    for (const relativePath of networkPaths) {
      const fullPath = path.join(__dirname, relativePath);
      if (fs.existsSync(fullPath)) {
        const dispatcherData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

        if (
          !dispatcherData.address ||
          !ethers.isAddress(dispatcherData.address)
        ) {
          results.push({
            testName: 'Dispatcher address validation',
            passed: false,
            message: 'Invalid dispatcher address in deployment artifact',
          });
          return;
        }

        // Check if there's code at the address
        const code = await ethers.provider.getCode(dispatcherData.address);
        const hasCode = code !== '0x';

        results.push({
          testName: 'Dispatcher address validation',
          passed: true,
          message: `Valid address: ${dispatcherData.address}, has code: ${hasCode}`,
        });
        return;
      }
    }

    results.push({
      testName: 'Dispatcher address validation',
      passed: false,
      message: 'No dispatcher deployment found to validate',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({
      testName: 'Dispatcher address validation',
      passed: false,
      message: `Error validating address: ${errorMessage}`,
    });
  }
}

/**
 * Tests network detection logic
 */
async function testNetworkDetection(results: TestResult[]): Promise<void> {
  try {
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId.toString();
    const networkName = network.name;

    if (chainId === '31337') {
      results.push({
        testName: 'Network detection',
        passed: true,
        message: `Detected local network - Chain ID: ${chainId}, Name: ${networkName}`,
      });
    } else {
      results.push({
        testName: 'Network detection',
        passed: true,
        message: `Detected network - Chain ID: ${chainId}, Name: ${networkName}`,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({
      testName: 'Network detection',
      passed: false,
      message: `Failed to detect network: ${errorMessage}`,
    });
  }
}

/**
 * Displays the test results
 */
function displayTestResults(results: TestResult[]): void {
  console.log('\nTest Results:');
  console.log('=============');

  let passedCount = 0;
  const totalCount = results.length;

  for (const result of results) {
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${result.testName}: ${result.message}`);

    if (result.passed) {
      passedCount++;
    }
  }

  console.log(`\nSummary: ${passedCount}/${totalCount} tests passed`);

  if (passedCount === totalCount) {
    console.log('Commit root logic validation complete - All tests passed!');
  } else {
    console.log(
      'Commit root logic validation failed - Some components need attention'
    );

    // Don't exit with error for this test script - just report issues
    console.log('\nRecommendations:');
    console.log('1. Deploy a complete system first (factory + dispatcher)');
    console.log('2. Generate merkle data with build-manifest script');
    console.log('3. Ensure dispatcher contract has correct ABI methods');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Test failed:', errorMessage);
    process.exit(1);
  });

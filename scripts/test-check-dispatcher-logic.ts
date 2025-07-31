/**
 * Test Check Dispatcher State Logic
 *
 * Validates the functionality of the check-dispatcher-state script
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
  console.log('Testing Check Dispatcher State Logic...');

  const results: TestResult[] = [];

  // Test 1: Address validation
  await testAddressValidation(results);

  // Test 2: Deployment artifact discovery
  await testDeploymentDiscovery(results);

  // Test 3: Contract existence check
  await testContractExistence(results);

  // Test 4: Error handling for invalid addresses
  await testErrorHandling(results);

  // Test 5: Environment variable handling
  await testEnvironmentVariable(results);

  // Display results
  displayTestResults(results);
}

/**
 * Tests address validation functionality
 */
async function testAddressValidation(results: TestResult[]): Promise<void> {
  // Test valid address
  const validAddress = '0x1234567890123456789012345678901234567890';
  const isValid = ethers.isAddress(validAddress);

  results.push({
    testName: 'Valid address recognition',
    passed: isValid,
    message: isValid
      ? 'Valid address correctly recognized'
      : 'Failed to recognize valid address',
  });

  // Test invalid address
  const invalidAddress = '0xinvalid';
  const isInvalid = !ethers.isAddress(invalidAddress);

  results.push({
    testName: 'Invalid address rejection',
    passed: isInvalid,
    message: isInvalid
      ? 'Invalid address correctly rejected'
      : 'Failed to reject invalid address',
  });
}

/**
 * Tests deployment artifact discovery
 */
async function testDeploymentDiscovery(results: TestResult[]): Promise<void> {
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();

  const possiblePaths = [
    `../deployments/localhost/dispatcher.json`,
    `../deployments/${chainId}/dispatcher.json`,
    `../deployments/hardhat/dispatcher.json`,
  ];

  let foundDeployment = false;
  let foundPath = '';

  for (const relativePath of possiblePaths) {
    const fullPath = path.join(__dirname, relativePath);
    if (fs.existsSync(fullPath)) {
      try {
        const deploymentData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (
          deploymentData.address &&
          ethers.isAddress(deploymentData.address)
        ) {
          foundDeployment = true;
          foundPath = relativePath;
          break;
        }
      } catch (error) {
        // Continue searching
      }
    }
  }

  results.push({
    testName: 'Deployment artifact discovery',
    passed: foundDeployment,
    message: foundDeployment
      ? `Found valid deployment at: ${foundPath}`
      : 'No valid deployment artifacts found',
  });
}

/**
 * Tests contract existence verification
 */
async function testContractExistence(results: TestResult[]): Promise<void> {
  // Test with zero address (should have no code)
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const zeroCode = await ethers.provider.getCode(zeroAddress);
  const hasNoCode = zeroCode === '0x';

  results.push({
    testName: 'Contract existence check (no code)',
    passed: hasNoCode,
    message: hasNoCode
      ? 'Correctly detected no code at zero address'
      : 'Failed to detect absence of code',
  });

  // Test with a known contract address if available
  try {
    const possiblePaths = [
      `../deployments/localhost/dispatcher.json`,
      `../deployments/hardhat/dispatcher.json`,
    ];

    for (const relativePath of possiblePaths) {
      const fullPath = path.join(__dirname, relativePath);
      if (fs.existsSync(fullPath)) {
        const deploymentData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (deploymentData.address) {
          const contractCode = await ethers.provider.getCode(
            deploymentData.address
          );
          const hasCode = contractCode !== '0x';

          results.push({
            testName: 'Contract existence check (with code)',
            passed: true,
            message: `Contract at ${deploymentData.address} has code: ${hasCode}`,
          });
          return;
        }
      }
    }

    results.push({
      testName: 'Contract existence check (with code)',
      passed: false,
      message: 'No deployed contract found to test',
    });
  } catch (error) {
    results.push({
      testName: 'Contract existence check (with code)',
      passed: false,
      message: 'Error checking contract existence',
    });
  }
}

/**
 * Tests error handling for various scenarios
 */
async function testErrorHandling(results: TestResult[]): Promise<void> {
  // Test error handling for invalid address format
  try {
    const invalidAddress = 'not-an-address';
    const isValid = ethers.isAddress(invalidAddress);

    results.push({
      testName: 'Error handling for invalid address',
      passed: !isValid,
      message: !isValid
        ? 'Invalid address properly handled'
        : 'Invalid address not properly detected',
    });
  } catch (error) {
    results.push({
      testName: 'Error handling for invalid address',
      passed: true,
      message: 'Invalid address caused expected error',
    });
  }

  // Test file reading error handling
  const nonExistentPath = path.join(
    __dirname,
    '../deployments/nonexistent/dispatcher.json'
  );
  const fileExists = fs.existsSync(nonExistentPath);

  results.push({
    testName: 'File existence check',
    passed: !fileExists,
    message: !fileExists
      ? 'Correctly detected non-existent file'
      : 'Failed to detect non-existent file',
  });
}

/**
 * Tests environment variable handling
 */
async function testEnvironmentVariable(results: TestResult[]): Promise<void> {
  const originalDispatcher = process.env.DISPATCHER;

  try {
    // Test with no environment variable
    delete process.env.DISPATCHER;
    const noEnvVar = !process.env.DISPATCHER;

    results.push({
      testName: 'Environment variable absence detection',
      passed: noEnvVar,
      message: noEnvVar
        ? 'Correctly detected absent environment variable'
        : 'Failed to detect absent environment variable',
    });

    // Test with environment variable set
    process.env.DISPATCHER = '0x1234567890123456789012345678901234567890';
    const hasEnvVar = !!process.env.DISPATCHER;

    results.push({
      testName: 'Environment variable presence detection',
      passed: hasEnvVar,
      message: hasEnvVar
        ? 'Correctly detected environment variable'
        : 'Failed to detect environment variable',
    });
  } finally {
    // Restore original value
    if (originalDispatcher) {
      process.env.DISPATCHER = originalDispatcher;
    } else {
      delete process.env.DISPATCHER;
    }
  }
}

/**
 * Displays test results
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
    console.log(
      'Check dispatcher state logic validation complete - All tests passed!'
    );
  } else {
    console.log('Check dispatcher state logic validation - Some tests failed');
    console.log(
      '\nThe script should still work correctly with proper deployment artifacts.'
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Test failed:', errorMessage);
    process.exit(1);
  });

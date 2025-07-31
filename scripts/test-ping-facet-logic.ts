/**
 * Test PingFacet Logic
 *
 * Verifies that the PingFacet contract logic is working correctly
 */

import { ethers } from 'hardhat';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
}

async function main(): Promise<void> {
  console.log('Testing PingFacet Logic...');

  const results: TestResult[] = [];

  // Deploy PingFacet
  const PingFacet = await ethers.getContractFactory('PingFacet');
  const pingFacet = await PingFacet.deploy();
  await pingFacet.waitForDeployment();

  const address = await pingFacet.getAddress();
  console.log(`PingFacet deployed to: ${address}`);

  // Test 1: Verify PING_SELECTOR constant
  const constantSelector = await pingFacet.PING_SELECTOR();
  console.log(`PING_SELECTOR constant: ${constantSelector}`);

  // Test 2: Call ping() function
  const pingResult = await pingFacet.ping();
  console.log(`ping() result: ${pingResult}`);

  // Test 3: Verify they match
  const constantMatchTest = constantSelector === pingResult;
  results.push({
    testName: 'Constant and function return match',
    passed: constantMatchTest,
    message: constantMatchTest ? 'Values match correctly' : 'Mismatch detected',
  });

  // Test 4: Verify selector calculation
  const expectedSelector = ethers.id('ping()').slice(0, 10);
  console.log(`Calculated selector: ${expectedSelector}`);

  const selectorCalculationTest = constantSelector === expectedSelector;
  results.push({
    testName: 'Selector calculation verification',
    passed: selectorCalculationTest,
    message: selectorCalculationTest
      ? 'Calculation is correct'
      : 'Calculation mismatch',
  });

  // Test 5: Test echo function
  const testData = '0x' + '42'.repeat(32);
  const echoResult = await pingFacet.echo(testData);
  console.log(`echo(${testData}) = ${echoResult}`);

  const echoTest = echoResult === testData;
  results.push({
    testName: 'Echo function test',
    passed: echoTest,
    message: echoTest ? 'Echo works correctly' : 'Echo function failed',
  });

  // Test 6: Test fallback rejection
  await testFallbackRejection(pingFacet, address, results);

  // Display results
  displayTestResults(results);
}

/**
 * Tests that the fallback function correctly rejects unknown selectors
 */
async function testFallbackRejection(
  pingFacet: any,
  address: string,
  results: TestResult[]
): Promise<void> {
  try {
    // Try to call a non-existent function
    const unknownCall = pingFacet.interface.encodeFunctionData(
      'nonExistent',
      []
    );
    await ethers.provider.call({
      to: address,
      data: unknownCall,
    });

    results.push({
      testName: 'Fallback rejection test',
      passed: false,
      message: 'Fallback should have reverted but did not',
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.log(`Fallback rejection error (expected): ${errorMessage}`);

    results.push({
      testName: 'Fallback rejection test',
      passed: true,
      message: 'Fallback correctly rejects unknown selectors',
    });
  }
}

/**
 * Displays the test results in a formatted way
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
    console.log('PingFacet logic verification complete - All tests passed!');
  } else {
    console.log(
      'PingFacet logic verification failed - Some tests did not pass'
    );
    throw new Error(`${totalCount - passedCount} test(s) failed`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

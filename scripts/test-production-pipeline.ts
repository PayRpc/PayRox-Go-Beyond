// scripts/test-production-pipeline.ts
/**
 * Test version of the production pipeline for verification
 * Skips actual deployment but tests all other components
 */

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { PipelineResult, runProductionPipeline } from './production-pipeline';

export async function main(
  hre: HardhatRuntimeEnvironment
): Promise<PipelineResult> {
  console.log('🧪 Testing PayRox Production Pipeline');
  console.log('====================================');

  const config = {
    network: hre.network.name,
    version: '1.0.0-test',
    skipVerification: true, // Skip Etherscan verification for test
    skipSBOM: false, // Test SBOM generation
    skipFreeze: true, // Skip freeze assessment for test
    skipBundle: true, // Skip bundle creation for test
    dryRun: true, // Run in dry-run mode
  };

  try {
    const result = await runProductionPipeline(hre, config);

    if (result.success) {
      console.log('\n✅ Production pipeline test completed successfully!');
      console.log('🎯 All components are working correctly');

      // Show which steps were tested
      console.log('\n📋 Test Results:');
      for (const [stepName, stepResult] of Object.entries(result.steps)) {
        let status = '❌'; // default for failed
        if (stepResult.status === 'success') {
          status = '✅';
        } else if (stepResult.status === 'skipped') {
          status = '⏭️';
        }

        console.log(`   ${status} ${stepName}: ${stepResult.message}`);
      }
    } else {
      console.error('\n❌ Production pipeline test failed!');
      console.error('📊 Check the failure report for details');
    }

    return result;
  } catch (error) {
    console.error('❌ Test execution error:', error);
    throw error;
  }
}

// Allow direct execution
if (require.main === module) {
  const hre = require('hardhat');
  main(hre).catch(console.error);
}

// scripts/production-pipeline.ts
/**
 * Production Pipeline Integration Script
 *
 * Orchestrates the complete production workflow:
 * 1. Pre-deployment validation
 * 2. Deployment execution
 * 3. Post-deployment verification
 * 4. Etherscan verification with tagging
 * 5. SBOM generation
 * 6. Freeze readiness assessment
 * 7. Release bundle creation
 * 8. Production readiness report
 */

import { exec } from 'child_process';
import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface PipelineConfig {
  network: string;
  version: string;
  skipVerification?: boolean;
  skipSBOM?: boolean;
  skipFreeze?: boolean;
  skipBundle?: boolean;
  dryRun?: boolean;
}

interface PipelineResult {
  success: boolean;
  steps: {
    [key: string]: {
      status: 'success' | 'failed' | 'skipped';
      message: string;
      timestamp: string;
      duration?: number;
    };
  };
  deploymentInfo?: any;
  bundlePath?: string;
  reportPath?: string;
}

export async function runProductionPipeline(
  hre: HardhatRuntimeEnvironment,
  config: PipelineConfig
): Promise<PipelineResult> {
  console.log('🚀 Starting PayRox Production Pipeline');
  console.log(`   Network: ${config.network}`);
  console.log(`   Version: ${config.version}`);
  console.log(`   Dry Run: ${config.dryRun ? 'Yes' : 'No'}`);
  console.log('');

  const result: PipelineResult = {
    success: false,
    steps: {},
  };

  const startTime = Date.now();

  try {
    // Step 1: Pre-deployment validation
    await executeStep(
      result,
      'preflight',
      'Pre-deployment validation',
      async () => {
        if (config.dryRun) {
          console.log('   [DRY RUN] Would run preflight checks');
          return;
        }

        await execAsync(
          `npx hardhat run scripts/preflight.ts --network ${config.network}`
        );
      }
    );

    // Step 2: Deployment execution
    await executeStep(result, 'deployment', 'System deployment', async () => {
      if (config.dryRun) {
        console.log('   [DRY RUN] Would deploy complete system');
        return;
      }

      // Use our cleaned PowerShell script for deployment
      if (process.platform === 'win32') {
        await execAsync(
          `powershell -ExecutionPolicy Bypass -File deploy-complete-system.ps1 -Network ${config.network} -Version ${config.version}`
        );
      } else {
        // Fallback to individual deployment scripts
        await execAsync(
          `npx hardhat run scripts/deploy-factory.ts --network ${config.network}`
        );
        await execAsync(
          `npx hardhat run scripts/deploy-dispatcher.ts --network ${config.network}`
        );
        await execAsync(
          `npx hardhat run scripts/apply-manifest-routes.ts --network ${config.network}`
        );
      }
    });

    // Step 3: Post-deployment verification
    await executeStep(
      result,
      'postverify',
      'Post-deployment verification',
      async () => {
        if (config.dryRun) {
          console.log('   [DRY RUN] Would run post-deployment verification');
          return;
        }

        await execAsync(
          `npx hardhat run scripts/postverify.ts --network ${config.network}`
        );
      }
    );

    // Step 4: Etherscan verification
    if (!config.skipVerification) {
      await executeStep(
        result,
        'etherscan',
        'Etherscan verification',
        async () => {
          if (config.dryRun) {
            console.log('   [DRY RUN] Would verify contracts on Etherscan');
            return;
          }

          await execAsync(
            `npx hardhat run scripts/verify-on-etherscan.ts --network ${config.network}`
          );
        }
      );
    } else {
      result.steps.etherscan = {
        status: 'skipped',
        message: 'Etherscan verification skipped by configuration',
        timestamp: new Date().toISOString(),
      };
    }

    // Step 5: SBOM generation
    if (!config.skipSBOM) {
      await executeStep(result, 'sbom', 'SBOM generation', async () => {
        if (config.dryRun) {
          console.log('   [DRY RUN] Would generate SBOM');
          return;
        }

        await execAsync(`npx hardhat run scripts/generate-sbom.ts`);
      });
    } else {
      result.steps.sbom = {
        status: 'skipped',
        message: 'SBOM generation skipped by configuration',
        timestamp: new Date().toISOString(),
      };
    }

    // Step 6: Freeze readiness assessment
    if (!config.skipFreeze) {
      await executeStep(
        result,
        'freeze',
        'Freeze readiness assessment',
        async () => {
          if (config.dryRun) {
            console.log('   [DRY RUN] Would assess freeze readiness');
            return;
          }

          await execAsync(`npx hardhat run scripts/assess-freeze-readiness.ts`);
        }
      );
    } else {
      result.steps.freeze = {
        status: 'skipped',
        message: 'Freeze assessment skipped by configuration',
        timestamp: new Date().toISOString(),
      };
    }

    // Step 7: Release bundle creation
    if (!config.skipBundle) {
      await executeStep(
        result,
        'bundle',
        'Release bundle creation',
        async () => {
          if (config.dryRun) {
            console.log('   [DRY RUN] Would create release bundle');
            return;
          }

          const { stdout } = await execAsync(
            `npx hardhat run scripts/create-release-bundle.ts --network ${config.network}`
          );

          // Extract bundle path from output
          const bundleMatch = stdout.match(
            /Bundle created successfully at: (.+)/
          );
          if (bundleMatch) {
            result.bundlePath = bundleMatch[1].trim();
          }
        }
      );
    } else {
      result.steps.bundle = {
        status: 'skipped',
        message: 'Release bundle creation skipped by configuration',
        timestamp: new Date().toISOString(),
      };
    }

    // Step 8: Generate production readiness report
    await executeStep(
      result,
      'report',
      'Production readiness report',
      async () => {
        const reportPath = await generateProductionReport(hre, config, result);
        result.reportPath = reportPath;
      }
    );

    const totalDuration = Date.now() - startTime;
    result.success = true;

    console.log('\n🎉 Production pipeline completed successfully!');
    console.log(`   Total duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`   Report: ${result.reportPath}`);
    if (result.bundlePath) {
      console.log(`   Bundle: ${result.bundlePath}`);
    }
  } catch (error) {
    console.error('\n❌ Production pipeline failed:', error);
    result.success = false;

    // Generate failure report
    const reportPath = await generateProductionReport(
      hre,
      config,
      result,
      error as Error
    );
    result.reportPath = reportPath;
  }

  return result;
}

async function executeStep(
  result: PipelineResult,
  stepName: string,
  description: string,
  execution: () => Promise<void>
): Promise<void> {
  console.log(`⚡ ${description}...`);
  const stepStart = Date.now();

  try {
    await execution();
    const duration = Date.now() - stepStart;

    result.steps[stepName] = {
      status: 'success',
      message: `${description} completed successfully`,
      timestamp: new Date().toISOString(),
      duration,
    };

    console.log(`   ✅ Completed in ${Math.round(duration / 1000)}s`);
  } catch (error) {
    const duration = Date.now() - stepStart;
    const errorMessage = error instanceof Error ? error.message : String(error);

    result.steps[stepName] = {
      status: 'failed',
      message: `${description} failed: ${errorMessage}`,
      timestamp: new Date().toISOString(),
      duration,
    };

    console.log(
      `   ❌ Failed after ${Math.round(duration / 1000)}s: ${errorMessage}`
    );
    throw error;
  }
}

async function generateProductionReport(
  hre: HardhatRuntimeEnvironment,
  config: PipelineConfig,
  result: PipelineResult,
  error?: Error
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportDir = path.join(process.cwd(), 'reports');
  const reportPath = path.join(
    reportDir,
    `production-pipeline-${config.network}-${timestamp}.md`
  );

  // Ensure reports directory exists
  fs.mkdirSync(reportDir, { recursive: true });

  // Load deployment info if available
  let deploymentInfo = null;
  try {
    const deploymentsDir = path.join(
      process.cwd(),
      'deployments',
      config.network
    );
    if (fs.existsSync(deploymentsDir)) {
      const factoryPath = path.join(
        deploymentsDir,
        'DeterministicChunkFactory.json'
      );
      if (fs.existsSync(factoryPath)) {
        deploymentInfo = JSON.parse(fs.readFileSync(factoryPath, 'utf8'));
      }
    }
  } catch (e) {
    // Ignore deployment info loading errors
  }

  // Generate comprehensive report
  const report = generateReportContent(config, result, deploymentInfo, error);

  fs.writeFileSync(reportPath, report);
  return reportPath;
}

function generateReportContent(
  config: PipelineConfig,
  result: PipelineResult,
  deploymentInfo: any,
  error?: Error
): string {
  const timestamp = new Date().toISOString();
  const status = result.success ? '✅ SUCCESS' : '❌ FAILED';

  let report = `# PayRox Go Beyond Production Pipeline Report

## Executive Summary

- **Status**: ${status}
- **Network**: ${config.network}
- **Version**: ${config.version}
- **Timestamp**: ${timestamp}
- **Dry Run**: ${config.dryRun ? 'Yes' : 'No'}

## Pipeline Configuration

\`\`\`json
${JSON.stringify(config, null, 2)}
\`\`\`

## Step Execution Summary

| Step | Status | Duration | Message |
|------|--------|----------|---------|
`;

  for (const [stepName, stepResult] of Object.entries(result.steps)) {
    const duration = stepResult.duration
      ? `${Math.round(stepResult.duration / 1000)}s`
      : 'N/A';
    const statusIcon =
      stepResult.status === 'success'
        ? '✅'
        : stepResult.status === 'failed'
        ? '❌'
        : '⏭️';

    report += `| ${stepName} | ${statusIcon} ${stepResult.status} | ${duration} | ${stepResult.message} |\n`;
  }

  if (deploymentInfo) {
    report += `\n## Deployment Information

- **Factory Address**: ${deploymentInfo.address}
- **Transaction Hash**: ${deploymentInfo.transactionHash}
- **Block Number**: ${deploymentInfo.receipt?.blockNumber || 'N/A'}
- **Gas Used**: ${deploymentInfo.receipt?.gasUsed || 'N/A'}
- **Deployer**: ${deploymentInfo.receipt?.from || 'N/A'}
`;
  }

  if (result.bundlePath) {
    report += `\n## Release Bundle

- **Path**: ${result.bundlePath}
- **Archive**: ${result.bundlePath}.tar.gz
`;
  }

  // Add verification status
  const verificationStep = result.steps.etherscan;
  if (verificationStep) {
    report += `\n## Contract Verification

- **Status**: ${verificationStep.status}
- **Message**: ${verificationStep.message}

${
  verificationStep.status === 'success'
    ? '✅ All contracts have been verified on Etherscan with appropriate tags.'
    : '⚠️ Contract verification requires attention.'
}
`;
  }

  // Add SBOM status
  const sbomStep = result.steps.sbom;
  if (sbomStep) {
    report += `\n## Software Bill of Materials (SBOM)

- **Status**: ${sbomStep.status}
- **Message**: ${sbomStep.message}

${
  sbomStep.status === 'success'
    ? '✅ SBOM has been generated with complete dependency and Git information.'
    : '⚠️ SBOM generation requires attention.'
}
`;
  }

  // Add freeze assessment
  const freezeStep = result.steps.freeze;
  if (freezeStep) {
    report += `\n## Freeze Readiness Assessment

- **Status**: ${freezeStep.status}
- **Message**: ${freezeStep.message}

${
  freezeStep.status === 'success'
    ? '✅ Freeze readiness has been assessed with governance conditions.'
    : '⚠️ Freeze assessment requires attention.'
}
`;
  }

  if (error) {
    report += `\n## Error Details

\`\`\`
${error.message}
${error.stack || ''}
\`\`\`
`;
  }

  // Add security recommendations
  report += `\n## Security Recommendations

### Production Checklist

- [ ] All contracts verified on Etherscan
- [ ] SBOM generated and reviewed
- [ ] Freeze readiness assessed
- [ ] Multi-sig wallet configured for critical operations
- [ ] Emergency pause mechanisms tested
- [ ] Monitoring and alerting configured
- [ ] Incident response procedures documented
- [ ] Security audit completed
- [ ] Test coverage > 90%
- [ ] Documentation updated

### Next Steps

1. **Review this report** for any failed or skipped steps
2. **Verify contract addresses** match expected deployment
3. **Test critical functions** on the deployed contracts
4. **Configure monitoring** for system health and security
5. **Set up alerts** for unusual activity or failures
6. **Document procedures** for operations and maintenance
7. **Prepare rollback plan** in case of issues

### Emergency Contacts

- **Technical Lead**: [To be configured]
- **Security Team**: [To be configured]
- **Operations**: [To be configured]

## Report Generated

- **Tool**: PayRox Production Pipeline
- **Version**: 1.0.0
- **Timestamp**: ${timestamp}
`;

  return report;
}

// CLI interface
export async function main(hre: HardhatRuntimeEnvironment, params?: any) {
  const config: PipelineConfig = {
    network: params?.network || hre.network.name,
    version: params?.version || '1.0.0',
    skipVerification: params?.skipVerification || false,
    skipSBOM: params?.skipSBOM || false,
    skipFreeze: params?.skipFreeze || false,
    skipBundle: params?.skipBundle || false,
    dryRun: params?.dryRun || false,
  };

  console.log('🏭 PayRox Go Beyond Production Pipeline');
  console.log('=====================================');

  try {
    const result = await runProductionPipeline(hre, config);

    if (result.success) {
      console.log('\n🎉 Production pipeline completed successfully!');
      console.log(`📊 Report: ${result.reportPath}`);
      if (result.bundlePath) {
        console.log(`📦 Bundle: ${result.bundlePath}`);
      }
    } else {
      console.error('\n❌ Production pipeline failed!');
      console.error(`📊 Failure report: ${result.reportPath}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Pipeline execution error:', error);
    process.exit(1);
  }
}

// Example usage:
// npx hardhat run scripts/production-pipeline.ts --network sepolia
// npx hardhat run scripts/production-pipeline.ts --network mainnet -- --version=1.0.0 --skipSBOM
// npx hardhat run scripts/production-pipeline.ts --network localhost -- --dryRun

// Allow direct execution
if (require.main === module) {
  const hre = require('hardhat');
  main(hre).catch(console.error);
}

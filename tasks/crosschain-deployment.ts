/**
 * Cross-Chain Deployment Hardhat Tasks
 *
 * Implements the complete runbook as Hardhat tasks
 */

import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

// Import our orchestration modules
import { main as deployDeterministicFactory } from '../scripts/deploy-deterministic-factory.js';
import { validateManifestPreflight } from '../scripts/manifest-preflight';
import { main as orchestrateDeployment } from '../scripts/orchestrate-crosschain';

/* ═══════════════════════════════════════════════════════════════════════════
   TASK: FULL CROSS-CHAIN DEPLOYMENT ORCHESTRATION
   ═══════════════════════════════════════════════════════════════════════════ */

task(
  'crosschain:deploy-full',
  'Execute complete cross-chain deployment runbook'
)
  .addOptionalParam(
    'networks',
    'Comma-separated list of networks',
    'sepolia,base-sepolia,arbitrum-sepolia'
  )
  .addOptionalParam('manifest', 'Path to manifest JSON file', '')
  .addFlag('dryrun', 'Run validation without actual deployment')
  .addFlag('skipfactory', 'Skip factory deployment')
  .addFlag('skipmanifest', 'Skip manifest validation')
  .addFlag('force', 'Force deployment even if warnings exist')
  .addOptionalParam('governance', 'Custom governance address', '')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    console.log('🎭 PayRox Go Beyond - Full Cross-Chain Deployment');
    console.log('='.repeat(65));

    const networks = taskArgs.networks.split(',').map((n: string) => n.trim());

    const config = {
      networks,
      manifestPath: taskArgs.manifest || undefined,
      skipFactoryDeployment: taskArgs.skipfactory,
      skipManifestValidation: taskArgs.skipmanifest,
      dryRun: taskArgs.dryrun,
      pausedDeployment: true, // Always start paused for safety
      governanceAddress: taskArgs.governance || undefined,
    };

    try {
      const result = await orchestrateDeployment(hre, config);

      if (result.success) {
        console.log('\n🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!');
        console.log(`📍 Factory Address: ${result.factoryAddress}`);
        console.log(`⏱️  Duration: ${result.duration}ms`);

        // Show network-specific results
        console.log('\n📊 NETWORK RESULTS:');
        for (const [network, netResult] of Object.entries(
          result.deploymentResults
        )) {
          const status = netResult.errors.length === 0 ? '✅' : '❌';
          console.log(
            `   ${status} ${network}: Factory(${netResult.factoryDeployed}) Dispatcher(${netResult.dispatcherDeployed}) Manifest(${netResult.manifestValidated})`
          );

          if (netResult.errors.length > 0) {
            netResult.errors.forEach((error: string) => {
              console.log(`      Error: ${error}`);
            });
          }
        }

        return result.factoryAddress;
      } else {
        throw new Error('Deployment failed - see logs for details');
      }
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      throw error;
    }
  });

/* ═══════════════════════════════════════════════════════════════════════════
   TASK: DETERMINISTIC FACTORY DEPLOYMENT
   ═══════════════════════════════════════════════════════════════════════════ */

task(
  'crosschain:deploy-factory',
  'Deploy DeterministicChunkFactory with identical addresses'
)
  .addOptionalParam(
    'networks',
    'Comma-separated list of networks',
    'sepolia,base-sepolia,arbitrum-sepolia'
  )
  .addFlag('validate', 'Only validate address parity without deployment')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    console.log('🏭 Deterministic Factory Deployment');
    console.log('='.repeat(50));

    const networks = taskArgs.networks.split(',').map((n: string) => n.trim());
    console.log(`🌐 Target networks: ${networks.join(', ')}`);

    try {
      if (taskArgs.validate) {
        console.log('🔍 Validation mode - checking address parity only');

        // Import and use the deployer class for validation only
        const { DeterministicFactoryDeployer } = await import(
          '../scripts/deploy-deterministic-factory.js'
        );
        const deployer = new DeterministicFactoryDeployer();

        const parityResult = await deployer.validateFactoryAddressParity(
          networks,
          hre
        );

        if (parityResult.valid) {
          console.log(
            `✅ Factory address parity validated: ${parityResult.expectedAddress}`
          );
          return parityResult.expectedAddress;
        } else {
          throw new Error('Factory address parity validation failed');
        }
      } else {
        const factoryAddress = await deployDeterministicFactory(hre, {
          networks,
        });
        console.log(
          `✅ Factory deployed at identical address: ${factoryAddress}`
        );
        return factoryAddress;
      }
    } catch (error) {
      console.error('❌ Factory deployment failed:', error);
      throw error;
    }
  });

/* ═══════════════════════════════════════════════════════════════════════════
   TASK: MANIFEST PREFLIGHT VALIDATION
   ═══════════════════════════════════════════════════════════════════════════ */

task(
  'crosschain:validate-manifest',
  'Run manifest preflight validation across networks'
)
  .addParam('manifest', 'Path to manifest JSON file')
  .addOptionalParam(
    'networks',
    'Comma-separated list of networks',
    'sepolia,base-sepolia,arbitrum-sepolia'
  )
  .addOptionalParam('output', 'Output path for validation report', '')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    console.log('📋 Manifest Preflight Validation');
    console.log('='.repeat(45));

    const networks = taskArgs.networks.split(',').map((n: string) => n.trim());
    const manifestPath = taskArgs.manifest;
    const outputPath = taskArgs.output || undefined;

    console.log(`📄 Manifest: ${manifestPath}`);
    console.log(`🌐 Networks: ${networks.join(', ')}`);

    try {
      const isValid = await validateManifestPreflight(
        manifestPath,
        networks,
        hre,
        outputPath
      );

      if (isValid) {
        console.log('✅ Manifest preflight validation PASSED');
        console.log('🚀 Ready for cross-chain deployment');
        return true;
      } else {
        console.log('❌ Manifest preflight validation FAILED');
        console.log(
          '🛠️  Review validation report and fix issues before deployment'
        );
        return false;
      }
    } catch (error) {
      console.error('❌ Manifest validation failed:', error);
      throw error;
    }
  });

/* ═══════════════════════════════════════════════════════════════════════════
   TASK: DEPLOYMENT CLEANUP
   ═══════════════════════════════════════════════════════════════════════════ */

task('crosschain:cleanup', 'Clean up deployment artifacts')
  .addOptionalParam('networks', 'Comma-separated list of networks to clean', '')
  .addFlag('reports', 'Also clean up reports directory')
  .addFlag('force', 'Force cleanup without confirmation')
  .setAction(async taskArgs => {
    console.log('🧹 Cross-Chain Deployment Cleanup');
    console.log('='.repeat(40));

    const fs = await import('fs');
    const path = await import('path');

    if (!taskArgs.force) {
      console.log('⚠️  This will delete deployment artifacts');
      console.log('Use --force to proceed without confirmation');
      return;
    }

    const networks = taskArgs.networks
      ? taskArgs.networks.split(',').map((n: string) => n.trim())
      : [];

    try {
      // Clean network-specific deployments
      if (networks.length > 0) {
        for (const network of networks) {
          const deploymentDir = path.join(
            process.cwd(),
            'deployments',
            network
          );
          if (fs.existsSync(deploymentDir)) {
            fs.rmSync(deploymentDir, { recursive: true, force: true });
            console.log(`✅ Cleaned deployments for ${network}`);
          }
        }
      } else {
        // Clean all deployments
        const deploymentsDir = path.join(process.cwd(), 'deployments');
        if (fs.existsSync(deploymentsDir)) {
          fs.rmSync(deploymentsDir, { recursive: true, force: true });
          console.log('✅ Cleaned all deployment artifacts');
        }
      }

      // Clean reports if requested
      if (taskArgs.reports) {
        const reportsDir = path.join(process.cwd(), 'reports');
        if (fs.existsSync(reportsDir)) {
          fs.rmSync(reportsDir, { recursive: true, force: true });
          console.log('✅ Cleaned reports directory');
        }
      }

      console.log('🧹 Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  });

export {};

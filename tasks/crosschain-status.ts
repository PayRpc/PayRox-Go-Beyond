/**
 * Cross-Chain Status Checker
 *
 * Simplified status checking task to avoid complexity issues
 */

import * as fs from 'fs';
import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import * as path from 'path';

/* ═══════════════════════════════════════════════════════════════════════════
   DEPLOYMENT STATUS CHECKER
   ═══════════════════════════════════════════════════════════════════════════ */

async function checkNetworkStatus(
  networkName: string,
  hre: HardhatRuntimeEnvironment,
  detailed: boolean = false
): Promise<{
  factory: { deployed: boolean; address?: string; details?: any };
  dispatcher: { deployed: boolean; address?: string; details?: any };
  errors: string[];
}> {
  const result: {
    factory: { deployed: boolean; address?: string; details?: any };
    dispatcher: { deployed: boolean; address?: string; details?: any };
    errors: string[];
  } = {
    factory: { deployed: false },
    dispatcher: { deployed: false },
    errors: [] as string[],
  };

  try {
    // Load deployment files
    const factoryPath = path.join(
      process.cwd(),
      'deployments',
      networkName,
      'DeterministicChunkFactory.json'
    );
    const dispatcherPath = path.join(
      process.cwd(),
      'deployments',
      networkName,
      'ManifestDispatcher.json'
    );

    // Check factory
    if (fs.existsSync(factoryPath)) {
      const factoryInfo = JSON.parse(fs.readFileSync(factoryPath, 'utf-8'));
      result.factory = { deployed: true, address: factoryInfo.address };

      if (detailed) {
        try {
          const { ethers } = hre;
          const factory = await ethers.getContractAt(
            'DeterministicChunkFactory',
            factoryInfo.address
          );
          const owner = await factory.owner();
          const baseFee = await factory.baseFeeWei();
          const feesEnabled = await factory.feesEnabled();

          result.factory.details = {
            owner,
            baseFee: ethers.formatEther(baseFee),
            feesEnabled,
          };
        } catch (error) {
          result.errors.push(
            `Cannot read factory details: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    }

    // Check dispatcher
    if (fs.existsSync(dispatcherPath)) {
      const dispatcherInfo = JSON.parse(
        fs.readFileSync(dispatcherPath, 'utf-8')
      );
      result.dispatcher = { deployed: true, address: dispatcherInfo.address };

      if (detailed) {
        try {
          const { ethers } = hre;
          const dispatcher = await ethers.getContractAt(
            'ManifestDispatcher',
            dispatcherInfo.address
          );
          const isPaused = await dispatcher.paused();
          const governance = await dispatcher.governance();

          result.dispatcher.details = {
            governance,
            paused: isPaused,
          };
        } catch (error) {
          result.errors.push(
            `Cannot read dispatcher details: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    }
  } catch (error) {
    result.errors.push(
      `Network check failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return result;
}

task('crosschain:status', 'Check deployment status across networks')
  .addOptionalParam(
    'networks',
    'Comma-separated list of networks',
    'sepolia,base-sepolia,arbitrum-sepolia'
  )
  .addFlag('detailed', 'Show detailed contract information')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    console.log('📊 Cross-Chain Deployment Status');
    console.log('='.repeat(45));

    const networks = taskArgs.networks.split(',').map((n: string) => n.trim());

    for (const networkName of networks) {
      console.log(`\n🌐 ${networkName.toUpperCase()}`);
      console.log('-'.repeat(30));

      const status = await checkNetworkStatus(
        networkName,
        hre,
        taskArgs.detailed
      );

      // Factory status
      if (status.factory.deployed) {
        console.log(`✅ Factory: ${status.factory.address}`);
        if (status.factory.details) {
          console.log(`   Owner: ${status.factory.details.owner}`);
          console.log(`   Base Fee: ${status.factory.details.baseFee} ETH`);
          console.log(`   Fees Enabled: ${status.factory.details.feesEnabled}`);
        }
      } else {
        console.log('❌ Factory: Not deployed');
      }

      // Dispatcher status
      if (status.dispatcher.deployed) {
        console.log(`✅ Dispatcher: ${status.dispatcher.address}`);
        if (status.dispatcher.details) {
          console.log(`   Governance: ${status.dispatcher.details.governance}`);
          console.log(`   Paused: ${status.dispatcher.details.paused}`);
        }
      } else {
        console.log('❌ Dispatcher: Not deployed');
      }

      // Show errors
      if (status.errors.length > 0) {
        status.errors.forEach(error => {
          console.log(`⚠️  ${error}`);
        });
      }
    }
  });

export {};

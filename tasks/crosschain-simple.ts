/**
 * Cross-Chain Hardhat Tasks for PayRox Go Beyond
 * Simplified version for better maintainability
 */

import * as fs from 'fs';
import { task, types } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import * as path from 'path';
import {
  CrossChainManifestSync,
  CrossChainNetworkManager,
  CrossChainOrchestrator,
  CrossChainSaltGenerator,
} from '../src/utils/cross-chain';
import { NETWORK_CONFIGS, NetworkConfig } from '../src/utils/network';

/**
 * Helper function to get network configuration by name
 */
function getNetworkConfig(networkName: string): NetworkConfig {
  const baseConfig = NETWORK_CONFIGS[networkName];
  if (!baseConfig) {
    throw new Error(`Network '${networkName}' not found in configuration`);
  }

  return {
    ...baseConfig,
    deploymentPath: `./deployments/${networkName}`,
    artifactsPath: './artifacts/contracts',
    hasDeployments: true,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   CROSS-CHAIN DEPLOYMENT TASKS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Deploy contracts across multiple EVM networks with deterministic addressing
 */
task('crosschain:deploy', 'Deploy contracts across multiple networks')
  .addParam(
    'networks',
    'Comma-separated list of target networks',
    undefined,
    types.string
  )
  .addParam(
    'contracts',
    'Path to contracts configuration file',
    './crosschain-contracts.json',
    types.string
  )
  .addOptionalParam(
    'privateKey',
    'Deployer private key (or use PRIVATE_KEY env var)',
    undefined,
    types.string
  )
  .addFlag('verify', 'Verify address consistency after deployment')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    console.log('🌐 PayRox Cross-Chain Deployment');
    console.log('================================');

    try {
      // Parse and validate inputs
      const targetNetworks = taskArgs.networks
        .split(',')
        .map((n: string) => n.trim());
      const privateKey = taskArgs.privateKey || process.env.PRIVATE_KEY;

      if (!privateKey) {
        throw new Error(
          'Private key required. Use --private-key or set PRIVATE_KEY env var'
        );
      }

      // Load contracts configuration
      const contractsConfigPath = path.resolve(taskArgs.contracts);
      if (!fs.existsSync(contractsConfigPath)) {
        throw new Error(
          `Contracts configuration not found: ${contractsConfigPath}`
        );
      }
      const contractsConfig = JSON.parse(
        fs.readFileSync(contractsConfigPath, 'utf8')
      );

      // Initialize network configurations
      const networkConfigs: NetworkConfig[] = [];
      for (const networkName of targetNetworks) {
        const config = getNetworkConfig(networkName);
        networkConfigs.push(config);
        console.log(`  ✓ ${config.displayName} (Chain ID: ${config.chainId})`);
      }

      // Validate network configurations
      const validation =
        CrossChainNetworkManager.validateNetworkConfig(networkConfigs);
      if (!validation.valid) {
        throw new Error(
          `Network validation failed: ${validation.errors.join(', ')}`
        );
      }

      // Initialize orchestrator and execute deployment
      const orchestrator = new CrossChainOrchestrator(networkConfigs);
      const deployment = await orchestrator.deployAcrossChains(
        targetNetworks,
        contractsConfig.contracts,
        privateKey
      );

      console.log(`\n📊 Deployment Status: ${deployment.status.toUpperCase()}`);
      console.log(`🆔 Deployment ID: ${deployment.deploymentId}`);

      // Save deployment artifacts
      const deploymentDir = path.join(process.cwd(), 'crosschain-deployments');
      if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
      }

      const deploymentFile = path.join(
        deploymentDir,
        `${deployment.deploymentId}.json`
      );
      fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
      console.log(`\n💾 Deployment saved: ${deploymentFile}`);
    } catch (error) {
      console.error('❌ Cross-chain deployment failed:', error);
      throw error;
    }
  });

/**
 * Generate cross-chain salt for deterministic deployment
 */
task(
  'crosschain:generate-salt',
  'Generate universal salt for cross-chain deployment'
)
  .addParam(
    'content',
    'Content hash or contract bytecode',
    undefined,
    types.string
  )
  .addParam('deployer', 'Deployer address', undefined, types.string)
  .addOptionalParam(
    'deployVersion',
    'Deployment version',
    '1.0.0',
    types.string
  )
  .addOptionalParam('nonce', 'Cross-chain nonce', '1', types.string)
  .setAction(async taskArgs => {
    console.log('🧂 Cross-Chain Salt Generation');
    console.log('==============================');

    const config = {
      baseContent: taskArgs.content,
      deployer: taskArgs.deployer,
      version: taskArgs.deployVersion,
      crossChainNonce: parseInt(taskArgs.nonce),
    };

    const universalSalt = CrossChainSaltGenerator.generateUniversalSalt(config);
    console.log(`🔑 Universal Salt: ${universalSalt}`);

    console.log('\n📋 Configuration:');
    console.log(`  Content: ${config.baseContent}`);
    console.log(`  Deployer: ${config.deployer}`);
    console.log(`  Version: ${config.version}`);
    console.log(`  Nonce: ${config.crossChainNonce}`);
  });

/**
 * Predict contract addresses across multiple networks
 */
task(
  'crosschain:predict-addresses',
  'Predict contract addresses across networks'
)
  .addParam(
    'networks',
    'Comma-separated list of networks',
    undefined,
    types.string
  )
  .addParam('salt', 'Deployment salt', undefined, types.string)
  .addParam('bytecode', 'Contract bytecode', undefined, types.string)
  .setAction(async taskArgs => {
    console.log('🔮 Cross-Chain Address Prediction');
    console.log('==================================');

    const targetNetworks = taskArgs.networks
      .split(',')
      .map((n: string) => n.trim());
    const { ethers } = await import('ethers');
    const bytecodeHash = ethers.keccak256(taskArgs.bytecode);

    console.log(`🧂 Salt: ${taskArgs.salt}`);
    console.log(`🏗️  Bytecode Hash: ${bytecodeHash}`);
    console.log('');

    for (const networkName of targetNetworks) {
      try {
        const config = getNetworkConfig(networkName);

        if (config.factoryAddress) {
          const predictedAddress =
            CrossChainSaltGenerator.predictCrossChainAddress(
              config.factoryAddress,
              taskArgs.salt,
              bytecodeHash
            );

          console.log(`📍 ${config.displayName}: ${predictedAddress}`);
        } else {
          console.log(
            `⚠️  ${config.displayName}: No factory address configured`
          );
        }
      } catch (error) {
        console.error(
          `❌ ${networkName}: ${
            error instanceof Error ? error.message : 'Configuration error'
          }`
        );
      }
    }
  });

/* ═══════════════════════════════════════════════════════════════════════════
   MANIFEST SYNCHRONIZATION TASKS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Synchronize manifests across multiple networks
 */
task('crosschain:sync-manifest', 'Synchronize manifest across networks')
  .addParam(
    'deployment',
    'Path to cross-chain deployment file',
    undefined,
    types.string
  )
  .addOptionalParam(
    'privateKey',
    'Deployer private key (or use PRIVATE_KEY env var)',
    undefined,
    types.string
  )
  .setAction(async taskArgs => {
    console.log('🔄 Cross-Chain Manifest Synchronization');
    console.log('=======================================');

    try {
      // Load deployment configuration
      const deploymentPath = path.resolve(taskArgs.deployment);
      if (!fs.existsSync(deploymentPath)) {
        throw new Error(`Deployment file not found: ${deploymentPath}`);
      }

      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      console.log(`📂 Loaded deployment: ${deployment.deploymentId}`);

      // Get deployer private key
      const privateKey = taskArgs.privateKey || process.env.PRIVATE_KEY;
      if (!privateKey) {
        throw new Error(
          'Private key required. Use --private-key or set PRIVATE_KEY env var'
        );
      }

      // Initialize network configurations
      const networkConfigs: NetworkConfig[] = [];
      for (const networkName of deployment.networks) {
        const config = getNetworkConfig(networkName);
        networkConfigs.push(config);
      }

      // Initialize manifest sync service
      const manifestSync = new CrossChainManifestSync(networkConfigs);

      // Create and synchronize manifest
      const manifest = await manifestSync.createCrossChainManifest(
        deployment.networks[0],
        deployment.networks.slice(1),
        deployment
      );

      const syncedManifest = await manifestSync.synchronizeManifest(
        manifest,
        privateKey
      );

      // Save synchronized manifest
      const manifestDir = path.join(process.cwd(), 'crosschain-manifests');
      if (!fs.existsSync(manifestDir)) {
        fs.mkdirSync(manifestDir, { recursive: true });
      }

      const manifestFile = path.join(
        manifestDir,
        `${syncedManifest.crossChainId}.json`
      );
      fs.writeFileSync(manifestFile, JSON.stringify(syncedManifest, null, 2));
      console.log(`\n💾 Manifest saved: ${manifestFile}`);
    } catch (error) {
      console.error('❌ Manifest synchronization failed:', error);
      throw error;
    }
  });

/**
 * Check network health and contract availability
 */
task(
  'crosschain:health-check',
  'Check network health and contract availability'
)
  .addParam(
    'networks',
    'Comma-separated list of networks to check',
    undefined,
    types.string
  )
  .setAction(async taskArgs => {
    console.log('🏥 Cross-Chain Network Health Check');
    console.log('===================================');

    const targetNetworks = taskArgs.networks
      .split(',')
      .map((n: string) => n.trim());
    const networkConfigs = loadNetworkConfigs(targetNetworks);

    if (networkConfigs.length === 0) {
      console.error('❌ No valid network configurations found');
      return;
    }

    await performHealthCheck(networkConfigs);
  });

/**
 * Helper function to load network configurations with error handling
 */
function loadNetworkConfigs(targetNetworks: string[]): NetworkConfig[] {
  const networkConfigs: NetworkConfig[] = [];

  for (const networkName of targetNetworks) {
    try {
      const config = getNetworkConfig(networkName);
      networkConfigs.push(config);
    } catch (error) {
      console.error(
        `❌ Failed to load config for ${networkName}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  return networkConfigs;
}

/**
 * Helper function to perform and display health check results
 */
async function performHealthCheck(
  networkConfigs: NetworkConfig[]
): Promise<void> {
  console.log('\n🔍 Checking network health...');
  const healthResults = await CrossChainNetworkManager.healthCheck(
    networkConfigs
  );

  let healthyCount = 0;
  const totalCount = Object.keys(healthResults).length;

  for (const [networkName, result] of Object.entries(healthResults)) {
    console.log(`\n📡 ${networkName}:`);

    if (result.connected) {
      healthyCount++;
      console.log(`  🟢 Connected (Block: ${result.blockNumber})`);
      console.log(
        `  🏭 Factory: ${
          result.factoryAvailable ? '✅ Available' : '❌ Not found'
        }`
      );
      console.log(
        `  📡 Dispatcher: ${
          result.dispatcherAvailable ? '✅ Available' : '❌ Not found'
        }`
      );
    } else {
      console.log(`  🔴 Disconnected: ${result.error}`);
    }
  }

  console.log(
    `\n📊 Health Summary: ${healthyCount}/${totalCount} networks healthy`
  );

  if (healthyCount === totalCount) {
    console.log(
      '✅ All networks are healthy and ready for cross-chain deployment'
    );
  } else {
    console.log(
      '⚠️  Some networks have issues. Check configurations and RPC endpoints.'
    );
  }
}

export {}; // Make this a module

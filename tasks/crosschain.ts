/**
 * Cross-Chain Hardhat Tasks for PayRox Go Beyond
 * Enables cross-chain deployment and manifest synchronization
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

  // Return full NetworkConfig with required properties
  return {
    ...baseConfig,
    deploymentPath: `./deployments/${networkName}`,
    artifactsPath: './artifacts/contracts',
    hasDeployments: true,
  };
}

/**
 * Helper function to load contracts configuration
 */
function loadContractsConfig(contractsPath: string) {
  const contractsConfigPath = path.resolve(contractsPath);
  if (!fs.existsSync(contractsConfigPath)) {
    throw new Error(
      `Contracts configuration not found: ${contractsConfigPath}`
    );
  }
  return JSON.parse(fs.readFileSync(contractsConfigPath, 'utf8'));
}

/**
 * Helper function to validate and prepare networks
 */
async function validateNetworks(
  targetNetworks: string[]
): Promise<NetworkConfig[]> {
  const networkConfigs: NetworkConfig[] = [];

  for (const networkName of targetNetworks) {
    try {
      const config = getNetworkConfig(networkName);
      networkConfigs.push(config);
      console.log(`  ✓ ${config.displayName} (Chain ID: ${config.chainId})`);
    } catch (error) {
      console.error(`  ✗ Failed to load config for ${networkName}: ${error}`);
      throw error;
    }
  }

  const validation =
    CrossChainNetworkManager.validateNetworkConfig(networkConfigs);
  if (!validation.valid) {
    console.error('❌ Network validation failed:');
    validation.errors.forEach(error => console.error(`  • ${error}`));
    throw new Error('Network validation failed');
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  Network warnings:');
    validation.warnings.forEach(warning => console.warn(`  • ${warning}`));
  }

  return networkConfigs;
}

/**
 * Helper function to execute deployment
 */
async function executeDeployment(
  orchestrator: CrossChainOrchestrator,
  targetNetworks: string[],
  contractsConfig: any,
  privateKey: string
) {
  console.log('\n🚀 Starting cross-chain deployment...');

  const deployment = await orchestrator.deployAcrossChains(
    targetNetworks,
    contractsConfig.contracts,
    privateKey
  );

  console.log(`\n📊 Deployment Status: ${deployment.status.toUpperCase()}`);
  console.log(`🆔 Deployment ID: ${deployment.deploymentId}`);

  // Display results
  for (const contract of deployment.contracts) {
    console.log(`\n📄 Contract: ${contract.name}`);
    console.log(`  🔑 Salt: ${contract.salt}`);
    console.log(`  📍 Predicted: ${contract.predictedAddress}`);

    for (const [network, address] of Object.entries(contract.actualAddresses)) {
      const status = address === 'FAILED' ? '❌' : '✅';
      console.log(`  ${status} ${network}: ${address}`);
    }
  }

  return deployment;
}

/**
 * Helper function to save deployment artifacts
 */
function saveDeployment(deployment: any) {
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

    // Parse target networks
    const targetNetworks = taskArgs.networks
      .split(',')
      .map((n: string) => n.trim());
    console.log(`📡 Target networks: ${targetNetworks.join(', ')}`);

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
    console.log(
      `📦 Found ${contractsConfig.contracts.length} contracts to deploy`
    );

    // Get deployer private key
    const privateKey = taskArgs.privateKey || process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error(
        'Private key required. Use --private-key or set PRIVATE_KEY env var'
      );
    }

    // Initialize network configurations
    const networkConfigs = [];
    for (const networkName of targetNetworks) {
      try {
        const config = await getNetworkConfig(networkName);
        networkConfigs.push(config);
        console.log(`  ✓ ${config.displayName} (Chain ID: ${config.chainId})`);
      } catch (error) {
        console.error(`  ✗ Failed to load config for ${networkName}: ${error}`);
        throw error;
      }
    }

    // Validate network configurations
    const validation =
      CrossChainNetworkManager.validateNetworkConfig(networkConfigs);
    if (!validation.valid) {
      console.error('❌ Network validation failed:');
      validation.errors.forEach(error => console.error(`  • ${error}`));
      return;
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️  Network warnings:');
      validation.warnings.forEach(warning => console.warn(`  • ${warning}`));
    }

    // Initialize cross-chain orchestrator
    const orchestrator = new CrossChainOrchestrator(networkConfigs);

    try {
      // Execute cross-chain deployment
      console.log('\n🚀 Starting cross-chain deployment...');
      const deployment = await orchestrator.deployAcrossChains(
        targetNetworks,
        contractsConfig.contracts,
        privateKey
      );

      console.log(`\n📊 Deployment Status: ${deployment.status.toUpperCase()}`);
      console.log(`🆔 Deployment ID: ${deployment.deploymentId}`);

      // Display results
      for (const contract of deployment.contracts) {
        console.log(`\n📄 Contract: ${contract.name}`);
        console.log(`  🔑 Salt: ${contract.salt}`);
        console.log(`  📍 Predicted: ${contract.predictedAddress}`);

        for (const [network, address] of Object.entries(
          contract.actualAddresses
        )) {
          const status = address === 'FAILED' ? '❌' : '✅';
          console.log(`  ${status} ${network}: ${address}`);
        }
      }

      // Verify address consistency if requested
      if (taskArgs.verify) {
        console.log('\n🔍 Verifying address consistency...');
        const consistencyReport = await orchestrator.verifyAddressConsistency(
          deployment
        );

        if (consistencyReport.consistent) {
          console.log('✅ All addresses are consistent across networks');
        } else {
          console.log('❌ Address inconsistencies detected:');
          for (const discrepancy of consistencyReport.discrepancies) {
            console.log(
              `  • ${discrepancy.contract} on ${discrepancy.network}:`
            );
            console.log(`    Expected: ${discrepancy.expected}`);
            console.log(`    Actual:   ${discrepancy.actual}`);
          }
        }
      }

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
  .addOptionalParam('version', 'Deployment version', '1.0.0', types.string)
  .addOptionalParam('nonce', 'Cross-chain nonce', '1', types.string)
  .setAction(async taskArgs => {
    console.log('🧂 Cross-Chain Salt Generation');
    console.log('==============================');

    const config = {
      baseContent: taskArgs.content,
      deployer: taskArgs.deployer,
      version: taskArgs.version,
      crossChainNonce: parseInt(taskArgs.nonce),
    };

    const universalSalt = CrossChainSaltGenerator.generateUniversalSalt(config);
    console.log(`🔑 Universal Salt: ${universalSalt}`);

    // If content looks like bytecode, also generate enhanced chunk salt
    if (taskArgs.content.startsWith('0x') && taskArgs.content.length > 10) {
      const { ethers } = await import('ethers');
      const contentHash = ethers.keccak256(taskArgs.content);
      const enhancedSalt = CrossChainSaltGenerator.enhanceChunkSalt(
        contentHash,
        config.crossChainNonce
      );
      console.log(`🧩 Enhanced Chunk Salt: ${enhancedSalt}`);
    }

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
        const config = await getNetworkConfig(networkName);

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
        console.log(`❌ ${networkName}: Configuration error`);
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
    const networkConfigs = [];
    for (const networkName of deployment.networks) {
      const config = await getNetworkConfig(networkName);
      networkConfigs.push(config);
    }

    // Initialize manifest sync service
    const manifestSync = new CrossChainManifestSync(networkConfigs);

    try {
      // Create cross-chain manifest
      console.log('\n📋 Creating cross-chain manifest...');
      const manifest = await manifestSync.createCrossChainManifest(
        deployment.networks[0], // Use first network as source
        deployment.networks.slice(1), // Rest as targets
        deployment
      );

      console.log(`🆔 Cross-chain ID: ${manifest.crossChainId}`);

      // Synchronize across networks
      console.log('\n🔄 Synchronizing across networks...');
      const syncedManifest = await manifestSync.synchronizeManifest(
        manifest,
        privateKey
      );

      // Verify synchronization
      const verification = await manifestSync.verifyManifestSync(
        syncedManifest
      );

      console.log('\n📊 Synchronization Results:');
      console.log(`  ✅ Synced: ${verification.syncedNetworks.join(', ')}`);
      if (verification.failedNetworks.length > 0) {
        console.log(`  ❌ Failed: ${verification.failedNetworks.join(', ')}`);
      }
      console.log(
        `  🎯 Overall: ${
          verification.consistent ? 'CONSISTENT' : 'INCONSISTENT'
        }`
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
 * Verify cross-chain manifest consistency
 */
task(
  'crosschain:verify-manifest',
  'Verify manifest consistency across networks'
)
  .addParam(
    'manifest',
    'Path to cross-chain manifest file',
    undefined,
    types.string
  )
  .setAction(async taskArgs => {
    console.log('🔍 Cross-Chain Manifest Verification');
    console.log('====================================');

    // Load manifest
    const manifestPath = path.resolve(taskArgs.manifest);
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest file not found: ${manifestPath}`);
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`📂 Loaded manifest: ${manifest.crossChainId}`);

    // Initialize network configurations
    const networkConfigs = [];
    for (const networkName of Object.keys(manifest.networks)) {
      const config = await getNetworkConfig(networkName);
      networkConfigs.push(config);
    }

    // Initialize manifest sync service
    const manifestSync = new CrossChainManifestSync(networkConfigs);

    try {
      // Verify manifest consistency
      const verification = await manifestSync.verifyManifestSync(manifest);

      console.log('\n📊 Verification Results:');
      console.log(
        `  🎯 Status: ${
          verification.consistent ? 'CONSISTENT' : 'INCONSISTENT'
        }`
      );
      console.log(
        `  ✅ Synced Networks: ${verification.syncedNetworks.length}`
      );
      console.log(
        `  ❌ Failed Networks: ${verification.failedNetworks.length}`
      );

      if (verification.syncedNetworks.length > 0) {
        console.log('\n✅ Synced Networks:');
        for (const network of verification.syncedNetworks) {
          const details = verification.details[network];
          console.log(
            `  • ${network}: ${details.manifestHash.substring(0, 10)}...`
          );
        }
      }

      if (verification.failedNetworks.length > 0) {
        console.log('\n❌ Failed Networks:');
        for (const network of verification.failedNetworks) {
          const details = verification.details[network];
          console.log(`  • ${network}: ${details.status}`);
        }
      }
    } catch (error) {
      console.error('❌ Manifest verification failed:', error);
      throw error;
    }
  });

/* ═══════════════════════════════════════════════════════════════════════════
   NETWORK HEALTH CHECK TASKS
   ═══════════════════════════════════════════════════════════════════════════ */

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

    // Load network configurations
    const networkConfigs = [];
    for (const networkName of targetNetworks) {
      try {
        const config = await getNetworkConfig(networkName);
        networkConfigs.push(config);
      } catch (error) {
        console.error(`❌ Failed to load config for ${networkName}: ${error}`);
      }
    }

    if (networkConfigs.length === 0) {
      console.error('❌ No valid network configurations found');
      return;
    }

    // Perform health check
    console.log('\n🔍 Checking network health...');
    const healthResults = await CrossChainNetworkManager.healthCheck(
      networkConfigs
    );

    let healthyCount = 0;
    let totalCount = 0;

    for (const [networkName, result] of Object.entries(healthResults)) {
      totalCount++;

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
  });

export {}; // Make this a module

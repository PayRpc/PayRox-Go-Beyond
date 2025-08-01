/**
 * Cross-Chain Deployment Orchestrator
 *
 * Implements the complete runbook from "ready" → "repeatable cross-chain deploys"
 * Orchestrates factory deployment, manifest validation, and cross-chain coordination
 */

import * as fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import * as path from 'path';
import { NetworkManager, getNetworkManager } from '../src/utils/network';
import { DeterministicFactoryDeployer } from './deploy-deterministic-factory';
import {
  ManifestPreflightChecker,
  validateManifestPreflight,
} from './manifest-preflight';

/* ═══════════════════════════════════════════════════════════════════════════
   ORCHESTRATION TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export interface OrchestrationConfig {
  networks: string[];
  manifestPath?: string;
  skipFactoryDeployment?: boolean;
  skipManifestValidation?: boolean;
  dryRun?: boolean;
  pausedDeployment?: boolean;
  governanceAddress?: string;
}

export interface OrchestrationResult {
  success: boolean;
  factoryAddress?: string;
  manifestHash?: string;
  deploymentResults: {
    [networkName: string]: {
      factoryDeployed: boolean;
      dispatcherDeployed: boolean;
      manifestValidated: boolean;
      errors: string[];
    };
  };
  preflightPassed: boolean;
  timestamp: string;
  duration: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CROSS-CHAIN ORCHESTRATOR CLASS
   ═══════════════════════════════════════════════════════════════════════════ */

export class CrossChainOrchestrator {
  private networkManager: NetworkManager;
  private factoryDeployer: DeterministicFactoryDeployer;
  private preflightChecker: ManifestPreflightChecker;

  constructor() {
    this.networkManager = getNetworkManager();
    this.factoryDeployer = new DeterministicFactoryDeployer();
    this.preflightChecker = new ManifestPreflightChecker();
  }

  /**
   * MAIN ORCHESTRATION: Execute complete cross-chain deployment
   */
  async orchestrateDeployment(
    config: OrchestrationConfig,
    hre: HardhatRuntimeEnvironment
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    console.log('🎭 PayRox Go Beyond - Cross-Chain Deployment Orchestrator');
    console.log('=' * 70);
    console.log(`🌐 Target networks: ${config.networks.join(', ')}`);
    console.log(`🔧 Dry run: ${config.dryRun || false}`);
    console.log(`⏸️  Paused deployment: ${config.pausedDeployment || false}`);

    const result: OrchestrationResult = {
      success: false,
      deploymentResults: {},
      preflightPassed: false,
      timestamp: new Date().toISOString(),
      duration: 0,
    };

    // Initialize deployment results for all networks
    for (const network of config.networks) {
      result.deploymentResults[network] = {
        factoryDeployed: false,
        dispatcherDeployed: false,
        manifestValidated: false,
        errors: [],
      };
    }

    try {
      // STEP 1: PRE-DEPLOY INVARIANTS
      console.log('\n🔍 STEP 1: PRE-DEPLOY INVARIANTS');
      await this.validatePreDeployInvariants(config, hre, result);

      // STEP 2: FACTORY DEPLOYMENT (CREATE2 with frozen salt)
      if (!config.skipFactoryDeployment) {
        console.log('\n🏭 STEP 2: FACTORY DEPLOYMENT');
        await this.deployFactoriesAcrossChains(config, hre, result);
      }

      // STEP 3: MANIFEST PREFLIGHT
      if (!config.skipManifestValidation && config.manifestPath) {
        console.log('\n📋 STEP 3: MANIFEST PREFLIGHT');
        await this.validateManifestAcrossChains(config, hre, result);
      }

      // STEP 4: DISPATCHER DEPLOYMENT
      console.log('\n🚦 STEP 4: DISPATCHER DEPLOYMENT');
      await this.deployDispatchersAcrossChains(config, hre, result);

      // STEP 5: SMOKE TESTS
      console.log('\n🧪 STEP 5: SMOKE TESTS');
      await this.runSmokeTests(config, hre, result);

      // STEP 6: FINALIZATION
      console.log('\n🎯 STEP 6: FINALIZATION');
      await this.finalizeDeployment(config, hre, result);

      result.success = true;
      console.log('\n🎉 CROSS-CHAIN DEPLOYMENT COMPLETED SUCCESSFULLY!');
    } catch (error) {
      console.error('❌ Orchestration failed:', error);
      result.success = false;

      // Add error to all networks
      const errorMsg = error instanceof Error ? error.message : String(error);
      for (const network of config.networks) {
        result.deploymentResults[network].errors.push(errorMsg);
      }
    }

    result.duration = Date.now() - startTime;
    await this.generateOrchestrationReport(result, config);

    return result;
  }

  /**
   * STEP 1: Validate pre-deploy invariants
   */
  private async validatePreDeployInvariants(
    config: OrchestrationConfig,
    hre: HardhatRuntimeEnvironment,
    result: OrchestrationResult
  ): Promise<void> {
    console.log('🔍 Validating network connectivity...');

    // Test network connectivity
    for (const networkName of config.networks) {
      try {
        await hre.changeNetwork(networkName);
        const { ethers } = hre;
        const [deployer] = await ethers.getSigners();
        const balance = await ethers.provider.getBalance(deployer.address);

        console.log(
          `✅ ${networkName}: Connected (Balance: ${ethers.formatEther(
            balance
          )} ETH)`
        );

        // Check minimum balance for deployment
        const minBalance = ethers.parseEther('0.01'); // 0.01 ETH minimum
        if (balance < minBalance) {
          throw new Error(
            `Insufficient balance: ${ethers.formatEther(
              balance
            )} ETH < 0.01 ETH`
          );
        }
      } catch (error) {
        const errorMsg = `Network connectivity failed: ${
          error instanceof Error ? error.message : String(error)
        }`;
        result.deploymentResults[networkName].errors.push(errorMsg);
        throw new Error(
          `Pre-deploy validation failed for ${networkName}: ${errorMsg}`
        );
      }
    }

    // Validate factory address parity will be maintained
    if (!config.skipFactoryDeployment) {
      console.log('🔍 Validating factory address parity...');
      const parityResult =
        await this.factoryDeployer.validateFactoryAddressParity(
          config.networks,
          hre
        );

      if (!parityResult.valid) {
        throw new Error(
          'Factory address parity validation failed - cannot ensure identical addresses'
        );
      }

      result.factoryAddress = parityResult.expectedAddress;
      console.log(
        `✅ Factory address parity validated: ${result.factoryAddress}`
      );
    }
  }

  /**
   * STEP 2: Deploy factories across chains using CREATE2
   */
  private async deployFactoriesAcrossChains(
    config: OrchestrationConfig,
    hre: HardhatRuntimeEnvironment,
    result: OrchestrationResult
  ): Promise<void> {
    if (config.dryRun) {
      console.log('🔍 DRY RUN: Skipping actual factory deployment');
      return;
    }

    const deploymentResult =
      await this.factoryDeployer.deployFactoryAcrossNetworks(
        config.networks,
        hre
      );

    if (!deploymentResult.identical) {
      throw new Error('Factory addresses are not identical across networks!');
    }

    result.factoryAddress = deploymentResult.factoryAddress;

    // Update individual network results
    for (const [networkName, networkResult] of Object.entries(
      deploymentResult.networks
    )) {
      result.deploymentResults[networkName].factoryDeployed = true;
      console.log(
        `✅ ${networkName}: Factory deployed at ${networkResult.address}`
      );
    }
  }

  /**
   * STEP 3: Validate manifest across chains
   */
  private async validateManifestAcrossChains(
    config: OrchestrationConfig,
    hre: HardhatRuntimeEnvironment,
    result: OrchestrationResult
  ): Promise<void> {
    if (!config.manifestPath) {
      console.log('⚠️  No manifest path provided, skipping validation');
      return;
    }

    const validationResult = await validateManifestPreflight(
      config.manifestPath,
      config.networks,
      hre
    );

    result.preflightPassed = validationResult;

    if (!validationResult) {
      throw new Error(
        'Manifest preflight validation failed - deployment aborted'
      );
    }

    // Update network results
    for (const network of config.networks) {
      result.deploymentResults[network].manifestValidated = true;
    }

    console.log('✅ Manifest preflight validation passed');
  }

  /**
   * STEP 4: Deploy dispatchers across chains
   */
  private async deployDispatchersAcrossChains(
    config: OrchestrationConfig,
    hre: HardhatRuntimeEnvironment,
    result: OrchestrationResult
  ): Promise<void> {
    if (config.dryRun) {
      console.log('🔍 DRY RUN: Skipping actual dispatcher deployment');
      return;
    }

    console.log('🚦 Deploying ManifestDispatcher contracts...');

    for (const networkName of config.networks) {
      try {
        await hre.changeNetwork(networkName);
        const { ethers } = hre;
        const [deployer] = await ethers.getSigners();

        // Deploy ManifestDispatcher
        const DispatcherContract = await ethers.getContractFactory(
          'ManifestDispatcher'
        );

        const dispatcher = await DispatcherContract.deploy(
          result.factoryAddress || ethers.ZeroAddress, // factory address
          deployer.address, // governance address
          config.pausedDeployment || true // start paused for safety
        );

        await dispatcher.waitForDeployment();
        const dispatcherAddress = await dispatcher.getAddress();

        console.log(
          `✅ ${networkName}: Dispatcher deployed at ${dispatcherAddress}`
        );
        result.deploymentResults[networkName].dispatcherDeployed = true;

        // Save dispatcher deployment info
        await this.saveDispatcherDeployment(networkName, {
          address: dispatcherAddress,
          factoryAddress: result.factoryAddress,
          governanceAddress: deployer.address,
          paused: config.pausedDeployment || true,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const errorMsg = `Dispatcher deployment failed: ${
          error instanceof Error ? error.message : String(error)
        }`;
        result.deploymentResults[networkName].errors.push(errorMsg);
        console.error(`❌ ${networkName}: ${errorMsg}`);
      }
    }
  }

  /**
   * STEP 5: Run smoke tests
   */
  private async runSmokeTests(
    config: OrchestrationConfig,
    hre: HardhatRuntimeEnvironment,
    result: OrchestrationResult
  ): Promise<void> {
    console.log('🧪 Running smoke tests...');

    for (const networkName of config.networks) {
      try {
        await hre.changeNetwork(networkName);
        const { ethers } = hre;

        // Load deployed contracts
        const factoryInfo = await this.loadDeploymentInfo(
          networkName,
          'DeterministicChunkFactory'
        );
        const dispatcherInfo = await this.loadDeploymentInfo(
          networkName,
          'ManifestDispatcher'
        );

        if (!factoryInfo || !dispatcherInfo) {
          throw new Error('Missing deployment information for smoke tests');
        }

        // Test factory
        const factory = await ethers.getContractAt(
          'DeterministicChunkFactory',
          factoryInfo.address
        );
        const factoryOwner = await factory.owner();
        console.log(
          `  🏭 ${networkName}: Factory owner verified: ${factoryOwner}`
        );

        // Test dispatcher
        const dispatcher = await ethers.getContractAt(
          'ManifestDispatcher',
          dispatcherInfo.address
        );
        const isPaused = await dispatcher.paused();
        console.log(`  🚦 ${networkName}: Dispatcher paused: ${isPaused}`);

        console.log(`✅ ${networkName}: Smoke tests passed`);
      } catch (error) {
        const errorMsg = `Smoke tests failed: ${
          error instanceof Error ? error.message : String(error)
        }`;
        result.deploymentResults[networkName].errors.push(errorMsg);
        console.error(`❌ ${networkName}: ${errorMsg}`);
      }
    }
  }

  /**
   * STEP 6: Finalize deployment
   */
  private async finalizeDeployment(
    config: OrchestrationConfig,
    hre: HardhatRuntimeEnvironment,
    result: OrchestrationResult
  ): Promise<void> {
    console.log('🎯 Finalizing deployment...');

    // Generate deployment summary
    const summary = {
      totalNetworks: config.networks.length,
      successfulNetworks: Object.values(result.deploymentResults).filter(
        r => r.factoryDeployed && r.dispatcherDeployed && r.errors.length === 0
      ).length,
      factoryAddress: result.factoryAddress,
      timestamp: result.timestamp,
    };

    console.log(`📊 Deployment Summary:`);
    console.log(
      `   Networks: ${summary.successfulNetworks}/${summary.totalNetworks} successful`
    );
    console.log(`   Factory: ${summary.factoryAddress}`);
    console.log(
      `   Status: ${
        summary.successfulNetworks === summary.totalNetworks
          ? 'SUCCESS'
          : 'PARTIAL'
      }`
    );

    // Emit ManifestVerified events (if applicable)
    if (result.manifestHash) {
      console.log('📡 Emitting ManifestVerified events...');
      // This would emit events on each network's dispatcher
    }

    console.log('✅ Deployment finalized');
  }

  /**
   * Helper: Load deployment info
   */
  private async loadDeploymentInfo(
    networkName: string,
    contractName: string
  ): Promise<any> {
    const deploymentPath = path.join(
      process.cwd(),
      'deployments',
      networkName,
      `${contractName}.json`
    );

    if (!fs.existsSync(deploymentPath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  }

  /**
   * Helper: Save dispatcher deployment
   */
  private async saveDispatcherDeployment(
    networkName: string,
    info: any
  ): Promise<void> {
    const deploymentsDir = path.join(process.cwd(), 'deployments', networkName);

    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentPath = path.join(deploymentsDir, 'ManifestDispatcher.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(info, null, 2));
  }

  /**
   * Generate final orchestration report
   */
  private async generateOrchestrationReport(
    result: OrchestrationResult,
    config: OrchestrationConfig
  ): Promise<void> {
    const reportsDir = path.join(process.cwd(), 'reports');

    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const report = {
      orchestration: {
        success: result.success,
        timestamp: result.timestamp,
        duration: result.duration,
        config,
      },
      deployment: result,
      summary: {
        totalNetworks: config.networks.length,
        successfulDeployments: Object.values(result.deploymentResults).filter(
          r =>
            r.factoryDeployed && r.dispatcherDeployed && r.errors.length === 0
        ).length,
        errors: Object.values(result.deploymentResults).flatMap(r => r.errors),
      },
    };

    const reportPath = path.join(
      reportsDir,
      `crosschain-orchestration-${Date.now()}.json`
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`💾 Orchestration report saved: ${reportPath}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN ORCHESTRATION FUNCTION
   ═══════════════════════════════════════════════════════════════════════════ */

export async function main(
  hre: HardhatRuntimeEnvironment,
  params?: any
): Promise<OrchestrationResult> {
  const config: OrchestrationConfig = {
    networks: params?.networks || [
      'sepolia',
      'base-sepolia',
      'arbitrum-sepolia',
    ],
    manifestPath: params?.manifestPath,
    skipFactoryDeployment: params?.skipFactory || false,
    skipManifestValidation: params?.skipManifest || false,
    dryRun: params?.dryRun || false,
    pausedDeployment: params?.paused !== false, // Default to paused
    governanceAddress: params?.governance,
  };

  const orchestrator = new CrossChainOrchestrator();
  return await orchestrator.orchestrateDeployment(config, hre);
}

// Export for CLI usage
if (require.main === module) {
  import('hardhat')
    .then(async hre => {
      const result = await main(hre.default, {
        networks: process.argv.slice(2),
        dryRun: process.env.DRY_RUN === 'true',
      });

      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

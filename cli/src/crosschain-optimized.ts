/**
 * Cross-Chain CLI for PayRox Go Beyond - Optimized Version
 * Production-ready command-line interface for cross-chain operations
 */

import chalk from 'chalk';
import { Command } from 'commander';
import * as fs from 'fs';
import ora from 'ora';
import * as path from 'path';
import {
  CrossChainNetworkManager,
  CrossChainOrchestrator,
  CrossChainSaltGenerator,
} from '../../src/utils/cross-chain';
import { NETWORK_CONFIGS, NetworkConfig } from '../../src/utils/network';

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

/**
 * Helper function to validate deployment parameters
 */
function validateDeploymentParams(options: any): {
  networks: string[];
  privateKey: string;
  contractsConfig: any;
} {
  if (!options.networks) {
    throw new Error('Networks parameter is required');
  }

  const networks = options.networks.split(',').map((n: string) => n.trim());
  const privateKey = options.privateKey || process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      'Private key required. Use --private-key option or set PRIVATE_KEY environment variable'
    );
  }

  // Load contracts configuration
  const contractsConfigPath = path.resolve(
    options.contracts || './crosschain-contracts.json'
  );
  if (!fs.existsSync(contractsConfigPath)) {
    throw new Error(
      `Contracts configuration not found: ${contractsConfigPath}`
    );
  }

  const contractsConfig = JSON.parse(
    fs.readFileSync(contractsConfigPath, 'utf8')
  );
  return { networks, privateKey, contractsConfig };
}

/**
 * Helper function to execute deployment workflow
 */
async function executeDeploymentWorkflow(
  networks: string[],
  privateKey: string,
  contractsConfig: any,
  verifyAddresses: boolean
) {
  const networkConfigs: NetworkConfig[] = networks.map(name =>
    getNetworkConfig(name)
  );

  // Validate network configurations
  const validation =
    CrossChainNetworkManager.validateNetworkConfig(networkConfigs);
  if (!validation.valid) {
    throw new Error(
      `Network validation failed: ${validation.errors.join(', ')}`
    );
  }

  // Execute deployment
  const orchestrator = new CrossChainOrchestrator(networkConfigs);
  const deployment = await orchestrator.deployAcrossChains(
    networks,
    contractsConfig.contracts,
    privateKey
  );

  // Save deployment
  const deploymentDir = path.join(process.cwd(), 'crosschain-deployments');
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const deploymentFile = path.join(
    deploymentDir,
    `${deployment.deploymentId}.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));

  // Verify if requested
  if (verifyAddresses) {
    const consistencyReport = await orchestrator.verifyAddressConsistency(
      deployment
    );
    return { deployment, consistencyReport };
  }

  return { deployment, consistencyReport: null };
}

/**
 * Display deployment results
 */
function displayDeploymentResults(deployment: any, consistencyReport: any) {
  console.log(
    chalk.green.bold(
      `\n📊 Deployment Status: ${deployment.status.toUpperCase()}`
    )
  );
  console.log(chalk.cyan(`🆔 Deployment ID: ${deployment.deploymentId}`));

  for (const contract of deployment.contracts) {
    console.log(chalk.white.bold(`\n📄 Contract: ${contract.name}`));
    console.log(chalk.gray(`  🔑 Salt: ${contract.salt}`));
    console.log(chalk.gray(`  📍 Predicted: ${contract.predictedAddress}`));

    for (const [network, address] of Object.entries(contract.actualAddresses)) {
      const status = address === 'FAILED' ? chalk.red('❌') : chalk.green('✅');
      console.log(`  ${status} ${network}: ${address}`);
    }
  }

  if (consistencyReport) {
    if (consistencyReport.consistent) {
      console.log(
        chalk.green('\n✅ All addresses are consistent across networks')
      );
    } else {
      console.log(chalk.red('\n❌ Address inconsistencies detected'));
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMMAND DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Deploy command for cross-chain deployment
 */
function createDeployCommand(): Command {
  return new Command('deploy')
    .description('Deploy contracts across multiple networks')
    .option(
      '-n, --networks <networks>',
      'Comma-separated list of target networks'
    )
    .option(
      '-c, --contracts <path>',
      'Path to contracts configuration file',
      './crosschain-contracts.json'
    )
    .option(
      '-k, --private-key <key>',
      'Deployer private key (or use PRIVATE_KEY env var)'
    )
    .option('--verify', 'Verify address consistency after deployment', false)
    .action(async options => {
      console.log(chalk.blue.bold('🌐 PayRox Cross-Chain Deployment'));
      console.log(chalk.blue('================================\n'));

      const spinner = ora('Preparing deployment...').start();

      try {
        const { networks, privateKey, contractsConfig } =
          validateDeploymentParams(options);
        spinner.succeed(
          `Found ${contractsConfig.contracts.length} contracts for ${networks.length} networks`
        );

        spinner.start('Executing cross-chain deployment...');
        const { deployment, consistencyReport } =
          await executeDeploymentWorkflow(
            networks,
            privateKey,
            contractsConfig,
            options.verify
          );

        spinner.succeed('Cross-chain deployment completed');
        displayDeploymentResults(deployment, consistencyReport);
      } catch (error) {
        spinner.fail('Deployment failed');
        console.error(
          chalk.red('\n❌ Error:'),
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });
}

/**
 * Salt generation command
 */
function createSaltCommand(): Command {
  return new Command('generate-salt')
    .description('Generate universal salt for cross-chain deployment')
    .option('-c, --content <content>', 'Content hash or contract bytecode')
    .option('-d, --deployer <address>', 'Deployer address')
    .option('-v, --version <version>', 'Deployment version', '1.0.0')
    .option('-n, --nonce <nonce>', 'Cross-chain nonce', '1')
    .action(async options => {
      console.log(chalk.blue.bold('🧂 Cross-Chain Salt Generation'));
      console.log(chalk.blue('==============================\n'));

      try {
        if (!options.content || !options.deployer) {
          throw new Error('Content and deployer address are required');
        }

        const saltConfig = {
          baseContent: options.content,
          deployer: options.deployer,
          version: options.version,
          crossChainNonce: parseInt(options.nonce),
        };

        const universalSalt =
          CrossChainSaltGenerator.generateUniversalSalt(saltConfig);
        console.log(chalk.green.bold(`🔑 Universal Salt: ${universalSalt}`));

        // Enhanced salt for bytecode
        if (options.content.startsWith('0x') && options.content.length > 10) {
          const { ethers } = await import('ethers');
          const contentHash = ethers.keccak256(options.content);
          const enhancedSalt = CrossChainSaltGenerator.enhanceChunkSalt(
            contentHash,
            saltConfig.crossChainNonce
          );
          console.log(
            chalk.cyan.bold(`🧩 Enhanced Chunk Salt: ${enhancedSalt}`)
          );
        }

        console.log(chalk.white('\n📋 Configuration:'));
        console.log(chalk.gray(`  Content: ${saltConfig.baseContent}`));
        console.log(chalk.gray(`  Deployer: ${saltConfig.deployer}`));
        console.log(chalk.gray(`  Version: ${saltConfig.version}`));
        console.log(chalk.gray(`  Nonce: ${saltConfig.crossChainNonce}`));
      } catch (error) {
        console.error(
          chalk.red('\n❌ Salt generation failed:'),
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });
}

/**
 * Address prediction command
 */
function createPredictCommand(): Command {
  return new Command('predict')
    .description('Predict contract addresses across networks')
    .option('-n, --networks <networks>', 'Comma-separated list of networks')
    .option('-s, --salt <salt>', 'Deployment salt')
    .option('-b, --bytecode <bytecode>', 'Contract bytecode')
    .action(async options => {
      console.log(chalk.blue.bold('🔮 Cross-Chain Address Prediction'));
      console.log(chalk.blue('==================================\n'));

      try {
        if (!options.networks || !options.salt || !options.bytecode) {
          throw new Error('Networks, salt, and bytecode are required');
        }

        const targetNetworks = options.networks
          .split(',')
          .map((n: string) => n.trim());
        const { ethers } = await import('ethers');
        const bytecodeHash = ethers.keccak256(options.bytecode);

        console.log(chalk.gray(`🧂 Salt: ${options.salt}`));
        console.log(chalk.gray(`🏗️  Bytecode Hash: ${bytecodeHash}\n`));

        for (const networkName of targetNetworks) {
          try {
            const config = getNetworkConfig(networkName);

            if (config.factoryAddress) {
              const predictedAddress =
                CrossChainSaltGenerator.predictCrossChainAddress(
                  config.factoryAddress,
                  options.salt,
                  bytecodeHash
                );

              console.log(
                chalk.green(`📍 ${config.displayName}: ${predictedAddress}`)
              );
            } else {
              console.log(
                chalk.yellow(
                  `⚠️  ${config.displayName}: No factory address configured`
                )
              );
            }
          } catch (networkError) {
            console.log(chalk.red(`❌ ${networkName}: Configuration error`));
          }
        }
      } catch (error) {
        console.error(
          chalk.red('\n❌ Address prediction failed:'),
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });
}

/**
 * Health check command
 */
function createHealthCommand(): Command {
  return new Command('health')
    .description('Check network health and contract availability')
    .option(
      '-n, --networks <networks>',
      'Comma-separated list of networks to check'
    )
    .action(async options => {
      console.log(chalk.blue.bold('🏥 Cross-Chain Network Health Check'));
      console.log(chalk.blue('===================================\n'));

      const spinner = ora('Checking network health...').start();

      try {
        if (!options.networks) {
          throw new Error('Networks parameter is required');
        }

        const targetNetworks = options.networks
          .split(',')
          .map((n: string) => n.trim());
        const networkConfigs: NetworkConfig[] = [];

        for (const networkName of targetNetworks) {
          try {
            const config = getNetworkConfig(networkName);
            networkConfigs.push(config);
          } catch (configError) {
            console.log(
              chalk.red(`❌ Failed to load config for ${networkName}`)
            );
          }
        }

        if (networkConfigs.length === 0) {
          throw new Error('No valid network configurations found');
        }

        const healthResults = await CrossChainNetworkManager.healthCheck(
          networkConfigs
        );
        spinner.succeed('Health check completed');

        const healthyCount = Object.values(healthResults).filter(
          r => r.connected
        ).length;
        const totalCount = Object.keys(healthResults).length;

        console.log('');
        for (const [networkName, result] of Object.entries(healthResults)) {
          console.log(chalk.white.bold(`📡 ${networkName}:`));

          if (result.connected) {
            console.log(
              chalk.green(`  🟢 Connected (Block: ${result.blockNumber})`)
            );
            console.log(
              `  🏭 Factory: ${
                result.factoryAvailable
                  ? chalk.green('✅ Available')
                  : chalk.red('❌ Not found')
              }`
            );
            console.log(
              `  📡 Dispatcher: ${
                result.dispatcherAvailable
                  ? chalk.green('✅ Available')
                  : chalk.red('❌ Not found')
              }`
            );
          } else {
            console.log(chalk.red(`  🔴 Disconnected: ${result.error}`));
          }
          console.log('');
        }

        console.log(
          chalk.white.bold(
            `📊 Health Summary: ${healthyCount}/${totalCount} networks healthy`
          )
        );

        if (healthyCount === totalCount) {
          console.log(
            chalk.green(
              '✅ All networks are healthy and ready for cross-chain deployment'
            )
          );
        } else {
          console.log(
            chalk.yellow(
              '⚠️  Some networks have issues. Check configurations and RPC endpoints.'
            )
          );
        }
      } catch (error) {
        spinner.fail('Health check failed');
        console.error(
          chalk.red('\n❌ Error:'),
          error instanceof Error ? error.message : error
        );
        process.exit(1);
      }
    });
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN CLI SETUP
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Create the main CLI program
 */
export function createCrossChainCLI(): Command {
  const program = new Command();

  program
    .name('payrox-crosschain')
    .description('PayRox Go Beyond Cross-Chain CLI')
    .version('1.0.0');

  // Add all commands
  program.addCommand(createDeployCommand());
  program.addCommand(createSaltCommand());
  program.addCommand(createPredictCommand());
  program.addCommand(createHealthCommand());

  return program;
}

// If this file is run directly, execute the CLI
if (require.main === module) {
  const cli = createCrossChainCLI();
  cli.parse(process.argv);
}

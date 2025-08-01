/**
 * Cross-Chain CLI Commands for PayRox Go Beyond
 * Production-ready command-line interface for cross-chain operations
 */

import chalk from 'chalk';
import { Command } from 'commander';
import * as fs from 'fs';
import inquirer from 'inquirer';
import ora from 'ora';
import * as path from 'path';
import {
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

/**
 * Create the main CLI program
 */
function createCLI(): Command {
  const program = new Command();

  program
    .name('payrox-crosschain')
    .description('PayRox Go Beyond Cross-Chain CLI')
    .version('1.0.0');

  return program;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEPLOYMENT COMMANDS
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
    .option(
      '--interactive',
      'Interactive mode for deployment configuration',
      false
    )
    .action(async options => {
      console.log(chalk.blue.bold('🌐 PayRox Cross-Chain Deployment'));
      console.log(chalk.blue('================================\n'));

      try {
        let config = options;

        // Interactive mode
        if (options.interactive || !options.networks) {
          config = await promptDeploymentConfig(options);
        }

        const spinner = ora('Preparing deployment...').start();

        // Parse target networks
        const targetNetworks = config.networks
          .split(',')
          .map((n: string) => n.trim());
        spinner.text = `Validating ${targetNetworks.length} networks...`;

        // Load and validate network configurations
        const networkConfigs: NetworkConfig[] = [];
        for (const networkName of targetNetworks) {
          const netConfig = getNetworkConfig(networkName);
          networkConfigs.push(netConfig);
        }

        const validation =
          CrossChainNetworkManager.validateNetworkConfig(networkConfigs);
        if (!validation.valid) {
          spinner.fail('Network validation failed');
          console.error(chalk.red('❌ Validation errors:'));
          validation.errors.forEach(error =>
            console.error(chalk.red(`  • ${error}`))
          );
          process.exit(1);
        }

        spinner.succeed('Networks validated');

        // Load contracts configuration
        const contractsConfigPath = path.resolve(config.contracts);
        if (!fs.existsSync(contractsConfigPath)) {
          spinner.fail(
            `Contracts configuration not found: ${contractsConfigPath}`
          );
          process.exit(1);
        }

        const contractsConfig = JSON.parse(
          fs.readFileSync(contractsConfigPath, 'utf8')
        );
        console.log(
          chalk.green(
            `📦 Found ${contractsConfig.contracts.length} contracts to deploy`
          )
        );

        // Get deployer private key
        const privateKey = config.privateKey || process.env.PRIVATE_KEY;
        if (!privateKey) {
          spinner.fail('Private key required');
          console.error(
            chalk.red(
              'Use --private-key option or set PRIVATE_KEY environment variable'
            )
          );
          process.exit(1);
        }

        // Execute deployment
        spinner.start('Executing cross-chain deployment...');
        const orchestrator = new CrossChainOrchestrator(networkConfigs);

        const deployment = await orchestrator.deployAcrossChains(
          targetNetworks,
          contractsConfig.contracts,
          privateKey
        );

        spinner.succeed('Cross-chain deployment completed');

        // Display results
        console.log(
          chalk.green.bold(
            `\n📊 Deployment Status: ${deployment.status.toUpperCase()}`
          )
        );
        console.log(chalk.cyan(`🆔 Deployment ID: ${deployment.deploymentId}`));

        for (const contract of deployment.contracts) {
          console.log(chalk.white.bold(`\n📄 Contract: ${contract.name}`));
          console.log(chalk.gray(`  🔑 Salt: ${contract.salt}`));
          console.log(
            chalk.gray(`  📍 Predicted: ${contract.predictedAddress}`)
          );

          for (const [network, address] of Object.entries(
            contract.actualAddresses
          )) {
            const status =
              address === 'FAILED' ? chalk.red('❌') : chalk.green('✅');
            console.log(`  ${status} ${network}: ${address}`);
          }
        }

        // Save deployment artifacts
        const deploymentDir = path.join(
          process.cwd(),
          'crosschain-deployments'
        );
        if (!fs.existsSync(deploymentDir)) {
          fs.mkdirSync(deploymentDir, { recursive: true });
        }

        const deploymentFile = path.join(
          deploymentDir,
          `${deployment.deploymentId}.json`
        );
        fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
        console.log(chalk.blue(`\n💾 Deployment saved: ${deploymentFile}`));

        // Verify if requested
        if (config.verify) {
          const verifySpinner = ora('Verifying address consistency...').start();
          const consistencyReport = await orchestrator.verifyAddressConsistency(
            deployment
          );

          if (consistencyReport.consistent) {
            verifySpinner.succeed(
              'All addresses are consistent across networks'
            );
          } else {
            verifySpinner.fail('Address inconsistencies detected');
            console.log(chalk.red('\n❌ Inconsistencies:'));
            for (const discrepancy of consistencyReport.discrepancies) {
              console.log(
                chalk.red(
                  `  • ${discrepancy.contract} on ${discrepancy.network}:`
                )
              );
              console.log(chalk.red(`    Expected: ${discrepancy.expected}`));
              console.log(chalk.red(`    Actual:   ${discrepancy.actual}`));
            }
          }
        }
      } catch (error) {
        console.error(chalk.red('\n❌ Cross-chain deployment failed:'), error);
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
    .option('--interactive', 'Interactive mode for salt generation', false)
    .action(async options => {
      console.log(chalk.blue.bold('🧂 Cross-Chain Salt Generation'));
      console.log(chalk.blue('==============================\n'));

      try {
        let config = options;

        // Interactive mode
        if (options.interactive || !options.content || !options.deployer) {
          config = await promptSaltConfig(options);
        }

        const saltConfig = {
          baseContent: config.content,
          deployer: config.deployer,
          version: config.version,
          crossChainNonce: parseInt(config.nonce),
        };

        const universalSalt =
          CrossChainSaltGenerator.generateUniversalSalt(saltConfig);
        console.log(chalk.green.bold(`🔑 Universal Salt: ${universalSalt}`));

        // If content looks like bytecode, also generate enhanced chunk salt
        if (config.content.startsWith('0x') && config.content.length > 10) {
          const { ethers } = await import('ethers');
          const contentHash = ethers.keccak256(config.content);
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
        console.error(chalk.red('\n❌ Salt generation failed:'), error);
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
          console.error(
            chalk.red(
              '❌ Missing required parameters: --networks, --salt, --bytecode'
            )
          );
          process.exit(1);
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
          } catch (error) {
            console.log(chalk.red(`❌ ${networkName}: Configuration error`));
          }
        }
      } catch (error) {
        console.error(chalk.red('\n❌ Address prediction failed:'), error);
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

      try {
        if (!options.networks) {
          console.error(chalk.red('❌ Missing required parameter: --networks'));
          process.exit(1);
        }

        const targetNetworks = options.networks
          .split(',')
          .map((n: string) => n.trim());
        const spinner = ora('Loading network configurations...').start();

        // Load network configurations
        const networkConfigs: NetworkConfig[] = [];
        for (const networkName of targetNetworks) {
          try {
            const config = getNetworkConfig(networkName);
            networkConfigs.push(config);
          } catch (error) {
            console.log(
              chalk.red(`❌ Failed to load config for ${networkName}`)
            );
          }
        }

        if (networkConfigs.length === 0) {
          spinner.fail('No valid network configurations found');
          process.exit(1);
        }

        spinner.text = 'Checking network health...';
        const healthResults = await CrossChainNetworkManager.healthCheck(
          networkConfigs
        );
        spinner.succeed('Health check completed');

        let healthyCount = 0;
        const totalCount = Object.keys(healthResults).length;

        console.log('');
        for (const [networkName, result] of Object.entries(healthResults)) {
          console.log(chalk.white.bold(`📡 ${networkName}:`));

          if (result.connected) {
            healthyCount++;
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
        console.error(chalk.red('\n❌ Health check failed:'), error);
        process.exit(1);
      }
    });
}

/* ═══════════════════════════════════════════════════════════════════════════
   INTERACTIVE PROMPTS
   ═══════════════════════════════════════════════════════════════════════════ */

async function promptDeploymentConfig(existingOptions: any) {
  const networkChoices = Object.keys(NETWORK_CONFIGS);

  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'networks',
      message: 'Select target networks for deployment:',
      choices: networkChoices,
      default: existingOptions.networks
        ? existingOptions.networks.split(',')
        : [],
      validate: input =>
        input.length > 0 || 'Please select at least one network',
    },
    {
      type: 'input',
      name: 'contracts',
      message: 'Path to contracts configuration file:',
      default: existingOptions.contracts || './crosschain-contracts.json',
    },
    {
      type: 'password',
      name: 'privateKey',
      message:
        'Deployer private key (or press Enter to use PRIVATE_KEY env var):',
      when: !existingOptions.privateKey && !process.env.PRIVATE_KEY,
    },
    {
      type: 'confirm',
      name: 'verify',
      message: 'Verify address consistency after deployment?',
      default: existingOptions.verify || false,
    },
  ]);

  return {
    ...existingOptions,
    networks: Array.isArray(answers.networks)
      ? answers.networks.join(',')
      : answers.networks,
    contracts: answers.contracts,
    privateKey: answers.privateKey || existingOptions.privateKey,
    verify: answers.verify,
  };
}

async function promptSaltConfig(existingOptions: any) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'content',
      message: 'Content hash or contract bytecode:',
      default: existingOptions.content,
      validate: input => input.length > 0 || 'Content is required',
    },
    {
      type: 'input',
      name: 'deployer',
      message: 'Deployer address:',
      default: existingOptions.deployer,
      validate: input =>
        (input.startsWith('0x') && input.length === 42) ||
        'Invalid Ethereum address',
    },
    {
      type: 'input',
      name: 'version',
      message: 'Deployment version:',
      default: existingOptions.version || '1.0.0',
    },
    {
      type: 'number',
      name: 'nonce',
      message: 'Cross-chain nonce:',
      default: parseInt(existingOptions.nonce) || 1,
    },
  ]);

  return {
    ...existingOptions,
    ...answers,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN CLI SETUP
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Initialize and export the complete CLI
 */
export function createCrossChainCLI(): Command {
  const program = createCLI();

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

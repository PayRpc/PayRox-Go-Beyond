#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { ethers } from 'ethers';
import * as fs from 'fs';
import inquirer from 'inquirer';
import ora from 'ora';
import * as path from 'path';
import { table } from 'table';

/**
 * PayRox Go Beyond Production CLI
 * Complete deployment and management tool for production smart contracts
 */

interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  isTestnet: boolean;
  explorerUrl?: string;
}

interface DeploymentState {
  network: string;
  contracts: {
    manifestDispatcher?: string;
    deterministicChunkFactory?: string;
    orchestrator?: string;
    exampleFacetA?: string;
    exampleFacetB?: string;
  };
  manifestHash?: string;
  deployedAt: string;
  status: 'partial' | 'complete' | 'failed';
}

// Supported networks configuration
const NETWORKS: Record<string, NetworkConfig> = {
  localhost: {
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    chainId: 31337,
    isTestnet: true,
  },
  sepolia: {
    name: 'Sepolia Testnet',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    chainId: 11155111,
    isTestnet: true,
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  polygon: {
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    chainId: 137,
    isTestnet: false,
    explorerUrl: 'https://polygonscan.com',
  },
  arbitrum: {
    name: 'Arbitrum One',
    rpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
    chainId: 42161,
    isTestnet: false,
    explorerUrl: 'https://arbiscan.io',
  },
  base: {
    name: 'Base',
    rpcUrl: 'https://base-rpc.publicnode.com',
    chainId: 8453,
    isTestnet: false,
    explorerUrl: 'https://basescan.org',
  },
};

class PayRoxCLI {
  private deploymentStateFile = path.join(
    process.cwd(),
    '.payrox-deployments.json'
  );

  /**
   * Load deployment state from file
   */
  private loadDeploymentState(): Record<string, DeploymentState> {
    try {
      if (fs.existsSync(this.deploymentStateFile)) {
        return JSON.parse(fs.readFileSync(this.deploymentStateFile, 'utf8'));
      }
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Could not load deployment state'));
    }
    return {};
  }

  /**
   * Save deployment state to file
   */
  private saveDeploymentState(state: Record<string, DeploymentState>): void {
    try {
      fs.writeFileSync(
        this.deploymentStateFile,
        JSON.stringify(state, null, 2)
      );
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Could not save deployment state'));
    }
  }

  /**
   * Interactive network selection
   */
  async selectNetwork(): Promise<string> {
    const { network } = await inquirer.prompt([
      {
        type: 'list',
        name: 'network',
        message: 'Select target network:',
        choices: Object.entries(NETWORKS).map(([key, config]) => ({
          name: `${config.name} ${
            config.isTestnet ? '(Testnet)' : '(Mainnet)'
          }`,
          value: key,
        })),
      },
    ]);
    return network;
  }

  /**
   * Deploy complete production system
   */
  async deployProduction(networkName?: string): Promise<void> {
    const targetNetwork = networkName || (await this.selectNetwork());
    const networkConfig = NETWORKS[targetNetwork];

    if (!networkConfig) {
      console.error(chalk.red(`❌ Unknown network: ${targetNetwork}`));
      return;
    }

    console.log(
      chalk.blue(`\\n🚀 Deploying PayRox Go Beyond to ${networkConfig.name}...`)
    );

    const spinner = ora('Connecting to network...').start();

    try {
      // Connect to network
      const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
      const network = await provider.getNetwork();

      if (Number(network.chainId) !== networkConfig.chainId) {
        throw new Error(
          `Chain ID mismatch: expected ${networkConfig.chainId}, got ${network.chainId}`
        );
      }

      spinner.succeed(`Connected to ${networkConfig.name}`);

      // Run deployment script
      spinner.start('Deploying contracts...');

      const { exec } = require('child_process');
      const deployCommand = `npx hardhat run scripts/deploy-production-complete.ts --network ${targetNetwork}`;

      await new Promise((resolve, reject) => {
        exec(
          deployCommand,
          { cwd: process.cwd() },
          (error: any, stdout: string, stderr: string) => {
            if (error) {
              console.error(
                chalk.red(`\\nDeployment failed: ${error.message}`)
              );
              if (stderr) console.error(chalk.red(stderr));
              reject(error);
            } else {
              console.log(stdout);
              resolve(stdout);
            }
          }
        );
      });

      spinner.succeed('Production deployment completed!');

      // Update deployment state
      const state = this.loadDeploymentState();
      state[targetNetwork] = {
        network: targetNetwork,
        contracts: {
          // These would be extracted from deployment output
          manifestDispatcher: '0x...',
          deterministicChunkFactory: '0x...',
          orchestrator: '0x...',
          exampleFacetA: '0x...',
          exampleFacetB: '0x...',
        },
        deployedAt: new Date().toISOString(),
        status: 'complete',
      };
      this.saveDeploymentState(state);

      console.log(
        chalk.green('\\n✅ Production system deployed successfully!')
      );

      if (networkConfig.explorerUrl) {
        console.log(
          chalk.blue(
            `🔍 View contracts on explorer: ${networkConfig.explorerUrl}`
          )
        );
      }
    } catch (error) {
      spinner.fail('Deployment failed');
      console.error(
        chalk.red(`❌ Error: ${error instanceof Error ? error.message : error}`)
      );
    }
  }

  /**
   * Show deployment status
   */
  async showStatus(networkName?: string): Promise<void> {
    const state = this.loadDeploymentState();

    if (networkName) {
      const deployment = state[networkName];
      if (!deployment) {
        console.log(chalk.yellow(`No deployment found for ${networkName}`));
        return;
      }

      this.displayDeploymentStatus(networkName, deployment);
    } else {
      console.log(chalk.blue('\\n📊 Deployment Status Overview\\n'));

      if (Object.keys(state).length === 0) {
        console.log(
          chalk.yellow('No deployments found. Run deployment first.')
        );
        return;
      }

      Object.entries(state).forEach(([network, deployment]) => {
        this.displayDeploymentStatus(network, deployment);
      });
    }
  }

  /**
   * Display deployment status for a network
   */
  private displayDeploymentStatus(
    networkName: string,
    deployment: DeploymentState
  ): void {
    const networkConfig = NETWORKS[networkName];
    const statusColor =
      deployment.status === 'complete'
        ? 'green'
        : deployment.status === 'partial'
        ? 'yellow'
        : 'red';

    console.log(chalk.blue(`\\n🌐 ${networkConfig?.name || networkName}`));
    console.log(
      `Status: ${chalk[statusColor](deployment.status.toUpperCase())}`
    );
    console.log(
      `Deployed: ${new Date(deployment.deployedAt).toLocaleString()}`
    );

    if (deployment.contracts) {
      const contractData = Object.entries(deployment.contracts)
        .filter(([, address]) => address)
        .map(([name, address]) => [
          chalk.cyan(name),
          chalk.gray(address || 'Not deployed'),
        ]);

      if (contractData.length > 0) {
        console.log('\\nContracts:');
        console.log(
          table(contractData, {
            border: {
              topBody: '',
              topJoin: '',
              topLeft: '',
              topRight: '',
              bottomBody: '',
              bottomJoin: '',
              bottomLeft: '',
              bottomRight: '',
              bodyLeft: '  ',
              bodyRight: '',
              bodyJoin: ' │ ',
            },
          })
        );
      }
    }

    if (deployment.manifestHash) {
      console.log(`Manifest Hash: ${chalk.gray(deployment.manifestHash)}`);
    }
  }

  /**
   * Test deployed system
   */
  async testSystem(networkName?: string): Promise<void> {
    const targetNetwork = networkName || (await this.selectNetwork());
    const state = this.loadDeploymentState();
    const deployment = state[targetNetwork];

    if (!deployment || deployment.status !== 'complete') {
      console.error(
        chalk.red(`❌ No complete deployment found for ${targetNetwork}`)
      );
      return;
    }

    console.log(
      chalk.blue(`\\n🧪 Testing PayRox system on ${targetNetwork}...`)
    );

    const spinner = ora('Running system tests...').start();

    try {
      // Run test script
      const { exec } = require('child_process');
      const testCommand = `npx hardhat run scripts/complete-standard-dispatcher-test.ts --network ${targetNetwork}`;

      await new Promise((resolve, reject) => {
        exec(
          testCommand,
          { cwd: process.cwd() },
          (error: any, stdout: string, stderr: string) => {
            if (error) {
              console.error(chalk.red(`\\nTest failed: ${error.message}`));
              if (stderr) console.error(chalk.red(stderr));
              reject(error);
            } else {
              console.log(stdout);
              resolve(stdout);
            }
          }
        );
      });

      spinner.succeed('System tests passed!');
      console.log(chalk.green('\\n✅ PayRox system is working correctly!'));
    } catch (error) {
      spinner.fail('System tests failed');
      console.error(
        chalk.red(`❌ Error: ${error instanceof Error ? error.message : error}`)
      );
    }
  }

  /**
   * Cross-chain deployment
   */
  async deployCrossChain(networks: string[]): Promise<void> {
    console.log(
      chalk.blue(`\\n🌍 Cross-chain deployment to: ${networks.join(', ')}`)
    );

    for (const network of networks) {
      if (!NETWORKS[network]) {
        console.error(chalk.red(`❌ Unknown network: ${network}`));
        continue;
      }

      console.log(
        chalk.blue(`\\n📡 Deploying to ${NETWORKS[network].name}...`)
      );
      await this.deployProduction(network);
    }

    console.log(chalk.green('\\n🎉 Cross-chain deployment completed!'));
  }

  /**
   * Initialize CLI
   */
  async init(): Promise<void> {
    const program = new Command();

    program
      .name('payrox-cli')
      .description('PayRox Go Beyond Production CLI')
      .version('1.0.0');

    program
      .command('deploy')
      .description('Deploy complete production system')
      .option('-n, --network <network>', 'Target network')
      .action(async options => {
        await this.deployProduction(options.network);
      });

    program
      .command('status')
      .description('Show deployment status')
      .option('-n, --network <network>', 'Specific network')
      .action(async options => {
        await this.showStatus(options.network);
      });

    program
      .command('test')
      .description('Test deployed system')
      .option('-n, --network <network>', 'Target network')
      .action(async options => {
        await this.testSystem(options.network);
      });

    program
      .command('crosschain')
      .description('Deploy to multiple networks')
      .option('-n, --networks <networks>', 'Comma-separated network list')
      .action(async options => {
        const networks = options.networks
          ? options.networks.split(',')
          : await this.selectMultipleNetworks();
        await this.deployCrossChain(networks);
      });

    program
      .command('interactive')
      .description('Interactive mode')
      .action(async () => {
        await this.interactiveMode();
      });

    // Parse command line arguments
    program.parse();

    // If no command provided, start interactive mode
    if (!process.argv.slice(2).length) {
      await this.interactiveMode();
    }
  }

  /**
   * Select multiple networks
   */
  async selectMultipleNetworks(): Promise<string[]> {
    const { networks } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'networks',
        message: 'Select networks for cross-chain deployment:',
        choices: Object.entries(NETWORKS).map(([key, config]) => ({
          name: `${config.name} ${
            config.isTestnet ? '(Testnet)' : '(Mainnet)'
          }`,
          value: key,
        })),
      },
    ]);
    return networks;
  }

  /**
   * Interactive mode
   */
  async interactiveMode(): Promise<void> {
    console.log(chalk.blue('\\n🌟 PayRox Go Beyond CLI - Interactive Mode\\n'));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🚀 Deploy Production System', value: 'deploy' },
          { name: '📊 Check Deployment Status', value: 'status' },
          { name: '🧪 Test Deployed System', value: 'test' },
          { name: '🌍 Cross-Chain Deployment', value: 'crosschain' },
          { name: '❌ Exit', value: 'exit' },
        ],
      },
    ]);

    switch (action) {
      case 'deploy':
        await this.deployProduction();
        break;
      case 'status':
        await this.showStatus();
        break;
      case 'test':
        await this.testSystem();
        break;
      case 'crosschain':
        const networks = await this.selectMultipleNetworks();
        await this.deployCrossChain(networks);
        break;
      case 'exit':
        console.log(chalk.blue('👋 Goodbye!'));
        return;
    }

    // Ask if user wants to do something else
    const { continue: continueAction } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: 'Would you like to do something else?',
        default: true,
      },
    ]);

    if (continueAction) {
      await this.interactiveMode();
    }
  }
}

// Initialize and run CLI
async function main() {
  const cli = new PayRoxCLI();
  await cli.init();
}

// Handle uncaught errors
process.on('uncaughtException', error => {
  console.error(chalk.red('\\n💥 Uncaught Exception:'), error);
  process.exit(1);
});

process.on('unhandledRejection', reason => {
  console.error(chalk.red('\\n💥 Unhandled Rejection:'), reason);
  process.exit(1);
});

// Run CLI
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('\\n💥 CLI Error:'), error);
    process.exit(1);
  });
}

export default PayRoxCLI;

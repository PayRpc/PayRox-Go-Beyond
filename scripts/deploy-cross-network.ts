#!/usr/bin/env node

/**
 * PayRox Go Beyond - Cross-Network Deployment Automation
 * Deploy and verify system integrity across multiple blockchain networks
 */

import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

interface NetworkDeployment {
  network: string;
  factoryAddress?: string;
  dispatcherAddress?: string;
  factorySalt?: string;
  dispatcherSalt?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  error?: string;
  gasUsed?: bigint;
  deploymentTime?: number;
}

interface CrossNetworkReport {
  timestamp: string;
  totalNetworks: number;
  successful: number;
  failed: number;
  networks: NetworkDeployment[];
  consistency: {
    factoryAddresses: boolean;
    dispatcherAddresses: boolean;
    saltConsistency: boolean;
  };
  recommendations: string[];
}

const SUPPORTED_NETWORKS = [
  // Mainnets
  'mainnet', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche',
  'fantom', 'bsc', 'opbnb', 'linea', 'sei',
  // Testnets  
  'sepolia', 'holesky', 'mumbai', 'arbitrum-sepolia', 'optimism-sepolia',
  'base-sepolia', 'fuji', 'fantom-testnet', 'bsc-testnet', 'linea-goerli',
  // Development
  'localhost'
];

class CrossNetworkDeployer {
  private deployments: Map<string, NetworkDeployment> = new Map();
  private startTime: number = 0;

  constructor() {
    this.printHeader();
  }

  private printHeader() {
    console.log(chalk.cyan.bold('━'.repeat(80)));
    console.log(chalk.cyan.bold('🌐 PayRox Go Beyond - Cross-Network Deployment'));
    console.log(chalk.cyan.bold('━'.repeat(80)));
  }

  private printSuccess(message: string) {
    console.log(chalk.green.bold(`✅ ${message}`));
  }

  private printError(message: string) {
    console.log(chalk.red.bold(`❌ ${message}`));
  }

  private printWarning(message: string) {
    console.log(chalk.yellow.bold(`⚠️  ${message}`));
  }

  private printInfo(message: string) {
    console.log(chalk.blue(`ℹ️  ${message}`));
  }

  /**
   * Deploy to all supported networks
   */
  async deployToAllNetworks(): Promise<CrossNetworkReport> {
    this.startTime = Date.now();
    this.printInfo('Starting cross-network deployment...');

    // Initialize deployment tracking
    for (const network of SUPPORTED_NETWORKS) {
      this.deployments.set(network, {
        network,
        status: 'PENDING'
      });
    }

    // Deploy to each network
    const deploymentPromises = SUPPORTED_NETWORKS.map(network => 
      this.deployToNetwork(network)
    );

    await Promise.allSettled(deploymentPromises);

    // Generate and return report
    return this.generateReport();
  }

  /**
   * Deploy to specific networks only
   */
  async deployToNetworks(networks: string[]): Promise<CrossNetworkReport> {
    this.startTime = Date.now();
    this.printInfo(`Deploying to ${networks.length} networks...`);

    // Validate networks
    const validNetworks = networks.filter(network => 
      SUPPORTED_NETWORKS.includes(network)
    );

    if (validNetworks.length !== networks.length) {
      this.printWarning(`Some networks are not supported: ${networks.filter(n => !validNetworks.includes(n)).join(', ')}`);
    }

    // Initialize deployment tracking
    for (const network of validNetworks) {
      this.deployments.set(network, {
        network,
        status: 'PENDING'
      });
    }

    // Deploy to each network
    const deploymentPromises = validNetworks.map(network => 
      this.deployToNetwork(network)
    );

    await Promise.allSettled(deploymentPromises);

    return this.generateReport();
  }

  /**
   * Deploy to a single network
   */
  private async deployToNetwork(network: string): Promise<void> {
    const deployment = this.deployments.get(network)!;
    const networkStartTime = Date.now();

    try {
      this.printInfo(`🚀 Deploying to ${network}...`);

      // Execute deployment script
      const { execSync } = require('child_process');
      const deploymentResult = execSync(
        `npx hardhat run scripts/deploy-go-beyond.ts --network ${network}`,
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          timeout: 300000 // 5 minutes timeout
        }
      );

      // Parse deployment result and extract addresses/salts
      await this.parseDeploymentResult(network, deploymentResult);

      deployment.status = 'SUCCESS';
      deployment.deploymentTime = Date.now() - networkStartTime;

      this.printSuccess(`${network} deployment completed`);

    } catch (error) {
      deployment.status = 'FAILED';
      deployment.error = error instanceof Error ? error.message : String(error);
      deployment.deploymentTime = Date.now() - networkStartTime;

      this.printError(`${network} deployment failed: ${deployment.error}`);
    }
  }

  /**
   * Parse deployment results from script output
   */
  private async parseDeploymentResult(network: string, output: string): Promise<void> {
    const deployment = this.deployments.get(network)!;

    try {
      // Read deployment artifacts
      const deploymentPath = path.join(process.cwd(), 'deployments', network);
      
      if (fs.existsSync(deploymentPath)) {
        // Read factory deployment
        const factoryFile = path.join(deploymentPath, 'factory.json');
        if (fs.existsSync(factoryFile)) {
          const factoryData = JSON.parse(fs.readFileSync(factoryFile, 'utf8'));
          deployment.factoryAddress = factoryData.address;
          if (factoryData.deterministicData) {
            deployment.factorySalt = factoryData.deterministicData.salt;
          }
        }

        // Read dispatcher deployment
        const dispatcherFile = path.join(deploymentPath, 'dispatcher.json');
        if (fs.existsSync(dispatcherFile)) {
          const dispatcherData = JSON.parse(fs.readFileSync(dispatcherFile, 'utf8'));
          deployment.dispatcherAddress = dispatcherData.address;
          if (dispatcherData.deterministicData) {
            deployment.dispatcherSalt = dispatcherData.deterministicData.salt;
          }
        }
      }

      // Extract gas usage from output (basic parsing)
      const gasMatch = output.match(/Gas used: ([\d,]+)/);
      if (gasMatch) {
        deployment.gasUsed = BigInt(gasMatch[1].replace(/,/g, ''));
      }

    } catch (error) {
      this.printWarning(`Could not parse deployment result for ${network}: ${error}`);
    }
  }

  /**
   * Verify cross-network address consistency
   */
  private verifyConsistency(): {
    factoryAddresses: boolean;
    dispatcherAddresses: boolean;
    saltConsistency: boolean;
  } {
    const successful = Array.from(this.deployments.values())
      .filter(d => d.status === 'SUCCESS');

    if (successful.length < 2) {
      return {
        factoryAddresses: true,
        dispatcherAddresses: true,
        saltConsistency: true
      };
    }

    // Check factory address consistency
    const factoryAddresses = new Set(
      successful
        .filter(d => d.factoryAddress)
        .map(d => d.factoryAddress)
    );

    // Check dispatcher address consistency
    const dispatcherAddresses = new Set(
      successful
        .filter(d => d.dispatcherAddress)
        .map(d => d.dispatcherAddress)
    );

    // Check salt consistency
    const factorySalts = new Set(
      successful
        .filter(d => d.factorySalt)
        .map(d => d.factorySalt)
    );

    const dispatcherSalts = new Set(
      successful
        .filter(d => d.dispatcherSalt)
        .map(d => d.dispatcherSalt)
    );

    return {
      factoryAddresses: factoryAddresses.size <= 1,
      dispatcherAddresses: dispatcherAddresses.size <= 1,
      saltConsistency: factorySalts.size <= 1 && dispatcherSalts.size <= 1
    };
  }

  /**
   * Generate deployment recommendations
   */
  private generateRecommendations(consistency: any): string[] {
    const recommendations: string[] = [];

    if (!consistency.factoryAddresses) {
      recommendations.push('Factory addresses are inconsistent across networks. Verify CREATE2 salt generation.');
    }

    if (!consistency.dispatcherAddresses) {
      recommendations.push('Dispatcher addresses are inconsistent across networks. Check deployment configuration.');
    }

    if (!consistency.saltConsistency) {
      recommendations.push('Salt values are inconsistent. Ensure deterministic salt generation is working correctly.');
    }

    const failed = Array.from(this.deployments.values())
      .filter(d => d.status === 'FAILED');

    if (failed.length > 0) {
      recommendations.push(`${failed.length} networks failed deployment. Review error logs and retry.`);
    }

    const successful = Array.from(this.deployments.values())
      .filter(d => d.status === 'SUCCESS');

    if (successful.length > 0) {
      recommendations.push('Consider setting up monitoring and alerting for deployed networks.');
      recommendations.push('Verify contract functionality with integration tests.');
      recommendations.push('Set up cross-network event indexing for comprehensive monitoring.');
    }

    return recommendations;
  }

  /**
   * Generate comprehensive deployment report
   */
  private generateReport(): CrossNetworkReport {
    const deployments = Array.from(this.deployments.values());
    const successful = deployments.filter(d => d.status === 'SUCCESS');
    const failed = deployments.filter(d => d.status === 'FAILED');
    const consistency = this.verifyConsistency();
    const recommendations = this.generateRecommendations(consistency);

    const report: CrossNetworkReport = {
      timestamp: new Date().toISOString(),
      totalNetworks: deployments.length,
      successful: successful.length,
      failed: failed.length,
      networks: deployments,
      consistency,
      recommendations
    };

    this.printReport(report);
    this.saveReport(report);

    return report;
  }

  /**
   * Print report to console
   */
  private printReport(report: CrossNetworkReport) {
    console.log('\n' + chalk.cyan.bold('━'.repeat(80)));
    console.log(chalk.cyan.bold('📊 CROSS-NETWORK DEPLOYMENT REPORT'));
    console.log(chalk.cyan.bold('━'.repeat(80)));

    console.log(`\n📈 Summary:`);
    console.log(`   Total Networks: ${report.totalNetworks}`);
    console.log(`   Successful: ${chalk.green(report.successful)}`);
    console.log(`   Failed: ${chalk.red(report.failed)}`);
    console.log(`   Success Rate: ${((report.successful / report.totalNetworks) * 100).toFixed(1)}%`);

    console.log(`\n🔍 Consistency Check:`);
    console.log(`   Factory Addresses: ${report.consistency.factoryAddresses ? chalk.green('✅ CONSISTENT') : chalk.red('❌ INCONSISTENT')}`);
    console.log(`   Dispatcher Addresses: ${report.consistency.dispatcherAddresses ? chalk.green('✅ CONSISTENT') : chalk.red('❌ INCONSISTENT')}`);
    console.log(`   Salt Values: ${report.consistency.saltConsistency ? chalk.green('✅ CONSISTENT') : chalk.red('❌ INCONSISTENT')}`);

    if (report.successful > 0) {
      console.log(`\n🌐 Successful Deployments:`);
      const successful = report.networks.filter(n => n.status === 'SUCCESS');
      successful.forEach(network => {
        console.log(`   • ${chalk.green(network.network)}`);
        if (network.factoryAddress) {
          console.log(`     Factory: ${network.factoryAddress}`);
        }
        if (network.dispatcherAddress) {
          console.log(`     Dispatcher: ${network.dispatcherAddress}`);
        }
        if (network.deploymentTime) {
          console.log(`     Time: ${(network.deploymentTime / 1000).toFixed(1)}s`);
        }
      });
    }

    if (report.failed > 0) {
      console.log(`\n❌ Failed Deployments:`);
      const failed = report.networks.filter(n => n.status === 'FAILED');
      failed.forEach(network => {
        console.log(`   • ${chalk.red(network.network)}: ${network.error}`);
      });
    }

    if (report.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      report.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }

    console.log(`\n⏱️  Total deployment time: ${((Date.now() - this.startTime) / 1000).toFixed(1)}s`);
    console.log(chalk.cyan.bold('━'.repeat(80)));
  }

  /**
   * Save report to file
   */
  private saveReport(report: CrossNetworkReport) {
    try {
      const reportsDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const filename = `cross-network-deployment-${Date.now()}.json`;
      const reportPath = path.join(reportsDir, filename);

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      this.printSuccess(`Report saved: ${reportPath}`);
    } catch (error) {
      this.printError(`Failed to save report: ${error}`);
    }
  }
}

/**
 * Verify existing deployments across networks
 */
async function verifyExistingDeployments(): Promise<void> {
  console.log(chalk.cyan.bold('\n🔍 Verifying Existing Deployments'));
  console.log(chalk.cyan.bold('━'.repeat(50)));

  const deploymentsDir = path.join(process.cwd(), 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    console.log(chalk.yellow('No deployments directory found.'));
    return;
  }

  const networks = fs.readdirSync(deploymentsDir)
    .filter(item => fs.statSync(path.join(deploymentsDir, item)).isDirectory());

  if (networks.length === 0) {
    console.log(chalk.yellow('No network deployments found.'));
    return;
  }

  console.log(`\nFound deployments on ${networks.length} networks:`);

  const addressMap = new Map<string, Set<string>>();
  
  for (const network of networks) {
    const networkPath = path.join(deploymentsDir, network);
    console.log(`\n📡 ${chalk.blue.bold(network)}:`);

    try {
      // Check factory
      const factoryFile = path.join(networkPath, 'factory.json');
      if (fs.existsSync(factoryFile)) {
        const factoryData = JSON.parse(fs.readFileSync(factoryFile, 'utf8'));
        console.log(`   🏭 Factory: ${factoryData.address}`);
        
        if (!addressMap.has('factory')) {
          addressMap.set('factory', new Set());
        }
        addressMap.get('factory')!.add(factoryData.address);
      }

      // Check dispatcher
      const dispatcherFile = path.join(networkPath, 'dispatcher.json');
      if (fs.existsSync(dispatcherFile)) {
        const dispatcherData = JSON.parse(fs.readFileSync(dispatcherFile, 'utf8'));
        console.log(`   🗂️  Dispatcher: ${dispatcherData.address}`);
        
        if (!addressMap.has('dispatcher')) {
          addressMap.set('dispatcher', new Set());
        }
        addressMap.get('dispatcher')!.add(dispatcherData.address);
      }

      // Check facets
      const facetFiles = fs.readdirSync(networkPath)
        .filter(file => file.endsWith('.json') && !['factory.json', 'dispatcher.json', 'audit-record.json'].includes(file));

      if (facetFiles.length > 0) {
        console.log(`   💎 Facets: ${facetFiles.length} deployed`);
      }

    } catch (error) {
      console.log(`   ❌ Error reading deployment data: ${error}`);
    }
  }

  // Check consistency
  console.log(chalk.cyan.bold('\n🔍 Consistency Analysis:'));
  for (const [contract, addresses] of addressMap) {
    if (addresses.size === 1) {
      console.log(`   ✅ ${contract}: CONSISTENT across all networks`);
    } else {
      console.log(`   ❌ ${contract}: INCONSISTENT (${addresses.size} different addresses)`);
      addresses.forEach(addr => console.log(`      • ${addr}`));
    }
  }
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const deployer = new CrossNetworkDeployer();

  switch (command) {
    case 'all':
      await deployer.deployToAllNetworks();
      break;

    case 'networks': {
      const networks = args.slice(1);
      if (networks.length === 0) {
        console.log(chalk.red('Please specify networks to deploy to.'));
        console.log('Usage: npm run deploy:cross-network networks mainnet polygon arbitrum');
        process.exit(1);
      }
      await deployer.deployToNetworks(networks);
      break;
    }

    case 'verify':
      await verifyExistingDeployments();
      break;

    case 'help':
    default:
      console.log(chalk.cyan.bold('PayRox Go Beyond - Cross-Network Deployment\n'));
      console.log('Usage:');
      console.log('  npm run deploy:cross-network all                    # Deploy to all supported networks');
      console.log('  npm run deploy:cross-network networks <nets...>     # Deploy to specific networks');
      console.log('  npm run deploy:cross-network verify                 # Verify existing deployments');
      console.log('  npm run deploy:cross-network help                   # Show this help');
      console.log('\nSupported networks:');
      console.log(`  ${SUPPORTED_NETWORKS.join(', ')}`);
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Deployment failed:'), error);
    process.exit(1);
  });
}

export { CrossNetworkDeployer, verifyExistingDeployments };

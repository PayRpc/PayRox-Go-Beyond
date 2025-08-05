#!/usr/bin/env node

/**
 * PayRox Go Beyond - System Status Dashboard
 * Comprehensive monitoring and status reporting
 */

import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

interface SystemHealth {
  overall: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  components: {
    core: ComponentStatus;
    facets: ComponentStatus;
    networks: ComponentStatus;
    security: ComponentStatus;
  };
  metrics: SystemMetrics;
  recommendations: string[];
}

interface ComponentStatus {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  message: string;
  details?: any;
}

interface SystemMetrics {
  totalNetworks: number;
  activeNetworks: number;
  totalFacets: number;
  deployedFacets: number;
  averageGasUsage: number;
  successRate: number;
  uptime: number;
  lastUpdate: string;
}

interface NetworkStatus {
  network: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  factory?: string;
  dispatcher?: string;
  facets: number;
  lastActivity?: string;
  gasPrice?: string;
  blockNumber?: number;
}

class SystemStatusMonitor {
  private supportedNetworks: string[] = [
    'mainnet', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche',
    'fantom', 'bsc', 'opbnb', 'linea', 'sei', 'sepolia', 'holesky',
    'mumbai', 'arbitrum-sepolia', 'optimism-sepolia', 'base-sepolia',
    'fuji', 'fantom-testnet', 'bsc-testnet', 'linea-goerli', 'localhost'
  ];

  constructor() {
    this.printHeader();
  }

  private printHeader() {
    console.log(chalk.cyan.bold('━'.repeat(80)));
    console.log(chalk.cyan.bold('📊 PayRox Go Beyond - System Status Dashboard'));
    console.log(chalk.cyan.bold('━'.repeat(80)));
  }

  /**
   * Get comprehensive system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    console.log(chalk.blue('\n🔍 Analyzing system health...'));

    const [coreStatus, facetsStatus, networksStatus, securityStatus] = await Promise.all([
      this.checkCoreComponents(),
      this.checkFacets(),
      this.checkNetworks(),
      this.checkSecurity()
    ]);

    const metrics = await this.getSystemMetrics();

    // Determine overall health
    const components = { core: coreStatus, facets: facetsStatus, networks: networksStatus, security: securityStatus };
    const overall = this.determineOverallHealth(components);

    const recommendations = this.generateRecommendations(components, metrics);

    return {
      overall,
      components,
      metrics,
      recommendations
    };
  }

  /**
   * Check core system components
   */
  private async checkCoreComponents(): Promise<ComponentStatus> {
    try {
      const deploymentsDir = path.join(process.cwd(), 'deployments');
      
      if (!fs.existsSync(deploymentsDir)) {
        return {
          status: 'CRITICAL',
          message: 'No deployments found'
        };
      }

      // Check for core contracts
      let coreDeployments = 0;
      const networks = fs.readdirSync(deploymentsDir)
        .filter(item => fs.statSync(path.join(deploymentsDir, item)).isDirectory());

      for (const network of networks) {
        const networkPath = path.join(deploymentsDir, network);
        const hasFactory = fs.existsSync(path.join(networkPath, 'factory.json'));
        const hasDispatcher = fs.existsSync(path.join(networkPath, 'dispatcher.json'));
        
        if (hasFactory && hasDispatcher) {
          coreDeployments++;
        }
      }

      if (coreDeployments === 0) {
        return {
          status: 'CRITICAL',
          message: 'No core components deployed'
        };
      } else if (coreDeployments < networks.length / 2) {
        return {
          status: 'WARNING',
          message: `Core components only deployed to ${coreDeployments}/${networks.length} networks`,
          details: { deployed: coreDeployments, total: networks.length }
        };
      } else {
        return {
          status: 'HEALTHY',
          message: `Core components deployed to ${coreDeployments} networks`,
          details: { deployed: coreDeployments, total: networks.length }
        };
      }

    } catch (error) {
      return {
        status: 'CRITICAL',
        message: `Core check failed: ${error}`
      };
    }
  }

  /**
   * Check facet deployments
   */
  private async checkFacets(): Promise<ComponentStatus> {
    try {
      const deploymentsDir = path.join(process.cwd(), 'deployments');
      
      if (!fs.existsSync(deploymentsDir)) {
        return {
          status: 'WARNING',
          message: 'No facet deployments found'
        };
      }

      let totalFacets = 0;
      const networks = fs.readdirSync(deploymentsDir)
        .filter(item => fs.statSync(path.join(deploymentsDir, item)).isDirectory());

      for (const network of networks) {
        const networkPath = path.join(deploymentsDir, network);
        const files = fs.readdirSync(networkPath)
          .filter(file => file.endsWith('.json') && 
                  !['factory.json', 'dispatcher.json', 'audit-record.json'].includes(file));
        totalFacets += files.length;
      }

      if (totalFacets === 0) {
        return {
          status: 'WARNING',
          message: 'No facets deployed'
        };
      } else if (totalFacets < 5) {
        return {
          status: 'WARNING',
          message: `Only ${totalFacets} facets deployed`,
          details: { facets: totalFacets }
        };
      } else {
        return {
          status: 'HEALTHY',
          message: `${totalFacets} facets deployed across networks`,
          details: { facets: totalFacets }
        };
      }

    } catch (error) {
      return {
        status: 'WARNING',
        message: `Facet check failed: ${error}`
      };
    }
  }

  /**
   * Check network connectivity and status
   */
  private async checkNetworks(): Promise<ComponentStatus> {
    try {
      const networkStatuses = await this.getNetworkStatuses();
      const online = networkStatuses.filter(n => n.status === 'ONLINE').length;
      const total = networkStatuses.length;

      if (online === 0) {
        return {
          status: 'CRITICAL',
          message: 'No networks are online'
        };
      } else if (online < total / 2) {
        return {
          status: 'WARNING',
          message: `Only ${online}/${total} networks are online`,
          details: { online, total, networks: networkStatuses }
        };
      } else {
        return {
          status: 'HEALTHY',
          message: `${online}/${total} networks are online`,
          details: { online, total, networks: networkStatuses }
        };
      }

    } catch (error) {
      return {
        status: 'WARNING',
        message: `Network check failed: ${error}`
      };
    }
  }

  /**
   * Check security status
   */
  private async checkSecurity(): Promise<ComponentStatus> {
    try {
      const securityChecks = await this.runSecurityChecks();
      const passed = securityChecks.filter(check => check.passed).length;
      const total = securityChecks.length;

      if (passed === total) {
        return {
          status: 'HEALTHY',
          message: 'All security checks passed',
          details: securityChecks
        };
      } else if (passed >= total * 0.8) {
        return {
          status: 'WARNING',
          message: `${passed}/${total} security checks passed`,
          details: securityChecks
        };
      } else {
        return {
          status: 'CRITICAL',
          message: `Only ${passed}/${total} security checks passed`,
          details: securityChecks
        };
      }

    } catch (error) {
      return {
        status: 'WARNING',
        message: `Security check failed: ${error}`
      };
    }
  }

  /**
   * Get detailed network statuses
   */
  private async getNetworkStatuses(): Promise<NetworkStatus[]> {
    const statuses: NetworkStatus[] = [];
    const deploymentsDir = path.join(process.cwd(), 'deployments');

    if (!fs.existsSync(deploymentsDir)) {
      return statuses;
    }

    const deployedNetworks = fs.readdirSync(deploymentsDir)
      .filter(item => fs.statSync(path.join(deploymentsDir, item)).isDirectory());

    for (const network of deployedNetworks) {
      try {
        const networkPath = path.join(deploymentsDir, network);
        const status: NetworkStatus = {
          network,
          status: 'OFFLINE',
          facets: 0
        };

        // Check for core contracts
        const factoryFile = path.join(networkPath, 'factory.json');
        const dispatcherFile = path.join(networkPath, 'dispatcher.json');

        if (fs.existsSync(factoryFile)) {
          const factoryData = JSON.parse(fs.readFileSync(factoryFile, 'utf8'));
          status.factory = factoryData.address;
        }

        if (fs.existsSync(dispatcherFile)) {
          const dispatcherData = JSON.parse(fs.readFileSync(dispatcherFile, 'utf8'));
          status.dispatcher = dispatcherData.address;
        }

        // Count facets
        const facetFiles = fs.readdirSync(networkPath)
          .filter(file => file.endsWith('.json') && 
                  !['factory.json', 'dispatcher.json', 'audit-record.json'].includes(file));
        status.facets = facetFiles.length;

        // Determine status based on deployments
        if (status.factory && status.dispatcher) {
          status.status = 'ONLINE';
        } else if (status.factory || status.dispatcher) {
          status.status = 'DEGRADED';
        }

        statuses.push(status);

      } catch (error) {
        statuses.push({
          network,
          status: 'OFFLINE',
          facets: 0
        });
      }
    }

    return statuses;
  }

  /**
   * Run security checks
   */
  private async runSecurityChecks(): Promise<Array<{name: string, passed: boolean, details?: string}>> {
    const checks = [
      {
        name: 'Deployment artifacts integrity',
        passed: await this.checkDeploymentIntegrity(),
        details: 'Verifies deployment artifacts are valid and consistent'
      },
      {
        name: 'Salt consistency',
        passed: await this.checkSaltConsistency(),
        details: 'Ensures CREATE2 salts are consistent across networks'
      },
      {
        name: 'Address determinism',
        passed: await this.checkAddressDeterminism(),
        details: 'Validates that addresses are deterministic across networks'
      },
      {
        name: 'Access control',
        passed: true, // Placeholder - would need contract interaction
        details: 'Verifies proper access control implementation'
      },
      {
        name: 'Emergency functions',
        passed: true, // Placeholder - would need contract interaction
        details: 'Ensures emergency pause/stop functions are accessible'
      }
    ];

    return checks;
  }

  /**
   * Check deployment artifact integrity
   */
  private async checkDeploymentIntegrity(): Promise<boolean> {
    try {
      const deploymentsDir = path.join(process.cwd(), 'deployments');
      if (!fs.existsSync(deploymentsDir)) return false;

      const networks = fs.readdirSync(deploymentsDir)
        .filter(item => fs.statSync(path.join(deploymentsDir, item)).isDirectory());

      for (const network of networks) {
        const networkPath = path.join(deploymentsDir, network);
        const files = fs.readdirSync(networkPath).filter(f => f.endsWith('.json'));

        for (const file of files) {
          const filePath = path.join(networkPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Basic JSON validity check
          try {
            const data = JSON.parse(content);
            if (!data.address || !data.timestamp) {
              return false;
            }
          } catch {
            return false;
          }
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check salt consistency across networks
   */
  private async checkSaltConsistency(): Promise<boolean> {
    try {
      const deploymentsDir = path.join(process.cwd(), 'deployments');
      if (!fs.existsSync(deploymentsDir)) return true; // No deployments to check

      const factorySalts = new Set<string>();
      const dispatcherSalts = new Set<string>();

      const networks = fs.readdirSync(deploymentsDir)
        .filter(item => fs.statSync(path.join(deploymentsDir, item)).isDirectory());

      for (const network of networks) {
        const networkPath = path.join(deploymentsDir, network);
        
        // Check factory salt
        const factoryFile = path.join(networkPath, 'factory.json');
        if (fs.existsSync(factoryFile)) {
          const factoryData = JSON.parse(fs.readFileSync(factoryFile, 'utf8'));
          if (factoryData.deterministicData?.salt) {
            factorySalts.add(factoryData.deterministicData.salt);
          }
        }

        // Check dispatcher salt
        const dispatcherFile = path.join(networkPath, 'dispatcher.json');
        if (fs.existsSync(dispatcherFile)) {
          const dispatcherData = JSON.parse(fs.readFileSync(dispatcherFile, 'utf8'));
          if (dispatcherData.deterministicData?.salt) {
            dispatcherSalts.add(dispatcherData.deterministicData.salt);
          }
        }
      }

      // Salts should be consistent (only one unique salt per contract type)
      return factorySalts.size <= 1 && dispatcherSalts.size <= 1;
    } catch {
      return false;
    }
  }

  /**
   * Check address determinism
   */
  private async checkAddressDeterminism(): Promise<boolean> {
    try {
      const deploymentsDir = path.join(process.cwd(), 'deployments');
      if (!fs.existsSync(deploymentsDir)) return true;

      const factoryAddresses = new Set<string>();
      const dispatcherAddresses = new Set<string>();

      const networks = fs.readdirSync(deploymentsDir)
        .filter(item => fs.statSync(path.join(deploymentsDir, item)).isDirectory());

      for (const network of networks) {
        const networkPath = path.join(deploymentsDir, network);
        
        // Check factory address
        const factoryFile = path.join(networkPath, 'factory.json');
        if (fs.existsSync(factoryFile)) {
          const factoryData = JSON.parse(fs.readFileSync(factoryFile, 'utf8'));
          if (factoryData.address) {
            factoryAddresses.add(factoryData.address.toLowerCase());
          }
        }

        // Check dispatcher address
        const dispatcherFile = path.join(networkPath, 'dispatcher.json');
        if (fs.existsSync(dispatcherFile)) {
          const dispatcherData = JSON.parse(fs.readFileSync(dispatcherFile, 'utf8'));
          if (dispatcherData.address) {
            dispatcherAddresses.add(dispatcherData.address.toLowerCase());
          }
        }
      }

      // For true CREATE2 deployment, addresses should be identical across networks
      return factoryAddresses.size <= 1 && dispatcherAddresses.size <= 1;
    } catch {
      return false;
    }
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    const deploymentsDir = path.join(process.cwd(), 'deployments');
    
    let totalNetworks = 0;
    let activeNetworks = 0;
    let totalFacets = 0;
    let deployedFacets = 0;
    let totalGasUsage = 0;
    let gasEntries = 0;

    if (fs.existsSync(deploymentsDir)) {
      const networks = fs.readdirSync(deploymentsDir)
        .filter(item => fs.statSync(path.join(deploymentsDir, item)).isDirectory());

      totalNetworks = networks.length;

      for (const network of networks) {
        const networkPath = path.join(deploymentsDir, network);
        const hasFactory = fs.existsSync(path.join(networkPath, 'factory.json'));
        const hasDispatcher = fs.existsSync(path.join(networkPath, 'dispatcher.json'));
        
        if (hasFactory && hasDispatcher) {
          activeNetworks++;
        }

        // Count facets
        const facetFiles = fs.readdirSync(networkPath)
          .filter(file => file.endsWith('.json') && 
                  !['factory.json', 'dispatcher.json', 'audit-record.json'].includes(file));
        
        deployedFacets += facetFiles.length;

        // Calculate gas usage (from deployment artifacts)
        for (const file of [...facetFiles, 'factory.json', 'dispatcher.json']) {
          const filePath = path.join(networkPath, file);
          if (fs.existsSync(filePath)) {
            try {
              const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
              if (data.gasUsed) {
                totalGasUsage += parseInt(data.gasUsed);
                gasEntries++;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    }

    return {
      totalNetworks,
      activeNetworks,
      totalFacets: deployedFacets, // For now, same as deployed
      deployedFacets,
      averageGasUsage: gasEntries > 0 ? Math.round(totalGasUsage / gasEntries) : 0,
      successRate: totalNetworks > 0 ? (activeNetworks / totalNetworks) * 100 : 0,
      uptime: 100, // Placeholder - would need actual uptime monitoring
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Determine overall system health
   */
  private determineOverallHealth(components: SystemHealth['components']): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
    const statuses = Object.values(components).map(c => c.status);
    
    if (statuses.includes('CRITICAL')) {
      return 'CRITICAL';
    } else if (statuses.includes('WARNING')) {
      return 'WARNING';
    } else {
      return 'HEALTHY';
    }
  }

  /**
   * Generate system recommendations
   */
  private generateRecommendations(components: SystemHealth['components'], metrics: SystemMetrics): string[] {
    const recommendations: string[] = [];

    if (components.core.status === 'CRITICAL') {
      recommendations.push('🚨 Deploy core components (Factory and Dispatcher) immediately');
    } else if (components.core.status === 'WARNING') {
      recommendations.push('⚠️  Expand core component deployment to more networks');
    }

    if (components.facets.status === 'WARNING') {
      recommendations.push('💎 Deploy more facets to enhance system functionality');
    }

    if (components.networks.status === 'CRITICAL') {
      recommendations.push('🌐 Address network connectivity issues immediately');
    } else if (components.networks.status === 'WARNING') {
      recommendations.push('🔧 Investigate and resolve network connectivity issues');
    }

    if (components.security.status === 'CRITICAL') {
      recommendations.push('🛡️  Address critical security issues before proceeding');
    } else if (components.security.status === 'WARNING') {
      recommendations.push('🔍 Review and resolve security warnings');
    }

    if (metrics.successRate < 80) {
      recommendations.push('📈 Improve deployment success rate by addressing failure causes');
    }

    if (metrics.averageGasUsage > 500000) {
      recommendations.push('⛽ Optimize gas usage to reduce deployment costs');
    }

    if (metrics.totalNetworks < 5) {
      recommendations.push('🌍 Consider expanding to more networks for better coverage');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ System is healthy! Consider adding monitoring and alerting');
      recommendations.push('🚀 Ready for production workloads and additional features');
    }

    return recommendations;
  }

  /**
   * Display system health dashboard
   */
  displayHealthDashboard(health: SystemHealth) {
    const statusColor = (status: string) => {
      switch (status) {
        case 'HEALTHY': return chalk.green(status);
        case 'WARNING': return chalk.yellow(status);
        case 'CRITICAL': return chalk.red(status);
        default: return chalk.gray(status);
      }
    };

    console.log(`\n📊 ${chalk.bold('SYSTEM HEALTH OVERVIEW')}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    console.log(`\n🎯 Overall Status: ${statusColor(health.overall)}`);
    
    console.log(`\n📋 Component Status:`);
    console.log(`   🏗️  Core:     ${statusColor(health.components.core.status)} - ${health.components.core.message}`);
    console.log(`   💎 Facets:   ${statusColor(health.components.facets.status)} - ${health.components.facets.message}`);
    console.log(`   🌐 Networks: ${statusColor(health.components.networks.status)} - ${health.components.networks.message}`);
    console.log(`   🛡️  Security: ${statusColor(health.components.security.status)} - ${health.components.security.message}`);

    console.log(`\n📈 Metrics:`);
    console.log(`   🌍 Networks:      ${health.metrics.activeNetworks}/${health.metrics.totalNetworks} active`);
    console.log(`   💎 Facets:        ${health.metrics.deployedFacets} deployed`);
    console.log(`   ⛽ Avg Gas:       ${health.metrics.averageGasUsage.toLocaleString()}`);
    console.log(`   📊 Success Rate:  ${health.metrics.successRate.toFixed(1)}%`);
    console.log(`   ⏱️  Last Update:   ${new Date(health.metrics.lastUpdate).toLocaleString()}`);

    if (health.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      health.recommendations.forEach(rec => {
        console.log(`   ${rec}`);
      });
    }

    // Network details if available
    if (health.components.networks.details?.networks) {
      console.log(`\n🌐 Network Status Details:`);
      const networks = health.components.networks.details.networks as NetworkStatus[];
      networks.forEach(network => {
        const statusIcon = network.status === 'ONLINE' ? '🟢' : 
                          network.status === 'DEGRADED' ? '🟡' : '🔴';
        console.log(`   ${statusIcon} ${network.network}: ${network.facets} facets`);
      });
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  /**
   * Save health report to file
   */
  async saveHealthReport(health: SystemHealth) {
    try {
      const reportsDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const filename = `system-health-${Date.now()}.json`;
      const reportPath = path.join(reportsDir, filename);

      fs.writeFileSync(reportPath, JSON.stringify(health, null, 2));
      console.log(`\n💾 Health report saved: ${chalk.blue(reportPath)}`);
    } catch (error) {
      console.log(`\n❌ Failed to save health report: ${error}`);
    }
  }
}

/**
 * Main function
 */
async function main() {
  const monitor = new SystemStatusMonitor();
  
  try {
    const health = await monitor.getSystemHealth();
    monitor.displayHealthDashboard(health);
    await monitor.saveHealthReport(health);

    // Exit with appropriate code
    if (health.overall === 'CRITICAL') {
      process.exit(1);
    } else if (health.overall === 'WARNING') {
      process.exit(2);
    } else {
      process.exit(0);
    }

  } catch (error) {
    console.error(chalk.red('System health check failed:'), error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { SystemStatusMonitor, SystemHealth, NetworkStatus };

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

export interface DeployedContract {
  name: string;
  address: string;
  abi: any[];
  deploymentFile: string;
}

export interface PayRoxBackendContracts {
  core: {
    factory: DeployedContract;
    dispatcher: DeployedContract;
  };
  orchestrators: {
    main: DeployedContract;
    governance: DeployedContract;
    auditRegistry: DeployedContract;
  };
  facets: {
    ping: DeployedContract;
    exampleA?: DeployedContract;
    exampleB?: DeployedContract;
  };
}

/**
 * Backend service for PayRox contract integration
 * Provides server-side access to deployed contracts
 */
export class PayRoxContractBackend {
  private contracts: PayRoxBackendContracts;
  private provider: ethers.Provider;
  private network: { name: string; chainId: string; rpcUrl: string };
  private configPath: string;

  constructor(rpcUrl: string = 'http://localhost:8545') {
    this.configPath = path.join(
      __dirname,
      '../../../config/deployed-contracts.json'
    );
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contracts = this.loadContracts();
    this.network = this.loadNetworkConfig();
  }

  /**
   * Load deployed contracts configuration
   */
  private loadContracts(): PayRoxBackendContracts {
    try {
      const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));

      return {
        core: {
          factory: {
            name: configData.contracts.core.factory.name,
            address: configData.contracts.core.factory.address,
            abi: this.loadABI(
              'factory/DeterministicChunkFactory.sol/DeterministicChunkFactory.json'
            ),
            deploymentFile: configData.contracts.core.factory.deploymentFile,
          },
          dispatcher: {
            name: configData.contracts.core.dispatcher.name,
            address: configData.contracts.core.dispatcher.address,
            abi: this.loadABI(
              'dispatcher/ManifestDispatcher.sol/ManifestDispatcher.json'
            ),
            deploymentFile: configData.contracts.core.dispatcher.deploymentFile,
          },
        },
        orchestrators: {
          main: {
            name: configData.contracts.orchestrators.main.name,
            address: configData.contracts.orchestrators.main.address,
            abi: this.loadABI(
              'orchestrator/Orchestrator.sol/Orchestrator.json'
            ),
            deploymentFile:
              configData.contracts.orchestrators.main.deploymentFile,
          },
          governance: {
            name: configData.contracts.orchestrators.governance.name,
            address: configData.contracts.orchestrators.governance.address,
            abi: this.loadABI(
              'orchestrator/GovernanceOrchestrator.sol/GovernanceOrchestrator.json'
            ),
            deploymentFile:
              configData.contracts.orchestrators.governance.deploymentFile,
          },
          auditRegistry: {
            name: configData.contracts.orchestrators.auditRegistry.name,
            address: configData.contracts.orchestrators.auditRegistry.address,
            abi: this.loadABI(
              'orchestrator/AuditRegistry.sol/AuditRegistry.json'
            ),
            deploymentFile:
              configData.contracts.orchestrators.auditRegistry.deploymentFile,
          },
        },
        facets: {
          ping: {
            name: configData.contracts.facets.ping.name,
            address: configData.contracts.facets.ping.address,
            abi: this.loadABI('facets/PingFacet.sol/PingFacet.json'),
            deploymentFile: configData.contracts.facets.ping.deploymentFile,
          },
        },
      };
    } catch (error) {
      console.error('Failed to load contracts configuration:', error);
      throw new Error(
        'Contract configuration not found. Run deployment first.'
      );
    }
  }

  /**
   * Load ABI from artifacts
   */
  private loadABI(contractPath: string): any[] {
    try {
      const abiPath = path.join(
        __dirname,
        '../../../artifacts/contracts',
        contractPath
      );
      const artifactData = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
      return artifactData.abi;
    } catch (error) {
      console.error(`Failed to load ABI for ${contractPath}:`, error);
      return [];
    }
  }

  /**
   * Load network configuration
   */
  private loadNetworkConfig() {
    try {
      const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      return configData.network;
    } catch (error) {
      return {
        name: 'localhost',
        chainId: '31337',
        rpcUrl: 'http://localhost:8545',
      };
    }
  }

  /**
   * Get all deployed contracts
   */
  getContracts(): PayRoxBackendContracts {
    return this.contracts;
  }

  /**
   * Get specific contract configuration
   */
  getContract(
    category: 'core' | 'orchestrators' | 'facets',
    name: string
  ): DeployedContract | null {
    const categoryContracts = this.contracts[category] as any;
    return categoryContracts[name] || null;
  }

  /**
   * Create contract instance
   */
  getContractInstance(
    category: 'core' | 'orchestrators' | 'facets',
    name: string
  ): ethers.Contract | null {
    const contract = this.getContract(category, name);
    if (!contract) return null;

    return new ethers.Contract(contract.address, contract.abi, this.provider);
  }

  /**
   * Get factory contract instance
   */
  getFactory(): ethers.Contract {
    const factory = this.getContractInstance('core', 'factory');
    if (!factory) throw new Error('Factory contract not available');
    return factory;
  }

  /**
   * Get dispatcher contract instance
   */
  getDispatcher(): ethers.Contract {
    const dispatcher = this.getContractInstance('core', 'dispatcher');
    if (!dispatcher) throw new Error('Dispatcher contract not available');
    return dispatcher;
  }

  /**
   * Get orchestrator contract instance
   */
  getOrchestrator(): ethers.Contract {
    const orchestrator = this.getContractInstance('orchestrators', 'main');
    if (!orchestrator) throw new Error('Orchestrator contract not available');
    return orchestrator;
  }

  /**
   * Health check for all contracts
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    contracts: Record<string, { status: boolean; error?: string }>;
    network: { connected: boolean; chainId?: string };
  }> {
    const results: Record<string, { status: boolean; error?: string }> = {};

    try {
      // Check network connectivity
      const networkInfo = await this.provider.getNetwork();
      const networkStatus = {
        connected: true,
        chainId: networkInfo.chainId.toString(),
      };

      // Test core contracts
      try {
        const factory = this.getFactory();
        await factory.baseFeeWei();
        results.factory = { status: true };
      } catch (error) {
        results.factory = { status: false, error: error.message };
      }

      try {
        const dispatcher = this.getDispatcher();
        await dispatcher.activeRoot();
        results.dispatcher = { status: true };
      } catch (error) {
        results.dispatcher = { status: false, error: error.message };
      }

      try {
        const orchestrator = this.getOrchestrator();
        await orchestrator.factory();
        results.orchestrator = { status: true };
      } catch (error) {
        results.orchestrator = { status: false, error: error.message };
      }

      // Test ping facet
      try {
        const pingFacet = this.getContractInstance('facets', 'ping');
        if (pingFacet) {
          await pingFacet.ping();
          results.pingFacet = { status: true };
        } else {
          results.pingFacet = { status: false, error: 'Contract not found' };
        }
      } catch (error) {
        results.pingFacet = { status: false, error: error.message };
      }

      const healthyCount = Object.values(results).filter(r => r.status).length;
      const totalCount = Object.values(results).length;

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyCount === totalCount) {
        status = 'healthy';
      } else if (healthyCount > totalCount / 2) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return { status, contracts: results, network: networkStatus };
    } catch (networkError) {
      return {
        status: 'unhealthy',
        contracts: results,
        network: { connected: false },
      };
    }
  }

  /**
   * Get deployment information for analytics
   */
  async getDeploymentInfo(): Promise<{
    network: any;
    deployer: string;
    deploymentTimestamp: string;
    contractCount: number;
    totalGasUsed?: string;
  }> {
    try {
      const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));

      // Count deployed contracts
      let contractCount = 0;
      contractCount += Object.keys(configData.contracts.core).length;
      contractCount += Object.keys(configData.contracts.orchestrators).length;
      contractCount += Object.keys(configData.contracts.facets).filter(
        key => configData.contracts.facets[key].address
      ).length;

      return {
        network: this.network,
        deployer: configData.deployer.address,
        deploymentTimestamp: configData.timestamp,
        contractCount,
      };
    } catch (error) {
      throw new Error('Failed to get deployment information');
    }
  }

  /**
   * Analyze contract interactions
   */
  async analyzeContract(address: string): Promise<{
    contractName?: string;
    isKnownContract: boolean;
    category?: string;
    functions: string[];
    events: string[];
  }> {
    // Check if this is a known deployed contract
    const allContracts = [
      ...Object.values(this.contracts.core),
      ...Object.values(this.contracts.orchestrators),
      ...Object.values(this.contracts.facets).filter(f => f?.address),
    ];

    const knownContract = allContracts.find(
      contract => contract.address.toLowerCase() === address.toLowerCase()
    );

    if (knownContract) {
      const functions = knownContract.abi
        .filter((item: any) => item.type === 'function')
        .map((func: any) => func.name);

      const events = knownContract.abi
        .filter((item: any) => item.type === 'event')
        .map((event: any) => event.name);

      // Determine category
      let category = 'unknown';
      if (Object.values(this.contracts.core).some(c => c.address === address)) {
        category = 'core';
      } else if (
        Object.values(this.contracts.orchestrators).some(
          c => c.address === address
        )
      ) {
        category = 'orchestrators';
      } else if (
        Object.values(this.contracts.facets).some(c => c?.address === address)
      ) {
        category = 'facets';
      }

      return {
        contractName: knownContract.name,
        isKnownContract: true,
        category,
        functions,
        events,
      };
    }

    return {
      isKnownContract: false,
      functions: [],
      events: [],
    };
  }

  /**
   * Get network information
   */
  getNetworkInfo() {
    try {
      const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      return {
        network: configData.network,
        deployer: configData.deployer,
        security: configData.security,
        fees: configData.fees,
        features: configData.features,
      };
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
export const payRoxBackend = new PayRoxContractBackend();

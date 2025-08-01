import { ethers } from 'ethers';

// Import deployed contracts configuration
import deployedContracts from '../../../config/deployed-contracts.json';

// Import contract ABIs
import ManifestDispatcherABI from '../../../artifacts/contracts/dispatcher/ManifestDispatcher.sol/ManifestDispatcher.json';
import PingFacetABI from '../../../artifacts/contracts/facets/PingFacet.sol/PingFacet.json';
import DeterministicChunkFactoryABI from '../../../artifacts/contracts/factory/DeterministicChunkFactory.sol/DeterministicChunkFactory.json';
import AuditRegistryABI from '../../../artifacts/contracts/orchestrator/AuditRegistry.sol/AuditRegistry.json';
import GovernanceOrchestratorABI from '../../../artifacts/contracts/orchestrator/GovernanceOrchestrator.sol/GovernanceOrchestrator.json';
import OrchestratorABI from '../../../artifacts/contracts/orchestrator/Orchestrator.sol/Orchestrator.json';

export interface ContractConfig {
  name: string;
  address: string;
  abi: any[];
  contract?: ethers.Contract;
}

export interface PayRoxContracts {
  core: {
    factory: ContractConfig;
    dispatcher: ContractConfig;
  };
  orchestrators: {
    main: ContractConfig;
    governance: ContractConfig;
    auditRegistry: ContractConfig;
  };
  facets: {
    ping: ContractConfig;
    exampleA?: ContractConfig;
    exampleB?: ContractConfig;
  };
}

/**
 * PayRox Contract Configuration Service
 * Provides unified access to all deployed contracts with ABIs
 */
export class PayRoxContractService {
  private provider: ethers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private contracts: PayRoxContracts;
  private network: { name: string; chainId: string; rpcUrl: string };

  constructor() {
    this.network = deployedContracts.network;
    this.contracts = this.initializeContracts();
  }

  /**
   * Initialize contract configurations with ABIs
   */
  private initializeContracts(): PayRoxContracts {
    return {
      core: {
        factory: {
          name: deployedContracts.contracts.core.factory.name,
          address: deployedContracts.contracts.core.factory.address,
          abi: DeterministicChunkFactoryABI.abi,
        },
        dispatcher: {
          name: deployedContracts.contracts.core.dispatcher.name,
          address: deployedContracts.contracts.core.dispatcher.address,
          abi: ManifestDispatcherABI.abi,
        },
      },
      orchestrators: {
        main: {
          name: deployedContracts.contracts.orchestrators.main.name,
          address: deployedContracts.contracts.orchestrators.main.address,
          abi: OrchestratorABI.abi,
        },
        governance: {
          name: deployedContracts.contracts.orchestrators.governance.name,
          address: deployedContracts.contracts.orchestrators.governance.address,
          abi: GovernanceOrchestratorABI.abi,
        },
        auditRegistry: {
          name: deployedContracts.contracts.orchestrators.auditRegistry.name,
          address:
            deployedContracts.contracts.orchestrators.auditRegistry.address,
          abi: AuditRegistryABI.abi,
        },
      },
      facets: {
        ping: {
          name: deployedContracts.contracts.facets.ping.name,
          address: deployedContracts.contracts.facets.ping.address,
          abi: PingFacetABI.abi,
        },
      },
    };
  }

  /**
   * Connect to blockchain provider
   */
  async connect(rpcUrl?: string): Promise<void> {
    const url = rpcUrl || this.network.rpcUrl;
    this.provider = new ethers.JsonRpcProvider(url);

    // Try to connect to MetaMask if available
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await provider.getSigner();
        this.provider = provider;
      } catch (error) {
        console.warn('MetaMask connection failed, using JSON RPC provider');
      }
    }

    // Initialize contract instances
    this.initializeContractInstances();
  }

  /**
   * Initialize contract instances with provider/signer
   */
  private initializeContractInstances(): void {
    const signerOrProvider = this.signer || this.provider;
    if (!signerOrProvider) return;

    // Core contracts
    this.contracts.core.factory.contract = new ethers.Contract(
      this.contracts.core.factory.address,
      this.contracts.core.factory.abi,
      signerOrProvider
    );

    this.contracts.core.dispatcher.contract = new ethers.Contract(
      this.contracts.core.dispatcher.address,
      this.contracts.core.dispatcher.abi,
      signerOrProvider
    );

    // Orchestrator contracts
    this.contracts.orchestrators.main.contract = new ethers.Contract(
      this.contracts.orchestrators.main.address,
      this.contracts.orchestrators.main.abi,
      signerOrProvider
    );

    this.contracts.orchestrators.governance.contract = new ethers.Contract(
      this.contracts.orchestrators.governance.address,
      this.contracts.orchestrators.governance.abi,
      signerOrProvider
    );

    this.contracts.orchestrators.auditRegistry.contract = new ethers.Contract(
      this.contracts.orchestrators.auditRegistry.address,
      this.contracts.orchestrators.auditRegistry.abi,
      signerOrProvider
    );

    // Facet contracts
    this.contracts.facets.ping.contract = new ethers.Contract(
      this.contracts.facets.ping.address,
      this.contracts.facets.ping.abi,
      signerOrProvider
    );
  }

  /**
   * Get all contract configurations
   */
  getContracts(): PayRoxContracts {
    return this.contracts;
  }

  /**
   * Get specific contract by category and name
   */
  getContract(
    category: 'core' | 'orchestrators' | 'facets',
    name: string
  ): ContractConfig | null {
    const categoryContracts = this.contracts[category] as any;
    return categoryContracts[name] || null;
  }

  /**
   * Get factory contract instance
   */
  getFactory(): ethers.Contract | null {
    return this.contracts.core.factory.contract || null;
  }

  /**
   * Get dispatcher contract instance
   */
  getDispatcher(): ethers.Contract | null {
    return this.contracts.core.dispatcher.contract || null;
  }

  /**
   * Get orchestrator contract instance
   */
  getOrchestrator(): ethers.Contract | null {
    return this.contracts.orchestrators.main.contract || null;
  }

  /**
   * Deploy a new contract using the factory
   */
  async deployContract(
    bytecode: string,
    constructorArgs: any[] = [],
    salt?: string
  ): Promise<{ address: string; transactionHash: string }> {
    const factory = this.getFactory();
    if (!factory) throw new Error('Factory not connected');

    const deploymentSalt = salt || ethers.randomBytes(32);
    const tx = await factory.deployChunk(
      bytecode,
      constructorArgs,
      deploymentSalt
    );
    const receipt = await tx.wait();

    // Get deployed address from events
    const deployedEvent = receipt.logs.find(
      (log: any) =>
        log.topics[0] === ethers.id('ChunkDeployed(bytes32,address,address)')
    );

    if (!deployedEvent) throw new Error('Deployment event not found');

    const address = ethers.getAddress('0x' + deployedEvent.topics[2].slice(26));

    return {
      address,
      transactionHash: receipt.hash,
    };
  }

  /**
   * Get network information
   */
  getNetwork() {
    return {
      ...this.network,
      deployer: deployedContracts.deployer,
      security: deployedContracts.security,
      fees: deployedContracts.fees,
      features: deployedContracts.features,
    };
  }

  /**
   * Test ping facet functionality
   */
  async testPingFacet(): Promise<{ success: boolean; response: string }> {
    try {
      const pingContract = this.contracts.facets.ping.contract;
      if (!pingContract) throw new Error('Ping facet not connected');

      const result = await pingContract.ping();
      return { success: true, response: result };
    } catch (error) {
      return { success: false, response: error.message };
    }
  }

  /**
   * Check if all contracts are deployed and accessible
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    contracts: Record<string, boolean>;
  }> {
    const results: Record<string, boolean> = {};

    try {
      // Test core contracts
      const factory = this.getFactory();
      if (factory) {
        await factory.baseFeeWei();
        results.factory = true;
      } else {
        results.factory = false;
      }

      const dispatcher = this.getDispatcher();
      if (dispatcher) {
        await dispatcher.activeRoot();
        results.dispatcher = true;
      } else {
        results.dispatcher = false;
      }

      // Test orchestrator
      const orchestrator = this.getOrchestrator();
      if (orchestrator) {
        await orchestrator.factory();
        results.orchestrator = true;
      } else {
        results.orchestrator = false;
      }

      // Test ping facet
      const pingResult = await this.testPingFacet();
      results.pingFacet = pingResult.success;

      const healthyCount = Object.values(results).filter(Boolean).length;
      const totalCount = Object.values(results).length;

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyCount === totalCount) {
        status = 'healthy';
      } else if (healthyCount > totalCount / 2) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return { status, contracts: results };
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'unhealthy', contracts: results };
    }
  }
}

// Create singleton instance
export const payRoxContracts = new PayRoxContractService();

// Export deployed contract configuration for direct access
export { deployedContracts };

declare global {
  interface Window {
    ethereum?: any;
  }
}

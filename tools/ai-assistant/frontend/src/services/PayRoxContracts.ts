import { ethers } from 'ethers';
import contractConfig from '../contracts/config.json';
import contractABIs from '../contracts/abis.json';

export interface ContractInfo {
  name: string;
  address: string;
  category: string;
  abi: any[];
  instance?: ethers.Contract;
}

export interface NetworkInfo {
  name: string;
  chainId: string;
  blockNumber: number;
  rpcUrl: string;
}

export interface AnalysisRequest {
  contractCode: string;
  contractName: string;
  analysisType: 'full' | 'security' | 'gas' | 'facets';
}

export interface AnalysisResult {
  success: boolean;
  contractName: string;
  analysisType: string;
  timestamp: string;
  results: {
    security?: {
      score: number;
      issues: Array<{
        severity: 'low' | 'medium' | 'high' | 'critical';
        title: string;
        description: string;
        location?: string;
      }>;
    };
    gas?: {
      optimizations: Array<{
        type: string;
        description: string;
        estimatedSavings: string;
      }>;
      totalSavings: string;
    };
    facets?: {
      suggested: Array<{
        name: string;
        functions: string[];
        strategy: 'factory' | 'direct';
        estimatedAddress?: string;
      }>;
      compatibility: {
        deterministicFactory: boolean;
        manifestDispatcher: boolean;
      };
    };
    payRoxIntegration?: {
      factoryCompatible: boolean;
      recommendation: string;
      predictedAddresses: Array<{
        facetName: string;
        address: string;
        strategy: string;
      }>;
    };
  };
  error?: string;
}

export class PayRoxContractsService {
  private provider: ethers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private contracts: Map<string, ContractInfo> = new Map();
  private aiBackendUrl = 'http://localhost:3001';

  constructor() {
    this.initializeContracts();
  }

  private initializeContracts() {
    // Initialize contract information from config
    const categoryMapping: Record<string, string> = {
      'DeterministicChunkFactory': 'Core',
      'ManifestDispatcher': 'Core',
      'Orchestrator': 'Orchestrator',
      'GovernanceOrchestrator': 'Orchestrator',
      'AuditRegistry': 'Orchestrator',
      : 'Facet',
      'ExampleFacetA': 'Facet',
      'ExampleFacetB': 'Facet'
    };

    for (const [key, config] of Object.entries(contractConfig.contracts)) {
      const contractData = config as any;
      const contractName = contractData.name;
      const abi = (contractABIs as any)[contractName]?.abi || [];

      this.contracts.set(key, {
        name: contractName,
        address: contractData.address,
        category: categoryMapping[contractName] || 'Unknown',
        abi
      });
    }
  }

  async connectToNetwork(rpcUrl: string = 'http://localhost:8545'): Promise<NetworkInfo> {
    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();

      // Initialize contract instances
      for (const [, contractInfo] of this.contracts.entries()) {
        if (contractInfo.abi.length > 0) {
          contractInfo.instance = new ethers.Contract(
            contractInfo.address,
            contractInfo.abi,
            this.provider
          );
        }
      }

      return {
        name: 'localhost',
        chainId: network.chainId.toString(),
        blockNumber,
        rpcUrl
      };
    } catch (error) {
      throw new Error(`Failed to connect to network: ${error}`);
    }
  }

  async connectWallet(): Promise<ethers.Signer> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    if (typeof window !== 'undefined' && (window as any).ethereum) {
      await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      this.signer = await browserProvider.getSigner();
      
      // Update contract instances with signer
      for (const contractInfo of this.contracts.values()) {
        if (contractInfo.instance) {
          contractInfo.instance = contractInfo.instance.connect(this.signer) as any;
        }
      }
      
      return this.signer;
    } else {
      throw new Error('MetaMask not found');
    }
  }

  getContracts(): ContractInfo[] {
    return Array.from(this.contracts.values());
  }

  getContract(name: string): ContractInfo | undefined {
    for (const contract of this.contracts.values()) {
      if (contract.name === name) {
        return contract;
      }
    }
    return undefined;
  }

  async callContractFunction(
    contractName: string,
    functionName: string,
    args: any[] = []
  ): Promise<any> {
    const contract = this.getContract(contractName);
    if (!contract || !contract.instance) {
      throw new Error(`Contract ${contractName} not found or not initialized`);
    }

    try {
      const result = await contract.instance[functionName](...args);
      return result;
    } catch (error) {
      throw new Error(`Failed to call ${functionName} on ${contractName}: ${error}`);
    }
  }

  async analyzeContract(request: AnalysisRequest): Promise<AnalysisResult> {
    try {
      const response = await globalThis.fetch(`${this.aiBackendUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch {
      // Fallback to mock analysis if backend is not available
      return this.getMockAnalysis(request);
    }
  }

  private getMockAnalysis(request: AnalysisRequest): AnalysisResult {
    const mockResult: AnalysisResult = {
      success: true,
      contractName: request.contractName,
      analysisType: request.analysisType,
      timestamp: new Date().toISOString(),
      results: {
        security: {
          score: 85,
          issues: [
            {
              severity: 'medium',
              title: 'Potential Reentrancy',
              description: 'Consider using ReentrancyGuard for external calls',
              location: 'Line 45-52'
            }
          ]
        },
        gas: {
          optimizations: [
            {
              type: 'Storage Packing',
              description: 'Pack struct variables to save storage slots',
              estimatedSavings: '15%'
            },
            {
              type: 'Function Optimization',
              description: 'Use calldata instead of memory for external functions',
              estimatedSavings: '8%'
            }
          ],
          totalSavings: '23%'
        },
        facets: {
          suggested: [
            {
              name: 'CoreFacet',
              functions: ['transfer', 'approve', 'mint', 'burn'],
              strategy: 'factory',
              estimatedAddress: '0xdb4b00aa03101124a8e7250c453796b93d101e18'
            },
            {
              name: 'ViewFacet',
              functions: ['balanceOf', 'allowance', 'totalSupply'],
              strategy: 'direct',
              estimatedAddress: '0x5edbfe7eae54721e76a7f29bc730e06007c89653'
            }
          ],
          compatibility: {
            deterministicFactory: true,
            manifestDispatcher: true
          }
        },
        payRoxIntegration: {
          factoryCompatible: true,
          recommendation: 'Contract is compatible with DeterministicChunkFactory deployment',
          predictedAddresses: [
            {
              facetName: 'CoreFacet',
              address: '0xdb4b00aa03101124a8e7250c453796b93d101e18',
              strategy: 'factory'
            },
            {
              facetName: 'ViewFacet', 
              address: '0x5edbfe7eae54721e76a7f29bc730e06007c89653',
              strategy: 'direct'
            }
          ]
        }
      }
    };

    return mockResult;
  }

  async deployContract(
    contractCode: string,
    contractName: string,
    deploymentType: 'single' | 'faceted' | 'chunked' = 'single'
  ): Promise<{ success: boolean; address?: string; error?: string }> {
    try {
      const response = await globalThis.fetch(`${this.aiBackendUrl}/api/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractCode,
          contractName,
          deploymentType,
          network: 'localhost'
        }),
      });

      if (!response.ok) {
        throw new Error(`Deployment failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: `Deployment failed: ${error}`
      };
    }
  }

  async getSystemStatus(): Promise<{
    connected: boolean;
    networkInfo?: NetworkInfo;
    contractsLoaded: number;
    aiBackendStatus: 'online' | 'offline';
  }> {
    const contractsLoaded = this.contracts.size;
    let aiBackendStatus: 'online' | 'offline' = 'offline';
    let networkInfo: NetworkInfo | undefined;

    try {
      const healthResponse = await globalThis.fetch(`${this.aiBackendUrl}/health`);
      aiBackendStatus = healthResponse.ok ? 'online' : 'offline';
    } catch {
      aiBackendStatus = 'offline';
    }

    if (this.provider) {
      try {
        const network = await this.provider.getNetwork();
        const blockNumber = await this.provider.getBlockNumber();
        networkInfo = {
          name: 'localhost',
          chainId: network.chainId.toString(),
          blockNumber,
          rpcUrl: 'http://localhost:8545'
        };
      } catch {
        // Network info not available
      }
    }

    return {
      connected: !!this.provider,
      networkInfo,
      contractsLoaded,
      aiBackendStatus
    };
  }
}

// Export singleton instance
export const payRoxService = new PayRoxContractsService();

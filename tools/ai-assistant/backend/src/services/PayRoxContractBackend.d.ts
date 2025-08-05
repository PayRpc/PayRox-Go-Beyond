import { ethers } from 'ethers';
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
export declare class PayRoxContractBackend {
    private contracts;
    private provider;
    private network;
    private configPath;
    constructor(rpcUrl?: string);
    /**
     * Load deployed contracts configuration
     */
    private loadContracts;
    /**
     * Load ABI from artifacts
     */
    private loadABI;
    /**
     * Load network configuration
     */
    private loadNetworkConfig;
    /**
     * Get all deployed contracts
     */
    getContracts(): PayRoxBackendContracts;
    /**
     * Get specific contract configuration
     */
    getContract(category: 'core' | 'orchestrators' | 'facets', name: string): DeployedContract | null;
    /**
     * Create contract instance
     */
    getContractInstance(category: 'core' | 'orchestrators' | 'facets', name: string): ethers.Contract | null;
    /**
     * Get factory contract instance
     */
    getFactory(): ethers.Contract;
    /**
     * Get dispatcher contract instance
     */
    getDispatcher(): ethers.Contract;
    /**
     * Get orchestrator contract instance
     */
    getOrchestrator(): ethers.Contract;
    /**
     * Health check for all contracts
     */
    healthCheck(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        contracts: Record<string, {
            status: boolean;
            error?: string;
        }>;
        network: {
            connected: boolean;
            chainId?: string;
        };
    }>;
    /**
     * Get deployment information for analytics
     */
    getDeploymentInfo(): Promise<{
        network: any;
        deployer: string;
        deploymentTimestamp: string;
        contractCount: number;
        totalGasUsed?: string;
    }>;
    /**
     * Analyze contract interactions
     */
    analyzeContract(address: string): Promise<{
        contractName?: string;
        isKnownContract: boolean;
        category?: string;
        functions: string[];
        events: string[];
    }>;
    /**
     * Get network information
     */
    getNetworkInfo(): {
        network: any;
        deployer: any;
        security: any;
        fees: any;
        features: any;
    } | null;
}
export declare const payRoxBackend: PayRoxContractBackend;

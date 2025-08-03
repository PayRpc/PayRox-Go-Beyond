/**
 * Cross-Chain Utilities for PayRox Go Beyond
 * Enables deterministic deployment and manifest synchronization across EVM networks
 */
import { NetworkConfig } from './network';
export interface CrossChainDeployment {
    deploymentId: string;
    networks: string[];
    contracts: Array<{
        name: string;
        bytecode: string;
        salt: string;
        predictedAddress: string;
        actualAddresses: Record<string, string>;
    }>;
    manifestHash: string;
    timestamp: string;
    status: 'pending' | 'partial' | 'complete' | 'failed';
}
export interface CrossChainSaltConfig {
    baseContent: string;
    deployer: string;
    version: string;
    crossChainNonce: number;
}
export interface AddressConsistencyReport {
    deploymentId: string;
    consistent: boolean;
    networks: string[];
    expectedAddresses: Record<string, string>;
    actualAddresses: Record<string, Record<string, string>>;
    discrepancies: Array<{
        network: string;
        contract: string;
        expected: string;
        actual: string;
    }>;
}
export interface CrossChainManifest {
    version: string;
    crossChainId: string;
    networks: Record<string, {
        chainId: string;
        factoryAddress: string;
        dispatcherAddress: string;
        manifestHash: string;
        timestamp: string;
    }>;
    contracts: Array<{
        name: string;
        salt: string;
        addresses: Record<string, string>;
    }>;
    routes: Array<{
        selector: string;
        implementations: Record<string, string>;
    }>;
    syncStatus: Record<string, 'synced' | 'pending' | 'failed'>;
}
export declare class CrossChainSaltGenerator {
    /**
     * Generate a deterministic salt that works consistently across all EVM networks
     * This enhances the existing PayRox salt system with cross-chain compatibility
     */
    static generateUniversalSalt(config: CrossChainSaltConfig): string;
    /**
     * Enhance existing PayRox chunk salt with cross-chain factors
     * Maintains compatibility with existing CREATE2 predictions
     */
    static enhanceChunkSalt(contentHash: string, crossChainNonce: number): string;
    /**
     * Predict CREATE2 address for any EVM network
     */
    static predictCrossChainAddress(factoryAddress: string, salt: string, bytecodeHash: string): string;
}
export declare class CrossChainOrchestrator {
    private networks;
    private providers;
    constructor(networks: NetworkConfig[]);
    /**
     * Deploy contracts across multiple networks with address consistency
     */
    deployAcrossChains(targetNetworks: string[], contracts: Array<{
        name: string;
        bytecode: string;
        constructorArgs?: any[];
    }>, deployerPrivateKey: string): Promise<CrossChainDeployment>;
    private prepareDeploymentContracts;
    private executeNetworkDeployments;
    private deployToNetwork;
    private extractDeployedAddress;
    private determineDeploymentStatus;
    /**
     * Verify address consistency across deployed networks
     */
    verifyAddressConsistency(deployment: CrossChainDeployment): Promise<AddressConsistencyReport>;
}
export declare class CrossChainManifestSync {
    private networks;
    private providers;
    constructor(networks: NetworkConfig[]);
    /**
     * Create a cross-chain manifest from individual network manifests
     */
    createCrossChainManifest(sourceNetwork: string, targetNetworks: string[], deployment: CrossChainDeployment): Promise<CrossChainManifest>;
    /**
     * Synchronize manifest across networks using batch operations
     */
    synchronizeManifest(manifest: CrossChainManifest, deployerPrivateKey: string): Promise<CrossChainManifest>;
    private syncNetworkManifest;
    /**
     * Verify manifest consistency across networks
     */
    verifyManifestSync(manifest: CrossChainManifest): Promise<{
        consistent: boolean;
        syncedNetworks: string[];
        failedNetworks: string[];
        details: Record<string, any>;
    }>;
}
export declare class CrossChainNetworkManager {
    /**
     * Validate network configuration for cross-chain deployment
     */
    static validateNetworkConfig(networks: NetworkConfig[]): {
        valid: boolean;
        errors: string[];
        warnings: string[];
    };
    /**
     * Check network connectivity and contract availability
     */
    static healthCheck(networks: NetworkConfig[]): Promise<Record<string, {
        connected: boolean;
        factoryAvailable: boolean;
        dispatcherAvailable: boolean;
        blockNumber?: number;
        error?: string;
    }>>;
}

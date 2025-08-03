/**
 * Consolidated Network Management Utilities
 *
 * Based on the network determination logic from check-actual-factory-fee.ts
 * Provides standardized network handling across the PayRox Go Beyond system
 */
import { ValidationResult } from './errors';
import { PathManager } from './paths';
export interface NetworkConfig {
    name: string;
    chainId: string;
    displayName: string;
    isTestnet: boolean;
    deploymentPath: string;
    artifactsPath: string;
    hasDeployments: boolean;
    rpcUrl?: string;
    blockExplorer?: string;
    factoryAddress?: string;
    dispatcherAddress?: string;
}
export interface NetworkDetectionResult {
    networkName: string;
    chainId: string;
    isLocal: boolean;
    hasDeployments: boolean;
    confidence: 'high' | 'medium' | 'low';
}
export declare const CHAIN_ID_MAPPINGS: Record<string, string>;
export declare const NETWORK_CONFIGS: Record<string, Omit<NetworkConfig, 'deploymentPath' | 'artifactsPath' | 'hasDeployments'>>;
export declare class NetworkManager {
    private readonly pathManager;
    constructor(pathManager?: PathManager);
    /**
     * Determine network name from chain ID with enhanced fallback logic
     * Based on the logic from check-actual-factory-fee.ts but expanded
     */
    determineNetworkName(chainId: string): NetworkDetectionResult;
    /**
     * Enhanced local network detection
     * Consolidates the logic from check-actual-factory-fee.ts
     */
    private detectLocalNetwork;
    /**
     * Check if a network has deployment artifacts
     */
    private hasNetworkDeployments;
    /**
     * Get all available networks with their configurations
     */
    getAvailableNetworks(): NetworkConfig[];
    /**
     * Get network configuration by name
     */
    getNetworkConfig(networkName: string): NetworkConfig | null;
    /**
     * Validate network configuration
     */
    validateNetwork(networkName: string): ValidationResult;
    /**
     * Get chain ID for network name
     */
    getChainIdForNetwork(networkName: string): string | null;
    /**
     * Check if network is testnet
     */
    isTestnet(networkName: string): boolean;
    /**
     * Check if network is local development
     */
    isLocalNetwork(networkName: string): boolean;
}
export declare function getNetworkManager(pathManager?: PathManager): NetworkManager;
/**
 * Quick network detection from chain ID
 */
export declare function detectNetwork(chainId: string): string;
/**
 * Quick validation of network name
 */
export declare function isValidNetwork(networkName: string): boolean;

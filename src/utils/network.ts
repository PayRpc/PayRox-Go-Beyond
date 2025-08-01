/**
 * Consolidated Network Management Utilities
 *
 * Based on the network determination logic from check-actual-factory-fee.ts
 * Provides standardized network handling across the PayRox Go Beyond system
 */

import * as fs from 'fs';
import {
  NetworkError,
  ValidationResult,
  createInvalidResult,
  createValidResult,
} from './errors';
import { PathManager, getPathManager } from './paths';

/* ═══════════════════════════════════════════════════════════════════════════
   NETWORK TYPES AND INTERFACES
   ═══════════════════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════════════════
   NETWORK CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

export const CHAIN_ID_MAPPINGS: Record<string, string> = {
  '1': 'mainnet',
  '5': 'goerli',
  '11155111': 'sepolia',
  '137': 'polygon',
  '80001': 'mumbai',
  '31337': 'localhost', // Default for hardhat/localhost
  '1337': 'hardhat',
};

export const NETWORK_CONFIGS: Record<
  string,
  Omit<NetworkConfig, 'deploymentPath' | 'artifactsPath' | 'hasDeployments'>
> = {
  mainnet: {
    name: 'mainnet',
    chainId: '1',
    displayName: 'Ethereum Mainnet',
    isTestnet: false,
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io',
  },
  goerli: {
    name: 'goerli',
    chainId: '5',
    displayName: 'Goerli Testnet',
    isTestnet: true,
    rpcUrl: 'https://goerli.infura.io/v3/',
    blockExplorer: 'https://goerli.etherscan.io',
  },
  sepolia: {
    name: 'sepolia',
    chainId: '11155111',
    displayName: 'Sepolia Testnet',
    isTestnet: true,
    rpcUrl: 'https://sepolia.infura.io/v3/',
    blockExplorer: 'https://sepolia.etherscan.io',
  },
  polygon: {
    name: 'polygon',
    chainId: '137',
    displayName: 'Polygon Mainnet',
    isTestnet: false,
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
  },
  mumbai: {
    name: 'mumbai',
    chainId: '80001',
    displayName: 'Polygon Mumbai',
    isTestnet: true,
    rpcUrl: 'https://rpc-mumbai.matic.today',
    blockExplorer: 'https://mumbai.polygonscan.com',
  },
  localhost: {
    name: 'localhost',
    chainId: '31337',
    displayName: 'Localhost',
    isTestnet: true,
  },
  hardhat: {
    name: 'hardhat',
    chainId: '31337',
    displayName: 'Hardhat Network',
    isTestnet: true,
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   NETWORK MANAGER CLASS
   ═══════════════════════════════════════════════════════════════════════════ */

export class NetworkManager {
  private readonly pathManager: PathManager;

  constructor(pathManager?: PathManager) {
    this.pathManager = pathManager || getPathManager();
  }

  /**
   * Determine network name from chain ID with enhanced fallback logic
   * Based on the logic from check-actual-factory-fee.ts but expanded
   */
  determineNetworkName(chainId: string): NetworkDetectionResult {
    // First, check direct mapping
    const directMapping = CHAIN_ID_MAPPINGS[chainId];
    if (directMapping) {
      if (chainId === '31337') {
        // Special handling for localhost/hardhat detection
        const localDetection = this.detectLocalNetwork();
        return {
          networkName: localDetection.networkName,
          chainId,
          isLocal: true,
          hasDeployments: localDetection.hasDeployments,
          confidence: localDetection.confidence,
        };
      }

      return {
        networkName: directMapping,
        chainId,
        isLocal: false,
        hasDeployments: this.hasNetworkDeployments(directMapping),
        confidence: 'high',
      };
    }

    // Unknown network
    return {
      networkName: 'unknown',
      chainId,
      isLocal: false,
      hasDeployments: false,
      confidence: 'low',
    };
  }

  /**
   * Enhanced local network detection
   * Consolidates the logic from check-actual-factory-fee.ts
   */
  private detectLocalNetwork(): {
    networkName: string;
    hasDeployments: boolean;
    confidence: 'high' | 'medium';
  } {
    const localhostPath = this.pathManager.getDeploymentPath('localhost');
    const hardhatPath = this.pathManager.getDeploymentPath('hardhat');

    const localhostExists = fs.existsSync(localhostPath);
    const hardhatExists = fs.existsSync(hardhatPath);

    if (localhostExists && this.hasNetworkDeployments('localhost')) {
      return {
        networkName: 'localhost',
        hasDeployments: true,
        confidence: 'high',
      };
    }

    if (hardhatExists && this.hasNetworkDeployments('hardhat')) {
      return {
        networkName: 'hardhat',
        hasDeployments: true,
        confidence: 'high',
      };
    }

    // Default to localhost if neither has deployments
    return {
      networkName: 'localhost',
      hasDeployments: false,
      confidence: 'medium',
    };
  }

  /**
   * Check if a network has deployment artifacts
   */
  private hasNetworkDeployments(networkName: string): boolean {
    const deploymentPath = this.pathManager.getDeploymentPath(networkName);
    try {
      if (!fs.existsSync(deploymentPath)) {
        return false;
      }

      const files = fs.readdirSync(deploymentPath);
      return files.some(file => file.endsWith('.json'));
    } catch {
      return false;
    }
  }

  /**
   * Get all available networks with their configurations
   */
  getAvailableNetworks(): NetworkConfig[] {
    const deploymentsPath = this.pathManager.getPath('deployments');

    if (!fs.existsSync(deploymentsPath)) {
      return [];
    }

    const networks: NetworkConfig[] = [];

    try {
      const networkDirs = fs
        .readdirSync(deploymentsPath, { withFileTypes: true })
        .filter(item => item.isDirectory())
        .map(item => item.name);

      for (const networkName of networkDirs) {
        const baseConfig = NETWORK_CONFIGS[networkName];
        if (baseConfig) {
          const deploymentPath =
            this.pathManager.getDeploymentPath(networkName);
          networks.push({
            ...baseConfig,
            deploymentPath,
            artifactsPath: `${deploymentPath}/*.json`,
            hasDeployments: this.hasNetworkDeployments(networkName),
          });
        }
      }
    } catch (error) {
      throw new NetworkError(
        `Failed to scan available networks: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'NETWORK_SCAN_FAILED'
      );
    }

    return networks;
  }

  /**
   * Get network configuration by name
   */
  getNetworkConfig(networkName: string): NetworkConfig | null {
    const baseConfig = NETWORK_CONFIGS[networkName];
    if (!baseConfig) {
      return null;
    }

    const deploymentPath = this.pathManager.getDeploymentPath(networkName);
    return {
      ...baseConfig,
      deploymentPath,
      artifactsPath: `${deploymentPath}/*.json`,
      hasDeployments: this.hasNetworkDeployments(networkName),
    };
  }

  /**
   * Validate network configuration
   */
  validateNetwork(networkName: string): ValidationResult {
    const config = this.getNetworkConfig(networkName);

    if (!config) {
      return createInvalidResult(
        `Unknown network: ${networkName}`,
        'UNKNOWN_NETWORK',
        [
          `Supported networks: ${Object.keys(NETWORK_CONFIGS).join(', ')}`,
          'Check your network configuration',
          'Verify the network name spelling',
        ]
      );
    }

    const pathValidation = this.pathManager.validatePath(config.deploymentPath);
    if (!pathValidation.isValid) {
      return createInvalidResult(
        `Network deployment path invalid: ${config.deploymentPath}`,
        'INVALID_DEPLOYMENT_PATH',
        [
          'Run deployment scripts for this network',
          'Check if the deployments directory exists',
          'Verify network configuration',
        ]
      );
    }

    if (!config.hasDeployments) {
      return createInvalidResult(
        `No deployments found for network: ${networkName}`,
        'NO_DEPLOYMENTS',
        [
          `Deploy contracts to ${networkName} first`,
          'Check deployment artifacts',
          'Run the deployment script for this network',
        ]
      );
    }

    return createValidResult(
      `Network ${networkName} is properly configured`,
      'NETWORK_VALID'
    );
  }

  /**
   * Get chain ID for network name
   */
  getChainIdForNetwork(networkName: string): string | null {
    const config = NETWORK_CONFIGS[networkName];
    return config?.chainId || null;
  }

  /**
   * Check if network is testnet
   */
  isTestnet(networkName: string): boolean {
    const config = NETWORK_CONFIGS[networkName];
    return config?.isTestnet || false;
  }

  /**
   * Check if network is local development
   */
  isLocalNetwork(networkName: string): boolean {
    return networkName === 'localhost' || networkName === 'hardhat';
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Create a singleton NetworkManager instance
 */
let globalNetworkManager: NetworkManager | null = null;

export function getNetworkManager(pathManager?: PathManager): NetworkManager {
  if (!globalNetworkManager || pathManager) {
    globalNetworkManager = new NetworkManager(pathManager);
  }
  return globalNetworkManager;
}

/**
 * Quick network detection from chain ID
 */
export function detectNetwork(chainId: string): string {
  const manager = getNetworkManager();
  const result = manager.determineNetworkName(chainId);
  return result.networkName;
}

/**
 * Quick validation of network name
 */
export function isValidNetwork(networkName: string): boolean {
  return networkName in NETWORK_CONFIGS;
}

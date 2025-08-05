"use strict";
/**
 * Consolidated Network Management Utilities
 *
 * Based on the network determination logic from check-actual-factory-fee.ts
 * Provides standardized network handling across the PayRox Go Beyond system
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkManager = exports.NETWORK_CONFIGS = exports.CHAIN_ID_MAPPINGS = void 0;
exports.getNetworkManager = getNetworkManager;
exports.detectNetwork = detectNetwork;
exports.isValidNetwork = isValidNetwork;
const fs = __importStar(require("fs"));
const errors_1 = require("./errors");
const paths_1 = require("./paths");
/* ═══════════════════════════════════════════════════════════════════════════
   NETWORK CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */
exports.CHAIN_ID_MAPPINGS = {
    '1': 'mainnet',
    '11155111': 'sepolia',
    '137': 'polygon',
    '1101': 'polygon-zkevm',
    '2442': 'polygon-zkevm-cardona',
    '42161': 'arbitrum',
    '421614': 'arbitrum-sepolia',
    '10': 'optimism',
    '11155420': 'optimism-sepolia',
    '8453': 'base',
    '84532': 'base-sepolia',
    '43114': 'avalanche',
    '43113': 'fuji',
    '250': 'fantom',
    '4002': 'fantom-testnet',
    '56': 'bsc',
    '97': 'bsc-testnet',
    '204': 'opbnb',
    '5611': 'opbnb-testnet',
    '1329': 'sei',
    '713715': 'sei-devnet',
    '31337': 'localhost', // Default for hardhat/localhost
    '1337': 'hardhat',
};
exports.NETWORK_CONFIGS = {
    mainnet: {
        name: 'mainnet',
        chainId: '1',
        displayName: 'Ethereum Mainnet',
        isTestnet: false,
        rpcUrl: 'https://eth.llamarpc.com',
        blockExplorer: 'https://etherscan.io',
    },
    sepolia: {
        name: 'sepolia',
        chainId: '11155111',
        displayName: 'Sepolia Testnet',
        isTestnet: true,
        rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
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
    'polygon-zkevm': {
        name: 'polygon-zkevm',
        chainId: '1101',
        displayName: 'Polygon zkEVM',
        isTestnet: false,
        rpcUrl: 'https://zkevm-rpc.com',
        blockExplorer: 'https://zkevm.polygonscan.com',
    },
    'polygon-zkevm-cardona': {
        name: 'polygon-zkevm-cardona',
        chainId: '2442',
        displayName: 'Polygon zkEVM Cardona Testnet',
        isTestnet: true,
        rpcUrl: 'https://rpc.cardona.zkevm-rpc.com',
        blockExplorer: 'https://cardona-zkevm.polygonscan.com',
    },
    arbitrum: {
        name: 'arbitrum',
        chainId: '42161',
        displayName: 'Arbitrum One',
        isTestnet: false,
        rpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
        blockExplorer: 'https://arbiscan.io',
    },
    'arbitrum-sepolia': {
        name: 'arbitrum-sepolia',
        chainId: '421614',
        displayName: 'Arbitrum Sepolia',
        isTestnet: true,
        rpcUrl: 'https://arbitrum-sepolia-rpc.publicnode.com',
        blockExplorer: 'https://sepolia.arbiscan.io',
    },
    optimism: {
        name: 'optimism',
        chainId: '10',
        displayName: 'OP Mainnet',
        isTestnet: false,
        rpcUrl: 'https://optimism-rpc.publicnode.com',
        blockExplorer: 'https://optimistic.etherscan.io',
    },
    'optimism-sepolia': {
        name: 'optimism-sepolia',
        chainId: '11155420',
        displayName: 'OP Sepolia',
        isTestnet: true,
        rpcUrl: 'https://optimism-sepolia-rpc.publicnode.com',
        blockExplorer: 'https://sepolia-optimism.etherscan.io',
    },
    base: {
        name: 'base',
        chainId: '8453',
        displayName: 'Base',
        isTestnet: false,
        rpcUrl: 'https://base-rpc.publicnode.com',
        blockExplorer: 'https://basescan.org',
    },
    'base-sepolia': {
        name: 'base-sepolia',
        chainId: '84532',
        displayName: 'Base Sepolia',
        isTestnet: true,
        rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
        blockExplorer: 'https://sepolia.basescan.org',
    },
    avalanche: {
        name: 'avalanche',
        chainId: '43114',
        displayName: 'Avalanche C-Chain',
        isTestnet: false,
        rpcUrl: 'https://avalanche-c-chain-rpc.publicnode.com',
        blockExplorer: 'https://snowtrace.io',
    },
    fuji: {
        name: 'fuji',
        chainId: '43113',
        displayName: 'Avalanche Fuji',
        isTestnet: true,
        rpcUrl: 'https://avalanche-fuji-c-chain-rpc.publicnode.com',
        blockExplorer: 'https://testnet.snowtrace.io',
    },
    fantom: {
        name: 'fantom',
        chainId: '250',
        displayName: 'Fantom Opera',
        isTestnet: false,
        rpcUrl: 'https://fantom-rpc.publicnode.com',
        blockExplorer: 'https://ftmscan.com',
    },
    'fantom-testnet': {
        name: 'fantom-testnet',
        chainId: '4002',
        displayName: 'Fantom Testnet',
        isTestnet: true,
        rpcUrl: 'https://fantom-testnet-rpc.publicnode.com',
        blockExplorer: 'https://testnet.ftmscan.com',
    },
    bsc: {
        name: 'bsc',
        chainId: '56',
        displayName: 'BNB Smart Chain',
        isTestnet: false,
        rpcUrl: 'https://bsc-rpc.publicnode.com',
        blockExplorer: 'https://bscscan.com',
    },
    'bsc-testnet': {
        name: 'bsc-testnet',
        chainId: '97',
        displayName: 'BNB Smart Chain Testnet',
        isTestnet: true,
        rpcUrl: 'https://bsc-testnet-rpc.publicnode.com',
        blockExplorer: 'https://testnet.bscscan.com',
    },
    opbnb: {
        name: 'opbnb',
        chainId: '204',
        displayName: 'opBNB Mainnet',
        isTestnet: false,
        rpcUrl: 'https://opbnb-rpc.publicnode.com',
        blockExplorer: 'https://opbnbscan.com',
    },
    'opbnb-testnet': {
        name: 'opbnb-testnet',
        chainId: '5611',
        displayName: 'opBNB Testnet',
        isTestnet: true,
        rpcUrl: 'https://opbnb-testnet-rpc.publicnode.com',
        blockExplorer: 'https://testnet.opbnbscan.com',
    },
    sei: {
        name: 'sei',
        chainId: '1329',
        displayName: 'Sei Network',
        isTestnet: false,
        rpcUrl: 'https://evm-rpc.sei-apis.com',
        blockExplorer: 'https://seitrace.com',
    },
    'sei-devnet': {
        name: 'sei-devnet',
        chainId: '713715',
        displayName: 'Sei Devnet',
        isTestnet: true,
        rpcUrl: 'https://evm-rpc-arctic-1.sei-apis.com',
        blockExplorer: 'https://seitrace.com/?chain=arctic-1',
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
class NetworkManager {
    constructor(pathManager) {
        this.pathManager = pathManager || (0, paths_1.getPathManager)();
    }
    /**
     * Determine network name from chain ID with enhanced fallback logic
     * Based on the logic from check-actual-factory-fee.ts but expanded
     */
    determineNetworkName(chainId) {
        // First, check direct mapping
        const directMapping = exports.CHAIN_ID_MAPPINGS[chainId];
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
    detectLocalNetwork() {
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
    hasNetworkDeployments(networkName) {
        const deploymentPath = this.pathManager.getDeploymentPath(networkName);
        try {
            if (!fs.existsSync(deploymentPath)) {
                return false;
            }
            const files = fs.readdirSync(deploymentPath);
            return files.some(file => file.endsWith('.json'));
        }
        catch {
            return false;
        }
    }
    /**
     * Get all available networks with their configurations
     */
    getAvailableNetworks() {
        const deploymentsPath = this.pathManager.getPath('deployments');
        if (!fs.existsSync(deploymentsPath)) {
            return [];
        }
        const networks = [];
        try {
            const networkDirs = fs
                .readdirSync(deploymentsPath, { withFileTypes: true })
                .filter(item => item.isDirectory())
                .map(item => item.name);
            for (const networkName of networkDirs) {
                const baseConfig = exports.NETWORK_CONFIGS[networkName];
                if (baseConfig) {
                    const deploymentPath = this.pathManager.getDeploymentPath(networkName);
                    networks.push({
                        ...baseConfig,
                        deploymentPath,
                        artifactsPath: `${deploymentPath}/*.json`,
                        hasDeployments: this.hasNetworkDeployments(networkName),
                    });
                }
            }
        }
        catch (error) {
            throw new errors_1.NetworkError(`Failed to scan available networks: ${error instanceof Error ? error.message : String(error)}`, 'NETWORK_SCAN_FAILED');
        }
        return networks;
    }
    /**
     * Get network configuration by name
     */
    getNetworkConfig(networkName) {
        const baseConfig = exports.NETWORK_CONFIGS[networkName];
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
    validateNetwork(networkName) {
        const config = this.getNetworkConfig(networkName);
        if (!config) {
            return (0, errors_1.createInvalidResult)(`Unknown network: ${networkName}`, 'UNKNOWN_NETWORK', [
                `Supported networks: ${Object.keys(exports.NETWORK_CONFIGS).join(', ')}`,
                'Check your network configuration',
                'Verify the network name spelling',
            ]);
        }
        const pathValidation = this.pathManager.validatePath(config.deploymentPath);
        if (!pathValidation.isValid) {
            return (0, errors_1.createInvalidResult)(`Network deployment path invalid: ${config.deploymentPath}`, 'INVALID_DEPLOYMENT_PATH', [
                'Run deployment scripts for this network',
                'Check if the deployments directory exists',
                'Verify network configuration',
            ]);
        }
        if (!config.hasDeployments) {
            return (0, errors_1.createInvalidResult)(`No deployments found for network: ${networkName}`, 'NO_DEPLOYMENTS', [
                `Deploy contracts to ${networkName} first`,
                'Check deployment artifacts',
                'Run the deployment script for this network',
            ]);
        }
        return (0, errors_1.createValidResult)(`Network ${networkName} is properly configured`, 'NETWORK_VALID');
    }
    /**
     * Get chain ID for network name
     */
    getChainIdForNetwork(networkName) {
        const config = exports.NETWORK_CONFIGS[networkName];
        return config?.chainId || null;
    }
    /**
     * Check if network is testnet
     */
    isTestnet(networkName) {
        const config = exports.NETWORK_CONFIGS[networkName];
        return config?.isTestnet || false;
    }
    /**
     * Check if network is local development
     */
    isLocalNetwork(networkName) {
        return networkName === 'localhost' || networkName === 'hardhat';
    }
}
exports.NetworkManager = NetworkManager;
/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════ */
/**
 * Create a singleton NetworkManager instance
 */
let globalNetworkManager = null;
function getNetworkManager(pathManager) {
    if (!globalNetworkManager || pathManager) {
        globalNetworkManager = new NetworkManager(pathManager);
    }
    return globalNetworkManager;
}
/**
 * Quick network detection from chain ID
 */
function detectNetwork(chainId) {
    const manager = getNetworkManager();
    const result = manager.determineNetworkName(chainId);
    return result.networkName;
}
/**
 * Quick validation of network name
 */
function isValidNetwork(networkName) {
    return networkName in exports.NETWORK_CONFIGS;
}

/**
 * PayRox Go Beyond SDK Configuration
 * Production-ready configuration using deployed contracts
 */

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl?: string;
  blockExplorer?: string;
  contracts: ContractAddresses;
  fees: FeeConfig;
}

export interface ContractAddresses {
  factory: string;
  dispatcher: string;
  orchestrator: string;
  governance: string;
  auditRegistry: string;
}

export interface FeeConfig {
  deploymentFee: string; // in wei
  gasLimit: number;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

/**
 * Current deployed contract addresses (localhost/testnet)
 * TODO: Update with mainnet addresses when ready
 */
export const NETWORKS: Record<string, NetworkConfig> = {
  localhost: {
    name: "Localhost",
    chainId: 31337,
    rpcUrl: "http://127.0.0.1:8545",
    blockExplorer: "",
    contracts: {
      factory: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      dispatcher: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      orchestrator: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
      governance: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
      auditRegistry: "0x0165878A594ca255338adfa4d48449f69242Eb8F"
    },
    fees: {
      deploymentFee: "700000000000000", // 0.0007 ETH
      gasLimit: 5000000
    }
  },
  mainnet: {
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
    blockExplorer: "https://etherscan.io",
    contracts: {
      // TODO: Deploy to mainnet and update these addresses
      factory: "0x0000000000000000000000000000000000000000",
      dispatcher: "0x0000000000000000000000000000000000000000",
      orchestrator: "0x0000000000000000000000000000000000000000",
      governance: "0x0000000000000000000000000000000000000000",
      auditRegistry: "0x0000000000000000000000000000000000000000"
    },
    fees: {
      deploymentFee: "700000000000000", // 0.0007 ETH
      gasLimit: 5000000,
      maxFeePerGas: "20000000000", // 20 gwei
      maxPriorityFeePerGas: "2000000000" // 2 gwei
    }
  },
  goerli: {
    name: "Goerli Testnet",
    chainId: 5,
    rpcUrl: "https://eth-goerli.g.alchemy.com/v2/YOUR_API_KEY",
    blockExplorer: "https://goerli.etherscan.io",
    contracts: {
      // TODO: Deploy to Goerli and update these addresses
      factory: "0x0000000000000000000000000000000000000000",
      dispatcher: "0x0000000000000000000000000000000000000000",
      orchestrator: "0x0000000000000000000000000000000000000000",
      governance: "0x0000000000000000000000000000000000000000",
      auditRegistry: "0x0000000000000000000000000000000000000000"
    },
    fees: {
      deploymentFee: "700000000000000", // 0.0007 ETH
      gasLimit: 5000000
    }
  },
  sepolia: {
    name: "Sepolia Testnet", 
    chainId: 11155111,
    rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
    blockExplorer: "https://sepolia.etherscan.io",
    contracts: {
      // TODO: Deploy to Sepolia and update these addresses
      factory: "0x0000000000000000000000000000000000000000",
      dispatcher: "0x0000000000000000000000000000000000000000",
      orchestrator: "0x0000000000000000000000000000000000000000",
      governance: "0x0000000000000000000000000000000000000000",
      auditRegistry: "0x0000000000000000000000000000000000000000"
    },
    fees: {
      deploymentFee: "700000000000000", // 0.0007 ETH
      gasLimit: 5000000
    }
  }
};

/**
 * Default network (currently localhost for development)
 * Change to 'mainnet' for production
 */
export const DEFAULT_NETWORK = "localhost";

/**
 * PayRox constants
 */
export const CONSTANTS = {
  MAX_CHUNK_SIZE: 24000, // bytes
  CHUNK_PROLOGUE_SIZE: 5, // bytes
  DEPLOYMENT_FEE_WEI: "700000000000000", // 0.0007 ETH
  SALT_PREFIX: "chunk:",
  MANIFEST_VERSION: "1.0.0"
} as const;

/**
 * Supported contract types for deployment
 */
export const CONTRACT_TYPES = {
  FACET: "facet",
  LIBRARY: "library", 
  UTILITY: "utility",
  TOKEN: "token",
  DEFI: "defi",
  NFT: "nft",
  GOVERNANCE: "governance"
} as const;

export type ContractType = typeof CONTRACT_TYPES[keyof typeof CONTRACT_TYPES];

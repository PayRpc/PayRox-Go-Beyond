/**
 * Network-Specific Fee Configuration System
 * 
 * Automatically adjusts deployment fees based on network economics,
 * gas prices, and typical transaction costs for optimal user experience.
 */

import { ethers } from 'ethers';

export interface NetworkFeeConfig {
  network: string;
  chainId: number;
  baseFeeETH: string;
  baseFeeWei: string;
  platformFeeETH: string;
  platformFeeWei: string;
  totalFeeETH: string;
  totalFeeWei: string;
  gasPrice: {
    typical: string; // in gwei
    fast: string;    // in gwei
  };
  economicContext: {
    nativeCoinUSD: number;
    avgTransactionCostUSD: number;
    competitiveFactor: number; // 0.5 = 50% cheaper, 1.5 = 50% more expensive
  };
  feeTier: 'low' | 'medium' | 'high' | 'premium';
  description: string;
}

/**
 * Network-specific fee configurations optimized for each ecosystem
 */
export const NETWORK_FEE_CONFIGS: Record<string, NetworkFeeConfig> = {
  // Ethereum Mainnet - Premium tier (high gas, established ecosystem)
  mainnet: {
    network: 'mainnet',
    chainId: 1,
    baseFeeETH: '0.001',      // $2.50 - reasonable for mainnet
    baseFeeWei: ethers.parseEther('0.001').toString(),
    platformFeeETH: '0.0003',
    platformFeeWei: ethers.parseEther('0.0003').toString(),
    totalFeeETH: '0.0013',
    totalFeeWei: ethers.parseEther('0.0013').toString(),
    gasPrice: { typical: '15', fast: '25' },
    economicContext: {
      nativeCoinUSD: 2500,
      avgTransactionCostUSD: 10,
      competitiveFactor: 1.0
    },
    feeTier: 'premium',
    description: 'Ethereum mainnet - established DeFi ecosystem'
  },

  // Polygon - Low tier (cheap gas, competitive ecosystem)
  polygon: {
    network: 'polygon',
    chainId: 137,
    baseFeeETH: '0.000025',   // ~$0.065 - very affordable
    baseFeeWei: ethers.parseEther('0.000025').toString(),
    platformFeeETH: '0.000005',
    platformFeeWei: ethers.parseEther('0.000005').toString(),
    totalFeeETH: '0.00003',
    totalFeeWei: ethers.parseEther('0.00003').toString(),
    gasPrice: { typical: '30', fast: '50' },
    economicContext: {
      nativeCoinUSD: 0.85,
      avgTransactionCostUSD: 0.05,
      competitiveFactor: 0.3
    },
    feeTier: 'low',
    description: 'Polygon - ultra-low cost, high throughput'
  },

  // BSC - Medium tier (moderate gas, competitive)
  bsc: {
    network: 'bsc',
    chainId: 56,
    baseFeeETH: '0.0001',     // ~$0.25 - competitive
    baseFeeWei: ethers.parseEther('0.0001').toString(),
    platformFeeETH: '0.00002',
    platformFeeWei: ethers.parseEther('0.00002').toString(),
    totalFeeETH: '0.00012',
    totalFeeWei: ethers.parseEther('0.00012').toString(),
    gasPrice: { typical: '5', fast: '10' },
    economicContext: {
      nativeCoinUSD: 250,
      avgTransactionCostUSD: 0.5,
      competitiveFactor: 0.5
    },
    feeTier: 'medium',
    description: 'BSC - balanced cost and performance'
  },

  // Arbitrum - Medium tier (L2 efficiency)
  arbitrum: {
    network: 'arbitrum',
    chainId: 42161,
    baseFeeETH: '0.0002',     // ~$0.50 - L2 efficiency
    baseFeeWei: ethers.parseEther('0.0002').toString(),
    platformFeeETH: '0.00005',
    platformFeeWei: ethers.parseEther('0.00005').toString(),
    totalFeeETH: '0.00025',
    totalFeeWei: ethers.parseEther('0.00025').toString(),
    gasPrice: { typical: '0.1', fast: '0.5' },
    economicContext: {
      nativeCoinUSD: 2500,
      avgTransactionCostUSD: 1,
      competitiveFactor: 0.7
    },
    feeTier: 'medium',
    description: 'Arbitrum - L2 scaling with lower costs'
  },

  // Optimism - Medium tier (L2 efficiency)
  optimism: {
    network: 'optimism',
    chainId: 10,
    baseFeeETH: '0.0002',     // ~$0.50 - L2 efficiency
    baseFeeWei: ethers.parseEther('0.0002').toString(),
    platformFeeETH: '0.00005',
    platformFeeWei: ethers.parseEther('0.00005').toString(),
    totalFeeETH: '0.00025',
    totalFeeWei: ethers.parseEther('0.00025').toString(),
    gasPrice: { typical: '0.1', fast: '0.5' },
    economicContext: {
      nativeCoinUSD: 2500,
      avgTransactionCostUSD: 1,
      competitiveFactor: 0.7
    },
    feeTier: 'medium',
    description: 'Optimism - Optimistic rollup efficiency'
  },

  // Avalanche - Medium tier
  avalanche: {
    network: 'avalanche',
    chainId: 43114,
    baseFeeETH: '0.0005',     // ~$1.25 - premium performance
    baseFeeWei: ethers.parseEther('0.0005').toString(),
    platformFeeETH: '0.0001',
    platformFeeWei: ethers.parseEther('0.0001').toString(),
    totalFeeETH: '0.0006',
    totalFeeWei: ethers.parseEther('0.0006').toString(),
    gasPrice: { typical: '25', fast: '50' },
    economicContext: {
      nativeCoinUSD: 25,
      avgTransactionCostUSD: 2,
      competitiveFactor: 0.8
    },
    feeTier: 'high',
    description: 'Avalanche - high performance, subnet architecture'
  },

  // Base - Medium tier (Coinbase L2)
  base: {
    network: 'base',
    chainId: 8453,
    baseFeeETH: '0.0002',     // ~$0.50 - L2 efficiency
    baseFeeWei: ethers.parseEther('0.0002').toString(),
    platformFeeETH: '0.00005',
    platformFeeWei: ethers.parseEther('0.00005').toString(),
    totalFeeETH: '0.00025',
    totalFeeWei: ethers.parseEther('0.00025').toString(),
    gasPrice: { typical: '0.1', fast: '0.5' },
    economicContext: {
      nativeCoinUSD: 2500,
      avgTransactionCostUSD: 1,
      competitiveFactor: 0.7
    },
    feeTier: 'medium',
    description: 'Base - Coinbase L2 with native integration'
  },

  // Sepolia Testnet - Low tier (free testing)
  sepolia: {
    network: 'sepolia',
    chainId: 11155111,
    baseFeeETH: '0.00001',    // Minimal testnet fee
    baseFeeWei: ethers.parseEther('0.00001').toString(),
    platformFeeETH: '0.000002',
    platformFeeWei: ethers.parseEther('0.000002').toString(),
    totalFeeETH: '0.000012',
    totalFeeWei: ethers.parseEther('0.000012').toString(),
    gasPrice: { typical: '10', fast: '20' },
    economicContext: {
      nativeCoinUSD: 0, // Testnet
      avgTransactionCostUSD: 0,
      competitiveFactor: 0.1
    },
    feeTier: 'low',
    description: 'Sepolia testnet - minimal fees for testing'
  },

  // Fantom - High tier (DeFi focused)
  fantom: {
    network: 'fantom',
    chainId: 250,
    baseFeeETH: '0.0003',     // ~$0.75 - DeFi performance
    baseFeeWei: ethers.parseEther('0.0003').toString(),
    platformFeeETH: '0.00007',
    platformFeeWei: ethers.parseEther('0.00007').toString(),
    totalFeeETH: '0.00037',
    totalFeeWei: ethers.parseEther('0.00037').toString(),
    gasPrice: { typical: '50', fast: '100' },
    economicContext: {
      nativeCoinUSD: 0.30,
      avgTransactionCostUSD: 1.5,
      competitiveFactor: 0.6
    },
    feeTier: 'medium',
    description: 'Fantom - fast DeFi-focused blockchain'
  },

  // Polygon zkEVM - Medium tier (L2 efficiency with zk-proofs)
  'polygon-zkevm': {
    network: 'polygon-zkevm',
    chainId: 1101,
    baseFeeETH: '0.0001',     // ~$0.25 - zkEVM efficiency
    baseFeeWei: ethers.parseEther('0.0001').toString(),
    platformFeeETH: '0.00002',
    platformFeeWei: ethers.parseEther('0.00002').toString(),
    totalFeeETH: '0.00012',
    totalFeeWei: ethers.parseEther('0.00012').toString(),
    gasPrice: { typical: '1', fast: '5' },
    economicContext: {
      nativeCoinUSD: 2500,
      avgTransactionCostUSD: 0.25,
      competitiveFactor: 0.4
    },
    feeTier: 'medium',
    description: 'Polygon zkEVM - zero-knowledge Layer 2'
  },

  // opBNB - Low tier (ultra-low cost scaling)
  opbnb: {
    network: 'opbnb',
    chainId: 204,
    baseFeeETH: '0.000005',   // ~$0.0125 - ultra-cheap
    baseFeeWei: ethers.parseEther('0.000005').toString(),
    platformFeeETH: '0.000001',
    platformFeeWei: ethers.parseEther('0.000001').toString(),
    totalFeeETH: '0.000006',
    totalFeeWei: ethers.parseEther('0.000006').toString(),
    gasPrice: { typical: '0.001', fast: '0.005' },
    economicContext: {
      nativeCoinUSD: 250,
      avgTransactionCostUSD: 0.001,
      competitiveFactor: 0.2
    },
    feeTier: 'low',
    description: 'opBNB - ultra-low cost BSC Layer 2'
  },

  // Sei Network - High tier (trading focused)
  sei: {
    network: 'sei',
    chainId: 1329,
    baseFeeETH: '0.0004',     // ~$1.00 - trading performance
    baseFeeWei: ethers.parseEther('0.0004').toString(),
    platformFeeETH: '0.00008',
    platformFeeWei: ethers.parseEther('0.00008').toString(),
    totalFeeETH: '0.00048',
    totalFeeWei: ethers.parseEther('0.00048').toString(),
    gasPrice: { typical: '10', fast: '25' },
    economicContext: {
      nativeCoinUSD: 0.12,
      avgTransactionCostUSD: 0.5,
      competitiveFactor: 0.8
    },
    feeTier: 'high',
    description: 'Sei Network - high-performance trading chain'
  },

  // Localhost/Hardhat - Minimal tier (development)
  localhost: {
    network: 'localhost',
    chainId: 31337,
    baseFeeETH: '0.000001',   // Minimal development fee
    baseFeeWei: ethers.parseEther('0.000001').toString(),
    platformFeeETH: '0.0000002',
    platformFeeWei: ethers.parseEther('0.0000002').toString(),
    totalFeeETH: '0.0000012',
    totalFeeWei: ethers.parseEther('0.0000012').toString(),
    gasPrice: { typical: '8', fast: '10' },
    economicContext: {
      nativeCoinUSD: 0, // Development
      avgTransactionCostUSD: 0,
      competitiveFactor: 0.05
    },
    feeTier: 'low',
    description: 'Localhost - development environment'
  }
};

/**
 * Get network-specific fee configuration
 */
export function getNetworkFeeConfig(networkName: string, chainId?: number): NetworkFeeConfig {
  // Try by network name first
  const config = NETWORK_FEE_CONFIGS[networkName.toLowerCase()];
  if (config) {
    return config;
  }

  // Try by chain ID
  if (chainId) {
    const configByChainId = Object.values(NETWORK_FEE_CONFIGS).find(
      cfg => cfg.chainId === chainId
    );
    if (configByChainId) {
      return configByChainId;
    }
  }

  // Default to mainnet config for unknown networks
  console.warn(`⚠️ Unknown network: ${networkName} (${chainId}), using mainnet fee config`);
  return NETWORK_FEE_CONFIGS.mainnet;
}

/**
 * Calculate dynamic fees based on current gas prices
 */
export async function calculateDynamicFees(
  networkName: string,
  provider: any
): Promise<NetworkFeeConfig> {
  const baseConfig = getNetworkFeeConfig(networkName);
  
  try {
    // Get current gas price
    const feeData = await provider.getFeeData();
    const currentGasPrice = feeData.gasPrice || feeData.maxFeePerGas;
    
    if (currentGasPrice) {
      const gasPriceGwei = Number(ethers.formatUnits(currentGasPrice, 'gwei'));
      const typicalGasPrice = Number(baseConfig.gasPrice.typical);
      
      // Adjust fees based on current gas prices
      const gasPriceMultiplier = Math.min(Math.max(gasPriceGwei / typicalGasPrice, 0.5), 3.0);
      
      const adjustedBaseFee = Number(baseConfig.baseFeeETH) * gasPriceMultiplier;
      const adjustedPlatformFee = Number(baseConfig.platformFeeETH) * gasPriceMultiplier;
      const adjustedTotalFee = adjustedBaseFee + adjustedPlatformFee;
      
      return {
        ...baseConfig,
        baseFeeETH: adjustedBaseFee.toFixed(6),
        baseFeeWei: ethers.parseEther(adjustedBaseFee.toFixed(6)).toString(),
        platformFeeETH: adjustedPlatformFee.toFixed(6),
        platformFeeWei: ethers.parseEther(adjustedPlatformFee.toFixed(6)).toString(),
        totalFeeETH: adjustedTotalFee.toFixed(6),
        totalFeeWei: ethers.parseEther(adjustedTotalFee.toFixed(6)).toString(),
        gasPrice: {
          typical: gasPriceGwei.toFixed(1),
          fast: (gasPriceGwei * 1.5).toFixed(1)
        }
      };
    }
  } catch (error) {
    console.warn(`⚠️ Could not get dynamic gas prices for ${networkName}:`, error);
  }
  
  return baseConfig;
}

/**
 * Get fee summary for display
 */
export function getFeeSummary(config: NetworkFeeConfig): string {
  return `
🌐 ${config.network.toUpperCase()} Fee Configuration
═══════════════════════════════════════
📊 Fee Tier: ${config.feeTier.toUpperCase()}
💰 Base Fee: ${config.baseFeeETH} ETH (~$${(Number(config.baseFeeETH) * config.economicContext.nativeCoinUSD).toFixed(2)})
🚀 Platform Fee: ${config.platformFeeETH} ETH (~$${(Number(config.platformFeeETH) * config.economicContext.nativeCoinUSD).toFixed(2)})
💎 Total Fee: ${config.totalFeeETH} ETH (~$${(Number(config.totalFeeETH) * config.economicContext.nativeCoinUSD).toFixed(2)})
⛽ Gas Price: ${config.gasPrice.typical} gwei (typical)
📈 Competition Factor: ${(config.economicContext.competitiveFactor * 100).toFixed(0)}%
📝 ${config.description}
`;
}

/**
 * Export for backward compatibility
 */
export { NetworkFeeConfig as FeeConfig };

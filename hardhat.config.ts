import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';
import 'hardhat-contract-sizer';
import { HardhatUserConfig } from 'hardhat/config';
import 'solidity-coverage';

// ═══════════════════════════════════════════════════════════════════════════════
// PAYROX WORKING CONFIGURATION LOCK
// ═══════════════════════════════════════════════════════════════════════════════
// This configuration has been tested and works with all PayRox contracts
// DO NOT MODIFY without running ./scripts/quick-compile-test.js first
// Last verified: 2025-08-06 with ManifestDispatcher v2.0 and Phase 2 gas optimization
// ═══════════════════════════════════════════════════════════════════════════════

// Import tasks
import './tasks/crosschain-deployment';
import './tasks/crosschain-simple';
import './tasks/crosschain-status';
import './tasks/payrox';
import './tasks/payrox-ops';
import './tasks/payrox-release';
import './tasks/payrox-roles';
import './tasks/routes';
import './tasks/sbom';

dotenv.config();

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat', // Always use hardhat as default for development
  solidity: {
    // LOCKED WORKING CONFIGURATION - DO NOT MODIFY
    compilers: [
      {
        version: '0.8.30', // ✅ VERIFIED WORKING - All contracts compile successfully
        settings: {
          optimizer: {
            enabled: true,
            runs: 200, // ✅ Optimal for most contracts
          },
          viaIR: true, // ✅ Required for complex contracts
          evmVersion: 'cancun', // ✅ Latest supported version
          metadata: {
            bytecodeHash: 'none', // ✅ Deterministic builds
          },
          outputSelection: {
            '*': {
              '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata'],
            },
          },
        },
      },
      {
        version: '0.8.28', // Support for TerraStake Insurance contracts
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
          evmVersion: 'cancun',
          metadata: {
            bytecodeHash: 'none',
          },
          outputSelection: {
            '*': {
              '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata'],
            },
          },
        },
      },
      {
        version: '0.7.6', // Support for Uniswap V3 contracts
        settings: {
          optimizer: {
            enabled: true,
            runs: 800,
          },
          metadata: {
            bytecodeHash: 'none',
          },
          outputSelection: {
            '*': {
              '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'metadata'],
            },
          },
        },
      }
    ]
  },
  networks: {
    hardhat: {
      chainId: 31337,
      allowUnlimitedContractSize: false,
      // Keep default auto-mining; pinning chainId helps persistence across tools
    },
    localhost: {
      url: process.env.LOCALHOST_RPC_URL || 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    // ═══════════════════════════════════════════════════════════════════════════
    // MAINNET NETWORKS
    // ═══════════════════════════════════════════════════════════════════════════
    mainnet: withEip1559({
      url: process.env.MAINNET_RPC_URL || 'https://eth.llamarpc.com',
      accounts: pk(),
      chainId: 1,
      legacyGasPriceWei: process.env.GAS_PRICE,
      gasMultiplier: 1.2,
    }),
    polygon: {
      url: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      accounts: pk(),
      chainId: 137,
      ...eip1559('POLYGON'),
    },
    'polygon-zkevm': {
      url: process.env.POLYGON_ZKEVM_RPC_URL || 'https://zkevm-rpc.com',
      accounts: pk(),
      chainId: 1101,
      ...eip1559('POLYGON_ZKEVM'),
    },
    arbitrum: {
      url:
        process.env.ARBITRUM_RPC_URL ||
        'https://arbitrum-one-rpc.publicnode.com',
      accounts: pk(),
      chainId: 42161,
      ...eip1559('ARBITRUM'),
    },
    optimism: {
      url:
        process.env.OPTIMISM_RPC_URL || 'https://optimism-rpc.publicnode.com',
      accounts: pk(),
      chainId: 10,
      ...eip1559('OPTIMISM'),
    },
    base: {
      url: process.env.BASE_RPC_URL || 'https://base-rpc.publicnode.com',
      accounts: pk(),
      chainId: 8453,
      ...eip1559('BASE'),
    },
    avalanche: {
      url:
        process.env.AVALANCHE_RPC_URL ||
        'https://avalanche-c-chain-rpc.publicnode.com',
      accounts: pk(),
      chainId: 43114,
      ...eip1559('AVALANCHE'),
    },
    fantom: {
      url: process.env.FANTOM_RPC_URL || 'https://fantom-rpc.publicnode.com',
      accounts: pk(),
      chainId: 250,
      ...eip1559('FANTOM'),
    },
    bsc: {
      url: process.env.BSC_RPC_URL || 'https://bsc-rpc.publicnode.com',
      accounts: pk(),
      chainId: 56,
      gasPrice: 3000000000, // 3 gwei
    },
    opbnb: {
      url: process.env.OPBNB_RPC_URL || 'https://opbnb-rpc.publicnode.com',
      accounts: pk(),
      chainId: 204,
      gasPrice: 1000000000, // 1 gwei
    },
    sei: {
      url: process.env.SEI_RPC_URL || 'https://evm-rpc.sei-apis.com',
      accounts: pk(),
      chainId: 1329,
      ...eip1559('SEI'),
    },
    // ═══════════════════════════════════════════════════════════════════════════
    // TESTNET NETWORKS
    // ═══════════════════════════════════════════════════════════════════════════
    sepolia: {
      url:
        process.env.SEPOLIA_RPC_URL ||
        'https://ethereum-sepolia-rpc.publicnode.com',
      accounts: pk(),
      chainId: 11155111,
      ...eip1559('SEPOLIA'),
    },
    'polygon-zkevm-cardona': {
      url:
        process.env.POLYGON_ZKEVM_CARDONA_RPC_URL ||
        'https://rpc.cardona.zkevm-rpc.com',
      accounts: pk(),
      chainId: 2442,
      ...eip1559('POLYGON_ZKEVM_CARDONA'),
    },
    'arbitrum-sepolia': {
      url:
        process.env.ARBITRUM_SEPOLIA_RPC_URL ||
        'https://arbitrum-sepolia-rpc.publicnode.com',
      accounts: pk(),
      chainId: 421614,
      ...eip1559('ARBITRUM_SEPOLIA'),
    },
    'optimism-sepolia': {
      url:
        process.env.OPTIMISM_SEPOLIA_RPC_URL ||
        'https://optimism-sepolia-rpc.publicnode.com',
      accounts: pk(),
      chainId: 11155420,
      ...eip1559('OPTIMISM_SEPOLIA'),
    },
    'base-sepolia': {
      url:
        process.env.BASE_SEPOLIA_RPC_URL ||
        'https://base-sepolia-rpc.publicnode.com',
      accounts: pk(),
      chainId: 84532,
      ...eip1559('BASE_SEPOLIA'),
    },
    fuji: {
      url:
        process.env.FUJI_RPC_URL ||
        'https://avalanche-fuji-c-chain-rpc.publicnode.com',
      accounts: pk(),
      chainId: 43113,
      ...eip1559('FUJI'),
    },
    'fantom-testnet': {
      url:
        process.env.FANTOM_TESTNET_RPC_URL ||
        'https://fantom-testnet-rpc.publicnode.com',
      accounts: pk(),
      chainId: 4002,
      ...eip1559('FANTOM_TESTNET'),
    },
    'bsc-testnet': {
      url:
        process.env.BSC_TESTNET_RPC_URL ||
        'https://bsc-testnet-rpc.publicnode.com',
      accounts: pk(),
      chainId: 97,
      gasPrice: 10000000000, // 10 gwei
    },
    'opbnb-testnet': {
      url:
        process.env.OPBNB_TESTNET_RPC_URL ||
        'https://opbnb-testnet-rpc.publicnode.com',
      accounts: pk(),
      chainId: 5611,
      gasPrice: 1000000000, // 1 gwei
    },
    'sei-devnet': {
      url:
        process.env.SEI_DEVNET_RPC_URL ||
        'https://evm-rpc-arctic-1.sei-apis.com',
      accounts: pk(),
      chainId: 713715,
      ...eip1559('SEI_DEVNET'),
    },
  },
  etherscan: {
    apiKey: {
      // Mainnet networks
      mainnet: process.env.ETHERSCAN_API_KEY || '',
      polygon: process.env.POLYGONSCAN_API_KEY || '',
      polygonZkEVM: process.env.POLYGON_ZKEVM_API_KEY || '',
      arbitrumOne: process.env.ARBISCAN_API_KEY || '',
      optimisticEthereum: process.env.OPTIMISM_API_KEY || '',
      base: process.env.BASESCAN_API_KEY || '',
      avalanche: process.env.SNOWTRACE_API_KEY || '',
      opera: process.env.FTMSCAN_API_KEY || '',
      bsc: process.env.BSCSCAN_API_KEY || '',
      // Testnet networks
      sepolia: process.env.ETHERSCAN_API_KEY || '',
      polygonZkEVMTestnet: process.env.POLYGON_ZKEVM_API_KEY || '',
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || '',
      optimismSepolia: process.env.OPTIMISM_API_KEY || '',
      baseSepolia: process.env.BASESCAN_API_KEY || '',
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY || '',
      ftmTestnet: process.env.FTMSCAN_API_KEY || '',
      bscTestnet: process.env.BSCSCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'arbitrumOne',
        chainId: 42161,
        urls: {
          apiURL: 'https://api.arbiscan.io/api',
          browserURL: 'https://arbiscan.io',
        },
      },
      {
        network: 'arbitrumSepolia',
        chainId: 421614,
        urls: {
          apiURL: 'https://api-sepolia.arbiscan.io/api',
          browserURL: 'https://sepolia.arbiscan.io',
        },
      },
      {
        network: 'polygonZkEVM',
        chainId: 1101,
        urls: {
          apiURL: 'https://api-zkevm.polygonscan.com/api',
          browserURL: 'https://zkevm.polygonscan.com',
        },
      },
      {
        network: 'polygonZkEVMTestnet',
        chainId: 2442,
        urls: {
          apiURL: 'https://api-cardona-zkevm.polygonscan.com/api',
          browserURL: 'https://cardona-zkevm.polygonscan.com',
        },
      },
      {
        network: 'base',
        chainId: 8453,
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://basescan.org',
        },
      },
      {
        network: 'baseSepolia',
        chainId: 84532,
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org',
        },
      },
      {
        network: 'optimismSepolia',
        chainId: 11155420,
        urls: {
          apiURL: 'https://api-sepolia-optimism.etherscan.io/api',
          browserURL: 'https://sepolia-optimism.etherscan.io',
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: true,
    runOnCompile: true,
    strict: false,
    // Removed restrictive 'only' filter to include all contracts
  },
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6',
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  mocha: {
    timeout: 90000,
  },
};

export default config;

// ---- helpers ----
function pk() {
  return process.env.DEPLOYER_PRIVATE_KEY
    ? [process.env.DEPLOYER_PRIVATE_KEY]
    : [];
}
function parseGwei(n?: string) {
  return n ? Math.floor(Number(n) * 1e9) : undefined;
}
function eip1559(prefix: string) {
  const maxFee = parseGwei(
    process.env[`${prefix}_MAX_FEE_GWEI`] || process.env.MAX_FEE_GWEI
  );
  const maxPrio = parseGwei(
    process.env[`${prefix}_MAX_PRIORITY_FEE_GWEI`] ||
      process.env.MAX_PRIORITY_FEE_GWEI
  );
  return maxFee && maxPrio
    ? { maxFeePerGas: maxFee, maxPriorityFeePerGas: maxPrio }
    : {};
}
function withEip1559(n: any) {
  const cfg: any = { ...n };
  const overrides = eip1559('MAINNET');
  if (Object.keys(overrides).length) {
    Object.assign(cfg, overrides);
  } else if (n.legacyGasPriceWei) {
    cfg.gasPrice = parseInt(n.legacyGasPriceWei);
  }
  return cfg;
}

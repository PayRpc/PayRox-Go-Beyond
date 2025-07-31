import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';
import 'hardhat-contract-sizer';
import { HardhatUserConfig } from 'hardhat/config';
import 'solidity-coverage';
// Import tasks
import './tasks/payrox';
import './tasks/payrox-ops';
import './tasks/payrox-release';
import './tasks/payrox-roles';

dotenv.config();

const config: HardhatUserConfig = {
  defaultNetwork: process.env.DEFAULT_NETWORK || 'hardhat',
  solidity: {
    version: '0.8.30',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
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
    mainnet: withEip1559({
      url: process.env.MAINNET_RPC_URL || '',
      accounts: pk(),
      // Fallback legacy gas if EIP-1559 env not provided
      legacyGasPriceWei: process.env.GAS_PRICE,
      gasMultiplier: 1.2,
    }),
    sepolia: {
      url: process.env.TESTNET_RPC_URL || process.env.SEPOLIA_RPC_URL || '',
      accounts: pk(),
      ...eip1559('SEPOLIA'),
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || '',
      accounts: pk(),
      ...eip1559('POLYGON'),
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || '',
      accounts: pk(),
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || '',
      sepolia: process.env.ETHERSCAN_API_KEY || '',
      polygon: process.env.POLYGONSCAN_API_KEY || '',
      arbitrum: process.env.ARBISCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'arbitrum',
        chainId: 42161,
        urls: {
          apiURL: 'https://api.arbiscan.io/api',
          browserURL: 'https://arbiscan.io',
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
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    only: [':^contracts/'],
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

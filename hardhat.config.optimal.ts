import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";

// ✅ LEARNED: Common settings for deterministic CREATE2 builds
const COMMON_SETTINGS = {
  optimizer: { enabled: true, runs: 200 },
  viaIR: false, // Set to true for complex contracts if needed
  metadata: { bytecodeHash: "none" as const }, // Deterministic for CREATE2
};

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      // ✅ LEARNED: For facets with pragma ^0.8.20
      { version: "0.8.20", settings: COMMON_SETTINGS },
      // ✅ LEARNED: For dispatcher with pragma 0.8.30  
      { version: "0.8.30", settings: COMMON_SETTINGS },
    ],
    overrides: {
      // ✅ LEARNED: Force dispatcher to use 0.8.30
      "contracts/dispatcher/ManifestDispatcher.sol": {
        version: "0.8.30",
        settings: COMMON_SETTINGS,
      },
    },
  },

  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },

  contractSizer: {
    runOnCompile: true,
    strict: false,
    disambiguatePaths: true,
  },

  paths: {
    sources: "contracts",
    tests: "test", 
    cache: "cache",
    artifacts: "artifacts",
  },
};

export default config;
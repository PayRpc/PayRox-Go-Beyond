import { ethers } from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

/**
 * Enhanced epoch checker for PayRox ManifestDispatcher with CLI optimization
 * Follows PayRox enterprise standards for deployment monitoring and validation
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

export interface EpochInfo {
  activeEpoch: bigint;
  timestamp: number;
  blockNumber: number;
  dispatcherAddress: string;
  networkName: string;
  chainId: bigint;
}

export interface CheckEpochOptions {
  dispatcherAddress?: string;
  verbose?: boolean;
  json?: boolean;
  validate?: boolean;
  timeout?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_OPTIONS: Required<CheckEpochOptions> = {
  dispatcherAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // localhost default
  verbose: false,
  json: false,
  validate: true,
  timeout: 30000, // 30 seconds
};

const NETWORK_DISPATCHER_ADDRESSES = {
  localhost: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  hardhat: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  sepolia: '', // To be configured
  mainnet: '', // To be configured
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════

class EpochCheckError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly dispatcherAddress?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'EpochCheckError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate Ethereum address format
 * @param address The address to validate
 * @throws EpochCheckError if address is invalid
 */
function validateAddress(address: string): void {
  if (!address || typeof address !== 'string') {
    throw new EpochCheckError(
      'Address must be a non-empty string',
      'INVALID_ADDRESS'
    );
  }

  if (!ethers.isAddress(address)) {
    throw new EpochCheckError(
      `Invalid Ethereum address: ${address}`,
      'INVALID_ADDRESS_FORMAT',
      address
    );
  }
}

/**
 * Get dispatcher address for current network
 * @param hre Hardhat Runtime Environment
 * @param providedAddress Optional address override
 * @returns Validated dispatcher address
 */
function getDispatcherAddress(
  hre: HardhatRuntimeEnvironment,
  providedAddress?: string
): string {
  if (providedAddress) {
    validateAddress(providedAddress);
    return providedAddress;
  }

  const networkName = hre.network
    .name as keyof typeof NETWORK_DISPATCHER_ADDRESSES;
  const networkAddress = NETWORK_DISPATCHER_ADDRESSES[networkName];

  if (!networkAddress) {
    throw new EpochCheckError(
      `No dispatcher address configured for network: ${networkName}`,
      'NETWORK_NOT_CONFIGURED',
      undefined
    );
  }

  return networkAddress;
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE EPOCH CHECKING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check epoch information with comprehensive validation
 * @param options Configuration options
 * @returns Complete epoch information
 */
export async function checkEpoch(
  options: CheckEpochOptions = {}
): Promise<EpochInfo> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const hre = require('hardhat') as HardhatRuntimeEnvironment;

  try {
    if (config.verbose) {
      console.log('🔍 Starting epoch check...');
    }

    // Get and validate dispatcher address
    const dispatcherAddress = getDispatcherAddress(
      hre,
      config.dispatcherAddress
    );

    if (config.verbose) {
      console.log(
        `📡 Connecting to ManifestDispatcher at: ${dispatcherAddress}`
      );
      console.log(`🌐 Network: ${hre.network.name}`);
    }

    // Create contract instance with timeout
    const dispatcher = await Promise.race([
      ethers.getContractAt('ManifestDispatcher', dispatcherAddress),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new EpochCheckError(
                'Connection timeout',
                'CONNECTION_TIMEOUT',
                dispatcherAddress
              )
            ),
          config.timeout
        )
      ),
    ]);

    // Get current block information
    const [block, activeEpoch] = await Promise.all([
      ethers.provider.getBlock('latest'),
      dispatcher.activeEpoch(),
    ]);

    if (!block) {
      throw new EpochCheckError('Failed to get latest block', 'BLOCK_ERROR');
    }

    // Validate epoch if requested
    if (config.validate) {
      await validateEpochState(dispatcher, activeEpoch, config.verbose);
    }

    const epochInfo: EpochInfo = {
      activeEpoch,
      timestamp: block.timestamp,
      blockNumber: block.number,
      dispatcherAddress,
      networkName: hre.network.name,
      chainId: (await ethers.provider.getNetwork()).chainId,
    };

    if (config.verbose) {
      console.log('✅ Epoch check completed successfully');
    }

    return epochInfo;
  } catch (error) {
    if (error instanceof EpochCheckError) {
      throw error;
    }

    throw new EpochCheckError(
      `Failed to check epoch: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'EPOCH_CHECK_FAILED',
      config.dispatcherAddress,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Validate epoch state with comprehensive checks
 * @param dispatcher ManifestDispatcher contract instance
 * @param activeEpoch Current active epoch
 * @param verbose Enable verbose logging
 */
async function validateEpochState(
  dispatcher: any,
  activeEpoch: bigint,
  verbose: boolean = false
): Promise<void> {
  try {
    if (verbose) {
      console.log('🔍 Validating epoch state...');
    }

    // Check if epoch is reasonable (not zero unless initial state)
    if (activeEpoch < 0n) {
      throw new EpochCheckError(
        `Invalid epoch value: ${activeEpoch}`,
        'INVALID_EPOCH_VALUE'
      );
    }

    // Additional contract state validation
    const [isContract, codeSize] = await Promise.all([
      ethers.provider.getCode(await dispatcher.getAddress()),
      ethers.provider
        .getCode(await dispatcher.getAddress())
        .then(code => code.length),
    ]);

    if (isContract === '0x') {
      throw new EpochCheckError(
        'No contract deployed at dispatcher address',
        'CONTRACT_NOT_DEPLOYED',
        await dispatcher.getAddress()
      );
    }

    if (codeSize < 10) {
      // Minimal contract should have more than 5 bytes
      throw new EpochCheckError(
        'Contract appears to be invalid or minimal',
        'INVALID_CONTRACT',
        await dispatcher.getAddress()
      );
    }

    if (verbose) {
      console.log('✅ Epoch state validation passed');
    }
  } catch (error) {
    if (error instanceof EpochCheckError) {
      throw error;
    }

    throw new EpochCheckError(
      `Epoch validation failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'VALIDATION_FAILED',
      undefined,
      error instanceof Error ? error : undefined
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI OUTPUT FORMATTING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format epoch information for CLI output
 * @param epochInfo Epoch information object
 * @param options Output formatting options
 */
function formatOutput(epochInfo: EpochInfo, options: CheckEpochOptions): void {
  if (options.json) {
    console.log(
      JSON.stringify(
        epochInfo,
        (key, value) => (typeof value === 'bigint' ? value.toString() : value),
        2
      )
    );
    return;
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 PayRox ManifestDispatcher - Epoch Information');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🔢 Active Epoch: ${epochInfo.activeEpoch.toString()}`);
  console.log(`📡 Dispatcher: ${epochInfo.dispatcherAddress}`);
  console.log(
    `🌐 Network: ${epochInfo.networkName} (Chain ID: ${epochInfo.chainId})`
  );
  console.log(`📦 Block Number: ${epochInfo.blockNumber}`);
  console.log(
    `⏰ Timestamp: ${new Date(epochInfo.timestamp * 1000).toISOString()}`
  );
  console.log('═══════════════════════════════════════════════════════════');
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse command line arguments
 * @param args Command line arguments
 * @returns Parsed options
 */
export function parseCliArgs(args: string[]): CheckEpochOptions {
  const options: CheckEpochOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--address':
      case '-a':
        options.dispatcherAddress = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--json':
      case '-j':
        options.json = true;
        break;
      case '--no-validate':
        options.validate = false;
        break;
      case '--timeout':
      case '-t':
        options.timeout = parseInt(args[++i], 10);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          printHelp();
          process.exit(1);
        }
        break;
    }
  }

  return options;
}

/**
 * Print CLI help information
 */
function printHelp(): void {
  console.log(`
PayRox Epoch Checker - Check ManifestDispatcher active epoch

Usage: npx hardhat run scripts/check-epoch.ts [options]

Options:
  -a, --address <address>     Dispatcher contract address
  -v, --verbose              Enable verbose output
  -j, --json                 Output in JSON format
  --no-validate              Skip epoch validation
  -t, --timeout <ms>         Connection timeout in milliseconds (default: 30000)
  -h, --help                 Show this help message

Examples:
  npx hardhat run scripts/check-epoch.ts --verbose
  npx hardhat run scripts/check-epoch.ts --address 0x123... --json
  npx hardhat run scripts/check-epoch.ts --network sepolia
`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Main execution function with enhanced error handling
 */
async function main(): Promise<void> {
  try {
    const options = parseCliArgs(process.argv.slice(2));

    if (options.verbose) {
      console.log('🚀 PayRox Epoch Checker starting...');
    }

    const epochInfo = await checkEpoch(options);
    formatOutput(epochInfo, options);

    if (options.verbose) {
      console.log('🎉 Epoch check completed successfully!');
    }
  } catch (error) {
    console.error('❌ Epoch check failed:');

    if (error instanceof EpochCheckError) {
      console.error(`   Code: ${error.code}`);
      console.error(`   Message: ${error.message}`);
      if (error.dispatcherAddress) {
        console.error(`   Dispatcher: ${error.dispatcherAddress}`);
      }
      if (error.cause) {
        console.error(`   Cause: ${error.cause.message}`);
      }
      process.exit(1);
    } else {
      console.error(
        `   ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      process.exit(1);
    }
  }
}

// Execute main function only if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

// Export for testing and module usage
export { main, validateEpochState };

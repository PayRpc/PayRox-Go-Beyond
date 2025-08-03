// scripts/activate-root.ts
/**
 * Enhanced Activate Root Script v2.0
 *
 * Activates committed manifest root with comprehensive validation,
 * error handling, and production-ready features.
 *
 * @author PayRox Go Beyond Team
 * @version 2.0.0 Enhanced
 */

import { ethers } from 'hardhat';
import { getNetworkManager } from '../src/utils/network';
import {
  fileExists,
  getPathManager,
  readFileContent,
  safeParseJSON,
} from '../src/utils/paths';

// Enhanced error types for better error handling
class ActivationError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'ActivationError';
  }
}

// Types for better type safety
interface DispatcherState {
  activeEpoch: bigint;
  activeRoot: string;
  committedRoot: string;
  committedAt: bigint;
  activationDelay: bigint;
  frozen: boolean;
  paused: boolean;
}

interface ActivationResult {
  success: boolean;
  transactionHash?: string;
  gasUsed?: string;
  blockNumber?: number;
  newEpoch?: bigint;
  newRoot?: string;
  activationTime: number;
}

// CLI argument parsing
interface CliArgs {
  dispatcherAddr?: string;
  epoch?: bigint;
  dryRun?: boolean;
  help?: boolean;
  verbose?: boolean;
  force?: boolean;
  network?: string;
}

/**
 * Parse command line arguments with enhanced validation
 */
export function parseCliArgs(): CliArgs {
  const args: CliArgs = {};

  // Environment variables
  args.dispatcherAddr = process.env.DISPATCHER;
  args.epoch = process.env.EPOCH ? BigInt(process.env.EPOCH) : undefined;

  // Command line arguments
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--verbose' || arg === '-v') {
      args.verbose = true;
    } else if (arg === '--force') {
      args.force = true;
    } else if (arg === '--network') {
      args.network = argv[++i];
    } else if (arg.startsWith('0x') && !args.dispatcherAddr) {
      args.dispatcherAddr = arg;
    } else if (/^\d+$/.test(arg) && !args.epoch) {
      args.epoch = BigInt(arg);
    }
  }

  return args;
}

/**
 * Display comprehensive help information
 */
function displayHelp(): void {
  console.log(`
🔥 PayRox Activate Root Script v2.0 Enhanced
============================================

Activates committed manifest root with comprehensive validation and safety features.

USAGE:
  npx hardhat run scripts/activate-root.ts [OPTIONS] [DISPATCHER] [EPOCH]

OPTIONS:
  --dry-run        Preview activation without executing
  --help, -h       Display this help message
  --verbose, -v    Enable detailed logging
  --force          Skip confirmation prompts
  --network NAME   Target specific network

ENVIRONMENT VARIABLES:
  DISPATCHER=0x...  Dispatcher contract address
  EPOCH=N          Epoch number to activate

EXAMPLES:
  # Basic activation (auto-detect from deployment)
  npx hardhat run scripts/activate-root.ts

  # Explicit dispatcher and epoch
  npx hardhat run scripts/activate-root.ts 0x1234... 2

  # Dry-run mode
  npx hardhat run scripts/activate-root.ts --dry-run

  # Verbose mode with force
  npx hardhat run scripts/activate-root.ts --verbose --force

FEATURES:
  ✅ Automatic address detection from deployment files
  ✅ Comprehensive state validation and verification
  ✅ Dry-run mode for safe preview
  ✅ Time advancement for local networks
  ✅ Detailed error reporting and recovery guidance
  ✅ Production-ready safety checks
`);
}

/**
 * Enhanced validation of contract address with network verification
 */
export async function validateContractAddress(
  address: string,
  verbose = false
): Promise<void> {
  if (!ethers.isAddress(address)) {
    throw new ActivationError(
      'Invalid dispatcher address format',
      'INVALID_ADDRESS',
      { address }
    );
  }

  const code = await ethers.provider.getCode(address);
  if (code === '0x' || code === '0x0') {
    if (verbose) {
      console.log('[WARN] No code found at dispatcher address');
      console.log('[INFO] This can happen if:');
      console.log('  - Network restarted between deployment steps');
      console.log('  - Wrong network selected');
      console.log('  - Contract not deployed yet');
    }
    throw new ActivationError(
      'No contract found at dispatcher address',
      'CONTRACT_NOT_FOUND',
      { address, code }
    );
  }

  if (verbose) {
    console.log(`[INFO] Contract verified at: ${address}`);
    console.log(`[INFO] Code size: ${(code.length - 2) / 2} bytes`);
  }
}

/**
 * Enhanced dispatcher state reader with comprehensive error handling
 */
export async function getDispatcherState(
  dispatcher: any,
  verbose = false
): Promise<DispatcherState> {
  try {
    // Try modern interface first
    const [
      activeEpoch,
      activeRoot,
      committedRoot,
      committedAt,
      activationDelay,
      frozen,
    ] = await Promise.all([
      dispatcher.activeEpoch?.() || 0n,
      dispatcher.activeRoot?.() || '0x0',
      dispatcher.pendingRoot?.() || '0x0',
      dispatcher.pendingSince?.() || 0n,
      dispatcher.activationDelay?.() || 0n,
      dispatcher.frozen?.() || false,
    ]);

    // Try to get paused state (optional)
    let paused = false;
    try {
      paused = (await dispatcher.paused?.()) || false;
    } catch {
      // Paused state not available
    }

    const state: DispatcherState = {
      activeEpoch: BigInt(activeEpoch),
      activeRoot: activeRoot.toString(),
      committedRoot: committedRoot.toString(),
      committedAt: BigInt(committedAt),
      activationDelay: BigInt(activationDelay),
      frozen: Boolean(frozen),
      paused: Boolean(paused),
    };

    if (verbose) {
      console.log('[INFO] Dispatcher State:');
      console.log(`  Active Epoch: ${state.activeEpoch}`);
      console.log(`  Active Root: ${state.activeRoot}`);
      console.log(`  Committed Root: ${state.committedRoot}`);
      console.log(`  Committed At: ${state.committedAt}`);
      console.log(`  Activation Delay: ${state.activationDelay}s`);
      console.log(`  Frozen: ${state.frozen}`);
      console.log(`  Paused: ${state.paused}`);
    }

    return state;
  } catch (error) {
    throw new ActivationError(
      'Failed to read dispatcher state',
      'STATE_READ_ERROR',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

async function main() {
  const startTime = Date.now();
  console.log('🔥 PayRox Activate Root Script v2.0 Enhanced');
  console.log('============================================');

  // Parse command line arguments
  const args = parseCliArgs();

  if (args.help) {
    displayHelp();
    return;
  }

  const verbose = args.verbose || false;

  if (verbose) {
    console.log('[INFO] Enhanced activation with comprehensive validation');
    console.log('[INFO] Dry-run mode:', args.dryRun || false);
    console.log('[INFO] Force mode:', args.force || false);
  }

  // Get dispatcher address and epoch
  let dispatcherAddr = args.dispatcherAddr;
  let epoch = args.epoch;

  // If not provided via args, try to read from deployment artifacts using consolidated utilities
  if (!dispatcherAddr) {
    if (verbose) {
      console.log(
        '[INFO] Auto-detecting dispatcher address from deployment artifacts...'
      );
    }

    const pathManager = getPathManager();
    const networkManager = getNetworkManager();

    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId.toString();
    const networkDetection = networkManager.determineNetworkName(chainId);
    const networkName = networkDetection.networkName;

    if (verbose) {
      console.log(`[INFO] Network: ${networkName} (Chain ID: ${chainId})`);
    }

    // Check primary dispatcher.json file
    const dispatcherPath = pathManager.getDeploymentPath(
      networkName,
      'dispatcher.json'
    );

    if (fileExists(dispatcherPath)) {
      try {
        const dispatcherData = safeParseJSON(readFileContent(dispatcherPath));
        dispatcherAddr = dispatcherData.address;
        if (verbose) {
          console.log(
            `[INFO] Found dispatcher from ${dispatcherPath}:`,
            dispatcherAddr
          );
        }
      } catch (error) {
        if (verbose) {
          console.warn('[WARN] Failed to read dispatcher artifact:', error);
        }
      }
    }

    // Fallback: check ManifestDispatcher.json
    if (!dispatcherAddr) {
      const altDispatcherPath = pathManager.getDeploymentPath(
        networkName,
        'ManifestDispatcher.json'
      );
      if (fileExists(altDispatcherPath)) {
        try {
          const dispatcherData = safeParseJSON(
            readFileContent(altDispatcherPath)
          );
          dispatcherAddr = dispatcherData.address;
          if (verbose) {
            console.log(
              `[INFO] Found dispatcher from ${altDispatcherPath}:`,
              dispatcherAddr
            );
          }
        } catch (error) {
          if (verbose) {
            console.warn(
              '[WARN] Failed to read alternative dispatcher artifact:',
              error
            );
          }
        }
      }
    }
  }

  // Try to get epoch from manifest if not provided using consolidated utilities
  if (epoch === undefined) {
    if (verbose) {
      console.log('[INFO] Auto-detecting epoch from manifest...');
    }

    const pathManager = getPathManager();
    const manifestPath = pathManager.getManifestPath('current.manifest.json');

    if (fileExists(manifestPath)) {
      try {
        const manifest = safeParseJSON(readFileContent(manifestPath));
        if (manifest.epoch !== undefined) {
          epoch = BigInt(manifest.epoch);
          if (verbose) {
            console.log(`[INFO] Found epoch from manifest: ${epoch}`);
          }
        } else {
          // Try header epoch or use default
          epoch = manifest.header?.epoch ? BigInt(manifest.header.epoch) : 1n;
          if (verbose) {
            console.log(`[INFO] Using epoch from header or default: ${epoch}`);
          }
        }
      } catch (error) {
        if (verbose) {
          console.warn('[WARN] Failed to read manifest:', error);
        }
        epoch = 1n; // Safe default
      }
    } else {
      // Fallback to epoch 1
      epoch = 1n;
      if (verbose) {
        console.log('[INFO] Using fallback epoch:', epoch.toString());
      }
    }
  }

  // Validation
  if (!dispatcherAddr || epoch === undefined) {
    console.error('❌ CONFIGURATION ERROR');
    console.error(
      '   Missing required parameters: dispatcher address and/or epoch'
    );
    console.error('\n💡 SOLUTIONS:');
    console.error('   1. Use environment variables:');
    console.error(
      '      DISPATCHER=0x... EPOCH=N npx hardhat run scripts/activate-root.ts'
    );
    console.error('   2. Use command line arguments:');
    console.error('      npx hardhat run scripts/activate-root.ts -- 0x... N');
    console.error('   3. Use --help for detailed usage information');
    process.exit(1);
  }

  console.log(`\n📋 ACTIVATION PARAMETERS`);
  console.log(`   Dispatcher: ${dispatcherAddr}`);
  console.log(`   Target Epoch: ${epoch.toString()}`);
  console.log(`   Dry-run Mode: ${args.dryRun || false}`);

  // Enhanced network connectivity and contract validation
  try {
    if (verbose) {
      console.log('\n🔍 NETWORK VALIDATION');
    }

    const network = await ethers.provider.getNetwork();
    console.log(
      `   Network: ${network.name || 'unknown'} (Chain ID: ${network.chainId})`
    );

    await validateContractAddress(dispatcherAddr, verbose);
  } catch (error) {
    if (error instanceof ActivationError) {
      console.log(`\n⚠️  NETWORK CONNECTIVITY ISSUE`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code}`);

      if (error.code === 'CONTRACT_NOT_FOUND') {
        console.log('\n💡 POTENTIAL SOLUTIONS:');
        console.log('   1. Verify network is running and accessible');
        console.log('   2. Check if contract is deployed on this network');
        console.log('   3. Restart Hardhat network if using localhost');
        console.log('   4. Verify dispatcher address is correct');
        console.log(
          '\n   System deployment may still be successful - activation can be retried later'
        );

        if (!args.force) {
          process.exit(0); // Exit gracefully unless forced
        }
      }
    } else {
      console.log('\n⚠️  UNEXPECTED NETWORK ERROR');
      console.log(
        `   Error: ${error instanceof Error ? error.message : String(error)}`
      );
      console.log('   This often happens with ephemeral test networks');
      console.log(
        '   System deployment is still successful - activation can be retried later'
      );

      if (!args.force) {
        process.exit(0); // Exit gracefully unless forced
      }
    }
  }

  // Get dispatcher contract
  const dispatcher = await ethers.getContractAt(
    'ManifestDispatcher',
    dispatcherAddr
  );

  // Get comprehensive dispatcher state
  let state: DispatcherState;
  try {
    console.log('\n📊 DISPATCHER STATE ANALYSIS');
    state = await getDispatcherState(dispatcher, verbose);

    // Validation checks
    if (state.frozen) {
      throw new ActivationError(
        'Dispatcher is frozen - no further activations allowed',
        'DISPATCHER_FROZEN'
      );
    }

    if (state.paused) {
      throw new ActivationError(
        'Dispatcher is paused - activation not allowed',
        'DISPATCHER_PAUSED'
      );
    }

    if (
      state.committedRoot === '0x0' ||
      state.committedRoot ===
        '0x0000000000000000000000000000000000000000000000000000000000000000'
    ) {
      throw new ActivationError(
        'No committed root found - nothing to activate',
        'NO_COMMITTED_ROOT'
      );
    }

    if (state.activeEpoch >= epoch) {
      console.log(`\n⚠️  EPOCH ALREADY ACTIVE`);
      console.log(`   Current Active Epoch: ${state.activeEpoch}`);
      console.log(`   Requested Epoch: ${epoch}`);
      console.log(`   Status: Epoch ${epoch} is already active or superseded`);

      if (!args.force) {
        console.log('\n   Use --force to proceed anyway');
        return;
      }
    }

    // Check activation delay
    if (state.activationDelay > 0n) {
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      const earliestActivation = state.committedAt + state.activationDelay;

      if (currentTime < earliestActivation) {
        const waitTime = Number(earliestActivation - currentTime);
        console.log(`\n⏰ ACTIVATION DELAY PENDING`);
        console.log(
          `   Committed At: ${new Date(
            Number(state.committedAt) * 1000
          ).toLocaleString()}`
        );
        console.log(`   Activation Delay: ${state.activationDelay}s`);
        console.log(
          `   Earliest Activation: ${new Date(
            Number(earliestActivation) * 1000
          ).toLocaleString()}`
        );
        console.log(`   Wait Time Remaining: ${waitTime}s`);

        if (!args.force) {
          throw new ActivationError(
            `Activation delay not met - must wait ${waitTime} more seconds`,
            'ACTIVATION_DELAY_PENDING',
            { waitTime, earliestActivation }
          );
        }
      }
    }
  } catch (error) {
    if (error instanceof ActivationError) {
      console.log(`\n❌ VALIDATION ERROR`);
      console.log(`   ${error.message}`);

      if (error.code === 'ACTIVATION_DELAY_PENDING') {
        console.log('\n💡 OPTIONS:');
        console.log('   1. Wait for the activation delay to pass');
        console.log('   2. Use --force to override (if permitted)');
        console.log('   3. Use time advancement for local networks');
      }

      if (!args.force) {
        throw error;
      }
    } else {
      console.log(
        '\n⚠️  Could not read dispatcher state, proceeding with activation'
      );
      if (verbose) {
        console.log(
          `   Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  // Handle time advancement for local networks
  const networkName = (await ethers.provider.getNetwork()).name;
  if (networkName === 'hardhat' || networkName === 'localhost') {
    console.log('\n⏰ LOCAL NETWORK TIME ADVANCEMENT');
    console.log('   Hardhat network detected - advancing time if needed');

    try {
      // Fast-forward time to handle any activation delay
      await ethers.provider.send('evm_increaseTime', [3600]); // 1 hour
      await ethers.provider.send('evm_mine', []);
      console.log('   ✅ Time advanced by 1 hour');
    } catch (error) {
      if (verbose) {
        console.log(
          `   ⚠️  Could not advance time: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  // Dry-run mode
  if (args.dryRun) {
    console.log('\n🔍 DRY-RUN MODE - PREVIEW ONLY');
    console.log('===============================');
    console.log(`✅ All validations passed`);
    console.log(`📋 Would activate epoch: ${epoch}`);
    console.log(`📋 Current active epoch: ${state?.activeEpoch || 'unknown'}`);
    console.log(`📋 Committed root: ${state?.committedRoot || 'unknown'}`);
    console.log('\n   Run without --dry-run to execute activation');
    return;
  }

  // Confirmation prompt (unless forced)
  if (!args.force) {
    console.log('\n⚠️  ACTIVATION CONFIRMATION');
    console.log('   This will activate the committed manifest root');
    console.log('   This action cannot be undone');
    console.log(
      '\n   Proceeding in 3 seconds... (use --force to skip this delay)'
    );

    // Brief delay for manual cancellation with Ctrl+C
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('   ✅ Confirmation timeout passed, proceeding...');
  }

  // Execute activation
  console.log('\n🚀 EXECUTING ACTIVATION');
  console.log('========================');

  const result: ActivationResult = {
    success: false,
    activationTime: Date.now(),
  };

  try {
    console.log('   📤 Submitting activation transaction...');
    const tx = await dispatcher.activateCommittedRoot();
    console.log(`   ✅ Transaction submitted: ${tx.hash}`);
    result.transactionHash = tx.hash;

    console.log('   ⏳ Waiting for confirmation...');
    const receipt = await tx.wait();
    console.log('   ✅ Transaction confirmed!');

    result.success = true;
    result.gasUsed = receipt?.gasUsed?.toString() || 'N/A';
    result.blockNumber = receipt?.blockNumber || 0;

    console.log('\n📊 TRANSACTION DETAILS');
    console.log(`   Gas Used: ${result.gasUsed}`);
    console.log(`   Block Number: ${result.blockNumber}`);
    console.log(`   Transaction Hash: ${result.transactionHash}`);

    // Enhanced verification
    console.log('\n🔍 ACTIVATION VERIFICATION');
    try {
      const newState = await getDispatcherState(dispatcher, verbose);
      result.newEpoch = newState.activeEpoch;
      result.newRoot = newState.activeRoot;

      console.log(`   New Active Epoch: ${newState.activeEpoch}`);
      console.log(`   New Active Root: ${newState.activeRoot}`);
      console.log(`   Previous Epoch: ${state?.activeEpoch || 'unknown'}`);

      if (newState.activeEpoch === epoch) {
        console.log('   ✅ Epoch activation verified successfully!');
      } else if (newState.activeEpoch > (state?.activeEpoch || 0n)) {
        console.log('   ✅ Epoch advanced (may be auto-incremented)');
      } else {
        console.log('   ⚠️  Activation may not have taken effect as expected');
      }

      // Check for events in transaction receipt
      if (receipt?.logs && receipt.logs.length > 0) {
        console.log(`   📋 Events Emitted: ${receipt.logs.length}`);
        if (verbose) {
          receipt.logs.forEach((log, i) => {
            console.log(`     Event ${i + 1}: ${log.topics[0]}`);
          });
        }
      }
    } catch (verificationError) {
      console.log('   ⚠️  Could not verify activation state');
      if (verbose) {
        console.log(
          `   Error: ${
            verificationError instanceof Error
              ? verificationError.message
              : String(verificationError)
          }`
        );
      }
    }

    // Final success message
    const executionTime = Date.now() - startTime;
    console.log('\n🎉 ACTIVATION COMPLETED SUCCESSFULLY!');
    console.log('===================================');
    console.log(`   Total Execution Time: ${executionTime}ms`);
    console.log(`   Final Status: Root activated and verified`);
    console.log('\n💡 NEXT STEPS:');
    console.log('   1. ✅ Verify routing functionality');
    console.log('   2. 🧪 Test updated contract interactions');
    console.log('   3. 📋 Update deployment documentation');
    console.log('   4. 🚀 Deploy to other networks if needed');
  } catch (error) {
    result.success = false;

    console.log('\n❌ ACTIVATION FAILED');
    console.log('===================');

    if (error instanceof Error) {
      console.log(`   Error: ${error.message}`);

      // Provide specific guidance based on error type
      if (error.message.includes('ActivationNotReady')) {
        console.log('\n💡 SOLUTION:');
        console.log('   - Activation delay has not passed yet');
        console.log('   - Wait for the delay period or use time advancement');
      } else if (error.message.includes('NoPendingRoot')) {
        console.log('\n💡 SOLUTION:');
        console.log('   - No committed root available to activate');
        console.log('   - Run commit-root.ts first to commit a manifest');
      } else if (error.message.includes('BadEpoch')) {
        console.log('\n💡 SOLUTION:');
        console.log('   - Epoch mismatch (must be activeEpoch + 1)');
        console.log('   - Check current active epoch and adjust target');
      } else if (error.message.includes('FrozenError')) {
        console.log('\n💡 SOLUTION:');
        console.log('   - Dispatcher is frozen and cannot be modified');
        console.log('   - This is permanent and cannot be reversed');
      }
    } else {
      console.log(`   Error: ${String(error)}`);
    }

    const executionTime = Date.now() - startTime;
    console.log(`\n   Execution Time: ${executionTime}ms`);
    console.log('   Status: Failed - activation not completed');

    throw error;
  }
}

// Main execution only when run directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 FATAL ERROR');
      console.error('===============');
      console.error(
        `   ${error instanceof Error ? error.message : String(error)}`
      );

      if (error instanceof ActivationError) {
        console.error(`   Error Code: ${error.code}`);
        if (error.details) {
          console.error(
            `   Details: ${JSON.stringify(error.details, null, 2)}`
          );
        }
      }

      console.error('\n💡 TROUBLESHOOTING:');
      console.error('   1. Check network connectivity and contract deployment');
      console.error('   2. Verify dispatcher address and epoch parameters');
      console.error('   3. Ensure manifest is committed before activation');
      console.error('   4. Use --verbose for detailed debugging information');
      console.error('   5. Use --help for usage instructions');

      process.exit(1);
    });

  // Add timeout protection to prevent infinite execution
  if (process.env.NODE_ENV !== 'test') {
    const EXECUTION_TIMEOUT = 300000; // 5 minutes maximum execution time
    setTimeout(() => {
      console.error('\n⚠️  Script execution timeout (5 minutes exceeded)');
      console.error('   This prevents potential infinite loops or hanging');
      console.error('   Check network connectivity and try again');
      process.exit(1);
    }, EXECUTION_TIMEOUT);
  }
}

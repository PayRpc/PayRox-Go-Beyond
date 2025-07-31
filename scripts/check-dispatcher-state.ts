/**
 * Check Dispatcher State Script
 * 
 * Reads and displays the current state of a ManifestDispatcher contract
 * with proper error handling and validation
 */

import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

// Types
interface DispatcherState {
  activeEpoch: string;
  pendingEpoch: string;
  activeRoot: string;
  pendingRoot: string;
  contractAddress: string;
  hasCode: boolean;
}

interface StateCheckResult {
  field: string;
  value: string | null;
  success: boolean;
  error?: string;
}

/**
 * Validates that the dispatcher address is a valid Ethereum address
 */
function validateAddress(address: string): void {
  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
}

/**
 * Checks if there's code at the dispatcher address
 */
async function validateContractExists(address: string): Promise<boolean> {
  const code = await ethers.provider.getCode(address);
  return code !== '0x';
}

/**
 * Safely reads a field from the dispatcher contract
 */
async function safeReadField(
  dispatcher: any,
  fieldName: string,
  methodName: string
): Promise<StateCheckResult> {
  try {
    const value = await dispatcher[methodName]();
    return {
      field: fieldName,
      value: value.toString(),
      success: true
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      field: fieldName,
      value: null,
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Reads all dispatcher state fields safely
 */
async function readDispatcherState(dispatcher: any, address: string): Promise<DispatcherState> {
  const hasCode = await validateContractExists(address);
  
  if (!hasCode) {
    console.warn(`[WARN] No contract code found at address ${address}`);
  }

  // Read all fields with error handling
  const results = await Promise.all([
    safeReadField(dispatcher, 'activeEpoch', 'activeEpoch'),
    safeReadField(dispatcher, 'pendingEpoch', 'pendingEpoch'),
    safeReadField(dispatcher, 'activeRoot', 'activeRoot'),
    safeReadField(dispatcher, 'pendingRoot', 'pendingRoot')
  ]);

  // Display results
  console.log('\nDispatcher State:');
  console.log('================');
  
  for (const result of results) {
    if (result.success) {
      console.log(`✓ ${result.field}: ${result.value}`);
    } else {
      console.log(`✗ ${result.field}: failed to read (${result.error})`);
    }
  }

  return {
    activeEpoch: results[0].value || 'N/A',
    pendingEpoch: results[1].value || 'N/A',
    activeRoot: results[2].value || 'N/A',
    pendingRoot: results[3].value || 'N/A',
    contractAddress: address,
    hasCode
  };
}

/**
 * Attempts to find dispatcher address from deployment artifacts
 */
async function findDispatcherFromDeployments(): Promise<string | null> {
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();
  
  const possiblePaths = [
    `../deployments/localhost/dispatcher.json`,
    `../deployments/${chainId}/dispatcher.json`,
    `../deployments/hardhat/dispatcher.json`
  ];

  for (const relativePath of possiblePaths) {
    const fullPath = path.join(__dirname, relativePath);
    if (fs.existsSync(fullPath)) {
      try {
        const deploymentData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        console.log(`[INFO] Found dispatcher deployment at: ${relativePath}`);
        return deploymentData.address;
      } catch (parseError: unknown) {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        console.warn(`[WARN] Failed to parse deployment file: ${relativePath} - ${errorMessage}`);
      }
    }
  }

  return null;
}

/**
 * Gets dispatcher address from environment variable or deployment artifacts
 */
async function getDispatcherAddress(): Promise<string> {
  // Try environment variable first
  const envAddress = process.env.DISPATCHER;
  if (envAddress) {
    console.log(`[INFO] Using dispatcher address from DISPATCHER env var: ${envAddress}`);
    return envAddress;
  }

  // Try to find from deployment artifacts
  const deploymentAddress = await findDispatcherFromDeployments();
  if (deploymentAddress) {
    console.log(`[INFO] Using dispatcher address from deployment artifacts: ${deploymentAddress}`);
    return deploymentAddress;
  }

  throw new Error(
    'Dispatcher address not found. Either set DISPATCHER environment variable or ensure deployment artifacts exist.'
  );
}

/**
 * Displays comprehensive dispatcher information
 */
function displayDispatcherInfo(state: DispatcherState): void {
  console.log('\nDispatcher Summary:');
  console.log('==================');
  console.log(`Address: ${state.contractAddress}`);
  console.log(`Has Code: ${state.hasCode ? 'Yes' : 'No'}`);
  console.log(`Active Epoch: ${state.activeEpoch}`);
  console.log(`Pending Epoch: ${state.pendingEpoch}`);
  console.log(`Active Root: ${state.activeRoot}`);
  console.log(`Pending Root: ${state.pendingRoot}`);

  // Provide recommendations based on state
  console.log('\nRecommendations:');
  if (!state.hasCode) {
    console.log('- Deploy the dispatcher contract first');
  } else if (state.activeEpoch === 'N/A') {
    console.log('- Dispatcher may not be properly initialized or ABI mismatch');
  } else {
    console.log('- Dispatcher appears to be functioning');
    if (state.pendingRoot !== 'N/A' && state.pendingRoot !== state.activeRoot) {
      console.log('- There is a pending root that can be activated');
    }
  }
}

/**
 * Main function to check dispatcher state
 */
async function main(): Promise<void> {
  console.log('[INFO] Checking ManifestDispatcher state...');

  try {
    // Get dispatcher address
    const dispatcherAddress = await getDispatcherAddress();
    
    // Validate address format
    validateAddress(dispatcherAddress);

    // Connect to dispatcher
    const dispatcher = await ethers.getContractAt('ManifestDispatcher', dispatcherAddress);

    // Read and display state
    const state = await readDispatcherState(dispatcher, dispatcherAddress);
    
    // Display comprehensive information
    displayDispatcherInfo(state);

    console.log('\n[OK] Dispatcher state check completed successfully');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ERROR] State check failed:', errorMessage);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ERROR] Fatal error:', errorMessage);
    process.exit(1);
  });

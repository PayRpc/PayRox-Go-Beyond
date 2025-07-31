/**
 * Refactored Factory Fee Checker - Using Consolidated Utilities
 *
 * This demonstrates how the consolidated utilities simplify and standardize
 * the logic from the original check-actual-factory-fee.ts script.
 */

import { ethers } from 'hardhat';
import {
  FileSystemError,
  ValidationResult,
  createInvalidResult,
  createValidResult,
  logInfo,
  wrapMain,
} from '../src/utils/errors';
import { getNetworkManager, type NetworkConfig } from '../src/utils/network';
import {
  getPathManager,
  safeParseJSON,
  safeReadFile,
} from '../src/utils/paths';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES (Unchanged from original)
   ═══════════════════════════════════════════════════════════════════════════ */

interface FactoryFeeInfo {
  address: string;
  actualFeeEth: string;
  actualFeeWei: string;
  artifactFee: string | null;
  hasAdminRole: boolean;
  feeRecipient: string;
  feesEnabled: boolean;
  networkName: string;
  chainId: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSOLIDATED LOGIC
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Load and validate factory deployment artifact
 * Now using consolidated path and file system utilities
 */
function loadFactoryArtifact(networkName: string): any {
  const pathManager = getPathManager();
  const factoryPath = pathManager.getFactoryPath(networkName);

  // Use consolidated path validation
  const pathValidation = pathManager.validatePath(factoryPath);
  if (!pathValidation.isValid) {
    throw new FileSystemError(
      `Factory deployment not found at: ${factoryPath}`,
      'ARTIFACT_NOT_FOUND'
    );
  }

  // Use consolidated file operations
  const content = safeReadFile(factoryPath);
  return safeParseJSON(content, factoryPath);
}

/**
 * Validate that a contract exists at the given address
 * Simplified using consolidated utilities
 */
async function validateContractExists(
  address: string
): Promise<ValidationResult> {
  try {
    const code = await ethers.provider.getCode(address);
    if (code === '0x') {
      return createInvalidResult(
        `No contract code found at address ${address}`,
        'CONTRACT_NOT_FOUND',
        [
          'Verify the contract address is correct',
          'Check if the contract has been deployed to this network',
          'Ensure you are connected to the correct network',
        ]
      );
    }

    return createValidResult(`Contract found at ${address}`);
  } catch (error) {
    return createInvalidResult(
      `Error validating contract: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'CONTRACT_VALIDATION_ERROR'
    );
  }
}

/**
 * Read comprehensive factory information from the deployed contract
 * Simplified with better error handling
 */
async function readFactoryInfo(
  factoryArtifact: any,
  networkConfig: NetworkConfig
): Promise<FactoryFeeInfo> {
  // Validate contract exists first
  const contractValidation = await validateContractExists(
    factoryArtifact.address
  );
  if (!contractValidation.isValid) {
    throw new Error(contractValidation.message);
  }

  // Connect to factory contract
  const factory = await ethers.getContractAt(
    'DeterministicChunkFactory',
    factoryArtifact.address
  );

  // Read contract state in parallel for efficiency
  const [baseFeeWei, signer] = await Promise.all([
    factory.baseFeeWei(),
    ethers.getSigners().then(signers => signers[0]),
  ]);

  const [hasAdminRole, feeRecipient, feesEnabled] = await Promise.all([
    factory.hasRole(await factory.DEFAULT_ADMIN_ROLE(), signer.address),
    factory.feeRecipient(),
    factory.feesEnabled(),
  ]);

  const feeInEth = ethers.formatEther(baseFeeWei);

  return {
    address: factoryArtifact.address,
    actualFeeEth: feeInEth,
    actualFeeWei: baseFeeWei.toString(),
    artifactFee: factoryArtifact.constructorArguments?.[2] || null,
    hasAdminRole,
    feeRecipient,
    feesEnabled,
    networkName: networkConfig.name,
    chainId: networkConfig.chainId,
  };
}

/**
 * Validate fee consistency between artifact and contract
 * Enhanced with consolidated validation patterns
 */
function validateFeeConsistency(info: FactoryFeeInfo): ValidationResult {
  if (!info.artifactFee) {
    return createInvalidResult(
      'No fee information found in deployment artifact',
      'MISSING_ARTIFACT_FEE',
      [
        'Check deployment artifact structure',
        'Verify constructor arguments were saved',
        'Re-run deployment if necessary',
      ]
    );
  }

  const expectedFormat = `${info.actualFeeEth} ETH`;
  if (info.artifactFee === expectedFormat) {
    return createValidResult('Deployment fee matches artifact');
  }

  return createInvalidResult(
    `Fee mismatch - Artifact: ${info.artifactFee}, Actual: ${expectedFormat}`,
    'FEE_MISMATCH',
    [
      'Verify deployment configuration',
      'Check if fees were modified after deployment',
      'Update deployment artifacts if fees were intentionally changed',
    ]
  );
}

/**
 * Display comprehensive factory information
 * Enhanced formatting and validation display
 */
function displayFactoryInfo(info: FactoryFeeInfo): void {
  console.log('\\nFactory Fee Information:');
  console.log('========================');
  console.log(`Network: ${info.networkName} (Chain ID: ${info.chainId})`);
  console.log(`Factory Address: ${info.address}`);
  console.log(`Deployment Fee (Artifact): ${info.artifactFee || 'N/A'}`);
  console.log(`Actual Deployment Fee: ${info.actualFeeEth} ETH`);
  console.log(`Deployment Fee (Wei): ${info.actualFeeWei}`);
  console.log(`Current Signer has Admin Role: ${info.hasAdminRole}`);
  console.log(`Fee Recipient: ${info.feeRecipient}`);
  console.log(`Fees Enabled: ${info.feesEnabled}`);

  // Use consolidated validation display
  const validation = validateFeeConsistency(info);
  console.log(`\\nValidation: ${validation.isValid ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Result: ${validation.message}`);

  if (!validation.isValid && validation.recommendations) {
    console.log('\\nRecommendations:');
    validation.recommendations.forEach(rec => {
      console.log(`- ${rec}`);
    });
  }
}

/**
 * Main function - Dramatically simplified using consolidated utilities
 */
async function main(): Promise<void> {
  logInfo('Checking Actual Factory Fee...');

  // Get network information using consolidated network management
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();

  const networkManager = getNetworkManager();
  const networkDetection = networkManager.determineNetworkName(chainId);
  const networkConfig = networkManager.getNetworkConfig(
    networkDetection.networkName
  );

  if (!networkConfig) {
    throw new Error(`Unsupported network with chain ID: ${chainId}`);
  }

  // Validate network configuration
  const networkValidation = networkManager.validateNetwork(networkConfig.name);
  if (!networkValidation.isValid) {
    throw new Error(`Network validation failed: ${networkValidation.message}`);
  }

  logInfo(`Detected network: ${networkConfig.displayName}`);

  // Load and validate factory deployment artifact using consolidated utilities
  const factoryArtifact = loadFactoryArtifact(networkConfig.name);

  // Read comprehensive factory information
  const factoryInfo = await readFactoryInfo(factoryArtifact, networkConfig);

  // Display results
  displayFactoryInfo(factoryInfo);
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXECUTION - Using consolidated error handling
   ═══════════════════════════════════════════════════════════════════════════ */

// Use consolidated main wrapper for standardized error handling
wrapMain(main, 'Factory fee check completed successfully', 'Factory fee check');

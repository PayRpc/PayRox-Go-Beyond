/**
 * Check Actual Factory Fee Script
 *
 * Reads the actual deployment fee from the deployed factory contract
 * and compares it with the deployment artifact.
 *
 * UPDATED: Uses consolidated utilities for market-leading architecture
 */

import { ethers } from 'hardhat';
import {
  createInvalidResult,
  createValidResult,
  FileSystemError,
  logInfo,
  logSuccess,
  logWarning,
  NetworkError,
  ValidationResult,
  wrapMain,
} from '../src/utils/errors';
import { getNetworkManager } from '../src/utils/network';
import {
  fileExists,
  getPathManager,
  readFileContent,
} from '../src/utils/paths';

// Types
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

/**
 * Determines the network name for deployment artifact lookup
 */
function determineNetworkName(chainId: string): string {
  const networkManager = getNetworkManager();
  const detection = networkManager.determineNetworkName(chainId);
  return detection.networkName;
}

/**
 * Validates that the factory deployment artifact exists and is readable
 */
function validateFactoryArtifact(networkName: string): any {
  const pathManager = getPathManager();
  const factoryPath = pathManager.getFactoryPath(networkName);

  if (!fileExists(factoryPath)) {
    throw new FileSystemError(
      `Factory deployment not found at: ${factoryPath}`,
      'ARTIFACT_NOT_FOUND'
    );
  }

  try {
    return JSON.parse(readFileContent(factoryPath));
  } catch (parseError: unknown) {
    const errorMessage =
      parseError instanceof Error ? parseError.message : String(parseError);
    throw new FileSystemError(
      `Failed to parse factory artifact: ${errorMessage}`,
      'ARTIFACT_PARSE_ERROR'
    );
  }
}

/**
 * Validates that a contract exists at the given address
 */
async function validateContractExists(address: string): Promise<void> {
  const code = await ethers.provider.getCode(address);
  if (code === '0x') {
    throw new NetworkError(
      `No contract code found at address ${address}`,
      'CONTRACT_NOT_FOUND'
    );
  }
}

/**
 * Reads comprehensive factory information from the deployed contract
 */
async function readFactoryInfo(
  factoryArtifact: any,
  networkName: string,
  chainId: string
): Promise<FactoryFeeInfo> {
  await validateContractExists(factoryArtifact.address);

  // Connect to factory contract
  const factory = await ethers.getContractAt(
    'DeterministicChunkFactory',
    factoryArtifact.address
  );

  // Read contract state
  const [baseFeeWei, signer] = await Promise.all([
    factory.baseFeeWei(),
    ethers.getSigners().then((signers: any[]) => signers[0]),
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
    networkName,
    chainId,
  };
}

/**
 * Validates fee consistency between artifact and contract
 */
function validateFeeConsistency(info: FactoryFeeInfo): ValidationResult {
  if (!info.artifactFee) {
    return createInvalidResult(
      'No fee information found in deployment artifact',
      'MISSING_ARTIFACT_FEE'
    );
  }

  const expectedFormat = `${info.actualFeeEth} ETH`;
  if (info.artifactFee === expectedFormat) {
    return createValidResult('Deployment fee matches artifact', 'FEE_MATCH');
  }

  return createInvalidResult(
    `Fee mismatch - Artifact: ${info.artifactFee}, Actual: ${expectedFormat}`,
    'FEE_MISMATCH'
  );
}

/**
 * Displays comprehensive factory information
 */
function displayFactoryInfo(info: FactoryFeeInfo): void {
  logInfo('Factory Fee Information');
  console.log('========================');
  console.log(`Network: ${info.networkName} (Chain ID: ${info.chainId})`);
  console.log(`Factory Address: ${info.address}`);
  console.log(`Deployment Fee (Artifact): ${info.artifactFee || 'N/A'}`);
  console.log(`Actual Deployment Fee: ${info.actualFeeEth} ETH`);
  console.log(`Deployment Fee (Wei): ${info.actualFeeWei}`);
  console.log(`Current Signer has Admin Role: ${info.hasAdminRole}`);
  console.log(`Fee Recipient: ${info.feeRecipient}`);
  console.log(`Fees Enabled: ${info.feesEnabled}`);

  // Validate consistency
  const validation = validateFeeConsistency(info);
  console.log(`\nValidation: ${validation.isValid ? 'PASS' : 'FAIL'}`);
  console.log(`Result: ${validation.message}`);

  if (!validation.isValid && info.artifactFee) {
    logWarning('Recommendations');
    console.log('- Verify deployment configuration');
    console.log('- Check if fees were modified after deployment');
    console.log(
      '- Update deployment artifacts if fees were intentionally changed'
    );
  }
}

async function main(): Promise<void> {
  logInfo('Checking Actual Factory Fee...');

  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();
  const networkName = determineNetworkName(chainId);

  // Load and validate factory deployment artifact
  const factoryArtifact = validateFactoryArtifact(networkName);

  // Read comprehensive factory information
  const factoryInfo = await readFactoryInfo(
    factoryArtifact,
    networkName,
    chainId
  );

  // Display results
  displayFactoryInfo(factoryInfo);

  logSuccess('Factory fee check completed successfully');
}

// Use consolidated main wrapper for standardized error handling
wrapMain(main, 'Factory fee check completed successfully', 'Factory Fee Check');

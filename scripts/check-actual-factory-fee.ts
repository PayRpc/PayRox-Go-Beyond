/**
 * Check Actual Factory Fee Script
 *
 * Reads the actual deployment fee from the deployed factory contract
 * and compares it with the deployment artifact.
 */

import * as fs from 'fs';
import { ethers } from 'hardhat';
import * as path from 'path';

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

interface ValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * Custom error for factory validation failures
 */
class FactoryValidationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'FactoryValidationError';
  }
}

/**
 * Determines the network name for deployment artifact lookup
 */
function determineNetworkName(chainId: string): string {
  if (chainId === '31337') {
    // Check for localhost deployments first, then hardhat
    if (fs.existsSync(path.join(__dirname, '../deployments/localhost'))) {
      return 'localhost';
    } else {
      return 'hardhat';
    }
  }
  return 'unknown';
}

/**
 * Validates that the factory deployment artifact exists and is readable
 */
function validateFactoryArtifact(networkName: string): any {
  const factoryPath = path.join(
    __dirname,
    `../deployments/${networkName}/factory.json`
  );

  if (!fs.existsSync(factoryPath)) {
    throw new FactoryValidationError(
      `Factory deployment not found at: ${factoryPath}`,
      'ARTIFACT_NOT_FOUND'
    );
  }

  try {
    return JSON.parse(fs.readFileSync(factoryPath, 'utf8'));
  } catch (parseError: unknown) {
    const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
    throw new FactoryValidationError(
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
    throw new FactoryValidationError(
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
    ethers.getSigners().then(signers => signers[0])
  ]);

  const [hasAdminRole, feeRecipient, feesEnabled] = await Promise.all([
    factory.hasRole(await factory.DEFAULT_ADMIN_ROLE(), signer.address),
    factory.feeRecipient(),
    factory.feesEnabled()
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
    chainId
  };
}

/**
 * Validates fee consistency between artifact and contract
 */
function validateFeeConsistency(info: FactoryFeeInfo): ValidationResult {
  if (!info.artifactFee) {
    return {
      isValid: false,
      message: 'No fee information found in deployment artifact'
    };
  }

  const expectedFormat = `${info.actualFeeEth} ETH`;
  if (info.artifactFee === expectedFormat) {
    return {
      isValid: true,
      message: 'Deployment fee matches artifact'
    };
  }

  return {
    isValid: false,
    message: `Fee mismatch - Artifact: ${info.artifactFee}, Actual: ${expectedFormat}`
  };
}

/**
 * Displays comprehensive factory information
 */
function displayFactoryInfo(info: FactoryFeeInfo): void {
  console.log('\nFactory Fee Information:');
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
    console.log('\nRecommendations:');
    console.log('- Verify deployment configuration');
    console.log('- Check if fees were modified after deployment');
    console.log('- Update deployment artifacts if fees were intentionally changed');
  }
}

async function main(): Promise<void> {
  console.log('[INFO] Checking Actual Factory Fee...');

  try {
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId.toString();
    const networkName = determineNetworkName(chainId);

    // Load and validate factory deployment artifact
    const factoryArtifact = validateFactoryArtifact(networkName);

    // Read comprehensive factory information
    const factoryInfo = await readFactoryInfo(factoryArtifact, networkName, chainId);

    // Display results
    displayFactoryInfo(factoryInfo);

    console.log('\n[OK] Factory fee check completed successfully');
  } catch (error: unknown) {
    if (error instanceof FactoryValidationError) {
      console.error(`[ERROR] Factory validation failed: ${error.message} (Code: ${error.code})`);
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[ERROR] Unexpected error during factory fee check:', errorMessage);
    }
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

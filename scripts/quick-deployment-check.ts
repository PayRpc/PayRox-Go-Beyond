/**
 * Quick Deployment Check Script
 *
 * Validates deployed contract addresses and ensures deployment integrity.
 *
 * Features:
 * - Validates address format and uniqueness
 * - Verifies contracts exist on-chain with bytecode
 * - Checks for address conflicts
 * - Provides detailed error reporting and suggestions
 *
 * Usage:
 *   npx hardhat run scripts/quick-deployment-check.ts --network <network>
 *
 * @author PayRox Team
 * @version 2.0.0
 */

import * as fs from 'fs';
import { ethers } from 'hardhat';
import * as path from 'path';

// Constants
const MINIMUM_CONTRACTS = 2;
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const EMPTY_BYTECODE = '0x';

// Types
interface DeploymentArtifact {
  address: string;
  contractName: string;
  timestamp: string;
}

interface ValidationResult {
  isValid: boolean;
  uniqueAddresses: number;
  totalFiles: number;
  errors: string[];
}

// Logging utilities
class Logger {
  static info(message: string): void {
    console.log(`[INFO] ${message}`);
  }

  static error(message: string): void {
    console.log(`[ERROR] ${message}`);
  }

  static success(message: string): void {
    console.log(`[OK] ${message}`);
  }

  static section(title: string): void {
    console.log(`\n[INFO] ${title}:`);
  }
}

// Error classes
class DeploymentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeploymentValidationError';
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Finds the deployment directory for the given chain ID with fallback logic
 * @param chainId - The chain ID to look for deployments
 * @returns Path to the deployment directory
 * @throws {DeploymentValidationError} When no deployment directory is found
 */
function findDeploymentDirectory(chainId: string): string {
  const primaryDir = path.join(__dirname, `../deployments/${chainId}`);
  const fallbackDir = path.join(__dirname, '../deployments/hardhat');

  if (fs.existsSync(primaryDir)) {
    return primaryDir;
  }

  if (fs.existsSync(fallbackDir)) {
    return fallbackDir;
  }

  throw new DeploymentValidationError('No deployment artifacts found');
}

/**
 * Loads and parses a deployment artifact file
 * @param filePath - Path to the deployment artifact file
 * @returns Parsed deployment artifact
 * @throws {DeploymentValidationError} When file cannot be parsed or is invalid
 */
function loadDeploymentArtifact(filePath: string): DeploymentArtifact {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!data.address || !data.contractName) {
      throw new Error('Missing required fields (address, contractName)');
    }

    return {
      address: data.address,
      contractName: data.contractName,
      timestamp: data.timestamp || 'Unknown',
    };
  } catch (error) {
    throw new DeploymentValidationError(
      `Failed to parse deployment artifact: ${error}`
    );
  }
}

/**
 * Validates that an Ethereum address has the correct format
 * @param address - The address to validate
 * @returns True if the address format is valid
 */
function validateAddressFormat(address: string): boolean {
  return ADDRESS_PATTERN.test(address);
}

/**
 * Validates that a contract exists on-chain with deployed bytecode
 * @param address - The contract address to check
 * @param networkName - Name of the network for error reporting
 * @throws {NetworkError} When contract has no code or network call fails
 */
async function validateContractOnChain(
  address: string,
  networkName: string
): Promise<void> {
  try {
    const code = await ethers.provider.getCode(address);

    if (code === EMPTY_BYTECODE) {
      throw new NetworkError(`No code at address ${address} on ${networkName}`);
    }

    Logger.success(`Code verified (${code.length} bytes)`);
  } catch (error) {
    if (error instanceof NetworkError) {
      throw error;
    }
    throw new NetworkError(`Failed to verify contract on-chain: ${error}`);
  }
}

async function validateDeploymentArtifact(
  artifact: DeploymentArtifact,
  fileName: string,
  networkName: string,
  existingAddresses: Set<string>
): Promise<void> {
  console.log(`   [INFO] ${fileName}:`);
  console.log(`      Address: ${artifact.address}`);
  console.log(`      Contract: ${artifact.contractName}`);
  console.log(`      Deployed: ${artifact.timestamp}`);

  // Validate address format
  if (!validateAddressFormat(artifact.address)) {
    throw new DeploymentValidationError(
      `Invalid address format: ${artifact.address}`
    );
  }

  // Check for address conflicts
  if (existingAddresses.has(artifact.address)) {
    throw new DeploymentValidationError(
      `ADDRESS CONFLICT! Address ${artifact.address} is already used by another contract`
    );
  }

  // Validate contract on-chain
  await validateContractOnChain(artifact.address, networkName);

  existingAddresses.add(artifact.address);
}

async function validateAllDeployments(
  deploymentDir: string,
  networkName: string
): Promise<ValidationResult> {
  const files = fs
    .readdirSync(deploymentDir)
    .filter(file => file.endsWith('.json'));
  const addresses = new Set<string>();
  const errors: string[] = [];

  Logger.section('Deployment Artifacts');

  for (const file of files) {
    try {
      const filePath = path.join(deploymentDir, file);
      const artifact = loadDeploymentArtifact(filePath);

      await validateDeploymentArtifact(artifact, file, networkName, addresses);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      Logger.error(`${file}: ${errorMessage}`);
      errors.push(`${file}: ${errorMessage}`);
    }
  }

  return {
    isValid: errors.length === 0 && addresses.size >= MINIMUM_CONTRACTS,
    uniqueAddresses: addresses.size,
    totalFiles: files.length,
    errors,
  };
}

function displaySummary(result: ValidationResult): void {
  Logger.section('Summary');
  Logger.info(`Unique addresses: ${result.uniqueAddresses}`);
  Logger.info(`Deployment files: ${result.totalFiles}`);

  if (result.isValid) {
    console.log('\n[OK] DEPLOYMENT ADDRESS CHECK PASSED!');
    console.log('   All contracts have unique addresses and deployed code.');
  } else {
    console.log('\n[ERROR] DEPLOYMENT ADDRESS CHECK FAILED!');

    if (result.errors.length > 0) {
      console.log('   Issues detected:');
      result.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (result.uniqueAddresses < MINIMUM_CONTRACTS) {
      console.log('\n[INFO] Suggested Fix:');
      console.log('   1. Delete deployments directory for this network');
      console.log('   2. Re-run deployment script');
      console.log('   3. Ensure each contract deploys to a unique address');
    }
  }
}

async function main(): Promise<void> {
  try {
    Logger.info('PayRox Deployment Address Quick Check');
    console.log('============================================');

    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId.toString();

    Logger.info(`Network: ${network.name} (Chain ID: ${chainId})`);

    const deploymentDir = findDeploymentDirectory(chainId);
    Logger.info(`Reading from: ${deploymentDir}`);

    const result = await validateAllDeployments(deploymentDir, network.name);

    displaySummary(result);

    process.exit(result.isValid ? 0 : 1);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(`Quick check failed: ${errorMessage}`);
    process.exit(1);
  }
}

// Export for programmatic use
export { DeploymentArtifact, main, validateAllDeployments, ValidationResult };

// CLI execution
if (require.main === module) {
  main().catch(error => {
    console.error('[ERROR] Script execution failed:', error);
    process.exit(1);
  });
}

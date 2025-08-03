import { ethers } from 'ethers';

/**
 * Utility functions for CREATE2 address calculation with enhanced security and validation
 * Follows PayRox NON-STANDARD diamond architecture requirements
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS & TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Gas cost constants for deployment estimation */
export const GAS_CONSTANTS = {
  BASE_TX_COST: 21000,
  CREATE2_COST: 32000,
  BYTES_COST: 200,
  DEFAULT_OVERHEAD: 53000,
  MAX_CONTRACT_SIZE: 24576, // 24KB limit
} as const;

/** Type definitions for better type safety */
export type Address = string; // 0x prefixed 40-char hex
export type Salt = string; // 0x prefixed 64-char hex
export type Bytecode = string; // 0x prefixed hex

export interface DeploymentConfig {
  salt: Salt;
  bytecode: Bytecode;
  name?: string;
}

export interface Create2Result {
  salt: Salt;
  address: Address;
  gasEstimate: bigint;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate Ethereum address format (case-insensitive)
 * @param address The address to validate
 * @throws Error if address is invalid
 */
function validateAddress(address: string): void {
  if (!address || typeof address !== 'string') {
    throw new Error('Address must be a non-empty string');
  }

  // Remove 0x prefix and check if it's 40 hex characters
  const addressWithoutPrefix =
    address.startsWith('0x') || address.startsWith('0X')
      ? address.slice(2)
      : address;

  if (addressWithoutPrefix.length !== 40) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }

  // Check if all characters are valid hex (case-insensitive)
  if (!/^[0-9a-fA-F]{40}$/.test(addressWithoutPrefix)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
}

/**
 * Validate salt format (32 bytes hex)
 * @param salt The salt to validate
 * @throws Error if salt is invalid
 */
function validateSalt(salt: string): void {
  if (!salt || typeof salt !== 'string') {
    throw new Error('Salt must be a non-empty string');
  }

  if (!ethers.isHexString(salt, 32)) {
    throw new Error(`Salt must be 32-byte hex string, got: ${salt}`);
  }
}

/**
 * Validate bytecode format
 * @param bytecode The bytecode to validate
 * @throws Error if bytecode is invalid
 */
function validateBytecode(bytecode: string): void {
  if (!bytecode || typeof bytecode !== 'string') {
    throw new Error('Bytecode must be a non-empty string');
  }

  // Normalize to lowercase for validation
  const normalizedBytecode = bytecode.toLowerCase();

  if (!ethers.isHexString(normalizedBytecode)) {
    throw new Error(`Invalid bytecode format: ${bytecode}`);
  }

  const byteLength = (normalizedBytecode.length - 2) / 2;
  if (byteLength > GAS_CONSTANTS.MAX_CONTRACT_SIZE) {
    throw new Error(
      `Bytecode too large: ${byteLength} bytes (max: ${GAS_CONSTANTS.MAX_CONTRACT_SIZE})`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE CREATE2 FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate CREATE2 address with comprehensive validation
 * @param factoryAddress The factory contract address
 * @param salt The salt for address generation (32 bytes)
 * @param bytecode The contract bytecode
 * @returns The predicted CREATE2 address
 * @throws Error if inputs are invalid
 */
export function calculateCreate2Address(
  factoryAddress: Address,
  salt: Salt,
  bytecode: Bytecode
): Address {
  // Validate all inputs
  validateAddress(factoryAddress);
  validateSalt(salt);
  validateBytecode(bytecode);

  try {
    const hash = ethers.keccak256(
      ethers.concat(['0xff', factoryAddress, salt, ethers.keccak256(bytecode)])
    );

    return ethers.getAddress(ethers.dataSlice(hash, 12));
  } catch (error) {
    throw new Error(
      `Failed to calculate CREATE2 address: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Generate a cryptographically secure deterministic salt from input data
 * @param inputs Array of input values to hash
 * @returns A 32-byte salt
 * @throws Error if inputs are invalid
 */
export function generateSalt(...inputs: (string | number | boolean)[]): Salt {
  if (inputs.length === 0) {
    throw new Error('At least one input required for salt generation');
  }

  try {
    const stringInputs = inputs.map(input => {
      if (input === null || input === undefined) {
        throw new Error('Null or undefined inputs not allowed');
      }
      return input.toString();
    });

    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      stringInputs.map(() => 'string'),
      stringInputs
    );

    return ethers.keccak256(encoded);
  } catch (error) {
    throw new Error(
      `Failed to generate salt: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Generate salt with prefix for PayRox NON-STANDARD diamond system
 * @param name The component name
 * @param version The version string
 * @param additional Additional data to include
 * @returns A deterministic salt for PayRox components
 * @throws Error if inputs are invalid
 */
export function generatePayRoxSalt(
  name: string,
  version: string,
  additional?: string
): Salt {
  if (!name || !version) {
    throw new Error('Name and version are required');
  }

  const inputs = ['PayRox-NON-STANDARD', name, version];
  if (additional) {
    inputs.push(additional);
  }

  return generateSalt(...inputs);
}

/**
 * Calculate multiple CREATE2 addresses for batch deployment with validation
 * @param factoryAddress The factory contract address
 * @param deployments Array of deployment configurations
 * @returns Array of predicted addresses with gas estimates
 * @throws Error if any deployment config is invalid
 */
export function batchCalculateCreate2Addresses(
  factoryAddress: Address,
  deployments: DeploymentConfig[]
): Create2Result[] {
  validateAddress(factoryAddress);

  if (!Array.isArray(deployments) || deployments.length === 0) {
    throw new Error('Deployments array must be non-empty');
  }

  return deployments.map((deployment, index) => {
    try {
      const address = calculateCreate2Address(
        factoryAddress,
        deployment.salt,
        deployment.bytecode
      );

      const gasEstimate = estimateDeploymentGas(deployment.bytecode);

      return {
        salt: deployment.salt,
        address,
        gasEstimate,
      };
    } catch (error) {
      throw new Error(
        `Failed to process deployment ${index} (${
          deployment.name || 'unnamed'
        }): ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });
}

/**
 * Verify that calculated address matches actual deployed address
 * @param factoryAddress The factory contract address
 * @param salt The salt used for deployment
 * @param bytecode The contract bytecode
 * @param actualAddress The actual deployed address
 * @returns True if addresses match
 * @throws Error if inputs are invalid
 */
export function verifyCreate2Address(
  factoryAddress: Address,
  salt: Salt,
  bytecode: Bytecode,
  actualAddress: Address
): boolean {
  validateAddress(actualAddress);

  try {
    const calculated = calculateCreate2Address(factoryAddress, salt, bytecode);
    return calculated.toLowerCase() === actualAddress.toLowerCase();
  } catch (error) {
    throw new Error(
      `Address verification failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Find unused salt for specific bytecode with cryptographic randomness
 * @param factoryAddress The factory contract address
 * @param bytecode The contract bytecode
 * @param usedAddresses Set of already used addresses (lowercase)
 * @param maxAttempts Maximum number of attempts to find unused salt
 * @param seedPrefix Optional prefix for deterministic generation
 * @returns Object with salt and predicted address, or null if not found
 * @throws Error if inputs are invalid
 */
export function findUnusedSalt(
  factoryAddress: Address,
  bytecode: Bytecode,
  usedAddresses: Set<string>,
  maxAttempts: number = 1000,
  seedPrefix?: string
): Create2Result | null {
  validateAddress(factoryAddress);
  validateBytecode(bytecode);

  if (maxAttempts <= 0) {
    throw new Error('maxAttempts must be positive');
  }

  const baseInputs = ['PayRox-NON-STANDARD', 'search'];
  if (seedPrefix) {
    baseInputs.push(seedPrefix);
  }

  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Generate cryptographically secure random bytes as hex string
      const randomHex = ethers.hexlify(ethers.randomBytes(16));
      const salt = generateSalt(...baseInputs, i.toString(), randomHex);
      const address = calculateCreate2Address(factoryAddress, salt, bytecode);

      if (!usedAddresses.has(address.toLowerCase())) {
        const gasEstimate = estimateDeploymentGas(bytecode);
        return { salt, address, gasEstimate };
      }
    } catch (error) {
      // Continue searching on individual failures
      continue;
    }
  }

  return null;
}

/**
 * Calculate deployment gas estimate for bytecode
 * @param bytecode The contract bytecode
 * @param deploymentGasOverhead Additional gas overhead for deployment
 * @returns Estimated gas cost
 * @throws Error if bytecode is invalid
 */
export function estimateDeploymentGas(
  bytecode: Bytecode,
  deploymentGasOverhead: number = GAS_CONSTANTS.DEFAULT_OVERHEAD
): bigint {
  validateBytecode(bytecode);

  if (deploymentGasOverhead < 0) {
    throw new Error('Deployment gas overhead must be non-negative');
  }

  const bytecodeLength = (bytecode.length - 2) / 2; // Remove 0x prefix and convert to bytes
  const gasEstimate =
    GAS_CONSTANTS.BASE_TX_COST +
    GAS_CONSTANTS.CREATE2_COST +
    bytecodeLength * GAS_CONSTANTS.BYTES_COST +
    deploymentGasOverhead;

  return BigInt(gasEstimate);
}

/**
 * Calculate deployment cost estimate in wei
 * @param bytecode The contract bytecode
 * @param gasPrice Gas price in wei
 * @param deploymentGasOverhead Additional gas overhead for deployment
 * @returns Estimated deployment cost in wei
 * @throws Error if inputs are invalid
 */
export function estimateDeploymentCost(
  bytecode: Bytecode,
  gasPrice: bigint,
  deploymentGasOverhead: number = GAS_CONSTANTS.DEFAULT_OVERHEAD
): bigint {
  if (gasPrice <= 0n) {
    throw new Error('Gas price must be positive');
  }

  const gasEstimate = estimateDeploymentGas(bytecode, deploymentGasOverhead);
  return gasPrice * gasEstimate;
}

/**
 * Check if address looks like a valid Ethereum address
 * @param address The address to check
 * @returns True if address appears to be valid
 */
export function isValidAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  try {
    ethers.getAddress(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get deployment nonce for additional randomness with validation
 * @param deployer The deployer address
 * @param timestamp Current timestamp (optional)
 * @returns A cryptographically secure nonce
 * @throws Error if deployer address is invalid
 */
export function getDeploymentNonce(
  deployer: Address,
  timestamp?: number
): Salt {
  validateAddress(deployer);

  const time = timestamp || Date.now();
  if (time < 0) {
    throw new Error('Timestamp must be non-negative');
  }

  try {
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256'],
        [deployer, time]
      )
    );
  } catch (error) {
    throw new Error(
      `Failed to generate deployment nonce: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a deterministic salt for PayRox facet deployment
 * @param facetName The facet contract name
 * @param version The version string
 * @param networkId The network identifier
 * @returns A deterministic salt for facet deployment
 */
export function generateFacetSalt(
  facetName: string,
  version: string,
  networkId: string | number
): Salt {
  return generatePayRoxSalt(
    `Facet-${facetName}`,
    version,
    `network-${networkId}`
  );
}

/**
 * Generate a deterministic salt for PayRox dispatcher deployment
 * @param version The version string
 * @param networkId The network identifier
 * @param deployerAddress The deployer address for uniqueness
 * @returns A deterministic salt for dispatcher deployment
 */
export function generateDispatcherSalt(
  version: string,
  networkId: string | number,
  deployerAddress: Address
): Salt {
  validateAddress(deployerAddress);

  return generateSalt(
    'PayRox-NON-STANDARD',
    'ManifestDispatcher',
    version,
    `network-${networkId}`,
    deployerAddress
  );
}

/**
 * Validate CREATE2 deployment configuration
 * @param config The deployment configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateDeploymentConfig(config: DeploymentConfig): void {
  validateSalt(config.salt);
  validateBytecode(config.bytecode);

  if (config.name && typeof config.name !== 'string') {
    throw new Error('Deployment name must be a string');
  }
}

/**
 * Calculate vanity address attempts needed for specific prefix
 * @param prefixLength Number of hex characters in desired prefix
 * @returns Estimated number of attempts needed
 */
export function estimateVanityAttempts(prefixLength: number): number {
  if (prefixLength <= 0 || prefixLength > 8) {
    throw new Error('Prefix length must be between 1 and 8 characters');
  }

  return Math.pow(16, prefixLength);
}

import { ethers } from "ethers";

/**
 * Utility functions for CREATE2 address calculation
 */

/**
 * Calculate CREATE2 address
 * @param factoryAddress The factory contract address
 * @param salt The salt for address generation
 * @param bytecode The contract bytecode
 * @returns The predicted CREATE2 address
 */
export function calculateCreate2Address(
  factoryAddress: string,
  salt: string,
  bytecode: string
): string {
  const hash = ethers.keccak256(
    ethers.concat([
      "0xff",
      factoryAddress,
      salt,
      ethers.keccak256(bytecode)
    ])
  );
  
  return ethers.getAddress(ethers.dataSlice(hash, 12));
}

/**
 * Generate a deterministic salt from input data
 * @param inputs Array of input values to hash
 * @returns A 32-byte salt
 */
export function generateSalt(...inputs: (string | number | boolean)[]): string {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    inputs.map(() => "string"),
    inputs.map(input => input.toString())
  );
  
  return ethers.keccak256(encoded);
}

/**
 * Generate salt with prefix for PayRox system
 * @param name The component name
 * @param version The version string
 * @param additional Additional data to include
 * @returns A deterministic salt for PayRox components
 */
export function generatePayRoxSalt(
  name: string,
  version: string,
  additional?: string
): string {
  const inputs = ["PayRox", name, version];
  if (additional) {
    inputs.push(additional);
  }
  
  return generateSalt(...inputs);
}

/**
 * Calculate multiple CREATE2 addresses for batch deployment
 * @param factoryAddress The factory contract address
 * @param deployments Array of deployment data
 * @returns Array of predicted addresses
 */
export function batchCalculateCreate2Addresses(
  factoryAddress: string,
  deployments: Array<{ salt: string; bytecode: string }>
): string[] {
  return deployments.map(deployment =>
    calculateCreate2Address(factoryAddress, deployment.salt, deployment.bytecode)
  );
}

/**
 * Verify that calculated address matches actual deployed address
 * @param factoryAddress The factory contract address
 * @param salt The salt used for deployment
 * @param bytecode The contract bytecode
 * @param actualAddress The actual deployed address
 * @returns True if addresses match
 */
export function verifyCreate2Address(
  factoryAddress: string,
  salt: string,
  bytecode: string,
  actualAddress: string
): boolean {
  const calculated = calculateCreate2Address(factoryAddress, salt, bytecode);
  return calculated.toLowerCase() === actualAddress.toLowerCase();
}

/**
 * Find unused salt for specific bytecode
 * @param factoryAddress The factory contract address
 * @param bytecode The contract bytecode
 * @param usedAddresses Set of already used addresses
 * @param maxAttempts Maximum number of attempts to find unused salt
 * @returns Object with salt and predicted address, or null if not found
 */
export function findUnusedSalt(
  factoryAddress: string,
  bytecode: string,
  usedAddresses: Set<string>,
  maxAttempts: number = 1000
): { salt: string; address: string } | null {
  for (let i = 0; i < maxAttempts; i++) {
    const salt = generateSalt("PayRox", "search", i.toString(), Date.now().toString());
    const address = calculateCreate2Address(factoryAddress, salt, bytecode);
    
    if (!usedAddresses.has(address.toLowerCase())) {
      return { salt, address };
    }
  }
  
  return null;
}

/**
 * Calculate deployment cost estimate
 * @param bytecode The contract bytecode
 * @param gasPrice Gas price in wei
 * @param deploymentGasOverhead Additional gas overhead for deployment
 * @returns Estimated deployment cost in wei
 */
export function estimateDeploymentCost(
  bytecode: string,
  gasPrice: bigint,
  deploymentGasOverhead: number = 53000
): bigint {
  // Gas cost calculation: 21000 base + 32000 CREATE2 + 200 per byte + overhead
  const bytecodeLength = (bytecode.length - 2) / 2; // Remove 0x prefix and convert to bytes
  const gasEstimate = 21000 + 32000 + (bytecodeLength * 200) + deploymentGasOverhead;
  
  return gasPrice * BigInt(gasEstimate);
}

/**
 * Check if address looks like a valid CREATE2 address
 * @param address The address to check
 * @returns True if address appears to be valid
 */
export function isValidAddress(address: string): boolean {
  try {
    ethers.getAddress(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get deployment nonce for additional randomness
 * @param deployer The deployer address
 * @param timestamp Current timestamp
 * @returns A pseudo-random nonce
 */
export function getDeploymentNonce(deployer: string, timestamp?: number): string {
  const time = timestamp || Date.now();
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256"],
      [deployer, time]
    )
  );
}

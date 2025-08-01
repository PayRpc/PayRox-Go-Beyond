import { ethers, BytesLike } from 'ethers';

/**
 * PayRox utility functions
 */
export class Utils {
  /**
   * Calculate function selector from signature
   */
  static getFunctionSelector(signature: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(signature)).slice(0, 10);
  }

  /**
   * Calculate CREATE2 address
   */
  static calculateCreate2Address(
    factoryAddress: string,
    salt: BytesLike,
    initCodeHash: BytesLike
  ): string {
    return ethers.getCreate2Address(factoryAddress, salt, initCodeHash);
  }

  /**
   * Calculate chunk salt from data
   */
  static calculateChunkSalt(data: BytesLike): string {
    const dataHash = ethers.keccak256(data);
    return ethers.keccak256(ethers.toUtf8Bytes("chunk:" + dataHash.slice(2)));
  }

  /**
   * Encode constructor arguments
   */
  static encodeConstructorArgs(types: string[], values: any[]): string {
    const abiCoder = new ethers.AbiCoder();
    return abiCoder.encode(types, values);
  }

  /**
   * Decode constructor arguments  
   */
  static decodeConstructorArgs(types: string[], data: BytesLike): any[] {
    const abiCoder = new ethers.AbiCoder();
    return abiCoder.decode(types, data);
  }

  /**
   * Format wei to ETH
   */
  static formatEther(wei: bigint | string): string {
    return ethers.formatEther(wei);
  }

  /**
   * Parse ETH to wei
   */
  static parseEther(eth: string): bigint {
    return ethers.parseEther(eth);
  }

  /**
   * Check if address is valid
   */
  static isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Normalize address to checksum format
   */
  static checksumAddress(address: string): string {
    return ethers.getAddress(address);
  }

  /**
   * Calculate gas price recommendations
   */
  static calculateGasPrice(baseFee: bigint, priorityFee: bigint = 2000000000n): {
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  } {
    const maxPriorityFeePerGas = priorityFee.toString();
    const maxFeePerGas = (baseFee * 2n + priorityFee).toString();
    
    return {
      maxFeePerGas,
      maxPriorityFeePerGas
    };
  }

  /**
   * Calculate deployment cost
   */
  static calculateDeploymentCost(
    deploymentFee: string,
    gasUsed: bigint,
    gasPrice: bigint
  ): {
    deploymentFee: string;
    gasFee: string;
    total: string;
  } {
    const deploymentFeeBigInt = BigInt(deploymentFee);
    const gasFee = gasUsed * gasPrice;
    const total = deploymentFeeBigInt + gasFee;

    return {
      deploymentFee: ethers.formatEther(deploymentFeeBigInt),
      gasFee: ethers.formatEther(gasFee),
      total: ethers.formatEther(total)
    };
  }

  /**
   * Generate random salt
   */
  static generateRandomSalt(): string {
    return ethers.hexlify(ethers.randomBytes(32));
  }

  /**
   * Hash string data
   */
  static hashString(data: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }

  /**
   * Hash binary data
   */
  static hashBytes(data: BytesLike): string {
    return ethers.keccak256(data);
  }

  /**
   * Convert bytes to hex string
   */
  static bytesToHex(data: Uint8Array): string {
    return ethers.hexlify(data);
  }

  /**
   * Convert hex string to bytes
   */
  static hexToBytes(hex: string): Uint8Array {
    return ethers.getBytes(hex);
  }

  /**
   * Validate function signature format
   */
  static isValidFunctionSignature(signature: string): boolean {
    const pattern = /^[a-zA-Z_][a-zA-Z0-9_]*\([^)]*\)$/;
    return pattern.test(signature);
  }

  /**
   * Extract function name from signature
   */
  static extractFunctionName(signature: string): string {
    const match = signature.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\(/);
    return match ? match[1] : '';
  }

  /**
   * Parse function parameters from signature
   */
  static parseFunctionParameters(signature: string): string[] {
    const match = signature.match(/\(([^)]*)\)/);
    if (!match || !match[1]) return [];
    
    return match[1].split(',').map(param => param.trim()).filter(param => param);
  }

  /**
   * Create Merkle tree from data array
   */
  static createMerkleTree(data: string[]): {
    root: string;
    tree: string[][];
  } {
    if (data.length === 0) {
      return { root: ethers.ZeroHash, tree: [] };
    }

    // Hash all data items
    let currentLevel = data.map(item => ethers.keccak256(ethers.toUtf8Bytes(item)));
    const tree: string[][] = [currentLevel];

    // Build tree bottom-up
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          const combined = ethers.concat([currentLevel[i], currentLevel[i + 1]]);
          nextLevel.push(ethers.keccak256(combined));
        } else {
          nextLevel.push(currentLevel[i]);
        }
      }
      
      tree.push(nextLevel);
      currentLevel = nextLevel;
    }

    return {
      root: currentLevel[0],
      tree
    };
  }

  /**
   * Validate network configuration
   */
  static validateNetworkConfig(config: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.name) errors.push('Missing network name');
    if (!config.chainId || typeof config.chainId !== 'number') {
      errors.push('Invalid or missing chainId');
    }
    if (!config.contracts) errors.push('Missing contracts configuration');
    if (!config.fees) errors.push('Missing fees configuration');

    if (config.contracts) {
      const requiredContracts = ['factory', 'dispatcher', 'orchestrator'];
      for (const contract of requiredContracts) {
        if (!config.contracts[contract] || !this.isValidAddress(config.contracts[contract])) {
          errors.push(`Invalid ${contract} address`);
        }
      }
    }

    if (config.fees) {
      if (!config.fees.deploymentFee) {
        errors.push('Missing deployment fee');
      }
      if (!config.fees.gasLimit || typeof config.fees.gasLimit !== 'number') {
        errors.push('Invalid gas limit');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry async operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }
}

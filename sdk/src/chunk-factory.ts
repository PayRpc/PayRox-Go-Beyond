import { ethers, Provider, Signer, BytesLike } from 'ethers';
import { NetworkConfig } from './config';

/**
 * ChunkFactory service for deterministic contract deployment
 */
export class ChunkFactory {
  private provider: Provider;
  private signer?: Signer;
  private network: NetworkConfig;
  private contract: ethers.Contract;

  constructor(
    provider: Provider,
    signer: Signer | undefined,
    network: NetworkConfig
  ) {
    this.provider = provider;
    this.signer = signer;
    this.network = network;

    // DeterministicChunkFactory ABI (essential functions)
    const abi = [
      'function deployChunk(bytes calldata data, bytes32 salt) external payable returns (address chunkAddr)',
      'function getChunkAddress(bytes32 dataHash) external view returns (address)',
      'function calculateSalt(bytes calldata data) external pure returns (bytes32)',
      'function baseFeeWei() external view returns (uint256)',
      'function feesEnabled() external view returns (bool)',
      'function feeRecipient() external view returns (address)',
      'event ChunkDeployed(bytes32 indexed hash, address indexed chunk, uint256 size)',
    ];

    this.contract = new ethers.Contract(
      this.network.contracts.factory,
      abi,
      this.signer || this.provider
    );
  }

  /**
   * Deploy a contract as a chunk using CREATE2
   */
  async deployChunk(
    bytecode: BytesLike,
    constructorArgs: any[] = [],
    options?: {
      value?: string;
      gasLimit?: number;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
    }
  ): Promise<{
    address: string;
    transactionHash: string;
    chunkAddress: string;
  }> {
    if (!this.signer) {
      throw new Error('Signer required for deployment');
    }

    // Encode constructor arguments if provided
    let deploymentData = bytecode;
    if (constructorArgs.length > 0) {
      const abiCoder = new ethers.AbiCoder();
      const encodedArgs = abiCoder.encode(['uint256[]'], [constructorArgs]);
      deploymentData = ethers.concat([bytecode, encodedArgs]);
    }

    // Calculate salt
    const salt = await this.contract.calculateSalt(deploymentData);

    // Deploy chunk
    const tx = await this.contract.deployChunk(deploymentData, salt, {
      value: options?.value || this.network.fees.deploymentFee,
      gasLimit: options?.gasLimit || this.network.fees.gasLimit,
      maxFeePerGas: options?.maxFeePerGas,
      maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
    });

    const receipt = await tx.wait();

    // Find ChunkDeployed event
    const deployEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed?.name === 'ChunkDeployed';
      } catch {
        return false;
      }
    });

    let chunkAddress = '';
    if (deployEvent) {
      const parsed = this.contract.interface.parseLog(deployEvent);
      chunkAddress = parsed?.args[1] || '';
    }

    return {
      address: receipt.contractAddress || '',
      transactionHash: receipt.hash,
      chunkAddress,
    };
  }

  /**
   * Calculate the deterministic address for a contract
   */
  async calculateAddress(
    bytecode: BytesLike,
    constructorArgs: any[] = []
  ): Promise<string> {
    // Encode constructor arguments if provided
    let deploymentData = bytecode;
    if (constructorArgs.length > 0) {
      const abiCoder = new ethers.AbiCoder();
      const encodedArgs = abiCoder.encode(['uint256[]'], [constructorArgs]);
      deploymentData = ethers.concat([bytecode, encodedArgs]);
    }

    // Calculate data hash
    const dataHash = ethers.keccak256(deploymentData);

    // Get chunk address from factory
    return await this.contract.getChunkAddress(dataHash);
  }

  /**
   * Estimate gas for deployment
   */
  async estimateDeploymentGas(
    bytecode: BytesLike,
    constructorArgs: any[] = []
  ): Promise<bigint> {
    if (!this.signer) {
      throw new Error('Signer required for gas estimation');
    }

    // Encode constructor arguments if provided
    let deploymentData = bytecode;
    if (constructorArgs.length > 0) {
      const abiCoder = new ethers.AbiCoder();
      const encodedArgs = abiCoder.encode(['uint256[]'], [constructorArgs]);
      deploymentData = ethers.concat([bytecode, encodedArgs]);
    }

    // Calculate salt
    const salt = await this.contract.calculateSalt(deploymentData);

    // Estimate gas
    return await this.contract.deployChunk.estimateGas(deploymentData, salt, {
      value: this.network.fees.deploymentFee,
    });
  }

  /**
   * Get current deployment fee
   */
  async getCurrentFee(): Promise<string> {
    const fee = await this.contract.baseFeeWei();
    return fee.toString();
  }

  /**
   * Check if fees are enabled
   */
  async areFeesEnabled(): Promise<boolean> {
    return await this.contract.feesEnabled();
  }

  /**
   * Get fee recipient address
   */
  async getFeeRecipient(): Promise<string> {
    return await this.contract.feeRecipient();
  }

  /**
   * Get factory contract address
   */
  getFactoryAddress(): string {
    return this.network.contracts.factory;
  }

  /**
   * Get factory contract instance
   */
  getContract(): ethers.Contract {
    return this.contract;
  }
}

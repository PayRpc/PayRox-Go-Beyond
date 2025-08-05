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

    // DeterministicChunkFactory ABI (updated to match actual contract)
    const abi = [
      // Core deployment functions
      'function stage(bytes calldata data) external payable returns (address chunk, bytes32 hash)',
      'function stageBatch(bytes[] calldata blobs) external payable returns (address[] memory chunks, bytes32[] memory hashes)',
      'function deployDeterministic(bytes32 salt, bytes calldata bytecode, bytes calldata constructorArgs) external payable returns (address deployed)',
      'function deployDeterministicBatch(bytes32[] calldata salts, bytes[] calldata bytecodes, bytes[] calldata constructorArgs) external payable returns (address[] memory deployed)',
      
      // Prediction and validation functions
      'function predict(bytes calldata data) external view returns (address predicted, bytes32 hash)',
      'function predictAddress(bytes32 salt, bytes32 codeHash) external view returns (address)',
      'function predictAddressBatch(bytes32[] calldata salts, bytes32[] calldata codeHashes) external view returns (address[] memory predicted)',
      'function exists(bytes32 hash) external view returns (bool)',
      'function isDeployed(address target) external view returns (bool)',
      'function validateBytecodeSize(bytes calldata bytecode) external pure returns (bool)',
      
      // Fee and configuration functions
      'function baseFeeWei() external view returns (uint256)',
      'function feesEnabled() external view returns (bool)',
      'function feeRecipient() external view returns (address)',
      'function getDeploymentFee() external view returns (uint256)',
      'function getUserTier(address user) external view returns (uint8)',
      
      // System integrity and configuration
      'function verifySystemIntegrity() external view returns (bool)',
      'function getExpectedManifestHash() external view returns (bytes32)',
      'function getExpectedFactoryBytecodeHash() external view returns (bytes32)',
      'function getManifestDispatcher() external view returns (address)',
      
      // Admin functions
      'function pause() external',
      'function unpause() external',
      'function paused() external view returns (bool)',
      
      // Events
      'event ChunkDeployed(bytes32 indexed hash, address indexed chunk, uint256 size)',
      'event ChunkStaged(address indexed chunk, bytes32 indexed hash, bytes32 salt, uint256 size)',
      'event ContractDeployed(address indexed deployed, bytes32 indexed salt, address indexed deployer, uint256 fee)',
      'event BatchDeployed(address[] deployed, bytes32[] salts, address indexed deployer, uint256 totalFee)',
    ];

    this.contract = new ethers.Contract(
      this.network.contracts.factory,
      abi,
      this.signer || this.provider
    );
  }

  /**
   * Deploy a contract as a chunk using CREATE2 (updated for actual contract interface)
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

    // For DeterministicChunkFactory, we need to use the actual contract methods
    // Use deployDeterministic for CREATE2 deployment with bytecode
    const salt = ethers.randomBytes(32); // Generate random salt
    
    // Deploy using deployDeterministic
    const tx = await this.contract.deployDeterministic(
      salt,
      bytecode,
      constructorArgs.length > 0 ? ethers.AbiCoder.defaultAbiCoder().encode(['uint256[]'], [constructorArgs]) : '0x',
      {
        value: options?.value || this.network.fees.deploymentFee,
        gasLimit: options?.gasLimit || this.network.fees.gasLimit,
        maxFeePerGas: options?.maxFeePerGas,
        maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
      }
    );

    const receipt = await tx.wait();

    // Find ContractDeployed event
    const deployEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed?.name === 'ContractDeployed';
      } catch {
        return false;
      }
    });

    let deployedAddress = '';
    if (deployEvent) {
      const parsed = this.contract.interface.parseLog(deployEvent);
      deployedAddress = parsed?.args[0] || '';
    }

    return {
      address: deployedAddress,
      transactionHash: receipt.hash,
      chunkAddress: deployedAddress, // Same for deterministic deployment
    };
  }

  /**
   * Deploy data as a chunk using stage function
   */
  async stageChunk(
    data: BytesLike,
    options?: {
      value?: string;
      gasLimit?: number;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
    }
  ): Promise<{
    chunkAddress: string;
    contentHash: string;
    transactionHash: string;
  }> {
    if (!this.signer) {
      throw new Error('Signer required for staging');
    }

    const tx = await this.contract.stage(data, {
      value: options?.value || this.network.fees.deploymentFee,
      gasLimit: options?.gasLimit || this.network.fees.gasLimit,
      maxFeePerGas: options?.maxFeePerGas,
      maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
    });

    const receipt = await tx.wait();

    // Find ChunkStaged event
    const stageEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed?.name === 'ChunkStaged';
      } catch {
        return false;
      }
    });

    let chunkAddress = '';
    let contentHash = '';
    if (stageEvent) {
      const parsed = this.contract.interface.parseLog(stageEvent);
      chunkAddress = parsed?.args[0] || '';
      contentHash = parsed?.args[1] || '';
    }

    return {
      chunkAddress,
      contentHash,
      transactionHash: receipt.hash,
    };
  }

  /**
   * Calculate the deterministic address for a contract (updated method)
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

    // Use predict function from DeterministicChunkFactory
    const [predictedAddress] = await this.contract.predict(deploymentData);
    return predictedAddress;
  }

  /**
   * Predict address for deterministic deployment with salt
   */
  async predictDeterministicAddress(
    salt: BytesLike,
    bytecode: BytesLike,
    constructorArgs: any[] = []
  ): Promise<string> {
    // Combine bytecode and constructor args
    let initCode = bytecode;
    if (constructorArgs.length > 0) {
      const abiCoder = new ethers.AbiCoder();
      const encodedArgs = abiCoder.encode(['uint256[]'], [constructorArgs]);
      initCode = ethers.concat([bytecode, encodedArgs]);
    }

    const codeHash = ethers.keccak256(initCode);
    return await this.contract.predictAddress(salt, codeHash);
  }

  /**
   * Check if a chunk exists by content hash
   */
  async chunkExists(contentHash: string): Promise<boolean> {
    return await this.contract.exists(contentHash);
  }

  /**
   * Check if a contract is deployed at address
   */
  async isContractDeployed(address: string): Promise<boolean> {
    return await this.contract.isDeployed(address);
  }

  /**
   * Validate bytecode size before deployment
   */
  async validateBytecode(bytecode: BytesLike): Promise<boolean> {
    return await this.contract.validateBytecodeSize(bytecode);
  }

  /**
   * Verify system integrity
   */
  async verifySystemIntegrity(): Promise<boolean> {
    return await this.contract.verifySystemIntegrity();
  }

  /**
   * Estimate gas for deployment (updated for actual contract)
   */
  async estimateDeploymentGas(
    bytecode: BytesLike,
    constructorArgs: any[] = []
  ): Promise<bigint> {
    if (!this.signer) {
      throw new Error('Signer required for gas estimation');
    }

    // Generate a random salt for estimation
    const salt = ethers.randomBytes(32);
    
    // Encode constructor arguments if provided
    let constructorData = '0x';
    if (constructorArgs.length > 0) {
      const abiCoder = new ethers.AbiCoder();
      constructorData = abiCoder.encode(['uint256[]'], [constructorArgs]);
    }

    // Estimate gas for deployDeterministic
    return await this.contract.deployDeterministic.estimateGas(
      salt,
      bytecode,
      constructorData,
      {
        value: this.network.fees.deploymentFee,
      }
    );
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

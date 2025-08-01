import { ethers, Provider, Signer } from 'ethers';
import { NetworkConfig } from './config';

/**
 * Orchestrator service for complex deployment workflows
 */
export class Orchestrator {
  private provider: Provider;
  private signer?: Signer;
  private network: NetworkConfig;
  private contract: ethers.Contract;

  constructor(provider: Provider, signer: Signer | undefined, network: NetworkConfig) {
    this.provider = provider;
    this.signer = signer;
    this.network = network;

    // Orchestrator ABI (essential functions)
    const abi = [
      "function deployBatch(bytes[] calldata deploymentData, bytes32[] calldata salts) external payable returns (address[] memory)",
      "function deployWithManifest(bytes[] calldata deploymentData, bytes32 merkleRoot, string calldata ipfsHash) external payable returns (address[] memory)",
      "function calculateBatchAddresses(bytes[] calldata deploymentData) external view returns (address[] memory)",
      "function getDeploymentStatus(bytes32 deploymentId) external view returns (uint8 status, uint256 timestamp)",
      "event BatchDeploymentCompleted(bytes32 indexed deploymentId, address[] contracts)",
      "event ManifestDeploymentCompleted(bytes32 indexed deploymentId, bytes32 indexed merkleRoot)"
    ];

    this.contract = new ethers.Contract(
      this.network.contracts.orchestrator,
      abi,
      this.signer || this.provider
    );
  }

  /**
   * Deploy multiple contracts in a single transaction
   */
  async deployBatch(
    contracts: Array<{
      bytecode: string;
      constructorArgs?: any[];
    }>,
    options?: {
      gasLimit?: number;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
    }
  ): Promise<{
    addresses: string[];
    transactionHash: string;
    deploymentId: string;
  }> {
    if (!this.signer) {
      throw new Error('Signer required for batch deployment');
    }

    // Prepare deployment data
    const deploymentData: string[] = [];
    const salts: string[] = [];

    for (const contract of contracts) {
      let data = contract.bytecode;
      
      // Encode constructor arguments if provided
      if (contract.constructorArgs && contract.constructorArgs.length > 0) {
        const abiCoder = new ethers.AbiCoder();
        const encodedArgs = abiCoder.encode(['uint256[]'], [contract.constructorArgs]);
        data = ethers.concat([contract.bytecode, encodedArgs]);
      }
      
      deploymentData.push(data);
      
      // Calculate salt for deterministic deployment
      const salt = ethers.keccak256(ethers.toUtf8Bytes(`batch:${Date.now()}:${deploymentData.length}`));
      salts.push(salt);
    }

    // Calculate total deployment fee
    const totalFee = BigInt(this.network.fees.deploymentFee) * BigInt(contracts.length);

    const tx = await this.contract.deployBatch(deploymentData, salts, {
      value: totalFee.toString(),
      gasLimit: options?.gasLimit || this.network.fees.gasLimit * contracts.length,
      maxFeePerGas: options?.maxFeePerGas,
      maxPriorityFeePerGas: options?.maxPriorityFeePerGas
    });

    const receipt = await tx.wait();
    
    // Find deployment event
    const deployEvent = receipt?.logs.find((log: any) => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed?.name === 'BatchDeploymentCompleted';
      } catch {
        return false;
      }
    });

    let addresses: string[] = [];
    let deploymentId = '';
    
    if (deployEvent) {
      const parsed = this.contract.interface.parseLog(deployEvent);
      deploymentId = parsed?.args[0] || '';
      addresses = parsed?.args[1] || [];
    }

    return {
      addresses,
      transactionHash: receipt?.hash || '',
      deploymentId
    };
  }

  /**
   * Deploy contracts and update manifest in a single transaction
   */
  async deployWithManifest(
    contracts: Array<{
      name: string;
      bytecode: string;
      constructorArgs?: any[];
    }>,
    manifestData: {
      merkleRoot: string;
      ipfsHash: string;
    },
    options?: {
      gasLimit?: number;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
    }
  ): Promise<{
    addresses: string[];
    transactionHash: string;
    deploymentId: string;
    merkleRoot: string;
  }> {
    if (!this.signer) {
      throw new Error('Signer required for manifest deployment');
    }

    // Prepare deployment data
    const deploymentData: string[] = [];

    for (const contract of contracts) {
      let data = contract.bytecode;
      
      if (contract.constructorArgs && contract.constructorArgs.length > 0) {
        const abiCoder = new ethers.AbiCoder();
        const encodedArgs = abiCoder.encode(['uint256[]'], [contract.constructorArgs]);
        data = ethers.concat([contract.bytecode, encodedArgs]);
      }
      
      deploymentData.push(data);
    }

    // Calculate total deployment fee
    const totalFee = BigInt(this.network.fees.deploymentFee) * BigInt(contracts.length);

    const tx = await this.contract.deployWithManifest(
      deploymentData,
      manifestData.merkleRoot,
      manifestData.ipfsHash,
      {
        value: totalFee.toString(),
        gasLimit: options?.gasLimit || this.network.fees.gasLimit * contracts.length,
        maxFeePerGas: options?.maxFeePerGas,
        maxPriorityFeePerGas: options?.maxPriorityFeePerGas
      }
    );

    const receipt = await tx.wait();
    
    // Find deployment event
    const deployEvent = receipt?.logs.find((log: any) => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed?.name === 'ManifestDeploymentCompleted';
      } catch {
        return false;
      }
    });

    let addresses: string[] = [];
    let deploymentId = '';
    
    if (deployEvent) {
      const parsed = this.contract.interface.parseLog(deployEvent);
      deploymentId = parsed?.args[0] || '';
      // Note: addresses would need to be extracted from a different event or method
    }

    return {
      addresses,
      transactionHash: receipt?.hash || '',
      deploymentId,
      merkleRoot: manifestData.merkleRoot
    };
  }

  /**
   * Calculate addresses for a batch deployment before executing
   */
  async calculateBatchAddresses(
    contracts: Array<{
      bytecode: string;
      constructorArgs?: any[];
    }>
  ): Promise<string[]> {
    const deploymentData: string[] = [];

    for (const contract of contracts) {
      let data = contract.bytecode;
      
      if (contract.constructorArgs && contract.constructorArgs.length > 0) {
        const abiCoder = new ethers.AbiCoder();
        const encodedArgs = abiCoder.encode(['uint256[]'], [contract.constructorArgs]);
        data = ethers.concat([contract.bytecode, encodedArgs]);
      }
      
      deploymentData.push(data);
    }

    return await this.contract.calculateBatchAddresses(deploymentData);
  }

  /**
   * Get the status of a deployment
   */
  async getDeploymentStatus(deploymentId: string): Promise<{
    status: number;
    timestamp: number;
    statusText: string;
  }> {
    const [status, timestamp] = await this.contract.getDeploymentStatus(deploymentId);
    
    const statusTexts = ['Pending', 'InProgress', 'Completed', 'Failed'];
    const statusText = statusTexts[status] || 'Unknown';

    return {
      status: Number(status),
      timestamp: Number(timestamp),
      statusText
    };
  }

  /**
   * Estimate gas for batch deployment
   */
  async estimateBatchDeploymentGas(
    contracts: Array<{
      bytecode: string;
      constructorArgs?: any[];
    }>
  ): Promise<bigint> {
    if (!this.signer) {
      throw new Error('Signer required for gas estimation');
    }

    const deploymentData: string[] = [];
    const salts: string[] = [];

    for (const contract of contracts) {
      let data = contract.bytecode;
      
      if (contract.constructorArgs && contract.constructorArgs.length > 0) {
        const abiCoder = new ethers.AbiCoder();
        const encodedArgs = abiCoder.encode(['uint256[]'], [contract.constructorArgs]);
        data = ethers.concat([contract.bytecode, encodedArgs]);
      }
      
      deploymentData.push(data);
      
      const salt = ethers.keccak256(ethers.toUtf8Bytes(`batch:${Date.now()}:${deploymentData.length}`));
      salts.push(salt);
    }

    const totalFee = BigInt(this.network.fees.deploymentFee) * BigInt(contracts.length);

    return await this.contract.deployBatch.estimateGas(deploymentData, salts, {
      value: totalFee.toString()
    });
  }

  /**
   * Get orchestrator contract address
   */
  getOrchestratorAddress(): string {
    return this.network.contracts.orchestrator;
  }

  /**
   * Get orchestrator contract instance
   */
  getContract(): ethers.Contract {
    return this.contract;
  }

  /**
   * Listen for batch deployment events
   */
  onBatchDeploymentCompleted(callback: (deploymentId: string, contracts: string[]) => void): void {
    this.contract.on('BatchDeploymentCompleted', callback);
  }

  /**
   * Listen for manifest deployment events
   */
  onManifestDeploymentCompleted(callback: (deploymentId: string, merkleRoot: string) => void): void {
    this.contract.on('ManifestDeploymentCompleted', callback);
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.contract.removeAllListeners();
  }
}

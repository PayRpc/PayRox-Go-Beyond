import { ethers, Provider, Signer, Contract, BytesLike } from 'ethers';
import { NETWORKS, DEFAULT_NETWORK, CONSTANTS, NetworkConfig, ContractType } from './config';
import { ChunkFactory } from './chunk-factory';
import { Dispatcher } from './dispatcher';
import { Orchestrator } from './orchestrator';
import { ManifestBuilder } from './manifest-builder';

/**
 * PayRox Go Beyond SDK Client
 * Main entry point for interacting with the PayRox ecosystem
 */
export class PayRoxClient {
  private provider: Provider;
  private signer?: Signer;
  private network: NetworkConfig;
  
  public readonly factory: ChunkFactory;
  public readonly dispatcher: Dispatcher;
  public readonly orchestrator: Orchestrator;
  public readonly manifest: ManifestBuilder;

  constructor(
    provider: Provider,
    signer?: Signer,
    networkName: string = DEFAULT_NETWORK
  ) {
    this.provider = provider;
    this.signer = signer;
    
    const network = NETWORKS[networkName];
    if (!network) {
      throw new Error(`Unsupported network: ${networkName}`);
    }
    this.network = network;

    // Initialize service modules
    this.factory = new ChunkFactory(this.provider, this.signer, this.network);
    this.dispatcher = new Dispatcher(this.provider, this.signer, this.network);
    this.orchestrator = new Orchestrator(this.provider, this.signer, this.network);
    this.manifest = new ManifestBuilder(this.network);
  }

  /**
   * Create a PayRox client from a JSON-RPC URL
   */
  static fromRpc(rpcUrl: string, privateKey?: string, networkName?: string): PayRoxClient {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = privateKey ? new ethers.Wallet(privateKey, provider) : undefined;
    return new PayRoxClient(provider, signer, networkName);
  }

  /**
   * Create a PayRox client from a browser wallet (MetaMask, etc.)
   */
  static async fromBrowser(networkName?: string): Promise<PayRoxClient> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('Browser wallet not available');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new PayRoxClient(provider, signer, networkName);
  }

  /**
   * Get network information
   */
  getNetwork(): NetworkConfig {
    return this.network;
  }

  /**
   * Get current signer address
   */
  async getAddress(): Promise<string> {
    if (!this.signer) {
      throw new Error('No signer available');
    }
    return await this.signer.getAddress();
  }

  /**
   * Get account balance
   */
  async getBalance(address?: string): Promise<string> {
    const addr = address || await this.getAddress();
    const balance = await this.provider.getBalance(addr);
    return ethers.formatEther(balance);
  }

  /**
   * Deploy a contract using PayRox deterministic deployment
   */
  async deployContract(
    bytecode: BytesLike,
    constructorArgs: any[] = [],
    contractType: ContractType = 'utility',
    options?: {
      gasLimit?: number;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
    }
  ): Promise<{
    address: string;
    transactionHash: string;
    chunkAddress: string;
    deploymentFee: string;
  }> {
    if (!this.signer) {
      throw new Error('Signer required for deployment');
    }

    // Calculate deployment fee
    const deploymentFee = this.network.fees.deploymentFee;

    // Deploy using factory
    const result = await this.factory.deployChunk(
      bytecode,
      constructorArgs,
      {
        value: deploymentFee,
        gasLimit: options?.gasLimit || this.network.fees.gasLimit,
        maxFeePerGas: options?.maxFeePerGas || this.network.fees.maxFeePerGas,
        maxPriorityFeePerGas: options?.maxPriorityFeePerGas || this.network.fees.maxPriorityFeePerGas
      }
    );

    return {
      address: result.address,
      transactionHash: result.transactionHash,
      chunkAddress: result.chunkAddress,
      deploymentFee
    };
  }

  /**
   * Calculate deterministic address for a contract
   */
  async calculateAddress(bytecode: BytesLike, constructorArgs: any[] = []): Promise<string> {
    return await this.factory.calculateAddress(bytecode, constructorArgs);
  }

  /**
   * Check if a contract is already deployed at its deterministic address
   */
  async isDeployed(bytecode: BytesLike, constructorArgs: any[] = []): Promise<boolean> {
    const address = await this.calculateAddress(bytecode, constructorArgs);
    const code = await this.provider.getCode(address);
    return code !== '0x';
  }

  /**
   * Get deployment fee in ETH
   */
  getDeploymentFee(): string {
    return ethers.formatEther(this.network.fees.deploymentFee);
  }

  /**
   * Estimate gas for contract deployment
   */
  async estimateDeploymentGas(
    bytecode: BytesLike,
    constructorArgs: any[] = []
  ): Promise<bigint> {
    return await this.factory.estimateDeploymentGas(bytecode, constructorArgs);
  }

  /**
   * Build a manifest for multiple contracts
   */
  buildManifest(contracts: Array<{
    name: string;
    bytecode: BytesLike;
    constructorArgs?: any[];
    contractType?: ContractType;
  }>): Promise<any> {
    return this.manifest.build(contracts);
  }

  /**
   * Verify contract deployment and integrity
   */
  async verifyDeployment(
    address: string,
    expectedBytecode: BytesLike
  ): Promise<boolean> {
    const deployedCode = await this.provider.getCode(address);
    const expectedCode = ethers.hexlify(expectedBytecode);
    
    // Remove constructor arguments from comparison
    return deployedCode.startsWith(expectedCode.slice(0, -64)) || 
           deployedCode === expectedCode;
  }

  /**
   * Switch to a different network
   */
  switchNetwork(networkName: string): PayRoxClient {
    return new PayRoxClient(this.provider, this.signer, networkName);
  }

  /**
   * Get contract instance at address
   */
  getContract(address: string, abi: any[]): Contract {
    if (!this.signer) {
      return new Contract(address, abi, this.provider);
    }
    return new Contract(address, abi, this.signer);
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1,
    timeout?: number
  ): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.waitForTransaction(txHash, confirmations, timeout);
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.getTransactionReceipt(txHash);
  }

  /**
   * Check if PayRox contracts are available on current network
   */
  async isPayRoxAvailable(): Promise<boolean> {
    try {
      const factoryCode = await this.provider.getCode(this.network.contracts.factory);
      const dispatcherCode = await this.provider.getCode(this.network.contracts.dispatcher);
      return factoryCode !== '0x' && dispatcherCode !== '0x';
    } catch {
      return false;
    }
  }

  /**
   * Get PayRox system status
   */
  async getSystemStatus(): Promise<{
    network: string;
    chainId: number;
    factoryAddress: string;
    dispatcherAddress: string;
    deploymentFee: string;
    available: boolean;
  }> {
    const available = await this.isPayRoxAvailable();
    
    return {
      network: this.network.name,
      chainId: this.network.chainId,
      factoryAddress: this.network.contracts.factory,
      dispatcherAddress: this.network.contracts.dispatcher,
      deploymentFee: this.getDeploymentFee(),
      available
    };
  }
}

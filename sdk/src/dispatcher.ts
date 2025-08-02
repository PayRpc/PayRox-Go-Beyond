import { ethers, Provider, Signer } from 'ethers';
import { NetworkConfig } from './config';

/**
 * Dispatcher service for routing function calls to facets
 */
export class Dispatcher {
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

    // ManifestDispatcher ABI (essential functions)
    const abi = [
      'function updateManifest(bytes32 merkleRoot, string calldata ipfsHash) external',
      'function getCurrentRoot() external view returns (bytes32)',
      'function getRoute(bytes4 selector) external view returns (address facet, bool exists)',
      'function batchCall(bytes[] calldata calls) external returns (bytes[] memory results)',
      'function fallback() external payable',
      'event ManifestUpdated(bytes32 indexed oldRoot, bytes32 indexed newRoot, string ipfsHash)',
      'event RouteCall(bytes4 indexed selector, address indexed facet, address indexed caller)',
    ];

    this.contract = new ethers.Contract(
      this.network.contracts.dispatcher,
      abi,
      this.signer || this.provider
    );
  }

  /**
   * Update the manifest with new routing information
   */
  async updateManifest(
    merkleRoot: string,
    ipfsHash: string,
    options?: {
      gasLimit?: number;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
    }
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required for manifest update');
    }

    const tx = await this.contract.updateManifest(merkleRoot, ipfsHash, {
      gasLimit: options?.gasLimit || this.network.fees.gasLimit,
      maxFeePerGas: options?.maxFeePerGas,
      maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
    });

    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Get the current manifest root
   */
  async getCurrentRoot(): Promise<string> {
    return await this.contract.getCurrentRoot();
  }

  /**
   * Get routing information for a function selector
   */
  async getRoute(selector: string): Promise<{
    facet: string;
    exists: boolean;
  }> {
    const [facet, exists] = await this.contract.getRoute(selector);
    return { facet, exists };
  }

  /**
   * Execute a batch of function calls
   */
  async batchCall(
    calls: string[],
    options?: {
      gasLimit?: number;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
    }
  ): Promise<{
    results: string[];
    transactionHash: string;
  }> {
    if (!this.signer) {
      throw new Error('Signer required for batch calls');
    }

    const tx = await this.contract.batchCall(calls, {
      gasLimit: options?.gasLimit || this.network.fees.gasLimit,
      maxFeePerGas: options?.maxFeePerGas,
      maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
    });

    const receipt = await tx.wait();

    // Decode results from transaction logs or return value
    // This would need to be implemented based on the actual contract response
    const results: string[] = []; // TODO: Parse actual results

    return {
      results,
      transactionHash: receipt.hash,
    };
  }

  /**
   * Call a specific function through the dispatcher
   */
  async callFunction(
    selector: string,
    data: string,
    options?: {
      value?: string;
      gasLimit?: number;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
    }
  ): Promise<{
    result: string;
    transactionHash: string;
  }> {
    if (!this.signer) {
      throw new Error('Signer required for function calls');
    }

    // Get route information
    const route = await this.getRoute(selector);
    if (!route.exists) {
      throw new Error(`No route found for selector: ${selector}`);
    }

    // Prepare transaction data
    const txData = selector + data.slice(2); // Remove 0x from data and append to selector

    const tx = await this.signer.sendTransaction({
      to: this.network.contracts.dispatcher,
      data: txData,
      value: options?.value || '0',
      gasLimit: options?.gasLimit || this.network.fees.gasLimit,
      maxFeePerGas: options?.maxFeePerGas,
      maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
    });

    const receipt = await tx.wait();

    return {
      result: receipt.logs[0]?.data || '0x', // Simplified result parsing
      transactionHash: receipt.hash,
    };
  }

  /**
   * Estimate gas for a function call
   */
  async estimateGas(
    selector: string,
    data: string,
    value: string = '0'
  ): Promise<bigint> {
    if (!this.signer) {
      throw new Error('Signer required for gas estimation');
    }

    const route = await this.getRoute(selector);
    if (!route.exists) {
      throw new Error(`No route found for selector: ${selector}`);
    }

    const txData = selector + data.slice(2);

    return await this.provider.estimateGas({
      to: this.network.contracts.dispatcher,
      data: txData,
      value,
      from: await this.signer.getAddress(),
    });
  }

  /**
   * Get all available routes (this would require additional contract methods)
   */
  async getAllRoutes(): Promise<
    Array<{
      selector: string;
      facet: string;
    }>
  > {
    // This would need to be implemented based on events or additional contract methods
    // For now, return empty array
    return [];
  }

  /**
   * Check if a function selector is supported
   */
  async isSupported(selector: string): Promise<boolean> {
    const route = await this.getRoute(selector);
    return route.exists;
  }

  /**
   * Get dispatcher contract address
   */
  getDispatcherAddress(): string {
    return this.network.contracts.dispatcher;
  }

  /**
   * Get dispatcher contract instance
   */
  getContract(): ethers.Contract {
    return this.contract;
  }

  /**
   * Listen for manifest update events
   */
  onManifestUpdated(
    callback: (oldRoot: string, newRoot: string, ipfsHash: string) => void
  ): void {
    this.contract.on('ManifestUpdated', (oldRoot, newRoot, ipfsHash) => {
      callback(oldRoot, newRoot, ipfsHash);
    });
  }

  /**
   * Listen for route call events
   */
  onRouteCall(
    callback: (selector: string, facet: string, caller: string) => void
  ): void {
    this.contract.on('RouteCall', (selector, facet, caller) => {
      callback(selector, facet, caller);
    });
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.contract.removeAllListeners();
  }
}

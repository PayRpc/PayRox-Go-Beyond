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

    // ManifestDispatcher ABI (updated to match actual contract)
    const abi = [
      // Core routing functions
      'function getRoute(bytes4 selector) external view returns (address facet)',
      'function getRouteCount() external view returns (uint256)',
      'function routeCall(bytes calldata data) external payable returns (bytes memory)',
      
      // Manifest management
      'function updateManifest(bytes32 manifestHash, bytes calldata manifestData) external',
      'function commitRoot(bytes32 newRoot, uint64 newEpoch) external',
      'function applyRoutes(bytes4[] calldata selectors, address[] calldata facetList, bytes32[] calldata codehashes, bytes32[][] calldata proofs, bool[][] calldata isRight) external',
      'function activateCommittedRoot() external',
      
      // State and information
      'function currentRoot() external view returns (bytes32)',
      'function getManifestVersion() external view returns (uint64)',
      'function verifyManifest(bytes32 manifestHash) external view returns (bool valid, bytes32 currentHash)',
      'function getManifestInfo() external view returns (tuple(bytes32 hash, uint64 version, uint256 timestamp, uint256 selectorCount))',
      
      // Diamond Loupe interface
      'function facets() external view returns (tuple(address facetAddress, bytes4[] functionSelectors)[] memory facets_)',
      'function facetFunctionSelectors(address _facet) external view returns (bytes4[] memory facetFunctionSelectors_)',
      'function facetAddresses() external view returns (address[] memory facetAddresses_)',
      'function facetAddress(bytes4 _functionSelector) external view returns (address facetAddress_)',
      
      // Access control and security
      'function hasRole(bytes32 role, address account) external view returns (bool)',
      'function grantRole(bytes32 role, address account) external',
      'function revokeRole(bytes32 role, address account) external',
      'function pause() external',
      'function unpause() external',
      'function paused() external view returns (bool)',
      
      // Events
      'event ManifestUpdated(bytes32 indexed oldRoot, bytes32 indexed newRoot, uint64 version)',
      'event RouteApplied(bytes4 indexed selector, address indexed facet, bytes32 indexed proof)',
      'event RootCommitted(bytes32 indexed root, uint64 indexed epoch, uint256 timestamp)',
      'event CallRouted(bytes4 indexed selector, address indexed facet, address indexed caller, uint256 value)',
    ];

    this.contract = new ethers.Contract(
      this.network.contracts.dispatcher,
      abi,
      this.signer || this.provider
    );
  }

  /**
   * Update the manifest with new routing information (updated for ManifestDispatcher)
   */
  async updateManifest(
    manifestHash: string,
    manifestData: string,
    options?: {
      gasLimit?: number;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
    }
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('Signer required for manifest update');
    }

    const tx = await this.contract.updateManifest(manifestHash, manifestData, {
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
    return await this.contract.currentRoot();
  }

  /**
   * Get routing information for a function selector (updated for ManifestDispatcher)
   */
  async getRoute(selector: string): Promise<{
    facet: string;
    exists: boolean;
  }> {
    const facet = await this.contract.getRoute(selector);
    return {
      facet,
      exists: facet !== ethers.ZeroAddress,
    };
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
   * Get manifest information
   */
  async getManifestInfo(): Promise<{
    hash: string;
    version: number;
    timestamp: number;
    selectorCount: number;
  }> {
    const info = await this.contract.getManifestInfo();
    return {
      hash: info.hash,
      version: Number(info.version),
      timestamp: Number(info.timestamp),
      selectorCount: Number(info.selectorCount),
    };
  }

  /**
   * Verify manifest hash
   */
  async verifyManifest(manifestHash: string): Promise<{
    valid: boolean;
    currentHash: string;
  }> {
    const [valid, currentHash] = await this.contract.verifyManifest(manifestHash);
    return { valid, currentHash };
  }

  /**
   * Get all facets (Diamond Loupe interface)
   */
  async getFacets(): Promise<Array<{
    facetAddress: string;
    functionSelectors: string[];
  }>> {
    return await this.contract.facets();
  }

  /**
   * Get facet addresses
   */
  async getFacetAddresses(): Promise<string[]> {
    return await this.contract.facetAddresses();
  }

  /**
   * Get function selectors for a facet
   */
  async getFacetFunctionSelectors(facetAddress: string): Promise<string[]> {
    return await this.contract.facetFunctionSelectors(facetAddress);
  }

  /**
   * Get facet address for a function selector
   */
  async getFacetAddress(selector: string): Promise<string> {
    return await this.contract.facetAddress(selector);
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
    callback: (_oldRoot: string, _newRoot: string, _ipfsHash: string) => void
  ): void {
    this.contract.on('ManifestUpdated', (oldRoot, newRoot, ipfsHash) => {
      callback(oldRoot, newRoot, ipfsHash);
    });
  }

  /**
   * Listen for route call events
   */
  onRouteCall(
    callback: (_selector: string, _facet: string, _caller: string) => void
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

import { PluginConfig } from '../types';

/**
 * @title SDK Plugin Base Class
 * @notice Base class for creating SDK-based plugins
 * @dev Extend this class to create programmatic integrations with PayRox dApps
 */
export abstract class SDKPlugin {
  abstract readonly name: string;
  abstract readonly description: string;
  
  protected config?: PluginConfig;
  protected sdk?: any; // PayRox SDK instance

  constructor(config?: PluginConfig) {
    this.config = config;
  }

  /**
   * @notice Initialize the plugin with SDK instance
   * @param sdk PayRox SDK instance
   */
  async initialize(sdk: any): Promise<void> {
    this.sdk = sdk;
    // Override in subclasses for custom initialization
  }

  /**
   * @notice Clean up plugin resources
   */
  async cleanup(): Promise<void> {
    // Override in subclasses
  }

  /**
   * @notice Get plugin configuration
   */
  getConfig(): PluginConfig | undefined {
    return this.config;
  }

  /**
   * @notice Get SDK instance
   */
  getSDK(): any {
    return this.sdk;
  }

  /**
   * @notice Validate plugin requirements
   */
  async validate(): Promise<boolean> {
    if (!this.config) return true;

    // Check if SDK is available
    if (!this.sdk) {
      console.error('SDK instance not available');
      return false;
    }

    // Check dependencies
    if (this.config.dependencies) {
      for (const dep of this.config.dependencies) {
        try {
          require.resolve(dep);
        } catch {
          console.error(`Missing dependency: ${dep}`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * @notice Create a new contract instance
   * @param contractName Name of the contract
   * @param options Contract creation options
   */
  async createContract(contractName: string, options: any = {}): Promise<any> {
    if (!this.sdk) {
      throw new Error('SDK not initialized');
    }

    try {
      return await this.sdk.createContract(contractName, options);
    } catch (error) {
      this.error(`Failed to create contract '${contractName}'`, error as Error);
      throw error;
    }
  }

  /**
   * @notice Deploy a contract
   * @param contractName Name of the contract to deploy
   * @param args Constructor arguments
   * @param options Deployment options
   */
  async deployContract(contractName: string, args: any[] = [], options: any = {}): Promise<any> {
    if (!this.sdk) {
      throw new Error('SDK not initialized');
    }

    try {
      this.log(`Deploying contract '${contractName}'...`);
      const contract = await this.sdk.deployContract(contractName, args, options);
      this.log(`Contract '${contractName}' deployed at: ${contract.address}`);
      return contract;
    } catch (error) {
      this.error(`Failed to deploy contract '${contractName}'`, error as Error);
      throw error;
    }
  }

  /**
   * @notice Get deployed contract instance
   * @param contractName Name of the contract
   * @param address Contract address
   */
  async getContract(contractName: string, address: string): Promise<any> {
    if (!this.sdk) {
      throw new Error('SDK not initialized');
    }

    try {
      return await this.sdk.getContract(contractName, address);
    } catch (error) {
      this.error(`Failed to get contract '${contractName}' at ${address}`, error as Error);
      throw error;
    }
  }

  /**
   * @notice Execute a contract function
   * @param contract Contract instance
   * @param functionName Function name to call
   * @param args Function arguments
   * @param options Transaction options
   */
  async executeFunction(contract: any, functionName: string, args: any[] = [], options: any = {}): Promise<any> {
    try {
      this.log(`Executing ${functionName} on contract...`);
      const result = await contract[functionName](...args, options);
      this.log(`Function ${functionName} executed successfully`);
      return result;
    } catch (error) {
      this.error(`Failed to execute function '${functionName}'`, error as Error);
      throw error;
    }
  }

  /**
   * @notice Log info message with plugin prefix
   */
  protected log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }

  /**
   * @notice Log error message with plugin prefix
   */
  protected error(message: string, error?: Error): void {
    console.error(`[${this.name}] ERROR: ${message}`);
    if (error) {
      console.error(error.stack);
    }
  }

  /**
   * @notice Log warning message with plugin prefix
   */
  protected warn(message: string): void {
    console.warn(`[${this.name}] WARNING: ${message}`);
  }
}

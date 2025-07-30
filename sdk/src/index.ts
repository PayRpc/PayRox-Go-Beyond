import { ethers } from "ethers";
import { PayRoxConfig, DeploymentResult, ManifestEntry } from "./types";

/**
 * PayRox Go Beyond SDK
 * TypeScript SDK for integrating with PayRox contracts
 */

export class PayRoxSDK {
  private config: PayRoxConfig;
  private factory: ethers.Contract;
  private dispatcher: ethers.Contract;
  private orchestrator: ethers.Contract;

  constructor(config: PayRoxConfig) {
    this.config = config;
    
    // Initialize contracts (ABIs would be imported from artifacts)
    this.factory = new ethers.Contract(config.factoryAddress, [], config.provider);
    this.dispatcher = new ethers.Contract(config.dispatcherAddress, [], config.provider);
    this.orchestrator = new ethers.Contract(config.orchestratorAddress, [], config.provider);
    
    if (config.signer) {
      this.factory = this.factory.connect(config.signer) as ethers.Contract;
      this.dispatcher = this.dispatcher.connect(config.signer) as ethers.Contract;
      this.orchestrator = this.orchestrator.connect(config.signer) as ethers.Contract;
    }
  }

  /**
   * Deploy a contract chunk using the factory
   */
  async deployChunk(bytecode: string, salt: string): Promise<DeploymentResult> {
    try {
      if (!this.config.signer) {
        throw new Error("Signer required for deployment");
      }

      const tx = await this.factory.deployChunk(bytecode, salt);
      const receipt = await tx.wait();
      
      // Extract deployed address from events
      const deployEvent = receipt.logs.find((log: ethers.Log) => 
        log.topics[0] === ethers.id("ChunkDeployed(address,bytes32,address,uint256)")
      );
      
      if (!deployEvent) {
        throw new Error("Deployment event not found");
      }
      
      const deployedAddress = ethers.getAddress(deployEvent.topics[1].slice(26));
      
      return {
        success: true,
        address: deployedAddress,
        transactionHash: receipt.hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Update the manifest in the dispatcher
   */
  async updateManifest(entries: ManifestEntry[], manifestHash: string): Promise<DeploymentResult> {
    try {
      if (!this.config.signer) {
        throw new Error("Signer required for manifest update");
      }

      const tx = await this.dispatcher.updateManifest(entries, manifestHash);
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Dispatch a function call
   */
  async dispatch(selector: string, callData: string, value = "0"): Promise<{
    success: boolean;
    transactionHash: string;
    gasUsed: string;
  }> {
    try {
      const tx = await this.dispatcher.dispatch(selector, callData, { 
        value: ethers.parseEther(value) 
      });
      const receipt = await tx.wait();
      
      return {
        success: receipt.status === 1,
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      throw new Error(`Dispatch failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get the target address for a function selector
   */
  async getTarget(selector: string): Promise<string> {
    return await this.dispatcher.getTarget(selector);
  }

  /**
   * Check if a selector is active
   */
  async isActiveSelector(selector: string): Promise<boolean> {
    return await this.dispatcher.isActiveSelector(selector);
  }

  /**
   * Get factory information
   */
  async getFactoryInfo() {
    const owner = await this.factory.owner();
    const totalChunks = await this.factory.totalChunks();
    
    return {
      address: this.config.factoryAddress,
      owner,
      totalChunks: totalChunks.toString()
    };
  }

  /**
   * Get dispatcher information
   */
  async getDispatcherInfo() {
    const admin = await this.dispatcher.admin();
    const isPaused = await this.dispatcher.isPaused();
    const currentManifestHash = await this.dispatcher.currentManifestHash();
    
    return {
      address: this.config.dispatcherAddress,
      admin,
      isPaused,
      currentManifestHash
    };
  }

  /**
   * Compute the address of a chunk before deployment
   */
  async computeChunkAddress(bytecode: string, salt: string): Promise<string> {
    return await this.factory.computeChunkAddress(bytecode, salt);
  }

  /**
   * Check if an address is a deployed chunk
   */
  async isDeployedChunk(address: string): Promise<boolean> {
    return await this.factory.isDeployedChunk(address);
  }

  /**
   * Start an orchestration
   */
  async startOrchestration(orchestrationId: string, gasLimit: number): Promise<DeploymentResult> {
    try {
      if (!this.config.signer) {
        throw new Error("Signer required for orchestration");
      }

      const tx = await this.orchestrator.startOrchestration(orchestrationId, gasLimit);
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get orchestration details
   */
  async getOrchestration(orchestrationId: string) {
    return await this.orchestrator.getOrchestration(orchestrationId);
  }
}

// Helper functions
export function generateSalt(input: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(input));
}

export function calculateManifestHash(manifest: Record<string, unknown>): string {
  return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(manifest)));
}

export function encodeFunctionData(abi: ethers.InterfaceAbi, functionName: string, params: unknown[]): string {
  const iface = new ethers.Interface(abi);
  return iface.encodeFunctionData(functionName, params);
}

export function decodeFunctionResult(abi: ethers.InterfaceAbi, functionName: string, data: string): ethers.Result {
  const iface = new ethers.Interface(abi);
  return iface.decodeFunctionResult(functionName, data);
}

// Export types and classes
export * from "./types";
export { PayRoxSDK as default };

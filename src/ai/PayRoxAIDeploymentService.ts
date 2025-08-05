import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * @title PayRox AI Deployment Intelligence Service
 * @notice Production-ready AI service that instantly knows project structure and optimal deployment patterns
 * @dev Zero-search time deployment system with pinpoint accuracy and full SDK integration
 * 
 * FEATURES:
 * - Instant project structure recognition
 * - Pre-configured artifact resolution maps
 * - Built-in PayRox system knowledge
 * - SDK-integrated deployment patterns
 * - Zero lookup time for common contracts
 */
export class PayRoxAIDeploymentService {

  /**
   * PayRox Architecture Knowledge Base
   * CRITICAL: PayRox is NOT an EIP-2535 Diamond - it's a Manifest-Router Architecture
   */
  private readonly ARCHITECTURE_KNOWLEDGE = {
    pattern: "MANIFEST_ROUTER", // NOT Diamond
    description: "Ordered-pair Merkle manifests with cryptographic route verification",
    key_features: [
      "EXTCODEHASH gates before every DELEGATECALL",
      "Emergency forbiddenSelectors override",
      "Immutable routes after deployment freeze",
      "Isolated per-facet storage (no shared Diamond storage)",
      "Content-addressed CREATE2 deployment",
      "Role-based governance (COMMIT_ROLE, APPLY_ROLE, EMERGENCY_ROLE)"
    ],
    NOT_diamond_features: [
      "No shared storage between facets",
      "No runtime Diamond cuts",
      "No true EIP-2535 compliance",
      "IDiamondLoupe only for ecosystem tooling compatibility"
    ],
    routing_mechanism: "Merkle-proof validated routing",
    security_model: "Cryptographic manifest verification + emergency controls",
    upgrade_pattern: "Manifest commit → apply → activate workflow"
  };

  private static instance: PayRoxAIDeploymentService;
  private projectRoot: string;
  private deploymentCache: Map<string, CachedDeployment> = new Map();
  private readonly KNOWN_CONTRACTS: ContractRegistry;

  private constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.KNOWN_CONTRACTS = this.initializeContractRegistry();
    this.loadCachedDeployments();
  }

  /**
   * Singleton instance for system-wide AI service
   */
  public static getInstance(projectRoot?: string): PayRoxAIDeploymentService {
    if (!PayRoxAIDeploymentService.instance) {
      const root = projectRoot || this.detectProjectRoot();
      PayRoxAIDeploymentService.instance = new PayRoxAIDeploymentService(root);
    }
    return PayRoxAIDeploymentService.instance;
  }

  /**
   * Initialize the complete contract registry with instant lookup
   * NO SEARCH TIME - Everything is pre-mapped
   */
  private initializeContractRegistry(): ContractRegistry {
    return {
      // PayRox Core System - Production paths
      core: {
        "DeterministicChunkFactory": {
          path: "contracts/factory/DeterministicChunkFactory.sol",
          fullyQualified: "contracts/factory/DeterministicChunkFactory.sol:DeterministicChunkFactory",
          type: "factory",
          priority: 100,
          gasEstimate: 2500000,
          deploymentPattern: "CREATE2"
        },
        "ManifestDispatcher": {
          path: "contracts/dispatcher/ManifestDispatcher.sol",
          fullyQualified: "contracts/dispatcher/ManifestDispatcher.sol:ManifestDispatcher",
          type: "dispatcher",
          priority: 100,
          gasEstimate: 3500000,
          deploymentPattern: "CREATE2"
        },
        "Orchestrator": {
          path: "contracts/orchestrator/Orchestrator.sol",
          fullyQualified: "contracts/orchestrator/Orchestrator.sol:Orchestrator",
          type: "orchestrator",
          priority: 90,
          gasEstimate: 2000000,
          deploymentPattern: "CREATE2"
        }
      },

      // PayRox Manifest-Router Facets - Production paths
      facets: {
        "ExampleFacetA": {
          path: "contracts/facets/ExampleFacetA.sol",
          fullyQualified: "contracts/facets/ExampleFacetA.sol:ExampleFacetA",
          type: "facet",
          priority: 80,
          gasEstimate: 1500000,
          deploymentPattern: "STANDARD"
        },
        "ExampleFacetB": {
          path: "contracts/facets/ExampleFacetB.sol",
          fullyQualified: "contracts/facets/ExampleFacetB.sol:ExampleFacetB",
          type: "facet",
          priority: 80,
          gasEstimate: 1500000,
          deploymentPattern: "STANDARD"
        },
        "ChunkFactoryFacet": {
          path: "contracts/facets/ChunkFactoryFacet.sol",
          fullyQualified: "contracts/facets/ChunkFactoryFacet.sol:ChunkFactoryFacet",
          type: "facet",
          priority: 85,
          gasEstimate: 1200000,
          deploymentPattern: "STANDARD"
        },
        },

      // TerraStake System - DEMO PREFERRED (AI learned preference)
      terraStake: {
        "TerraStakeCoreFacet": {
          path: "contracts/demo/facets/TerraStakeCoreFacet.sol",
          fullyQualified: "contracts/demo/facets/TerraStakeCoreFacet.sol:TerraStakeCoreFacet",
          type: "demo-facet",
          priority: 95,
          gasEstimate: 1600000,
          deploymentPattern: "STANDARD",
          alternatives: ["contracts/facets/TerraStakeCoreFacet.sol"]
        },
        "TerraStakeTokenFacet": {
          path: "contracts/demo/facets/TerraStakeTokenFacet.sol",
          fullyQualified: "contracts/demo/facets/TerraStakeTokenFacet.sol:TerraStakeTokenFacet",
          type: "demo-facet",
          priority: 95,
          gasEstimate: 2500000,
          deploymentPattern: "STANDARD",
          alternatives: ["contracts/facets/TerraStakeTokenFacet.sol"]
        },
        "TerraStakeStakingFacet": {
          path: "contracts/demo/facets/TerraStakeStakingFacet.sol",
          fullyQualified: "contracts/demo/facets/TerraStakeStakingFacet.sol:TerraStakeStakingFacet",
          type: "demo-facet",
          priority: 90,
          gasEstimate: 1100000,
          deploymentPattern: "STANDARD"
        },
        "TerraStakeVRFFacet": {
          path: "contracts/demo/facets/TerraStakeVRFFacet.sol",
          fullyQualified: "contracts/demo/facets/TerraStakeVRFFacet.sol:TerraStakeVRFFacet",
          type: "demo-facet",
          priority: 90,
          gasEstimate: 1100000,
          deploymentPattern: "STANDARD"
        },
        "TerraStakeCoordinatorFacet": {
          path: "contracts/demo/facets/TerraStakeCoordinatorFacet.sol",
          fullyQualified: "contracts/demo/facets/TerraStakeCoordinatorFacet.sol:TerraStakeCoordinatorFacet",
          type: "demo-facet",
          priority: 85,
          gasEstimate: 1300000,
          deploymentPattern: "STANDARD"
        },
        "TerraStakeInitializer": {
          path: "contracts/demo/TerraStakeInitializer.sol",
          fullyQualified: "contracts/demo/TerraStakeInitializer.sol:TerraStakeInitializer",
          type: "initializer",
          priority: 95,
          gasEstimate: 1000000,
          deploymentPattern: "STANDARD"
        },
        "TerraStakeNFT": {
          path: "contracts/demo/TerraStakeNFT.sol",
          fullyQualified: "contracts/demo/TerraStakeNFT.sol:TerraStakeNFT",
          type: "nft",
          priority: 90,
          gasEstimate: 2000000,
          deploymentPattern: "STANDARD"
        }
      },

      // Test contracts
      test: {
        "MockFacet": {
          path: "contracts/test/MockFacet.sol",
          fullyQualified: "contracts/test/MockFacet.sol:MockFacet",
          type: "test",
          priority: 50,
          gasEstimate: 800000,
          deploymentPattern: "STANDARD"
        }
      }
    };
  }

  /**
   * Instant deployment with zero lookup time
   * @param contractName - Contract name (AI instantly knows the path)
   * @param constructorArgs - Constructor arguments
   * @param options - Deployment options
   */
  public async deployInstant(
    contractName: string,
    constructorArgs: any[] = [],
    options: InstantDeployOptions = {}
  ): Promise<InstantDeployResult> {
    console.log(`🚀 PayRox AI Instant Deploy: ${contractName}`);
    
    // INSTANT LOOKUP - Zero search time
    const contractInfo = this.getContractInfo(contractName);
    if (!contractInfo) {
      throw new Error(`❌ Unknown contract: ${contractName}. Add to registry or use discovery mode.`);
    }

    console.log(`   ⚡ Instant path resolution: ${contractInfo.fullyQualified}`);
    console.log(`   🎯 AI-optimized gas estimate: ${contractInfo.gasEstimate.toLocaleString()}`);

    // Apply AI-optimized deployment settings
    const deploymentOptions = this.getOptimizedOptions(contractInfo, options);
    
    // Check deployment cache for optimization
    const cacheKey = this.generateCacheKey(contractName, constructorArgs);
    const cached = this.deploymentCache.get(cacheKey);
    
    if (cached && options.useCache !== false) {
      console.log(`   🧠 Using cached deployment pattern (${cached.successCount} previous successes)`);
      deploymentOptions.gasLimit = cached.optimalGas;
    }

    try {
      // Execute instant deployment
      const result = await this.executeDeployment(contractInfo, constructorArgs, deploymentOptions);
      
      // Update cache for future optimizations
      this.updateDeploymentCache(cacheKey, result, contractInfo);
      
      console.log(`   ✅ Deployed: ${result.address}`);
      console.log(`   ⛽ Gas used: ${result.gasUsed.toLocaleString()}`);
      console.log(`   📏 Size: ${result.codeSize} bytes`);
      
      return result;
    } catch (error: any) {
      return await this.handleInstantDeploymentError(contractInfo, error, constructorArgs, deploymentOptions);
    }
  }

  /**
   * Batch deployment with intelligent sequencing
   */
  public async deployBatch(
    contracts: BatchDeployRequest[],
    options: BatchDeployOptions = {}
  ): Promise<BatchDeployResult> {
    console.log(`🔥 PayRox AI Batch Deploy: ${contracts.length} contracts`);
    
    // AI-optimized deployment sequence
    const optimizedSequence = this.optimizeDeploymentSequence(contracts);
    
    const results: InstantDeployResult[] = [];
    let totalGasUsed = BigInt(0);
    const startTime = Date.now();

    for (const contract of optimizedSequence) {
      try {
        const result = await this.deployInstant(
          contract.contractName,
          contract.constructorArgs || [],
          { ...options, useCache: true }
        );
        
        results.push(result);
        totalGasUsed += BigInt(result.gasUsed);
        
        if (options.delay) {
          await new Promise(resolve => setTimeout(resolve, options.delay));
        }
      } catch (error) {
        if (options.stopOnError) {
          throw error;
        }
        console.log(`   ⚠️ Skipping failed deployment: ${contract.contractName}`);
      }
    }

    const deploymentTime = Date.now() - startTime;
    
    console.log(`\n📊 Batch Deployment Complete:`);
    console.log(`   ✅ Successful: ${results.length}/${contracts.length}`);
    console.log(`   ⛽ Total gas: ${totalGasUsed.toString()}`);
    console.log(`   ⏱️ Time: ${deploymentTime}ms`);

    return {
      deployments: results,
      totalGasUsed: totalGasUsed.toString(),
      deploymentTime,
      successRate: results.length / contracts.length
    };
  }

  /**
   * Deploy complete PayRox system with AI orchestration
   */
  public async deployPayRoxSystem(options: SystemDeployOptions = {}): Promise<SystemDeployResult> {
    console.log(`🌍 PayRox AI System Deployment`);
    
    const deploymentPlan = this.createSystemDeploymentPlan(options);
    
    const results: Record<string, InstantDeployResult> = {};
    let totalGasUsed = BigInt(0);
    const startTime = Date.now();

    // Phase 1: Core Infrastructure
    console.log("\n🏗️ Phase 1: Core Infrastructure");
    for (const contract of deploymentPlan.coreContracts) {
      const result = await this.deployInstant(contract.contractName, contract.constructorArgs || []);
      results[contract.contractName] = result;
      totalGasUsed += BigInt(result.gasUsed);
    }

    // Phase 2: Manifest-Router Facets
    console.log("\n�️ Phase 2: Manifest-Router Facets");
    for (const contract of deploymentPlan.facetContracts) {
      const result = await this.deployInstant(contract.contractName, contract.constructorArgs || []);
      results[contract.contractName] = result;
      totalGasUsed += BigInt(result.gasUsed);
    }

    // Phase 3: Demo/Application Layer
    if (options.includeTerraStake) {
      console.log("\n🌱 Phase 3: TerraStake Demo System");
      for (const contract of deploymentPlan.terraStakeContracts) {
        const result = await this.deployInstant(contract.contractName, contract.constructorArgs || []);
        results[contract.contractName] = result;
        totalGasUsed += BigInt(result.gasUsed);
      }
    }

    const deploymentTime = Date.now() - startTime;
    
    // Save system deployment record
    await this.saveSystemDeploymentRecord(results, deploymentTime, totalGasUsed);
    
    console.log(`\n🎉 PayRox System Deployment Complete:`);
    console.log(`   📦 Contracts deployed: ${Object.keys(results).length}`);
    console.log(`   ⛽ Total gas: ${totalGasUsed.toString()}`);
    console.log(`   ⏱️ Total time: ${deploymentTime}ms`);

    return {
      deployments: results,
      totalGasUsed: totalGasUsed.toString(),
      deploymentTime,
      contractCount: Object.keys(results).length
    };
  }

  /**
   * Instant contract info lookup - Zero search time
   */
  private getContractInfo(contractName: string): ContractInfo | null {
    // Check all registries in priority order
    const registries = [
      this.KNOWN_CONTRACTS.terraStake,
      this.KNOWN_CONTRACTS.core,
      this.KNOWN_CONTRACTS.facets,
      this.KNOWN_CONTRACTS.test
    ];

    for (const registry of registries) {
      if (registry[contractName]) {
        return registry[contractName];
      }
    }

    return null;
  }

  /**
   * Get AI-optimized deployment options
   */
  private getOptimizedOptions(contractInfo: ContractInfo, userOptions: InstantDeployOptions): DeploymentOptions {
    return {
      gasLimit: userOptions.gasLimit || Math.floor(contractInfo.gasEstimate * 1.2),
      gasPrice: userOptions.gasPrice,
      nonce: userOptions.nonce,
      value: userOptions.value || 0
    };
  }

  /**
   * Execute the actual deployment
   */
  private async executeDeployment(
    contractInfo: ContractInfo,
    constructorArgs: any[],
    options: DeploymentOptions
  ): Promise<InstantDeployResult> {
    const Factory = await ethers.getContractFactory(contractInfo.fullyQualified);
    
    const deployArgs: any = {};
    if (options.gasLimit) deployArgs.gasLimit = options.gasLimit;
    if (options.gasPrice) deployArgs.gasPrice = options.gasPrice;
    if (options.nonce) deployArgs.nonce = options.nonce;
    if (options.value) deployArgs.value = options.value;

    const contract = await Factory.deploy(...constructorArgs, deployArgs);
    await contract.waitForDeployment();
    
    const address = await contract.getAddress();
    const deploymentTx = contract.deploymentTransaction();
    const receipt = await deploymentTx?.wait();
    
    const gasUsed = receipt?.gasUsed?.toString() || "0";
    const codeSize = ((await ethers.provider.getCode(address)).length - 2) / 2;
    
    return {
      contractName: contractInfo.fullyQualified,
      address,
      gasUsed,
      codeSize,
      transactionHash: deploymentTx?.hash || "",
      deploymentTime: Date.now(),
      contractType: contractInfo.type
    };
  }

  /**
   * Handle deployment errors with AI recovery
   */
  private async handleInstantDeploymentError(
    contractInfo: ContractInfo,
    error: any,
    constructorArgs: any[],
    options: DeploymentOptions
  ): Promise<InstantDeployResult> {
    console.log(`   ❌ Deployment failed: ${error.message}`);
    
    // AI-powered error recovery
    if (error.message.includes('gas')) {
      console.log(`   🔧 AI Auto-fix: Increasing gas limit`);
      const newOptions = { ...options, gasLimit: Math.floor((options.gasLimit || 3000000) * 1.3) };
      return await this.executeDeployment(contractInfo, constructorArgs, newOptions);
    }
    
    if (error.message.includes('nonce')) {
      console.log(`   🔧 AI Auto-fix: Nonce issue detected`);
      const newOptions = { ...options, nonce: undefined };
      return await this.executeDeployment(contractInfo, constructorArgs, newOptions);
    }

    // If we have alternatives, try them
    if (contractInfo.alternatives && contractInfo.alternatives.length > 0) {
      console.log(`   🔧 AI Auto-fix: Trying alternative path`);
      const altContractInfo = { ...contractInfo };
      altContractInfo.fullyQualified = `${contractInfo.alternatives[0]}:${contractInfo.fullyQualified.split(':')[1]}`;
      return await this.executeDeployment(altContractInfo, constructorArgs, options);
    }
    
    throw error;
  }

  /**
   * Optimize deployment sequence for batch operations
   */
  private optimizeDeploymentSequence(contracts: BatchDeployRequest[]): BatchDeployRequest[] {
    return contracts.sort((a, b) => {
      const infoA = this.getContractInfo(a.contractName);
      const infoB = this.getContractInfo(b.contractName);
      
      // Deploy by priority (core contracts first)
      const priorityA = infoA?.priority || 0;
      const priorityB = infoB?.priority || 0;
      
      return priorityB - priorityA;
    });
  }

  /**
   * Create system deployment plan
   */
  private createSystemDeploymentPlan(options: SystemDeployOptions): SystemDeploymentPlan {
    return {
      coreContracts: [
        { contractName: "DeterministicChunkFactory", constructorArgs: [] },
        { contractName: "ManifestDispatcher", constructorArgs: [] },
        { contractName: "Orchestrator", constructorArgs: [] }
      ],
      facetContracts: [
        { contractName: "ExampleFacetA", constructorArgs: [] },
        { contractName: "ExampleFacetB", constructorArgs: [] },
        { contractName: "ChunkFactoryFacet", constructorArgs: [] }
      ],
      terraStakeContracts: options.includeTerraStake ? [
        { contractName: "TerraStakeCoreFacet", constructorArgs: [] },
        { contractName: "TerraStakeTokenFacet", constructorArgs: [] },
        { contractName: "TerraStakeStakingFacet", constructorArgs: [] },
        { contractName: "TerraStakeVRFFacet", constructorArgs: [] }
      ] : []
    };
  }

  /**
   * Auto-detect project root
   */
  private static detectProjectRoot(): string {
    let currentDir = process.cwd();
    
    while (currentDir !== path.dirname(currentDir)) {
      if (fs.existsSync(path.join(currentDir, 'hardhat.config.ts')) || 
          fs.existsSync(path.join(currentDir, 'hardhat.config.js'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    
    return process.cwd();
  }

  /**
   * Generate cache key for deployment optimization
   */
  private generateCacheKey(contractName: string, constructorArgs: any[]): string {
    return `${contractName}:${JSON.stringify(constructorArgs)}`;
  }

  /**
   * Update deployment cache for future optimizations
   */
  private updateDeploymentCache(cacheKey: string, result: InstantDeployResult, contractInfo: ContractInfo): void {
    const existing = this.deploymentCache.get(cacheKey);
    const cached: CachedDeployment = {
      contractName: contractInfo.fullyQualified,
      optimalGas: parseInt(result.gasUsed),
      successCount: (existing?.successCount || 0) + 1,
      averageSize: existing ? 
        Math.floor((existing.averageSize + result.codeSize) / 2) : 
        result.codeSize,
      lastDeployed: new Date()
    };
    
    this.deploymentCache.set(cacheKey, cached);
    this.saveDeploymentCache();
  }

  /**
   * Load cached deployments for optimization
   */
  private loadCachedDeployments(): void {
    try {
      const cacheFile = path.join(this.projectRoot, 'config', 'ai-deployment-cache.json');
      if (fs.existsSync(cacheFile)) {
        const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        this.deploymentCache = new Map(data.cache || []);
        console.log(`🧠 Loaded ${this.deploymentCache.size} cached deployment patterns`);
      }
    } catch (error) {
      console.log(`⚠️ Could not load deployment cache: ${error}`);
    }
  }

  /**
   * Save deployment cache
   */
  private saveDeploymentCache(): void {
    try {
      const configDir = path.join(this.projectRoot, 'config');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const cacheFile = path.join(configDir, 'ai-deployment-cache.json');
      const data = {
        cache: Array.from(this.deploymentCache.entries()),
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.log(`⚠️ Could not save deployment cache: ${error}`);
    }
  }

  /**
   * Save system deployment record
   */
  private async saveSystemDeploymentRecord(
    results: Record<string, InstantDeployResult>,
    deploymentTime: number,
    totalGasUsed: BigInt
  ): Promise<void> {
    try {
      const configDir = path.join(this.projectRoot, 'config');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const recordFile = path.join(configDir, 'payrox-system-deployment.json');
      const record = {
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        deploymentTime,
        totalGasUsed: totalGasUsed.toString(),
        contractCount: Object.keys(results).length,
        contracts: results,
        aiOptimizations: this.deploymentCache.size
      };
      
      fs.writeFileSync(recordFile, JSON.stringify(record, null, 2));
      console.log(`💾 System deployment record saved: ${recordFile}`);
    } catch (error) {
      console.log(`⚠️ Could not save system deployment record: ${error}`);
    }
  }
}

// Type Definitions - Exported for SDK use
export interface ContractInfo {
  path: string;
  fullyQualified: string;
  type: string;
  priority: number;
  gasEstimate: number;
  deploymentPattern: string;
  alternatives?: string[];
}

export interface ContractRegistry {
  core: Record<string, ContractInfo>;
  facets: Record<string, ContractInfo>;
  terraStake: Record<string, ContractInfo>;
  test: Record<string, ContractInfo>;
}

export interface InstantDeployOptions {
  gasLimit?: number;
  gasPrice?: number;
  nonce?: number;
  value?: number;
  useCache?: boolean;
}

export interface DeploymentOptions {
  gasLimit?: number;
  gasPrice?: number;
  nonce?: number;
  value: number;
}

export interface InstantDeployResult {
  contractName: string;
  address: string;
  gasUsed: string;
  codeSize: number;
  transactionHash: string;
  deploymentTime: number;
  contractType: string;
}

export interface BatchDeployRequest {
  contractName: string;
  constructorArgs?: any[];
}

export interface BatchDeployOptions {
  stopOnError?: boolean;
  delay?: number;
  parallel?: boolean;
}

export interface BatchDeployResult {
  deployments: InstantDeployResult[];
  totalGasUsed: string;
  deploymentTime: number;
  successRate: number;
}

export interface SystemDeployOptions {
  includeTerraStake?: boolean;
  includeTests?: boolean;
  network?: string;
}

export interface SystemDeployResult {
  deployments: Record<string, InstantDeployResult>;
  totalGasUsed: string;
  deploymentTime: number;
  contractCount: number;
}

export interface SystemDeploymentPlan {
  coreContracts: BatchDeployRequest[];
  facetContracts: BatchDeployRequest[];
  terraStakeContracts: BatchDeployRequest[];
}

export interface CachedDeployment {
  contractName: string;
  optimalGas: number;
  successCount: number;
  averageSize: number;
  lastDeployed: Date;
}

// SDK Integration Functions
/**
 * Get the PayRox AI Deployment Service instance
 */
export function getPayRoxAI(): PayRoxAIDeploymentService {
  return PayRoxAIDeploymentService.getInstance();
}

/**
 * Quick deploy any contract with AI optimization
 */
export async function quickDeploy(contractName: string, args: any[] = []): Promise<InstantDeployResult> {
  return await getPayRoxAI().deployInstant(contractName, args);
}

/**
 * Deploy complete PayRox system
 */
export async function deployPayRoxSystem(options?: SystemDeployOptions): Promise<SystemDeployResult> {
  return await getPayRoxAI().deployPayRoxSystem(options);
}

/**
 * Deploy TerraStake demo system
 */
export async function deployTerraStake(): Promise<BatchDeployResult> {
  const ai = getPayRoxAI();
  return await ai.deployBatch([
    { contractName: "TerraStakeCoreFacet" },
    { contractName: "TerraStakeTokenFacet" },
    { contractName: "TerraStakeStakingFacet" },
    { contractName: "TerraStakeVRFFacet" }
  ]);
}

export default PayRoxAIDeploymentService;

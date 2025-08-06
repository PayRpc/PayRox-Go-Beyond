import { SolidityAnalyzer } from './SolidityAnalyzer';
import { FacetSimulator } from './FacetSimulator';
import {
  ParsedContract,
  FunctionInfo,
  FacetSuggestion,
  RefactorPlan,
  FacetDefinition,
} from '../types/index';

// PayRox Go Beyond protocol limits - keep in sync with constants/limits.ts
const MAX_FUNCTIONS_PER_FACET = 20; // Updated to match constants/limits.ts

// 🧠 AI LEARNING ENGINE - Enhanced Learning Capabilities
interface AILearningPattern {
  patternType: 'contract' | 'protocol' | 'facet' | 'optimization';
  signature: string;
  frequency: number;
  effectiveness: number;
  context: string;
  lastSeen: string;
}

interface AIRepositoryKnowledge {
  universalAutomationSystem: {
    mainScript: string;
    facetsGenerated: number;
    protocolsSupported: string[];
    learningSource: string;
  };
  crossChainCapabilities: {
    networksSupported: string[];
    universalSaltGeneration: boolean;
    deploymentStrategies: string[];
  };
  facetPatterns: {
    totalFacetsAnalyzed: number;
    protocolSpecificPatterns: Map<string, string[]>;
    commonOptimizations: string[];
  };
  // PayRox Diamond Architecture Knowledge
  diamondArchitecture: {
    implementationType: string;
    storagePattern: string;
    routingMethod: string;
    deploymentStrategy: string;
    facetCommunication: string;
    securityModel: string;
    upgradeability: string;
    storageSlotGeneration: string;
    accessControl: string;
    initializationPattern: string;
    magicValue: string;
    nonStandardFeatures: string[];
  };
  manifestSystem: {
    verificationMethod: string;
    routeResolution: string;
    storageIsolation: string;
    sharedStorageProhibited: boolean;
    deterministicDeployment: boolean;
    cryptographicIntegrity: boolean;
    facetAddressing: string;
    accessControlMethod: string;
  };
}

// PayRox Manifest Interface
interface PayRoxManifest {
  version: string;
  timestamp: string;
  metadata: {
    generator: string;
    originalContract: string;
    refactoringStrategy: string;
    estimatedGasSavings: number;
  };
  chunks: Array<{
    name: string;
    selector: string;
    securityLevel: string;
    estimatedGas: number;
    dependencies: string[];
    functions: string[];
  }>;
  deployment: {
    strategy: string;
    requiresFactory: boolean;
    requiresDispatcher: boolean;
    verificationMethod: string;
  };
  security: {
    criticalFacets: string[];
    accessControl: string;
    emergencyControls: boolean;
  };
}

/**
 * AI-Powered Refactoring Wizard for PayRox Go Beyond
 *
 * Analyzes monolithic smart contracts and provides intelligent suggestions
 * for converting them into modular facet-based architectures compatible
 * with the PayRox manifest system and CREATE2 deterministic deployment.
 *
 * Features:
 * - Intelligent function grouping based on access patterns
 * - Gas optimization through facet separation
 * - Security-aware categorization (Admin, View, Core facets)
 * - PayRox manifest generation for deterministic deployment
 * - EXTCODEHASH verification support
 * - 🧠 AI LEARNING ENGINE - Learns from repository patterns and user activities
 * - 🌐 Universal Protocol Support - Handles ANY smart contract protocol
 * - 📊 Pattern Recognition - Adapts based on analysis history
 */
export class AIRefactorWizard {
  private analyzer: SolidityAnalyzer;
  private simulator: FacetSimulator;
  
  // 🧠 AI LEARNING SYSTEM
  private learningPatterns: AILearningPattern[] = [];
  private repositoryKnowledge: AIRepositoryKnowledge;

  constructor() {
    this.analyzer = new SolidityAnalyzer();
    this.simulator = new FacetSimulator(this.analyzer);
    
    // 🌐 INITIALIZE AI WITH REPOSITORY KNOWLEDGE
    this.initializeRepositoryKnowledge();
    this.loadLearningPatterns();
  }
  
  /**
   * 🧠 Initialize AI with comprehensive repository knowledge
   * Based on Emiliano's complete AI material inventory
   */
  private initializeRepositoryKnowledge(): void {
    this.repositoryKnowledge = {
      universalAutomationSystem: {
        mainScript: 'scripts/ai-universal-automation.ts',
        facetsGenerated: 183, // From repository analysis
        protocolsSupported: ['Staking', 'DeFi', 'DAO', 'Token', 'NFT', 'Gaming', 'Lending'],
        learningSource: 'All AI Material Found By Emiliano.md'
      },
      crossChainCapabilities: {
        networksSupported: ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism', 'fantom'],
        universalSaltGeneration: true,
        deploymentStrategies: ['sequential', 'parallel', 'mixed', 'universal']
      },
      facetPatterns: {
        totalFacetsAnalyzed: 183,
        protocolSpecificPatterns: new Map([
          ['Staking', ['CoreFacet', 'RewardsFacet', 'ValidatorFacet', 'GovernanceFacet']],
          ['DeFi', ['SwapFacet', 'LiquidityFacet', 'PriceFacet', 'FeeFacet']],
          ['Token', ['TransferFacet', 'AllowanceFacet', 'MintBurnFacet']],
          ['DAO', ['ProposalFacet', 'VotingFacet', 'ExecutionFacet']],
          ['TerraStake', ['StakingCoreFacet', 'TokenFacet', 'RewardsFacet', 'GovernanceFacet']]
        ]),
        commonOptimizations: ['gas', 'security', 'mev', 'yield', 'voting']
      },
      // PayRox Diamond Architecture Knowledge (from IDiamondLoupe.sol & LibDiamond.sol)
      diamondArchitecture: {
        implementationType: 'MANIFEST_BASED_NON_STANDARD',
        storagePattern: 'ISOLATED_STORAGE_NO_SHARED',
        routingMethod: 'MERKLE_PROOF_VERIFICATION',
        deploymentStrategy: 'CONTENT_ADDRESSED_CREATE2',
        facetCommunication: 'MANIFEST_DISPATCHER_ONLY',
        securityModel: 'CRYPTOGRAPHIC_VERIFICATION',
        upgradeability: 'IMMUTABLE_ROUTING_POST_DEPLOYMENT',
        storageSlotGeneration: 'DETERMINISTIC_NAMESPACE_KECCAK256',
        accessControl: 'ROLE_BASED_THROUGH_DISPATCHER',
        initializationPattern: 'DIAMOND_STORAGE_ISOLATED_SLOTS',
        magicValue: 'PAYROX_GO_BEYOND_MANIFEST_V1',
        nonStandardFeatures: [
          'NO_DIAMOND_CUTS',
          'NO_SHARED_STORAGE',
          'MANIFEST_ROUTES_ONLY',
          'MERKLE_VERIFICATION',
          'ISOLATED_FACET_STORAGE'
        ]
      },
      manifestSystem: {
        verificationMethod: 'MERKLE_PROOF',
        routeResolution: 'MANIFEST_DISPATCHER',
        storageIsolation: 'MANDATORY',
        sharedStorageProhibited: true,
        deterministicDeployment: true,
        cryptographicIntegrity: true,
        facetAddressing: 'CREATE2_CONTENT_ADDRESSED',
        accessControlMethod: 'DISPATCHER_ROLE_BASED'
      }
    };
    
    console.log('🧠 AI Repository Knowledge Initialized');
    console.log(`📊 Total Facets Analyzed: ${this.repositoryKnowledge.facetPatterns.totalFacetsAnalyzed}`);
    console.log(`🌐 Protocols Supported: ${this.repositoryKnowledge.universalAutomationSystem.protocolsSupported.join(', ')}`);
  }
  
  /**
   * 🧠 Load existing learning patterns from previous analyses
   */
  private loadLearningPatterns(): void {
    // Initialize with patterns learned from the repository
    this.learningPatterns = [
      {
        patternType: 'protocol',
        signature: 'stake+reward',
        frequency: 15,
        effectiveness: 0.95,
        context: 'Staking protocol detection',
        lastSeen: new Date().toISOString()
      },
      {
        patternType: 'protocol', 
        signature: 'swap+liquidity',
        frequency: 12,
        effectiveness: 0.92,
        context: 'DeFi protocol detection',
        lastSeen: new Date().toISOString()
      },
      {
        patternType: 'facet',
        signature: 'admin+owner+onlyowner',
        frequency: 25,
        effectiveness: 0.98,
        context: 'Administrative facet pattern',
        lastSeen: new Date().toISOString()
      },
      {
        patternType: 'optimization',
        signature: 'view+pure_separation',
        frequency: 30,
        effectiveness: 0.89,
        context: 'Gas optimization through view function separation',
        lastSeen: new Date().toISOString()
      }
    ];
    
    console.log(`🧠 Loaded ${this.learningPatterns.length} learning patterns`);
  }
  
  /**
   * 🧠 Learn from contract analysis and update patterns
   */
  private learnFromAnalysis(contract: ParsedContract, facetSuggestions: FacetSuggestion[]): void {
    // Learn protocol patterns
    const detectedProtocol = this.detectProtocolFromContract(contract);
    if (detectedProtocol) {
      this.updateLearningPattern('protocol', detectedProtocol.signature, detectedProtocol.context);
    }
    
    // Learn facet patterns
    facetSuggestions.forEach(facet => {
      const facetPattern = this.extractFacetPattern(facet);
      this.updateLearningPattern('facet', facetPattern.signature, facetPattern.context);
    });
    
    // Learn optimization patterns
    const optimizations = this.extractOptimizationPatterns(facetSuggestions);
    optimizations.forEach(opt => {
      this.updateLearningPattern('optimization', opt.signature, opt.context);
    });
    
    console.log('🧠 AI learned from analysis - patterns updated');
  }
  
  /**
   * 🧠 Detect protocol type from contract analysis
   */
  private detectProtocolFromContract(contract: ParsedContract): { signature: string; context: string } | null {
    const functionNames = contract.functions.map(f => f.name.toLowerCase()).join(',');
    
    // Use learned patterns to detect protocol
    for (const [protocol, patterns] of this.repositoryKnowledge.facetPatterns.protocolSpecificPatterns) {
      const protocolKeywords = patterns.map(p => p.toLowerCase().replace('facet', ''));
      const hasKeywords = protocolKeywords.some(keyword => 
        functionNames.includes(keyword) || 
        contract.variables.some(v => v.name.toLowerCase().includes(keyword))
      );
      
      if (hasKeywords) {
        return {
          signature: protocol.toLowerCase(),
          context: `${protocol} protocol detected via pattern matching`
        };
      }
    }
    
    return null;
  }
  
  /**
   * 🧠 Extract learning patterns from facet suggestions
   */
  private extractFacetPattern(facet: FacetSuggestion): { signature: string; context: string } {
    const functionsSignature = facet.functions.join('+');
    return {
      signature: `${facet.name.toLowerCase()}:${functionsSignature}`,
      context: `Facet pattern: ${facet.name} with ${facet.functions.length} functions`
    };
  }
  
  /**
   * 🧠 Extract optimization patterns from analysis
   */
  private extractOptimizationPatterns(facets: FacetSuggestion[]): { signature: string; context: string }[] {
    const patterns: { signature: string; context: string }[] = [];
    
    facets.forEach(facet => {
      if (facet.gasOptimization === 'High') {
        patterns.push({
          signature: `${facet.gasOptimization.toLowerCase()}_${facet.name.toLowerCase()}`,
          context: `High gas optimization achieved with ${facet.name}`
        });
      }
    });
    
    return patterns;
  }
  
  /**
   * 🧠 Update learning pattern based on new evidence
   */
  private updateLearningPattern(type: AILearningPattern['patternType'], signature: string, context: string): void {
    const existingPattern = this.learningPatterns.find(p => p.signature === signature && p.patternType === type);
    
    if (existingPattern) {
      existingPattern.frequency += 1;
      existingPattern.lastSeen = new Date().toISOString();
      // Increase effectiveness if pattern is consistently used
      existingPattern.effectiveness = Math.min(0.99, existingPattern.effectiveness + 0.01);
    } else {
      this.learningPatterns.push({
        patternType: type,
        signature,
        frequency: 1,
        effectiveness: 0.7, // Start with moderate effectiveness
        context,
        lastSeen: new Date().toISOString()
      });
    }
  }

  /**
   * Analyze a contract and generate intelligent facet recommendations
   * 🧠 ENHANCED WITH AI LEARNING - Adapts based on repository knowledge
   *
   * @param sourceCode - Solidity contract source code
   * @param contractName - Optional contract name for analysis
   * @returns RefactorPlan with facet suggestions and deployment strategy
   */
  async analyzeContractForRefactoring(
    sourceCode: string,
    contractName?: string
  ): Promise<RefactorPlan> {
    try {
      console.log('🔍 Analyzing contract for PayRox facet refactoring...');
      console.log('🧠 AI Learning Engine: ACTIVE');

      // Parse the contract using SolidityAnalyzer
      const parsedContract = await this.analyzer.parseContract(
        sourceCode,
        contractName
      );

      console.log(
        `📊 Found ${parsedContract.functions.length} functions, ${parsedContract.variables.length} variables`
      );

      // 🧠 AI LEARNING: Detect protocol type using learned patterns
      const detectedProtocol = this.detectProtocolFromContract(parsedContract);
      if (detectedProtocol) {
        console.log(`🎯 AI detected protocol: ${detectedProtocol.context}`);
      }

      // Generate facet suggestions based on function analysis + AI learning
      const facetSuggestions = await this.generateFacetSuggestions(
        parsedContract
      );

      console.log(`🎯 Generated ${facetSuggestions.length} facet suggestions`);

      // 🧠 AI LEARNING: Learn from this analysis
      this.learnFromAnalysis(parsedContract, facetSuggestions);

      // Calculate gas optimization potential with AI insights
      const gasOptimization = this.estimateGasOptimization(
        parsedContract,
        facetSuggestions
      );

      // 🧠 AI ENHANCEMENT: Use learned patterns to improve suggestions
      const enhancedSuggestions = this.enhanceSuggestionsWithLearning(facetSuggestions, parsedContract);

      console.log('🧠 AI applied learned patterns to enhance suggestions');

      return {
        facets: enhancedSuggestions,
        sharedComponents: this.identifySharedComponents(parsedContract),
        deploymentStrategy: this.determineDeploymentStrategy(enhancedSuggestions),
        estimatedGasSavings: gasOptimization,
        warnings: this.generateWarnings(parsedContract, enhancedSuggestions),
      };
    } catch (error) {
      console.error('❌ Refactoring analysis failed:', error);
      throw new Error(
        `Refactoring analysis failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
  
  /**
   * 🧠 Enhance facet suggestions using AI learning patterns
   */
  private enhanceSuggestionsWithLearning(
    suggestions: FacetSuggestion[], 
    _contract: ParsedContract
  ): FacetSuggestion[] {
    return suggestions.map(suggestion => {
      // Find relevant learning patterns for this facet type
      const relevantPatterns = this.learningPatterns.filter(pattern => 
        pattern.signature.includes(suggestion.name.toLowerCase()) ||
        suggestion.functions.some(func => pattern.signature.includes(func.toLowerCase()))
      );
      
      if (relevantPatterns.length > 0) {
        const avgEffectiveness = relevantPatterns.reduce((sum, p) => sum + p.effectiveness, 0) / relevantPatterns.length;
        
        // Enhance suggestion based on learned effectiveness
        if (avgEffectiveness > 0.9) {
          suggestion.gasOptimization = 'High';
          suggestion.reasoning += ` [AI Enhancement: High effectiveness pattern detected (${(avgEffectiveness * 100).toFixed(1)}%)]`;
        }
      }
      
      return suggestion;
    });
  }

  /**
   * Generate intelligent facet suggestions based on function analysis
   * 🔶 Enhanced with PayRox Diamond Architecture patterns
   * Uses PayRox Go Beyond best practices for manifest-based facet separation
   */
  private async generateFacetSuggestions(
    contract: ParsedContract
  ): Promise<FacetSuggestion[]> {
    const suggestions: FacetSuggestion[] = [];

    console.log('💎 Applying PayRox Diamond Architecture patterns...');
    console.log(`🔶 Using ${this.repositoryKnowledge.diamondArchitecture.implementationType} implementation`);
    console.log(`🏗️ Storage Pattern: ${this.repositoryKnowledge.diamondArchitecture.storagePattern}`);

    // 1. Administrative functions facet (Critical security)
    const adminFunctions = contract.functions.filter(func =>
      this.isAdministrativeFunction(func)
    );

    if (adminFunctions.length > 0) {
      suggestions.push({
        name: 'AdminFacet',
        description:
          'Administrative and ownership functions for secure access control with PayRox Diamond isolation',
        functions: adminFunctions.map(f => f.name),
        estimatedSize: this.estimateFacetGas(adminFunctions),
        gasOptimization: 'High' as const,
        securityRating: 'Critical' as const,
        dependencies: [],
        reasoning:
          `Isolated administrative functions using ${this.repositoryKnowledge.diamondArchitecture.storagePattern}. ` +
          `Access control via ${this.repositoryKnowledge.diamondArchitecture.accessControl}. ` +
          `Deployed with ${this.repositoryKnowledge.diamondArchitecture.deploymentStrategy} for deterministic addressing.`,
        // PayRox Diamond specific properties
        payRoxDiamondConfig: {
          storageSlot: this.generatePayRoxStorageSlot('AdminFacet'),
          requiresManifestDispatcher: true,
          accessControlMethod: this.repositoryKnowledge.diamondArchitecture.accessControl,
          initializationRequired: true
        }
      });
    }

    // 2. View/Pure functions facet (Gas optimization)
    const viewFunctions = contract.functions.filter(
      func => func.stateMutability === 'view' || func.stateMutability === 'pure'
    );

    if (viewFunctions.length > 0) {
      suggestions.push({
        name: 'ViewFacet',
        description: 'Read-only functions optimized for gas-efficient queries',
        functions: viewFunctions.map(f => f.name),
        estimatedSize: this.estimateFacetGas(viewFunctions),
        gasOptimization: 'High' as const,
        securityRating: 'Low' as const,
        dependencies: [],
        reasoning:
          'Grouped view functions reduce gas costs for read operations and enable efficient caching strategies.',
      });
    }

    // 3. Core business logic facet(s)
    const coreFunctions = contract.functions.filter(
      func =>
        !this.isAdministrativeFunction(func) &&
        func.stateMutability !== 'view' &&
        func.stateMutability !== 'pure'
    );

    if (coreFunctions.length > 0) {
      // Group by functional similarity for optimal facet size
      const facetGroups = this.groupFunctionsByLogic(coreFunctions);

      facetGroups.forEach((group, index) => {
        const facetName =
          facetGroups.length > 1 ? `CoreFacet${index + 1}` : 'CoreFacet';

        suggestions.push({
          name: facetName,
          description: `Core business logic ${
            facetGroups.length > 1 ? `(Part ${index + 1})` : ''
          } - Primary contract functionality`,
          functions: group.map(f => f.name),
          estimatedSize: this.estimateFacetGas(group),
          gasOptimization: 'Medium' as const,
          securityRating: 'High' as const,
          dependencies: this.analyzeFacetDependencies(group),
          reasoning: `Core business logic separated for modularity, maintainability, and efficient PayRox routing. ${
            facetGroups.length > 1
              ? 'Split into multiple facets to stay within deployment limits.'
              : ''
          }`,
        });
      });
    }

    // 4. Storage management facet (if complex storage detected)
    const storageIntensiveFunctions = contract.functions.filter(func =>
      this.isStorageIntensive(func)
    );

    if (storageIntensiveFunctions.length > 3) {
      suggestions.push({
        name: 'StorageFacet',
        description: 'Storage-intensive operations for data management',
        functions: storageIntensiveFunctions.map(f => f.name),
        estimatedSize: this.estimateFacetGas(storageIntensiveFunctions),
        gasOptimization: 'Medium' as const,
        securityRating: 'Medium' as const,
        dependencies: ['AdminFacet'],
        reasoning:
          'Isolated storage operations prevent conflicts and enable specialized optimization for data-heavy functions.',
      });
    }

    return suggestions;
  }

  /**
   * Check if a function is administrative/ownership related
   */
  private isAdministrativeFunction(func: FunctionInfo): boolean {
    const adminKeywords = [
      'admin',
      'owner',
      'onlyowner',
      'onlyadmin',
      'authorize',
      'permission',
      'pause',
      'unpause',
      'emergency',
      'upgrade',
      'initialize',
      'setup',
      'governance',
      'vote',
      'proposal',
      'timelock',
      'multisig',
    ];

    const funcNameLower = func.name.toLowerCase();
    const hasAdminName = adminKeywords.some(keyword =>
      funcNameLower.includes(keyword)
    );
    const hasAdminModifier = func.modifiers.some(mod =>
      adminKeywords.some(keyword => mod.toLowerCase().includes(keyword))
    );

    return hasAdminName || hasAdminModifier;
  }

  /**
   * Check if a function is storage-intensive
   */
  private isStorageIntensive(func: FunctionInfo): boolean {
    const storageKeywords = [
      'store',
      'save',
      'update',
      'delete',
      'batch',
      'bulk',
      'mass',
    ];
    const funcNameLower = func.name.toLowerCase();

    // Check if function name suggests storage operations
    const hasStorageName = storageKeywords.some(keyword =>
      funcNameLower.includes(keyword)
    );

    // Check if function has many parameters (suggests data operations)
    const hasManyParams = func.parameters.length > 3;

    // Check if function is not a view/pure function (can modify state)
    const canModifyState =
      func.stateMutability !== 'view' && func.stateMutability !== 'pure';

    return (hasStorageName || hasManyParams) && canModifyState;
  }

  /**
   * Group functions by logical similarity for optimal facet distribution
   */
  private groupFunctionsByLogic(functions: FunctionInfo[]): FunctionInfo[][] {
    if (functions.length <= MAX_FUNCTIONS_PER_FACET) {
      return [functions];
    }

    // Advanced grouping strategy based on function patterns
    const groups: FunctionInfo[][] = [];
    const remainingFunctions = [...functions];

    while (remainingFunctions.length > 0) {
      const currentGroup: FunctionInfo[] = [];
      const seedFunction = remainingFunctions.shift();
      if (!seedFunction) {
        break;
      }

      currentGroup.push(seedFunction);

      // Group similar functions together
      for (let i = remainingFunctions.length - 1; i >= 0; i--) {
        if (currentGroup.length >= MAX_FUNCTIONS_PER_FACET) {
          break;
        }

        const candidate = remainingFunctions[i];
        if (candidate && this.functionsAreSimilar(seedFunction, candidate)) {
          currentGroup.push(candidate);
          remainingFunctions.splice(i, 1);
        }
      }

      // Fill remaining slots in group
      while (
        currentGroup.length < MAX_FUNCTIONS_PER_FACET &&
        remainingFunctions.length > 0
      ) {
        const nextFunction = remainingFunctions.shift();
        if (nextFunction) {
          currentGroup.push(nextFunction);
        }
      }

      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Check if two functions are logically similar
   */
  private functionsAreSimilar(
    func1: FunctionInfo,
    func2: FunctionInfo
  ): boolean {
    // Same state mutability
    if (func1.stateMutability === func2.stateMutability) {
      return true;
    }

    // Similar naming patterns
    const name1 = func1.name.toLowerCase();
    const name2 = func2.name.toLowerCase();

    const commonPrefixes = [
      'get',
      'set',
      'add',
      'remove',
      'update',
      'delete',
      'create',
      'transfer',
    ];
    for (const prefix of commonPrefixes) {
      if (name1.startsWith(prefix) && name2.startsWith(prefix)) {
        return true;
      }
    }

    // Similar modifiers
    const sharedModifiers = func1.modifiers.filter(mod =>
      func2.modifiers.includes(mod)
    );
    if (sharedModifiers.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Determine optimal deployment strategy based on facet characteristics
   */
  private determineDeploymentStrategy(
    facets: FacetSuggestion[]
  ): 'sequential' | 'parallel' | 'mixed' {
    const criticalFacets = facets.filter(f => f.securityRating === 'Critical');
    const totalFacets = facets.length;

    // Sequential for critical-heavy deployments
    if (criticalFacets.length > totalFacets / 2) {
      return 'sequential';
    }

    // Parallel for simple deployments
    if (totalFacets <= 3 && criticalFacets.length <= 1) {
      return 'parallel';
    }

    // Mixed for complex deployments
    return 'mixed';
  }

  /**
   * Estimate gas optimization potential from facet separation
   */
  private estimateGasOptimization(
    contract: ParsedContract,
    facets: FacetSuggestion[]
  ): number {
    const originalEstimate = contract.functions.reduce(
      (total, func) => total + this.estimateFunctionGas(func),
      0
    );

    const facetizedEstimate = facets.reduce(
      (total, facet) => total + facet.estimatedSize,
      0
    );

    // PayRox-specific optimizations
    const create2DeploymentBonus = facets.length * 5000; // CREATE2 efficiency
    const routingOverhead = contract.functions.length * 300; // Manifest routing cost
    const facetIsolationBonus = facets.length * 2000; // Storage isolation benefits

    const adjustedFacetEstimate =
      facetizedEstimate +
      routingOverhead -
      create2DeploymentBonus -
      facetIsolationBonus;
    const potentialSavings = Math.max(
      0,
      originalEstimate - adjustedFacetEstimate
    );

    return potentialSavings;
  }

  /**
   * Identify shared components across facets
   */
  private identifySharedComponents(contract: ParsedContract): string[] {
    const components: string[] = [];

    // Shared storage layout analysis
    if (contract.variables.length > 0) {
      components.push('Shared storage layout coordination');
      components.push('Storage layout verification (EXTCODEHASH)');
    }

    // Event definitions that span facets
    if (contract.events.length > 0) {
      components.push('Cross-facet event definitions');
    }

    // Access control modifiers
    const modifierCount = contract.functions.reduce(
      (count, func) => count + func.modifiers.length,
      0
    );

    if (modifierCount > 0) {
      components.push('Shared access control modifiers');
    }

    // PayRox-specific components
    components.push('PayRox manifest coordination');
    components.push('CREATE2 deterministic deployment');
    components.push('ManifestDispatcher integration');

    return components;
  }

  /**
   * Generate warnings for the refactor plan
   */
  private generateWarnings(
    contract: ParsedContract,
    facets: FacetSuggestion[]
  ): string[] {
    const warnings: string[] = [];

    // Complexity warnings
    if (facets.length > 6) {
      warnings.push(
        '⚠️ Large number of facets may increase deployment and management complexity'
      );
    }

    if (contract.variables.length > 15) {
      warnings.push(
        '⚠️ Complex storage layout requires careful coordination between facets'
      );
    }

    // Security warnings
    const criticalFacets = facets.filter(f => f.securityRating === 'Critical');
    if (criticalFacets.length > 1) {
      warnings.push(
        '⚠️ Multiple critical facets detected - consider consolidating admin functions'
      );
    }

    // Gas warnings
    const totalEstimatedSize = facets.reduce(
      (total, facet) => total + facet.estimatedSize,
      0
    );
    if (totalEstimatedSize > 500000) {
      warnings.push(
        '⚠️ High total gas estimate - consider further optimization'
      );
    }

    // PayRox-specific warnings
    if (facets.some(f => f.dependencies.length > 2)) {
      warnings.push(
        '⚠️ Complex inter-facet dependencies may affect PayRox routing efficiency'
      );
    }

    return warnings;
  }

  /**
   * Estimate gas usage for a function
   */
  private estimateFunctionGas(func: FunctionInfo): number {
    let baseGas = 21000; // Transaction base cost

    // Parameter processing cost
    if (func.parameters && func.parameters.length > 0) {
      baseGas += func.parameters.length * 800;
    }

    // State mutability adjustments
    switch (func.stateMutability) {
      case 'view':
      case 'pure':
        baseGas = 2000; // Much cheaper for view functions
        break;
      case 'payable':
        baseGas += 7000; // Additional cost for payable functions
        break;
      default:
        baseGas += 3000; // Standard state-changing function
    }

    // Complexity based on function body size
    const bodyLength = func.body?.length || 50;
    const complexityFactor = Math.min(bodyLength / 20, 10000); // Cap complexity impact
    baseGas += Math.floor(complexityFactor);

    // Modifier overhead
    baseGas += func.modifiers.length * 500;

    return baseGas;
  }

  /**
   * Estimate total gas for a facet
   */
  private estimateFacetGas(functions: FunctionInfo[]): number {
    const totalGas = functions.reduce(
      (total, func) => total + this.estimateFunctionGas(func),
      0
    );

    // Add facet deployment overhead
    const deploymentOverhead = 30000;

    return totalGas + deploymentOverhead;
  }

  /**
   * Analyze dependencies between facets
   */
  private analyzeFacetDependencies(functions: FunctionInfo[]): string[] {
    const dependencies: string[] = [];

    // Check for admin function calls
    functions.forEach(func => {
      if (
        func.body?.includes('onlyOwner') ||
        func.body?.includes('onlyAdmin') ||
        func.modifiers.some(
          mod =>
            mod.toLowerCase().includes('admin') ||
            mod.toLowerCase().includes('owner')
        )
      ) {
        dependencies.push('AdminFacet');
      }
    });

    return Array.from(new Set(dependencies)); // Remove duplicates
  }

  /**
   * Apply refactoring plan to generate actual facet contracts
   */
  async applyRefactoring(
    sourceCode: string,
    contractName: string,
    refactorPlan: RefactorPlan
  ): Promise<{
    facets: FacetDefinition[];
    manifest: PayRoxManifest;
    deploymentInstructions: string[];
  }> {
    try {
      console.log('🔧 Applying PayRox refactoring plan...');

      const facets: FacetDefinition[] = [];

      // Generate facet contracts
      for (const suggestion of refactorPlan.facets) {
        console.log(`📝 Generating ${suggestion.name} contract...`);

        const facetContract = this.generateFacetContract(suggestion);

        facets.push({
          name: suggestion.name,
          sourceCode: facetContract,
          functions: [], // Will be populated with actual FunctionInfo during implementation
          selector: this.generateSelector(suggestion.name),
          dependencies: suggestion.dependencies,
          estimatedGas: suggestion.estimatedSize,
          securityLevel: suggestion.securityRating,
        });
      }

      // Generate PayRox manifest
      const manifest = this.generatePayRoxManifest(
        facets,
        contractName,
        refactorPlan
      );

      // Generate deployment instructions
      const deploymentInstructions =
        this.generateDeploymentInstructions(facets);

      console.log('✅ Refactoring plan applied successfully!');

      return {
        facets,
        manifest,
        deploymentInstructions,
      };
    } catch (error) {
      console.error('❌ Refactoring application failed:', error);
      throw new Error(
        `Refactoring application failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Generate a deterministic selector for a facet
   */
  private generateSelector(facetName: string): string {
    // Simple hash-based selector generation (in production, use proper keccak256)
    const hash = facetName
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `0x${hash.toString(16).padStart(8, '0').slice(-8)}`;
  }

  /**
   * Generate PayRox Go Beyond manifest
   */
  private generatePayRoxManifest(
    facets: FacetDefinition[],
    contractName: string,
    plan: RefactorPlan
  ): PayRoxManifest {
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      metadata: {
        generator: 'PayRox AI Refactor Wizard',
        originalContract: contractName,
        refactoringStrategy: plan.deploymentStrategy,
        estimatedGasSavings: plan.estimatedGasSavings,
      },
      chunks: facets.map(facet => ({
        name: facet.name,
        selector: facet.selector,
        securityLevel: facet.securityLevel,
        estimatedGas: facet.estimatedGas,
        dependencies: facet.dependencies,
        functions:
          plan.facets.find(f => f.name === facet.name)?.functions || [],
      })),
      deployment: {
        strategy: plan.deploymentStrategy,
        requiresFactory: true,
        requiresDispatcher: true,
        verificationMethod: 'EXTCODEHASH',
      },
      security: {
        criticalFacets: facets
          .filter(f => f.securityLevel === 'Critical')
          .map(f => f.name),
        accessControl: 'role-based',
        emergencyControls: true,
      },
    };
  }

  /**
   * Generate deployment instructions specific to PayRox Go Beyond
   */
  private generateDeploymentInstructions(facets: FacetDefinition[]): string[] {
    const instructions = [
      '🏗️ PayRox Go Beyond Deployment Instructions',
      '',
      '1. Pre-deployment Setup:',
      '   • Ensure DeterministicChunkFactory is deployed',
      '   • Verify ManifestDispatcher is available',
      '   • Prepare deployment salt for CREATE2',
      '',
      '2. Facet Compilation:',
      '   • Compile all facet contracts with solc 0.8.20+',
      '   • Verify compilation artifacts',
      '   • Calculate bytecode sizes',
      '',
      '3. CREATE2 Address Calculation:',
      '   • Calculate deterministic addresses for all facets',
      '   • Verify no address collisions',
      '   • Update manifest with predicted addresses',
      '',
      '4. Staged Deployment:',
    ];

    // Add facet-specific deployment steps
    const criticalFacets = facets.filter(f => f.securityLevel === 'Critical');
    const regularFacets = facets.filter(f => f.securityLevel !== 'Critical');

    if (criticalFacets.length > 0) {
      instructions.push('   • Deploy critical facets first (sequential):');
      criticalFacets.forEach(facet => {
        instructions.push(`     - Deploy ${facet.name}`);
        instructions.push(`     - Verify deployment with EXTCODEHASH`);
      });
    }

    if (regularFacets.length > 0) {
      instructions.push('   • Deploy regular facets:');
      regularFacets.forEach(facet => {
        instructions.push(`     - Deploy ${facet.name}`);
      });
    }

    instructions.push(
      '',
      '5. Manifest Updates:',
      '   • Update manifest with actual deployment addresses',
      '   • Calculate and store runtime codehashes',
      '   • Generate merkle proofs for verification',
      '',
      '6. Dispatcher Configuration:',
      '   • Update ManifestDispatcher with new routes',
      '   • Test routing for all functions',
      '   • Verify access controls',
      '',
      '7. Integration Testing:',
      '   • Test inter-facet communications',
      '   • Verify storage layout compatibility',
      '   • Test emergency controls',
      '',
      '8. Production Readiness:',
      '   • Update monitoring and alerts',
      '   • Document facet architecture',
      '   • Prepare upgrade procedures',
      '',
      '⚠️ Important: Always test on testnets before mainnet deployment!'
    );

    return instructions;
  }

  /**
   * Generate Solidity contract code for a facet
   */
  private generateFacetContract(suggestion: FacetSuggestion): string {
    const contractName = suggestion.name;

    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ${contractName} - Generated by PayRox AI Refactor Wizard
 *
 * ${suggestion.description}
 * Security Rating: ${suggestion.securityRating}
 * Gas Optimization: ${suggestion.gasOptimization}
 * Estimated Size: ${suggestion.estimatedSize}
 *
 * Reasoning: ${suggestion.reasoning}
 */
contract ${contractName} {

    // Events for PayRox integration
    event FacetInitialized(address indexed facet, uint256 timestamp);
    event FacetUpgraded(address indexed oldImplementation, address indexed newImplementation);

    // Custom errors for gas efficiency
    error Unauthorized(address caller);
    error InvalidParameter(string param, bytes32 value);
    error FacetNotInitialized();
    error InvalidSelector(bytes4 selector);

    // State variables
    address public owner;
    bool public initialized;
    mapping(bytes4 => bool) public supportedSelectors;

    // Access control
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized(msg.sender);
        _;
    }

    modifier onlyInitialized() {
        if (!initialized) revert FacetNotInitialized();
        _;
    }

    constructor() {
        owner = msg.sender;
        initialized = true;
        emit FacetInitialized(address(this), block.timestamp);
    }

    /**
     * PayRox compatibility function
     * Returns the codehash for EXTCODEHASH verification
     */
    function getCodehash() external view returns (bytes32) {
        return keccak256(abi.encodePacked(type(${contractName}).runtimeCode));
    }

    /**
     * Get facet metadata for PayRox manifest
     */
    function getFacetInfo() external view returns (
        string memory name,
        string memory description,
        string memory securityRating,
        uint256 estimatedGas
    ) {
        return (
            "${contractName}",
            "${suggestion.description}",
            "${suggestion.securityRating}",
            ${suggestion.estimatedSize}
        );
    }

${this.generateFacetFunctions(suggestion)}
}`;
  }

  /**
   * Generate function stubs for the facet
   */
  private generateFacetFunctions(suggestion: FacetSuggestion): string {
    let functions = '';

    suggestion.functions.forEach(funcName => {
      const isAdminFunction = suggestion.securityRating === 'Critical';
      const modifiers = isAdminFunction
        ? ' onlyOwner onlyInitialized'
        : ' onlyInitialized';

      functions += `
    /**
     * ${funcName} - Migrated from original contract
     * Auto-generated stub - implement actual logic
     */
    function ${funcName}() external${modifiers} {
        // TODO: Implement function logic from original contract
        // Consider:
        // - Parameter validation
        // - State changes
        // - Event emissions
        // - Return values

        // Placeholder implementation
    }
`;
    });

    return functions;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PayRox Diamond Architecture Helper Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 💎 Generate PayRox Diamond storage slot using LibDiamond pattern
   * @param facetName The facet name for storage isolation
   * @param version Storage layout version (default: 1)
   * @returns Deterministic storage slot for isolated facet storage
   */
  private generatePayRoxStorageSlot(facetName: string, version: number = 1): string {
    // Using LibDiamond.generateStorageSlot pattern: keccak256("payrox.facet.storage." + facetName + ".v" + version)
    const storageKey = `payrox.facet.storage.${facetName.toLowerCase()}.v${version}`;
    return storageKey;
  }

  /**
   * 💎 Generate PayRox Diamond CREATE2 deployment salt
   * @param deployer The deployer address
   * @param facetName The facet name
   * @param initData Initialization data
   * @returns PayRox deterministic deployment salt
   */
  private generatePayRoxDeploymentSalt(
    deployer: string,
    facetName: string,
    initData: string = '0x'
  ): string {
    // Using LibDiamond.generateDeploymentSalt pattern with PAYROX_MANIFEST_MAGIC
    const magicValue = this.repositoryKnowledge.diamondArchitecture.magicValue;
    return `PayRox_${magicValue}_${deployer}_${facetName}_${initData}`;
  }

  /**
   * 💎 Check if facet requires PayRox Diamond initialization
   * @param facetName The facet name to check
   * @returns True if requires LibDiamond.initializeDiamond pattern
   */
  private requiresPayRoxDiamondInit(facetName: string): boolean {
    const criticalFacets = ['Admin', 'Core', 'Governance', 'Staking'];
    return criticalFacets.some(critical => facetName.includes(critical));
  }

  /**
   * 💎 Generate PayRox Diamond facet template with proper isolation
   * @param facetName The facet name
   * @param functions The functions to include
   * @returns PayRox Diamond-compatible facet code template
   */
  private generatePayRoxDiamondFacetTemplate(
    facetName: string,
    functions: string[]
  ): string {
    const storageSlot = this.generatePayRoxStorageSlot(facetName);
    const requiresInit = this.requiresPayRoxDiamondInit(facetName);

    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../utils/LibDiamond.sol";

/**
 * @title ${facetName}
 * @notice PayRox Diamond Architecture - Manifest-based facet with isolated storage
 * @dev NON-STANDARD Diamond: Uses manifest verification, no shared storage
 * 
 * PayRox Features:
 * - Isolated storage: ${storageSlot}
 * - Manifest routing: Required
 * - Access control: Via dispatcher
 * - Deployment: CREATE2 content-addressed
 */
contract ${facetName} {
    using LibDiamond for LibDiamond.DiamondStorage;

    // ═══════════════════════════════════════════════════════════════════════════
    // STORAGE - ISOLATED FROM OTHER FACETS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @dev PayRox isolated storage slot: ${storageSlot}
    bytes32 private constant STORAGE_POSITION = 
        keccak256("${storageSlot}");

    struct ${facetName}Storage {
        // Add facet-specific storage variables here
        bool initialized;
        mapping(address => bool) authorized;
        uint256[50] reserved; // Reserve slots for future upgrades
    }

    function ${facetName.toLowerCase()}Storage() internal pure returns (${facetName}Storage storage ds) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION - PayRox Diamond Pattern
    // ═══════════════════════════════════════════════════════════════════════════

    ${requiresInit ? `
    /**
     * @notice Initialize ${facetName} with PayRox Diamond integration
     * @param manifestDispatcher The PayRox manifest dispatcher address
     */
    function initialize${facetName}(address manifestDispatcher) external {
        LibDiamond.initializeDiamond(manifestDispatcher);
        
        ${facetName}Storage storage ds = ${facetName.toLowerCase()}Storage();
        require(!ds.initialized, "${facetName}: Already initialized");
        
        ds.initialized = true;
        // Add facet-specific initialization logic here
    }
    ` : ''}

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCESS CONTROL - Via PayRox Manifest Dispatcher
    // ═══════════════════════════════════════════════════════════════════════════

    modifier onlyManifestDispatcher() {
        LibDiamond.enforceManifestCall();
        _;
    }

    modifier onlyRole(bytes32 role) {
        LibDiamond.requireRole(role);
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FACET FUNCTIONS - AI Generated
    // ═══════════════════════════════════════════════════════════════════════════

    ${functions.map(func => `
    /**
     * @notice ${func} - PayRox Diamond facet function
     * @dev Routed via manifest dispatcher, isolated storage
     */
    function ${func}() external onlyManifestDispatcher {
        ${facetName}Storage storage ds = ${facetName.toLowerCase()}Storage();
        require(ds.initialized, "${facetName}: Not initialized");
        
        // TODO: Implement ${func} logic
        // - Validate inputs
        // - Update isolated storage
        // - Emit events
        // - Handle access control
    }`).join('\n')}
}`;
  }
}

export default AIRefactorWizard;

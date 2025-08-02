import {
  FacetDefinition,
  FacetSuggestion,
  FunctionInfo,
  ParsedContract,
  RefactorPlan,
  SecurityLevel,
  StorageSlot,
} from '../types/index';
import { FacetSimulator } from './FacetSimulator';
import { SolidityAnalyzer } from './SolidityAnalyzer';
import { StorageLayoutChecker } from './StorageLayoutChecker';

// PayRox Go Beyond protocol limits - keeping local copy for backend isolation
const EIP_170_BYTECODE_LIMIT = 24576; // 24 KB EIP-170 limit
const PAYROX_SAFE_FACET_SIZE = 22000; // 22 KB safe limit with buffer
const MAX_FUNCTIONS_PER_FACET = 20; // Max functions per facet
const MAX_FACETS_PER_MANIFEST = 32; // Max facets per manifest

// Enhanced types for production-ready refactoring
interface CallGraphNode {
  functionName: string;
  selector: string;
  dependencies: string[];
  dependents: string[];
  complexity: number;
  gasEstimate: number;
  securityLevel: SecurityLevel;
}

interface CallGraph {
  nodes: Map<string, CallGraphNode>;
  edges: Array<{
    from: string;
    to: string;
    type: 'call' | 'modifier' | 'storage';
  }>;
  cycles: string[][];
  criticalPaths: string[][];
}

interface FacetDomain {
  name: string;
  category: 'admin' | 'governance' | 'view' | 'utility' | 'core' | 'storage';
  functions: FunctionInfo[];
  callGraph: CallGraphNode[];
  estimatedSize: number;
  securityRating: SecurityLevel;
  storageRequirements: StorageSlot[];
  gasOptimization: 'Low' | 'Medium' | 'High';
}

interface PayRoxCompatibilityReport {
  isCompatible: boolean;
  facetSizeValidation: {
    passed: boolean;
    violations: Array<{ facetName: string; size: number; limit: number }>;
  };
  storageLayoutValidation: {
    passed: boolean;
    conflicts: Array<{ slot: number; variables: string[] }>;
  };
  selectorValidation: {
    passed: boolean;
    collisions: Array<{ selector: string; functions: string[] }>;
  };
  diamondStorageCompatibility: {
    passed: boolean;
    issues: string[];
  };
  upgradePathValidation: {
    passed: boolean;
    blockers: string[];
  };
  gasOptimizationScore: number;
  deploymentStrategy: 'sequential' | 'parallel' | 'mixed';
  estimatedTotalGas: number;
  warnings: string[];
  recommendations: string[];
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
 * Production-ready contract analysis and facet refactoring system with:
 * - Call graph analysis for dependency mapping
 * - EIP-170 bytecode size validation
 * - Diamond storage pattern compatibility
 * - Advanced gas optimization strategies
 * - Comprehensive security assessment
 * - PayRox manifest generation and validation
 *
 * Features:
 * - buildCallGraph() for inter-function dependency analysis
 * - groupFunctionsByDomain() with call graph optimization
 * - EIP-170 compliance validation (24KB bytecode limit)
 * - Diamond storage layout conflict detection
 * - PayRoxCompatibilityReport with comprehensive validation
 * - Production-grade facet size enforcement
 * - Advanced simulation pipeline with security modeling
 */
export class AIRefactorWizard {
  private readonly analyzer: SolidityAnalyzer;
  private readonly simulator: FacetSimulator;
  private readonly storageChecker: StorageLayoutChecker;
  private callGraph: CallGraph | null = null;
  private compatibilityReport: PayRoxCompatibilityReport | null = null;

  // Production constants
  private readonly MAX_FACET_SIZE_BYTES = EIP_170_BYTECODE_LIMIT; // 24KB EIP-170 limit
  private readonly SAFE_FACET_SIZE_BYTES = PAYROX_SAFE_FACET_SIZE; // 22KB safe limit
  private readonly MAX_FUNCTIONS_PER_FACET_LIMIT = MAX_FUNCTIONS_PER_FACET; // 20 functions
  private readonly MAX_FACETS_LIMIT = MAX_FACETS_PER_MANIFEST; // 32 facets

  constructor() {
    this.analyzer = new SolidityAnalyzer();
    this.simulator = new FacetSimulator(this.analyzer);
    this.storageChecker = new StorageLayoutChecker();
  }

  /**
   * Enhanced contract analysis with call graph and EIP-170 validation
   *
   * @param sourceCode - Solidity contract source code
   * @param contractName - Optional contract name for analysis
   * @returns Enhanced RefactorPlan with comprehensive validation
   */
  async analyzeContractForRefactoring(
    sourceCode: string,
    contractName?: string
  ): Promise<RefactorPlan> {
    try {
      console.log('🔍 Starting enhanced PayRox contract analysis...');

      // 1. Parse the contract
      const parsedContract = await this.analyzer.parseContract(
        sourceCode,
        contractName
      );
      console.log(
        `📊 Parsed contract: ${parsedContract.functions.length} functions, ${parsedContract.variables.length} variables`
      );

      // 2. Build call graph for dependency analysis
      this.callGraph = this.buildCallGraph(parsedContract);
      console.log(
        `🔗 Built call graph: ${this.callGraph.nodes.size} nodes, ${this.callGraph.edges.length} edges`
      );

      // 3. Group functions by domain using call graph
      const facetDomains = this.groupFunctionsByDomain(
        parsedContract,
        this.callGraph
      );
      console.log(`🎯 Identified ${facetDomains.length} functional domains`);

      // 4. Generate enhanced facet suggestions
      const facetSuggestions = await this.generateEnhancedFacetSuggestions(
        parsedContract,
        facetDomains
      );
      console.log(`💎 Generated ${facetSuggestions.length} facet suggestions`);

      // 5. Validate EIP-170 compliance
      this.validateEIP170Compliance(facetSuggestions);

      // 6. Generate comprehensive compatibility report
      this.compatibilityReport = await this.generatePayRoxCompatibilityReport(
        parsedContract,
        facetSuggestions
      );

      // 7. Calculate advanced gas optimization
      const gasOptimization = this.calculateAdvancedGasOptimization(
        parsedContract,
        facetSuggestions
      );

      return {
        facets: facetSuggestions,
        sharedComponents: this.identifyAdvancedSharedComponents(parsedContract),
        deploymentStrategy:
          this.determineOptimalDeploymentStrategy(facetSuggestions),
        estimatedGasSavings: gasOptimization,
        warnings: this.generateEnhancedWarnings(
          parsedContract,
          facetSuggestions
        ),
        callGraph: this.callGraph,
        compatibilityReport: this.compatibilityReport,
      };
    } catch (error) {
      console.error('❌ Enhanced refactoring analysis failed:', error);
      throw new Error(
        `Enhanced refactoring analysis failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Build comprehensive call graph for dependency analysis
   * Maps all function dependencies including direct calls, modifier usage, and storage access
   */
  private buildCallGraph(contract: ParsedContract): CallGraph {
    console.log('📈 Building call graph...');

    const nodes = new Map<string, CallGraphNode>();
    const edges: Array<{
      from: string;
      to: string;
      type: 'call' | 'modifier' | 'storage';
    }> = [];

    // Create nodes for all functions
    contract.functions.forEach(func => {
      nodes.set(func.name, {
        functionName: func.name,
        selector: func.selector,
        dependencies: [],
        dependents: [],
        complexity: this.calculateFunctionComplexity(func),
        gasEstimate: func.gasEstimate || this.estimateFunctionGas(func),
        securityLevel: this.assessFunctionSecurity(func),
      });
    });

    // Analyze dependencies
    contract.functions.forEach(func => {
      const node = nodes.get(func.name);
      if (!node) return;

      // Parse function body for dependencies
      if (func.body) {
        // Direct function calls
        const functionCalls = this.extractFunctionCalls(func.body);
        functionCalls.forEach(calledFunc => {
          if (nodes.has(calledFunc)) {
            node.dependencies.push(calledFunc);
            edges.push({ from: func.name, to: calledFunc, type: 'call' });

            const targetNode = nodes.get(calledFunc);
            if (targetNode) {
              targetNode.dependents.push(func.name);
            }
          }
        });

        // Storage access patterns
        const storageAccess = this.extractStorageAccess(
          func.body,
          contract.variables
        );
        storageAccess.forEach(variable => {
          edges.push({ from: func.name, to: variable, type: 'storage' });
        });
      }

      // Modifier dependencies
      func.modifiers.forEach(modifier => {
        edges.push({ from: func.name, to: modifier, type: 'modifier' });
      });
    });

    // Detect cycles and critical paths
    const cycles = this.detectCycles(nodes, edges);
    const criticalPaths = this.findCriticalPaths(nodes, edges);

    console.log(
      `🔄 Detected ${cycles.length} cycles, ${criticalPaths.length} critical paths`
    );

    return {
      nodes,
      edges,
      cycles,
      criticalPaths,
    };
  }

  /**
   * Group functions by domain using call graph analysis
   * Advanced algorithm that considers call patterns, security levels, and gas optimization
   */
  private groupFunctionsByDomain(
    contract: ParsedContract,
    callGraph: CallGraph
  ): FacetDomain[] {
    console.log('🏗️ Grouping functions by domain with call graph analysis...');

    const domains: FacetDomain[] = [];
    const processedFunctions = new Set<string>();

    // 1. Administrative domain (highest security)
    const adminFunctions = contract.functions.filter(func =>
      this.isAdministrativeFunction(func)
    );
    if (adminFunctions.length > 0) {
      domains.push({
        name: 'AdminDomain',
        category: 'admin',
        functions: adminFunctions,
        callGraph: adminFunctions
          .map(f => callGraph.nodes.get(f.name)!)
          .filter(Boolean),
        estimatedSize: this.estimateDomainSize(adminFunctions),
        securityRating: 'critical',
        storageRequirements: this.extractStorageRequirements(
          adminFunctions,
          contract.variables
        ),
        gasOptimization: 'High',
      });
      adminFunctions.forEach(f => processedFunctions.add(f.name));
    }

    // 2. View domain (gas optimization focus)
    const viewFunctions = contract.functions.filter(
      func =>
        (func.stateMutability === 'view' || func.stateMutability === 'pure') &&
        !processedFunctions.has(func.name)
    );
    if (viewFunctions.length > 0) {
      domains.push({
        name: 'ViewDomain',
        category: 'view',
        functions: viewFunctions,
        callGraph: viewFunctions
          .map(f => callGraph.nodes.get(f.name)!)
          .filter(Boolean),
        estimatedSize: this.estimateDomainSize(viewFunctions),
        securityRating: 'low',
        storageRequirements: [],
        gasOptimization: 'High',
      });
      viewFunctions.forEach(f => processedFunctions.add(f.name));
    }

    // 3. Core business logic domains (clustered by call graph)
    const remainingFunctions = contract.functions.filter(
      func => !processedFunctions.has(func.name)
    );
    const coreDomains = this.clusterFunctionsByCallGraph(
      remainingFunctions,
      callGraph
    );
    domains.push(...coreDomains);

    console.log(`✅ Created ${domains.length} functional domains`);
    return domains;
  }

  /**
   * Validate EIP-170 bytecode size compliance
   * Ensures all facets stay within 24KB deployment limit
   */
  private validateEIP170Compliance(facetSuggestions: FacetSuggestion[]): void {
    console.log('📏 Validating EIP-170 compliance...');

    const violations: Array<{
      facetName: string;
      size: number;
      limit: number;
    }> = [];

    facetSuggestions.forEach(facet => {
      if (facet.estimatedSize > this.MAX_FACET_SIZE_BYTES) {
        violations.push({
          facetName: facet.name,
          size: facet.estimatedSize,
          limit: this.MAX_FACET_SIZE_BYTES,
        });

        console.warn(
          `⚠️ EIP-170 violation: ${facet.name} (${facet.estimatedSize} bytes > ${this.MAX_FACET_SIZE_BYTES})`
        );
      }
    });

    if (violations.length > 0) {
      throw new Error(
        `EIP-170 compliance failed: ${violations.length} facets exceed 24KB limit`
      );
    }

    console.log('✅ All facets comply with EIP-170 bytecode limit');
  }

  /**
   * Generate comprehensive PayRox compatibility report
   * Validates all aspects of PayRox Go Beyond deployment requirements
   */
  private async generatePayRoxCompatibilityReport(
    contract: ParsedContract,
    facetSuggestions: FacetSuggestion[]
  ): Promise<PayRoxCompatibilityReport> {
    console.log('📋 Generating PayRox compatibility report...');

    // Facet size validation
    const facetSizeValidation = {
      passed: true,
      violations: [] as Array<{
        facetName: string;
        size: number;
        limit: number;
      }>,
    };

    facetSuggestions.forEach(facet => {
      if (facet.estimatedSize > this.SAFE_FACET_SIZE_BYTES) {
        facetSizeValidation.passed = false;
        facetSizeValidation.violations.push({
          facetName: facet.name,
          size: facet.estimatedSize,
          limit: this.SAFE_FACET_SIZE_BYTES,
        });
      }
    });

    // Storage layout validation
    const storageLayoutValidation = await this.validateStorageLayout(
      contract,
      facetSuggestions
    );

    // Selector collision validation
    const selectorValidation = this.validateSelectors(facetSuggestions);

    // Diamond storage compatibility
    const diamondStorageCompatibility =
      this.validateDiamondStorageCompatibility(contract);

    // Upgrade path validation
    const upgradePathValidation = this.validateUpgradePath(facetSuggestions);

    // Gas optimization score
    const gasOptimizationScore = this.calculateGasOptimizationScore(
      contract,
      facetSuggestions
    );

    // Deployment strategy
    const deploymentStrategy =
      this.determineOptimalDeploymentStrategy(facetSuggestions);

    // Total gas estimation
    const estimatedTotalGas =
      this.calculateTotalDeploymentGas(facetSuggestions);

    // Generate warnings and recommendations
    const warnings = this.generateCompatibilityWarnings(
      contract,
      facetSuggestions
    );
    const recommendations = this.generateCompatibilityRecommendations(
      contract,
      facetSuggestions
    );

    const isCompatible =
      facetSizeValidation.passed &&
      storageLayoutValidation.passed &&
      selectorValidation.passed &&
      diamondStorageCompatibility.passed &&
      upgradePathValidation.passed;

    return {
      isCompatible,
      facetSizeValidation,
      storageLayoutValidation,
      selectorValidation,
      diamondStorageCompatibility,
      upgradePathValidation,
      gasOptimizationScore,
      deploymentStrategy,
      estimatedTotalGas,
      warnings,
      recommendations,
    };
  }

  // Helper methods for enhanced analysis

  /**
   * Calculate function complexity score
   */
  private calculateFunctionComplexity(func: FunctionInfo): number {
    let complexity = 1; // Base complexity

    // Parameter complexity
    complexity += func.parameters.length * 0.5;

    // Modifier complexity
    complexity += func.modifiers.length;

    // Body complexity (if available)
    if (func.body) {
      // Count control structures
      const controlStructures = (
        func.body.match(/\b(if|for|while|do|try|catch)\b/g) || []
      ).length;
      complexity += controlStructures * 2;

      // Count nested braces (approximation)
      const braceDepth = this.calculateBraceDepth(func.body);
      complexity += braceDepth;
    }

    return Math.max(1, Math.round(complexity));
  }

  /**
   * Calculate maximum brace depth in code
   */
  private calculateBraceDepth(code: string): number {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of code) {
      if (char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    return maxDepth;
  }

  /**
   * Assess function security level
   */
  private assessFunctionSecurity(func: FunctionInfo): SecurityLevel {
    // Critical: admin/owner functions
    if (this.isAdministrativeFunction(func)) {
      return 'critical';
    }

    // High: payable or state-changing functions
    if (
      func.stateMutability === 'payable' ||
      func.stateMutability === 'nonpayable'
    ) {
      return 'high';
    }

    // Medium: functions with access control
    if (
      func.modifiers.some(
        mod =>
          mod.toLowerCase().includes('only') ||
          mod.toLowerCase().includes('require')
      )
    ) {
      return 'medium';
    }

    // Low: view/pure functions
    return 'low';
  }

  /**
   * Map internal security level to FacetSuggestion format
   */
  private mapSecurityLevel(level: SecurityLevel): SecurityLevel {
    return level; // Direct mapping since types match
  }

  /**
   * Extract function calls from function body
   */
  private extractFunctionCalls(body: string): string[] {
    const calls: string[] = [];

    // Simple pattern matching for function calls
    // In production, would use proper AST parsing
    const functionCallPattern = /(\w+)\s*\(/g;
    let match;

    while ((match = functionCallPattern.exec(body)) !== null) {
      const funcName = match[1];
      // Filter out common keywords and built-ins
      if (!this.isBuiltinFunction(funcName)) {
        calls.push(funcName);
      }
    }

    return Array.from(new Set(calls)); // Remove duplicates
  }

  /**
   * Check if function name is a builtin
   */
  private isBuiltinFunction(funcName: string): boolean {
    const builtins = [
      'require',
      'assert',
      'revert',
      'if',
      'for',
      'while',
      'do',
      'try',
      'catch',
      'emit',
      'return',
      'new',
      'delete',
      'push',
      'pop',
      'length',
      'call',
      'delegatecall',
    ];
    return builtins.includes(funcName);
  }

  /**
   * Extract storage access patterns
   */
  private extractStorageAccess(body: string, variables: any[]): string[] {
    const storageAccess: string[] = [];

    // Look for variable names in the function body
    variables.forEach(variable => {
      if (body.includes(variable.name)) {
        storageAccess.push(variable.name);
      }
    });

    return storageAccess;
  }

  /**
   * Detect cycles in call graph
   */
  private detectCycles(
    nodes: Map<string, CallGraphNode>,
    edges: Array<{ from: string; to: string; type: string }>
  ): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      if (recursionStack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        if (cycleStart >= 0) {
          cycles.push(path.slice(cycleStart));
        }
        return;
      }

      if (visited.has(node)) {
        return;
      }

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      // Follow edges from this node
      edges
        .filter(edge => edge.from === node && edge.type === 'call')
        .forEach(edge => {
          if (nodes.has(edge.to)) {
            dfs(edge.to, [...path]);
          }
        });

      recursionStack.delete(node);
    };

    // Start DFS from each unvisited node
    nodes.forEach((_, nodeName) => {
      if (!visited.has(nodeName)) {
        dfs(nodeName, []);
      }
    });

    return cycles;
  }

  /**
   * Find critical paths (longest dependency chains)
   */
  private findCriticalPaths(
    nodes: Map<string, CallGraphNode>,
    edges: Array<{ from: string; to: string; type: string }>
  ): string[][] {
    const paths: string[][] = [];

    // Find root nodes (no incoming edges)
    const hasIncoming = new Set<string>();
    edges.forEach(edge => {
      if (edge.type === 'call') {
        hasIncoming.add(edge.to);
      }
    });

    const rootNodes = Array.from(nodes.keys()).filter(
      node => !hasIncoming.has(node)
    );

    // DFS to find longest paths from each root
    const findLongestPath = (node: string, visited: Set<string>): string[] => {
      if (visited.has(node)) {
        return []; // Avoid cycles
      }

      visited.add(node);

      const outgoingEdges = edges.filter(
        edge => edge.from === node && edge.type === 'call'
      );

      if (outgoingEdges.length === 0) {
        visited.delete(node);
        return [node]; // Leaf node
      }

      let longestPath = [node];

      outgoingEdges.forEach(edge => {
        if (nodes.has(edge.to)) {
          const subPath = findLongestPath(edge.to, new Set(visited));
          if (subPath.length > longestPath.length - 1) {
            longestPath = [node, ...subPath];
          }
        }
      });

      visited.delete(node);
      return longestPath;
    };

    rootNodes.forEach(root => {
      const path = findLongestPath(root, new Set());
      if (path.length > 2) {
        // Only include non-trivial paths
        paths.push(path);
      }
    });

    // Sort and return top 10 longest paths
    const sortedPaths = [...paths];
    sortedPaths.sort((a, b) => b.length - a.length);
    return sortedPaths.slice(0, 10);
  }

  /**
   * Estimate domain size in bytes
   */
  private estimateDomainSize(functions: FunctionInfo[]): number {
    const baseSize = 1000; // Contract overhead
    const functionSize = functions.reduce(
      (total, func) => total + this.estimateFunctionGas(func),
      0
    );

    // Convert gas to approximate bytecode size (rough estimation)
    return baseSize + Math.floor(functionSize / 10);
  }

  /**
   * Extract storage requirements for functions
   */
  private extractStorageRequirements(
    functions: FunctionInfo[],
    variables: any[]
  ): StorageSlot[] {
    const requirements: StorageSlot[] = [];

    functions.forEach(func => {
      if (func.body) {
        variables.forEach(variable => {
          if (func.body!.includes(variable.name)) {
            requirements.push({
              slot: variable.slot || 0,
              offset: variable.offset || 0,
              size: variable.size || 32,
              type: variable.type,
              variable: variable.name,
              contract: 'main',
            });
          }
        });
      }
    });

    return Array.from(
      new Map(requirements.map(req => [req.variable, req])).values()
    );
  }

  /**
   * Cluster functions by call graph patterns
   */
  private clusterFunctionsByCallGraph(
    functions: FunctionInfo[],
    callGraph: CallGraph
  ): FacetDomain[] {
    const domains: FacetDomain[] = [];
    const processedFunctions = new Set<string>();

    // Simple clustering: group functions that call each other
    functions.forEach(func => {
      if (processedFunctions.has(func.name)) return;

      const cluster = this.findConnectedFunctions(
        func.name,
        functions,
        callGraph,
        this.MAX_FUNCTIONS_PER_FACET_LIMIT
      );

      if (cluster.length > 0) {
        domains.push({
          name: `CoreDomain${domains.length + 1}`,
          category: 'core',
          functions: cluster,
          callGraph: cluster
            .map(f => callGraph.nodes.get(f.name))
            .filter(Boolean) as CallGraphNode[],
          estimatedSize: this.estimateDomainSize(cluster),
          securityRating: this.getDomainSecurityRating(cluster),
          storageRequirements: [],
          gasOptimization: 'Medium',
        });

        cluster.forEach(f => processedFunctions.add(f.name));
      }
    });

    return domains;
  }

  /**
   * Find connected functions in call graph
   */
  private findConnectedFunctions(
    startFunction: string,
    allFunctions: FunctionInfo[],
    callGraph: CallGraph,
    maxSize: number
  ): FunctionInfo[] {
    const connected: FunctionInfo[] = [];
    const visited = new Set<string>();
    const queue = [startFunction];

    while (queue.length > 0 && connected.length < maxSize) {
      const current = queue.shift();
      if (!current || visited.has(current)) continue;

      visited.add(current);
      const func = allFunctions.find(f => f.name === current);
      if (func) {
        connected.push(func);

        // Add connected functions to queue
        const node = callGraph.nodes.get(current);
        if (node) {
          node.dependencies.forEach(dep => {
            if (!visited.has(dep) && !queue.includes(dep)) {
              queue.push(dep);
            }
          });
          node.dependents.forEach(dep => {
            if (!visited.has(dep) && !queue.includes(dep)) {
              queue.push(dep);
            }
          });
        }
      }
    }

    return connected;
  }

  /**
   * Get domain security rating based on constituent functions
   */
  private getDomainSecurityRating(functions: FunctionInfo[]): SecurityLevel {
    const ratings = functions.map(func => this.assessFunctionSecurity(func));

    if (ratings.includes('critical')) return 'critical';
    if (ratings.includes('high')) return 'high';
    if (ratings.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * Generate enhanced facet suggestions with advanced analysis
   */
  private async generateEnhancedFacetSuggestions(
    contract: ParsedContract,
    domains: FacetDomain[]
  ): Promise<FacetSuggestion[]> {
    const suggestions: FacetSuggestion[] = [];

    for (const domain of domains) {
      // Split large domains into multiple facets if needed
      const facets = this.splitDomainIntoFacets(domain);

      facets.forEach((facet, index) => {
        const facetName =
          facets.length > 1
            ? `${domain.name}${index + 1}`
            : domain.name.replace('Domain', 'Facet');

        suggestions.push({
          name: facetName,
          description: this.generateFacetDescription(domain, facet, index),
          functions: facet.functions.map(f => f.name),
          estimatedSize: facet.estimatedSize,
          gasOptimization: domain.gasOptimization,
          securityRating: this.mapSecurityLevel(domain.securityRating),
          dependencies: this.calculateFacetDependencies(
            facet.functions,
            suggestions
          ),
          reasoning: this.generateFacetReasoning(domain, facet),
        });
      });
    }

    return suggestions;
  }

  /**
   * Split large domain into multiple facets
   */
  private splitDomainIntoFacets(
    domain: FacetDomain
  ): Array<{ functions: FunctionInfo[]; estimatedSize: number }> {
    const facets: Array<{ functions: FunctionInfo[]; estimatedSize: number }> =
      [];
    const functions = [...domain.functions];

    while (functions.length > 0) {
      const currentFacet: FunctionInfo[] = [];
      let currentSize = 1000; // Base facet overhead

      // Fill facet up to limits
      while (
        functions.length > 0 &&
        currentFacet.length < this.MAX_FUNCTIONS_PER_FACET_LIMIT &&
        currentSize < this.SAFE_FACET_SIZE_BYTES
      ) {
        const func = functions.shift()!;
        const funcSize = this.estimateFunctionGas(func) / 10; // Convert gas to approx bytes

        if (currentSize + funcSize <= this.SAFE_FACET_SIZE_BYTES) {
          currentFacet.push(func);
          currentSize += funcSize;
        } else {
          // Function too large, put back and break
          functions.unshift(func);
          break;
        }
      }

      if (currentFacet.length > 0) {
        facets.push({
          functions: currentFacet,
          estimatedSize: currentSize,
        });
      }
    }

    return facets;
  }

  /**
   * Generate facet description
   */
  private generateFacetDescription(
    domain: FacetDomain,
    facet: { functions: FunctionInfo[] },
    index: number
  ): string {
    const baseDescription = this.getDomainDescription(domain.category);
    const partSuffix = index > 0 ? ` (Part ${index + 1})` : '';
    return `${baseDescription}${partSuffix} - ${facet.functions.length} functions`;
  }

  /**
   * Get description for domain category
   */
  private getDomainDescription(category: string): string {
    const descriptions = {
      admin: 'Administrative and ownership functions for secure access control',
      governance:
        'Governance and voting mechanisms for decentralized decision making',
      view: 'Read-only functions optimized for gas-efficient queries',
      utility: 'Utility functions for common operations and helpers',
      core: 'Core business logic and primary contract functionality',
      storage: 'Storage-intensive operations for data management',
    };
    return (
      descriptions[category as keyof typeof descriptions] ||
      'General contract functionality'
    );
  }

  /**
   * Calculate facet dependencies
   */
  private calculateFacetDependencies(
    functions: FunctionInfo[],
    existingSuggestions: FacetSuggestion[]
  ): string[] {
    const dependencies = new Set<string>();

    // Check if any function requires admin access
    const requiresAdmin = functions.some(func =>
      this.isAdministrativeFunction(func)
    );
    if (requiresAdmin) {
      dependencies.add('AdminFacet');
    }

    // Add dependencies based on function calls (simplified)
    functions.forEach(func => {
      if (func.body) {
        existingSuggestions.forEach(suggestion => {
          if (
            suggestion.functions.some(suggestionFunc =>
              func.body!.includes(suggestionFunc)
            )
          ) {
            dependencies.add(suggestion.name);
          }
        });
      }
    });

    return Array.from(dependencies);
  }

  /**
   * Generate facet reasoning
   */
  private generateFacetReasoning(
    domain: FacetDomain,
    facet: { functions: FunctionInfo[]; estimatedSize?: number }
  ): string {
    const reasoningTemplates = {
      admin:
        'Isolated administrative functions for enhanced security, emergency controls, and governance. Critical for PayRox system integrity.',
      governance:
        'Governance functions separated for transparent decision making and upgrade management.',
      view: 'Grouped view functions reduce gas costs for read operations and enable efficient caching strategies.',
      utility:
        'Utility functions grouped for reusability and efficient gas usage across the system.',
      core: 'Core business logic separated for modularity, maintainability, and efficient PayRox routing.',
      storage:
        'Storage operations isolated to prevent conflicts and enable specialized optimization for data-heavy functions.',
    };

    const baseReasoning =
      reasoningTemplates[domain.category as keyof typeof reasoningTemplates] ||
      'Functions grouped for optimal modularity and gas efficiency.';

    const estimatedSize =
      facet.estimatedSize || this.estimateDomainSize(facet.functions);
    const sizeNote =
      estimatedSize > this.SAFE_FACET_SIZE_BYTES * 0.8
        ? ' Size optimized to stay within EIP-170 limits.'
        : '';

    return baseReasoning + sizeNote;
  }

  /**
   * Calculate advanced gas optimization
   */
  private calculateAdvancedGasOptimization(
    contract: ParsedContract,
    facetSuggestions: FacetSuggestion[]
  ): number {
    // Original contract gas estimate
    const originalGas = this.estimateContractGas(contract);

    // Faceted contract gas estimate
    const facetedGas = this.estimateFacetedContractGas(facetSuggestions);

    // PayRox-specific optimizations
    const create2Savings = facetSuggestions.length * 5000; // CREATE2 efficiency
    const routingOverhead = contract.functions.length * 300; // Manifest routing cost
    const isolationBenefits = facetSuggestions.length * 2000; // Storage isolation

    const totalSavings = Math.max(
      0,
      originalGas -
        facetedGas +
        create2Savings +
        isolationBenefits -
        routingOverhead
    );
    return totalSavings;
  }

  /**
   * Estimate original contract gas usage
   */
  private estimateContractGas(contract: ParsedContract): number {
    const baseGas = 50000; // Contract deployment overhead
    const functionGas = contract.functions.reduce(
      (total, func) => total + this.estimateFunctionGas(func),
      0
    );
    const storageGas = contract.variables.length * 20000; // Storage variable costs

    return baseGas + functionGas + storageGas;
  }

  /**
   * Estimate faceted contract gas usage
   */
  private estimateFacetedContractGas(
    facetSuggestions: FacetSuggestion[]
  ): number {
    const facetOverhead = facetSuggestions.length * 30000; // Per-facet deployment cost
    const totalFacetGas = facetSuggestions.reduce(
      (total, facet) => total + facet.estimatedSize,
      0
    );
    const dispatcherGas = 25000; // Dispatcher contract

    return facetOverhead + totalFacetGas + dispatcherGas;
  }

  /**
   * Identify advanced shared components
   */
  private identifyAdvancedSharedComponents(contract: ParsedContract): string[] {
    const components: string[] = [];

    // Storage layout coordination
    if (contract.variables.length > 0) {
      components.push('Diamond storage layout coordination');
      components.push('Storage collision prevention system');
      components.push('EXTCODEHASH verification framework');
    }

    // Event definitions spanning facets
    if (contract.events.length > 0) {
      components.push('Cross-facet event coordination');
      components.push('Event signature management');
    }

    // Access control system
    const modifierCount = contract.functions.reduce(
      (count, func) => count + func.modifiers.length,
      0
    );
    if (modifierCount > 0) {
      components.push('Unified access control system');
      components.push('Role-based permission management');
    }

    // PayRox-specific infrastructure
    components.push('PayRox manifest coordination system');
    components.push('CREATE2 deterministic deployment framework');
    components.push('ManifestDispatcher integration layer');
    components.push('Emergency pause and upgrade mechanisms');
    components.push('Gas optimization coordination');

    return components;
  }

  /**
   * Determine optimal deployment strategy
   */
  private determineOptimalDeploymentStrategy(
    facets: FacetSuggestion[]
  ): 'sequential' | 'parallel' | 'mixed' {
    const criticalFacets = facets.filter(f => f.securityRating === 'critical');
    const totalFacets = facets.length;
    const largeFacets = facets.filter(
      f => f.estimatedSize > this.SAFE_FACET_SIZE_BYTES * 0.7
    );

    // Sequential for security-critical deployments
    if (
      criticalFacets.length > totalFacets / 2 ||
      largeFacets.length > totalFacets / 2
    ) {
      return 'sequential';
    }

    // Parallel for simple, low-risk deployments
    if (
      totalFacets <= 3 &&
      criticalFacets.length <= 1 &&
      largeFacets.length === 0
    ) {
      return 'parallel';
    }

    // Mixed strategy for complex deployments
    return 'mixed';
  }

  /**
   * Generate enhanced warnings
   */
  private generateEnhancedWarnings(
    contract: ParsedContract,
    facets: FacetSuggestion[]
  ): string[] {
    const warnings: string[] = [];

    // Complexity warnings
    if (facets.length > 8) {
      warnings.push(
        '⚠️ Large number of facets may increase deployment complexity and gas costs'
      );
    }

    if (contract.variables.length > 20) {
      warnings.push(
        '⚠️ Complex storage layout requires careful Diamond storage pattern implementation'
      );
    }

    // Security warnings
    const criticalFacets = facets.filter(f => f.securityRating === 'critical');
    if (criticalFacets.length > 2) {
      warnings.push(
        '⚠️ Multiple critical facets detected - consider consolidating admin functions'
      );
    }

    // Size warnings
    const largeFacets = facets.filter(
      f => f.estimatedSize > this.SAFE_FACET_SIZE_BYTES
    );
    if (largeFacets.length > 0) {
      warnings.push(
        `⚠️ ${largeFacets.length} facets exceed safe size limit - risk of EIP-170 violations`
      );
    }

    // Dependency warnings
    const complexDependencies = facets.filter(f => f.dependencies.length > 2);
    if (complexDependencies.length > 0) {
      warnings.push(
        '⚠️ Complex inter-facet dependencies may affect PayRox routing efficiency'
      );
    }

    // Call graph warnings
    if (this.callGraph && this.callGraph.cycles.length > 0) {
      warnings.push(
        `⚠️ ${this.callGraph.cycles.length} circular dependencies detected - may cause routing issues`
      );
    }

    return warnings;
  }

  /**
   * Validate storage layout for conflicts
   */
  private async validateStorageLayout(
    contract: ParsedContract,
    _facets: FacetSuggestion[]
  ): Promise<{
    passed: boolean;
    conflicts: Array<{ slot: number; variables: string[] }>;
  }> {
    const conflicts: Array<{ slot: number; variables: string[] }> = [];

    // Use storage checker if available and has validateLayout method
    if (this.storageChecker && 'validateLayout' in this.storageChecker) {
      try {
        const validation = await (this.storageChecker as any).validateLayout(
          contract.storageLayout || []
        );
        return {
          passed: validation.isValid,
          conflicts:
            validation.conflicts?.map((conflict: any) => ({
              slot: conflict.slot,
              variables: conflict.variables,
            })) || [],
        };
      } catch (error) {
        console.warn('Storage layout validation failed:', error);
      }
    }

    // Fallback: simple slot conflict detection
    const slotMap = new Map<number, string[]>();

    contract.variables.forEach(variable => {
      const slot = variable.slot;
      if (!slotMap.has(slot)) {
        slotMap.set(slot, []);
      }
      const slotArray = slotMap.get(slot);
      if (slotArray) {
        slotArray.push(variable.name);
      }
    });

    slotMap.forEach((variables, slot) => {
      if (variables.length > 1) {
        conflicts.push({ slot, variables });
      }
    });

    return {
      passed: conflicts.length === 0,
      conflicts,
    };
  }

  /**
   * Validate function selectors for collisions
   */
  private validateSelectors(facets: FacetSuggestion[]): {
    passed: boolean;
    collisions: Array<{ selector: string; functions: string[] }>;
  } {
    const selectorMap = new Map<string, string[]>();
    const collisions: Array<{ selector: string; functions: string[] }> = [];

    facets.forEach(facet => {
      facet.functions.forEach(funcName => {
        // Generate selector (simplified - in production use proper keccak256)
        const selector = this.generateFunctionSelector(funcName);

        if (!selectorMap.has(selector)) {
          selectorMap.set(selector, []);
        }
        const selectorArray = selectorMap.get(selector);
        if (selectorArray) {
          selectorArray.push(funcName);
        }
      });
    });

    selectorMap.forEach((functions, selector) => {
      if (functions.length > 1) {
        collisions.push({ selector, functions });
      }
    });

    return {
      passed: collisions.length === 0,
      collisions,
    };
  }

  /**
   * Generate function selector
   */
  private generateFunctionSelector(funcName: string): string {
    // Simplified selector generation
    const hash = funcName
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `0x${hash.toString(16).padStart(8, '0').slice(-8)}`;
  }

  /**
   * Validate Diamond storage compatibility
   */
  private validateDiamondStorageCompatibility(contract: ParsedContract): {
    passed: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check for storage layout patterns that conflict with Diamond storage
    if (contract.variables.some(v => v.name.includes('__gap'))) {
      issues.push(
        'Contract uses storage gaps which may conflict with Diamond storage'
      );
    }

    if (contract.variables.some(v => v.slot === 0)) {
      issues.push('Contract uses slot 0 which is reserved for Diamond storage');
    }

    // Check for inheritance patterns
    if (contract.inheritance.length > 0) {
      issues.push(
        'Complex inheritance may require careful storage slot management'
      );
    }

    return {
      passed: issues.length === 0,
      issues,
    };
  }

  /**
   * Validate upgrade path
   */
  private validateUpgradePath(facets: FacetSuggestion[]): {
    passed: boolean;
    blockers: string[];
  } {
    const blockers: string[] = [];

    // Check for upgrade blockers
    const largeFacets = facets.filter(
      f => f.estimatedSize > this.SAFE_FACET_SIZE_BYTES * 0.9
    );
    if (largeFacets.length > 0) {
      blockers.push(
        `${largeFacets.length} facets near size limit may block future upgrades`
      );
    }

    const complexDependencies = facets.filter(f => f.dependencies.length > 3);
    if (complexDependencies.length > 0) {
      blockers.push('Complex dependencies may complicate upgrade sequences');
    }

    return {
      passed: blockers.length === 0,
      blockers,
    };
  }

  /**
   * Calculate gas optimization score (0-100)
   */
  private calculateGasOptimizationScore(
    contract: ParsedContract,
    facets: FacetSuggestion[]
  ): number {
    const factors = {
      facetCount: Math.min(facets.length / 5, 1) * 20, // Optimal around 5 facets
      sizeOptimization: this.calculateSizeOptimizationScore(facets) * 25,
      securitySeparation: this.calculateSecuritySeparationScore(facets) * 25,
      dependencyOptimization:
        this.calculateDependencyOptimizationScore(facets) * 30,
    };

    return Math.round(
      Object.values(factors).reduce((sum, score) => sum + score, 0)
    );
  }

  /**
   * Calculate size optimization score
   */
  private calculateSizeOptimizationScore(facets: FacetSuggestion[]): number {
    const oversizedFacets = facets.filter(
      f => f.estimatedSize > this.SAFE_FACET_SIZE_BYTES
    ).length;
    const totalFacets = facets.length;

    return Math.max(0, 1 - oversizedFacets / totalFacets);
  }

  /**
   * Calculate security separation score
   */
  private calculateSecuritySeparationScore(facets: FacetSuggestion[]): number {
    const criticalFacets = facets.filter(f => f.securityRating === 'critical');
    const hasProperSeparation =
      criticalFacets.length <= 2 && criticalFacets.length > 0;

    return hasProperSeparation ? 1 : 0.5;
  }

  /**
   * Calculate dependency optimization score
   */
  private calculateDependencyOptimizationScore(
    facets: FacetSuggestion[]
  ): number {
    const avgDependencies =
      facets.reduce((sum, f) => sum + f.dependencies.length, 0) / facets.length;
    const optimalDependencies = 1.5; // Target average

    return Math.max(
      0,
      1 - Math.abs(avgDependencies - optimalDependencies) / optimalDependencies
    );
  }

  /**
   * Calculate total deployment gas
   */
  private calculateTotalDeploymentGas(facets: FacetSuggestion[]): number {
    const baseGas = 100000; // Base deployment infrastructure
    const facetGas = facets.reduce(
      (total, facet) => total + facet.estimatedSize * 10,
      0
    ); // Convert size to gas
    const routingGas = facets.length * 30000; // Route setup gas

    return baseGas + facetGas + routingGas;
  }

  /**
   * Generate compatibility warnings
   */
  private generateCompatibilityWarnings(
    contract: ParsedContract,
    facets: FacetSuggestion[]
  ): string[] {
    const warnings: string[] = [];

    if (facets.length > this.MAX_FACETS_LIMIT) {
      warnings.push(
        `Facet count (${facets.length}) exceeds recommended limit (${this.MAX_FACETS_LIMIT})`
      );
    }

    const totalSize = facets.reduce((sum, f) => sum + f.estimatedSize, 0);
    if (totalSize > 500000) {
      warnings.push(
        'Total deployment size is very large - consider further optimization'
      );
    }

    if (contract.variables.length > 50) {
      warnings.push(
        'Large number of state variables may require Diamond storage patterns'
      );
    }

    return warnings;
  }

  /**
   * Generate compatibility recommendations
   */
  private generateCompatibilityRecommendations(
    contract: ParsedContract,
    facets: FacetSuggestion[]
  ): string[] {
    const recommendations: string[] = [];

    const largeFacets = facets.filter(
      f => f.estimatedSize > this.SAFE_FACET_SIZE_BYTES * 0.8
    );
    if (largeFacets.length > 0) {
      recommendations.push(
        'Consider splitting large facets to maintain upgrade flexibility'
      );
    }

    const criticalFacets = facets.filter(f => f.securityRating === 'critical');
    if (criticalFacets.length > 1) {
      recommendations.push(
        'Consolidate admin functions into a single AdminFacet for better security'
      );
    }

    if (this.callGraph && this.callGraph.cycles.length > 0) {
      recommendations.push(
        'Refactor circular dependencies to improve facet modularity'
      );
    }

    recommendations.push(
      'Implement comprehensive testing for all facet interactions'
    );
    recommendations.push('Use timelock for critical facet upgrades');
    recommendations.push('Monitor gas usage patterns post-deployment');

    return recommendations;
  }

  // Legacy methods maintained for backward compatibility

  /**
   * Legacy method: Generate facet suggestions (simplified version)
   * @deprecated Use generateEnhancedFacetSuggestions instead
   */
  private async generateFacetSuggestions(
    contract: ParsedContract
  ): Promise<FacetSuggestion[]> {
    // Build basic call graph and domains
    this.callGraph = this.buildCallGraph(contract);
    const domains = this.groupFunctionsByDomain(contract, this.callGraph);

    // Generate enhanced suggestions
    return this.generateEnhancedFacetSuggestions(contract, domains);
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
    if (functions.length <= this.MAX_FUNCTIONS_PER_FACET_LIMIT) {
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
        if (currentGroup.length >= this.MAX_FUNCTIONS_PER_FACET_LIMIT) {
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
        currentGroup.length < this.MAX_FUNCTIONS_PER_FACET_LIMIT &&
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
   * Generate function stubs for a facet
   */
  private generateFacetFunctions(suggestion: FacetSuggestion): string {
    let functions = '';

    suggestion.functions.forEach(funcName => {
      const isAdminFunction = suggestion.securityRating === 'critical';
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
}

export default AIRefactorWizard;

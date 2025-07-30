import { SolidityAnalyzer } from '../analyzers/SolidityAnalyzer';
import { AIService, AIAnalysisRequest } from './AIService';
import {
  ParsedContract,
  FunctionInfo,
  FacetSuggestion,
  RefactorPlan,
  FacetDefinition,
  RefactorResult
} from '../types/index';

export interface RefactorPreferences {
  facetSize?: 'small' | 'medium' | 'large';
  groupingStrategy?: 'functional' | 'access' | 'state' | 'mixed';
  optimization?: 'gas' | 'readability' | 'security';
  preservePatterns?: string[];
  maxFacetSize?: number;
  minFacetSize?: number;
}

export class ContractRefactorWizard {
  constructor(
    private analyzer: SolidityAnalyzer,
    private aiService: AIService
  ) {}

  /**
   * Generate intelligent refactoring suggestions for contract modularization
   */
  async generateRefactorSuggestions(
    sourceCode: string,
    contractName?: string,
    preferences: RefactorPreferences = {}
  ): Promise<FacetSuggestion[]> {
    try {
      // Parse the contract first
      const parsed = await this.analyzer.parseContract(sourceCode, contractName);
      
      // Analyze contract structure
      const structuralAnalysis = this.analyzeContractStructure(parsed);
      
      // Get AI-powered suggestions if available
      let aiSuggestions: string[] = [];
      if (this.aiService.isAIAvailable()) {
        const aiRequest: AIAnalysisRequest = {
          sourceCode,
          analysisType: 'refactor',
          context: 'Generate facet suggestions for PayRox Go Beyond deployment',
          preferences: {
            facetSize: preferences.facetSize,
            optimization: preferences.optimization
          }
        };
        
        const aiResponse = await this.aiService.analyzeContract(aiRequest);
        aiSuggestions = aiResponse.suggestions;
      }

      // Generate facet suggestions based on analysis
      const facetSuggestions = this.generateFacetSuggestions(
        parsed,
        structuralAnalysis,
        preferences,
        aiSuggestions
      );

      return facetSuggestions;
    } catch (error) {
      console.error('Refactor suggestions error:', error);
      throw new Error(`Failed to generate refactor suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply refactoring plan to generate actual facet contracts
   */
  async applyRefactoring(
    sourceCode: string,
    contractName: string,
    facetPlan: RefactorPlan
  ): Promise<RefactorResult> {
    try {
      const parsed = await this.analyzer.parseContract(sourceCode, contractName);
      const facets: FacetDefinition[] = [];
      const warnings: string[] = [];

      // Generate each facet based on the plan
      for (const suggestion of facetPlan.facets) {
        try {
          const facet = await this.generateFacetCode(
            parsed,
            suggestion,
            facetPlan.sharedComponents
          );
          facets.push(facet);
        } catch (error) {
          warnings.push(`Failed to generate facet '${suggestion.name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Generate shared components (interfaces, libraries, etc.)
      const sharedComponents = await this.generateSharedComponents(
        parsed,
        facetPlan.sharedComponents
      );

      // Generate deployment configuration
      const deploymentConfig = this.generateDeploymentConfig(facets, facetPlan);

      return {
        facets,
        sharedComponents,
        deploymentConfig,
        estimatedGasSavings: this.estimateGasSavings(parsed, facets),
        warnings,
        originalContract: parsed
      };
    } catch (error) {
      console.error('Refactor apply error:', error);
      throw new Error(`Failed to apply refactoring: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze contract structure for refactoring opportunities
   */
  private analyzeContractStructure(contract: ParsedContract) {
    return {
      functionGroups: this.groupFunctionsByCategory(contract.functions),
      stateVariableUsage: this.analyzeStateVariableUsage(contract),
      gasHotspots: this.identifyGasHotspots(contract.functions),
      accessPatterns: this.analyzeAccessPatterns(contract.functions),
      dependencyGraph: this.buildDependencyGraph(contract),
      complexity: this.calculateComplexity(contract)
    };
  }

  /**
   * Group functions by logical categories
   */
  private groupFunctionsByCategory(functions: FunctionInfo[]) {
    const groups = {
      read: [] as FunctionInfo[],
      write: [] as FunctionInfo[],
      admin: [] as FunctionInfo[],
      user: [] as FunctionInfo[],
      internal: [] as FunctionInfo[],
      view: [] as FunctionInfo[],
      pure: [] as FunctionInfo[]
    };

    for (const func of functions) {
      // Categorize by state mutability
      if (func.stateMutability === 'view') {
        groups.view.push(func);
        groups.read.push(func);
      } else if (func.stateMutability === 'pure') {
        groups.pure.push(func);
        groups.read.push(func);
      } else {
        groups.write.push(func);
      }

      // Categorize by visibility and access patterns
      if (func.visibility === 'internal' || func.visibility === 'private') {
        groups.internal.push(func);
      } else {
        // Detect admin functions by common patterns
        if (this.isAdminFunction(func)) {
          groups.admin.push(func);
        } else {
          groups.user.push(func);
        }
      }
    }

    return groups;
  }

  /**
   * Check if function appears to be an admin function
   */
  private isAdminFunction(func: FunctionInfo): boolean {
    const adminPatterns = [
      /^set[A-Z]/,           // setX functions
      /^update[A-Z]/,        // updateX functions
      /^change[A-Z]/,        // changeX functions
      /^withdraw/,           // withdraw functions
      /^pause/,              // pause functions
      /^unpause/,            // unpause functions
      /^emergency/,          // emergency functions
      /^admin/,              // admin functions
      /^owner/,              // owner functions
      /^manage/,             // management functions
      /^initialize/,         // initialization
      /^configure/           // configuration
    ];

    return adminPatterns.some(pattern => pattern.test(func.name)) ||
           func.modifiers.some(mod => /owner|admin|auth|role/i.test(mod));
  }

  /**
   * Analyze state variable usage patterns
   */
  private analyzeStateVariableUsage(contract: ParsedContract) {
    const usage = new Map<string, {
      readers: string[];
      writers: string[];
      frequency: number;
    }>();

    // Initialize tracking for each variable
    for (const variable of contract.variables) {
      usage.set(variable.name, {
        readers: [],
        writers: [],
        frequency: 0
      });
    }

    // Analyze function interactions with state variables
    for (const func of contract.functions) {
      // This would require AST analysis to determine which variables are accessed
      // For now, provide a simplified implementation
      const varPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
      const matches = func.body?.match(varPattern) || [];
      
      for (const match of matches) {
        if (usage.has(match)) {
          const varUsage = usage.get(match)!;
          
          if (func.stateMutability === 'view' || func.stateMutability === 'pure') {
            varUsage.readers.push(func.name);
          } else {
            varUsage.writers.push(func.name);
          }
          
          varUsage.frequency++;
        }
      }
    }

    return usage;
  }

  /**
   * Identify gas-intensive functions
   */
  private identifyGasHotspots(functions: FunctionInfo[]) {
    return functions
      .filter(func => {
        // Identify potentially gas-heavy functions
        return func.stateMutability !== 'view' && 
               func.stateMutability !== 'pure' &&
               (func.hasLoops || func.body?.includes('for') || func.body?.includes('while'));
      })
      .map(func => ({
        name: func.name,
        estimatedGas: this.estimateFunctionGas(func),
        reasons: this.identifyGasReasons(func)
      }));
  }

  /**
   * Estimate gas usage for a function
   */
  private estimateFunctionGas(func: FunctionInfo): number {
    let baseGas = 21000; // Base transaction cost
    
    // Add costs based on function characteristics
    if (func.stateMutability !== 'view' && func.stateMutability !== 'pure') {
      baseGas += 5000; // State change overhead
    }
    
    // Add parameter processing costs
    baseGas += func.parameters.length * 100;
    
    // Add loop penalties (rough estimation)
    const loopCount = (func.body?.match(/for\s*\(/g) || []).length +
                      (func.body?.match(/while\s*\(/g) || []).length;
    baseGas += loopCount * 10000;
    
    return baseGas;
  }

  /**
   * Identify reasons for high gas usage
   */
  private identifyGasReasons(func: FunctionInfo): string[] {
    const reasons: string[] = [];
    
    if (func.body?.includes('for') || func.body?.includes('while')) {
      reasons.push('Contains loops that may consume significant gas');
    }
    
    if (func.parameters.length > 5) {
      reasons.push('High number of parameters increases gas cost');
    }
    
    if (func.stateMutability !== 'view' && func.stateMutability !== 'pure') {
      reasons.push('Modifies state which requires gas');
    }
    
    return reasons;
  }

  /**
   * Analyze access control patterns
   */
  private analyzeAccessPatterns(functions: FunctionInfo[]) {
    const patterns = {
      public: functions.filter(f => f.visibility === 'public').length,
      external: functions.filter(f => f.visibility === 'external').length,
      internal: functions.filter(f => f.visibility === 'internal').length,
      private: functions.filter(f => f.visibility === 'private').length,
      protected: functions.filter(f => f.modifiers.length > 0).length
    };

    return patterns;
  }

  /**
   * Build dependency graph between functions
   */
  private buildDependencyGraph(contract: ParsedContract) {
    const graph = new Map<string, string[]>();
    
    // Initialize graph
    for (const func of contract.functions) {
      graph.set(func.name, []);
    }
    
    // Analyze function calls (simplified)
    for (const func of contract.functions) {
      const dependencies: string[] = [];
      
      // Look for function calls in the body
      for (const otherFunc of contract.functions) {
        if (func.name !== otherFunc.name && 
            func.body?.includes(otherFunc.name)) {
          dependencies.push(otherFunc.name);
        }
      }
      
      graph.set(func.name, dependencies);
    }
    
    return graph;
  }

  /**
   * Calculate contract complexity
   */
  private calculateComplexity(contract: ParsedContract) {
    return {
      functionCount: contract.functions.length,
      stateVariableCount: contract.variables.length,
      eventCount: contract.events.length,
      modifierCount: contract.modifiers.length,
      linesOfCode: contract.sourceCode.split('\n').length,
      cyclomaticComplexity: this.calculateCyclomaticComplexity(contract)
    };
  }

  /**
   * Calculate cyclomatic complexity
   */
  private calculateCyclomaticComplexity(contract: ParsedContract): number {
    let complexity = 1; // Base complexity
    
    for (const func of contract.functions) {
      if (func.body) {
        // Count decision points
        const decisions = (func.body.match(/\bif\b/g) || []).length +
                         (func.body.match(/\bwhile\b/g) || []).length +
                         (func.body.match(/\bfor\b/g) || []).length +
                         (func.body.match(/\bswitch\b/g) || []).length +
                         (func.body.match(/\bcatch\b/g) || []).length;
        
        complexity += decisions;
      }
    }
    
    return complexity;
  }

  /**
   * Generate facet suggestions based on analysis
   */
  private generateFacetSuggestions(
    contract: ParsedContract,
    analysis: any,
    preferences: RefactorPreferences,
    aiSuggestions: string[]
  ): FacetSuggestion[] {
    const suggestions: FacetSuggestion[] = [];
    
    // Generate facets based on function groups
    const strategy = preferences.groupingStrategy || 'functional';
    
    switch (strategy) {
      case 'functional':
        suggestions.push(...this.generateFunctionalFacets(analysis.functionGroups));
        break;
      case 'access':
        suggestions.push(...this.generateAccessBasedFacets(analysis.functionGroups));
        break;
      case 'state':
        suggestions.push(...this.generateStateBasedFacets(analysis.stateVariableUsage));
        break;
      case 'mixed':
        suggestions.push(...this.generateMixedFacets(analysis));
        break;
    }

    // Apply size preferences
    return this.optimizeFacetSizes(suggestions, preferences);
  }

  /**
   * Generate facets based on functional grouping
   */
  private generateFunctionalFacets(functionGroups: any): FacetSuggestion[] {
    const suggestions: FacetSuggestion[] = [];

    if (functionGroups.read.length > 0) {
      suggestions.push({
        name: 'ReadFacet',
        description: 'Read-only operations and view functions',
        functions: functionGroups.read.map((f: FunctionInfo) => f.name),
        estimatedSize: functionGroups.read.length * 1000, // Rough estimate
        gasOptimization: 'High',
        securityRating: 'High',
        dependencies: [],
        reasoning: 'Groups all read operations for efficient gas usage and clear separation of concerns'
      });
    }

    if (functionGroups.write.length > 0) {
      suggestions.push({
        name: 'WriteFacet',
        description: 'State-changing operations',
        functions: functionGroups.write.map((f: FunctionInfo) => f.name),
        estimatedSize: functionGroups.write.length * 1500,
        gasOptimization: 'Medium',
        securityRating: 'Medium',
        dependencies: [],
        reasoning: 'Separates state-changing operations for better access control and testing'
      });
    }

    if (functionGroups.admin.length > 0) {
      suggestions.push({
        name: 'AdminFacet',
        description: 'Administrative and governance functions',
        functions: functionGroups.admin.map((f: FunctionInfo) => f.name),
        estimatedSize: functionGroups.admin.length * 1200,
        gasOptimization: 'Low',
        securityRating: 'Critical',
        dependencies: [],
        reasoning: 'Isolates admin functions for enhanced security and access control'
      });
    }

    return suggestions;
  }

  /**
   * Generate facets based on access control patterns
   */
  private generateAccessBasedFacets(functionGroups: any): FacetSuggestion[] {
    const suggestions: FacetSuggestion[] = [];

    if (functionGroups.user.length > 0) {
      suggestions.push({
        name: 'UserFacet',
        description: 'Public user-facing functions',
        functions: functionGroups.user.map((f: FunctionInfo) => f.name),
        estimatedSize: functionGroups.user.length * 1300,
        gasOptimization: 'High',
        securityRating: 'Medium',
        dependencies: [],
        reasoning: 'Separates user functions for optimized gas usage and clear API'
      });
    }

    if (functionGroups.admin.length > 0) {
      suggestions.push({
        name: 'GovernanceFacet',
        description: 'Administrative and privileged functions',
        functions: functionGroups.admin.map((f: FunctionInfo) => f.name),
        estimatedSize: functionGroups.admin.length * 1100,
        gasOptimization: 'Low',
        securityRating: 'Critical',
        dependencies: [],
        reasoning: 'Isolates privileged functions for maximum security'
      });
    }

    return suggestions;
  }

  /**
   * Generate facets based on state variable usage
   */
  private generateStateBasedFacets(stateUsage: Map<string, any>): FacetSuggestion[] {
    // This would analyze state variable usage patterns
    // and group functions that work with similar state
    return [];
  }

  /**
   * Generate mixed strategy facets
   */
  private generateMixedFacets(analysis: any): FacetSuggestion[] {
    // Combine multiple strategies for optimal faceting
    const functional = this.generateFunctionalFacets(analysis.functionGroups);
    const access = this.generateAccessBasedFacets(analysis.functionGroups);
    
    // Merge and optimize
    return [...functional, ...access];
  }

  /**
   * Optimize facet sizes based on preferences
   */
  private optimizeFacetSizes(
    suggestions: FacetSuggestion[], 
    preferences: RefactorPreferences
  ): FacetSuggestion[] {
    const maxSize = preferences.maxFacetSize || 8000;
    const minSize = preferences.minFacetSize || 500;

    return suggestions.filter(facet => 
      facet.estimatedSize >= minSize && facet.estimatedSize <= maxSize
    );
  }

  /**
   * Generate actual facet contract code
   */
  private async generateFacetCode(
    originalContract: ParsedContract,
    suggestion: FacetSuggestion,
    sharedComponents: string[]
  ): Promise<FacetDefinition> {
    // Extract relevant functions
    const facetFunctions = originalContract.functions.filter(
      func => suggestion.functions.includes(func.name)
    );

    // Generate facet contract code
    const facetCode = this.buildFacetContract(
      suggestion.name,
      facetFunctions,
      originalContract,
      sharedComponents
    );

    return {
      name: suggestion.name,
      sourceCode: facetCode,
      functions: facetFunctions,
      selector: this.generateFacetSelector(suggestion.name),
      dependencies: suggestion.dependencies,
      estimatedGas: this.estimateFacetGas(facetFunctions),
      securityLevel: suggestion.securityRating
    };
  }

  /**
   * Build facet contract source code
   */
  private buildFacetContract(
    facetName: string,
    functions: FunctionInfo[],
    originalContract: ParsedContract,
    sharedComponents: string[]
  ): string {
    let code = `// SPDX-License-Identifier: MIT\n`;
    code += `pragma solidity ^0.8.20;\n\n`;
    
    // Add necessary imports
    code += `import "./interfaces/I${facetName}.sol";\n`;
    if (sharedComponents.length > 0) {
      code += `import "./shared/SharedStorage.sol";\n`;
    }
    code += `\n`;

    // Contract definition
    code += `/**\n`;
    code += ` * @title ${facetName}\n`;
    code += ` * @dev Generated facet for modular contract architecture\n`;
    code += ` * @notice This facet is part of a PayRox Go Beyond deployment\n`;
    code += ` */\n`;
    code += `contract ${facetName} is I${facetName} {\n`;

    // Add state variables if needed
    const relevantVars = this.getRelevantStateVariables(functions, originalContract);
    if (relevantVars.length > 0) {
      code += `    // State variables\n`;
      for (const variable of relevantVars) {
        code += `    ${variable.typeName} ${variable.visibility || 'private'} ${variable.name};\n`;
      }
      code += `\n`;
    }

    // Add functions
    for (const func of functions) {
      code += this.generateFunctionCode(func);
      code += `\n`;
    }

    code += `}\n`;

    return code;
  }

  /**
   * Get state variables relevant to the facet functions
   */
  private getRelevantStateVariables(functions: FunctionInfo[], contract: ParsedContract) {
    // This would analyze which state variables are used by the facet functions
    // For now, return empty array as this requires deeper AST analysis
    return [];
  }

  /**
   * Generate function code from function info
   */
  private generateFunctionCode(func: FunctionInfo): string {
    let code = `    /**\n`;
    code += `     * @dev ${func.name} function\n`;
    code += `     */\n`;
    
    // Function signature
    code += `    function ${func.name}(`;
    
    // Parameters
    const paramStrings = func.parameters.map(param => 
      `${param.type} ${param.name}`
    );
    code += paramStrings.join(', ');
    
    code += `) ${func.visibility}`;
    
    // Modifiers
    if (func.modifiers.length > 0) {
      code += ` ${func.modifiers.join(' ')}`;
    }
    
    // State mutability
    if (func.stateMutability && func.stateMutability !== 'nonpayable') {
      code += ` ${func.stateMutability}`;
    }
    
    // Return parameters
    if (func.returnParameters.length > 0) {
      const returnStrings = func.returnParameters.map(param => 
        `${param.type} ${param.name || ''}`
      );
      code += ` returns (${returnStrings.join(', ')})`;
    }
    
    code += ` {\n`;
    
    // Function body (simplified)
    if (func.body) {
      code += `        ${func.body}\n`;
    } else {
      code += `        // TODO: Implement function logic\n`;
      if (func.returnParameters.length > 0) {
        code += `        // return default values;\n`;
      }
    }
    
    code += `    }`;
    
    return code;
  }

  /**
   * Generate shared components
   */
  private async generateSharedComponents(
    contract: ParsedContract,
    sharedComponents: string[]
  ) {
    // Generate shared interfaces, libraries, and storage contracts
    return {
      interfaces: await this.generateInterfaces(contract),
      libraries: await this.generateLibraries(contract),
      storage: await this.generateSharedStorage(contract)
    };
  }

  /**
   * Generate interface contracts
   */
  private async generateInterfaces(contract: ParsedContract) {
    // Generate interface definitions for each facet
    return {};
  }

  /**
   * Generate library contracts
   */
  private async generateLibraries(contract: ParsedContract) {
    // Extract reusable logic into libraries
    return {};
  }

  /**
   * Generate shared storage contract
   */
  private async generateSharedStorage(contract: ParsedContract) {
    // Generate storage layout for shared state
    return '';
  }

  /**
   * Generate deployment configuration
   */
  private generateDeploymentConfig(facets: FacetDefinition[], plan: RefactorPlan) {
    return {
      facets: facets.map(facet => ({
        name: facet.name,
        selector: facet.selector,
        estimatedGas: facet.estimatedGas
      })),
      deploymentOrder: this.calculateDeploymentOrder(facets),
      estimatedTotalGas: facets.reduce((total, facet) => total + facet.estimatedGas, 0)
    };
  }

  /**
   * Calculate optimal deployment order
   */
  private calculateDeploymentOrder(facets: FacetDefinition[]): string[] {
    // Sort by dependencies and gas cost
    return facets
      .sort((a, b) => a.dependencies.length - b.dependencies.length)
      .map(facet => facet.name);
  }

  /**
   * Generate facet selector
   */
  private generateFacetSelector(facetName: string): string {
    // Generate unique selector for the facet
    return `0x${facetName.toLowerCase().padEnd(8, '0').slice(0, 8)}`;
  }

  /**
   * Estimate facet gas usage
   */
  private estimateFacetGas(functions: FunctionInfo[]): number {
    return functions.reduce((total, func) => 
      total + this.estimateFunctionGas(func), 0
    );
  }

  /**
   * Estimate gas savings from refactoring
   */
  private estimateGasSavings(original: ParsedContract, facets: FacetDefinition[]): number {
    const originalGas = this.estimateContractGas(original);
    const facetGas = facets.reduce((total, facet) => total + facet.estimatedGas, 0);
    
    // Account for modularity benefits (rough estimate)
    const modularityBonus = Math.floor(originalGas * 0.1); // 10% savings from modularity
    
    return originalGas - facetGas + modularityBonus;
  }

  /**
   * Estimate total contract gas usage
   */
  private estimateContractGas(contract: ParsedContract): number {
    return contract.functions.reduce((total, func) => 
      total + this.estimateFunctionGas(func), 0
    );
  }
}

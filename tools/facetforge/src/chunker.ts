// tools/facetforge/src/chunker.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ChunkPlanningOptions {
  maxChunkSize: number;
  strategy: 'function' | 'feature' | 'gas';
  gasLimit?: number;
  preferenceOrder?: string[];
}

export interface FunctionChunk {
  id: string;
  functions: ChunkFunction[];
  estimatedSize: number;
  gasEstimate: number;
  dependencies: string[];
}

export interface ChunkFunction {
  name: string;
  signature: string;
  estimatedSize: number;
  gasEstimate: number;
  complexity: number;
  dependencies: string[];
}

export interface ChunkPlan {
  chunks: FunctionChunk[];
  totalFunctions: number;
  totalEstimatedSize: number;
  strategy: string;
  optimization: ChunkOptimization;
}

export interface ChunkOptimization {
  efficiency: number;
  gasOptimized: boolean;
  dependencyScore: number;
  recommendations: string[];
}

/**
 * Intelligent chunk planner for contract optimization
 * Splits large contracts into EIP-170 compliant chunks
 */
export class ChunkPlanner {
  private options: ChunkPlanningOptions;

  constructor(options: Partial<ChunkPlanningOptions> = {}) {
    this.options = {
      maxChunkSize: 24576, // EIP-170 limit
      strategy: 'function',
      gasLimit: 30000000,
      ...options,
    };
  }

  /**
   * Plan optimal chunking strategy for contract analysis
   */
  planChunks(analysis: any): ChunkPlan {
    const functions = this.prepareFunctions(analysis.functions || []);
    let chunks: FunctionChunk[];

    switch (this.options.strategy) {
      case 'gas':
        chunks = this.planByGasUsage(functions);
        break;
      case 'feature':
        chunks = this.planByFeature(functions);
        break;
      case 'function':
      default:
        chunks = this.planByFunction(functions);
        break;
    }

    return {
      chunks,
      totalFunctions: functions.length,
      totalEstimatedSize: chunks.reduce(
        (sum, chunk) => sum + chunk.estimatedSize,
        0
      ),
      strategy: this.options.strategy,
      optimization: this.calculateOptimization(chunks),
    };
  }

  /**
   * Convert analysis functions to chunk functions
   */
  private prepareFunctions(analysisFunctions: any[]): ChunkFunction[] {
    return analysisFunctions.map(func => ({
      name: func.name,
      signature: func.signature,
      estimatedSize: this.estimateFunctionSize(func),
      gasEstimate: func.estimatedGas || 50000,
      complexity: func.complexity || 1,
      dependencies: this.extractDependencies(func),
    }));
  }

  /**
   * Plan chunks by individual functions (simple strategy)
   */
  private planByFunction(functions: ChunkFunction[]): FunctionChunk[] {
    const chunks: FunctionChunk[] = [];
    let currentChunk: FunctionChunk = this.createEmptyChunk(chunks.length);

    for (const func of functions) {
      // Check if adding this function would exceed size limit
      if (
        currentChunk.estimatedSize + func.estimatedSize >
        this.options.maxChunkSize
      ) {
        if (currentChunk.functions.length > 0) {
          chunks.push(currentChunk);
          currentChunk = this.createEmptyChunk(chunks.length);
        }
      }

      currentChunk.functions.push(func);
      currentChunk.estimatedSize += func.estimatedSize;
      currentChunk.gasEstimate += func.gasEstimate;
      currentChunk.dependencies.push(...func.dependencies);
    }

    if (currentChunk.functions.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Plan chunks by gas usage optimization
   */
  private planByGasUsage(functions: ChunkFunction[]): FunctionChunk[] {
    // Sort functions by gas usage (ascending)
    const sortedFunctions = [...functions].sort(
      (a, b) => a.gasEstimate - b.gasEstimate
    );

    const chunks: FunctionChunk[] = [];
    let currentChunk: FunctionChunk = this.createEmptyChunk(chunks.length);

    for (const func of sortedFunctions) {
      // Check both size and gas limits
      if (
        currentChunk.estimatedSize + func.estimatedSize >
          this.options.maxChunkSize ||
        currentChunk.gasEstimate + func.gasEstimate >
          (this.options.gasLimit || 30000000)
      ) {
        if (currentChunk.functions.length > 0) {
          chunks.push(currentChunk);
          currentChunk = this.createEmptyChunk(chunks.length);
        }
      }

      currentChunk.functions.push(func);
      currentChunk.estimatedSize += func.estimatedSize;
      currentChunk.gasEstimate += func.gasEstimate;
      currentChunk.dependencies.push(...func.dependencies);
    }

    if (currentChunk.functions.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Plan chunks by feature grouping (advanced strategy)
   */
  private planByFeature(functions: ChunkFunction[]): FunctionChunk[] {
    const featureGroups = this.groupByFeature(functions);
    const chunks: FunctionChunk[] = [];

    for (const [feature, funcs] of featureGroups) {
      let currentChunk: FunctionChunk = this.createEmptyChunk(
        chunks.length,
        feature
      );

      for (const func of funcs) {
        if (
          currentChunk.estimatedSize + func.estimatedSize >
          this.options.maxChunkSize
        ) {
          if (currentChunk.functions.length > 0) {
            chunks.push(currentChunk);
            currentChunk = this.createEmptyChunk(chunks.length, feature);
          }
        }

        currentChunk.functions.push(func);
        currentChunk.estimatedSize += func.estimatedSize;
        currentChunk.gasEstimate += func.gasEstimate;
        currentChunk.dependencies.push(...func.dependencies);
      }

      if (currentChunk.functions.length > 0) {
        chunks.push(currentChunk);
      }
    }

    return chunks;
  }

  /**
   * Group functions by detected features
   */
  private groupByFeature(
    functions: ChunkFunction[]
  ): Map<string, ChunkFunction[]> {
    const groups = new Map<string, ChunkFunction[]>();

    for (const func of functions) {
      const feature = this.detectFeature(func);

      if (!groups.has(feature)) {
        groups.set(feature, []);
      }

      const group = groups.get(feature);
      if (group) {
        group.push(func);
      }
    }

    return groups;
  }

  /**
   * Detect feature category for a function
   */
  private detectFeature(func: ChunkFunction): string {
    const name = func.name.toLowerCase();

    // ERC20-like functions
    if (
      ['transfer', 'approve', 'allowance', 'balanceof', 'totalsupply'].some(
        pattern => name.includes(pattern)
      )
    ) {
      return 'erc20';
    }

    // Access control functions
    if (
      ['onlyowner', 'onlyadmin', 'onlyauthorized', 'require'].some(pattern =>
        name.includes(pattern)
      ) ||
      func.name.includes('Role')
    ) {
      return 'access-control';
    }

    // View/pure functions
    if (func.gasEstimate < 10000) {
      return 'read-only';
    }

    // Administrative functions
    if (
      ['mint', 'burn', 'pause', 'unpause', 'withdraw', 'emergency'].some(
        pattern => name.includes(pattern)
      )
    ) {
      return 'administrative';
    }

    return 'core';
  }

  /**
   * Create empty chunk with proper initialization
   */
  private createEmptyChunk(index: number, feature?: string): FunctionChunk {
    const id = feature ? `${feature}-${index}` : `chunk-${index}`;
    return {
      id,
      functions: [],
      estimatedSize: 0,
      gasEstimate: 0,
      dependencies: [],
    };
  }

  /**
   * Estimate function bytecode size
   */
  private estimateFunctionSize(func: any): number {
    let size = 100; // Base function overhead

    // Add size based on parameter count
    const paramCount = func.parameters?.length || 0;
    size += paramCount * 32; // Each parameter adds ~32 bytes

    // Add size based on complexity
    size += (func.complexity || 1) * 50;

    // Add size for modifiers
    const modifierCount = func.modifiers?.length || 0;
    size += modifierCount * 20;

    // Add size based on function type
    if (func.stateMutability === 'view' || func.stateMutability === 'pure') {
      size += 50; // Read-only functions are smaller
    } else {
      size += 200; // State-changing functions are larger
    }

    return size;
  }

  /**
   * Extract function dependencies (simplified)
   */
  private extractDependencies(func: any): string[] {
    // This would require AST analysis to find actual dependencies
    // For now, return empty array or basic heuristics
    const dependencies: string[] = [];

    // Add modifier dependencies
    if (func.modifiers) {
      dependencies.push(...func.modifiers);
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Calculate optimization metrics for chunk plan
   */
  private calculateOptimization(chunks: FunctionChunk[]): ChunkOptimization {
    const totalSize = chunks.reduce(
      (sum, chunk) => sum + chunk.estimatedSize,
      0
    );
    const averageChunkSize = totalSize / chunks.length;
    const sizeEfficiency = averageChunkSize / this.options.maxChunkSize;

    const totalGas = chunks.reduce((sum, chunk) => sum + chunk.gasEstimate, 0);
    const gasOptimized = totalGas <= (this.options.gasLimit || 30000000);

    // Calculate dependency score (lower is better)
    const crossChunkDependencies = this.calculateCrossChunkDependencies(chunks);
    const dependencyScore =
      crossChunkDependencies / Math.max(chunks.length - 1, 1);

    const recommendations: string[] = [];

    if (sizeEfficiency < 0.7) {
      recommendations.push(
        'Consider merging smaller chunks for better size efficiency'
      );
    }

    if (!gasOptimized) {
      recommendations.push(
        'Gas usage exceeds recommended limits - consider function optimization'
      );
    }

    if (dependencyScore > 0.3) {
      recommendations.push(
        'High cross-chunk dependencies detected - consider reorganizing features'
      );
    }

    if (chunks.length > 10) {
      recommendations.push(
        'Large number of chunks may increase deployment complexity'
      );
    }

    return {
      efficiency: Math.round(sizeEfficiency * 100) / 100,
      gasOptimized,
      dependencyScore: Math.round(dependencyScore * 100) / 100,
      recommendations,
    };
  }

  /**
   * Calculate cross-chunk dependencies
   */
  private calculateCrossChunkDependencies(chunks: FunctionChunk[]): number {
    // Simplified dependency calculation
    // In practice, this would analyze actual function call relationships
    let crossDependencies = 0;

    for (let i = 0; i < chunks.length; i++) {
      for (let j = i + 1; j < chunks.length; j++) {
        const chunk1Deps = new Set(chunks[i].dependencies);
        const chunk2Funcs = new Set(chunks[j].functions.map(f => f.name));

        // Count dependencies from chunk1 to chunk2
        for (const dep of chunk1Deps) {
          if (chunk2Funcs.has(dep)) {
            crossDependencies++;
          }
        }
      }
    }

    return crossDependencies;
  }

  /**
   * Validate chunk plan for deployment
   */
  validateChunkPlan(plan: ChunkPlan): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check size limits
    for (const chunk of plan.chunks) {
      if (chunk.estimatedSize > this.options.maxChunkSize) {
        errors.push(
          `Chunk ${chunk.id} exceeds size limit: ${chunk.estimatedSize} > ${this.options.maxChunkSize}`
        );
      }
    }

    // Check for empty chunks
    const emptyChunks = plan.chunks.filter(
      chunk => chunk.functions.length === 0
    );
    if (emptyChunks.length > 0) {
      errors.push(`Found ${emptyChunks.length} empty chunks`);
    }

    // Check total function count
    const totalChunkFunctions = plan.chunks.reduce(
      (sum, chunk) => sum + chunk.functions.length,
      0
    );
    if (totalChunkFunctions !== plan.totalFunctions) {
      errors.push(
        `Function count mismatch: chunks contain ${totalChunkFunctions}, expected ${plan.totalFunctions}`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

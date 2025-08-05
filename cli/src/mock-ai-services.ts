/**
 * Mock AI Services for PayRox CLI Demo
 * 
 * Provides mock implementations of AI services for testing and demo purposes
 */

export interface AnalysisResult {
  score: number;
  issues: number;
  optimizations: number;
  facetSuggestions: number;
  details: {
    functions: Array<{ name: string; complexity: string; gasUsage: number }>;
    securityIssues: Array<{ type: string; severity: string; description: string }>;
    optimizations: Array<{ type: string; description: string; savings: number }>;
  };
}

export interface SimulationResult {
  success: boolean;
  gasUsed: number;
  deploymentAddress?: string;
  errors: string[];
  warnings: string[];
}

export class MockAIServices {
  /**
   * Mock contract analysis
   */
  static async analyzeContract(sourceCode: string, contractName?: string): Promise<AnalysisResult> {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const codeLength = sourceCode.length;
    const functionCount = (sourceCode.match(/function\s+\w+/g) || []).length;
    
    // Generate realistic but mock results
    const score = Math.max(60, Math.min(95, 80 + Math.random() * 15));
    const issues = Math.floor(Math.random() * 5);
    const optimizations = Math.floor(2 + Math.random() * 8);
    const facetSuggestions = Math.floor(1 + Math.random() * 4);
    
    return {
      score: Math.round(score),
      issues,
      optimizations,
      facetSuggestions,
      details: {
        functions: this.generateMockFunctions(functionCount),
        securityIssues: this.generateMockSecurityIssues(issues),
        optimizations: this.generateMockOptimizations(optimizations)
      }
    };
  }

  /**
   * Mock facet simulation
   */
  static async simulateFacet(facetName: string, network: string): Promise<SimulationResult> {
    // Simulate deployment time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const success = Math.random() > 0.1; // 90% success rate
    const gasUsed = Math.floor(200000 + Math.random() * 300000);
    
    if (success) {
      return {
        success: true,
        gasUsed,
        deploymentAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
        errors: [],
        warnings: Math.random() > 0.7 ? ['Gas usage could be optimized further'] : []
      };
    } else {
      return {
        success: false,
        gasUsed: 0,
        errors: ['Simulation failed: Invalid function selector collision'],
        warnings: []
      };
    }
  }

  /**
   * Mock gas optimization analysis
   */
  static async optimizeGas(sourceCode: string): Promise<Array<{ type: string; description: string; savings: number }>> {
    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    return [
      {
        type: 'Storage Packing',
        description: 'Pack struct variables to save storage slots',
        savings: 15
      },
      {
        type: 'Calldata Usage',
        description: 'Use calldata instead of memory for external function parameters',
        savings: 8
      },
      {
        type: 'Loop Optimization',
        description: 'Optimize loop operations and reduce redundant calculations',
        savings: 12
      },
      {
        type: 'Storage Access',
        description: 'Reduce redundant storage reads by caching values',
        savings: 5
      }
    ];
  }

  /**
   * Mock refactoring suggestions
   */
  static async generateRefactorPlan(sourceCode: string, strategy: string): Promise<any> {
    // Simulate AI planning time
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const facets = [
      {
        name: 'AdminFacet',
        functions: ['setOwner', 'pause', 'unpause', 'transferOwnership'],
        description: 'Administrative functions and access control'
      },
      {
        name: 'UserFacet', 
        functions: ['deposit', 'withdraw', 'transfer', 'balanceOf'],
        description: 'User interaction and core functionality'
      },
      {
        name: 'StorageFacet',
        functions: ['updateStorage', 'migrateData', 'getStorageInfo'],
        description: 'Data management and storage operations'
      }
    ];
    
    return {
      strategy,
      facets,
      benefits: [
        'Reduced contract size by 60%',
        'Improved upgradeability',
        'Better code organization',
        'Gas cost reduction'
      ],
      risks: [
        'Initial migration complexity',
        'Additional deployment costs'
      ],
      estimatedGasSavings: 25
    };
  }

  /**
   * Mock security scan
   */
  static async securityScan(sourceCode: string): Promise<Array<{ type: string; severity: string; description: string; fix: string }>> {
    // Simulate security analysis time
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    const issues = [];
    
    if (sourceCode.includes('transfer') && !sourceCode.includes('nonReentrant')) {
      issues.push({
        type: 'Reentrancy',
        severity: 'High',
        description: 'Potential reentrancy vulnerability in transfer functions',
        fix: 'Use ReentrancyGuard or implement checks-effects-interactions pattern'
      });
    }
    
    if (sourceCode.includes('onlyOwner') && !sourceCode.includes('require')) {
      issues.push({
        type: 'Access Control',
        severity: 'Medium',
        description: 'Missing input validation in admin functions',
        fix: 'Add proper input validation and access control checks'
      });
    }
    
    if (!sourceCode.includes('SafeMath') && sourceCode.includes('pragma solidity ^0.7')) {
      issues.push({
        type: 'Integer Overflow',
        severity: 'Low',
        description: 'Consider using SafeMath for older Solidity versions',
        fix: 'Upgrade to Solidity 0.8+ or use SafeMath library'
      });
    }
    
    return issues;
  }

  private static generateMockFunctions(count: number): Array<{ name: string; complexity: string; gasUsage: number }> {
    const functionNames = ['initialize', 'transfer', 'approve', 'mint', 'burn', 'pause', 'unpause', 'setOwner'];
    const complexities = ['low', 'medium', 'high'];
    
    return Array.from({ length: Math.min(count, functionNames.length) }, (_, i) => ({
      name: functionNames[i] || `function${i}`,
      complexity: complexities[Math.floor(Math.random() * complexities.length)],
      gasUsage: Math.floor(20000 + Math.random() * 100000)
    }));
  }

  private static generateMockSecurityIssues(count: number): Array<{ type: string; severity: string; description: string }> {
    const issues = [
      { type: 'Reentrancy', severity: 'high', description: 'Potential reentrancy in withdraw function' },
      { type: 'Access Control', severity: 'medium', description: 'Missing input validation in admin functions' },
      { type: 'Integer Overflow', severity: 'low', description: 'Consider using SafeMath for arithmetic operations' },
      { type: 'Unchecked Call', severity: 'medium', description: 'External call without checking return value' },
      { type: 'Gas Limit', severity: 'low', description: 'Loop may exceed gas limit with large arrays' }
    ];
    
    return issues.slice(0, count);
  }

  private static generateMockOptimizations(count: number): Array<{ type: string; description: string; savings: number }> {
    const optimizations = [
      { type: 'Storage Packing', description: 'Pack struct variables', savings: 15 },
      { type: 'Calldata Usage', description: 'Use calldata instead of memory', savings: 8 },
      { type: 'Loop Optimization', description: 'Optimize loop operations', savings: 12 },
      { type: 'Storage Caching', description: 'Cache storage reads', savings: 5 },
      { type: 'Function Modifiers', description: 'Optimize modifier usage', savings: 3 },
      { type: 'Event Optimization', description: 'Use indexed parameters efficiently', savings: 2 }
    ];
    
    return optimizations.slice(0, count);
  }
}

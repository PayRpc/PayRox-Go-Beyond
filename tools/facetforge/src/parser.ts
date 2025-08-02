// tools/facetforge/src/parser.ts
 
import * as Parser from '@solidity-parser/parser';
import * as fs from 'fs';

interface LocationInfo {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export interface AnalysisResult {
  functions: FunctionInfo[];
  stateVariables: StateVariableInfo[];
  events: EventInfo[];
  modifiers: ModifierInfo[];
  structs: StructInfo[];
  enums: EnumInfo[];
  imports: ImportInfo[];
  inheritance: InheritanceInfo[];
  pragma: PragmaInfo | null;
  fileName: string;
  extractedAt: string;
  summary: AnalysisSummary;
}

export interface FunctionInfo {
  name: string;
  visibility: string;
  stateMutability: string;
  isConstructor: boolean;
  isReceiveEther: boolean;
  isFallback: boolean;
  parameters: ParameterInfo[];
  returnParameters: ParameterInfo[];
  modifiers: string[];
  complexity: number;
  estimatedGas: number;
  signature: string;
  loc?: LocationInfo;
}

interface StateVariableInfo {
  name: string;
  type: string;
  visibility: string;
  isConstant: boolean;
  isImmutable: boolean;
  loc?: LocationInfo;
}

interface EventInfo {
  name: string;
  parameters: ParameterInfo[];
  anonymous: boolean;
  loc?: LocationInfo;
}

interface ModifierInfo {
  name: string;
  parameters: ParameterInfo[];
  loc?: LocationInfo;
}

interface StructInfo {
  name: string;
  members: StructMember[];
  loc?: LocationInfo;
}

interface StructMember {
  name: string;
  type: string;
}

interface EnumInfo {
  name: string;
  members: string[];
  loc?: LocationInfo;
}

interface ImportInfo {
  path: string;
  symbols: ImportSymbol[];
}

interface ImportSymbol {
  name: string;
  alias?: string;
}

interface InheritanceInfo {
  name: string;
  type: string;
}

interface PragmaInfo {
  name: string;
  value: string;
}

interface ParameterInfo {
  name: string;
  type: string;
  indexed: boolean;
}

interface AnalysisSummary {
  totalFunctions: number;
  publicFunctions: number;
  stateVariables: number;
  events: number;
  modifiers: number;
  averageComplexity: number;
  totalGasEstimate: number;
  hasInheritance: boolean;
  solcVersion: string;
}

interface SecurityIssue {
  type: string;
  function: string;
  severity: string;
  message: string;
}

/**
 * Static analyzer for Solidity contracts
 * Extracts functions, state variables, events, and other contract elements
 */
export class StaticExtractor {
  private analysis: Omit<
    AnalysisResult,
    'fileName' | 'extractedAt' | 'summary'
  >;

  constructor() {
    this.analysis = {
      functions: [],
      stateVariables: [],
      events: [],
      modifiers: [],
      structs: [],
      enums: [],
      imports: [],
      inheritance: [],
      pragma: null,
    };
  }

  /**
   * Extract contract information from a Solidity file
   */
  async extractFromFile(filePath: string): Promise<AnalysisResult> {
    const content = fs.readFileSync(filePath, 'utf8');
    return this.extractFromSource(content, filePath);
  }

  /**
   * Extract contract information from source code
   */
  extractFromSource(source: string, fileName = 'unknown'): AnalysisResult {
    this.analysis = {
      functions: [],
      stateVariables: [],
      events: [],
      modifiers: [],
      structs: [],
      enums: [],
      imports: [],
      inheritance: [],
      pragma: null,
    };

    try {
      const ast = Parser.parse(source, {
        loc: true,
        range: true,
      });

      // AST visitor with typed node handlers
      Parser.visit(ast, {
        PragmaDirective: (node: any) => {
          this.analysis.pragma = {
            name: node.name,
            value: node.value,
          };
        },

        ImportDirective: (node: any) => {
          this.analysis.imports.push({
            path: node.path,
            symbols: node.symbols || [],
          });
        },

        ContractDefinition: (node: any) => {
          // Track inheritance
          if (node.baseContracts && node.baseContracts.length > 0) {
            this.analysis.inheritance = node.baseContracts.map((base: any) => ({
              name: base.baseName.namePath,
              type: base.baseName.type,
            }));
          }
        },

        FunctionDefinition: (node: any) => {
          const func: FunctionInfo = {
            name: node.name || 'fallback',
            visibility: node.visibility || 'internal',
            stateMutability: node.stateMutability || 'nonpayable',
            isConstructor: node.isConstructor || false,
            isReceiveEther: node.isReceiveEther || false,
            isFallback: node.isFallback || false,
            parameters: this.extractParameters(node.parameters),
            returnParameters: this.extractParameters(node.returnParameters),
            modifiers: (node.modifiers || []).map((mod: any) => mod.name),
            complexity: this.calculateComplexity(node),
            estimatedGas: this.estimateGas(node),
            signature: '',
            loc: node.loc,
          };

          // Generate function signature
          const paramTypes = func.parameters.map(p => p.type);
          func.signature = `${func.name}(${paramTypes.join(',')})`;

          this.analysis.functions.push(func);
        },

        StateVariableDeclaration: (node: any) => {
          for (const variable of node.variables) {
            this.analysis.stateVariables.push({
              name: variable.name,
              type: this.extractType(variable.typeName),
              visibility: variable.visibility || 'internal',
              isConstant: variable.isConstant || false,
              isImmutable: variable.isImmutable || false,
              loc: variable.loc,
            });
          }
        },

        EventDefinition: (node: any) => {
          this.analysis.events.push({
            name: node.name,
            parameters: this.extractParameters(node.parameters),
            anonymous: node.anonymous || false,
            loc: node.loc,
          });
        },

        ModifierDefinition: (node: any) => {
          this.analysis.modifiers.push({
            name: node.name,
            parameters: this.extractParameters(node.parameters),
            loc: node.loc,
          });
        },

        StructDefinition: (node: any) => {
          this.analysis.structs.push({
            name: node.name,
            members: node.members.map((member: any) => ({
              name: member.name,
              type: this.extractType(member.typeName),
            })),
            loc: node.loc,
          });
        },

        EnumDefinition: (node: any) => {
          this.analysis.enums.push({
            name: node.name,
            members: node.members.map((member: any) => member.name),
            loc: node.loc,
          });
        },
      });

      return {
        ...this.analysis,
        fileName,
        extractedAt: new Date().toISOString(),
        summary: this.generateSummary(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to parse Solidity file: ${errorMessage}`);
    }
  }

  /**
   * Extract parameter information
   */
  private extractParameters(parameters: unknown): ParameterInfo[] {
    if (
      !parameters ||
      typeof parameters !== 'object' ||
      !('parameters' in parameters)
    ) {
      return [];
    }

    const paramList = parameters as { parameters: unknown[] };
    return paramList.parameters.map((param: unknown) => {
      const p = param as {
        name?: string;
        typeName: unknown;
        indexed?: boolean;
      };
      return {
        name: p.name || 'unnamed',
        type: this.extractType(p.typeName),
        indexed: p.indexed || false,
      };
    });
  }

  /**
   * Extract type information from type node
   */
  private extractType(typeNode: unknown): string {
    if (!typeNode || typeof typeNode !== 'object') {
      return 'unknown';
    }

    const node = typeNode as {
      type: string;
      name?: string;
      namePath?: string;
      baseTypeName?: unknown;
      keyType?: unknown;
      valueType?: unknown;
      length?: string | number;
    };

    switch (node.type) {
      case 'ElementaryTypeName': {
        return node.name || 'unknown';
      }
      case 'UserDefinedTypeName': {
        return node.namePath || 'unknown';
      }
      case 'ArrayTypeName': {
        const baseType = this.extractType(node.baseTypeName);
        return node.length ? `${baseType}[${node.length}]` : `${baseType}[]`;
      }
      case 'MappingTypeName': {
        const keyType = this.extractType(node.keyType);
        const valueType = this.extractType(node.valueType);
        return `mapping(${keyType} => ${valueType})`;
      }
      default: {
        return node.type || 'unknown';
      }
    }
  }

  /**
   * Calculate function complexity score
   */
  private calculateComplexity(functionNode: unknown): number {
    if (!functionNode || typeof functionNode !== 'object') {
      return 1;
    }

    const node = functionNode as {
      parameters?: { parameters?: unknown[] };
      returnParameters?: { parameters?: unknown[] };
      modifiers?: unknown[];
      body?: unknown;
    };

    let complexity = 1; // Base complexity

    // Add complexity for parameters
    const paramCount = node.parameters?.parameters?.length || 0;
    complexity += paramCount * 0.5;

    // Add complexity for return parameters
    const returnCount = node.returnParameters?.parameters?.length || 0;
    complexity += returnCount * 0.5;

    // Add complexity for modifiers
    const modifierCount = node.modifiers?.length || 0;
    complexity += modifierCount;

    // Would need to walk the AST to count loops, conditions, etc.
    // For now, use a simple heuristic based on function body presence
    if (node.body) {
      complexity += 2; // Has implementation
    }

    return Math.round(complexity * 10) / 10;
  }

  /**
   * Estimate gas usage for a function
   */
  private estimateGas(functionNode: unknown): number {
    if (!functionNode || typeof functionNode !== 'object') {
      return 21000;
    }

    const node = functionNode as {
      visibility?: string;
      stateMutability?: string;
      parameters?: { parameters?: unknown[] };
      modifiers?: unknown[];
    };

    let gasEstimate = 21000; // Base transaction cost

    // Add gas based on visibility
    if (node.visibility === 'public' || node.visibility === 'external') {
      gasEstimate += 5000;
    }

    // Add gas based on state mutability
    if (node.stateMutability === 'view' || node.stateMutability === 'pure') {
      gasEstimate = 3000; // Much lower for read-only functions
    } else {
      gasEstimate += 10000; // State-changing functions cost more
    }

    // Add gas based on parameter complexity
    const paramCount = node.parameters?.parameters?.length || 0;
    gasEstimate += paramCount * 1000;

    // Add gas for modifiers
    const modifierCount = node.modifiers?.length || 0;
    gasEstimate += modifierCount * 2000;

    return Math.min(gasEstimate, 100000); // Cap at reasonable limit
  }

  /**
   * Generate analysis summary
   */
  private generateSummary(): AnalysisSummary {
    const publicFunctions = this.analysis.functions.filter(
      f => f.visibility === 'public' || f.visibility === 'external'
    );

    const totalComplexity = this.analysis.functions.reduce(
      (sum, f) => sum + f.complexity,
      0
    );
    const totalGasEstimate = this.analysis.functions.reduce(
      (sum, f) => sum + f.estimatedGas,
      0
    );

    return {
      totalFunctions: this.analysis.functions.length,
      publicFunctions: publicFunctions.length,
      stateVariables: this.analysis.stateVariables.length,
      events: this.analysis.events.length,
      modifiers: this.analysis.modifiers.length,
      averageComplexity:
        this.analysis.functions.length > 0
          ? Math.round(
              (totalComplexity / this.analysis.functions.length) * 100
            ) / 100
          : 0,
      totalGasEstimate,
      hasInheritance: this.analysis.inheritance.length > 0,
      solcVersion: this.analysis.pragma?.value || 'unknown',
    };
  }

  /**
   * Find function dependencies (calls to other functions)
   */
  findFunctionDependencies(): { [functionName: string]: string[] } {
    // This would require more sophisticated AST walking
    // For now, return empty dependencies
    const dependencies: { [functionName: string]: string[] } = {};

    this.analysis.functions.forEach(func => {
      dependencies[func.name] = [];
    });

    return dependencies;
  }

  /**
   * Detect potential security issues
   */
  detectSecurityIssues(): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Check for dangerous patterns
    this.analysis.functions.forEach(func => {
      // Check for unprotected state-changing functions
      if (
        (func.visibility === 'public' || func.visibility === 'external') &&
        func.stateMutability !== 'view' &&
        func.stateMutability !== 'pure' &&
        func.modifiers.length === 0
      ) {
        issues.push({
          type: 'unprotected-function',
          function: func.name,
          severity: 'medium',
          message: 'Public state-changing function without access control',
        });
      }

      // Check for receive/fallback functions
      if (func.isReceiveEther || func.isFallback) {
        issues.push({
          type: 'ether-handling',
          function: func.name,
          severity: 'low',
          message: 'Function can receive Ether - ensure proper handling',
        });
      }
    });

    return issues;
  }
}

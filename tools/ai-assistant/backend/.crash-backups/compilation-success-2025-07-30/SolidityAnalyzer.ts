import { parse } from '@solidity-parser/parser';
import * as solc from 'solc';
import { keccak256 } from 'ethers';
import {
  ParsedContract,
  FunctionInfo,
  VariableInfo,
  EventInfo,
  ModifierInfo,
  ImportInfo,
  ParameterInfo,
  SourceLocation,
  StorageSlot,
  CompilationError,
  AnalysisError,
  ManifestRoute,
  FacetCandidate
} from '../types/index';

// Define AST node types to replace 'any'
interface ASTNode {
  type: string;
  name?: string;
  loc?: {
    start?: { line: number; column: number };
    end?: { line: number; column: number };
  };
  range?: [number, number];
  [key: string]: unknown;
}

interface ContractNode extends ASTNode {
  type: 'ContractDefinition';
  name: string;
  baseContracts?: Array<{
    baseName: { namePath: string };
  }>;
}

interface FunctionNode extends ASTNode {
  type: 'FunctionDefinition';
  name?: string;
  isConstructor?: boolean;
  visibility?: 'public' | 'external' | 'internal' | 'private';
  stateMutability?: 'pure' | 'view' | 'payable' | 'nonpayable';
  parameters?: ParameterListNode;
  returnParameters?: ParameterListNode;
  modifiers?: Array<{ name: string }>;
  body?: ASTNode;
}

interface ParameterListNode extends ASTNode {
  parameters?: Array<{
    name?: string;
    typeName: TypeNode;
    isIndexed?: boolean;
  }>;
}

interface TypeNode extends ASTNode {
  type: string;
  name?: string;
  namePath?: string;
  baseTypeName?: TypeNode;
  keyType?: TypeNode;
  valueType?: TypeNode;
  length?: string | number;
}

interface VariableNode extends ASTNode {
  name: string;
  typeName: TypeNode;
  visibility?: 'public' | 'internal' | 'private';
  isConstant?: boolean;
  isImmutable?: boolean;
  expression?: ASTNode;
}

interface EventNode extends ASTNode {
  type: 'EventDefinition';
  name: string;
  parameters?: ParameterListNode;
}

interface ModifierNode extends ASTNode {
  type: 'ModifierDefinition';
  name: string;
  parameters?: ParameterListNode;
}

interface ImportNode extends ASTNode {
  type: 'ImportDirective';
  path: string;
  symbolAliases?: Array<{ foreign: string }>;
}

interface CompilationOutput {
  contracts?: {
    [filename: string]: {
      [contractName: string]: {
        abi?: unknown[];
        evm?: {
          bytecode?: { object?: string };
          deployedBytecode?: { object?: string };
          gasEstimates?: unknown;
        };
        storageLayout?: {
          storage?: Array<{
            slot: string;
            offset: number;
            type: string;
            label: string;
          }>;
          types?: Record<string, { numberOfBytes?: number }>;
        };
      };
    };
  };
  errors?: Array<{ severity: string; message: string }>;
}

export class SolidityAnalyzer {
  constructor() {
    // Parser and compiler are used directly
  }

  /**
   * Parse and analyze a Solidity contract
   */
  async parseContract(sourceCode: string, contractName?: string): Promise<ParsedContract> {
    try {
      // Parse the AST
      const ast = parse(sourceCode, {
        loc: true,
        range: true,
        tolerant: false
      });

      // Compile to get additional metadata
      const compiled = await this.compileContract(sourceCode, contractName);
      
      // Extract contract information
      const contractNode = this.findContractNode(ast, contractName);
      if (!contractNode) {
        throw new AnalysisError('Contract not found in source code');
      }

      const functions = this.extractFunctions(contractNode, sourceCode);
      const variables = this.extractVariables(contractNode, sourceCode);
      const events = this.extractEvents(contractNode, sourceCode);
      const modifiers = this.extractModifiers(contractNode, sourceCode);
      const imports = this.extractImports(ast);
      const inheritance = this.extractInheritance(contractNode);
      const storageLayout = this.extractStorageLayout(compiled);
      const totalSize = this.estimateContractSize(compiled);
      
      // PayRox Go Beyond specific analysis
      const facetCandidates = this.identifyFacetCandidates(functions);
      const manifestRoutes = this.generateManifestRoutes(functions, compiled);
      const chunkingRequired = this.requiresChunking(totalSize);
      const runtimeCodehash = this.calculateRuntimeCodehash(compiled);
      const storageCollisions = this.detectStorageCollisions(variables);
      const deploymentStrategy = this.determineDeploymentStrategy(totalSize, functions.length);

      return {
        name: contractNode.name,
        sourceCode,
        ast,
        functions,
        variables,
        events,
        modifiers,
        imports,
        inheritance,
        totalSize,
        storageLayout,
        facetCandidates,
        manifestRoutes,
        chunkingRequired,
        runtimeCodehash,
        storageCollisions,
        deploymentStrategy
      };

    } catch (error: unknown) {
      if (error instanceof AnalysisError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new AnalysisError(`Failed to parse contract: ${errorMessage}`, error);
    }
  }

  /**
   * Compile Solidity source code
   */
  private async compileContract(sourceCode: string, _contractName?: string): Promise<Record<string, unknown>> {
    const input = {
      language: 'Solidity',
      sources: {
        'contract.sol': {
          content: sourceCode
        }
      },
      settings: {
        outputSelection: {
          '*': {
            '*': [
              'abi',
              'evm.bytecode',
              'evm.deployedBytecode',
              'evm.gasEstimates',
              'storageLayout',
              'devdoc',
              'userdoc'
            ]
          }
        },
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    };

    try {
      const output = JSON.parse(solc.compile(JSON.stringify(input)));
      
      if (output.errors) {
        const errors = output.errors.filter((err: { severity: string }) => err.severity === 'error');
        if (errors.length > 0) {
          throw new CompilationError('Compilation failed', errors);
        }
      }

      return output;
    } catch (error: unknown) {
      if (error instanceof CompilationError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new CompilationError(`Compilation failed: ${errorMessage}`, error);
    }
  }

  /**
   * Find the main contract node in AST
   */
  private findContractNode(ast: unknown, contractName?: string): ContractNode | null {
    const contractNodes: ContractNode[] = [];
    
    this.visitNode(ast as ASTNode, (node) => {
      if (node.type === 'ContractDefinition') {
        contractNodes.push(node as ContractNode);
      }
    });

    if (contractName) {
      const found = contractNodes.find(node => node.name === contractName);
      if (found) {
        return found;
      }
    }

    // Return the last contract (usually the main one)
    return contractNodes[contractNodes.length - 1] || null;
  }

  /**
   * Extract function information
   */
  private extractFunctions(contractNode: ContractNode, sourceCode: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];

    this.visitNode(contractNode, (node) => {
      if (node.type === 'FunctionDefinition') {
        const functionNode = node as FunctionNode;
        const functionInfo: FunctionInfo = {
          name: functionNode.name || (functionNode.isConstructor ? 'constructor' : 'fallback'),
          selector: this.calculateSelector(functionNode),
          signature: this.buildFunctionSignature(functionNode),
          visibility: functionNode.visibility || 'public',
          stateMutability: functionNode.stateMutability || 'nonpayable',
          parameters: this.extractParameters(functionNode.parameters),
          returnParameters: this.extractParameters(functionNode.returnParameters),
          modifiers: this.extractFunctionModifiers(functionNode),
          gasEstimate: this.estimateFunctionGas(functionNode),
          dependencies: this.findFunctionDependencies(functionNode, sourceCode),
          codeSize: this.estimateFunctionSize(functionNode, sourceCode),
          sourceLocation: this.getSourceLocation(functionNode, sourceCode)
        };

        functions.push(functionInfo);
      }
    });

    return functions;
  }

  /**
   * Extract state variables
   */
  private extractVariables(contractNode: ContractNode, sourceCode: string): VariableInfo[] {
    const variables: VariableInfo[] = [];
    let slotCounter = 0;

    this.visitNode(contractNode, (node) => {
      if (node.type === 'StateVariableDeclaration') {
        const variables_node = node as unknown as { variables: VariableNode[] };
        if (variables_node.variables) {
          for (const variable of variables_node.variables) {
            const variableInfo: VariableInfo = {
              name: variable.name,
              type: this.typeToString(variable.typeName),
              visibility: variable.visibility || 'internal',
              constant: variable.isConstant || false,
              immutable: variable.isImmutable || false,
              slot: slotCounter,
              offset: 0,
              size: this.calculateVariableSize(variable.typeName),
              dependencies: this.findVariableDependencies(variable, sourceCode),
              sourceLocation: this.getSourceLocation(variable, sourceCode)
            };

            // Update slot counter based on variable size
            slotCounter += Math.ceil(variableInfo.size / 32);
            
            variables.push(variableInfo);
          }
        }
      }
    });

    return variables;
  }

  /**
   * Extract events
   */
  private extractEvents(contractNode: ContractNode, sourceCode: string): EventInfo[] {
    const events: EventInfo[] = [];

    this.visitNode(contractNode, (node) => {
      if (node.type === 'EventDefinition') {
        const eventInfo: EventInfo = {
          name: node.name || '',
          signature: this.buildEventSignature(node as unknown as EventNode),
          parameters: this.extractParameters((node as any).parameters || { type: 'ParameterList', parameters: [] }),
          indexed: (node as any).parameters?.map?.((param: any) => param.isIndexed || false) || [],
          sourceLocation: this.getSourceLocation(node, sourceCode)
        };

        events.push(eventInfo);
      }
    });

    return events;
  }

  /**
   * Extract modifiers
   */
  private extractModifiers(contractNode: any, sourceCode: string): ModifierInfo[] {
    const modifiers: ModifierInfo[] = [];

    this.visitNode(contractNode, (node) => {
      if (node.type === 'ModifierDefinition') {
        const modifierInfo: ModifierInfo = {
          name: node.name || '',
          parameters: this.extractParameters((node as any).parameters || { type: 'ParameterList', parameters: [] }),
          sourceLocation: this.getSourceLocation(node, sourceCode)
        };

        modifiers.push(modifierInfo);
      }
    });

    return modifiers;
  }

  /**
   * Extract import statements
   */
  private extractImports(ast: any): ImportInfo[] {
    const imports: ImportInfo[] = [];

    this.visitNode(ast, (node) => {
      if (node.type === 'ImportDirective') {
        const importInfo: ImportInfo = {
          path: (node as any).path || '',
          symbols: (node as any).symbolAliases?.map?.((alias: any) => alias.foreign) || [],
          sourceLocation: this.getSourceLocation(node, '')
        };

        imports.push(importInfo);
      }
    });

    return imports;
  }

  /**
   * Extract inheritance information
   */
  private extractInheritance(contractNode: any): string[] {
    return contractNode.baseContracts?.map((base: any) => base.baseName.namePath) || [];
  }

  /**
   * Extract storage layout from compilation output
   */
  private extractStorageLayout(compiled: any): StorageSlot[] {
    const storageLayout: StorageSlot[] = [];
    
    try {
      const contracts = compiled.contracts?.['contract.sol'];
      if (!contracts) {
        return storageLayout;
      }

      for (const [contractName, contractData] of Object.entries(contracts)) {
        const layout = (contractData as any).storageLayout;
        if (layout?.storage) {
          for (const storage of layout.storage) {
            storageLayout.push({
              slot: parseInt(storage.slot),
              offset: storage.offset,
              size: this.calculateTypeSize(storage.type, layout.types),
              type: storage.type,
              variable: storage.label,
              contract: contractName
            });
          }
        }
      }
    } catch (error) {
      console.warn('Failed to extract storage layout:', error);
    }

    return storageLayout;
  }

  /**
   * Calculate function selector (4-byte hash)
   */
  private calculateSelector(functionNode: FunctionNode): string {
    if (!functionNode.name || functionNode.isConstructor) {
      return '0x00000000';
    }

    const signature = this.buildFunctionSignature(functionNode);
    const hash = keccak256(Buffer.from(signature, 'utf8'));
    return hash.slice(0, 10); // First 4 bytes (8 hex chars + 0x)
  }

  /**
   * Build function signature string
   */
  private buildFunctionSignature(functionNode: FunctionNode): string {
    if (!functionNode.name || functionNode.isConstructor) {
      return 'constructor';
    }

    const params = functionNode.parameters?.parameters?.map((param) => 
      this.typeToString(param.typeName)
    ).join(',') || '';

    return `${functionNode.name}(${params})`;
  }

  /**
   * Build event signature string
   */
  private buildEventSignature(eventNode: EventNode): string {
    const params = eventNode.parameters?.parameters?.map((param) => 
      this.typeToString(param.typeName)
    ).join(',') || '';

    return `${eventNode.name}(${params})`;
  }

  /**
   * Extract parameters from parameter list
   */
  private extractParameters(parameterList: ParameterListNode | undefined): ParameterInfo[] {
    if (!parameterList?.parameters) {
      return [];
    }

    return parameterList.parameters.map((param) => ({
      name: param.name || '',
      type: this.typeToString(param.typeName),
      indexed: param.isIndexed || false
    }));
  }

  /**
   * Extract function modifiers
   */
  private extractFunctionModifiers(functionNode: FunctionNode): string[] {
    return functionNode.modifiers?.map((modifier) => modifier.name) || [];
  }

  /**
   * Convert type node to string representation
   */
  private typeToString(typeNode: TypeNode): string {
    if (!typeNode) {
      return 'unknown';
    }

    switch (typeNode.type) {
      case 'ElementaryTypeName':
        return typeNode.name || 'unknown';
      case 'UserDefinedTypeName':
        return typeNode.namePath || 'unknown';
      case 'ArrayTypeName': {
        const baseType = typeNode.baseTypeName ? this.typeToString(typeNode.baseTypeName) : 'unknown';
        const length = typeNode.length ? `[${typeNode.length}]` : '[]';
        return `${baseType}${length}`;
      }
      case 'MappingTypeName': {
        const keyType = typeNode.keyType ? this.typeToString(typeNode.keyType) : 'unknown';
        const valueType = typeNode.valueType ? this.typeToString(typeNode.valueType) : 'unknown';
        return `mapping(${keyType} => ${valueType})`;
      }
      default:
        return typeNode.name || 'unknown';
    }
  }

  /**
   * Estimate contract bytecode size
   */
  private estimateContractSize(compiled: any): number {
    try {
      const contracts = compiled.contracts?.['contract.sol'];
      if (!contracts) {
        return 0;
      }

      let maxSize = 0;
      for (const [, contractData] of Object.entries(contracts)) {
        const bytecode = (contractData as any).evm?.deployedBytecode?.object;
        if (bytecode) {
          const size = Buffer.from(bytecode.replace('0x', ''), 'hex').length;
          maxSize = Math.max(maxSize, size);
        }
      }

      return maxSize;
    } catch (error) {
      console.warn('Failed to estimate contract size:', error);
      return 0;
    }
  }

  /**
   * Estimate function gas usage
   */
  private estimateFunctionGas(functionNode: any): number {
    // Basic estimation based on function complexity
    let gasEstimate = 21000; // Base transaction cost

    // Add gas for function complexity
    if (functionNode.body) {
      gasEstimate += this.estimateBlockGas(functionNode.body) * 1000;
    }

    // Add gas for modifiers
    gasEstimate += (functionNode.modifiers?.length || 0) * 5000;

    // Add gas for state mutability
    switch (functionNode.stateMutability) {
      case 'view':
      case 'pure':
        gasEstimate = Math.min(gasEstimate, 10000);
        break;
      case 'payable':
        gasEstimate += 10000;
        break;
    }

    return gasEstimate;
  }

  /**
   * Estimate function code size in bytes
   */
  private estimateFunctionSize(functionNode: any, sourceCode: string): number {
    if (!functionNode.body) {
      return 100; // Minimal function
    }

    const location = this.getSourceLocation(functionNode, sourceCode);
    const functionCode = sourceCode.slice(location.start, location.end);
    
    // Rough estimation: 1 byte per 2 characters of source (accounting for compilation)
    return Math.ceil(functionCode.length / 2);
  }

  /**
   * Find function dependencies (other functions called)
   */
  private findFunctionDependencies(functionNode: any, _sourceCode: string): string[] {
    const dependencies: Set<string> = new Set();

    this.visitNode(functionNode, (node) => {
      if (node.type === 'FunctionCall' && node.name) {
        dependencies.add(node.name);
      }
      if (node.type === 'MemberAccess' && (node as any).memberName) {
        dependencies.add((node as any).memberName);
      }
    });

    return Array.from(dependencies);
  }

  /**
   * Find variable dependencies
   */
  private findVariableDependencies(variableNode: any, _sourceCode: string): string[] {
    const dependencies: Set<string> = new Set();

    if (variableNode.expression) {
      this.visitNode(variableNode.expression, (node) => {
        if (node.type === 'Identifier' && node.name) {
          dependencies.add(node.name);
        }
      });
    }

    return Array.from(dependencies);
  }

  /**
   * Calculate variable storage size in bytes
   */
  private calculateVariableSize(typeNode: any): number {
    const typeString = this.typeToString(typeNode);
    
    // Basic size mapping
    const sizeMap: Record<string, number> = {
      'bool': 1,
      'uint8': 1,
      'uint16': 2,
      'uint32': 4,
      'uint64': 8,
      'uint128': 16,
      'uint256': 32,
      'int8': 1,
      'int16': 2,
      'int32': 4,
      'int64': 8,
      'int128': 16,
      'int256': 32,
      'address': 20,
      'bytes32': 32,
    };

    // Handle basic types
    if (sizeMap[typeString]) {
      return sizeMap[typeString];
    }

    // Handle dynamic types
    if (typeString.includes('[]') || typeString.startsWith('mapping')) {
      return 32; // Storage slot pointer
    }

    // Handle fixed-size arrays
    const arrayMatch = typeString.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch && arrayMatch[2]) {
      const baseSize = this.calculateVariableSize({ type: 'ElementaryTypeName', name: arrayMatch[1] });
      const length = parseInt(arrayMatch[2]);
      return baseSize * length;
    }

    // Default to 32 bytes for unknown types
    return 32;
  }

  /**
   * Calculate type size from storage layout
   */
  private calculateTypeSize(type: string, types: any): number {
    const typeInfo = types[type];
    if (typeInfo) {
      return typeInfo.numberOfBytes || 32;
    }
    return 32;
  }

  /**
   * Estimate gas usage for a code block
   */
  private estimateBlockGas(blockNode: any): number {
    let gasEstimate = 0;

    this.visitNode(blockNode, (node) => {
      switch (node.type) {
        case 'AssignmentOperator':
          gasEstimate += 5; // SSTORE cost
          break;
        case 'FunctionCall':
          gasEstimate += 3; // CALL cost
          break;
        case 'IfStatement':
          gasEstimate += 1; // JUMPI cost
          break;
        case 'ForStatement':
        case 'WhileStatement':
          gasEstimate += 10; // Loop overhead
          break;
        default:
          gasEstimate += 0.1; // Basic operations
      }
    });

    return gasEstimate;
  }

  /**
   * Get source location information
   */
  private getSourceLocation(node: any, sourceCode: string): SourceLocation {
    if (node.loc) {
      return {
        start: node.range?.[0] || 0,
        end: node.range?.[1] || 0,
        line: node.loc.start?.line || 0,
        column: node.loc.start?.column || 0
      };
    }

    return {
      start: 0,
      end: sourceCode.length,
      line: 1,
      column: 1
    };
  }

  /**
   * Generic AST node visitor
   */
  private visitNode(node: ASTNode, callback: (node: ASTNode) => void): void {
    if (!node) {
      return;
    }

    callback(node);

    // Visit child nodes
    for (const [key, value] of Object.entries(node)) {
      if (Array.isArray(value)) {
        value.forEach(child => {
          if (typeof child === 'object' && child !== null) {
            this.visitNode(child as ASTNode, callback);
          }
        });
      } else if (typeof value === 'object' && value !== null && key !== 'parent') {
        this.visitNode(value as ASTNode, callback);
      }
    }
  }

  // ===============================================
  // PayRox Go Beyond Specific Methods
  // ===============================================

  /**
   * Identify facet candidates based on function grouping strategies
   */
  private identifyFacetCandidates(functions: FunctionInfo[]): Map<string, FunctionInfo[]> {
    const facets = new Map<string, FunctionInfo[]>();

    for (const fn of functions) {
      let facetKey = "UtilityFacet";
      
      // Categorize by function patterns and access levels
      if (this.isAdminFunction(fn)) {
        facetKey = "AdminFacet";
      } else if (this.isGovernanceFunction(fn)) {
        facetKey = "GovernanceFacet";
      } else if (fn.stateMutability === "view" || fn.stateMutability === "pure") {
        facetKey = "ViewFacet";
      } else if (this.isCoreFunction(fn)) {
        facetKey = "CoreFacet";
      }

      if (!facets.has(facetKey)) {
        facets.set(facetKey, []);
      }
      const facetFunctions = facets.get(facetKey);
      if (facetFunctions) {
        facetFunctions.push(fn);
      }
    }

    return facets;
  }

  /**
   * Check if function is an admin function
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
   * Check if function is a governance function
   */
  private isGovernanceFunction(func: FunctionInfo): boolean {
    const governancePatterns = [
      /^propose/,
      /^vote/,
      /^execute/,
      /^delegate/,
      /^governance/,
      /^timelock/
    ];

    return governancePatterns.some(pattern => pattern.test(func.name));
  }

  /**
   * Check if function is a core business logic function
   */
  private isCoreFunction(func: FunctionInfo): boolean {
    // Functions that are not admin, governance, or view are considered core
    return !this.isAdminFunction(func) && 
           !this.isGovernanceFunction(func) && 
           func.stateMutability !== "view" && 
           func.stateMutability !== "pure";
  }

  /**
   * Generate manifest routes for PayRox Go Beyond deployment
   */
  private generateManifestRoutes(functions: FunctionInfo[], compiled: any): ManifestRoute[] {
    const routes: ManifestRoute[] = [];
    
    for (const func of functions) {
      // Skip constructor and fallback functions
      if (func.name === 'constructor' || func.name === 'fallback') {
        continue;
      }

      const route: ManifestRoute = {
        selector: func.selector,
        facet: "<predicted_facet_address>", // Will be filled during deployment
        codehash: this.calculateRuntimeCodehash(compiled),
        functionName: func.name,
        gasEstimate: func.gasEstimate,
        securityLevel: this.assessSecurityLevel(func)
      };

      routes.push(route);
    }

    return routes;
  }

  /**
   * Assess security level of a function
   */
  private assessSecurityLevel(func: FunctionInfo): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: Admin functions, fund transfers
    if (this.isAdminFunction(func) || func.name.includes('transfer') || func.name.includes('withdraw')) {
      return 'critical';
    }

    // High: State-changing functions with modifiers
    if (func.stateMutability !== 'view' && func.stateMutability !== 'pure' && func.modifiers.length > 0) {
      return 'high';
    }

    // Medium: State-changing functions without modifiers
    if (func.stateMutability !== 'view' && func.stateMutability !== 'pure') {
      return 'medium';
    }

    // Low: View and pure functions
    return 'low';
  }

  /**
   * Calculate runtime codehash for bytecode integrity verification
   */
  private calculateRuntimeCodehash(compiled: any): string {
    try {
      const contracts = compiled.contracts?.['contract.sol'];
      if (!contracts) {
        return '0x0000000000000000000000000000000000000000000000000000000000000000';
      }

      // Get the first contract's deployed bytecode
      for (const [, contractData] of Object.entries(contracts)) {
        const deployedBytecode = (contractData as any).evm?.deployedBytecode?.object;
        if (deployedBytecode) {
          const cleanBytecode = deployedBytecode.startsWith("0x") ? deployedBytecode : `0x${deployedBytecode}`;
          return keccak256(cleanBytecode);
        }
      }

      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    } catch (error) {
      console.warn('Failed to calculate runtime codehash:', error);
      return '0x0000000000000000000000000000000000000000000000000000000000000000';
    }
  }

  /**
   * Determine if contract requires chunking for DeterministicChunkFactory
   */
  private requiresChunking(totalSize: number): boolean {
    const SAFE_CHUNK_LIMIT = 24000; // Safe limit below EIP-170 (24,576 bytes)
    return totalSize > SAFE_CHUNK_LIMIT;
  }

  /**
   * Detect storage layout collisions for facet isolation
   */
  private detectStorageCollisions(variables: VariableInfo[]): string[] {
    const slotMap = new Map<number, string[]>();
    const collisions: string[] = [];

    for (const variable of variables) {
      if (!slotMap.has(variable.slot)) {
        slotMap.set(variable.slot, []);
      }
      const slotVars = slotMap.get(variable.slot);
      if (slotVars) {
        slotVars.push(variable.name);
      }
    }

    // Check for collisions
    for (const [slot, vars] of Array.from(slotMap.entries())) {
      if (vars.length > 1) {
        collisions.push(`Potential storage collision at slot ${slot}: ${vars.join(', ')}`);
      }
    }

    // Check for diamond storage pattern compliance
    if (variables.length > 0 && !this.isDiamondStorageCompliant(variables)) {
      collisions.push('Contract may not be diamond storage compliant - consider using diamond storage pattern');
    }

    return collisions;
  }

  /**
   * Check if storage layout follows diamond storage patterns
   */
  private isDiamondStorageCompliant(variables: VariableInfo[]): boolean {
    // Look for diamond storage struct patterns
    const hasStorageStruct = variables.some(v => 
      v.name.toLowerCase().includes('storage') || 
      v.type.toLowerCase().includes('storage')
    );

    // Check if variables are properly isolated
    const hasProperIsolation = variables.every(v => 
      v.slot >= 0 && v.offset >= 0
    );

    return hasStorageStruct && hasProperIsolation;
  }

  /**
   * Determine optimal deployment strategy based on contract characteristics
   */
  private determineDeploymentStrategy(
    totalSize: number, 
    functionCount: number
  ): 'single' | 'faceted' | 'chunked' {
    const SIZE_THRESHOLD = 20000;      // Threshold for considering faceting
    const FUNCTION_THRESHOLD = 10;     // Threshold for considering faceting
    const CHUNK_THRESHOLD = 24000;     // Threshold for chunking

    if (totalSize > CHUNK_THRESHOLD) {
      return 'chunked';
    } else if (totalSize > SIZE_THRESHOLD || functionCount > FUNCTION_THRESHOLD) {
      return 'faceted';
    } else {
      return 'single';
    }
  }

  /**
   * Generate PayRox Go Beyond deployment manifest entry
   */
  generateManifestEntries(contract: ParsedContract): Record<string, unknown>[] {
    return contract.functions.map(fn => ({
      selector: fn.selector,
      facet: "<predicted_facet_address>",
      codehash: contract.runtimeCodehash || "<runtime_codehash>",
      functionName: fn.name,
      gasEstimate: fn.gasEstimate,
      securityLevel: this.assessSecurityLevel(fn)
    }));
  }

  /**
   * Generate facet-specific analysis report
   */
  generateFacetAnalysisReport(contract: ParsedContract): {
    facetRecommendations: FacetCandidate[];
    deploymentStrategy: string;
    gasOptimizations: string[];
    securityConsiderations: string[];
    chunkingStrategy?: string;
  } {
    const facetRecommendations: FacetCandidate[] = [];
    
    // Convert facet candidates to structured recommendations
    for (const [facetName, functions] of Array.from(contract.facetCandidates.entries())) {
      const candidate: FacetCandidate = {
        name: facetName,
        functions: functions,
        estimatedSize: functions.reduce((total, fn) => total + fn.codeSize, 0),
        category: this.categorizeFacet(facetName),
        dependencies: this.analyzeFacetDependencies(functions),
        storageRequirements: this.analyzeFacetStorage(functions)
      };
      
      facetRecommendations.push(candidate);
    }

    const gasOptimizations = this.generateGasOptimizations(contract);
    const securityConsiderations = this.generateSecurityConsiderations(contract);

    return {
      facetRecommendations,
      deploymentStrategy: contract.deploymentStrategy,
      gasOptimizations,
      securityConsiderations,
      ...(contract.chunkingRequired && { chunkingStrategy: 'DeterministicChunkFactory staging required' })
    };
  }

  /**
   * Categorize facet by name
   */
  private categorizeFacet(facetName: string): 'admin' | 'governance' | 'view' | 'utility' | 'core' {
    const name = facetName.toLowerCase();
    if (name.includes('admin')) {
      return 'admin';
    }
    if (name.includes('governance')) {
      return 'governance';
    }
    if (name.includes('view')) {
      return 'view';
    }
    if (name.includes('core')) {
      return 'core';
    }
    return 'utility';
  }

  /**
   * Analyze facet dependencies
   */
  private analyzeFacetDependencies(functions: FunctionInfo[]): string[] {
    const dependencies = new Set<string>();
    
    for (const func of functions) {
      for (const dep of func.dependencies) {
        dependencies.add(dep);
      }
    }
    
    return Array.from(dependencies);
  }

  /**
   * Analyze facet storage requirements
   */
  private analyzeFacetStorage(_functions: FunctionInfo[]): string[] {
    // This would analyze which storage variables are accessed by facet functions
    // For now, return a placeholder
    return ['Isolated diamond storage required'];
  }

  /**
   * Generate gas optimization suggestions
   */
  private generateGasOptimizations(contract: ParsedContract): string[] {
    const optimizations: string[] = [];

    if (contract.chunkingRequired) {
      optimizations.push('Deploy via DeterministicChunkFactory to avoid contract size limits');
    }

    if (contract.facetCandidates.size > 1) {
      optimizations.push('Modular facet deployment reduces individual deployment costs');
    }

    if (contract.storageCollisions.length > 0) {
      optimizations.push('Implement diamond storage pattern to avoid storage collisions');
    }

    const viewFunctions = contract.functions.filter(f => f.stateMutability === 'view' || f.stateMutability === 'pure');
    if (viewFunctions.length > 5) {
      optimizations.push('Consider separate ViewFacet for read-only operations');
    }

    return optimizations;
  }

  /**
   * Generate security considerations
   */
  private generateSecurityConsiderations(contract: ParsedContract): string[] {
    const considerations: string[] = [];

    const criticalFunctions = contract.functions.filter(f => 
      this.assessSecurityLevel(f) === 'critical'
    );
    
    if (criticalFunctions.length > 0) {
      considerations.push(`${criticalFunctions.length} critical functions require enhanced access control`);
    }

    if (contract.storageCollisions.length > 0) {
      considerations.push('Storage collisions detected - implement proper facet isolation');
    }

    const adminFunctions = contract.functions.filter(f => this.isAdminFunction(f));
    if (adminFunctions.length > 0) {
      considerations.push('Separate AdminFacet recommended for privileged functions');
    }

    if (contract.deploymentStrategy === 'chunked') {
      considerations.push('Chunked deployment requires additional integrity verification');
    }

    return considerations;
  }
}

export default SolidityAnalyzer;

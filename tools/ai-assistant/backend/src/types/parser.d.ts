// Type declarations for @solidity-parser/parser
declare module '@solidity-parser/parser' {
  export interface Location {
    start: { line: number; column: number };
    end: { line: number; column: number };
  }

  export interface BaseASTNode {
    type: string;
    range?: [number, number];
    loc?: Location;
  }

  export interface Identifier extends BaseASTNode {
    type: 'Identifier';
    name: string;
  }

  export interface ContractDefinition extends BaseASTNode {
    type: 'ContractDefinition';
    name: string;
    baseContracts: BaseASTNode[];
    subNodes: BaseASTNode[];
    kind: 'contract' | 'interface' | 'library';
  }

  export interface FunctionDefinition extends BaseASTNode {
    type: 'FunctionDefinition';
    name: string;
    parameters: BaseASTNode[];
    returnParameters: BaseASTNode[];
    modifiers: BaseASTNode[];
    stateMutability: string;
    visibility: string;
    body?: BaseASTNode;
    isConstructor?: boolean;
    isFallback?: boolean;
    isReceiveEther?: boolean;
  }

  export interface VariableDeclaration extends BaseASTNode {
    type: 'VariableDeclaration';
    typeName: BaseASTNode;
    name: string;
    expression?: BaseASTNode;
    visibility?: string;
    isStateVar: boolean;
    isDeclaredConst?: boolean;
    isImmutable?: boolean;
  }

  export interface EventDefinition extends BaseASTNode {
    type: 'EventDefinition';
    name: string;
    parameters: BaseASTNode[];
    isAnonymous: boolean;
  }

  export interface ModifierDefinition extends BaseASTNode {
    type: 'ModifierDefinition';
    name: string;
    parameters: BaseASTNode[];
    body?: BaseASTNode;
  }

  export interface ImportDirective extends BaseASTNode {
    type: 'ImportDirective';
    path: string;
    pathLiteral: string;
    symbolAliases?: BaseASTNode[];
    unitAlias?: string;
  }

  export interface SourceUnit extends BaseASTNode {
    type: 'SourceUnit';
    children: BaseASTNode[];
  }

  export type ASTNode = 
    | SourceUnit
    | ContractDefinition
    | FunctionDefinition
    | VariableDeclaration
    | EventDefinition
    | ModifierDefinition
    | ImportDirective
    | Identifier
    | BaseASTNode;

  export interface ParseOptions {
    loc?: boolean;
    range?: boolean;
    tolerant?: boolean;
  }

  export function parse(_input: string, _options?: ParseOptions): ASTNode;
}

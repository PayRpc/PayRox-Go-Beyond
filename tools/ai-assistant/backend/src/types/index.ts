// Core contract analysis types

// PayRox Go Beyond protocol limits - sync with constants/limits.ts
// Note: Direct import not available due to TypeScript configuration
// These values are kept in sync with constants/limits.ts
// const MAX_FACET_SIZE = 24576; // EIP_170_BYTECODE_LIMIT from constants/limits.ts
// const MAX_FACETS_TEST = 10; // MAX_FACETS_TEST from constants/limits.ts

// Type aliases for security levels and severities
export type SecurityLevel = 'low' | 'medium' | 'high' | 'critical';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type StatusLevel = 'passed' | 'warning' | 'failed';

// PayRox Go Beyond specific types
export interface ManifestRoute {
  selector: string;
  facet: string;
  codehash: string;
  functionName: string;
  gasEstimate: number;
  securityLevel: SecurityLevel;
}

export interface FacetCandidate {
  name: string;
  functions: FunctionInfo[];
  estimatedSize: number;
  category: 'admin' | 'governance' | 'view' | 'utility' | 'core';
  dependencies: string[];
  storageRequirements: string[];
}

export interface ParsedContract {
  name: string;
  sourceCode: string;
  ast: Record<string, unknown>;
  functions: FunctionInfo[];
  variables: VariableInfo[];
  events: EventInfo[];
  modifiers: ModifierInfo[];
  imports: ImportInfo[];
  inheritance: string[];
  totalSize: number;
  storageLayout: StorageSlot[];
  // PayRox Go Beyond specific fields
  facetCandidates: Map<string, FunctionInfo[]>;
  manifestRoutes: ManifestRoute[];
  chunkingRequired: boolean;
  runtimeCodehash?: string;
  storageCollisions: string[];
  deploymentStrategy: 'single' | 'faceted' | 'chunked';
}

export interface FunctionInfo {
  name: string;
  selector: string;
  signature: string;
  visibility: 'public' | 'external' | 'internal' | 'private';
  stateMutability: 'pure' | 'view' | 'payable' | 'nonpayable';
  parameters: ParameterInfo[];
  returnParameters: ParameterInfo[];
  modifiers: string[];
  gasEstimate: number;
  dependencies: string[];
  codeSize: number;
  sourceLocation: SourceLocation;
  body?: string; // Function implementation body
  hasLoops?: boolean; // Whether function contains loops
}

export interface VariableInfo {
  name: string;
  type: string;
  visibility: 'public' | 'internal' | 'private';
  constant: boolean;
  immutable: boolean;
  slot: number;
  offset: number;
  size: number;
  dependencies: string[];
  sourceLocation: SourceLocation;
}

export interface EventInfo {
  name: string;
  signature: string;
  parameters: ParameterInfo[];
  indexed: boolean[];
  sourceLocation: SourceLocation;
}

export interface ModifierInfo {
  name: string;
  parameters: ParameterInfo[];
  sourceLocation: SourceLocation;
}

export interface ImportInfo {
  path: string;
  symbols: string[];
  sourceLocation: SourceLocation;
}

export interface ParameterInfo {
  name: string;
  type: string;
  indexed?: boolean;
}

export interface SourceLocation {
  start: number;
  end: number;
  line: number;
  column: number;
}

export interface StorageSlot {
  slot: number;
  offset: number;
  size: number;
  type: string;
  variable: string;
  contract: string;
}

// Facet split and analysis types
export interface FacetSplit {
  id: string;
  name: string;
  description: string;
  functions: FunctionInfo[];
  variables: VariableInfo[];
  events: EventInfo[];
  modifiers: ModifierInfo[];
  estimatedSize: number;
  dependencies: string[];
  conflicts: StorageConflict[];
  gasEstimate: number;
  priority: number;
  category: FacetCategory;
}

export type FacetCategory =
  | 'core'
  | 'access'
  | 'token'
  | 'governance'
  | 'treasury'
  | 'utility'
  | 'admin'
  | 'custom';

export interface RefactorSuggestion {
  originalContract: ParsedContract;
  suggestedFacets: FacetSplit[];
  sharedLibraries: SharedLibrary[];
  storageStrategy: StorageStrategy;
  deploymentPlan: DeploymentPlan;
  warnings: RefactorWarning[];
  confidence: number;
  reasoning: string;
  alternatives: AlternativeSplit[];
}

export interface SharedLibrary {
  name: string;
  functions: FunctionInfo[];
  deploymentAddress?: string;
  gasOptimized: boolean;
  reusability: number;
}

export interface StorageStrategy {
  pattern: 'isolated' | 'shared' | 'registry' | 'hybrid';
  namespace: string;
  safetyLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  conflicts: StorageConflict[];
}

export interface StorageConflict {
  slot: number;
  offset: number;
  variables: Array<{
    facet: string;
    name: string;
    type: string;
    size: number;
  }>;
  severity: SeverityLevel;
  recommendations: string[];
}

export interface SlotInfo {
  variable: string;
  type: string;
  size: number;
  offset: number;
}

export interface DeploymentPlan {
  factory: DeploymentStep;
  dispatcher: DeploymentStep;
  facets: DeploymentStep[];
  manifests: ManifestStep[];
  totalGasEstimate: number;
  networkCompatibility: NetworkSupport[];
  securityChecks: SecurityCheck[];
}

export interface DeploymentStep {
  name: string;
  type: 'factory' | 'dispatcher' | 'facet' | 'library';
  bytecode: string;
  constructorArgs: Array<unknown>;
  gasEstimate: number;
  predictedAddress?: string;
  dependencies: string[];
  verification: VerificationInfo;
}

export interface ManifestStep {
  epoch: number;
  root: string;
  routes: RouteInfo[];
  merkleTree: string;
  activationDelay: number;
  governance: GovernanceInfo;
}

export interface RouteInfo {
  selector: string;
  facet: string;
  codehash: string;
  gasLimit: number;
  permissions: string[];
}

export interface VerificationInfo {
  create2Salt: string;
  contentHash: string;
  extcodesize: number;
  extcodehash: string;
  storageProof: string[];
}

export interface NetworkSupport {
  chainId: number;
  name: string;
  supported: boolean;
  gasMultiplier: number;
  additionalChecks: string[];
}

export interface SecurityCheck {
  type: 'access_control' | 'reentrancy' | 'overflow' | 'storage' | 'upgrade';
  status: 'passed' | 'warning' | 'failed';
  description: string;
  recommendation?: string;
  severity: SeverityLevel;
}

export interface GovernanceInfo {
  roles: RoleInfo[];
  timelock: number;
  multisig: boolean;
  freezeable: boolean;
  emergencyPause: boolean;
}

export interface RoleInfo {
  name: string;
  address: string;
  permissions: string[];
  description: string;
}

export interface RefactorWarning {
  type: 'size_limit' | 'gas_optimization' | 'security' | 'compatibility';
  severity: 'info' | 'warning' | 'error';
  message: string;
  suggestion?: string;
  affectedCode?: SourceLocation;
}

export interface AlternativeSplit {
  description: string;
  facets: FacetSplit[];
  tradeoffs: string[];
  confidence: number;
}

// AI Integration types
export interface AIAnalysisRequest {
  sourceCode: string;
  contractName?: string;
  analysisType: 'refactor' | 'optimize' | 'security' | 'storage';
  preferences: AnalysisPreferences;
  constraints: AnalysisConstraints;
}

export interface AnalysisPreferences {
  maxFacets: number;
  facetSizeLimit: number;
  gasOptimization: boolean;
  securityFocus: boolean;
  upgradeability: boolean;
  categories: FacetCategory[];
}

export interface AnalysisConstraints {
  networkGasLimit: number;
  deploymentBudget: number;
  timeConstraints: boolean;
  auditRequirements: boolean;
  complianceNeeds: string[];
}

// WebSocket real-time communication
export interface WSMessage {
  type: WSMessageType;
  requestId: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export type WSMessageType =
  | 'analysis_start'
  | 'analysis_progress'
  | 'analysis_complete'
  | 'analysis_error'
  | 'compilation_start'
  | 'compilation_complete'
  | 'deployment_simulation'
  | 'storage_check'
  | 'gas_estimation'
  | 'security_scan';

export interface AnalysisProgress {
  stage: string;
  progress: number;
  message: string;
  currentTask: string;
  estimatedTimeRemaining: number;
}

// Note: Zod validation schemas removed due to module resolution issues
// The validation logic has been moved to runtime validation functions

// API Response types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requestId: string;
  timestamp: number;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Error types
export class AIAssistantError extends Error {
  constructor(
    message: string,
    public readonly _code: string,
    public readonly _statusCode: number = 500,
    public readonly _details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AIAssistantError';
  }
}

export class ValidationError extends AIAssistantError {
  constructor(message: string, _details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, _details);
    this.name = 'ValidationError';
  }
}

export class CompilationError extends AIAssistantError {
  constructor(message: string, _details?: Record<string, unknown>) {
    super(message, 'COMPILATION_ERROR', 422, _details);
    this.name = 'CompilationError';
  }
}

export class AnalysisError extends AIAssistantError {
  constructor(message: string, _details?: Record<string, unknown>) {
    super(message, 'ANALYSIS_ERROR', 500, _details);
    this.name = 'AnalysisError';
  }
}

// Additional types for refactoring wizard
export interface FacetSuggestion {
  name: string;
  description: string;
  functions: string[];
  estimatedSize: number;
  gasOptimization: 'Low' | 'Medium' | 'High';
  securityRating: SecurityLevel;
  dependencies: string[];
  reasoning: string;
}

export interface RefactorPlan {
  facets: FacetSuggestion[];
  sharedComponents: string[];
  deploymentStrategy: 'sequential' | 'parallel' | 'mixed';
  estimatedGasSavings: number;
  warnings: string[];
  callGraph?: any; // Optional call graph data
  compatibilityReport?: any; // Optional compatibility report
}

export interface FacetDefinition {
  name: string;
  sourceCode: string;
  functions: FunctionInfo[];
  selector: string;
  dependencies: string[];
  estimatedGas: number;
  securityLevel: string;
}

export interface RefactorResult {
  facets: FacetDefinition[];
  sharedComponents: {
    interfaces: Record<string, string>;
    libraries: Record<string, string>;
    storage: string;
  };
  deploymentConfig: {
    facets: Array<{
      name: string;
      selector: string;
      estimatedGas: number;
    }>;
    deploymentOrder: string[];
    estimatedTotalGas: number;
  };
  estimatedGasSavings: number;
  warnings: string[];
  originalContract: ParsedContract;
}

// Simulation types
export interface SimulationResult {
  name?: string;
  description?: string;
  success: boolean;
  gasEstimate: number;
  gasUsed?: number;
  executionTime?: number;
  errors: string[];
  warnings: string[];
  results: Record<string, unknown>;
  recommendations: string[];
  steps?: Array<{
    name: string;
    success: boolean;
    gasUsed: number;
    result: string;
    warnings: string[];
    abiDecoded?: {
      functionName: string;
      inputs: Record<string, unknown>;
      outputs: Record<string, unknown>;
    };
    transactionHash?: string;
    blockNumber?: number;
  }>;
  expectedGas?: number;
  gasEfficiency?: number;
  contractInteractions?: Array<{
    contract: string;
    function: string;
    success: boolean;
    gasUsed: number;
    returnValue: unknown;
  }>;
}

// ABI and contract integration types
export interface ABIFunction {
  name: string;
  type: 'function' | 'constructor' | 'receive' | 'fallback';
  inputs: Array<{
    name: string;
    type: string;
    internalType?: string;
    components?: ABIFunction['inputs'];
  }>;
  outputs?: Array<{
    name: string;
    type: string;
    internalType?: string;
    components?: ABIFunction['inputs'];
  }>;
  stateMutability: 'pure' | 'view' | 'payable' | 'nonpayable';
}

export interface ContractABI {
  contractName: string;
  abi: ABIFunction[];
  bytecode: string;
  deployedBytecode: string;
  linkReferences?: Record<string, unknown>;
}

export interface TestStep {
  facet: string;
  function: string;
  parameters: Array<{
    name: string;
    type: string;
    value: unknown;
  }>;
  target?: string;
  action?: string;
  expectation?: 'success' | 'failure' | 'partial';
  abiFunction?: ABIFunction;
}

export interface TestScenario {
  name: string;
  description: string;
  steps: TestStep[];
  expectedGas: number;
  expectedResults: Array<{
    step: number;
    success: boolean;
    value: unknown;
    gasUsed?: number;
  }>;
  expectedResult?: string;
  contractABIs?: Record<string, ContractABI>;
  validationRules?: Array<{
    step: number;
    rule: string;
    params: Record<string, unknown>;
  }>;
}

// Enhanced Storage layout types for PayRox Go Beyond
export interface DiamondStoragePattern {
  name: string;
  facet?: string;
  slot: number;
  structName: string;
  variables: string[];
  isolated: boolean;
  namespace: string;
  validation: {
    valid: boolean;
    issues: string[];
  };
}

// PayRox test execution integration
export interface PayRoxTestExecutor {
  loadContractABIs(): Promise<Record<string, ContractABI>>;
  validateTestScenario(_scenario: TestScenario): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  executeTestScenario(_scenario: TestScenario): Promise<SimulationResult>;
  encodeParameters(
    _functionABI: ABIFunction,
    _params: TestStep['parameters']
  ): string;
  decodeReturnData(_functionABI: ABIFunction, _returnData: string): unknown;
}

export interface FacetStorageMetadata {
  facet: string;
  slotMap: Map<number, SlotInfo>;
  totalSize: number;
  usesDiamondPattern: boolean;
  isolated: boolean;
  slotEfficiency: number;
}

export interface PayRoxCompatibilityReport {
  compatible: boolean;
  manifestReady: boolean;
  issues: string[];
  isolationScore: number;
  riskLevel: RiskLevel;
}

export interface StorageLayoutReport {
  totalSlots: number;
  usedSlots: number;
  conflicts: StorageConflict[];
  diamondPatterns: DiamondStoragePattern[];
  facetStorageMetadata: Record<string, FacetStorageMetadata>;
  facetIsolation: {
    fullyIsolated: boolean;
    isolationScore: number;
    riskLevel: RiskLevel;
    isolatedFacets: string[];
    overlappingFacets: string[];
    criticalConflictCount: number;
  };
  diagnostics: {
    securityIssues: string[];
    gasOptimizations: string[];
    recommendations: string[];
  };
  compatibility: PayRoxCompatibilityReport;
}

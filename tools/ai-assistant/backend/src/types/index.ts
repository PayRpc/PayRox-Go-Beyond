// Core contract analysis types

// PayRox Go Beyond protocol limits - sync with constants/limits.ts
// Note: Direct import not available due to TypeScript configuration
// These values are kept in sync with constants/limits.ts
// const MAX_FACET_SIZE = 24576; // EIP_170_BYTECODE_LIMIT from constants/limits.ts
// const MAX_FACETS_TEST = 10; // MAX_FACETS_TEST from constants/limits.ts

// Type aliases for security levels and severities
export type SecurityLevel = 'low' | 'medium' | 'high' | 'critical';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
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
  type: 'overlap' | 'unsafe_access' | 'state_mutation' | 'inheritance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedVariables: string[];
  suggestedFix: string;
  sourceLocation?: SourceLocation;
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
  severity: 'low' | 'medium' | 'high' | 'critical';
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
  securityRating: 'Low' | 'Medium' | 'High' | 'Critical';
  dependencies: string[];
  reasoning: string;
  // PayRox Diamond Architecture specific properties
  payRoxDiamondConfig?: {
    storageSlot: string;
    requiresManifestDispatcher: boolean;
    accessControlMethod: string;
    initializationRequired: boolean;
    manifestRouting?: boolean;
    isolatedStorage?: boolean;
    deterministicSalt?: string;
  };
}

export interface RefactorPlan {
  facets: FacetSuggestion[];
  sharedComponents: string[];
  deploymentStrategy: 'sequential' | 'parallel' | 'mixed';
  estimatedGasSavings: number;
  warnings: string[];
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
  }>;
  expectedGas?: number;
  gasEfficiency?: number;
}

export interface TestScenario {
  name: string;
  description: string;
  steps: Array<{
    facet: string;
    function: string;
    parameters: unknown[];
    target?: string;
    action?: string;
    expectation?: 'success' | 'failure' | 'partial';
  }>;
  expectedGas: number;
  expectedResults: unknown[];
  expectedResult?: string;
}

// Storage layout types
export interface StorageLayoutReport {
  totalSlots: number;
  usedSlots: number;
  conflicts: Array<{
    contract: string;
    slot: number;
    variable: string;
  }>;
  optimizations: string[];
  packedVariables: Array<{
    slot: number;
    variables: Array<{
      name: string;
      type: string;
      offset: number;
      size: number;
    }>;
  }>;
  gasImpact: {
    reads: number;
    writes: number;
    totalEstimate: number;
  };
}

/**
 * limits.ts
 *
 * Canonical system-wide constants for PayRox Go Beyond deployments.
 * Used by:
 *  - Manifest builders
 *  - Contract refactoring wizards
 *  - Deployment simulators
 *  - Orchestrators
 *  - Storage layout checkers
 *
 * This file contains crash-prevention limits and safe operational boundaries.
 */
export declare const EIP_170_BYTECODE_LIMIT = 24576;
export declare const PAYROX_SAFE_FACET_SIZE = 22000;
export declare const MAX_FUNCTIONS_PER_FACET = 20;
export declare const MAX_SELECTORS_PER_MANIFEST = 512;
export declare const MAX_FACETS_PER_MANIFEST = 32;
export declare const MAX_FACETS_PRODUCTION = 256;
export declare const MAX_FACETS_TEST = 10;
export declare const MAX_FACET_SIZE = 24576;
export declare const MAX_FACET_RUNTIME_SIZE = 24576;
export declare const MAX_SELECTORS_PER_FACET = 64;
export declare const BASE_TRANSACTION_GAS = 21000;
export declare const CREATE2_DEPLOY_OVERHEAD = 32000;
export declare const ROUTE_INSERTION_GAS = 30000;
export declare const MERKLE_COMMIT_GAS = 50000;
export declare const MANIFEST_ACTIVATE_GAS = 25000;
export declare const MAX_GAS_PER_TRANSACTION = 30000000;
export declare const DEFAULT_GAS_LIMIT = 500000;
export declare const FACET_OPERATION_GAS = 1000000;
export declare const MAX_SELECTOR_LENGTH = 10;
export declare const MAX_SELECTOR_COLLISIONS = 0;
export declare const MIN_MANIFEST_SIGNATURE_LENGTH = 64;
export declare const MAX_ROUTING_BATCH_SIZE = 10;
export declare const MAX_BATCH_SIZE = 25;
export declare const MAX_MESSAGES_PER_BATCH = 8;
export declare enum FacetPriority {
    Critical = 3,
    High = 2,
    Default = 1
}
export declare const MAX_VARIABLES_PER_FACET = 64;
export declare const MAX_STORAGE_BYTES_PER_SLOT = 32;
export declare const MAX_OFFSET_WITHIN_SLOT = 31;
export declare const CRITICAL_FUNCTION_PATTERNS: RegExp[];
export declare const MIN_CONFIRMATION_BLOCKS = 1;
export declare const MAX_CONFIRMATION_BLOCKS = 50;
export declare const MAX_RETRY_ATTEMPTS = 5;
export declare const OPERATION_TIMEOUT_MS = 30000;
export declare const MAX_TAG_LENGTH = 64;
export declare const MAX_CONTRACT_NAME_LENGTH = 64;
export declare const MAX_DESCRIPTION_LENGTH = 256;
export declare const MIN_FEE_WEI = 0;
export declare const MAX_FEE_WEI: bigint;
export declare const MAX_OPERATION_TYPE = 5;
export declare const MIN_OPERATION_TYPE = 1;
export declare const MAX_CONCURRENT_OPERATIONS = 5;
export declare const MAX_LOG_ENTRIES = 1000;
export declare const MAX_CACHE_SIZE = 100;
export declare const HEAP_MEMORY_THRESHOLD = 0.8;
export declare const DEPLOYMENT_WARNINGS: {
    readonly HIGH_GAS_THRESHOLD: 5000000;
    readonly HIGH_FUNCTION_COUNT: 15;
    readonly LARGE_MANIFEST: 20;
    readonly LARGE_FACET_SIZE: 20000;
    readonly HIGH_SELECTOR_COUNT: 50;
    readonly SLOW_OPERATION_MS: 10000;
};
export declare const getEnvironmentLimits: (isProduction?: boolean) => {
    readonly MAX_FACETS: 10 | 256;
    readonly MAX_BATCH_SIZE: 8 | 15;
    readonly MAX_CONCURRENT_OPERATIONS: 2 | 3;
    readonly OPERATION_TIMEOUT_MS: 30000 | 60000;
};
export type LimitSeverity = 'info' | 'warning' | 'error';
export interface LimitCheckResult {
    tag: string;
    valid: boolean;
    value: number;
    max?: number;
    min?: number;
    recommendation?: string;
    severity?: LimitSeverity;
}
export declare class LimitChecker {
    /**
     * Check facet function count against limits
     */
    static checkFacetFunctionCount(facetName: string, functionCount: number): LimitCheckResult;
    /**
     * Check facet size against limits
     */
    static checkFacetSize(facetName: string, sizeBytes: number): LimitCheckResult;
    /**
     * Check manifest size against limits
     */
    static checkManifestSize(manifestName: string, facetCount: number): LimitCheckResult;
    /**
     * Check gas usage against limits
     */
    static checkGasUsage(operationName: string, gasUsed: number): LimitCheckResult;
    /**
     * Check batch size against limits
     */
    static checkBatchSize(batchName: string, batchSize: number, isProduction?: boolean): LimitCheckResult;
    /**
     * Run all relevant checks for a facet
     */
    static checkFacet(facetName: string, functionCount: number, sizeBytes: number): LimitCheckResult[];
}
/**
 * Validate facet function count and throw if exceeded
 * Usage: validateFacetFunctionCount(facet.name, facet.functions.length)
 */
export declare const validateFacetFunctionCount: (facetName: string, functionCount: number) => void;
/**
 * Validate facet with detailed error information
 * Usage: validateFacetDetailed(facet.name, facet.functions.length, facet.bytecode.length)
 */
export declare const validateFacetDetailed: (facetName: string, functionCount: number, sizeBytes: number) => void;
/**
 * Check if deployment warnings should be shown
 */
export declare const shouldWarnAboutDeployment: (gasUsed: number, facetCount: number, functionCount: number) => boolean;
/**
 * Get deployment recommendations based on current values
 */
export declare const getDeploymentRecommendations: (gasUsed: number, facetCount: number, functionCount: number) => string[];
export declare const validateFacetCount: (count: number, isProduction?: boolean) => boolean;
export declare const validateFacetSize: (size: number) => boolean;
export declare const validateOperationType: (operationType: number) => boolean;
export declare const validateBatchSize: (size: number, isProduction?: boolean) => boolean;
export declare const validateGasLimit: (gasLimit: number) => boolean;
export declare const validateSelectorLength: (selector: string) => boolean;
export declare const isCriticalFunction: (functionName: string) => boolean;
export declare const isMemoryUsageHigh: (heapUsed: number, heapTotal: number) => boolean;
export declare const PROTOCOL_LIMITS: {
    readonly MAX_FACETS_PRODUCTION: 256;
    readonly MAX_FACETS_TEST: 10;
    readonly MAX_FACET_SIZE: 24576;
    readonly MAX_FACET_RUNTIME_SIZE: 24576;
    readonly MAX_SELECTORS_PER_FACET: 64;
    readonly MAX_BATCH_SIZE: 25;
    readonly MAX_MESSAGES_PER_BATCH: 8;
    readonly MAX_GAS_PER_TRANSACTION: 30000000;
    readonly DEFAULT_GAS_LIMIT: 500000;
    readonly FACET_OPERATION_GAS: 1000000;
    readonly BASE_TRANSACTION_GAS: 21000;
    readonly MAX_OPERATION_TYPE: 5;
    readonly MIN_OPERATION_TYPE: 1;
    readonly MIN_CONFIRMATION_BLOCKS: 1;
    readonly MAX_CONFIRMATION_BLOCKS: 50;
    readonly MAX_TAG_LENGTH: 64;
    readonly MAX_CONTRACT_NAME_LENGTH: 64;
    readonly MIN_FEE_WEI: 0;
    readonly MAX_FEE_WEI: bigint;
};
export declare const MAX_FACETS = 10;
export declare const EIP170_SIZE_LIMIT = 24576;
export declare const DIAMOND_FACET_LIMIT = 256;
export type ProtocolLimits = typeof PROTOCOL_LIMITS;
export type EnvironmentLimits = ReturnType<typeof getEnvironmentLimits>;

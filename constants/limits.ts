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

// ===== EIP-170 AND BYTECODE LIMITS =====
export const EIP_170_BYTECODE_LIMIT = 24576; // 24 KB
export const PAYROX_SAFE_FACET_SIZE = 22000; // Buffer below EIP-170 for safety margin

// ===== FACET LIMITS =====
export const MAX_FUNCTIONS_PER_FACET = 20; // Prevents excessive function bloat
export const MAX_SELECTORS_PER_MANIFEST = 512; // Total selector limit across all facets
export const MAX_FACETS_PER_MANIFEST = 32; // Reasonable limit for diamond pattern

// Backward compatibility with existing system
export const MAX_FACETS_PRODUCTION = 256; // From security.json
export const MAX_FACETS_TEST = 10; // Unit test environment
export const MAX_FACET_SIZE = EIP_170_BYTECODE_LIMIT;
export const MAX_FACET_RUNTIME_SIZE = EIP_170_BYTECODE_LIMIT;
export const MAX_SELECTORS_PER_FACET = 64; // From security.json

// ===== GAS CONSTANTS =====
// Conservative estimates to prevent out-of-gas crashes
export const BASE_TRANSACTION_GAS = 21000; // Base Ethereum transaction cost
export const CREATE2_DEPLOY_OVERHEAD = 32000; // Additional gas for CREATE2 deployment
export const ROUTE_INSERTION_GAS = 30000; // Gas for adding routes to dispatcher
export const MERKLE_COMMIT_GAS = 50000; // Gas for committing Merkle roots
export const MANIFEST_ACTIVATE_GAS = 25000; // Gas for manifest activation

// Block gas limits - conservative to prevent crashes
export const MAX_GAS_PER_TRANSACTION = 30_000_000; // Block gas limit consideration
export const DEFAULT_GAS_LIMIT = 500_000; // Safe default for operations
export const FACET_OPERATION_GAS = 1_000_000; // Gas for facet operations

// ===== SELECTOR SAFETY =====
export const MAX_SELECTOR_LENGTH = 10; // bytes4 = 0x + 8 chars
export const MAX_SELECTOR_COLLISIONS = 0; // All selectors must be unique

// ===== MANIFEST SAFETY GUARDS =====
export const MIN_MANIFEST_SIGNATURE_LENGTH = 64; // bytes (ECDSA)
export const MAX_ROUTING_BATCH_SIZE = 10; // Max batch used in manifest apply

// Batch Operation Limits (reduced from 50 to prevent memory issues)
export const MAX_BATCH_SIZE = 25; // Maximum batch operation size
export const MAX_MESSAGES_PER_BATCH = 8; // Reduced for stability

// ===== ROUTING PRIORITIES =====
// For dispatcher apply order or manifest audit tools
export enum FacetPriority {
  Critical = 3,
  High = 2,
  Default = 1
}

// ===== STORAGE LIMITS =====
export const MAX_VARIABLES_PER_FACET = 64; // Prevent storage layout conflicts
export const MAX_STORAGE_BYTES_PER_SLOT = 32; // Standard EVM slot size
export const MAX_OFFSET_WITHIN_SLOT = 31; // Maximum offset within storage slot

// ===== SECURITY TIER THRESHOLDS =====
export const CRITICAL_FUNCTION_PATTERNS = [
  /^pause/, /^unpause/, /^upgrade/, /^withdraw/, /emergency/i,
  /\bonlyOwner\b/, /\bonlyAdmin\b/, /\bupgradeTo\b/, /\b_diamondCut\b/
];

// ===== NETWORK SAFETY LIMITS =====
export const MIN_CONFIRMATION_BLOCKS = 1; // Minimum confirmation blocks
export const MAX_CONFIRMATION_BLOCKS = 50; // Reduced from 100 for faster processing
export const MAX_RETRY_ATTEMPTS = 5; // Maximum retry attempts for failed operations
export const OPERATION_TIMEOUT_MS = 30_000; // 30 seconds timeout for operations

// ===== STRING AND DATA LIMITS =====
export const MAX_TAG_LENGTH = 64; // Reduced from 100 to prevent memory issues
export const MAX_CONTRACT_NAME_LENGTH = 64; // Reduced for efficiency
export const MAX_DESCRIPTION_LENGTH = 256; // Prevent excessive metadata

// ===== VALIDATION LIMITS =====
export const MIN_FEE_WEI = 0; // Minimum fee in wei
export const MAX_FEE_WEI = BigInt('1000000000000000000'); // Maximum fee (1 ETH)
export const MAX_OPERATION_TYPE = 5; // Operation type range (1-5)
export const MIN_OPERATION_TYPE = 1; // Minimum operation type

// ===== MEMORY AND PERFORMANCE LIMITS =====
export const MAX_CONCURRENT_OPERATIONS = 5; // Prevent resource exhaustion
export const MAX_LOG_ENTRIES = 1000; // Prevent unbounded log growth
export const MAX_CACHE_SIZE = 100; // Cache size limit
export const HEAP_MEMORY_THRESHOLD = 0.8; // 80% heap usage threshold

// ===== DEPLOYMENT WARNINGS =====
export const DEPLOYMENT_WARNINGS = {
  HIGH_GAS_THRESHOLD: 5_000_000, // Warn when deployment exceeds 5M gas
  HIGH_FUNCTION_COUNT: 15, // Warn when facet has >15 functions (reduced from 50)
  LARGE_MANIFEST: 20, // Warn when manifest has >20 facets
  LARGE_FACET_SIZE: 20_000, // Warn when facet approaches size limit
  HIGH_SELECTOR_COUNT: 50, // Warn when selector count is high
  SLOW_OPERATION_MS: 10_000, // Warn when operation takes >10s
} as const;

// ===== ENVIRONMENT-SPECIFIC LIMITS =====
export const getEnvironmentLimits = (isProduction: boolean = false) => {
  return {
    MAX_FACETS: isProduction ? MAX_FACETS_PRODUCTION : MAX_FACETS_TEST,
    MAX_BATCH_SIZE: isProduction ? 15 : 8, // Smaller batches in test environments
    MAX_CONCURRENT_OPERATIONS: isProduction ? 3 : 2, // Conservative concurrency
    OPERATION_TIMEOUT_MS: isProduction ? 60_000 : 30_000, // Longer timeout in production
  } as const;
};

// ===== LIMIT CHECK INTERFACE =====
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

// ===== COMPREHENSIVE LIMIT CHECKER =====
export class LimitChecker {
  /**
   * Check facet function count against limits
   */
  static checkFacetFunctionCount(facetName: string, functionCount: number): LimitCheckResult {
    const isValid = functionCount <= MAX_FUNCTIONS_PER_FACET;
    const isWarning = functionCount > DEPLOYMENT_WARNINGS.HIGH_FUNCTION_COUNT;
    
    let severity: LimitSeverity = 'info';
    if (!isValid) {
      severity = 'error';
    } else if (isWarning) {
      severity = 'warning';
    }

    let recommendation: string | undefined;
    if (!isValid) {
      recommendation = `Reduce function count to ${MAX_FUNCTIONS_PER_FACET} or fewer`;
    } else if (isWarning) {
      recommendation = 'Consider splitting into multiple facets for better maintainability';
    }
    
    return {
      tag: `facet-function-count-${facetName}`,
      valid: isValid,
      value: functionCount,
      max: MAX_FUNCTIONS_PER_FACET,
      severity,
      recommendation
    };
  }

  /**
   * Check facet size against limits
   */
  static checkFacetSize(facetName: string, sizeBytes: number): LimitCheckResult {
    const isValid = sizeBytes <= PAYROX_SAFE_FACET_SIZE;
    const isWarning = sizeBytes > DEPLOYMENT_WARNINGS.LARGE_FACET_SIZE;
    
    let severity: LimitSeverity = 'info';
    if (!isValid) {
      severity = 'error';
    } else if (isWarning) {
      severity = 'warning';
    }

    let recommendation: string | undefined;
    if (!isValid) {
      recommendation = `Reduce facet size to ${PAYROX_SAFE_FACET_SIZE} bytes or fewer`;
    } else if (isWarning) {
      recommendation = 'Consider optimizing code or splitting functionality';
    }
    
    return {
      tag: `facet-size-${facetName}`,
      valid: isValid,
      value: sizeBytes,
      max: PAYROX_SAFE_FACET_SIZE,
      severity,
      recommendation
    };
  }

  /**
   * Check manifest size against limits
   */
  static checkManifestSize(manifestName: string, facetCount: number): LimitCheckResult {
    const isValid = facetCount <= MAX_FACETS_PER_MANIFEST;
    const isWarning = facetCount > DEPLOYMENT_WARNINGS.LARGE_MANIFEST;
    
    let severity: LimitSeverity = 'info';
    if (!isValid) {
      severity = 'error';
    } else if (isWarning) {
      severity = 'warning';
    }

    let recommendation: string | undefined;
    if (!isValid) {
      recommendation = `Reduce facet count to ${MAX_FACETS_PER_MANIFEST} or fewer`;
    } else if (isWarning) {
      recommendation = 'Consider splitting into multiple manifests for better deployment management';
    }
    
    return {
      tag: `manifest-size-${manifestName}`,
      valid: isValid,
      value: facetCount,
      max: MAX_FACETS_PER_MANIFEST,
      severity,
      recommendation
    };
  }

  /**
   * Check gas usage against limits
   */
  static checkGasUsage(operationName: string, gasUsed: number): LimitCheckResult {
    const isValid = gasUsed <= MAX_GAS_PER_TRANSACTION;
    const isWarning = gasUsed > DEPLOYMENT_WARNINGS.HIGH_GAS_THRESHOLD;
    
    let severity: LimitSeverity = 'info';
    if (!isValid) {
      severity = 'error';
    } else if (isWarning) {
      severity = 'warning';
    }

    let recommendation: string | undefined;
    if (!isValid) {
      recommendation = `Reduce gas usage to ${MAX_GAS_PER_TRANSACTION} or fewer`;
    } else if (isWarning) {
      recommendation = 'Consider optimizing the operation or splitting into smaller transactions';
    }
    
    return {
      tag: `gas-usage-${operationName}`,
      valid: isValid,
      value: gasUsed,
      max: MAX_GAS_PER_TRANSACTION,
      severity,
      recommendation
    };
  }

  /**
   * Check batch size against limits
   */
  static checkBatchSize(batchName: string, batchSize: number, isProduction: boolean = false): LimitCheckResult {
    const envLimits = getEnvironmentLimits(isProduction);
    const isValid = batchSize <= envLimits.MAX_BATCH_SIZE;
    const environmentType = isProduction ? 'production' : 'test';
    
    const recommendation = !isValid 
      ? `Reduce batch size to ${envLimits.MAX_BATCH_SIZE} or fewer for ${environmentType} environment`
      : undefined;
    
    return {
      tag: `batch-size-${batchName}`,
      valid: isValid,
      value: batchSize,
      max: envLimits.MAX_BATCH_SIZE,
      severity: !isValid ? 'error' : 'info',
      recommendation
    };
  }

  /**
   * Run all relevant checks for a facet
   */
  static checkFacet(facetName: string, functionCount: number, sizeBytes: number): LimitCheckResult[] {
    return [
      this.checkFacetFunctionCount(facetName, functionCount),
      this.checkFacetSize(facetName, sizeBytes)
    ];
  }
}

// ===== PRACTICAL USAGE HELPERS =====

/**
 * Validate facet function count and throw if exceeded
 * Usage: validateFacetFunctionCount(facet.name, facet.functions.length)
 */
export const validateFacetFunctionCount = (facetName: string, functionCount: number): void => {
  if (functionCount > MAX_FUNCTIONS_PER_FACET) {
    throw new Error(`${facetName} exceeds the recommended function count (${functionCount} > ${MAX_FUNCTIONS_PER_FACET})`);
  }
};

/**
 * Validate facet with detailed error information
 * Usage: validateFacetDetailed(facet.name, facet.functions.length, facet.bytecode.length)
 */
export const validateFacetDetailed = (facetName: string, functionCount: number, sizeBytes: number): void => {
  const checks = LimitChecker.checkFacet(facetName, functionCount, sizeBytes);
  const errors = checks.filter(check => !check.valid);
  
  if (errors.length > 0) {
    const errorMessages = errors.map(error => 
      `${error.tag}: ${error.value} exceeds limit of ${error.max} - ${error.recommendation}`
    );
    throw new Error(`Facet validation failed for ${facetName}:\n${errorMessages.join('\n')}`);
  }
};

/**
 * Check if deployment warnings should be shown
 */
export const shouldWarnAboutDeployment = (gasUsed: number, facetCount: number, functionCount: number): boolean => {
  return gasUsed > DEPLOYMENT_WARNINGS.HIGH_GAS_THRESHOLD ||
         facetCount > DEPLOYMENT_WARNINGS.LARGE_MANIFEST ||
         functionCount > DEPLOYMENT_WARNINGS.HIGH_FUNCTION_COUNT;
};

/**
 * Get deployment recommendations based on current values
 */
export const getDeploymentRecommendations = (
  gasUsed: number,
  facetCount: number,
  functionCount: number
): string[] => {
  const recommendations: string[] = [];
  
  if (gasUsed > DEPLOYMENT_WARNINGS.HIGH_GAS_THRESHOLD) {
    recommendations.push(`High gas usage (${gasUsed.toLocaleString()}). Consider optimizing or splitting operations.`);
  }
  
  if (facetCount > DEPLOYMENT_WARNINGS.LARGE_MANIFEST) {
    recommendations.push(`Large manifest (${facetCount} facets). Consider splitting into multiple deployments.`);
  }
  
  if (functionCount > DEPLOYMENT_WARNINGS.HIGH_FUNCTION_COUNT) {
    recommendations.push(`High function count (${functionCount}). Consider splitting facet functionality.`);
  }
  
  return recommendations;
};

// ===== VALIDATION HELPERS =====
export const validateFacetCount = (count: number, isProduction: boolean = false): boolean => {
  const maxFacets = isProduction ? MAX_FACETS_PRODUCTION : MAX_FACETS_TEST;
  return Number.isInteger(count) && count > 0 && count <= maxFacets;
};

export const validateFacetSize = (size: number): boolean => {
  return Number.isInteger(size) && size > 0 && size <= PAYROX_SAFE_FACET_SIZE;
};

export const validateOperationType = (operationType: number): boolean => {
  return Number.isInteger(operationType) && 
         operationType >= MIN_OPERATION_TYPE && 
         operationType <= MAX_OPERATION_TYPE;
};

export const validateBatchSize = (size: number, isProduction: boolean = false): boolean => {
  const envLimits = getEnvironmentLimits(isProduction);
  return Number.isInteger(size) && size > 0 && size <= envLimits.MAX_BATCH_SIZE;
};

export const validateGasLimit = (gasLimit: number): boolean => {
  return Number.isInteger(gasLimit) && 
         gasLimit >= BASE_TRANSACTION_GAS && 
         gasLimit <= MAX_GAS_PER_TRANSACTION;
};

export const validateSelectorLength = (selector: string): boolean => {
  return typeof selector === 'string' && 
         selector.length <= MAX_SELECTOR_LENGTH &&
         /^0x[0-9a-fA-F]{8}$/.test(selector);
};

// ===== SAFETY GUARDS =====
export const isCriticalFunction = (functionName: string): boolean => {
  return CRITICAL_FUNCTION_PATTERNS.some(pattern => pattern.test(functionName));
};

export const isMemoryUsageHigh = (heapUsed: number, heapTotal: number): boolean => {
  return (heapUsed / heapTotal) > HEAP_MEMORY_THRESHOLD;
};

// ===== BACKWARD COMPATIBILITY EXPORTS =====
export const PROTOCOL_LIMITS = {
  MAX_FACETS_PRODUCTION,
  MAX_FACETS_TEST,
  MAX_FACET_SIZE,
  MAX_FACET_RUNTIME_SIZE,
  MAX_SELECTORS_PER_FACET,
  MAX_BATCH_SIZE,
  MAX_MESSAGES_PER_BATCH,
  MAX_GAS_PER_TRANSACTION,
  DEFAULT_GAS_LIMIT,
  FACET_OPERATION_GAS,
  BASE_TRANSACTION_GAS: BASE_TRANSACTION_GAS,
  MAX_OPERATION_TYPE,
  MIN_OPERATION_TYPE,
  MIN_CONFIRMATION_BLOCKS,
  MAX_CONFIRMATION_BLOCKS,
  MAX_TAG_LENGTH,
  MAX_CONTRACT_NAME_LENGTH,
  MIN_FEE_WEI,
  MAX_FEE_WEI,
} as const;

// Environment-aware MAX_FACETS (defaults to test environment for safety)
// Note: Use getEnvironmentLimits() function for runtime environment detection
export const MAX_FACETS = MAX_FACETS_TEST; // Default to test limits for safety

// Legacy compatibility exports
export const EIP170_SIZE_LIMIT = EIP_170_BYTECODE_LIMIT;
export const DIAMOND_FACET_LIMIT = MAX_FACETS_PRODUCTION;

// Type definitions
export type ProtocolLimits = typeof PROTOCOL_LIMITS;
export type EnvironmentLimits = ReturnType<typeof getEnvironmentLimits>;

/**
 * PayRox Go Beyond Protocol Limits
 *
 * Centralized constants for protocol limits to ensure consistency
 * across the entire codebase including contracts, tests, SDK, and tools.
 */

// Import centralized system constants
import { FACET_LIMITS, GAS_LIMITS, TEST_LIMITS } from './system';

export const PROTOCOL_LIMITS = {
  // Facet Limits (from system.ts)
  MAX_FACETS_PRODUCTION: FACET_LIMITS.MAX_FACET_COUNT, // 256 - Production deployment limit
  MAX_FACETS_TEST: TEST_LIMITS.UNIT_TEST_FACET_COUNT, // 10 - Unit test environment limit
  MAX_FACETS_INTEGRATION: TEST_LIMITS.INTEGRATION_TEST_FACET_COUNT, // 50 - Integration test limit
  MAX_FACETS_E2E: TEST_LIMITS.E2E_TEST_FACET_COUNT, // 256 - End-to-end test limit
  MAX_FACET_SIZE: FACET_LIMITS.MAX_FACET_SIZE, // 24KB - EIP-170 contract size limit
  MAX_FACET_RUNTIME_SIZE: FACET_LIMITS.MAX_FACET_RUNTIME_SIZE, // 24KB - Runtime bytecode limit
  MAX_SELECTORS_PER_FACET: FACET_LIMITS.MAX_SELECTORS_PER_FACET, // 64 - Maximum function selectors per facet

  // Batch Operation Limits
  MAX_BATCH_SIZE: 50, // Maximum batch operation size
  MAX_MESSAGES_PER_BATCH: 10, // ExampleFacetA batch message limit

  // Gas Limits (from system.ts)
  MAX_GAS_PER_TRANSACTION: GAS_LIMITS.DEFAULT_DEPLOYMENT, // 30M - Block gas limit consideration
  DEFAULT_GAS_LIMIT: GAS_LIMITS.ROUTE_UPDATE, // 500K - Default gas limit for operations
  FACET_OPERATION_GAS: GAS_LIMITS.FACET_OPERATION, // 1M - Gas for facet operations
  BASE_TRANSACTION_GAS: GAS_LIMITS.BASE_TRANSACTION, // 21K - Base transaction cost

  // Security Limits
  MAX_OPERATION_TYPE: 5, // ExampleFacetB operation type range (1-5)
  MIN_OPERATION_TYPE: 1, // ExampleFacetB minimum operation type

  // Network Limits
  MIN_CONFIRMATION_BLOCKS: 1, // Minimum confirmation blocks
  MAX_CONFIRMATION_BLOCKS: 100, // Maximum confirmation blocks

  // String Limits
  MAX_TAG_LENGTH: 100, // Maximum orchestration tag length
  MAX_CONTRACT_NAME_LENGTH: 100, // Maximum contract name length

  // Validation Limits
  MIN_FEE_WEI: 0, // Minimum fee in wei
  MAX_FEE_WEI: BigInt('1000000000000000000'), // Maximum fee (1 ETH)
} as const;

/**
 * Environment-specific limits based on deployment context
 */
export const getEnvironmentLimits = (isProduction: boolean = false) => {
  return {
    ...PROTOCOL_LIMITS,
    MAX_FACETS: isProduction
      ? PROTOCOL_LIMITS.MAX_FACETS_PRODUCTION
      : PROTOCOL_LIMITS.MAX_FACETS_TEST,
  } as const;
};

/**
 * Type definitions for protocol limits
 */
export type ProtocolLimits = typeof PROTOCOL_LIMITS;
export type EnvironmentLimits = ReturnType<typeof getEnvironmentLimits>;

/**
 * Validation helpers
 */
export const validateFacetCount = (
  count: number,
  isProduction: boolean = false
): boolean => {
  const maxFacets = isProduction
    ? PROTOCOL_LIMITS.MAX_FACETS_PRODUCTION
    : PROTOCOL_LIMITS.MAX_FACETS_TEST;
  return count > 0 && count <= maxFacets;
};

export const validateFacetSize = (size: number): boolean => {
  return size > 0 && size <= PROTOCOL_LIMITS.MAX_FACET_SIZE;
};

export const validateOperationType = (operationType: number): boolean => {
  return (
    operationType >= PROTOCOL_LIMITS.MIN_OPERATION_TYPE &&
    operationType <= PROTOCOL_LIMITS.MAX_OPERATION_TYPE
  );
};

export const validateBatchSize = (size: number): boolean => {
  return size > 0 && size <= PROTOCOL_LIMITS.MAX_BATCH_SIZE;
};

/**
 * Export individual constants for backward compatibility
 */
export const MAX_FACETS_PRODUCTION = PROTOCOL_LIMITS.MAX_FACETS_PRODUCTION;
export const MAX_FACETS_TEST = PROTOCOL_LIMITS.MAX_FACETS_TEST;
export const MAX_FACET_SIZE = PROTOCOL_LIMITS.MAX_FACET_SIZE;
export const MAX_FACET_RUNTIME_SIZE = PROTOCOL_LIMITS.MAX_FACET_RUNTIME_SIZE;
export const MAX_SELECTORS_PER_FACET = PROTOCOL_LIMITS.MAX_SELECTORS_PER_FACET;
export const MAX_MESSAGES_PER_BATCH = PROTOCOL_LIMITS.MAX_MESSAGES_PER_BATCH;
export const MAX_OPERATION_TYPE = PROTOCOL_LIMITS.MAX_OPERATION_TYPE;
export const MIN_OPERATION_TYPE = PROTOCOL_LIMITS.MIN_OPERATION_TYPE;

/**
 * Environment-aware MAX_FACETS (defaults to test environment)
 */
export const MAX_FACETS = (() => {
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction
    ? PROTOCOL_LIMITS.MAX_FACETS_PRODUCTION
    : PROTOCOL_LIMITS.MAX_FACETS_TEST;
})();

/**
 * Legacy compatibility exports
 */
export const EIP170_SIZE_LIMIT = PROTOCOL_LIMITS.MAX_FACET_SIZE;
export const DIAMOND_FACET_LIMIT = PROTOCOL_LIMITS.MAX_FACETS_PRODUCTION;

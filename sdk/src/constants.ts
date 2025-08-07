// SDK Constants - Local copy to avoid path issues
export const FACET_LIMITS = {
  MAX_FACETS: 256,
  MAX_FACET_COUNT: 256, // Alias for compatibility
  MAX_FACET_SIZE_BYTES: 24576, // 24KB (EIP-170)
  MAX_SELECTOR_COUNT: 256,
  MAX_SELECTORS_PER_FACET: 256, // Alias for compatibility
  MAX_FUNCTION_NAME_LENGTH: 64,
  MAX_ARGUMENT_COUNT: 16,
};

export const GAS_LIMITS = {
  FACET_DEPLOYMENT: 500000,
  FACTORY_DEPLOYMENT: 750000,
  DISPATCHER_DEPLOYMENT: 400000,
  ORCHESTRATOR_DEPLOYMENT: 300000,
  FUNCTION_CALL: 100000,
  COMPLEX_FUNCTION_CALL: 250000,
  DEFAULT_DEPLOYMENT: 500000, // Default deployment gas
  BASE_TRANSACTION: 21000, // Base transaction cost
};

export const MANIFEST_LIMITS = {
  MAX_MANIFEST_SIZE: 1048576, // 1MB
  MAX_FUNCTIONS_PER_FACET: 50,
  MAX_FACET_NAME_LENGTH: 32,
  MAX_VERSION_STRING_LENGTH: 16,
};

export function isValidFacetCount(count: number): boolean {
  return count > 0 && count <= FACET_LIMITS.MAX_FACETS;
}

export function isValidFacetSize(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= FACET_LIMITS.MAX_FACET_SIZE_BYTES;
}

export function isValidSelectorCount(count: number): boolean {
  return count > 0 && count <= FACET_LIMITS.MAX_SELECTOR_COUNT;
}

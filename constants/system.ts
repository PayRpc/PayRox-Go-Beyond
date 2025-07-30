/**
 * PayRox Go Beyond - System Constants
 * Centralized configuration values for consistent behavior across the entire system
 */

// ===== FACET LIMITS =====
export const FACET_LIMITS = {
  /** Maximum number of facets allowed in the system (from security.json) */
  MAX_FACET_COUNT: 256,

  /** Maximum size of a single facet in bytes (24KB) */
  MAX_FACET_SIZE: 24576,

  /** Maximum runtime size of a single facet in bytes */
  MAX_FACET_RUNTIME_SIZE: 24576,

  /** Maximum number of function selectors per facet */
  MAX_SELECTORS_PER_FACET: 64,
} as const;

// ===== GAS LIMITS =====
export const GAS_LIMITS = {
  /** Default gas limit for deployments */
  DEFAULT_DEPLOYMENT: 30_000_000,

  /** Gas limit for route updates */
  ROUTE_UPDATE: 500_000,

  /** Gas limit for facet operations */
  FACET_OPERATION: 1_000_000,

  /** Base gas cost for transactions */
  BASE_TRANSACTION: 21_000,
} as const;

// ===== MANIFEST CONSTANTS =====
export const MANIFEST_LIMITS = {
  /** Maximum number of routes in a manifest */
  MAX_ROUTES:
    FACET_LIMITS.MAX_FACET_COUNT * FACET_LIMITS.MAX_SELECTORS_PER_FACET,

  /** Maximum manifest size in bytes */
  MAX_SIZE: 1_048_576, // 1MB

  /** Manifest version format */
  VERSION_FORMAT: /^\d+\.\d+\.\d+$/,
} as const;

// ===== TESTING CONSTANTS =====
export const TEST_LIMITS = {
  /** Smaller facet count for unit tests (performance) */
  UNIT_TEST_FACET_COUNT: 10,

  /** Medium facet count for integration tests */
  INTEGRATION_TEST_FACET_COUNT: 50,

  /** Full facet count for end-to-end tests */
  E2E_TEST_FACET_COUNT: FACET_LIMITS.MAX_FACET_COUNT,

  /** Test timeout in milliseconds */
  DEFAULT_TIMEOUT: 30_000,
} as const;

// ===== NETWORK CONSTANTS =====
export const NETWORK_CONSTANTS = {
  /** Block confirmation requirements */
  CONFIRMATIONS: {
    MAINNET: 5,
    TESTNET: 2,
    LOCAL: 1,
  },

  /** Chain IDs */
  CHAIN_IDS: {
    MAINNET: 1,
    SEPOLIA: 11155111,
    HARDHAT: 31337,
    LOCALHOST: 31337,
  },
} as const;

// ===== SECURITY CONSTANTS =====
export const SECURITY_CONSTANTS = {
  /** Required events for security validation */
  REQUIRED_EVENTS: [
    'RootCommitted',
    'RootActivated',
    'RouteAdded',
    'RouteRemoved',
    'ActivationDelaySet',
    'Frozen',
    'Paused',
    'Unpaused',
    'OrchestrationStarted',
    'OrchestrationCompleted',
    'ComponentDeployed',
    'ContractDeployed',
    'ChunkStaged',
  ],

  /** Minimum activation delay in seconds */
  MIN_ACTIVATION_DELAY: 300, // 5 minutes

  /** Maximum activation delay in seconds */
  MAX_ACTIVATION_DELAY: 604800, // 7 days
} as const;

// ===== TYPE GUARDS =====
export function isValidFacetCount(count: number): boolean {
  return (
    Number.isInteger(count) &&
    count > 0 &&
    count <= FACET_LIMITS.MAX_FACET_COUNT
  );
}

export function isValidSelectorCount(count: number): boolean {
  return (
    Number.isInteger(count) &&
    count > 0 &&
    count <= FACET_LIMITS.MAX_SELECTORS_PER_FACET
  );
}

export function isValidFacetSize(size: number): boolean {
  return (
    Number.isInteger(size) && size > 0 && size <= FACET_LIMITS.MAX_FACET_SIZE
  );
}

// ===== EXPORT ALL =====
export const SYSTEM_CONSTANTS = {
  FACET_LIMITS,
  GAS_LIMITS,
  MANIFEST_LIMITS,
  TEST_LIMITS,
  NETWORK_CONSTANTS,
  SECURITY_CONSTANTS,
} as const;

export default SYSTEM_CONSTANTS;

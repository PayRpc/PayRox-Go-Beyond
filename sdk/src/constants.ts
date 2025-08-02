/**
 * PayRox Go Beyond SDK - System Constants
 * Integrated constants for SDK operations
 */

// ===== FACET LIMITS =====
export const FACET_LIMITS = {
  /** Maximum number of facets allowed in the system */
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
  /** Verified production gas costs */
  PRODUCTION: {
    COMMIT: 72519, // commitRoot verified
    APPLY: 85378, // applyRoutes verified
    ACTIVATE: 54508, // activateCommittedRoot verified
  },
} as const;

// ===== EIP-170 AND BYTECODE LIMITS =====
export const EIP_170_BYTECODE_LIMIT = 24576; // 24 KB
export const PAYROX_SAFE_FACET_SIZE = 22000; // Buffer below EIP-170

// ===== MANIFEST LIMITS =====
export const MANIFEST_LIMITS = {
  /** Maximum number of routes in a manifest */
  MAX_ROUTES:
    FACET_LIMITS.MAX_FACET_COUNT * FACET_LIMITS.MAX_SELECTORS_PER_FACET,
  /** Maximum manifest size in bytes */
  MAX_SIZE: 1_048_576, // 1MB
  /** Manifest version format */
  VERSION_FORMAT: /^\d+\.\d+\.\d+$/,
} as const;

// ===== NETWORK CONSTANTS =====
export const NETWORK_CONSTANTS = {
  /** Total supported networks (verified) */
  TOTAL_NETWORKS: 22,
  /** Mainnet networks */
  MAINNET_COUNT: 11,
  /** Testnet networks */
  TESTNET_COUNT: 11,
  /** Default network */
  DEFAULT: 'localhost',
} as const;

// ===== SECURITY CONSTANTS =====
export const SECURITY_CONSTANTS = {
  /** Timelock delay in seconds (verified production) */
  TIMELOCK_DELAY: 3600,
  /** Role-based access control enabled */
  RBAC_ENABLED: true,
  /** Emergency pause controls */
  PAUSE_CONTROLS: true,
  /** Replay protection */
  REPLAY_PROTECTION: true,
  /** Code integrity validation */
  CODE_INTEGRITY: true,
  /** Emergency response capability */
  EMERGENCY_RESPONSE: true,
} as const;

// ===== DEPLOYMENT CONSTANTS =====
export const DEPLOYMENT_CONSTANTS = {
  /** CREATE2 salt prefix */
  SALT_PREFIX: '0x',
  /** Deterministic deployment */
  DETERMINISTIC: true,
  /** Cross-chain deployment support */
  CROSS_CHAIN: true,
} as const;

// ===== BACKWARDS COMPATIBILITY EXPORTS =====
export const MAX_FACET_SIZE = FACET_LIMITS.MAX_FACET_SIZE;
export const MAX_FACETS_PER_MANIFEST = 32; // Reasonable limit for diamond pattern
export const MAX_SELECTORS_PER_FACET = FACET_LIMITS.MAX_SELECTORS_PER_FACET;

// Aggregate all constants for easy import
export const CONSTANTS = {
  FACET_LIMITS,
  GAS_LIMITS,
  MANIFEST_LIMITS,
  NETWORK_CONSTANTS,
  SECURITY_CONSTANTS,
  DEPLOYMENT_CONSTANTS,
  EIP_170_BYTECODE_LIMIT,
  PAYROX_SAFE_FACET_SIZE,
  MAX_FACET_SIZE,
  MAX_FACETS_PER_MANIFEST,
  MAX_SELECTORS_PER_FACET,
} as const;

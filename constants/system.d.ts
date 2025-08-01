/**
 * PayRox Go Beyond - System Constants
 * Centralized configuration values for consistent behavior across the entire system
 */
export declare const FACET_LIMITS: {
    /** Maximum number of facets allowed in the system (from security.json) */
    readonly MAX_FACET_COUNT: 256;
    /** Maximum size of a single facet in bytes (24KB) */
    readonly MAX_FACET_SIZE: 24576;
    /** Maximum runtime size of a single facet in bytes */
    readonly MAX_FACET_RUNTIME_SIZE: 24576;
    /** Maximum number of function selectors per facet */
    readonly MAX_SELECTORS_PER_FACET: 64;
};
export declare const GAS_LIMITS: {
    /** Default gas limit for deployments */
    readonly DEFAULT_DEPLOYMENT: 30000000;
    /** Gas limit for route updates */
    readonly ROUTE_UPDATE: 500000;
    /** Gas limit for facet operations */
    readonly FACET_OPERATION: 1000000;
    /** Base gas cost for transactions */
    readonly BASE_TRANSACTION: 21000;
};
export declare const MANIFEST_LIMITS: {
    /** Maximum number of routes in a manifest */
    readonly MAX_ROUTES: number;
    /** Maximum manifest size in bytes */
    readonly MAX_SIZE: 1048576;
    /** Manifest version format */
    readonly VERSION_FORMAT: RegExp;
};
export declare const TEST_LIMITS: {
    /** Smaller facet count for unit tests (performance) */
    readonly UNIT_TEST_FACET_COUNT: 10;
    /** Medium facet count for integration tests */
    readonly INTEGRATION_TEST_FACET_COUNT: 50;
    /** Full facet count for end-to-end tests */
    readonly E2E_TEST_FACET_COUNT: 256;
    /** Test timeout in milliseconds */
    readonly DEFAULT_TIMEOUT: 30000;
};
export declare const NETWORK_CONSTANTS: {
    /** Block confirmation requirements */
    readonly CONFIRMATIONS: {
        readonly MAINNET: 5;
        readonly TESTNET: 2;
        readonly LOCAL: 1;
    };
    /** Chain IDs */
    readonly CHAIN_IDS: {
        readonly MAINNET: 1;
        readonly SEPOLIA: 11155111;
        readonly HARDHAT: 31337;
        readonly LOCALHOST: 31337;
    };
};
export declare const SECURITY_CONSTANTS: {
    /** Required events for security validation */
    readonly REQUIRED_EVENTS: readonly ["RootCommitted", "RootActivated", "RouteAdded", "RouteRemoved", "ActivationDelaySet", "Frozen", "Paused", "Unpaused", "OrchestrationStarted", "OrchestrationCompleted", "ComponentDeployed", "ContractDeployed", "ChunkStaged"];
    /** Minimum activation delay in seconds */
    readonly MIN_ACTIVATION_DELAY: 300;
    /** Maximum activation delay in seconds */
    readonly MAX_ACTIVATION_DELAY: 604800;
};
export declare function isValidFacetCount(count: number): boolean;
export declare function isValidSelectorCount(count: number): boolean;
export declare function isValidFacetSize(size: number): boolean;
export declare const SYSTEM_CONSTANTS: {
    readonly FACET_LIMITS: {
        /** Maximum number of facets allowed in the system (from security.json) */
        readonly MAX_FACET_COUNT: 256;
        /** Maximum size of a single facet in bytes (24KB) */
        readonly MAX_FACET_SIZE: 24576;
        /** Maximum runtime size of a single facet in bytes */
        readonly MAX_FACET_RUNTIME_SIZE: 24576;
        /** Maximum number of function selectors per facet */
        readonly MAX_SELECTORS_PER_FACET: 64;
    };
    readonly GAS_LIMITS: {
        /** Default gas limit for deployments */
        readonly DEFAULT_DEPLOYMENT: 30000000;
        /** Gas limit for route updates */
        readonly ROUTE_UPDATE: 500000;
        /** Gas limit for facet operations */
        readonly FACET_OPERATION: 1000000;
        /** Base gas cost for transactions */
        readonly BASE_TRANSACTION: 21000;
    };
    readonly MANIFEST_LIMITS: {
        /** Maximum number of routes in a manifest */
        readonly MAX_ROUTES: number;
        /** Maximum manifest size in bytes */
        readonly MAX_SIZE: 1048576;
        /** Manifest version format */
        readonly VERSION_FORMAT: RegExp;
    };
    readonly TEST_LIMITS: {
        /** Smaller facet count for unit tests (performance) */
        readonly UNIT_TEST_FACET_COUNT: 10;
        /** Medium facet count for integration tests */
        readonly INTEGRATION_TEST_FACET_COUNT: 50;
        /** Full facet count for end-to-end tests */
        readonly E2E_TEST_FACET_COUNT: 256;
        /** Test timeout in milliseconds */
        readonly DEFAULT_TIMEOUT: 30000;
    };
    readonly NETWORK_CONSTANTS: {
        /** Block confirmation requirements */
        readonly CONFIRMATIONS: {
            readonly MAINNET: 5;
            readonly TESTNET: 2;
            readonly LOCAL: 1;
        };
        /** Chain IDs */
        readonly CHAIN_IDS: {
            readonly MAINNET: 1;
            readonly SEPOLIA: 11155111;
            readonly HARDHAT: 31337;
            readonly LOCALHOST: 31337;
        };
    };
    readonly SECURITY_CONSTANTS: {
        /** Required events for security validation */
        readonly REQUIRED_EVENTS: readonly ["RootCommitted", "RootActivated", "RouteAdded", "RouteRemoved", "ActivationDelaySet", "Frozen", "Paused", "Unpaused", "OrchestrationStarted", "OrchestrationCompleted", "ComponentDeployed", "ContractDeployed", "ChunkStaged"];
        /** Minimum activation delay in seconds */
        readonly MIN_ACTIVATION_DELAY: 300;
        /** Maximum activation delay in seconds */
        readonly MAX_ACTIVATION_DELAY: 604800;
    };
};
export default SYSTEM_CONSTANTS;

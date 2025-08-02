/**
 * PayRox Go Beyond SDK
 * Production-ready SDK for building deterministic dApps
 */

// Core client
export { PayRoxClient } from './client';

// Service modules
export { ChunkFactory } from './chunk-factory';
export { Dispatcher } from './dispatcher';
export { ManifestBuilder } from './manifest-builder';
export { Orchestrator } from './orchestrator';

// Development tools
export { DevTools, createDevTools, quickNetworkCheck } from './dev-tools';

// Configuration and types
export {
  CONSTANTS,
  CONTRACT_TYPES,
  DEFAULT_NETWORK,
  NETWORKS,
  type ContractAddresses,
  type ContractType,
  type FeeConfig,
  type NetworkConfig,
} from './config';

// Manifest types
export type {
  Manifest,
  ManifestContract,
  ManifestRoute,
} from './manifest-builder';

// Utility functions
export { Utils } from './utils';

// Version
export const VERSION = '1.0.0';

/**
 * Create a PayRox client quickly
 */
export function createClient(
  providerOrRpc: any,
  privateKey?: string,
  networkName?: string
) {
  // Import here to avoid circular dependency
  const { PayRoxClient } = require('./client');

  if (typeof providerOrRpc === 'string') {
    return PayRoxClient.fromRpc(providerOrRpc, privateKey, networkName);
  }
  return new PayRoxClient(providerOrRpc, undefined, networkName);
}

/**
 * Create a browser client (MetaMask, etc.)
 */
export async function createBrowserClient(networkName?: string) {
  const { PayRoxClient } = require('./client');
  return await PayRoxClient.fromBrowser(networkName);
}

/**
 * PayRox Go Beyond SDK
 * Production-ready SDK for building deterministic dApps
 */

// Core client
export { PayRoxClient } from './client';

// Service modules
export { ChunkFactory } from './chunk-factory';
export { Dispatcher } from './dispatcher';
export { Orchestrator } from './orchestrator';
export { ManifestBuilder } from './manifest-builder';

// Configuration and types
export {
  NETWORKS,
  DEFAULT_NETWORK,
  CONSTANTS,
  CONTRACT_TYPES,
  type NetworkConfig,
  type ContractAddresses,
  type FeeConfig,
  type ContractType,
} from './config';

// Manifest types
export type {
  ManifestContract,
  ManifestRoute,
  Manifest,
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

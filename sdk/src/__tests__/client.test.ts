/**
 * PayRox Client Test Suite
 * Tests for the main SDK client functionality
 */

import {
  CONSTANTS,
  CONTRACT_TYPES,
  DEFAULT_NETWORK,
  NETWORKS,
} from '../config';

describe('PayRoxClient Configuration', () => {
  describe('Network Configuration', () => {
    it('should have valid localhost network config', () => {
      const network = NETWORKS.localhost;

      expect(network).toBeDefined();
      expect(network.name).toBe('Localhost');
      expect(network.chainId).toBe(31337);
      expect(network.rpcUrl).toBe('http://127.0.0.1:8545');
      expect(network.contracts).toBeDefined();
      expect(network.contracts.factory).toBeDefined();
      expect(network.contracts.dispatcher).toBeDefined();
      expect(network.fees).toBeDefined();
    });

    it('should have valid testnet network configs', () => {
      const networks = ['goerli', 'sepolia'];

      networks.forEach(networkName => {
        const network = NETWORKS[networkName];
        expect(network).toBeDefined();
        expect(network.chainId).toBeGreaterThan(0);
        expect(network.rpcUrl).toContain('http');
        expect(network.contracts).toBeDefined();
        expect(network.fees).toBeDefined();
      });
    });

    it('should have contract addresses in correct format', () => {
      const network = NETWORKS.localhost;

      expect(network.contracts.factory).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(network.contracts.dispatcher).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(network.contracts.orchestrator).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(network.contracts.governance).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(network.contracts.auditRegistry).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('SDK Constants', () => {
    it('should export proper configuration structure', () => {
      expect(NETWORKS).toBeDefined();
      expect(typeof NETWORKS).toBe('object');

      // Check that we have key networks
      expect(NETWORKS.localhost).toBeDefined();
      expect(NETWORKS.mainnet).toBeDefined();
      expect(NETWORKS.goerli).toBeDefined();
      expect(NETWORKS.sepolia).toBeDefined();
    });

    it('should have valid default network', () => {
      expect(DEFAULT_NETWORK).toBeDefined();
      expect(NETWORKS[DEFAULT_NETWORK]).toBeDefined();
    });

    it('should have proper constants', () => {
      expect(CONSTANTS.MAX_CHUNK_SIZE).toBe(24000);
      expect(CONSTANTS.CHUNK_PROLOGUE_SIZE).toBe(5);
      expect(CONSTANTS.DEPLOYMENT_FEE_WEI).toBeDefined();
      expect(CONSTANTS.SALT_PREFIX).toBe('chunk:');
      expect(CONSTANTS.MANIFEST_VERSION).toBe('1.0.0');
    });

    it('should have contract types defined', () => {
      expect(CONTRACT_TYPES.FACET).toBe('facet');
      expect(CONTRACT_TYPES.TOKEN).toBe('token');
      expect(CONTRACT_TYPES.NFT).toBe('nft');
      expect(CONTRACT_TYPES.GOVERNANCE).toBe('governance');
    });
  });
});

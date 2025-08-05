/// <reference types="jest" />

import { ethers } from 'ethers';

describe('PayRox SDK - Core Validation', () => {
  const mockNetworkConfig = {
    name: 'Test Network',
    chainId: 31337,
    contracts: {
      factory: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      dispatcher: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      orchestrator: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
      governance: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
      auditRegistry: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    },
    fees: {
      deploymentFee: '700000000000000',
      gasLimit: 5000000,
    },
  };

  test('should validate ethers.js integration', () => {
    expect(ethers).toBeDefined();
    expect(ethers.ZeroAddress).toBe('0x0000000000000000000000000000000000000000');
    expect(ethers.isAddress('0x5FbDB2315678afecb367f032d93F642f64180aa3')).toBe(true);
  });

  test('should validate network configuration', () => {
    expect(mockNetworkConfig.contracts.factory).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(mockNetworkConfig.contracts.dispatcher).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(mockNetworkConfig.fees.deploymentFee).toBe('700000000000000');
    expect(mockNetworkConfig.fees.gasLimit).toBe(5000000);
  });

  test('should validate configuration structure', () => {
    expect(mockNetworkConfig).toHaveProperty('name');
    expect(mockNetworkConfig).toHaveProperty('chainId');
    expect(mockNetworkConfig).toHaveProperty('contracts');
    expect(mockNetworkConfig).toHaveProperty('fees');
    
    expect(mockNetworkConfig.contracts).toHaveProperty('factory');
    expect(mockNetworkConfig.contracts).toHaveProperty('dispatcher');
    expect(mockNetworkConfig.contracts).toHaveProperty('orchestrator');
  });

  test('should validate fee configuration values', () => {
    const deploymentFee = BigInt(mockNetworkConfig.fees.deploymentFee);
    expect(deploymentFee).toBe(BigInt('700000000000000'));
    
    const deploymentFeeETH = Number(ethers.formatEther(deploymentFee));
    expect(deploymentFeeETH).toBe(0.0007);
  });

  test('should validate contract addresses format', () => {
    const addresses = Object.values(mockNetworkConfig.contracts);
    addresses.forEach(address => {
      expect(ethers.isAddress(address)).toBe(true);
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });
});

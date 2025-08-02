/**
 * Utility Functions Test Suite
 * Tests for SDK utility functions and helpers
 */

import { ethers } from 'ethers';
import { Utils } from '../utils';

describe('SDK Utilities', () => {
  describe('getFunctionSelector', () => {
    it('should calculate correct function selectors', () => {
      const signatures = [
        'transfer(address,uint256)',
        'balanceOf(address)',
        'approve(address,uint256)',
        'commitRoot(bytes32,uint256)',
      ];

      signatures.forEach(signature => {
        const selector = Utils.getFunctionSelector(signature);
        expect(selector).toHaveLength(10); // 0x + 8 hex chars
        expect(selector).toMatch(/^0x[a-fA-F0-9]{8}$/);
      });
    });

    it('should generate consistent selectors', () => {
      const signature = 'transfer(address,uint256)';
      const selector1 = Utils.getFunctionSelector(signature);
      const selector2 = Utils.getFunctionSelector(signature);

      expect(selector1).toBe(selector2);
      expect(selector1).toBe('0xa9059cbb'); // Known ERC20 transfer selector
    });
  });

  describe('calculateCreate2Address', () => {
    it('should calculate deterministic addresses', () => {
      const factoryAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
      const salt = ethers.keccak256(ethers.toUtf8Bytes('test-salt'));
      const initCodeHash = ethers.keccak256(
        '0x608060405234801561001057600080fd5b50'
      );

      const address1 = Utils.calculateCreate2Address(
        factoryAddress,
        salt,
        initCodeHash
      );
      const address2 = Utils.calculateCreate2Address(
        factoryAddress,
        salt,
        initCodeHash
      );

      expect(address1).toBe(address2);
      expect(address1).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should generate different addresses for different inputs', () => {
      const factoryAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
      const salt1 = ethers.keccak256(ethers.toUtf8Bytes('salt1'));
      const salt2 = ethers.keccak256(ethers.toUtf8Bytes('salt2'));
      const initCodeHash = ethers.keccak256(
        '0x608060405234801561001057600080fd5b50'
      );

      const address1 = Utils.calculateCreate2Address(
        factoryAddress,
        salt1,
        initCodeHash
      );
      const address2 = Utils.calculateCreate2Address(
        factoryAddress,
        salt2,
        initCodeHash
      );

      expect(address1).not.toBe(address2);
    });
  });

  describe('calculateChunkSalt', () => {
    it('should generate consistent salts for same data', () => {
      const data = '0x608060405234801561001057600080fd5b50';

      const salt1 = Utils.calculateChunkSalt(data);
      const salt2 = Utils.calculateChunkSalt(data);

      expect(salt1).toBe(salt2);
      expect(salt1).toHaveLength(66); // 0x + 64 hex chars
      expect(salt1).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should generate different salts for different data', () => {
      const data1 = '0x608060405234801561001057600080fd5b50';
      const data2 = '0x608060405234801561001057600080fd5b51';

      const salt1 = Utils.calculateChunkSalt(data1);
      const salt2 = Utils.calculateChunkSalt(data2);

      expect(salt1).not.toBe(salt2);
    });
  });

  describe('encodeConstructorArgs', () => {
    it('should encode constructor arguments correctly', () => {
      const types = ['uint256', 'string', 'address'];
      const values = [
        42,
        'PayRox Token',
        '0x1234567890123456789012345678901234567890',
      ];

      const encoded = Utils.encodeConstructorArgs(types, values);

      expect(encoded).toMatch(/^0x[a-fA-F0-9]*$/);
      expect(encoded.length).toBeGreaterThan(2); // More than just '0x'
    });

    it('should handle empty arguments', () => {
      const encoded = Utils.encodeConstructorArgs([], []);

      expect(encoded).toBe('0x');
    });
  });

  describe('decodeConstructorArgs', () => {
    it('should decode constructor arguments correctly', () => {
      const types = ['uint256', 'string'];
      const values = [42, 'Test String'];

      const encoded = Utils.encodeConstructorArgs(types, values);
      const decoded = Utils.decodeConstructorArgs(types, encoded);

      expect(decoded[0]).toBe(BigInt(42));
      expect(decoded[1]).toBe('Test String');
    });
  });
});

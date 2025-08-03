/**
 * Extended Cross-Chain Test Script
 * Additional test scenarios for edge cases and error handling
 */

import { ethers } from 'ethers';
import {
  CrossChainNetworkManager,
  CrossChainOrchestrator,
  CrossChainSaltGenerator,
} from './src/utils/cross-chain';
import { NETWORK_CONFIGS } from './src/utils/network';

async function testEdgeCases() {
  console.log('🔬 Testing Cross-Chain Edge Cases');
  console.log('=================================\n');

  // Test 1: Invalid Address Format
  console.log('1️⃣ Testing Error Handling - Invalid Address...');
  try {
    const invalidAddress = '0xinvalid';
    const salt =
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const bytecodeHash = ethers.keccak256(ethers.toUtf8Bytes('mock-bytecode'));

    CrossChainSaltGenerator.predictCrossChainAddress(
      invalidAddress,
      salt,
      bytecodeHash
    );
    console.log('❌ Should have thrown an error');
  } catch (error) {
    console.log('✅ Properly caught invalid address error');
  }

  // Test 2: Multiple Network Validation
  console.log('\n2️⃣ Testing Multi-Network Validation...');
  try {
    const multiNetworks = [
      'mainnet',
      'polygon',
      'arbitrum',
      'optimism',
      'base',
    ].map(name => {
      const baseConfig = NETWORK_CONFIGS[name];
      return {
        ...baseConfig,
        deploymentPath: `./deployments/${name}`,
        artifactsPath: './artifacts/contracts',
        hasDeployments: true,
        factoryAddress: '0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0',
        dispatcherAddress: '0x742d35cc6641c2dcef174097d589e3c6f1a4e5c1',
      };
    });

    const validation =
      CrossChainNetworkManager.validateNetworkConfig(multiNetworks);
    console.log(
      `✅ Multi-network validation: ${validation.valid ? 'VALID' : 'INVALID'}`
    );
    console.log(`   Networks tested: ${multiNetworks.length}`);
    console.log(`   Errors: ${validation.errors.length}`);
    console.log(`   Warnings: ${validation.warnings.length}`);
  } catch (error) {
    console.error('❌ Multi-network validation failed:', error);
  }

  // Test 3: Salt Consistency
  console.log('\n3️⃣ Testing Salt Consistency...');
  try {
    const saltConfig = {
      baseContent: 'consistent-test',
      deployer: '0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0',
      version: '1.0.0',
      crossChainNonce: 1,
    };

    const salt1 = CrossChainSaltGenerator.generateUniversalSalt(saltConfig);
    const salt2 = CrossChainSaltGenerator.generateUniversalSalt(saltConfig);

    console.log(
      `✅ Salt consistency: ${salt1 === salt2 ? 'CONSISTENT' : 'INCONSISTENT'}`
    );
    console.log(`   Salt 1: ${salt1}`);
    console.log(`   Salt 2: ${salt2}`);
  } catch (error) {
    console.error('❌ Salt consistency test failed:', error);
  }

  // Test 4: Large Scale Network Test
  console.log('\n4️⃣ Testing Large Scale Network Configuration...');
  try {
    const allNetworks = Object.keys(NETWORK_CONFIGS)
      .filter(name => name !== 'localhost' && name !== 'hardhat') // Skip local networks
      .slice(0, 10) // Test first 10 networks
      .map(name => {
        const baseConfig = NETWORK_CONFIGS[name];
        return {
          ...baseConfig,
          deploymentPath: `./deployments/${name}`,
          artifactsPath: './artifacts/contracts',
          hasDeployments: true,
          factoryAddress: '0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0',
          dispatcherAddress: '0x742d35cc6641c2dcef174097d589e3c6f1a4e5c1',
        };
      });

    const orchestrator = new CrossChainOrchestrator(allNetworks);
    console.log(`✅ Large scale orchestrator initialized`);
    console.log(`   Networks configured: ${allNetworks.length}`);
    console.log(`   Ready for deployment: ${orchestrator ? 'Yes' : 'No'}`);
  } catch (error) {
    console.error('❌ Large scale test failed:', error);
  }

  console.log('\n🎯 Edge Case Testing Complete!');
}

// Run the edge case tests
testEdgeCases().catch(error => {
  console.error('🚨 Edge case test execution failed:', error);
  process.exit(1);
});

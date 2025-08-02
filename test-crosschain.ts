/**
 * Cross-Chain Functionality Test Script
 * Tests the cross-chain implementation components
 */

import { ethers } from 'ethers';
import {
  CrossChainNetworkManager,
  CrossChainOrchestrator,
  CrossChainSaltGenerator,
} from './src/utils/cross-chain';
import { NETWORK_CONFIGS } from './src/utils/network';

async function testCrossChainFunctionality() {
  console.log('🧪 Testing Cross-Chain Functionality');
  console.log('=====================================\n');

  // Test 1: Salt Generation
  console.log('1️⃣ Testing Universal Salt Generation...');
  try {
    const saltConfig = {
      baseContent: 'test-content-hash',
      deployer: '0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0', // Fixed checksum
      version: '1.0.0',
      crossChainNonce: 1,
    };

    const universalSalt =
      CrossChainSaltGenerator.generateUniversalSalt(saltConfig);
    console.log(`✅ Universal Salt: ${universalSalt}`);
    console.log(`   Length: ${universalSalt.length} characters`);
    console.log(
      `   Valid hex: ${
        universalSalt.startsWith('0x') && universalSalt.length === 66
      }`
    );
  } catch (error) {
    console.error('❌ Salt generation failed:', error);
  }

  // Test 2: Address Prediction
  console.log('\n2️⃣ Testing Address Prediction...');
  try {
    const mockFactory = '0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0'; // Fixed checksum
    const salt =
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const bytecodeHash = ethers.keccak256(ethers.toUtf8Bytes('mock-bytecode'));

    const predictedAddress = CrossChainSaltGenerator.predictCrossChainAddress(
      mockFactory,
      salt,
      bytecodeHash
    );

    console.log(`✅ Predicted Address: ${predictedAddress}`);
    console.log(`   Valid address: ${ethers.isAddress(predictedAddress)}`);
  } catch (error) {
    console.error('❌ Address prediction failed:', error);
  }

  // Test 3: Network Configuration Validation
  console.log('\n3️⃣ Testing Network Configuration...');
  try {
    // Prepare test network configs
    const testNetworks = ['mainnet', 'polygon', 'hardhat'].map(name => {
      const baseConfig = NETWORK_CONFIGS[name];
      return {
        ...baseConfig,
        deploymentPath: `./deployments/${name}`,
        artifactsPath: './artifacts/contracts',
        hasDeployments: true,
        factoryAddress: '0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0', // Fixed checksum
        dispatcherAddress: '0x742d35cc6641c2dcef174097d589e3c6f1a4e5c1', // Fixed checksum
      };
    });

    const validation =
      CrossChainNetworkManager.validateNetworkConfig(testNetworks);
    console.log(
      `✅ Validation result: ${validation.valid ? 'VALID' : 'INVALID'}`
    );

    if (validation.errors.length > 0) {
      console.log(`   Errors: ${validation.errors.length}`);
      validation.errors.forEach(error => console.log(`   - ${error}`));
    }

    if (validation.warnings.length > 0) {
      console.log(`   Warnings: ${validation.warnings.length}`);
      validation.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
  } catch (error) {
    console.error('❌ Network validation failed:', error);
  }

  // Test 4: Enhanced Salt Generation
  console.log('\n4️⃣ Testing Enhanced Salt Generation...');
  try {
    const contentHash = ethers.keccak256(
      ethers.toUtf8Bytes('test-chunk-content')
    );
    const enhancedSalt = CrossChainSaltGenerator.enhanceChunkSalt(
      contentHash,
      42
    );

    console.log(`✅ Enhanced Salt: ${enhancedSalt}`);
    console.log(`   Content Hash: ${contentHash}`);
    console.log(`   Nonce: 42`);
  } catch (error) {
    console.error('❌ Enhanced salt generation failed:', error);
  }

  // Test 5: Cross-Chain Orchestrator Initialization
  console.log('\n5️⃣ Testing Cross-Chain Orchestrator...');
  try {
    const testNetworks = ['hardhat', 'localhost'].map(name => {
      const baseConfig = NETWORK_CONFIGS[name];
      return {
        ...baseConfig,
        deploymentPath: `./deployments/${name}`,
        artifactsPath: './artifacts/contracts',
        hasDeployments: true,
        factoryAddress: '0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0', // Fixed checksum
        dispatcherAddress: '0x742d35cc6641c2dcef174097d589e3c6f1a4e5c1', // Fixed checksum
      };
    });

    const orchestrator = new CrossChainOrchestrator(testNetworks);
    console.log('✅ CrossChainOrchestrator initialized successfully');
    console.log(`   Network count: ${testNetworks.length}`);
    console.log(`   Orchestrator ready: ${orchestrator ? 'Yes' : 'No'}`);
  } catch (error) {
    console.error('❌ Orchestrator initialization failed:', error);
  }

  console.log('\n🎉 Cross-Chain Functionality Test Complete!');
}

// Run the test
testCrossChainFunctionality().catch(error => {
  console.error('🚨 Test execution failed:', error);
  process.exit(1);
});

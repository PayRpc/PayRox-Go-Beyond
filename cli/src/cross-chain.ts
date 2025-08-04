#!/usr/bin/env node

import { ethers } from 'ethers';
import { CrossChainSaltGenerator, NETWORK_CONFIGS } from './utils';

/**
 * PayRox Cross-Chain Deterministic Address CLI
 * Demonstrates deterministic address generation across multiple EVM networks
 */

async function main() {
  console.log('🌐 PayRox Cross-Chain Deterministic Address Generator');
  console.log('====================================================\n');

  // Example configuration for cross-chain deployment
  const deployerAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Example address
  const contractBytecode = '0x608060405234801561001057600080fd5b50610150806100206000396000f3fe'; // Example bytecode
  const bytecodeHash = ethers.keccak256(contractBytecode);

  const saltConfig = {
    baseContent: 'PayRoxDemoContract',
    deployer: deployerAddress,
    version: 'v1.0.0',
    crossChainNonce: 42
  };

  // Generate universal salt for cross-chain consistency
  const universalSalt = CrossChainSaltGenerator.generateUniversalSalt(saltConfig);
  
  console.log('📝 Configuration:');
  console.log(`   Deployer: ${deployerAddress}`);
  console.log(`   Content: ${saltConfig.baseContent}`);
  console.log(`   Version: ${saltConfig.version}`);
  console.log(`   Nonce: ${saltConfig.crossChainNonce}`);
  console.log(`   Universal Salt: ${universalSalt}\n`);

  console.log('🔮 Predicted Addresses Across Networks:');
  console.log('========================================\n');

  // Predict addresses across all configured networks
  const results: Array<{
    network: string;
    chainId: string;
    address: string;
    explorer?: string;
  }> = [];

  for (const [, config] of Object.entries(NETWORK_CONFIGS)) {
    if (config.factoryAddress) {
      const predictedAddress = CrossChainSaltGenerator.predictCrossChainAddress(
        config.factoryAddress,
        universalSalt,
        bytecodeHash
      );

      results.push({
        network: config.displayName,
        chainId: config.chainId,
        address: predictedAddress,
        explorer: config.explorerUrl
      });

      console.log(`📍 ${config.displayName} (Chain ID: ${config.chainId})`);
      console.log(`   Factory: ${config.factoryAddress}`);
      console.log(`   Predicted Address: ${predictedAddress}`);
      if (config.explorerUrl && !config.testnet) {
        console.log(`   Explorer: ${config.explorerUrl}/address/${predictedAddress}`);
      }
      console.log('');
    }
  }

  // Verify all addresses are identical (deterministic proof)
  const uniqueAddresses = [...new Set(results.map(r => r.address))];
  
  console.log('✅ Cross-Chain Verification:');
  console.log('============================\n');
  
  if (uniqueAddresses.length === 1) {
    console.log('🎯 SUCCESS: All networks produce the SAME deterministic address!');
    console.log(`   Unified Address: ${uniqueAddresses[0]}`);
    console.log('   This proves the PayRox system achieves true cross-chain determinism.\n');
  } else {
    console.log('❌ ERROR: Address mismatch detected across networks!');
    console.log('   This should not happen with proper configuration.\n');
  }

  // Demonstrate chunk salt enhancement
  console.log('🧩 Enhanced Chunk Salt (PayRox Pattern):');
  console.log('========================================\n');
  
  const exampleContent = 'Sample contract chunk data';
  const contentHash = ethers.keccak256(ethers.toUtf8Bytes(exampleContent));
  const enhancedSalt = CrossChainSaltGenerator.enhanceChunkSalt(contentHash, saltConfig.crossChainNonce);
  
  console.log(`   Content: "${exampleContent}"`);
  console.log(`   Content Hash: ${contentHash}`);
  console.log(`   Enhanced Salt: ${enhancedSalt}`);
  console.log('   This follows PayRox chunk pattern with cross-chain enhancement.\n');

  console.log('🚀 Next Steps:');
  console.log('==============\n');
  console.log('1. Deploy DeterministicChunkFactory to each network');
  console.log('2. Use the universal salt for CREATE2 deployments');
  console.log('3. Verify addresses match predictions');
  console.log('4. Enable cross-chain contract interactions\n');

  console.log('💡 Pro Tips:');
  console.log('============\n');
  console.log('- Keep the deployer address consistent across networks');
  console.log('- Use the same bytecode (including constructor params)');
  console.log('- Increment crossChainNonce for different deployments');
  console.log('- Always verify addresses before production use\n');

  return {
    universalSalt,
    predictedAddresses: results,
    isConsistent: uniqueAddresses.length === 1,
    enhancedSalt
  };
}

// Run the demo
if (require.main === module) {
  main()
    .then((_result) => {
      console.log('✅ Cross-chain address generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}

export { main };

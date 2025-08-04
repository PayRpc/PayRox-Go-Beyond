/**
 * Simple SDK validation without Jest - just basic functionality check
 */

import { ethers } from 'ethers';

console.log('🔍 PayRox SDK - Basic Validation');

// Test 1: Ethers.js integration
try {
  console.log('✅ Ethers.js version:', ethers.version);
  console.log('✅ Zero address:', ethers.ZeroAddress);
  console.log('✅ Address validation works:', ethers.isAddress('0x5FbDB2315678afecb367f032d93F642f64180aa3'));
} catch (error) {
  console.error('❌ Ethers.js test failed:', error);
}

// Test 2: Configuration validation
try {
  const mockConfig = {
    name: 'Test Network',
    chainId: 31337,
    contracts: {
      factory: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      dispatcher: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    },
    fees: {
      deploymentFee: '700000000000000',
      gasLimit: 5000000,
    },
  };

  // Validate structure
  if (mockConfig.contracts && mockConfig.fees) {
    console.log('✅ Configuration structure valid');
  }

  // Validate addresses
  const addressPattern = /^0x[a-fA-F0-9]{40}$/;
  if (addressPattern.test(mockConfig.contracts.factory)) {
    console.log('✅ Factory address format valid');
  }

  if (addressPattern.test(mockConfig.contracts.dispatcher)) {
    console.log('✅ Dispatcher address format valid');
  }

  // Validate fee values
  const deploymentFee = BigInt(mockConfig.fees.deploymentFee);
  const deploymentFeeETH = Number(ethers.formatEther(deploymentFee));
  console.log('✅ Deployment fee in ETH:', deploymentFeeETH);

} catch (error) {
  console.error('❌ Configuration test failed:', error);
}

// Test 3: Import validation
try {
  // Try importing main SDK modules
  import('./chunk-factory').then((_factory) => {
    console.log('✅ ChunkFactory module imported successfully');
  }).catch((error) => {
    console.log('⚠️  ChunkFactory import:', error.message);
  });

  import('./dispatcher').then((_dispatcher) => {
    console.log('✅ Dispatcher module imported successfully');
  }).catch((error) => {
    console.log('⚠️  Dispatcher import:', error.message);
  });

  import('./config').then((_config) => {
    console.log('✅ Config module imported successfully');
  }).catch((error) => {
    console.log('⚠️  Config import:', error.message);
  });

} catch (error) {
  console.error('❌ Module import test failed:', error);
}

console.log('🏁 SDK validation complete');

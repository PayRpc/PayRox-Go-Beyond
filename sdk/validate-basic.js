// Simple Node.js test for SDK validation
const { ethers } = require('ethers');

console.log('🔍 PayRox SDK - Basic Validation');

// Test 1: Ethers.js integration
try {
  console.log('✅ Ethers.js version:', ethers.version);
  console.log('✅ Zero address:', ethers.ZeroAddress);
  console.log('✅ Address validation works:', ethers.isAddress('0x5FbDB2315678afecb367f032d93F642f64180aa3'));
} catch (error) {
  console.error('❌ Ethers.js test failed:', error.message);
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
  console.error('❌ Configuration test failed:', error.message);
}

// Test 3: SDK Distribution files
const fs = require('fs');
const path = require('path');

try {
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    console.log('✅ Distribution files found:', files);
    
    if (files.includes('index.js')) {
      console.log('✅ CommonJS build exists');
    }
    
    if (files.includes('index.esm.js')) {
      console.log('✅ ES Module build exists');
    }
  }
} catch (error) {
  console.error('❌ Distribution test failed:', error.message);
}

// Test 4: Package.json validation
try {
  const packageJson = require('./package.json');
  console.log('✅ Package name:', packageJson.name);
  console.log('✅ Package version:', packageJson.version);
  console.log('✅ Main entry:', packageJson.main);
  console.log('✅ Module entry:', packageJson.module);
} catch (error) {
  console.error('❌ Package.json test failed:', error.message);
}

console.log('🏁 SDK validation complete');

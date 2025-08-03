// test-merkle.js - Simple test for merkle functions
const { execSync } = require('child_process');

// Use ts-node to run TypeScript directly
try {
  console.log('Testing merkle.ts functions with ts-node...');

  const testScript = `
import { encodeLeaf, deriveSelectorsFromAbi } from './scripts/utils/merkle';
import { keccak256, toUtf8Bytes, getAddress } from 'ethers';

// Test 1: encodeLeaf function
console.log('Testing encodeLeaf...');
try {
  const testAddress = getAddress('0x742d35cc6635c0532925a3b8d34ef4a1a4e12345');
  const result = encodeLeaf('0x12345678', testAddress, keccak256(toUtf8Bytes('test')));
  console.log('✅ encodeLeaf works:', result);
} catch (e) {
  console.log('❌ encodeLeaf error:', e.message);
}

// Test 2: deriveSelectorsFromAbi function
console.log('Testing deriveSelectorsFromAbi...');
try {
  const testAbi = [
    { type: 'function', name: 'transfer', inputs: [{ type: 'address' }, { type: 'uint256' }] },
    { type: 'function', name: 'balanceOf', inputs: [{ type: 'address' }] }
  ];
  const selectors = deriveSelectorsFromAbi(testAbi);
  console.log('✅ deriveSelectorsFromAbi works:', selectors);
} catch (e) {
  console.log('❌ deriveSelectorsFromAbi error:', e.message);
}
`;

  // Write test script to temporary file
  require('fs').writeFileSync('temp-test.ts', testScript);

  // Run with ts-node
  const output = execSync('npx ts-node temp-test.ts', { encoding: 'utf8' });
  console.log(output);

  // Clean up
  require('fs').unlinkSync('temp-test.ts');
} catch (error) {
  console.log('Error running test:', error.message);
}

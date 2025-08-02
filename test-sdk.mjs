import { PayRoxClient } from '@payrox/go-beyond-sdk';

// Quick SDK test
console.log('🚀 Testing PayRox SDK...');

// Test SDK connection
try {
  const client = PayRoxClient.fromRpc(
    'http://localhost:8545',
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    'localhost'
  );
  console.log('✅ PayRox SDK initialized successfully!');
  console.log('🏭 Connected to PayRox infrastructure');
} catch (error) {
  console.error('❌ SDK initialization failed:', error.message);
}

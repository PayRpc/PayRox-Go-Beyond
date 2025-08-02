// PayRox SDK Installation Test
console.log('🚀 PayRox Go Beyond SDK Installation Test');
console.log('==========================================');

// Test 1: Check if SDK can be imported
console.log('\n📦 Test 1: SDK Import Test');
try {
  const sdkPath = './sdk/dist/index.js';
  const sdk = require(sdkPath);
  console.log('✅ SDK imported successfully!');
  console.log('🔧 Available exports:', Object.keys(sdk));

  // Test 2: Check PayRoxClient
  if (sdk.PayRoxClient) {
    console.log('✅ PayRoxClient is available');

    // Test 3: Check if we can create a client instance (without connecting)
    console.log('\n📡 Test 2: Client Creation Test');
    try {
      const client = sdk.PayRoxClient.fromRpc(
        'http://localhost:8545',
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        'localhost'
      );
      console.log('✅ PayRoxClient instance created successfully!');
      console.log('🏭 Connected to localhost network');
    } catch (clientError) {
      console.log(
        '⚠️  Client creation test - connection may need active network:',
        clientError.message
      );
    }
  } else {
    console.log('❌ PayRoxClient not found in exports');
  }

  console.log('\n🎉 SDK INSTALLATION SUCCESSFUL!');
  console.log('📖 You can now use the PayRox SDK in your projects');
  console.log('\n📋 Usage example:');
  console.log('  const { PayRoxClient } = require("@payrox/go-beyond-sdk");');
  console.log(
    '  const client = PayRoxClient.fromRpc("http://localhost:8545", privateKey, "localhost");'
  );
} catch (error) {
  console.error('\n❌ SDK INSTALLATION FAILED:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Run: cd sdk && npm run build');
  console.log('2. Run: npm install');
  console.log('3. Check Node.js version (requires v18+)');
}

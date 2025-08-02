// Test PayRox SDK Installation
const path = require('path');

try {
  // Try to require the built SDK
  const sdkPath = path.join(__dirname, 'sdk', 'dist', 'index.js');
  console.log('📦 Attempting to load PayRox SDK from:', sdkPath);

  const sdk = require(sdkPath);
  console.log('✅ PayRox SDK loaded successfully!');
  console.log('🔧 Available exports:', Object.keys(sdk));

  // Check if main client is available
  if (sdk.PayRoxClient) {
    console.log('✅ PayRoxClient is available');
  } else {
    console.log('❌ PayRoxClient not found in exports');
  }

  console.log('\n🎉 SDK Installation Test PASSED!');
  console.log('📖 You can now use the PayRox SDK in your projects');
} catch (error) {
  console.error('❌ SDK Installation Test FAILED:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Make sure SDK is built: cd sdk && npm run build');
  console.log('2. Check if dist/ directory exists in sdk/');
  console.log('3. Verify Node.js version compatibility');
}

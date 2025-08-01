// Example script for generating EIP-712 signature for ExampleFacetB initialization
// This would typically be run by governance offline

const { ethers } = require('hardhat');

async function generateInitSignature() {
  // Configuration
  const operator = '0x1234567890123456789012345678901234567890'; // Replace with actual operator
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const nonce = 0; // Get current nonce from getInitNonce()
  const chainId = 1; // Mainnet
  const verifyingContract = '0xfacetaddress'; // Replace with actual facet address

  // EIP-712 Domain
  const domain = {
    name: 'PayRoxFacetB',
    version: '1.2.0',
    chainId: chainId,
    verifyingContract: verifyingContract,
  };

  // EIP-712 Type
  const types = {
    InitializeFacetB: [
      { name: 'operator', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
    ],
  };

  // Values to sign
  const value = {
    operator: operator,
    deadline: deadline,
    nonce: nonce,
  };

  console.log('🔐 Generating EIP-712 signature for facet initialization');
  console.log('📋 Parameters:');
  console.log(`   Operator: ${operator}`);
  console.log(
    `   Deadline: ${deadline} (${new Date(deadline * 1000).toISOString()})`
  );
  console.log(`   Nonce: ${nonce}`);
  console.log(`   Chain ID: ${chainId}`);
  console.log(`   Verifying Contract: ${verifyingContract}`);

  // Note: In production, this would be signed by the governance private key
  const [signer] = await ethers.getSigners();
  const signature = await signer.signTypedData(domain, types, value);

  console.log(`\n✍️  Signature: ${signature}`);
  console.log(`\n📞 Call initializeFacetB with:`);
  console.log(`   operator: "${operator}"`);
  console.log(`   deadline: ${deadline}`);
  console.log(`   signature: "${signature}"`);
}

// Example usage for testing
if (require.main === module) {
  generateInitSignature().catch(console.error);
}

module.exports = { generateInitSignature };

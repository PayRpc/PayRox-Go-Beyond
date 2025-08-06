// Enhanced script for generating EIP-712 signatures for ExampleFacetB initialization
// Supports initialization, governance rotation, and operator rotation
// Production-ready with comprehensive validation and error handling

const { ethers } = require('hardhat');

// Configuration constants that should match ExampleFacetB.sol
const EIP712_CONSTANTS = {
  DOMAIN_TYPEHASH:
    'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)',
  INIT_TYPEHASH:
    'InitializeFacetB(address operator,address governance,uint256 deadline,uint256 nonce)',
  ROTATE_GOVERNANCE_TYPEHASH:
    'RotateGovernance(address newGovernance,uint256 deadline,uint256 nonce)',
  ROTATE_OPERATOR_TYPEHASH:
    'RotateOperator(address newOperator,uint256 deadline,uint256 nonce)',
  DOMAIN_NAME: 'PayRoxFacetB',
  DOMAIN_VERSION: '1.2.0',
};

/**
 * Generate EIP-712 signature for facet initialization
 * @param {Object} params - Initialization parameters
 * @returns {Promise<Object>} Signature and verification details
 */
async function generateInitSignature(params = {}) {
  console.log(
    '🔐 Generating EIP-712 signature for ExampleFacetB initialization...'
  );

  // Configuration with validation
  const operator =
    params.operator || '0x1234567890123456789012345678901234567890';
  const governance =
    params.governance || '0x1234567890123456789012345678901234567890';
  const deadline = params.deadline || Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const nonce = params.nonce || 0; // Should be fetched from getInitNonce() in production
  const chainId =
    params.chainId || (await ethers.provider.getNetwork()).chainId;
  const verifyingContract = params.verifyingContract || '0xfacetaddress'; // Replace with actual facet address

  // Validate inputs
  if (!ethers.isAddress(operator) || operator === ethers.ZeroAddress) {
    throw new Error(`Invalid operator address: ${operator}`);
  }
  if (!ethers.isAddress(governance) || governance === ethers.ZeroAddress) {
    throw new Error(`Invalid governance address: ${governance}`);
  }
  if (!ethers.isAddress(verifyingContract)) {
    throw new Error(`Invalid verifying contract address: ${verifyingContract}`);
  }
  if (deadline <= Math.floor(Date.now() / 1000)) {
    throw new Error(
      `Deadline must be in the future. Current: ${Math.floor(
        Date.now() / 1000
      )}, Provided: ${deadline}`
    );
  }

  // EIP-712 Domain - must match exactly with contract
  const domain = {
    name: EIP712_CONSTANTS.DOMAIN_NAME,
    version: EIP712_CONSTANTS.DOMAIN_VERSION,
    chainId: Number(chainId),
    verifyingContract: verifyingContract,
  };

  // EIP-712 Type - must match INIT_TYPEHASH in contract
  const types = {
    InitializeFacetB: [
      { name: 'operator', type: 'address' },
      { name: 'governance', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
    ],
  };

  // Values to sign - order must match INIT_TYPEHASH
  const value = {
    operator: operator,
    governance: governance,
    deadline: deadline,
    nonce: nonce,
  };

  console.log('� Initialization Parameters:');
  console.log(`   Operator: ${operator}`);
  console.log(`   Governance: ${governance}`);
  console.log(
    `   Deadline: ${deadline} (${new Date(deadline * 1000).toISOString()})`
  );
  console.log(`   Nonce: ${nonce}`);
  console.log(`   Chain ID: ${chainId}`);
  console.log(`   Verifying Contract: ${verifyingContract}`);

  // Get signer (in production, this should be the governance private key)
  const [signer] = await ethers.getSigners();
  console.log(`🔑 Signing with account: ${signer.address}`);

  // Generate signature
  const signature = await signer.signTypedData(domain, types, value);

  // Verify signature locally
  const recoveredAddress = ethers.verifyTypedData(
    domain,
    types,
    value,
    signature
  );
  const isValid =
    recoveredAddress.toLowerCase() === signer.address.toLowerCase();

  console.log(`\n✍️  Generated Signature: ${signature}`);
  console.log(`🔍 Signature Verification:`);
  console.log(`   Recovered Address: ${recoveredAddress}`);
  console.log(`   Expected Address: ${signer.address}`);
  console.log(`   Valid: ${isValid ? '✅' : '❌'}`);

  if (!isValid) {
    throw new Error('Signature verification failed!');
  }

  console.log(`\n📞 Call initializeFacetB with these parameters:`);
  console.log(`   operator: "${operator}"`);
  console.log(`   governance: "${governance}"`);
  console.log(`   deadline: ${deadline}`);
  console.log(`   signature: "${signature}"`);

  // Return structured result for programmatic usage
  return {
    signature,
    parameters: {
      operator,
      governance,
      deadline,
      signature,
    },
    domain,
    types,
    value,
    signer: signer.address,
    chainId: Number(chainId),
    verifyingContract,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate EIP-712 signature for governance rotation
 * @param {Object} params - Rotation parameters
 * @returns {Promise<Object>} Signature and verification details
 */
async function generateGovernanceRotationSignature(params = {}) {
  console.log('🔄 Generating EIP-712 signature for governance rotation...');

  const newGovernance = params.newGovernance;
  const deadline = params.deadline || Math.floor(Date.now() / 1000) + 3600;
  const nonce = params.nonce || 0; // Should be fetched from current contract state
  const chainId =
    params.chainId || (await ethers.provider.getNetwork()).chainId;
  const verifyingContract = params.verifyingContract;

  // Validate inputs
  if (
    !ethers.isAddress(newGovernance) ||
    newGovernance === ethers.ZeroAddress
  ) {
    throw new Error(`Invalid new governance address: ${newGovernance}`);
  }
  if (!ethers.isAddress(verifyingContract)) {
    throw new Error(`Invalid verifying contract address: ${verifyingContract}`);
  }

  const domain = {
    name: EIP712_CONSTANTS.DOMAIN_NAME,
    version: EIP712_CONSTANTS.DOMAIN_VERSION,
    chainId: Number(chainId),
    verifyingContract: verifyingContract,
  };

  const types = {
    RotateGovernance: [
      { name: 'newGovernance', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
    ],
  };

  const value = {
    newGovernance: newGovernance,
    deadline: deadline,
    nonce: nonce,
  };

  const [signer] = await ethers.getSigners();
  const signature = await signer.signTypedData(domain, types, value);

  console.log('📋 Governance Rotation Parameters:');
  console.log(`   New Governance: ${newGovernance}`);
  console.log(
    `   Deadline: ${deadline} (${new Date(deadline * 1000).toISOString()})`
  );
  console.log(`   Nonce: ${nonce}`);
  console.log(`   Signature: ${signature}`);

  return {
    signature,
    parameters: { newGovernance, deadline, signature },
    domain,
    types,
    value,
    signer: signer.address,
    operation: 'rotateGovernance',
  };
}

/**
 * Generate EIP-712 signature for operator rotation
 * @param {Object} params - Rotation parameters
 * @returns {Promise<Object>} Signature and verification details
 */
async function generateOperatorRotationSignature(params = {}) {
  console.log('👤 Generating EIP-712 signature for operator rotation...');

  const newOperator = params.newOperator;
  const deadline = params.deadline || Math.floor(Date.now() / 1000) + 3600;
  const nonce = params.nonce || 0;
  const chainId =
    params.chainId || (await ethers.provider.getNetwork()).chainId;
  const verifyingContract = params.verifyingContract;

  // Validate inputs
  if (!ethers.isAddress(newOperator) || newOperator === ethers.ZeroAddress) {
    throw new Error(`Invalid new operator address: ${newOperator}`);
  }
  if (!ethers.isAddress(verifyingContract)) {
    throw new Error(`Invalid verifying contract address: ${verifyingContract}`);
  }

  const domain = {
    name: EIP712_CONSTANTS.DOMAIN_NAME,
    version: EIP712_CONSTANTS.DOMAIN_VERSION,
    chainId: Number(chainId),
    verifyingContract: verifyingContract,
  };

  const types = {
    RotateOperator: [
      { name: 'newOperator', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
    ],
  };

  const value = {
    newOperator: newOperator,
    deadline: deadline,
    nonce: nonce,
  };

  const [signer] = await ethers.getSigners();
  const signature = await signer.signTypedData(domain, types, value);

  console.log('📋 Operator Rotation Parameters:');
  console.log(`   New Operator: ${newOperator}`);
  console.log(
    `   Deadline: ${deadline} (${new Date(deadline * 1000).toISOString()})`
  );
  console.log(`   Nonce: ${nonce}`);
  console.log(`   Signature: ${signature}`);

  return {
    signature,
    parameters: { newOperator, deadline, signature },
    domain,
    types,
    value,
    signer: signer.address,
    operation: 'rotateOperator',
  };
}

/**
 * Save signature data to file for later use
 * @param {Object} signatureData - The signature data to save
 * @param {string} filename - Output filename
 */
async function saveSignatureToFile(signatureData, filename) {
  try {
    const fs = require('fs');
    const path = require('path');

    // Ensure signatures directory exists
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filename, JSON.stringify(signatureData, null, 2));
    console.log(`💾 Signature data saved to: ${filename}`);
  } catch (error) {
    console.error(`❌ Failed to save signature data: ${error.message}`);
  }
}

/**
 * Interactive CLI for generating different types of signatures
 */
async function interactiveSignatureGeneration() {
  const args = process.argv.slice(2);
  
  // Check for environment variables first (for master controller integration)
  const envOperation = process.env.SIGNATURE_OPERATION;
  const envOperator = process.env.SIGNATURE_OPERATOR;
  const envGovernance = process.env.SIGNATURE_GOVERNANCE;
  const envFacet = process.env.SIGNATURE_FACET;
  
  // Use environment variables if available, otherwise use command line args
  const operation = envOperation || args[0] || 'init';
  const operator = envOperator || args[1];
  const governance = envGovernance || args[2];
  const verifyingContract = envFacet || args[3];
  const deadline = args[4] ? parseInt(args[4]) : undefined;
  const nonce = args[5] ? parseInt(args[5]) : undefined;

  console.log(`🚀 PayRox ExampleFacetB Signature Generator`);
  console.log(`Operation: ${operation}`);

  try {
    let result;

    switch (operation.toLowerCase()) {
      case 'init':
      case 'initialize':
        result = await generateInitSignature({
          operator: operator,
          governance: governance,
          verifyingContract: verifyingContract,
          deadline: deadline,
        });
        break;

      case 'rotate-governance':
        result = await generateGovernanceRotationSignature({
          newGovernance: governance,
          verifyingContract: verifyingContract,
          deadline: deadline,
          nonce: nonce,
        });
        break;

      case 'rotate-operator':
        result = await generateOperatorRotationSignature({
          newOperator: operator,
          verifyingContract: verifyingContract,
          deadline: deadline,
          nonce: nonce,
        });
        break;

      default:
        console.log(`❌ Unknown operation: ${operation}`);
        console.log(
          `Available operations: init, rotate-governance, rotate-operator`
        );
        console.log(`\nUsage examples:`);
        console.log(
          `  node generate-facetb-init-signature.js init <operator> <governance> <facet-address>`
        );
        console.log(
          `  node generate-facetb-init-signature.js rotate-governance <new-governance> <facet-address>`
        );
        console.log(
          `  node generate-facetb-init-signature.js rotate-operator <new-operator> <facet-address>`
        );
        process.exit(1);
    }

    // Save to file
    const filename = `./signatures/facet-b-${operation}-${Date.now()}.json`;
    await saveSignatureToFile(result, filename);

    return result;
  } catch (error) {
    console.error(`❌ Signature generation failed:`, error.message);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  interactiveSignatureGeneration().catch(console.error);
}

// Module exports for programmatic usage
module.exports = {
  generateInitSignature,
  generateGovernanceRotationSignature,
  generateOperatorRotationSignature,
  saveSignatureToFile,
  EIP712_CONSTANTS,
};

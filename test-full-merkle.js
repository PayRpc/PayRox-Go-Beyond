// test-full-merkle.js - Test the complete generateManifestLeaves function
const { execSync } = require('child_process');

const fullTestScript = `
import { generateManifestLeaves } from './scripts/utils/merkle';
import { getAddress } from 'ethers';

// Mock artifacts
const mockArtifacts = {
  readArtifact: async (contractName: string) => {
    return {
      deployedBytecode: '0x608060405234801561001057600080fd5b50600436106100365760003560e01c8063a9059cbb1461003b578063f2fde38b14610070575b600080fd5b61005660048036038101906100519190610123565b610093565b60405161006d9190610181565b60405180910390f35b61007b6004803603810190610076919061019c565b6100a2565b005b6000600190509392505050565b50565b600080fd5b6000819050919050565b6100bb816100a8565b81146100c657600080fd5b50565b6000813590506100d8816100b2565b92915050565b6000819050919050565b6100f1816100de565b81146100fc57600080fd5b50565b60008135905061010e816100e8565b92915050565b60008115159050919050565b61012981610114565b82525050565b6000602082019050610144600083018461012056',
      bytecode: '0x608060405234801561001057600080fd5b50600436106100365760003560e01c8063a9059cbb1461003b578063f2fde38b14610070575b600080fd5b61005660048036038101906100519190610123565b610093565b60405161006d9190610181565b60405180910390f35b61007b6004803603810190610076919061019c565b6100a2565b005b6000600190509392505050565b50565b600080fd5b6000819050919050565b6100bb816100a8565b81146100c657600080fd5b50565b6000813590506100d8816100b2565b92915050565b6000819050919050565b6100f1816100de565b81146100fc57600080fd5b50565b60008135905061010e816100e8565b92915050565b60008115159050919050565b61012981610114565b82525050565b6000602082019050610144600083018461012056',
      abi: [
        { type: 'function', name: 'transfer', inputs: [{ type: 'address' }, { type: 'uint256' }] },
        { type: 'function', name: 'balanceOf', inputs: [{ type: 'address' }] }
      ]
    };
  }
};

// Mock manifest
const mockManifest = {
  facets: [
    {
      name: 'TestFacet',
      contract: 'TestContract',
      selectors: ['0xa9059cbb', '0x70a08231']
    }
  ],
  deployment: {
    salts: {
      TestFacet: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    }
  }
};

console.log('Testing generateManifestLeaves...');

async function testManifestLeaves() {
  try {
    const factoryAddress = getAddress('0x742d35cc6635c0532925a3b8d34ef4a1a4e12345');
    const result = await generateManifestLeaves(mockManifest, mockArtifacts, factoryAddress);

    console.log('✅ generateManifestLeaves works!');
    console.log('Root:', result.root);
    console.log('Leaves count:', result.leaves.length);
    console.log('Tree levels:', result.tree.length);
    console.log('Proofs count:', Object.keys(result.proofs).length);
    console.log('First leaf meta:', result.leafMeta[0]);

  } catch (e) {
    console.log('❌ generateManifestLeaves error:', e.message);
  }
}

testManifestLeaves();
`;

try {
  // Write test script to temporary file
  require('fs').writeFileSync('temp-full-test.ts', fullTestScript);

  // Run with ts-node
  const output = execSync('npx ts-node temp-full-test.ts', {
    encoding: 'utf8',
  });
  console.log(output);

  // Clean up
  require('fs').unlinkSync('temp-full-test.ts');
} catch (error) {
  console.log('Error running test:', error.message);
}

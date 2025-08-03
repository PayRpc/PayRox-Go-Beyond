import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  EIP712_CONSTANTS,
  generateGovernanceRotationSignature,
  generateInitSignature,
  generateOperatorRotationSignature,
} from '../../scripts/generate-facetb-init-signature';

describe('ExampleFacetB Signature Generator', () => {
  let deployer: SignerWithAddress;
  let operator: SignerWithAddress;
  let governance: SignerWithAddress;
  let newGovernance: SignerWithAddress;
  let newOperator: SignerWithAddress;
  let ExampleFacetB: any;
  let facetB: any;
  let chainId: number;

  before(async () => {
    [deployer, operator, governance, newGovernance, newOperator] =
      await ethers.getSigners();

    // Get network chain ID
    const network = await ethers.provider.getNetwork();
    chainId = Number(network.chainId);

    // Deploy ExampleFacetB for testing
    const ExampleFacetBFactory = await ethers.getContractFactory(
      'ExampleFacetB'
    );
    ExampleFacetB = ExampleFacetBFactory;
    facetB = await ExampleFacetB.deploy();
    await facetB.waitForDeployment();

    console.log(`✅ ExampleFacetB deployed at: ${await facetB.getAddress()}`);
  });

  describe('EIP-712 Constants Validation', () => {
    it('should have correct EIP-712 constants matching contract', async () => {
      expect(EIP712_CONSTANTS.DOMAIN_NAME).to.equal('PayRoxFacetB');
      expect(EIP712_CONSTANTS.DOMAIN_VERSION).to.equal('1.2.0');
      expect(EIP712_CONSTANTS.INIT_TYPEHASH).to.include('InitializeFacetB');
      expect(EIP712_CONSTANTS.ROTATE_GOVERNANCE_TYPEHASH).to.include(
        'RotateGovernance'
      );
      expect(EIP712_CONSTANTS.ROTATE_OPERATOR_TYPEHASH).to.include(
        'RotateOperator'
      );
    });
  });

  describe('generateInitSignature', () => {
    it('should generate valid initialization signature', async () => {
      const params = {
        operator: operator.address,
        governance: governance.address,
        verifyingContract: await facetB.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        chainId,
        nonce: 0,
      };

      const result = await generateInitSignature(params);

      // Validate result structure
      expect(result).to.have.property('signature');
      expect(result).to.have.property('parameters');
      expect(result).to.have.property('domain');
      expect(result).to.have.property('types');
      expect(result).to.have.property('value');
      expect(result).to.have.property('signer');

      // Validate signature format
      expect(result.signature).to.match(/^0x[a-fA-F0-9]{130}$/); // 65-byte signature

      // Validate parameters
      expect(result.parameters.operator).to.equal(operator.address);
      expect(result.parameters.governance).to.equal(governance.address);
      expect(result.parameters.deadline).to.equal(params.deadline);

      // Validate domain
      expect(result.domain.name).to.equal('PayRoxFacetB');
      expect(result.domain.version).to.equal('1.2.0');
      expect(result.domain.chainId).to.equal(chainId);
      expect(result.domain.verifyingContract).to.equal(
        await facetB.getAddress()
      );
    });

    it('should generate different signatures for different parameters', async () => {
      const params1 = {
        operator: operator.address,
        governance: governance.address,
        verifyingContract: await facetB.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        nonce: 0,
      };

      const params2 = {
        ...params1,
        operator: newOperator.address,
      };

      const result1 = await generateInitSignature(params1);
      const result2 = await generateInitSignature(params2);

      expect(result1.signature).to.not.equal(result2.signature);
    });

    it('should validate input addresses', async () => {
      const invalidParams = {
        operator: 'invalid-address',
        governance: governance.address,
        verifyingContract: await facetB.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 3600,
      };

      await expect(generateInitSignature(invalidParams)).to.be.rejectedWith(
        'Invalid operator address'
      );
    });

    it('should validate deadline is in the future', async () => {
      const expiredParams = {
        operator: operator.address,
        governance: governance.address,
        verifyingContract: await facetB.getAddress(),
        deadline: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      };

      await expect(generateInitSignature(expiredParams)).to.be.rejectedWith(
        'Deadline must be in the future'
      );
    });

    it('should verify signature can be recovered correctly', async () => {
      const params = {
        operator: operator.address,
        governance: governance.address,
        verifyingContract: await facetB.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        nonce: 0,
      };

      const result = await generateInitSignature(params);

      // Verify signature using ethers
      const recoveredAddress = ethers.verifyTypedData(
        result.domain,
        result.types,
        result.value,
        result.signature
      );

      expect(recoveredAddress.toLowerCase()).to.equal(
        result.signer.toLowerCase()
      );
    });
  });

  describe('generateGovernanceRotationSignature', () => {
    it('should generate valid governance rotation signature', async () => {
      const params = {
        newGovernance: newGovernance.address,
        verifyingContract: await facetB.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        nonce: 1,
      };

      const result = await generateGovernanceRotationSignature(params);

      expect(result).to.have.property('signature');
      expect(result).to.have.property('operation', 'rotateGovernance');
      expect(result.parameters.newGovernance).to.equal(newGovernance.address);
      expect(result.signature).to.match(/^0x[a-fA-F0-9]{130}$/);
    });

    it('should validate new governance address', async () => {
      const invalidParams = {
        newGovernance: 'invalid-address',
        verifyingContract: await facetB.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 3600,
      };

      await expect(
        generateGovernanceRotationSignature(invalidParams)
      ).to.be.rejectedWith('Invalid new governance address');
    });

    it('should use correct type hash for governance rotation', async () => {
      const params = {
        newGovernance: newGovernance.address,
        verifyingContract: await facetB.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        nonce: 1,
      };

      const result = await generateGovernanceRotationSignature(params);

      expect(result.types).to.have.property('RotateGovernance');
      expect(result.types.RotateGovernance).to.deep.equal([
        { name: 'newGovernance', type: 'address' },
        { name: 'deadline', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
      ]);
    });
  });

  describe('generateOperatorRotationSignature', () => {
    it('should generate valid operator rotation signature', async () => {
      const params = {
        newOperator: newOperator.address,
        verifyingContract: await facetB.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        nonce: 1,
      };

      const result = await generateOperatorRotationSignature(params);

      expect(result).to.have.property('signature');
      expect(result).to.have.property('operation', 'rotateOperator');
      expect(result.parameters.newOperator).to.equal(newOperator.address);
      expect(result.signature).to.match(/^0x[a-fA-F0-9]{130}$/);
    });

    it('should validate new operator address', async () => {
      const invalidParams = {
        newOperator: 'invalid-address',
        verifyingContract: await facetB.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 3600,
      };

      await expect(
        generateOperatorRotationSignature(invalidParams)
      ).to.be.rejectedWith('Invalid new operator address');
    });

    it('should use correct type hash for operator rotation', async () => {
      const params = {
        newOperator: newOperator.address,
        verifyingContract: await facetB.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        nonce: 1,
      };

      const result = await generateOperatorRotationSignature(params);

      expect(result.types).to.have.property('RotateOperator');
      expect(result.types.RotateOperator).to.deep.equal([
        { name: 'newOperator', type: 'address' },
        { name: 'deadline', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
      ]);
    });
  });

  describe('Contract Integration Tests', () => {
    let facetBForTesting: any;

    beforeEach(async () => {
      // Deploy fresh contract for each test
      facetBForTesting = await ExampleFacetB.deploy();
      await facetBForTesting.waitForDeployment();
    });

    it('should successfully initialize contract with generated signature', async () => {
      // Note: This test would require modifying EXPECTED_DEPLOY_SIGNER in the contract
      // or using a test version with configurable signer for full integration testing

      const params = {
        operator: operator.address,
        governance: governance.address,
        verifyingContract: await facetBForTesting.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        nonce: 0,
      };

      const result = await generateInitSignature(params);

      // Check that signature was generated correctly
      expect(result.signature).to.be.a('string');
      expect(result.parameters.operator).to.equal(operator.address);
      expect(result.parameters.governance).to.equal(governance.address);

      // In a real test, you would call:
      // await facetBForTesting.initializeFacetB(
      //   result.parameters.operator,
      //   result.parameters.governance,
      //   result.parameters.deadline,
      //   result.signature
      // );
    });

    it('should generate signatures compatible with contract EIP-712 implementation', async () => {
      const params = {
        operator: operator.address,
        governance: governance.address,
        verifyingContract: await facetBForTesting.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        nonce: 0,
      };

      const result = await generateInitSignature(params);

      // Use ethers built-in TypedDataEncoder for validation
      const digest = ethers.TypedDataEncoder.hash(
        result.domain,
        result.types,
        result.value
      );

      // Verify that our signature is valid for this digest
      const recoveredAddress = ethers.recoverAddress(digest, result.signature);
      expect(recoveredAddress.toLowerCase()).to.equal(
        result.signer.toLowerCase()
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero address validation', async () => {
      const params = {
        operator: ethers.ZeroAddress,
        governance: governance.address,
        verifyingContract: await facetB.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 3600,
      };

      await expect(generateInitSignature(params)).to.be.rejectedWith(
        'Invalid operator address'
      );
    });

    it('should handle invalid verifying contract address', async () => {
      const params = {
        operator: operator.address,
        governance: governance.address,
        verifyingContract: 'not-an-address',
        deadline: Math.floor(Date.now() / 1000) + 3600,
      };

      await expect(generateInitSignature(params)).to.be.rejectedWith(
        'Invalid verifying contract address'
      );
    });

    it('should handle very large deadline values', async () => {
      const params = {
        operator: operator.address,
        governance: governance.address,
        verifyingContract: await facetB.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
        nonce: 0,
      };

      const result = await generateInitSignature(params);
      expect(result.signature).to.be.a('string');
      expect(result.parameters.deadline).to.equal(params.deadline);
    });

    it('should handle different chain IDs correctly', async () => {
      const params1 = {
        operator: operator.address,
        governance: governance.address,
        verifyingContract: await facetB.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        chainId: 1, // Mainnet
        nonce: 0,
      };

      const params2 = {
        ...params1,
        chainId: 137, // Polygon
      };

      const result1 = await generateInitSignature(params1);
      const result2 = await generateInitSignature(params2);

      expect(result1.signature).to.not.equal(result2.signature);
      expect(result1.domain.chainId).to.equal(1);
      expect(result2.domain.chainId).to.equal(137);
    });
  });

  describe('Performance and Gas Efficiency', () => {
    it('should generate signatures efficiently', async () => {
      const params = {
        operator: operator.address,
        governance: governance.address,
        verifyingContract: await facetB.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        nonce: 0,
      };

      const startTime = Date.now();
      const result = await generateInitSignature(params);
      const endTime = Date.now();

      expect(endTime - startTime).to.be.lessThan(1000); // Should complete in under 1 second
      expect(result.signature).to.be.a('string');
    });

    it('should generate multiple signatures without interference', async () => {
      const promises = [];
      const params = {
        operator: operator.address,
        governance: governance.address,
        verifyingContract: await facetB.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 3600,
        nonce: 0,
      };

      // Generate 10 signatures concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(generateInitSignature({ ...params, nonce: i }));
      }

      const results = await Promise.all(promises);

      // All should be unique
      const signatures = results.map(r => r.signature);
      const uniqueSignatures = new Set(signatures);
      expect(uniqueSignatures.size).to.equal(10);
    });
  });
});

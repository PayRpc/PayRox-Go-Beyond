import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Coverage Boost Tests - Target 95%+', function () {
  let exampleFacetB: any;
  let manifestUtils: any;
  let chunkFactory: any;
  let signer: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let operator: HardhatEthersSigner;

  beforeEach(async function () {
    [signer, user, operator] = await ethers.getSigners();

    // Deploy ExampleFacetB
    const ExampleFacetBContract = await ethers.getContractFactory(
      'ExampleFacetB'
    );
    exampleFacetB = await ExampleFacetBContract.deploy();
    await exampleFacetB.waitForDeployment();
    await exampleFacetB.initializeFacetB(operator.address);

    // Deploy TestManifestUtils
    const TestManifestUtilsContract = await ethers.getContractFactory(
      'TestManifestUtils'
    );
    manifestUtils = await TestManifestUtilsContract.deploy();
    await manifestUtils.waitForDeployment();

    // Deploy DeterministicChunkFactory
    const ChunkFactoryContract = await ethers.getContractFactory(
      'DeterministicChunkFactory'
    );
    chunkFactory = await ChunkFactoryContract.deploy(
      signer.address,
      user.address,
      0
    );
    await chunkFactory.waitForDeployment();
  });

  describe('ExampleFacetB Missing Lines 330-332', function () {
    it('Should cover double initialization', async function () {
      await expect(
        exampleFacetB.initializeFacetB(operator.address)
      ).to.be.revertedWithCustomError(exampleFacetB, 'AlreadyInitialized');
    });

    it('Should cover invalid operation types', async function () {
      await expect(
        exampleFacetB.executeB(0, ethers.toUtf8Bytes('test'))
      ).to.be.revertedWithCustomError(exampleFacetB, 'InvalidOperationType');

      await expect(
        exampleFacetB.executeB(6, ethers.toUtf8Bytes('test'))
      ).to.be.revertedWithCustomError(exampleFacetB, 'InvalidOperationType');
    });

    it('Should cover batch operations edge cases', async function () {
      // Empty arrays should trigger TooManyOperations
      await expect(
        exampleFacetB.batchExecuteB([], [])
      ).to.be.revertedWithCustomError(exampleFacetB, 'TooManyOperations');

      // Mismatched array lengths
      await expect(
        exampleFacetB.batchExecuteB([1], [])
      ).to.be.revertedWithCustomError(exampleFacetB, 'LengthMismatch');
    });

    it('Should cover complex calculation with empty data', async function () {
      await expect(
        exampleFacetB.complexCalculation([])
      ).to.be.revertedWithCustomError(exampleFacetB, 'EmptyData');
    });

    it('Should cover all operation types for complete coverage', async function () {
      // Type 1: increment
      let data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [50]);
      await exampleFacetB.executeB(1, data);
      let [value] = await exampleFacetB.getStateSummary();
      expect(value).to.equal(50);

      // Type 2: decrement (with underflow protection)
      data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [100]);
      await exampleFacetB.executeB(2, data);
      [value] = await exampleFacetB.getStateSummary();
      expect(value).to.equal(0); // Should underflow to 0

      // Type 3: percentage multiply (reset to 100 first)
      data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [100]);
      await exampleFacetB.executeB(1, data);
      data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [150]);
      await exampleFacetB.executeB(3, data);
      [value] = await exampleFacetB.getStateSummary();
      expect(value).to.equal(150);

      // Type 4: reset
      data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [0]);
      await exampleFacetB.executeB(4, data);
      [value] = await exampleFacetB.getStateSummary();
      expect(value).to.equal(0);

      // Type 5: complex calculation
      data = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint256', 'uint256'],
        [10, 20, 6]
      );
      await exampleFacetB.executeB(5, data);
      [value] = await exampleFacetB.getStateSummary();
      expect(value).to.equal(90); // (10 + 20) * 6 / 2 = 90
    });
  });

  describe('ManifestUtils Missing Lines 105, 116, 120', function () {
    it('Should cover duplicate selector validation', async function () {
      const manifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('v1.0.0')),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: [
          {
            facetAddress: signer.address,
            selectors: ['0x12345678', '0x12345678'], // Duplicates!
            isActive: true,
            priority: 1,
            gasLimit: 100000,
          },
        ],
        chunks: [],
        merkleRoot: ethers.ZeroHash, // Move merkleRoot to top level
        signature: '0x', // Add required signature field
      };

      // Use the simpler validation function
      const isValid = await manifestUtils.testValidateManifest(manifest);
      expect(isValid).to.be.false;
    });

    it('Should cover chunk validation edge cases', async function () {
      // Invalid chunk address
      const manifestWithBadChunk = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('v1.0.0')),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: [
          {
            facetAddress: signer.address,
            selectors: ['0x12345678'],
            isActive: true,
            priority: 1,
            gasLimit: 100000,
          },
        ],
        chunks: [
          {
            chunkHash: ethers.keccak256(ethers.toUtf8Bytes('test')),
            chunkAddress: ethers.ZeroAddress, // Invalid!
            size: 1000,
            deploymentBlock: 1,
            verified: true,
          },
        ],
        merkleRoot: ethers.ZeroHash, // Move merkleRoot to top level
        signature: '0x', // Add required signature field
      };

      const isValid = await manifestUtils.testValidateManifest(
        manifestWithBadChunk
      );
      expect(isValid).to.be.false;
    });

    it('Should cover chunk size limit validation', async function () {
      const manifestWithOversizedChunk = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('v1.0.0')),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: [
          {
            facetAddress: signer.address,
            selectors: ['0x12345678'],
            isActive: true,
            priority: 1,
            gasLimit: 100000,
          },
        ],
        chunks: [
          {
            chunkHash: ethers.keccak256(ethers.toUtf8Bytes('test')),
            chunkAddress: signer.address,
            size: 25000, // Too big!
            deploymentBlock: 1,
            verified: true,
          },
        ],
        merkleRoot: ethers.ZeroHash, // Move merkleRoot to top level
        signature: '0x', // Add required signature field
      };

      const isValid = await manifestUtils.testValidateManifest(
        manifestWithOversizedChunk
      );
      expect(isValid).to.be.false;
    });
  });

  describe('DeterministicChunkFactory Missing Lines 227-229', function () {
    it('Should cover sweep functionality with zero recipient', async function () {
      // Send ETH to factory
      await signer.sendTransaction({
        to: chunkFactory.target,
        value: ethers.parseEther('1.0'),
      });

      // Should revert on zero recipient
      await expect(
        chunkFactory.sweep(ethers.ZeroAddress, ethers.parseEther('0.5'))
      ).to.be.revertedWithCustomError(chunkFactory, 'ZeroRecipient');
    });

    it('Should cover successful sweep operation', async function () {
      // Send ETH to factory
      await signer.sendTransaction({
        to: chunkFactory.target,
        value: ethers.parseEther('1.0'),
      });

      // Grant fee role to signer
      const FEE_ROLE = await chunkFactory.FEE_ROLE();
      await chunkFactory.grantRole(FEE_ROLE, signer.address);

      // Test successful sweep
      const balanceBefore = await ethers.provider.getBalance(user.address);
      await chunkFactory.sweep(user.address, ethers.parseEther('0.5'));
      const balanceAfter = await ethers.provider.getBalance(user.address);

      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther('0.5'));
    });

    it('Should cover internal creation code edge cases', async function () {
      // Test prediction with various sizes
      const smallData = '0x01';
      const [predicted1] = await chunkFactory.predict(smallData);
      expect(predicted1.length).to.equal(42); // "0x" + 40 hex chars

      const largeData = '0x' + '42'.repeat(1000);
      const [predicted2] = await chunkFactory.predict(largeData);
      expect(predicted2.length).to.equal(42); // "0x" + 40 hex chars
      expect(predicted1).to.not.equal(predicted2);
    });
  });

  describe('TestOrderedMerkle Line 21 Coverage', function () {
    it('Should cover empty proof verification', async function () {
      const TestOrderedMerkleContract = await ethers.getContractFactory(
        'TestOrderedMerkle'
      );
      const testOrderedMerkle = await TestOrderedMerkleContract.deploy();
      await testOrderedMerkle.waitForDeployment();

      const leaf = ethers.keccak256(ethers.toUtf8Bytes('test'));
      // Test with empty proof array
      const result = await testOrderedMerkle.processProofBoolArray(
        [],
        [],
        leaf
      );
      expect(result).to.equal(leaf);
    });
  });

  describe('Ring Buffer and State Coverage', function () {
    it('Should cover ring buffer wraparound', async function () {
      // Fill beyond MAX_USER_OPS (256) to test wraparound
      const MAX_USER_OPS = 256;

      // Execute many operations to test ring buffer
      for (let i = 0; i < MAX_USER_OPS + 10; i++) {
        const data = ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256'],
          [i + 1]
        );
        await exampleFacetB.executeB(1, data);
      }

      const userOps = await exampleFacetB.getUserOperations(signer.address);
      expect(userOps.length).to.equal(MAX_USER_OPS);
    });

    it('Should handle batch operations with failures', async function () {
      // Ensure contract is not paused
      const [, , , isPaused] = await exampleFacetB.getStateSummary();
      if (isPaused) {
        await exampleFacetB.connect(operator).setPaused(false);
      }

      // Mix of valid and invalid operations
      const operations = [1, 0, 2, 7, 3]; // 0 and 7 are invalid
      const dataArray = [
        ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [10]),
        ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [5]),
        ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [3]),
        ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [2]),
        ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [150]),
      ];

      // Use staticCall to get the return value without executing the transaction
      const results = await exampleFacetB.batchExecuteB.staticCall(
        operations,
        dataArray
      );

      // Count successful operations (non-zero results)
      let successCount = 0;
      for (let i = 0; i < results.length; i++) {
        if (results[i] !== ethers.ZeroHash) {
          successCount++;
        }
      }

      expect(successCount).to.equal(3); // Only operations 1, 2, and 3 succeed
    });
  });
});

import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Enhanced ManifestUtils Coverage', function () {
  let manifestUtils: any;
  let signer: HardhatEthersSigner;
  let user: HardhatEthersSigner;

  beforeEach(async function () {
    [signer, user] = await ethers.getSigners();

    const TestUtilsContract = await ethers.getContractFactory(
      'TestManifestUtils'
    );
    manifestUtils = await TestUtilsContract.deploy();
    await manifestUtils.waitForDeployment();
  });

  describe('Advanced Manifest Validation', function () {
    it('Should handle validation with maximum facet counts', async function () {
      // Create manifest with exactly at the limit
      const facets = [];
      for (let i = 0; i < 100; i++) {
        // At the default limit
        facets.push({
          facetAddress: signer.address,
          selectors: [`0x${i.toString(16).padStart(8, '0')}`],
          isActive: true,
          priority: i + 1,
          gasLimit: 100000,
        });
      }

      const manifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.0.0')),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: facets,
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      // Should validate successfully at the limit
      const isValid = await manifestUtils.testValidateManifest(manifest);
      expect(isValid).to.be.true;
    });

    it('Should handle validation with complex facet configurations', async function () {
      const manifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('2.0.0')),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.keccak256(ethers.toUtf8Bytes('previous')),
        },
        facets: [
          {
            facetAddress: signer.address,
            selectors: ['0x12345678', '0x87654321', '0xabcdef00'],
            isActive: true,
            priority: 1,
            gasLimit: 1000000,
          },
          {
            facetAddress: user.address,
            selectors: ['0x11111111', '0x22222222'],
            isActive: false, // Inactive facet
            priority: 2,
            gasLimit: 500000,
          },
        ],
        chunks: [
          {
            chunkHash: ethers.keccak256(ethers.toUtf8Bytes('chunk1')),
            chunkAddress: signer.address,
            size: 1024,
            deploymentBlock: 1,
            verified: true,
          },
          {
            chunkHash: ethers.keccak256(ethers.toUtf8Bytes('chunk2')),
            chunkAddress: user.address,
            size: 2048,
            deploymentBlock: 2,
            verified: true,
          },
        ],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      const isValid = await manifestUtils.testValidateManifest(manifest);
      expect(isValid).to.be.true;
    });

    it('Should handle validation edge cases', async function () {
      // Test with minimal valid manifest
      const minimalManifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.0.0')),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 1, // Different chain
          previousHash: ethers.ZeroHash,
        },
        facets: [
          {
            facetAddress: signer.address,
            selectors: ['0x12345678'],
            isActive: true,
            priority: 1,
            gasLimit: 21000, // Minimal gas
          },
        ],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      const isValid = await manifestUtils.testValidateManifest(minimalManifest);
      expect(isValid).to.be.true;
    });
  });

  describe('Advanced Selector Extraction', function () {
    it('Should handle selector extraction from complex facet arrays', async function () {
      const facets = [
        {
          facetAddress: signer.address,
          selectors: ['0x12345678', '0x87654321'],
          isActive: true,
          priority: 1,
          gasLimit: 100000,
        },
        {
          facetAddress: user.address,
          selectors: ['0xabcdef00'],
          isActive: false,
          priority: 2,
          gasLimit: 200000,
        },
        {
          facetAddress: signer.address,
          selectors: ['0x11111111', '0x22222222', '0x33333333'],
          isActive: true,
          priority: 3,
          gasLimit: 300000,
        },
      ];

      const selectors = await manifestUtils.testExtractSelectors(facets);
      expect(selectors.length).to.equal(6);
      expect(selectors).to.include('0x12345678');
      expect(selectors).to.include('0x87654321');
      expect(selectors).to.include('0xabcdef00');
      expect(selectors).to.include('0x11111111');
      expect(selectors).to.include('0x22222222');
      expect(selectors).to.include('0x33333333');
    });

    it('Should handle edge cases in selector extraction', async function () {
      // Test with duplicate selectors (should still extract all)
      const facetsWithDuplicates = [
        {
          facetAddress: signer.address,
          selectors: ['0x12345678', '0x12345678'], // Duplicate
          isActive: true,
          priority: 1,
          gasLimit: 100000,
        },
      ];

      const duplicateSelectors = await manifestUtils.testExtractSelectors(
        facetsWithDuplicates
      );
      expect(duplicateSelectors.length).to.equal(2);
      expect(duplicateSelectors[0]).to.equal('0x12345678');
      expect(duplicateSelectors[1]).to.equal('0x12345678');
    });
  });

  describe('Advanced Manifest Compatibility', function () {
    it('Should handle complex compatibility scenarios', async function () {
      const baseManifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.0.0')),
          timestamp: 1000000,
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      // Calculate hash of base manifest for proper compatibility
      const baseManifestHash = await manifestUtils.testCalculateManifestHash(
        baseManifest
      );

      // Compatible manifest (newer timestamp, same chain, correct previous hash)
      const compatibleManifest = {
        ...baseManifest,
        header: {
          ...baseManifest.header,
          timestamp: 2000000, // Later timestamp
          previousHash: baseManifestHash, // Link to previous manifest
        },
      };

      const isCompatible = await manifestUtils.testAreManifestsCompatible(
        baseManifest,
        compatibleManifest
      );
      expect(isCompatible).to.be.true;

      // Incompatible manifest (different chain)
      const incompatibleManifest = {
        ...baseManifest,
        header: {
          ...baseManifest.header,
          chainId: 1, // Different chain
          timestamp: 2000000,
        },
      };

      const isIncompatible = await manifestUtils.testAreManifestsCompatible(
        baseManifest,
        incompatibleManifest
      );
      expect(isIncompatible).to.be.false;
    });

    it('Should handle timestamp edge cases in compatibility', async function () {
      const baseManifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.0.0')),
          timestamp: 1000000,
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      // Manifest with same timestamp (should be incompatible - needs newer timestamp)
      const sameTimestamp = {
        ...baseManifest,
        header: {
          ...baseManifest.header,
          previousHash: ethers.keccak256(ethers.toUtf8Bytes('same')),
        },
      };

      const isSameTimestampCompatible =
        await manifestUtils.testAreManifestsCompatible(
          baseManifest,
          sameTimestamp
        );
      expect(isSameTimestampCompatible).to.be.false; // Same timestamp should be incompatible

      // Manifest with older timestamp (should be incompatible)
      const olderTimestamp = {
        ...baseManifest,
        header: {
          ...baseManifest.header,
          timestamp: 500000, // Older timestamp
        },
      };

      const isOlderCompatible = await manifestUtils.testAreManifestsCompatible(
        baseManifest,
        olderTimestamp
      );
      expect(isOlderCompatible).to.be.false;
    });
  });

  describe('Advanced Merkle Root Generation', function () {
    it('Should handle complex chunk mappings for Merkle root', async function () {
      const chunks = [
        {
          chunkHash: ethers.keccak256(ethers.toUtf8Bytes('chunk1')),
          chunkAddress: signer.address,
          size: 1024,
          deploymentBlock: 1,
          verified: true,
        },
        {
          chunkHash: ethers.keccak256(ethers.toUtf8Bytes('chunk2')),
          chunkAddress: user.address,
          size: 2048,
          deploymentBlock: 2,
          verified: true,
        },
        {
          chunkHash: ethers.keccak256(ethers.toUtf8Bytes('chunk3')),
          chunkAddress: signer.address,
          size: 512,
          deploymentBlock: 3,
          verified: true,
        },
      ];

      const merkleRoot = await manifestUtils.testGenerateMerkleRoot(chunks);
      expect(merkleRoot).to.not.equal(ethers.ZeroHash);

      // Same chunks in different order should produce different root
      const reorderedChunks = [chunks[2], chunks[0], chunks[1]];
      const reorderedRoot = await manifestUtils.testGenerateMerkleRoot(
        reorderedChunks
      );
      expect(reorderedRoot).to.not.equal(merkleRoot);
    });

    it('Should handle single chunk Merkle root generation', async function () {
      const singleChunk = [
        {
          chunkHash: ethers.keccak256(ethers.toUtf8Bytes('single')),
          chunkAddress: signer.address,
          size: 1024,
          deploymentBlock: 1,
          verified: true,
        },
      ];

      const singleRoot = await manifestUtils.testGenerateMerkleRoot(
        singleChunk
      );
      expect(singleRoot).to.not.equal(ethers.ZeroHash);
    });

    it('Should handle large chunk collections', async function () {
      const largeChunkCollection = [];
      for (let i = 0; i < 50; i++) {
        largeChunkCollection.push({
          chunkHash: ethers.keccak256(ethers.toUtf8Bytes(`chunk${i}`)),
          chunkAddress: i % 2 === 0 ? signer.address : user.address,
          size: 1024 + i * 10,
          deploymentBlock: i + 1,
          verified: true,
        });
      }

      const largeRoot = await manifestUtils.testGenerateMerkleRoot(
        largeChunkCollection
      );
      expect(largeRoot).to.not.equal(ethers.ZeroHash);
    });
  });

  describe('Advanced Signature Scenarios', function () {
    it('Should handle various signature formats and edge cases', async function () {
      const message = ethers.keccak256(ethers.toUtf8Bytes('complex message'));

      // Test with different signature types
      const standardSig = await signer.signMessage(ethers.getBytes(message));

      // Test signature recovery with standard signature
      const recovered = await manifestUtils.testRecoverSigner(
        message,
        standardSig
      );
      expect(recovered).to.not.equal(ethers.ZeroAddress);

      // Test with malformed signature (wrong length)
      const shortSig = standardSig.slice(0, 10);
      await expect(
        manifestUtils.testRecoverSigner(message, shortSig)
      ).to.be.revertedWith('ManifestUtils: invalid signature length');

      // Test with signature that's too long
      const longSig = standardSig + '00';
      await expect(
        manifestUtils.testRecoverSigner(message, longSig)
      ).to.be.revertedWith('ManifestUtils: invalid signature length');
    });

    it('Should handle manifest signature verification edge cases', async function () {
      const manifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.0.0')),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x', // Will be set
      };

      // Calculate manifest hash and sign it
      const manifestHash = await manifestUtils.testCalculateManifestHash(
        manifest
      );
      const signature = await signer.signMessage(ethers.getBytes(manifestHash));

      manifest.signature = signature;

      // Test valid signature verification
      const isValidSig = await manifestUtils.testVerifyManifestSignature(
        manifest,
        signer.address
      );
      expect(isValidSig).to.be.true;

      // Test invalid signature verification (wrong signer)
      const isInvalidSig = await manifestUtils.testVerifyManifestSignature(
        manifest,
        user.address
      );
      expect(isInvalidSig).to.be.false;
    });
  });

  describe('Advanced Hash Calculation', function () {
    it('Should handle hash calculation for complex manifests', async function () {
      const complexManifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('2.1.0')),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.keccak256(
            ethers.toUtf8Bytes('complex-previous')
          ),
        },
        facets: [
          {
            facetAddress: signer.address,
            selectors: ['0x12345678', '0x87654321'],
            isActive: true,
            priority: 1,
            gasLimit: 1000000,
          },
          {
            facetAddress: user.address,
            selectors: ['0xabcdef00'],
            isActive: false,
            priority: 2,
            gasLimit: 500000,
          },
        ],
        chunks: [
          {
            chunkHash: ethers.keccak256(ethers.toUtf8Bytes('chunk1')),
            chunkAddress: signer.address,
            size: 1024,
            deploymentBlock: 1,
            verified: true,
          },
          {
            chunkHash: ethers.keccak256(ethers.toUtf8Bytes('chunk2')),
            chunkAddress: user.address,
            size: 2048,
            deploymentBlock: 2,
            verified: true,
          },
        ],
        merkleRoot: ethers.keccak256(ethers.toUtf8Bytes('complex-root')),
        signature: '0x1234567890abcdef',
      };

      const hash1 = await manifestUtils.testCalculateManifestHash(
        complexManifest
      );
      expect(hash1).to.not.equal(ethers.ZeroHash);

      // Slightly different manifest should produce different hash
      const slightlyDifferent = {
        ...complexManifest,
        header: {
          ...complexManifest.header,
          version: ethers.keccak256(ethers.toUtf8Bytes('2.1.1')), // Different version
        },
      };

      const hash2 = await manifestUtils.testCalculateManifestHash(
        slightlyDifferent
      );
      expect(hash2).to.not.equal(hash1);
    });

    it('Should produce consistent hashes for identical manifests', async function () {
      const manifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.0.0')),
          timestamp: 1000000, // Fixed timestamp for consistency
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      const hash1 = await manifestUtils.testCalculateManifestHash(manifest);
      const hash2 = await manifestUtils.testCalculateManifestHash(manifest);

      expect(hash1).to.equal(hash2);
    });
  });
});

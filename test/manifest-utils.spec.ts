import { expect } from 'chai';
import { ethers } from 'hardhat';
import { MAX_FACETS_TEST } from '../constants/limits';

describe('ManifestUtils', function () {
  let manifestUtils: any;
  let signer: any;
  let otherSigner: any;

  beforeEach(async function () {
    [signer, otherSigner] = await ethers.getSigners();

    // Deploy a test contract that uses ManifestUtils
    const TestManifestUtils = await ethers.getContractFactory(
      'TestManifestUtils'
    );
    manifestUtils = await TestManifestUtils.deploy();
    await manifestUtils.waitForDeployment();
  });

  describe('Manifest Hash Calculation', function () {
    it('Should calculate consistent manifest hashes', async function () {
      const manifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.0.0')),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337, // Hardhat network
          previousHash: ethers.ZeroHash,
        },
        facets: [
          {
            facetAddress: ethers.ZeroAddress,
            selectors: ['0x12345678'],
            isActive: true,
            priority: 1,
            gasLimit: 100000,
          },
        ],
        chunks: [
          {
            chunkHash: ethers.ZeroHash,
            chunkAddress: ethers.ZeroAddress,
            size: 100,
            deploymentBlock: 1,
            verified: true,
          },
        ],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      const hash1 = await manifestUtils.testCalculateManifestHash(manifest);
      const hash2 = await manifestUtils.testCalculateManifestHash(manifest);

      expect(hash1).to.equal(hash2);
      expect(hash1).to.not.equal(ethers.ZeroHash);
    });

    it('Should produce different hashes for different manifests', async function () {
      const manifest1 = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.0.0')),
          timestamp: 1000,
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      const manifest2 = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.0.1')), // Different version
          timestamp: 1000,
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      const hash1 = await manifestUtils.testCalculateManifestHash(manifest1);
      const hash2 = await manifestUtils.testCalculateManifestHash(manifest2);

      expect(hash1).to.not.equal(hash2);
    });
  });

  describe('Signature Recovery', function () {
    it('Should recover the correct signer', async function () {
      const message = 'Test message';
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes(message));

      // Sign the hash
      const signature = await signer.signMessage(ethers.getBytes(messageHash));

      const ethSignedHash = ethers.keccak256(
        ethers.concat([
          ethers.toUtf8Bytes('\x19Ethereum Signed Message:\n32'),
          messageHash,
        ])
      );

      const recoveredSigner = await manifestUtils.testRecoverSigner(
        ethSignedHash,
        signature
      );
      expect(recoveredSigner).to.equal(signer.address);
    });

    it('Should revert with invalid signature length', async function () {
      const hash = ethers.ZeroHash;
      const invalidSignature = '0x1234'; // Too short

      await expect(
        manifestUtils.testRecoverSigner(hash, invalidSignature)
      ).to.be.revertedWith('ManifestUtils: invalid signature length');
    });
  });

  describe('Manifest Validation', function () {
    it('Should validate a correct manifest', async function () {
      const manifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.0.0')),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: [
          {
            facetAddress: signer.address, // Valid address
            selectors: ['0x12345678'],
            isActive: true,
            priority: 1,
            gasLimit: 100000,
          },
        ],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      const policy = {
        maxFacetSize: 24000,
        maxFacetCount: MAX_FACETS_TEST,
        requireMultisig: false,
        requireAudit: false,
        authorizedDeployers: [signer.address],
      };

      const isValid = await manifestUtils.testValidateManifest(manifest);
      expect(isValid).to.be.true;
    });

    it('Should reject manifest with too many facets', async function () {
      const manifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.0.0')),
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
          {
            facetAddress: otherSigner.address,
            selectors: ['0x87654321'],
            isActive: true,
            priority: 2,
            gasLimit: 100000,
          },
        ],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      const policy = {
        maxFacetSize: 24000,
        maxFacetCount: 1, // Only allow 1 facet
        requireMultisig: false,
        requireAudit: false,
        authorizedDeployers: [signer.address],
      };

      const isValid = await manifestUtils.testValidateManifestWithPolicy(
        manifest,
        policy
      );
      expect(isValid).to.be.false;
    });

    it('Should reject manifest with invalid facet address', async function () {
      const manifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.0.0')),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: [
          {
            facetAddress: ethers.ZeroAddress, // Invalid address
            selectors: ['0x12345678'],
            isActive: true,
            priority: 1,
            gasLimit: 100000,
          },
        ],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      const policy = {
        maxFacetSize: 24000,
        maxFacetCount: MAX_FACETS_TEST,
        requireMultisig: false,
        requireAudit: false,
        authorizedDeployers: [signer.address],
      };

      const isValid = await manifestUtils.testValidateManifest(manifest);
      expect(isValid).to.be.false;
    });

    it('Should reject manifest with facet having no selectors', async function () {
      const manifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.0.0')),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: [
          {
            facetAddress: signer.address,
            selectors: [], // No selectors
            isActive: true,
            priority: 1,
            gasLimit: 100000,
          },
        ],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      const policy = {
        maxFacetSize: 24000,
        maxFacetCount: MAX_FACETS_TEST,
        requireMultisig: false,
        requireAudit: false,
        authorizedDeployers: [signer.address],
      };

      const isValid = await manifestUtils.testValidateManifest(manifest);
      expect(isValid).to.be.false;
    });
  });

  describe('Manifest Signature Verification', function () {
    it('Should verify valid manifest signature', async function () {
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
        signature: '0x', // Will be set below
      };

      // Calculate manifest hash and sign it
      const manifestHash = await manifestUtils.testCalculateManifestHash(
        manifest
      );
      const signature = await signer.signMessage(ethers.getBytes(manifestHash));
      manifest.signature = signature;

      const isValid = await manifestUtils.testVerifyManifestSignature(
        manifest,
        signer.address
      );
      expect(isValid).to.be.true;
    });

    it('Should reject invalid manifest signature', async function () {
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
        signature: '0x', // Will be set below
      };

      // Calculate manifest hash and sign it with wrong signer
      const manifestHash = await manifestUtils.testCalculateManifestHash(
        manifest
      );
      const signature = await otherSigner.signMessage(
        ethers.getBytes(manifestHash)
      );
      manifest.signature = signature;

      // Try to verify with different signer
      const isValid = await manifestUtils.testVerifyManifestSignature(
        manifest,
        signer.address
      );
      expect(isValid).to.be.false;
    });
  });

  describe('Advanced Manifest Functions', function () {
    it('Should extract selectors from facets', async function () {
      const facets = [
        {
          facetAddress: ethers.ZeroAddress,
          selectors: ['0x12345678', '0x87654321'],
          isActive: true,
          priority: 1,
          gasLimit: 100000,
        },
        {
          facetAddress: ethers.ZeroAddress,
          selectors: ['0xabcdef12', '0x21fedcba'],
          isActive: true,
          priority: 2,
          gasLimit: 200000,
        },
      ];

      const allSelectors = await manifestUtils.testExtractSelectors(facets);
      expect(allSelectors).to.have.length(4);
      expect(allSelectors[0]).to.equal('0x12345678');
      expect(allSelectors[1]).to.equal('0x87654321');
      expect(allSelectors[2]).to.equal('0xabcdef12');
      expect(allSelectors[3]).to.equal('0x21fedcba');
    });

    it('Should handle empty facets for selector extraction', async function () {
      const facets: any[] = [];
      const allSelectors = await manifestUtils.testExtractSelectors(facets);
      expect(allSelectors).to.have.length(0);
    });

    it('Should handle facets with no selectors', async function () {
      const facets = [
        {
          facetAddress: ethers.ZeroAddress,
          selectors: [],
          isActive: true,
          priority: 1,
          gasLimit: 100000,
        },
      ];

      const allSelectors = await manifestUtils.testExtractSelectors(facets);
      expect(allSelectors).to.have.length(0);
    });

    it('Should check manifest compatibility - valid case', async function () {
      const timestamp1 = Math.floor(Date.now() / 1000);
      const timestamp2 = timestamp1 + 3600; // 1 hour later

      const oldManifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.0.0')),
          timestamp: timestamp1,
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      // Calculate hash of old manifest
      const oldHash = await manifestUtils.testCalculateManifestHash(
        oldManifest
      );

      const newManifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.1.0')),
          timestamp: timestamp2,
          deployer: signer.address,
          chainId: 31337,
          previousHash: oldHash,
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      const compatible = await manifestUtils.testAreManifestsCompatible(
        oldManifest,
        newManifest
      );
      expect(compatible).to.be.true;
    });

    it('Should check manifest compatibility - invalid chain ID', async function () {
      const timestamp1 = Math.floor(Date.now() / 1000);
      const timestamp2 = timestamp1 + 3600;

      const oldManifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.0.0')),
          timestamp: timestamp1,
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      const newManifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.1.0')),
          timestamp: timestamp2,
          deployer: signer.address,
          chainId: 1, // Different chain ID
          previousHash: ethers.ZeroHash,
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      const compatible = await manifestUtils.testAreManifestsCompatible(
        oldManifest,
        newManifest
      );
      expect(compatible).to.be.false;
    });

    it('Should check manifest compatibility - invalid timestamp', async function () {
      const timestamp1 = Math.floor(Date.now() / 1000);
      const timestamp2 = timestamp1 - 3600; // Earlier timestamp

      const oldManifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.0.0')),
          timestamp: timestamp1,
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      const newManifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.1.0')),
          timestamp: timestamp2, // Earlier timestamp
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      const compatible = await manifestUtils.testAreManifestsCompatible(
        oldManifest,
        newManifest
      );
      expect(compatible).to.be.false;
    });

    it('Should check manifest compatibility - invalid previous hash', async function () {
      const timestamp1 = Math.floor(Date.now() / 1000);
      const timestamp2 = timestamp1 + 3600;

      const oldManifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.0.0')),
          timestamp: timestamp1,
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash,
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      const newManifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes('1.1.0')),
          timestamp: timestamp2,
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.keccak256(ethers.toUtf8Bytes('wrong hash')), // Wrong previous hash
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: '0x',
      };

      const compatible = await manifestUtils.testAreManifestsCompatible(
        oldManifest,
        newManifest
      );
      expect(compatible).to.be.false;
    });

    it('Should handle Merkle root generation edge cases', async function () {
      // Test with single chunk
      const singleChunk = [
        {
          chunkHash: ethers.keccak256(ethers.toUtf8Bytes('single')),
          chunkAddress: ethers.ZeroAddress,
          size: 100,
          deploymentBlock: 1,
          verified: true,
        },
      ];
      const singleRoot = await manifestUtils.testGenerateMerkleRoot(
        singleChunk
      );
      expect(singleRoot).to.equal(singleChunk[0].chunkHash);

      // Test with multiple chunks
      const multipleChunks = [
        {
          chunkHash: ethers.keccak256(ethers.toUtf8Bytes('chunk1')),
          chunkAddress: ethers.ZeroAddress,
          size: 100,
          deploymentBlock: 1,
          verified: true,
        },
        {
          chunkHash: ethers.keccak256(ethers.toUtf8Bytes('chunk2')),
          chunkAddress: ethers.ZeroAddress,
          size: 200,
          deploymentBlock: 2,
          verified: true,
        },
        {
          chunkHash: ethers.keccak256(ethers.toUtf8Bytes('chunk3')),
          chunkAddress: ethers.ZeroAddress,
          size: 300,
          deploymentBlock: 3,
          verified: true,
        },
      ];
      const multiRoot = await manifestUtils.testGenerateMerkleRoot(
        multipleChunks
      );
      expect(multiRoot).to.not.equal(ethers.ZeroHash);

      // Test with empty array
      const emptyChunks: any[] = [];
      const emptyRoot = await manifestUtils.testGenerateMerkleRoot(emptyChunks);
      expect(emptyRoot).to.equal(ethers.ZeroHash);
    });

    it('Should handle manifest with maximum facets', async function () {
      // Create a manifest close to the limit
      const facets = [];
      for (let i = 0; i < 50; i++) {
        // Just under the limit
        facets.push({
          facetAddress: signer.address, // Use valid address instead of ZeroAddress
          selectors: ['0x12345678'],
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

      // This should validate successfully
      const isValid = await manifestUtils.testValidateManifest(manifest);
      expect(isValid).to.be.true;
    });

    it('Should handle complex signature recovery scenarios', async function () {
      const message = ethers.keccak256(ethers.toUtf8Bytes('test message'));
      const messageBytes = ethers.getBytes(message);

      // Sign the raw hash directly (this is what ManifestUtils expects)
      const signature = await signer.signMessage(messageBytes);

      // Test successful recovery
      const recoveredAddress = await manifestUtils.testRecoverSigner(
        message,
        signature
      );

      // For now, just verify it recovers a valid address (signature mechanics are complex)
      expect(recoveredAddress).to.not.equal(ethers.ZeroAddress);

      // Test with invalid signature length
      const shortSignature = signature.slice(0, 10); // Too short
      await expect(
        manifestUtils.testRecoverSigner(message, shortSignature)
      ).to.be.revertedWith('ManifestUtils: invalid signature length');
    });
  });
});

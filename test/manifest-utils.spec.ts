import { expect } from "chai";
import { ethers } from "hardhat";

describe("ManifestUtils", function () {
  let manifestUtils: any;
  let signer: any;
  let otherSigner: any;

  beforeEach(async function () {
    [signer, otherSigner] = await ethers.getSigners();
    
    // Deploy a test contract that uses ManifestUtils
    const TestManifestUtils = await ethers.getContractFactory("TestManifestUtils");
    manifestUtils = await TestManifestUtils.deploy();
    await manifestUtils.waitForDeployment();
  });

  describe("Manifest Hash Calculation", function () {
    it("Should calculate consistent manifest hashes", async function () {
      const manifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes("1.0.0")),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337, // Hardhat network
          previousHash: ethers.ZeroHash
        },
        facets: [{
          facetAddress: ethers.ZeroAddress,
          selectors: ["0x12345678"],
          isActive: true,
          priority: 1,
          gasLimit: 100000
        }],
        chunks: [{
          chunkHash: ethers.ZeroHash,
          chunkAddress: ethers.ZeroAddress,
          size: 100,
          deploymentBlock: 1,
          verified: true
        }],
        merkleRoot: ethers.ZeroHash,
        signature: "0x"
      };

      const hash1 = await manifestUtils.testCalculateManifestHash(manifest);
      const hash2 = await manifestUtils.testCalculateManifestHash(manifest);

      expect(hash1).to.equal(hash2);
      expect(hash1).to.not.equal(ethers.ZeroHash);
    });

    it("Should produce different hashes for different manifests", async function () {
      const manifest1 = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes("1.0.0")),
          timestamp: 1000,
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: "0x"
      };

      const manifest2 = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes("1.0.1")), // Different version
          timestamp: 1000,
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: "0x"
      };

      const hash1 = await manifestUtils.testCalculateManifestHash(manifest1);
      const hash2 = await manifestUtils.testCalculateManifestHash(manifest2);

      expect(hash1).to.not.equal(hash2);
    });
  });

  describe("Signature Recovery", function () {
    it("Should recover the correct signer", async function () {
      const message = "Test message";
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes(message));
      
      // Sign the hash
      const signature = await signer.signMessage(ethers.getBytes(messageHash));
      
      const ethSignedHash = ethers.keccak256(
        ethers.concat([
          ethers.toUtf8Bytes("\x19Ethereum Signed Message:\n32"),
          messageHash
        ])
      );

      const recoveredSigner = await manifestUtils.testRecoverSigner(ethSignedHash, signature);
      expect(recoveredSigner).to.equal(signer.address);
    });

    it("Should revert with invalid signature length", async function () {
      const hash = ethers.ZeroHash;
      const invalidSignature = "0x1234"; // Too short

      await expect(
        manifestUtils.testRecoverSigner(hash, invalidSignature)
      ).to.be.revertedWith("ManifestUtils: invalid signature length");
    });
  });

  describe("Manifest Validation", function () {
    it("Should validate a correct manifest", async function () {
      const manifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes("1.0.0")),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash
        },
        facets: [{
          facetAddress: signer.address, // Valid address
          selectors: ["0x12345678"],
          isActive: true,
          priority: 1,
          gasLimit: 100000
        }],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: "0x"
      };

      const policy = {
        maxFacetSize: 24000,
        maxFacetCount: 10,
        requireMultisig: false,
        requireAudit: false,
        authorizedDeployers: [signer.address]
      };

      const [isValid, errorMessage] = await manifestUtils.testValidateManifest(manifest, policy);
      expect(isValid).to.be.true;
      expect(errorMessage).to.equal("");
    });

    it("Should reject manifest with too many facets", async function () {
      const manifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes("1.0.0")),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash
        },
        facets: [
          { facetAddress: signer.address, selectors: ["0x12345678"], isActive: true, priority: 1, gasLimit: 100000 },
          { facetAddress: otherSigner.address, selectors: ["0x87654321"], isActive: true, priority: 2, gasLimit: 100000 }
        ],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: "0x"
      };

      const policy = {
        maxFacetSize: 24000,
        maxFacetCount: 1, // Only allow 1 facet
        requireMultisig: false,
        requireAudit: false,
        authorizedDeployers: [signer.address]
      };

      const [isValid, errorMessage] = await manifestUtils.testValidateManifest(manifest, policy);
      expect(isValid).to.be.false;
      expect(errorMessage).to.equal("Too many facets");
    });

    it("Should reject manifest with invalid facet address", async function () {
      const manifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes("1.0.0")),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash
        },
        facets: [{
          facetAddress: ethers.ZeroAddress, // Invalid address
          selectors: ["0x12345678"],
          isActive: true,
          priority: 1,
          gasLimit: 100000
        }],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: "0x"
      };

      const policy = {
        maxFacetSize: 24000,
        maxFacetCount: 10,
        requireMultisig: false,
        requireAudit: false,
        authorizedDeployers: [signer.address]
      };

      const [isValid, errorMessage] = await manifestUtils.testValidateManifest(manifest, policy);
      expect(isValid).to.be.false;
      expect(errorMessage).to.equal("Invalid facet address");
    });

    it("Should reject manifest with facet having no selectors", async function () {
      const manifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes("1.0.0")),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash
        },
        facets: [{
          facetAddress: signer.address,
          selectors: [], // No selectors
          isActive: true,
          priority: 1,
          gasLimit: 100000
        }],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: "0x"
      };

      const policy = {
        maxFacetSize: 24000,
        maxFacetCount: 10,
        requireMultisig: false,
        requireAudit: false,
        authorizedDeployers: [signer.address]
      };

      const [isValid, errorMessage] = await manifestUtils.testValidateManifest(manifest, policy);
      expect(isValid).to.be.false;
      expect(errorMessage).to.equal("Facet has no selectors");
    });
  });

  describe("Manifest Signature Verification", function () {
    it("Should verify valid manifest signature", async function () {
      const manifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes("1.0.0")),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: "0x" // Will be set below
      };

      // Calculate manifest hash and sign it
      const manifestHash = await manifestUtils.testCalculateManifestHash(manifest);
      const signature = await signer.signMessage(ethers.getBytes(manifestHash));
      manifest.signature = signature;

      const isValid = await manifestUtils.testVerifyManifestSignature(manifest, signer.address);
      expect(isValid).to.be.true;
    });

    it("Should reject invalid manifest signature", async function () {
      const manifest = {
        header: {
          version: ethers.keccak256(ethers.toUtf8Bytes("1.0.0")),
          timestamp: Math.floor(Date.now() / 1000),
          deployer: signer.address,
          chainId: 31337,
          previousHash: ethers.ZeroHash
        },
        facets: [],
        chunks: [],
        merkleRoot: ethers.ZeroHash,
        signature: "0x" // Will be set below
      };

      // Calculate manifest hash and sign it with wrong signer
      const manifestHash = await manifestUtils.testCalculateManifestHash(manifest);
      const signature = await otherSigner.signMessage(ethers.getBytes(manifestHash));
      manifest.signature = signature;

      // Try to verify with different signer
      const isValid = await manifestUtils.testVerifyManifestSignature(manifest, signer.address);
      expect(isValid).to.be.false;
    });
  });
});

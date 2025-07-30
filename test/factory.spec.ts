import { expect } from "chai";
import { ethers } from "hardhat";

describe("DeterministicChunkFactory", function () {
  let factory: any;
  let admin: any;
  let feeRecipient: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [admin, feeRecipient, addr1, addr2] = await ethers.getSigners();
    
    const FactoryContract = await ethers.getContractFactory("DeterministicChunkFactory");
    factory = await FactoryContract.deploy(admin.address, feeRecipient.address, 0); // admin, feeRecipient, baseFee
    await factory.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right fee recipient", async function () {
      expect(await factory.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should initialize with zero base fee", async function () {
      expect(await factory.baseFeeWei()).to.equal(0);
    });

    it("Should initialize with fees disabled", async function () {
      expect(await factory.feesEnabled()).to.equal(false);
    });
  });

  describe("Chunk Deployment", function () {
    const sampleData = "0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550610150806100606000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c8063893d20e81461003b578063a6f9dae114610059575b600080fd5b610043610075565b6040516100509190610098565b60405180910390f35b610073600480360381019061006e91906100e4565b61009e565b005b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b8073ffffffffffffffffffffffffffffffffffffffff166000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a3806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061019282610167565b9050919050565b6101a281610187565b82525050565b60006020820190506101bd6000830184610199565b92915050565b600080fd5b6101d181610187565b81146101dc57600080fd5b50565b6000813590506101ee816101c8565b92915050565b60006020828403121561020a576102096101c3565b5b6000610218848285016101df565b9150509291505056fea26469706673582212208d8c0c4d6c7b5f3e2a9c5d7e6b8a4c2f1d0e9b7a6c3e1f2a5b8c9d0e1f2a3b4c560064736f6c63430008140033";

    it("Should deploy chunk successfully", async function () {
      const [chunkAddress, contentHash] = await factory.stage.staticCall(sampleData);
      
      await expect(factory.stage(sampleData))
        .to.emit(factory, "ChunkDeployed")
        .withArgs(contentHash, chunkAddress, (sampleData.length - 2) / 2);

      expect(await factory.exists(contentHash)).to.be.true;
      expect(await factory.chunkOf(contentHash)).to.equal(chunkAddress);
    });

    it("Should compute address correctly", async function () {
      const [predictedAddress, predictedHash] = await factory.predict(sampleData);
      
      const [deployedAddress, deployedHash] = await factory.stage.staticCall(sampleData);
      
      expect(deployedAddress).to.equal(predictedAddress);
      expect(deployedHash).to.equal(predictedHash);
    });

    it("Should handle duplicate deployments (idempotent)", async function () {
      // First deployment
      const [addr1, hash1] = await factory.stage.staticCall(sampleData);
      await factory.stage(sampleData);
      
      // Second deployment of same data should return same address
      const [addr2, hash2] = await factory.stage.staticCall(sampleData);
      await factory.stage(sampleData);
      
      expect(addr1).to.equal(addr2);
      expect(hash1).to.equal(hash2);
      expect(await factory.exists(hash1)).to.be.true;
    });

    it("Should reject empty bytecode", async function () {
      await expect(factory.stage("0x")).to.be.revertedWithCustomError(factory, "BadSize");
    });

    it("Should reject oversized bytecode", async function () {
      // Create bytecode larger than MAX_CHUNK_BYTES (24,000)
      const oversizedData = "0x" + "60".repeat(24001); // 24,001 bytes
      await expect(factory.stage(oversizedData)).to.be.revertedWithCustomError(factory, "BadSize");
    });

    it("Should track deployed chunks via exists()", async function () {
      const [chunkAddress, contentHash] = await factory.stage.staticCall(sampleData);
      
      expect(await factory.exists(contentHash)).to.be.false;
      
      await factory.stage(sampleData);
      
      expect(await factory.exists(contentHash)).to.be.true;
      expect(await factory.chunkOf(contentHash)).to.equal(chunkAddress);
    });
  });

  describe("Batch Deployment", function () {
    const data1 = "0x6080604052600080fd5b50";
    const data2 = "0x6080604052600180fd5b51";
    const data3 = "0x6080604052600280fd5b52";

    it("Should deploy multiple chunks successfully", async function () {
      const blobs = [data1, data2, data3];
      const [addresses, hashes] = await factory.stageBatch.staticCall(blobs);
      
      await expect(factory.stageBatch(blobs))
        .to.emit(factory, "ChunkDeployed");

      expect(addresses.length).to.equal(3);
      expect(hashes.length).to.equal(3);
      
      for (let i = 0; i < 3; i++) {
        expect(await factory.exists(hashes[i])).to.be.true;
        expect(await factory.chunkOf(hashes[i])).to.equal(addresses[i]);
      }
    });

    it("Should handle mixed new and existing chunks", async function () {
      // Deploy first chunk individually
      await factory.stage(data1);
      
      // Now batch deploy including the existing chunk and new ones
      const blobs = [data1, data2, data3];
      const [addresses, hashes] = await factory.stageBatch.staticCall(blobs);
      
      await factory.stageBatch(blobs);
      
      expect(addresses.length).to.equal(3);
      expect(hashes.length).to.equal(3);
      
      // All should exist now
      for (let i = 0; i < 3; i++) {
        expect(await factory.exists(hashes[i])).to.be.true;
      }
    });
  });

  describe("Address Prediction", function () {
    it("Should compute deterministic addresses", async function () {
      const data1 = "0x6080604052600080fd5b50";
      const data2 = "0x6080604052600180fd5b51";

      const [addr1_1, hash1_1] = await factory.predict(data1);
      const [addr2_1, hash2_1] = await factory.predict(data2);

      // Different data should give different addresses and hashes
      expect(addr1_1).to.not.equal(addr2_1);
      expect(hash1_1).to.not.equal(hash2_1);
    });

    it("Should be consistent across calls", async function () {
      const data = "0x6080604052600080fd5b50";

      const [address1, hash1] = await factory.predict(data);
      const [address2, hash2] = await factory.predict(data);
      const [address3, hash3] = await factory.predict(data);

      expect(address1).to.equal(address2);
      expect(address2).to.equal(address3);
      expect(hash1).to.equal(hash2);
      expect(hash2).to.equal(hash3);
    });

    it("Should match actual deployment", async function () {
      const data = "0x6080604052600080fd5b50";

      const [predictedAddr, predictedHash] = await factory.predict(data);
      const [actualAddr, actualHash] = await factory.stage.staticCall(data);

      expect(predictedAddr).to.equal(actualAddr);
      expect(predictedHash).to.equal(actualHash);
    });
  });

  describe("Data Reading", function () {
    it("Should read deployed chunk data", async function () {
      const originalData = "0x6080604052600080fd5b50";
      
      const [chunkAddress] = await factory.stage.staticCall(originalData);
      await factory.stage(originalData);
      
      const readData = await factory.read(chunkAddress);
      expect(readData).to.equal(originalData);
    });
  });

  describe("Fee Management", function () {
    it("Should allow FEE_ROLE to update fees", async function () {
      await factory.grantRole(await factory.FEE_ROLE(), admin.address);
      
      await expect(factory.setFees(ethers.parseEther("0.01"), true, feeRecipient.address))
        .to.emit(factory, "FeesUpdated")
        .withArgs(ethers.parseEther("0.01"), true, feeRecipient.address);
      
      expect(await factory.baseFeeWei()).to.equal(ethers.parseEther("0.01"));
      expect(await factory.feesEnabled()).to.be.true;
    });

    it("Should handle fee collection during staging", async function () {
      await factory.grantRole(await factory.FEE_ROLE(), admin.address);
      await factory.setFees(ethers.parseEther("0.01"), true, feeRecipient.address);
      
      const data = "0x6080604052600080fd5b50";
      
      await expect(factory.stage(data, { value: ethers.parseEther("0.01") }))
        .to.not.be.reverted;
    });
  });

  describe("Access Control", function () {
    it("Should allow OPERATOR_ROLE to pause/unpause", async function () {
      await factory.grantRole(await factory.OPERATOR_ROLE(), addr1.address);
      
      await expect(factory.connect(addr1).pause()).to.not.be.reverted;
      await expect(factory.connect(addr1).unpause()).to.not.be.reverted;
    });

    it("Should prevent unauthorized pause/unpause", async function () {
      await expect(factory.connect(addr1).pause())
        .to.be.revertedWithCustomError(factory, "AccessControlUnauthorizedAccount");
      
      await expect(factory.connect(addr1).unpause())
        .to.be.revertedWithCustomError(factory, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle maximum size bytecode", async function () {
      // Create large but valid bytecode (under MAX_CHUNK_BYTES = 24,000)
      const maxValidData = "0x" + "60".repeat(12000); // 12KB of PUSH1 0x00 instructions
      
      await expect(factory.stage(maxValidData)).to.not.be.reverted;
    });

    it("Should handle minimal valid bytecode", async function () {
      const minData = "0x60"; // Single PUSH1 0x00 instruction
      
      await expect(factory.stage(minData)).to.not.be.reverted;
    });

    it("Should handle special characters in bytecode", async function () {
      const specialData = "0x00ff00ff00ff00ff"; // Mix of 0x00 and 0xff bytes
      
      await expect(factory.stage(specialData)).to.not.be.reverted;
    });
  });
});

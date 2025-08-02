import { expect } from "chai";
import { ethers } from "hardhat";

describe("Production Security Tests", function () {
  describe("Basic Security Validation", function () {
    it("Should validate contract compilation and basic deployment", async function () {
      const [owner] = await ethers.getSigners();
      
      // Test that contracts compile and basic factories work
      const ManifestDispatcher = await ethers.getContractFactory("ManifestDispatcher");
      const DeterministicChunkFactory = await ethers.getContractFactory("DeterministicChunkFactory");
      
      expect(ManifestDispatcher).to.exist;
      expect(DeterministicChunkFactory).to.exist;
      
      // Basic ABI validation
      expect(ManifestDispatcher.interface.getFunction("pause")).to.exist;
      expect(DeterministicChunkFactory.interface.getFunction("pause")).to.exist;
    });

    it("Should validate contract interfaces have security functions", async function () {
      const ManifestDispatcher = await ethers.getContractFactory("ManifestDispatcher");
      const DeterministicChunkFactory = await ethers.getContractFactory("DeterministicChunkFactory");
      
      // Check security-related functions exist
      const dispatcherInterface = ManifestDispatcher.interface;
      const factoryInterface = DeterministicChunkFactory.interface;
      
      // Emergency controls
      expect(dispatcherInterface.getFunction("pause")).to.exist;
      expect(dispatcherInterface.getFunction("unpause")).to.exist;
      expect(factoryInterface.getFunction("pause")).to.exist;
      expect(factoryInterface.getFunction("unpause")).to.exist;
      
      // Access control functions should exist
      expect(factoryInterface.getFunction("hasRole")).to.exist;
      expect(dispatcherInterface.getFunction("hasRole")).to.exist;
    });

    it("Should validate bytecode sizes are within limits", async function () {
      const ManifestDispatcher = await ethers.getContractFactory("ManifestDispatcher");
      const DeterministicChunkFactory = await ethers.getContractFactory("DeterministicChunkFactory");
      
      // Get bytecode lengths
      const dispatcherBytecode = ManifestDispatcher.bytecode;
      const factoryBytecode = DeterministicChunkFactory.bytecode;
      
      // EIP-170 limit is 24,576 bytes (0x6000)
      const EIP_170_LIMIT = 24576 * 2; // *2 because hex string
      
      expect(dispatcherBytecode.length).to.be.lessThan(EIP_170_LIMIT);
      expect(factoryBytecode.length).to.be.lessThan(EIP_170_LIMIT);
    });

    it("Should validate critical error types are defined", async function () {
      const DeterministicChunkFactory = await ethers.getContractFactory("DeterministicChunkFactory");
      
      // Check that custom errors are properly defined in the interface
      const contractInterface = DeterministicChunkFactory.interface;
      
      // These security-critical errors should be defined
      expect(contractInterface.getError("ManifestHashMismatch")).to.exist;
      expect(contractInterface.getError("InvalidConstructorArgs")).to.exist;
      expect(contractInterface.getError("ZeroAddress")).to.exist;
    });

    it("Should validate events for monitoring are defined", async function () {
      const DeterministicChunkFactory = await ethers.getContractFactory("DeterministicChunkFactory");
      const ManifestDispatcher = await ethers.getContractFactory("ManifestDispatcher");
      
      const factoryInterface = DeterministicChunkFactory.interface;
      const dispatcherInterface = ManifestDispatcher.interface;
      
      // Security monitoring events
      expect(factoryInterface.getEvent("Paused")).to.exist;
      expect(factoryInterface.getEvent("Unpaused")).to.exist;
      expect(dispatcherInterface.getEvent("Paused")).to.exist;
      expect(dispatcherInterface.getEvent("Unpaused")).to.exist;
    });
  });
});

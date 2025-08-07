import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import fs from "fs";
import path from "path";

describe("RefactorSafetyLib Integration Tests", function () {
  let deployer: Signer;
  let operator: Signer;
  let user: Signer;
  let refactorSafetyLib: Contract;

  before(async function () {
    [deployer, operator, user] = await ethers.getSigners();
    
    // Deploy RefactorSafetyLib
    const RefactorSafetyLibFactory = await ethers.getContractFactory("RefactorSafetyLib");
    refactorSafetyLib = await RefactorSafetyLibFactory.deploy();
    await refactorSafetyLib.deployed();
  });

  describe("Storage Layout Validation", function () {
    it("should validate compatible storage layouts", async function () {
      const namespace = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test.namespace"));
      const structDef = ethers.utils.toUtf8Bytes("mapping(address => uint256) balances; bool initialized;");
      const structHash = await refactorSafetyLib.hashStorageStruct(structDef);
      
      // Should not revert for matching hashes
      await expect(
        refactorSafetyLib.validateStorageLayout(namespace, structHash, structHash)
      ).to.not.be.reverted;
    });

    it("should reject incompatible storage layouts", async function () {
      const namespace = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test.namespace"));
      const oldStruct = ethers.utils.toUtf8Bytes("mapping(address => uint256) balances;");
      const newStruct = ethers.utils.toUtf8Bytes("mapping(address => uint256) different;");
      
      const oldHash = await refactorSafetyLib.hashStorageStruct(oldStruct);
      const newHash = await refactorSafetyLib.hashStorageStruct(newStruct);
      
      await expect(
        refactorSafetyLib.validateStorageLayout(namespace, oldHash, newHash)
      ).to.be.revertedWith("IncompatibleStorageLayout");
    });
  });

  describe("Selector Compatibility", function () {
    it("should validate selector compatibility with additions allowed", async function () {
      const oldSelectors = ["0x12345678", "0x87654321"];
      const newSelectors = ["0x12345678", "0x87654321", "0xabcdef00"]; // Added one
      
      await expect(
        refactorSafetyLib.validateSelectorCompatibility(oldSelectors, newSelectors, true)
      ).to.not.be.reverted;
    });

    it("should reject selector compatibility when additions not allowed", async function () {
      const oldSelectors = ["0x12345678", "0x87654321"];
      const newSelectors = ["0x12345678", "0x87654321", "0xabcdef00"]; // Added one
      
      await expect(
        refactorSafetyLib.validateSelectorCompatibility(oldSelectors, newSelectors, false)
      ).to.be.revertedWith("Selector additions not permitted");
    });

    it("should reject missing selectors", async function () {
      const oldSelectors = ["0x12345678", "0x87654321"];
      const newSelectors = ["0x12345678"]; // Missing one
      
      await expect(
        refactorSafetyLib.validateSelectorCompatibility(oldSelectors, newSelectors, true)
      ).to.be.revertedWith("SelectorMismatch");
    });
  });

  describe("Version Management", function () {
    it("should validate patch version progression", async function () {
      await expect(
        refactorSafetyLib.validateVersionProgression(1, 2, 0) // patch
      ).to.not.be.reverted;
    });

    it("should reject invalid patch progression", async function () {
      await expect(
        refactorSafetyLib.validateVersionProgression(1, 3, 0) // invalid patch
      ).to.be.revertedWith("Invalid patch increment");
    });

    it("should validate minor version progression", async function () {
      await expect(
        refactorSafetyLib.validateVersionProgression(1, 2, 1) // minor
      ).to.not.be.reverted;
    });

    it("should validate major version progression", async function () {
      await expect(
        refactorSafetyLib.validateVersionProgression(1, 2, 2) // major
      ).to.not.be.reverted;
    });
  });

  describe("Gas Efficiency Validation", function () {
    it("should pass when gas usage is within threshold", async function () {
      const selector = "0x12345678";
      const baselineGas = 50000;
      const actualGas = 52000; // 4% increase
      const maxDeviationBps = 500; // 5%
      
      await expect(
        refactorSafetyLib.validateGasEfficiency(selector, baselineGas, actualGas, maxDeviationBps)
      ).to.not.be.reverted;
    });

    it("should reject when gas usage exceeds threshold", async function () {
      const selector = "0x12345678";
      const baselineGas = 50000;
      const actualGas = 60000; // 20% increase
      const maxDeviationBps = 500; // 5%
      
      await expect(
        refactorSafetyLib.validateGasEfficiency(selector, baselineGas, actualGas, maxDeviationBps)
      ).to.be.revertedWith("Gas efficiency degradation exceeds threshold");
    });
  });

  describe("Data Migration Safety", function () {
    it("should validate preserved data integrity", async function () {
      const migrationId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("migration-1"));
      const dataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-data"));
      
      await expect(
        refactorSafetyLib.validateDataMigration(migrationId, dataHash, dataHash, true)
      ).to.not.be.reverted;
    });

    it("should reject data integrity violations", async function () {
      const migrationId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("migration-1"));
      const oldDataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("old-data"));
      const newDataHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("new-data"));
      
      await expect(
        refactorSafetyLib.validateDataMigration(migrationId, oldDataHash, newDataHash, true)
      ).to.be.revertedWith("Data integrity violation during migration");
    });
  });
});

describe("MUST-FIX Validator with Refactor Safety", function () {
  it("should validate refactor safety integration", async function () {
    // Test that our enhanced MUST-FIX validator properly checks refactor safety
    const { MustFixValidator } = await import("../scripts/must-fix-validator");
    const validator = new MustFixValidator();
    
    // Create a test facet with refactor safety features
    const testFacetContent = `
      // SPDX-License-Identifier: MIT
      pragma solidity ^0.8.20;
      
      import "../libraries/RefactorSafetyLib.sol";
      
      contract TestFacet {
        using RefactorSafetyLib for *;
        
        // Storage (namespaced, collision-safe)
        bytes32 constant TEST_SLOT = keccak256("payrox.facet.test.v1");
        
        struct TestLayout {
          bool initialized;
          uint8 version;
          uint256 nonce;
        }
        
        function getTestVersion() external pure returns (uint8) {
          return 1;
        }
        
        function emergencyRefactorValidation() external view returns (bool) {
          return true;
        }
        
        // Events for state changes
        event TestInitialized(address operator, uint256 timestamp);
        event PauseStatusChanged(bool paused);
        event TestEvent(uint256 value);
        
        error CustomError();
        error AnotherError();
        error ThirdError();
      }
    `;
    
    // Write test file
    const testFilePath = path.join(__dirname, "temp-test-facet.sol");
    fs.writeFileSync(testFilePath, testFacetContent);
    
    try {
      const result = await validator.validateFacet(testFilePath);
      
      // Should pass most checks with refactor safety
      expect(result.score).to.be.greaterThan(80);
      expect(result.details.refactorSafety).to.be.true;
      expect(result.details.storageDocumentation).to.be.true;
      
    } finally {
      // Cleanup
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });
});

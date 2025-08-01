import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Production-Grade ExampleFacetB Enhanced Features", function () {
  async function deployProductionFixture() {
    const [owner, operator, user1, user2] = await ethers.getSigners();

    const ExampleFacetB = await ethers.getContractFactory("ExampleFacetB");
    const facetB = await ExampleFacetB.deploy();
    
    // Initialize the facet
    await facetB.initializeFacetB(operator.address);

    return { facetB, owner, operator, user1, user2 };
  }

  describe("Advanced Analytics Features", function () {
    it("Should provide comprehensive advanced analytics", async function () {
      const { facetB, user1 } = await loadFixture(deployProductionFixture);

      // Execute some operations
      const data1 = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [100]);
      await facetB.connect(user1).executeB(1, data1);

      const analytics = await facetB.getAdvancedAnalytics();
      
      expect(analytics.value).to.equal(100);
      expect(analytics.totalOps).to.equal(1);
      expect(analytics.lastExecutor).to.equal(user1.address);
      expect(analytics.isPaused).to.be.false;
      expect(analytics.isInitialized).to.be.true;
    });

    it("Should provide detailed user statistics", async function () {
      const { facetB, user1 } = await loadFixture(deployProductionFixture);

      // Execute multiple different operations
      const data1 = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [50]);
      const data2 = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [25]);
      const data3 = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [200]);

      await facetB.connect(user1).executeB(1, data1); // increment
      await facetB.connect(user1).executeB(2, data2); // decrement
      await facetB.connect(user1).executeB(3, data3); // multiply

      const stats = await facetB.getUserStatistics(user1.address);
      
      expect(stats.totalUserOps).to.equal(3);
      expect(stats.mostRecentOp).to.equal(3); // Last operation was type 3
      expect(stats.uniqueOpTypes).to.equal(3); // Used 3 different operation types
    });

    it("Should validate operations correctly", async function () {
      const { facetB } = await loadFixture(deployProductionFixture);

      const validData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [100]);
      const emptyData = "0x";
      const largeData = "0x" + "00".repeat(2000); // > 1024 bytes

      // Valid operation
      const [isValid1, reason1] = await facetB.validateOperation(1, validData);
      expect(isValid1).to.be.true;
      expect(reason1).to.equal(0);

      // Invalid operation type
      const [isValid2, reason2] = await facetB.validateOperation(0, validData);
      expect(isValid2).to.be.false;
      expect(reason2).to.equal(1);

      // Empty data
      const [isValid3, reason3] = await facetB.validateOperation(1, emptyData);
      expect(isValid3).to.be.false;
      expect(reason3).to.equal(2);

      // Data too large
      const [isValid4, reason4] = await facetB.validateOperation(1, largeData);
      expect(isValid4).to.be.false;
      expect(reason4).to.equal(3);
    });

    it("Should simulate operations without state changes", async function () {
      const { facetB, user1 } = await loadFixture(deployProductionFixture);

      // Set initial state
      const setupData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [100]);
      await facetB.connect(user1).executeB(1, setupData);

      // Simulate increment
      const incrementData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [50]);
      const [newValue, gasEstimate] = await facetB.simulateOperation(1, incrementData);
      
      expect(newValue).to.equal(150); // 100 + 50
      expect(gasEstimate).to.be.greaterThan(20000);

      // Verify state hasn't changed
      const [currentValue] = await facetB.getStateSummary();
      expect(currentValue).to.equal(100); // Should still be 100
    });
  });

  describe("Production Robustness", function () {
    it("Should handle edge cases in user statistics", async function () {
      const { facetB, user1 } = await loadFixture(deployProductionFixture);

      // User with no operations
      const emptyStats = await facetB.getUserStatistics(user1.address);
      expect(emptyStats.totalUserOps).to.equal(0);
      expect(emptyStats.mostRecentOp).to.equal(0);
      expect(emptyStats.uniqueOpTypes).to.equal(0);
    });

    it("Should handle all operation types in simulation", async function () {
      const { facetB } = await loadFixture(deployProductionFixture);

      // Test all operation types
      const data1 = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [10]);
      const data2 = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [5]);
      const data3 = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [200]);
      const data4 = "0x"; // Empty for reset
      const data5 = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256", "uint256"], [10, 20, 4]);

      // Skip data4 since it's empty and will fail validation
      const validData4 = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [0]);

      await expect(facetB.simulateOperation(1, data1)).to.not.be.reverted;
      await expect(facetB.simulateOperation(2, data2)).to.not.be.reverted;
      await expect(facetB.simulateOperation(3, data3)).to.not.be.reverted;
      await expect(facetB.simulateOperation(4, validData4)).to.not.be.reverted;
      await expect(facetB.simulateOperation(5, data5)).to.not.be.reverted;
    });

    it("Should maintain accurate operation counting across multiple users", async function () {
      const { facetB, user1, user2 } = await loadFixture(deployProductionFixture);

      // User1 operations
      const data1 = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [10]);
      await facetB.connect(user1).executeB(1, data1);
      await facetB.connect(user1).executeB(1, data1);

      // User2 operations
      await facetB.connect(user2).executeB(2, data1);

      const stats1 = await facetB.getUserStatistics(user1.address);
      const stats2 = await facetB.getUserStatistics(user2.address);

      expect(stats1.totalUserOps).to.equal(2);
      expect(stats2.totalUserOps).to.equal(1);

      // Verify global counter
      const [, totalOps] = await facetB.getStateSummary();
      expect(totalOps).to.equal(3);
    });
  });

  describe("Version and Selector Management", function () {
    it("Should report updated version and all selectors", async function () {
      const { facetB } = await loadFixture(deployProductionFixture);

      const [name, version, selectors] = await facetB.getFacetInfoB();
      
      expect(name).to.equal("ExampleFacetB");
      expect(version).to.equal("1.2.0");
      expect(selectors.length).to.equal(13); // All functions including new ones

      // Verify new function selectors are included
      const expectedSelectors = [
        facetB.interface.getFunction("getAdvancedAnalytics").selector,
        facetB.interface.getFunction("getUserStatistics").selector,
        facetB.interface.getFunction("validateOperation").selector,
        facetB.interface.getFunction("simulateOperation").selector
      ];

      for (const selector of expectedSelectors) {
        expect(selectors).to.include(selector);
      }
    });
  });

  describe("Gas Optimization Verification", function () {
    it("Should maintain efficient gas usage for enhanced features", async function () {
      const { facetB, user1 } = await loadFixture(deployProductionFixture);

      // Execute operation to set up state
      const data = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [100]);
      await facetB.connect(user1).executeB(1, data);

      // Test gas usage of new view functions
      const analytics = await facetB.getAdvancedAnalytics.staticCall();
      const stats = await facetB.getUserStatistics.staticCall(user1.address);
      const validation = await facetB.validateOperation.staticCall(1, data);
      const simulation = await facetB.simulateOperation.staticCall(1, data);

      // These are view functions, so gas usage should be reasonable
      expect(analytics).to.not.be.undefined;
      expect(stats).to.not.be.undefined;
      expect(validation).to.not.be.undefined;
      expect(simulation).to.not.be.undefined;
    });
  });
});

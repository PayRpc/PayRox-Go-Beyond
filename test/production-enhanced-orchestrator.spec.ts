import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("Production-Grade Orchestrator Enhanced Features", function () {
  async function deployProductionOrchestratorFixture() {
    const [admin, operator, user1, user2] = await ethers.getSigners();

    // Deploy dependencies
    const DeterministicChunkFactory = await ethers.getContractFactory("DeterministicChunkFactory");
    const factory = await DeterministicChunkFactory.deploy(
      admin.address,           // admin
      admin.address,           // feeRecipient  
      ethers.parseEther("0.0007") // baseFeeWei
    );

    const ManifestDispatcher = await ethers.getContractFactory("ManifestDispatcher");
    const dispatcher = await ManifestDispatcher.deploy(admin.address, 0); // 0 activation delay

    // Deploy Orchestrator
    const Orchestrator = await ethers.getContractFactory("Orchestrator");
    const orchestrator: any = await Orchestrator.deploy(
      await factory.getAddress(),
      await dispatcher.getAddress()
    );

    // Set up authorization
    await orchestrator.setAuthorized(operator.address, true);
    await orchestrator.setAuthorized(user1.address, true);

    return { orchestrator, factory, dispatcher, admin, operator, user1, user2 };
  }

  describe("Production Analytics and Monitoring", function () {
    it("Should provide comprehensive plan details", async function () {
      const { orchestrator, operator } = await loadFixture(deployProductionOrchestratorFixture);

      const planId = ethers.keccak256(ethers.toUtf8Bytes("test-plan"));
      const gasLimit = 1000000;

      await orchestrator.connect(operator).startOrchestration(planId, gasLimit);

      const [initiator, storedGasLimit, completed] = await orchestrator.getPlan(planId);
      
      expect(initiator).to.equal(operator.address);
      expect(storedGasLimit).to.equal(gasLimit);
      expect(completed).to.be.false;
    });

    it("Should correctly track plan active status", async function () {
      const { orchestrator, operator } = await loadFixture(deployProductionOrchestratorFixture);

      const planId = ethers.keccak256(ethers.toUtf8Bytes("active-plan"));
      
      // Plan doesn't exist yet
      expect(await orchestrator.isPlanActive(planId)).to.be.false;

      // Start plan
      await orchestrator.connect(operator).startOrchestration(planId, 1000000);
      expect(await orchestrator.isPlanActive(planId)).to.be.true;

      // Complete plan
      await orchestrator.connect(operator).complete(planId, true);
      expect(await orchestrator.isPlanActive(planId)).to.be.false;
    });

    it("Should verify authorization status correctly", async function () {
      const { orchestrator, admin, operator, user1, user2 } = await loadFixture(deployProductionOrchestratorFixture);

      expect(await orchestrator.isAuthorized(admin.address)).to.be.true; // Admin is always authorized
      expect(await orchestrator.isAuthorized(operator.address)).to.be.true; // Explicitly authorized
      expect(await orchestrator.isAuthorized(user1.address)).to.be.true; // Explicitly authorized
      expect(await orchestrator.isAuthorized(user2.address)).to.be.false; // Not authorized
    });

    it("Should provide integration addresses", async function () {
      const { orchestrator, factory, dispatcher } = await loadFixture(deployProductionOrchestratorFixture);

      const [factoryAddr, dispatcherAddr] = await orchestrator.getIntegrationAddresses();
      
      expect(factoryAddr).to.equal(factory.target);
      expect(dispatcherAddr).to.equal(dispatcher.target);
    });
  });

  describe("Emergency Controls", function () {
    it("Should handle global emergency pause", async function () {
      const { orchestrator, admin, operator } = await loadFixture(deployProductionOrchestratorFixture);

      const planId = ethers.keccak256(ethers.toUtf8Bytes("emergency-test"));

      // Set global emergency pause
      await expect(orchestrator.connect(admin).setGlobalEmergencyPause(true))
        .to.emit(orchestrator, "EmergencyPause")
        .withArgs(true, admin.address);

      expect(await orchestrator.globalEmergencyPause()).to.be.true;

      // Should not be able to start orchestration during emergency pause
      await expect(
        orchestrator.connect(operator).startOrchestrationSecure(planId, 1000000)
      ).to.be.revertedWith("Emergency paused");

      // Disable emergency pause
      await orchestrator.connect(admin).setGlobalEmergencyPause(false);
      
      // Should work now
      await expect(orchestrator.connect(operator).startOrchestrationSecure(planId, 1000000))
        .to.emit(orchestrator, "OrchestrationStarted");
    });

    it("Should handle plan-specific emergency pause", async function () {
      const { orchestrator, admin, operator } = await loadFixture(deployProductionOrchestratorFixture);

      const planId = ethers.keccak256(ethers.toUtf8Bytes("plan-emergency-test"));

      // Set plan-specific emergency pause
      await expect(orchestrator.connect(admin).setPlanEmergencyPause(planId, true))
        .to.emit(orchestrator, "PlanEmergencyPause")
        .withArgs(planId, true);

      expect(await orchestrator.emergencyPaused(planId)).to.be.true;

      // Should not be able to start this specific orchestration
      await expect(
        orchestrator.connect(operator).startOrchestrationSecure(planId, 1000000)
      ).to.be.revertedWith("Emergency paused");

      // Other plans should work
      const otherPlanId = ethers.keccak256(ethers.toUtf8Bytes("other-plan"));
      await expect(orchestrator.connect(operator).startOrchestrationSecure(otherPlanId, 1000000))
        .to.emit(orchestrator, "OrchestrationStarted");
    });

    it("Should only allow admin to control emergency pause", async function () {
      const { orchestrator, operator } = await loadFixture(deployProductionOrchestratorFixture);

      await expect(
        orchestrator.connect(operator).setGlobalEmergencyPause(true)
      ).to.be.revertedWithCustomError(orchestrator, "NotAdmin");

      const planId = ethers.keccak256(ethers.toUtf8Bytes("unauthorized-pause"));
      await expect(
        orchestrator.connect(operator).setPlanEmergencyPause(planId, true)
      ).to.be.revertedWithCustomError(orchestrator, "NotAdmin");
    });
  });

  describe("Enhanced Validation", function () {
    it("Should validate orchestration parameters comprehensively", async function () {
      const { orchestrator, operator, user2 } = await loadFixture(deployProductionOrchestratorFixture);

      const validPlanId = ethers.keccak256(ethers.toUtf8Bytes("valid-plan"));
      const invalidPlanId = ethers.ZeroHash; // Invalid ID
      const validGasLimit = 1000000;

      // Valid parameters
      const [isValid1, reason1] = await orchestrator.validateOrchestration(
        validPlanId, validGasLimit, operator.address
      );
      expect(isValid1).to.be.true;
      expect(reason1).to.equal("Valid");

      // Invalid ID
      const [isValid2, reason2] = await orchestrator.validateOrchestration(
        invalidPlanId, validGasLimit, operator.address
      );
      expect(isValid2).to.be.false;
      expect(reason2).to.equal("Invalid ID");

      // Invalid gas limit
      const [isValid3, reason3] = await orchestrator.validateOrchestration(
        validPlanId, 0, operator.address
      );
      expect(isValid3).to.be.false;
      expect(reason3).to.equal("Invalid gas limit");

      // Unauthorized user
      const [isValid4, reason4] = await orchestrator.validateOrchestration(
        validPlanId, validGasLimit, user2.address
      );
      expect(isValid4).to.be.false;
      expect(reason4).to.equal("Not authorized");

      // Plan already exists
      await orchestrator.connect(operator).startOrchestration(validPlanId, validGasLimit);
      const [isValid5, reason5] = await orchestrator.validateOrchestration(
        validPlanId, validGasLimit, operator.address
      );
      expect(isValid5).to.be.false;
      expect(reason5).to.equal("Plan already exists");
    });

    it("Should validate emergency pause conditions", async function () {
      const { orchestrator, admin, operator } = await loadFixture(deployProductionOrchestratorFixture);

      const planId = ethers.keccak256(ethers.toUtf8Bytes("pause-validation"));

      // Set global emergency pause
      await orchestrator.connect(admin).setGlobalEmergencyPause(true);

      const [isValid, reason] = await orchestrator.validateOrchestration(
        planId, 1000000, operator.address
      );
      expect(isValid).to.be.false;
      expect(reason).to.equal("Emergency paused");
    });
  });

  describe("Secure Orchestration Start", function () {
    it("Should start orchestration with emergency pause checks", async function () {
      const { orchestrator, operator } = await loadFixture(deployProductionOrchestratorFixture);

      const planId = ethers.keccak256(ethers.toUtf8Bytes("secure-start"));

      await expect(orchestrator.connect(operator).startOrchestrationSecure(planId, 1000000))
        .to.emit(orchestrator, "OrchestrationStarted")
        .withArgs(planId, operator.address, anyValue);

      // Verify plan was created
      expect(await orchestrator.isPlanActive(planId)).to.be.true;
    });

    it("Should enforce all the same validations as regular start", async function () {
      const { orchestrator, operator, user2 } = await loadFixture(deployProductionOrchestratorFixture);

      const validPlanId = ethers.keccak256(ethers.toUtf8Bytes("validation-test"));

      // Invalid gas limit
      await expect(
        orchestrator.connect(operator).startOrchestrationSecure(validPlanId, 0)
      ).to.be.revertedWithCustomError(orchestrator, "BadGas");

      // Invalid ID
      await expect(
        orchestrator.connect(operator).startOrchestrationSecure(ethers.ZeroHash, 1000000)
      ).to.be.revertedWithCustomError(orchestrator, "BadId");

      // Unauthorized user
      await expect(
        orchestrator.connect(user2).startOrchestrationSecure(validPlanId, 1000000)
      ).to.be.revertedWithCustomError(orchestrator, "NotAuthorized");
    });
  });

  describe("Production Integration", function () {
    it("Should work seamlessly with existing orchestration functions", async function () {
      const { orchestrator, operator } = await loadFixture(deployProductionOrchestratorFixture);

      const planId = ethers.keccak256(ethers.toUtf8Bytes("integration-test"));

      // Start with secure method
      await orchestrator.connect(operator).startOrchestrationSecure(planId, 2000000);

      // Use existing methods
      await orchestrator.connect(operator).noteComponent(planId, operator.address, "test-component");
      await orchestrator.connect(operator).complete(planId, true);

      // Verify final state
      expect(await orchestrator.isPlanActive(planId)).to.be.false;
      const [, , completed] = await orchestrator.getPlan(planId);
      expect(completed).to.be.true;
    });
  });
});

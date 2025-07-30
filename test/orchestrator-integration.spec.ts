import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

/**
 * @title Orchestrator Integration Test
 * @notice Unit test that orchestrateStage() and orchestrateStageBatch() call IChunkFactory methods and emit events
 */
describe("OrchestratorIntegration", function () {
  let factory: any;
  let dispatcher: any;
  let orchestrator: any;
  let owner: any;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    
    // Deploy factory
    const FactoryContract = await ethers.getContractFactory("DeterministicChunkFactory");
    factory = await FactoryContract.deploy(owner.address, owner.address, 0); // admin, feeRecipient, baseFee
    await factory.waitForDeployment();

    // Deploy dispatcher (minimal for testing)
    const DispatcherContract = await ethers.getContractFactory("ManifestDispatcher");
    dispatcher = await DispatcherContract.deploy(owner.address, 86400); // admin, 24h activation delay
    await dispatcher.waitForDeployment();

    // Deploy orchestrator with required interface addresses
    const OrchestratorContract = await ethers.getContractFactory("contracts/orchestrator/Orchestrator.sol:Orchestrator");
    orchestrator = await OrchestratorContract.deploy(
      await factory.getAddress(),
      await dispatcher.getAddress()
    );
    await orchestrator.waitForDeployment();
  });

  describe("orchestrateStage", function () {
    it("Should call IChunkFactory.stage and emit ChunksStaged event", async function () {
      const orchestrationId = ethers.keccak256(ethers.toUtf8Bytes("test-orchestration-1"));
      const testData = ethers.toUtf8Bytes("Hello, World!");

      // Start orchestration
      await orchestrator.startOrchestration(orchestrationId, 1000000);

      // Call orchestrateStage - should emit ChunksStaged event
      await expect(orchestrator.orchestrateStage(orchestrationId, testData))
        .to.emit(orchestrator, "ChunksStaged")
        .withArgs(orchestrationId, 1, anyValue, anyValue); // id, count=1, gasUsed, feePaid

      // Verify chunk was actually staged in factory
      const contentHash = ethers.keccak256(testData);
      const chunkAddress = await factory.chunkOf(contentHash);
      expect(chunkAddress).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("orchestrateStageBatch", function () {
    it("Should call IChunkFactory.stageBatch and emit ChunksStaged event", async function () {
      const orchestrationId = ethers.keccak256(ethers.toUtf8Bytes("test-orchestration-2"));
      const testData1 = ethers.toUtf8Bytes("First chunk");
      const testData2 = ethers.toUtf8Bytes("Second chunk");
      const testData3 = ethers.toUtf8Bytes("Third chunk");
      const batchData = [testData1, testData2, testData3];

      // Start orchestration
      await orchestrator.startOrchestration(orchestrationId, 2000000);

      // Call orchestrateStageBatch - should emit ChunksStaged event
      await expect(orchestrator.orchestrateStageBatch(orchestrationId, batchData))
        .to.emit(orchestrator, "ChunksStaged")
        .withArgs(orchestrationId, 3, anyValue, anyValue); // id, count=3, gasUsed, feePaid

      // Verify all chunks were actually staged in factory
      for (const data of batchData) {
        const contentHash = ethers.keccak256(data);
        const chunkAddress = await factory.chunkOf(contentHash);
        expect(chunkAddress).to.not.equal(ethers.ZeroAddress);
      }
    });
  });

  describe("componentNote", function () {
    it("Should emit ComponentNoted event when noting components", async function () {
      const orchestrationId = ethers.keccak256(ethers.toUtf8Bytes("test-orchestration-3"));
      const componentAddress = "0x1234567890123456789012345678901234567890";
      const tag = "test-component";

      // Start orchestration
      await orchestrator.startOrchestration(orchestrationId, 1000000);

      // Note component - should emit ComponentNoted event
      await expect(orchestrator.noteComponent(orchestrationId, componentAddress, tag))
        .to.emit(orchestrator, "ComponentNoted")
        .withArgs(orchestrationId, componentAddress, tag);
    });
  });

  describe("orchestration lifecycle", function () {
    it("Should emit OrchestrationStarted and OrchestrationCompleted events", async function () {
      const orchestrationId = ethers.keccak256(ethers.toUtf8Bytes("test-orchestration-4"));

      // Start orchestration - should emit OrchestrationStarted
      await expect(orchestrator.startOrchestration(orchestrationId, 1000000))
        .to.emit(orchestrator, "OrchestrationStarted")
        .withArgs(orchestrationId, owner.address, anyValue); // id, initiator, timestamp

      // Complete orchestration - should emit OrchestrationCompleted
      await expect(orchestrator.complete(orchestrationId, true))
        .to.emit(orchestrator, "OrchestrationCompleted")
        .withArgs(orchestrationId, true); // id, success
    });
  });
});

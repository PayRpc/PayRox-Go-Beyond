import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { expect } from 'chai';
import { ethers } from 'hardhat';

/**
 * @title Orchestrator Integration Test
 * @notice Unit test that orchestrateStage() and orchestrateStageBatch() call IChunkFactory methods and emit events
 */
describe('OrchestratorIntegration', function () {
  let factory: any;
  let dispatcher: any;
  let orchestrator: any;
  let owner: any;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    // Deploy factory
    const FactoryContract = await ethers.getContractFactory(
      'DeterministicChunkFactory'
    );
    factory = await FactoryContract.deploy(owner.address, owner.address, 0); // admin, feeRecipient, baseFee
    await factory.waitForDeployment();

    // Deploy dispatcher (minimal for testing)
    const DispatcherContract = await ethers.getContractFactory(
      'ManifestDispatcher'
    );
    dispatcher = await DispatcherContract.deploy(owner.address, 86400); // admin, 24h activation delay
    await dispatcher.waitForDeployment();

    // Deploy orchestrator with required interface addresses
    const OrchestratorContract = await ethers.getContractFactory(
      'contracts/orchestrator/Orchestrator.sol:Orchestrator'
    );
    orchestrator = await OrchestratorContract.deploy(
      await factory.getAddress(),
      await dispatcher.getAddress()
    );
    await orchestrator.waitForDeployment();
  });

  describe('orchestrateStage', function () {
    it('Should call IChunkFactory.stage and emit ChunksStaged event', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('test-orchestration-1')
      );
      const testData = ethers.toUtf8Bytes('Hello, World!');

      // Start orchestration
      await orchestrator.startOrchestration(orchestrationId, 1000000);

      // Call orchestrateStage - should emit ChunksStaged event
      await expect(orchestrator.orchestrateStage(orchestrationId, testData))
        .to.emit(orchestrator, 'ChunksStaged')
        .withArgs(orchestrationId, 1, anyValue, anyValue); // id, count=1, gasUsed, feePaid

      // Verify chunk was actually staged in factory
      const contentHash = ethers.keccak256(testData);
      const chunkAddress = await factory.chunkOf(contentHash);
      expect(chunkAddress).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe('orchestrateStageBatch', function () {
    it('Should call IChunkFactory.stageBatch and emit ChunksStaged event', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('test-orchestration-2')
      );
      const testData1 = ethers.toUtf8Bytes('First chunk');
      const testData2 = ethers.toUtf8Bytes('Second chunk');
      const testData3 = ethers.toUtf8Bytes('Third chunk');
      const batchData = [testData1, testData2, testData3];

      // Start orchestration
      await orchestrator.startOrchestration(orchestrationId, 2000000);

      // Call orchestrateStageBatch - should emit ChunksStaged event
      await expect(
        orchestrator.orchestrateStageBatch(orchestrationId, batchData)
      )
        .to.emit(orchestrator, 'ChunksStaged')
        .withArgs(orchestrationId, 3, anyValue, anyValue); // id, count=3, gasUsed, feePaid

      // Verify all chunks were actually staged in factory
      for (const data of batchData) {
        const contentHash = ethers.keccak256(data);
        const chunkAddress = await factory.chunkOf(contentHash);
        expect(chunkAddress).to.not.equal(ethers.ZeroAddress);
      }
    });
  });

  describe('componentNote', function () {
    it('Should emit ComponentNoted event when noting components', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('test-orchestration-3')
      );
      const componentAddress = '0x1234567890123456789012345678901234567890';
      const tag = 'test-component';

      // Start orchestration
      await orchestrator.startOrchestration(orchestrationId, 1000000);

      // Note component - should emit ComponentNoted event
      await expect(
        orchestrator.noteComponent(orchestrationId, componentAddress, tag)
      )
        .to.emit(orchestrator, 'ComponentNoted')
        .withArgs(orchestrationId, componentAddress, tag);
    });
  });

  describe('orchestration lifecycle', function () {
    it('Should emit OrchestrationStarted and OrchestrationCompleted events', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('test-orchestration-4')
      );

      // Start orchestration - should emit OrchestrationStarted
      await expect(orchestrator.startOrchestration(orchestrationId, 1000000))
        .to.emit(orchestrator, 'OrchestrationStarted')
        .withArgs(orchestrationId, owner.address, anyValue); // id, initiator, timestamp

      // Complete orchestration - should emit OrchestrationCompleted
      await expect(orchestrator.complete(orchestrationId, true))
        .to.emit(orchestrator, 'OrchestrationCompleted')
        .withArgs(orchestrationId, true); // id, success
    });
  });

  describe('Orchestrator Edge Cases and Error Handling', function () {
    it('Should handle orchestration failure scenarios', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('test-fail-orchestration')
      );

      // Start orchestration
      await orchestrator.startOrchestration(orchestrationId, 1000000);

      // Complete with failure
      await expect(orchestrator.complete(orchestrationId, false))
        .to.emit(orchestrator, 'OrchestrationCompleted')
        .withArgs(orchestrationId, false); // id, success=false
    });

    it('Should handle multiple orchestrations concurrently', async function () {
      const orchestrationId1 = ethers.keccak256(
        ethers.toUtf8Bytes('concurrent-1')
      );
      const orchestrationId2 = ethers.keccak256(
        ethers.toUtf8Bytes('concurrent-2')
      );

      // Start multiple orchestrations
      await orchestrator.startOrchestration(orchestrationId1, 1000000);
      await orchestrator.startOrchestration(orchestrationId2, 2000000);

      // Test data for staging
      const testData1 = ethers.toUtf8Bytes('Data for orchestration 1');
      const testData2 = ethers.toUtf8Bytes('Data for orchestration 2');

      // Stage chunks for both orchestrations
      await orchestrator.orchestrateStage(orchestrationId1, testData1);
      await orchestrator.orchestrateStage(orchestrationId2, testData2);

      // Complete both orchestrations
      await orchestrator.complete(orchestrationId1, true);
      await orchestrator.complete(orchestrationId2, true);
    });

    it('Should handle large batch staging operations', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('large-batch')
      );

      // Start orchestration
      await orchestrator.startOrchestration(orchestrationId, 5000000); // Higher gas budget

      // Create a larger batch
      const batchData = [];
      for (let i = 0; i < 10; i++) {
        batchData.push(ethers.toUtf8Bytes(`Batch data chunk ${i}`));
      }

      // Stage the batch
      await expect(
        orchestrator.orchestrateStageBatch(orchestrationId, batchData)
      )
        .to.emit(orchestrator, 'ChunksStaged')
        .withArgs(orchestrationId, 10, anyValue, anyValue); // id, count=10, gasUsed, feePaid

      // Complete orchestration
      await orchestrator.complete(orchestrationId, true);
    });

    it('Should track gas usage accurately', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('gas-tracking')
      );
      const gasbudget = 1000000;

      // Start orchestration with specific gas budget
      await orchestrator.startOrchestration(orchestrationId, gasbudget);

      const testData = ethers.toUtf8Bytes('Gas tracking test data');

      // Capture the transaction to analyze gas usage
      const tx = await orchestrator.orchestrateStage(orchestrationId, testData);
      const receipt = await tx.wait();

      // Gas should be tracked and reported in the event
      expect(receipt.gasUsed).to.be.greaterThan(0);

      await orchestrator.complete(orchestrationId, true);
    });

    it('Should handle component noting with various tags', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('component-noting')
      );

      await orchestrator.startOrchestration(orchestrationId, 1000000);

      // Note different types of components
      const facetAddress = ethers.ZeroAddress;
      const libraryAddress = owner.address;

      await expect(
        orchestrator.noteComponent(orchestrationId, facetAddress, 'facet')
      )
        .to.emit(orchestrator, 'ComponentNoted')
        .withArgs(orchestrationId, facetAddress, 'facet');

      await expect(
        orchestrator.noteComponent(orchestrationId, libraryAddress, 'library')
      )
        .to.emit(orchestrator, 'ComponentNoted')
        .withArgs(orchestrationId, libraryAddress, 'library');

      await orchestrator.complete(orchestrationId, true);
    });

    it('Should handle empty batch staging', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('empty-batch')
      );

      await orchestrator.startOrchestration(orchestrationId, 1000000);

      // Stage empty batch
      const emptyBatch: any[] = [];
      await expect(
        orchestrator.orchestrateStageBatch(orchestrationId, emptyBatch)
      )
        .to.emit(orchestrator, 'ChunksStaged')
        .withArgs(orchestrationId, 0, anyValue, anyValue); // count=0

      await orchestrator.complete(orchestrationId, true);
    });

    it('Should handle orchestration with zero gas budget', async function () {
      const orchestrationId = ethers.keccak256(ethers.toUtf8Bytes('zero-gas'));

      // Start with zero gas budget should revert
      await expect(
        orchestrator.startOrchestration(orchestrationId, 0)
      ).to.be.revertedWithCustomError(orchestrator, 'BadGas');
    });

    it('Should handle very long component tags', async function () {
      const orchestrationId = ethers.keccak256(ethers.toUtf8Bytes('long-tag'));

      await orchestrator.startOrchestration(orchestrationId, 1000000);

      const longTag = 'a'.repeat(100); // Very long tag
      await expect(
        orchestrator.noteComponent(orchestrationId, owner.address, longTag)
      )
        .to.emit(orchestrator, 'ComponentNoted')
        .withArgs(orchestrationId, owner.address, longTag);

      await orchestrator.complete(orchestrationId, true);
    });

    it('Should handle special characters in orchestration data', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('special-chars')
      );

      await orchestrator.startOrchestration(orchestrationId, 1000000);

      // Test data with special characters and unicode
      const specialData = ethers.toUtf8Bytes('Special: åæø 中文 🚀 !@#$%^&*()');
      await orchestrator.orchestrateStage(orchestrationId, specialData);

      await orchestrator.complete(orchestrationId, true);
    });
  });
});

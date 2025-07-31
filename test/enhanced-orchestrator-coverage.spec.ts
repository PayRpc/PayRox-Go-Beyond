import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Enhanced Orchestrator Coverage', function () {
  let orchestrator: any;
  let factory: any;
  let dispatcher: any;
  let owner: HardhatEthersSigner;
  let operator: HardhatEthersSigner;
  let user: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, operator, user] = await ethers.getSigners();

    // Deploy factory first
    const DeterministicChunkFactory = await ethers.getContractFactory(
      'DeterministicChunkFactory'
    );
    factory = await DeterministicChunkFactory.deploy(
      owner.address,  // admin
      owner.address,  // feeRecipient  
      ethers.parseEther("0.0007")  // baseFeeWei
    );

    // Deploy dispatcher
    const ManifestDispatcher = await ethers.getContractFactory(
      'ManifestDispatcher'
    );
    dispatcher = await ManifestDispatcher.deploy(owner.address, 3600);

    // Deploy orchestrator
    const Orchestrator = await ethers.getContractFactory('Orchestrator');
    orchestrator = await Orchestrator.deploy(
      await factory.getAddress(),
      await dispatcher.getAddress()
    );

    // Set up permissions
    await factory.grantRole(await factory.OPERATOR_ROLE(), operator.address);
    await orchestrator.setAuthorized(operator.address, true);
  });

  describe('Basic Orchestration Lifecycle', function () {
    it('Should handle complete orchestration lifecycle', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('lifecycle-test')
      );
      const gasLimit = 1000000;

      // Check initial state via plans mapping
      const planBefore = await orchestrator.plans(orchestrationId);
      expect(planBefore.initiator).to.equal(ethers.ZeroAddress); // Plan doesn't exist yet

      // Start orchestration
      const tx = await orchestrator.startOrchestration(orchestrationId, gasLimit);
      await expect(tx)
        .to.emit(orchestrator, 'OrchestrationStarted');

      // Check orchestration is active via plans mapping
      const planAfterStart = await orchestrator.plans(orchestrationId);
      expect(planAfterStart.initiator).to.not.equal(ethers.ZeroAddress); // Plan exists now

      // Complete orchestration successfully
      await expect(orchestrator.complete(orchestrationId, true))
        .to.emit(orchestrator, 'OrchestrationCompleted')
        .withArgs(orchestrationId, true);

      // Check orchestration is completed via plans mapping
      const planAfterComplete = await orchestrator.plans(orchestrationId);
      expect(planAfterComplete.completed).to.be.true;
    });

    it('Should handle multiple concurrent orchestrations', async function () {
      const id1 = ethers.keccak256(ethers.toUtf8Bytes('concurrent-1'));
      const id2 = ethers.keccak256(ethers.toUtf8Bytes('concurrent-2'));
      const gasLimit = 1000000;

      // Start both orchestrations
      await orchestrator.startOrchestration(id1, gasLimit);
      await orchestrator.startOrchestration(id2, gasLimit);

      // Both should be active (check via plans mapping)
      const plan1 = await orchestrator.plans(id1);
      const plan2 = await orchestrator.plans(id2);
      expect(plan1.initiator).to.not.equal(ethers.ZeroAddress);
      expect(plan2.initiator).to.not.equal(ethers.ZeroAddress);

      // Complete them independently
      await orchestrator.complete(id1, true);
      const plan1After = await orchestrator.plans(id1);
      const plan2After = await orchestrator.plans(id2);
      expect(plan1After.completed).to.be.true;
      expect(plan2After.completed).to.be.false;

      await orchestrator.complete(id2, false);
      const plan2Final = await orchestrator.plans(id2);
      expect(plan2Final.completed).to.be.true;
    });

    it('Should handle gas tracking and consumption', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('gas-tracking')
      );
      const gasLimit = 2000000;

      await orchestrator.startOrchestration(orchestrationId, gasLimit);

      // Check gas limit is stored correctly
      const plan = await orchestrator.plans(orchestrationId);
      expect(plan.gasLimit).to.equal(gasLimit);
    });
  });

  describe('Component Tracking', function () {
    it('Should handle component noting with various data types', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('component-test')
      );
      await orchestrator.startOrchestration(orchestrationId, 1000000);

      // Test with zero address
      await expect(
        orchestrator.noteComponent(
          orchestrationId,
          ethers.ZeroAddress,
          'Zero address test'
        )
      ).to.emit(orchestrator, 'ComponentNoted');

      // Test with sample contract address
      const sampleAddress = '0x1234567890123456789012345678901234567890';
      await expect(
        orchestrator.noteComponent(
          orchestrationId,
          sampleAddress,
          'Sample address test'
        )
      ).to.emit(orchestrator, 'ComponentNoted');

      // Test with factory address
      const factoryAddress = await factory.getAddress();
      await expect(
        orchestrator.noteComponent(
          orchestrationId,
          factoryAddress,
          'Factory address'
        )
      ).to.emit(orchestrator, 'ComponentNoted');

      // Test with dispatcher address
      const dispatcherAddress = await dispatcher.getAddress();
      await expect(
        orchestrator.noteComponent(
          orchestrationId,
          dispatcherAddress,
          'Dispatcher address'
        )
      ).to.emit(orchestrator, 'ComponentNoted');

      // Test with long tag
      const longTag =
        'Very long tag description with lots of text to test string handling';
      await expect(
        orchestrator.noteComponent(orchestrationId, sampleAddress, longTag)
      ).to.emit(orchestrator, 'ComponentNoted');
    });

    it('Should handle large-scale component tracking', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('large-scale')
      );
      await orchestrator.startOrchestration(orchestrationId, 5000000);

      // Track multiple components
      const addresses = [
        await factory.getAddress(),
        await dispatcher.getAddress(),
        owner.address,
        operator.address,
        user.address,
      ];

      for (let i = 0; i < addresses.length; i++) {
        await expect(
          orchestrator.noteComponent(
            orchestrationId,
            addresses[i],
            `Component-${i}`
          )
        ).to.emit(orchestrator, 'ComponentNoted');
      }
    });
  });

  describe('Access Control', function () {
    it('Should enforce authorization requirements', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('access-test')
      );
      const gasLimit = 1000000;

      // Admin (owner) should be able to start orchestration
      await expect(
        orchestrator.startOrchestration(orchestrationId, gasLimit)
      ).to.emit(orchestrator, 'OrchestrationStarted');

      // Operator should be able to note components
      await expect(
        orchestrator
          .connect(operator)
          .noteComponent(orchestrationId, owner.address, 'test')
      ).to.emit(orchestrator, 'ComponentNoted');

      // Unauthorized user should be rejected
      await expect(
        orchestrator
          .connect(user)
          .noteComponent(orchestrationId, owner.address, 'test')
      ).to.be.revertedWithCustomError(orchestrator, 'NotAuthorized');

      // Complete by authorized operator
      await expect(
        orchestrator.connect(operator).complete(orchestrationId, true)
      ).to.emit(orchestrator, 'OrchestrationCompleted');
    });

    it('Should handle authorization management', async function () {
      // Initially user is not authorized
      expect(await orchestrator.authorized(user.address)).to.be.false;

      // Grant authorization
      await orchestrator.setAuthorized(user.address, true);
      expect(await orchestrator.authorized(user.address)).to.be.true;

      // Revoke authorization
      await orchestrator.setAuthorized(user.address, false);
      expect(await orchestrator.authorized(user.address)).to.be.false;
    });
  });

  describe('Error Conditions and Edge Cases', function () {
    it('Should handle invalid orchestration parameters', async function () {
      const badId = ethers.ZeroHash;
      const zeroGas = 0;

      // Bad ID should be rejected
      await expect(
        orchestrator.startOrchestration(badId, 1000000)
      ).to.be.revertedWithCustomError(orchestrator, 'BadId');

      // Zero gas should be rejected
      const validId = ethers.keccak256(ethers.toUtf8Bytes('valid'));
      await expect(
        orchestrator.startOrchestration(validId, zeroGas)
      ).to.be.revertedWithCustomError(orchestrator, 'BadGas');
    });

    it('Should prevent operations on non-existent orchestrations', async function () {
      const nonExistentId = ethers.keccak256(
        ethers.toUtf8Bytes('does-not-exist')
      );

      // Should revert when trying to complete non-existent orchestration
      await expect(
        orchestrator.complete(nonExistentId, true)
      ).to.be.revertedWithCustomError(orchestrator, 'PlanMissing');

      // Should revert when trying to note component for non-existent orchestration
      await expect(
        orchestrator.noteComponent(nonExistentId, owner.address, 'test')
      ).to.be.revertedWithCustomError(orchestrator, 'PlanMissing');
    });

    it('Should handle duplicate orchestration starts', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('duplicate-test')
      );
      const gasLimit = 1000000;

      // First start should succeed
      await orchestrator.startOrchestration(orchestrationId, gasLimit);

      // Second start with same ID should fail
      await expect(
        orchestrator.startOrchestration(orchestrationId, gasLimit)
      ).to.be.revertedWithCustomError(orchestrator, 'PlanExists');
    });

    it('Should handle factory integration edge cases', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('factory-edge')
      );
      await orchestrator.startOrchestration(orchestrationId, 2000000);

      // Test orchestrating chunk staging (this should not revert)
      const chunkData = ethers.toUtf8Bytes('test chunk data');

      // Disable fees first to avoid fee-related reverts
      await factory.setFees(0, false, ethers.ZeroAddress);

      await expect(
        orchestrator
          .connect(operator)
          .orchestrateStage(orchestrationId, chunkData, { value: 0 })
      ).to.not.be.reverted;
    });
  });

  describe('Integration Scenarios', function () {
    it('Should handle complete deployment workflow', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('deployment-workflow')
      );
      await orchestrator.startOrchestration(orchestrationId, 5000000);

      // Disable fees for cleaner testing
      await factory.setFees(0, false, ethers.ZeroAddress);

      // Stage a chunk through orchestrator
      const chunkData = ethers.toUtf8Bytes('workflow test data');
      const tx = await orchestrator
        .connect(operator)
        .orchestrateStage(orchestrationId, chunkData, { value: 0 });

      // Should emit chunk staging events
      await expect(tx).to.emit(orchestrator, 'ChunksStaged');
      await expect(tx).to.emit(orchestrator, 'ComponentNoted');

      // Complete the orchestration
      await orchestrator.connect(operator).complete(orchestrationId, true);
    });

    it('Should handle emergency scenarios', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('emergency-test')
      );
      await orchestrator.startOrchestration(orchestrationId, 1000000);

      // Test emergency completion
      await expect(orchestrator.complete(orchestrationId, false))
        .to.emit(orchestrator, 'OrchestrationCompleted')
        .withArgs(orchestrationId, false);
    });

    it('Should prevent operations on completed orchestrations', async function () {
      const orchestrationId = ethers.keccak256(
        ethers.toUtf8Bytes('completed-test')
      );
      await orchestrator.startOrchestration(orchestrationId, 1000000);

      // Complete the orchestration
      await orchestrator.complete(orchestrationId, true);

      // Further operations should fail
      await expect(
        orchestrator.noteComponent(orchestrationId, owner.address, 'test')
      ).to.be.revertedWithCustomError(orchestrator, 'PlanDone');

      await expect(
        orchestrator.complete(orchestrationId, false)
      ).to.be.revertedWithCustomError(orchestrator, 'PlanDone');
    });
  });
});

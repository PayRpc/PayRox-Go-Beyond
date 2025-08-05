import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Enhanced Activate Root Script', () => {
  let deployer: SignerWithAddress;
  let admin: SignerWithAddress;
  let user: SignerWithAddress;
  let ManifestDispatcher: any;

  // Test constants
  const TEST_MANIFEST_HASH = ethers.keccak256(
    ethers.toUtf8Bytes('test-manifest-v1')
  );
  const ACTIVATION_DELAY = 0; // No delay for testing

  async function deployFreshDispatcher() {
    const ManifestDispatcherFactory = await ethers.getContractFactory(
      'ManifestDispatcher'
    );
    const dispatcher = await ManifestDispatcherFactory.deploy(
      admin.address, // governance
      admin.address, // guardian
      ACTIVATION_DELAY // minDelay
    );
    await dispatcher.waitForDeployment();
    return dispatcher;
  }

  before(async () => {
    [deployer, admin, user] = await ethers.getSigners();
    ManifestDispatcher = await ethers.getContractFactory('ManifestDispatcher');
  });

  describe('Basic Functionality Tests', () => {
    let dispatcher: any;

    beforeEach(async () => {
      dispatcher = await deployFreshDispatcher();
    });

    it('should successfully activate committed root', async () => {
      // Commit root
      const commitTx = await dispatcher
        .connect(admin)
        .commitRoot(TEST_MANIFEST_HASH, 1n);
      await commitTx.wait();

      const initialState = await dispatcher.activeEpoch();

      const activateTx = await dispatcher
        .connect(admin)
        .activateCommittedRoot();
      await activateTx.wait();

      const finalState = await dispatcher.activeEpoch();
      expect(finalState).to.equal(1n);

      const activeRoot = await dispatcher.activeRoot();
      expect(activeRoot).to.equal(TEST_MANIFEST_HASH);
    });

    it('should track gas usage for activation', async () => {
      // Commit root first
      const commitTx = await dispatcher
        .connect(admin)
        .commitRoot(TEST_MANIFEST_HASH, 1n);
      await commitTx.wait();

      const activateTx = await dispatcher
        .connect(admin)
        .activateCommittedRoot();
      const receipt = await activateTx.wait();

      expect(receipt.gasUsed).to.be.greaterThan(0);
      console.log(`⛽ Gas used for activation: ${receipt.gasUsed.toString()}`);

      // Gas usage should be reasonable (less than 200k gas)
      expect(receipt.gasUsed).to.be.lessThan(200000n);
    });

    it('should handle activation delay correctly', async () => {
      // Deploy dispatcher with delay
      const dispatcherWithDelay = await ManifestDispatcher.deploy(
        admin.address, // governance
        admin.address, // guardian
        3600 // 1 hour
      );
      await dispatcherWithDelay.waitForDeployment();

      // Commit root
      const commitTx = await dispatcherWithDelay
        .connect(admin)
        .commitRoot(TEST_MANIFEST_HASH, 1n);
      await commitTx.wait();

      // Try to activate immediately (should fail)
      await expect(
        dispatcherWithDelay.connect(admin).activateCommittedRoot()
      ).to.be.revertedWithCustomError(
        dispatcherWithDelay,
        'ActivationNotReady'
      );

      // Advance time and activate
      await ethers.provider.send('evm_increaseTime', [3600]);
      await ethers.provider.send('evm_mine', []);

      const activateTx = await dispatcherWithDelay
        .connect(admin)
        .activateCommittedRoot();
      await activateTx.wait();

      const finalEpoch = await dispatcherWithDelay.activeEpoch();
      expect(finalEpoch).to.equal(1n);
    });

    it('should reject activation with no committed root', async () => {
      // Try to activate without committing anything
      await expect(
        dispatcher.connect(admin).activateCommittedRoot()
      ).to.be.revertedWithCustomError(dispatcher, 'NoPendingRoot');
    });

    it('should handle multiple sequential activations', async () => {
      // First commit and activation
      let commitTx = await dispatcher
        .connect(admin)
        .commitRoot(TEST_MANIFEST_HASH, 1n);
      await commitTx.wait();

      let activateTx = await dispatcher.connect(admin).activateCommittedRoot();
      await activateTx.wait();
      expect(await dispatcher.activeEpoch()).to.equal(1n);

      // Commit second root
      const secondManifestHash = ethers.keccak256(
        ethers.toUtf8Bytes('test-manifest-v2')
      );
      commitTx = await dispatcher
        .connect(admin)
        .commitRoot(secondManifestHash, 2n);
      await commitTx.wait();

      // Second activation
      activateTx = await dispatcher.connect(admin).activateCommittedRoot();
      await activateTx.wait();
      expect(await dispatcher.activeEpoch()).to.equal(2n);
      expect(await dispatcher.activeRoot()).to.equal(secondManifestHash);
    });
  });

  describe('Error Handling Tests', () => {
    let dispatcher: any;

    beforeEach(async () => {
      dispatcher = await deployFreshDispatcher();
    });

    it('should provide helpful error messages for frozen dispatcher', async () => {
      // Set up dispatcher with committed root and activate
      const commitTx = await dispatcher
        .connect(admin)
        .commitRoot(TEST_MANIFEST_HASH, 1n);
      await commitTx.wait();

      const activateTx = await dispatcher
        .connect(admin)
        .activateCommittedRoot();
      await activateTx.wait();

      // Freeze the dispatcher
      const freezeTx = await dispatcher.connect(admin).freeze();
      await freezeTx.wait();

      // Try to commit to frozen dispatcher
      const secondHash = ethers.keccak256(
        ethers.toUtf8Bytes('test-manifest-v2')
      );
      await expect(
        dispatcher.connect(admin).commitRoot(secondHash, 2n)
      ).to.be.revertedWithCustomError(dispatcher, 'FrozenError');
    });

    it('should validate epoch sequences correctly', async () => {
      // Set up initial commit and activation
      const commitTx = await dispatcher
        .connect(admin)
        .commitRoot(TEST_MANIFEST_HASH, 1n);
      await commitTx.wait();

      const activateTx = await dispatcher
        .connect(admin)
        .activateCommittedRoot();
      await activateTx.wait();

      // Try to commit wrong epoch (should be 2, not 5)
      const wrongEpoch = 5n;
      const secondHash = ethers.keccak256(
        ethers.toUtf8Bytes('test-manifest-v2')
      );

      await expect(
        dispatcher.connect(admin).commitRoot(secondHash, wrongEpoch)
      ).to.be.revertedWithCustomError(dispatcher, 'BadEpoch');
    });

    it('should handle empty manifest hashes correctly', async () => {
      const emptyHash =
        '0x0000000000000000000000000000000000000000000000000000000000000000';

      // Should reject zero hash
      await expect(
        dispatcher.connect(admin).commitRoot(emptyHash, 1n)
      ).to.be.revertedWithCustomError(dispatcher, 'RootZero');
    });
  });

  describe('Performance Tests', () => {
    let dispatcher: any;

    beforeEach(async () => {
      dispatcher = await deployFreshDispatcher();
      // Set up committed root
      const commitTx = await dispatcher
        .connect(admin)
        .commitRoot(TEST_MANIFEST_HASH, 1n);
      await commitTx.wait();
    });

    it('should complete activation within reasonable time limits', async () => {
      const startTime = Date.now();

      const activateTx = await dispatcher
        .connect(admin)
        .activateCommittedRoot();
      await activateTx.wait();

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.log(`⏱️  Activation execution time: ${executionTime}ms`);

      // Should complete within 10 seconds (very generous for local testing)
      expect(executionTime).to.be.lessThan(10000);
    });

    it('should advance time correctly on local networks', async () => {
      const initialBlock = await ethers.provider.getBlock('latest');
      const initialTimestamp = initialBlock?.timestamp || 0;

      // Advance time by 1 hour
      await ethers.provider.send('evm_increaseTime', [3600]);
      await ethers.provider.send('evm_mine', []);

      const newBlock = await ethers.provider.getBlock('latest');
      const newTimestamp = newBlock?.timestamp || 0;

      expect(newTimestamp - initialTimestamp).to.be.greaterThanOrEqual(3600);
    });
  });

  describe('Integration Tests', () => {
    let dispatcher: any;

    beforeEach(async () => {
      dispatcher = await deployFreshDispatcher();
    });

    it('should work correctly after commit-root.ts execution', async () => {
      // Simulate the state after commit-root.ts has run
      const manifestHash = ethers.keccak256(
        ethers.toUtf8Bytes('integration-test-manifest')
      );

      const commitTx = await dispatcher
        .connect(admin)
        .commitRoot(manifestHash, 1n);
      await commitTx.wait();

      // Verify committed state
      const committedRoot = await dispatcher.pendingRoot();
      expect(committedRoot).to.equal(manifestHash);

      // Now activate
      const activateTx = await dispatcher
        .connect(admin)
        .activateCommittedRoot();
      await activateTx.wait();

      // Verify final state
      const activeRoot = await dispatcher.activeRoot();
      const activeEpoch = await dispatcher.activeEpoch();

      expect(activeRoot).to.equal(manifestHash);
      expect(activeEpoch).to.equal(1n);
    });

    it('should provide correct state for subsequent operations', async () => {
      // Set up initial commit and activation
      const commitTx = await dispatcher
        .connect(admin)
        .commitRoot(TEST_MANIFEST_HASH, 1n);
      await commitTx.wait();

      // After activation, the system should be ready for route application
      const activateTx = await dispatcher
        .connect(admin)
        .activateCommittedRoot();
      await activateTx.wait();

      const activeEpoch = await dispatcher.activeEpoch();
      const activeRoot = await dispatcher.activeRoot();

      expect(activeEpoch).to.be.greaterThan(0n);
      expect(activeRoot).to.not.equal(
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      );

      // System should be unfrozen and ready for operations
      const frozen = await dispatcher.frozen();
      expect(frozen).to.be.false;
    });
  });

  describe('Edge Cases', () => {
    let dispatcher: any;

    beforeEach(async () => {
      dispatcher = await deployFreshDispatcher();
    });

    it('should handle rapid sequential operations', async () => {
      // Test rapid commit/activate cycles
      for (let i = 1; i <= 3; i++) {
        const manifestHash = ethers.keccak256(
          ethers.toUtf8Bytes(`test-manifest-v${i}`)
        );

        const commitTx = await dispatcher
          .connect(admin)
          .commitRoot(manifestHash, BigInt(i));
        await commitTx.wait();

        const activateTx = await dispatcher
          .connect(admin)
          .activateCommittedRoot();
        await activateTx.wait();

        const newEpoch = await dispatcher.activeEpoch();
        expect(newEpoch).to.equal(BigInt(i));
      }
    });

    it('should handle concurrent activation attempts gracefully', async () => {
      const commitTx = await dispatcher
        .connect(admin)
        .commitRoot(TEST_MANIFEST_HASH, 1n);
      await commitTx.wait();

      // Try to execute multiple activations concurrently
      const promises = [
        dispatcher.connect(admin).activateCommittedRoot(),
        dispatcher.connect(admin).activateCommittedRoot(),
        dispatcher.connect(admin).activateCommittedRoot(),
      ];

      const results = await Promise.allSettled(promises);

      // Count successful vs failed attempts
      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;

      // At least one should succeed, and there should be some pattern
      expect(successes).to.be.at.least(1);
      expect(successes + failures).to.equal(3);

      // Most should fail since only one activation is possible per committed root
      expect(failures).to.be.at.least(1);
    });
  });
});

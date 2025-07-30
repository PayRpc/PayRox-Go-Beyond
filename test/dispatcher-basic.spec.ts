import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('ManifestDispatcher Basic Tests', function () {
  let dispatcher: any;
  let owner: HardhatEthersSigner;
  let operator: HardhatEthersSigner;
  let user: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, operator, user] = await ethers.getSigners();

    const DispatcherContract = await ethers.getContractFactory(
      'ManifestDispatcher'
    );
    dispatcher = await DispatcherContract.deploy(owner.address, 0); // No activation delay for testing
    await dispatcher.waitForDeployment();

    // Grant apply role to operator
    const APPLY_ROLE = await dispatcher.APPLY_ROLE();
    await dispatcher.grantRole(APPLY_ROLE, operator.address);
  });

  describe('Basic Functionality', function () {
    it('Should initialize with correct parameters', async function () {
      expect(await dispatcher.activeRoot()).to.equal(ethers.ZeroHash);
      expect(await dispatcher.activeEpoch()).to.equal(0);
      expect(await dispatcher.activationDelay()).to.equal(0);
      expect(await dispatcher.frozen()).to.be.false;
    });

    it('Should handle route queries for non-existent routes', async function () {
      const [facet, codehash] = await dispatcher.routes('0x00000000');
      expect(facet).to.equal(ethers.ZeroAddress);
      expect(codehash).to.equal(ethers.ZeroHash);
    });

    it('Should handle access control properly', async function () {
      const testRoot = ethers.keccak256(ethers.toUtf8Bytes('test'));

      // Should revert when called by non-authorized account
      await expect(
        dispatcher.connect(operator).commitRoot(testRoot, 1)
      ).to.be.revertedWithCustomError(
        dispatcher,
        'AccessControlUnauthorizedAccount'
      );
    });

    it('Should allow admin to commit roots', async function () {
      const COMMIT_ROLE = await dispatcher.COMMIT_ROLE();
      await dispatcher.grantRole(COMMIT_ROLE, owner.address);

      const testRoot = ethers.keccak256(ethers.toUtf8Bytes('test'));

      await expect(dispatcher.commitRoot(testRoot, 1))
        .to.emit(dispatcher, 'RootCommitted')
        .withArgs(testRoot, 1);

      expect(await dispatcher.pendingRoot()).to.equal(testRoot);
      expect(await dispatcher.pendingEpoch()).to.equal(1);
    });

    it('Should handle pause/unpause with emergency role', async function () {
      const EMERGENCY_ROLE = await dispatcher.EMERGENCY_ROLE();
      await dispatcher.grantRole(EMERGENCY_ROLE, operator.address);

      // Test pause
      await expect(dispatcher.connect(operator).pause())
        .to.emit(dispatcher, 'Paused')
        .withArgs(operator.address);

      expect(await dispatcher.paused()).to.be.true;

      // Test unpause
      await expect(dispatcher.connect(operator).unpause())
        .to.emit(dispatcher, 'Unpaused')
        .withArgs(operator.address);

      expect(await dispatcher.paused()).to.be.false;
    });

    it('Should enforce access control for pause/unpause', async function () {
      // Should revert when called by non-emergency role
      await expect(
        dispatcher.connect(user).pause()
      ).to.be.revertedWithCustomError(
        dispatcher,
        'AccessControlUnauthorizedAccount'
      );
    });

    it('Should handle freeze functionality', async function () {
      // Only admin can freeze
      await expect(dispatcher.freeze()).to.emit(dispatcher, 'Frozen');

      expect(await dispatcher.frozen()).to.be.true;

      // After freeze, should reject operations
      const testRoot = ethers.keccak256(ethers.toUtf8Bytes('test'));
      await expect(
        dispatcher.commitRoot(testRoot, 1)
      ).to.be.revertedWithCustomError(dispatcher, 'FrozenError');

      // Should also reject setActivationDelay after freeze
      await expect(
        dispatcher.setActivationDelay(100)
      ).to.be.revertedWithCustomError(dispatcher, 'FrozenError');
    });

    it('Should handle activation delay setting', async function () {
      const newDelay = 3600; // 1 hour

      await expect(dispatcher.setActivationDelay(newDelay))
        .to.emit(dispatcher, 'ActivationDelaySet')
        .withArgs(0, newDelay);

      expect(await dispatcher.activationDelay()).to.equal(newDelay);
    });

    it('Should handle applyRoutes with length mismatch', async function () {
      const COMMIT_ROLE = await dispatcher.COMMIT_ROLE();
      await dispatcher.grantRole(COMMIT_ROLE, owner.address);

      const testRoot = ethers.keccak256(ethers.toUtf8Bytes('test'));
      await dispatcher.commitRoot(testRoot, 1);

      // Test with mismatched array lengths
      await expect(
        dispatcher.connect(operator).applyRoutes(
          ['0x12345678'], // 1 selector
          [user.address, operator.address], // 2 facets - mismatch!
          [ethers.ZeroHash],
          [[]],
          [[]]
        )
      ).to.be.revertedWithCustomError(dispatcher, 'LenMismatch');
    });
  });
});

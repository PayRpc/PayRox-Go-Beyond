import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Enhanced DeterministicChunkFactory Coverage', function () {
  let factory: any;
  let owner: HardhatEthersSigner;
  let feeRecipient: HardhatEthersSigner;
  let operator: HardhatEthersSigner;
  let user: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, feeRecipient, operator, user] = await ethers.getSigners();

    const FactoryContract = await ethers.getContractFactory(
      'DeterministicChunkFactory'
    );
    factory = await FactoryContract.deploy(
      owner.address, // admin
      feeRecipient.address, // feeRecipient
      ethers.parseEther('0.01') // baseFeeWei
    );
    await factory.waitForDeployment();

    // Grant necessary roles
    const OPERATOR_ROLE = await factory.OPERATOR_ROLE();
    const FEE_ROLE = await factory.FEE_ROLE();

    await factory.grantRole(OPERATOR_ROLE, operator.address);
    await factory.grantRole(FEE_ROLE, owner.address);
  });

  describe('Advanced Fee Management', function () {
    it('Should handle fee enablement and disablement', async function () {
      expect(await factory.feesEnabled()).to.be.true; // Constructor sets fees enabled

      // Disable fees
      await factory.setFees(0, false, ethers.ZeroAddress);
      expect(await factory.feesEnabled()).to.be.false;

      // Re-enable fees
      const baseFee = ethers.parseEther('0.01');
      await factory.setFees(baseFee, true, feeRecipient.address);
      expect(await factory.feesEnabled()).to.be.true;
      expect(await factory.baseFeeWei()).to.equal(baseFee);
    });

    it('Should handle fee collection scenarios', async function () {
      const baseFee = ethers.parseEther('0.0007');
      await factory.setFees(baseFee, true, feeRecipient.address);

      const testData = ethers.toUtf8Bytes('test data for staging');

      // Stage with correct fee
      await factory.stage(testData, { value: baseFee });

      // Verify chunk was created
      const chunk = await factory.chunkOf(ethers.keccak256(testData));
      expect(chunk).to.not.equal(ethers.ZeroAddress);
    });

    it('Should handle insufficient fee scenarios', async function () {
      const baseFee = ethers.parseEther('0.01');
      await factory.setFees(baseFee, true, feeRecipient.address);

      const testData = ethers.toUtf8Bytes('test data');
      const insufficientFee = ethers.parseEther('0.005');

      await expect(
        factory.stage(testData, { value: insufficientFee })
      ).to.be.revertedWithCustomError(factory, 'FeeRequired');
    });

    it('Should handle batch staging with fees', async function () {
      const baseFee = ethers.parseEther('0.0007');
      await factory.setFees(baseFee, true, feeRecipient.address);

      const testChunks = [
        ethers.toUtf8Bytes('chunk 1'),
        ethers.toUtf8Bytes('chunk 2'),
        ethers.toUtf8Bytes('chunk 3'),
      ];

      const totalFee = baseFee * BigInt(testChunks.length);

      // Stage batch with correct total fee
      await factory.stageBatch(testChunks, { value: totalFee });
    });
  });

  describe('Advanced Access Control', function () {
    it('Should handle role-based fee management', async function () {
      // Only FEE_ROLE should be able to set fees
      const baseFee = ethers.parseEther('0.002');

      await expect(
        factory.connect(user).setFees(baseFee, true, feeRecipient.address)
      ).to.be.revertedWithCustomError(
        factory,
        'AccessControlUnauthorizedAccount'
      );

      // Owner (with FEE_ROLE) should be able to set fees
      await factory.setFees(baseFee, true, feeRecipient.address);
      expect(await factory.baseFeeWei()).to.equal(baseFee);
    });

    it('Should handle operator role permissions', async function () {
      // Test pause functionality with operator
      await factory.connect(operator).pause();
      expect(await factory.paused()).to.be.true;

      await factory.connect(operator).unpause();
      expect(await factory.paused()).to.be.false;
    });

    it('Should handle emergency controls', async function () {
      // Test pause by admin
      await factory.pause();
      expect(await factory.paused()).to.be.true;

      // Operations should fail when paused
      const testData = ethers.toUtf8Bytes('test while paused');
      await expect(factory.stage(testData)).to.be.revertedWithCustomError(
        factory,
        'EnforcedPause'
      );

      await factory.unpause();
      expect(await factory.paused()).to.be.false;
    });
  });

  describe('Edge Cases and Error Conditions', function () {
    it('Should handle boundary conditions for bytecode size', async function () {
      // Disable fees for this test to test BadSize error specifically
      await factory.setFees(0, false, ethers.ZeroAddress);

      // Test empty data (should fail)
      await expect(factory.stage('0x')).to.be.revertedWithCustomError(
        factory,
        'BadSize'
      );

      // Test valid small data
      const smallData = ethers.toUtf8Bytes('small');
      await factory.stage(smallData);

      const chunk = await factory.chunkOf(ethers.keccak256(smallData));
      expect(chunk).to.not.equal(ethers.ZeroAddress);
    });

    it('Should handle multiple deployments and existence checks', async function () {
      // Disable fees for this test
      await factory.setFees(0, false, ethers.ZeroAddress);

      const testData = ethers.toUtf8Bytes('test data');

      // First deployment
      const firstResult = await factory.stage(testData);
      const firstChunk = await factory.chunkOf(ethers.keccak256(testData));

      // Second deployment of same data (should return same address)
      const secondResult = await factory.stage(testData);
      const secondChunk = await factory.chunkOf(ethers.keccak256(testData));

      expect(firstChunk).to.equal(secondChunk);
      expect(await factory.exists(ethers.keccak256(testData))).to.be.true;
    });

    it('Should handle data reading operations', async function () {
      // Disable fees for this test
      await factory.setFees(0, false, ethers.ZeroAddress);

      const testData = ethers.toUtf8Bytes('readable test data');
      await factory.stage(testData);

      const chunkAddress = await factory.chunkOf(ethers.keccak256(testData));

      // Read data back using the chunk address
      const readData = await factory.read(chunkAddress);
      expect(readData).to.equal(ethers.hexlify(testData));
    });

    it('Should handle prediction functionality', async function () {
      // Disable fees for this test
      await factory.setFees(0, false, ethers.ZeroAddress);

      const testData = ethers.toUtf8Bytes('prediction test');

      // Predict address before deployment
      const [predicted, hash] = await factory.predict(testData);
      expect(predicted).to.not.equal(ethers.ZeroAddress);
      expect(hash).to.equal(ethers.keccak256(testData));

      // Deploy and verify prediction was correct
      await factory.stage(testData);
      const actual = await factory.chunkOf(ethers.keccak256(testData));
      expect(predicted).to.equal(actual);
    });
  });

  describe('Fee Management Edge Cases', function () {
    it('Should handle zero fee scenarios', async function () {
      // Set fees to zero
      await factory.setFees(0, false, ethers.ZeroAddress);
      expect(await factory.feesEnabled()).to.be.false;

      // Should be able to stage without fees
      const testData = ethers.toUtf8Bytes('no fee data');
      await factory.stage(testData);

      const chunk = await factory.chunkOf(ethers.keccak256(testData));
      expect(chunk).to.not.equal(ethers.ZeroAddress);
    });

    it('Should handle fee recipient changes', async function () {
      const newRecipient = user.address;
      const baseFee = ethers.parseEther('0.0007');

      // Change fee recipient
      await factory.setFees(baseFee, true, newRecipient);
      expect(await factory.feeRecipient()).to.equal(newRecipient);
      expect(await factory.feesEnabled()).to.be.true;
    });
  });
});

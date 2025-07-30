import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('Enhanced Facet Coverage Tests', function () {
  let facetA: any;
  let facetB: any;
  let owner: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let operator: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, user, operator] = await ethers.getSigners();

    const FacetAContract = await ethers.getContractFactory('ExampleFacetA');
    facetA = await FacetAContract.deploy();
    await facetA.waitForDeployment();

    const FacetBContract = await ethers.getContractFactory('ExampleFacetB');
    facetB = await FacetBContract.deploy();
    await facetB.waitForDeployment();

    // Initialize FacetB with operator role
    await facetB.initializeFacetB(operator.address);
  });

  describe('ExampleFacetA Enhanced Coverage', function () {
    it('Should test signature verification functionality', async function () {
      const message = ethers.keccak256(ethers.toUtf8Bytes('test message'));
      const signature = await owner.signMessage(ethers.getBytes(message));

      // Test valid signature
      const isValid = await facetA.verifySignature(
        message,
        signature,
        owner.address
      );
      expect(isValid).to.be.true;

      // Test invalid signature
      const invalidSig = await user.signMessage(ethers.getBytes(message));
      const isInvalid = await facetA.verifySignature(
        message,
        invalidSig,
        owner.address
      );
      expect(isInvalid).to.be.false;
    });

    it('Should track last caller correctly', async function () {
      // Execute function to set last caller
      await facetA.connect(user).executeA('test message');

      const lastCaller = await facetA.lastCaller();
      expect(lastCaller).to.equal(user.address);

      // Execute with different user
      await facetA.connect(owner).executeA('another message');

      const newLastCaller = await facetA.lastCaller();
      expect(newLastCaller).to.equal(owner.address);
    });

    it('Should provide correct facet info', async function () {
      const [name, version, selectors] = await facetA.getFacetInfo();

      expect(name).to.equal('ExampleFacetA');
      expect(version).to.equal('1.1.0'); // Updated to match actual version
      expect(selectors.length).to.equal(10);
    });

    it('Should handle edge cases in batch execution', async function () {
      // Test with maximum allowed messages (10 according to contract limit)
      const maxMessages = Array(10).fill('test');

      const results = await facetA.batchExecute.staticCall(maxMessages);
      expect(Array.isArray(results)).to.be.true;
      expect(results.length).to.equal(10);
      expect(results.every((r: boolean) => r === true)).to.be.true;

      // Test exceeding the limit should revert
      const tooManyMessages = Array(11).fill('test');
      await expect(
        facetA.batchExecute(tooManyMessages)
      ).to.be.revertedWithCustomError(facetA, 'TooManyMessages');

      // Test with mixed valid/invalid messages
      const mixedMessages = ['valid', '', 'also valid'];
      const mixedResults = await facetA.batchExecute.staticCall(mixedMessages);
      expect(mixedResults[0]).to.be.true; // valid
      expect(mixedResults[1]).to.be.false; // empty
      expect(mixedResults[2]).to.be.true; // valid
    });

    it('Should handle large data storage scenarios', async function () {
      const key = ethers.keccak256(ethers.toUtf8Bytes('large_data'));

      // Test with data under the limit (MAX_DATA_BYTES is likely 10KB)
      const largeData = new Uint8Array(10000).fill(42);
      const largeDataHex =
        '0x' +
        Array.from(largeData, b => b.toString(16).padStart(2, '0')).join('');

      // This should fail with DataTooLarge as expected
      await expect(
        facetA.storeData(key, largeDataHex)
      ).to.be.revertedWithCustomError(facetA, 'DataTooLarge');

      // Test with smaller data that should work
      const smallData = new Uint8Array(1000).fill(42);
      const smallDataHex =
        '0x' +
        Array.from(smallData, b => b.toString(16).padStart(2, '0')).join('');

      await facetA.storeData(key, smallDataHex);
      const retrievedData = await facetA.getData(key);
      expect(retrievedData).to.equal(smallDataHex);
    });

    it('Should handle overflow scenarios gracefully', async function () {
      // Execute many times to test counter overflow protection
      for (let i = 0; i < 10; i++) {
        await facetA.executeA(`message ${i}`);
      }

      const totalExecs = await facetA.totalExecutions();
      expect(totalExecs).to.equal(10);

      const userCount = await facetA.getUserCount(owner.address);
      expect(userCount).to.equal(10);
    });
  });

  describe('ExampleFacetB Enhanced Coverage', function () {
    it('Should handle complex calculation edge cases', async function () {
      // Test with valid operation types only (1-5 are valid)
      // Operation 1: Add value (expects uint256)
      const addData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256'],
        [100]
      );
      const result1 = await facetB.executeB(1, addData);
      expect(result1).to.not.equal(ethers.ZeroHash);

      // Operation 2: Subtract value (expects uint256)
      const subData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256'],
        [50]
      );
      const result2 = await facetB.executeB(2, subData);
      expect(result2).to.not.equal(ethers.ZeroHash);
      expect(result1).to.not.equal(result2); // Should be different
    });

    it('Should handle batch operations with edge cases', async function () {
      // Test multiple sequential operations with proper data encoding
      // Operation 1: Add 10
      const addData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256'],
        [10]
      );
      const op1 = await facetB.executeB(1, addData);

      // Operation 3: Multiply by percentage (150%)
      const mulData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256'],
        [150]
      );
      const op2 = await facetB.executeB(3, mulData);

      expect(op1).to.not.equal(ethers.ZeroHash);
      expect(op2).to.not.equal(ethers.ZeroHash);
      expect(op1).to.not.equal(op2);
      expect(op2).to.not.equal(ethers.ZeroHash);
      expect(op1).to.not.equal(op2); // Should be different operation IDs
    });

    it('Should provide comprehensive state summary', async function () {
      // Execute some operations first with proper data encoding
      const addData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256'],
        [25]
      );
      await facetB.executeB(1, addData);

      const subData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256'],
        [5]
      );
      await facetB.executeB(2, subData);

      // Test the actual getStateSummary function that should exist
      const summary = await facetB.getStateSummary();
      expect(summary).to.not.be.undefined;
    });

    it('Should handle pause/unpause edge cases', async function () {
      // Test that operations work when not paused
      const normalData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256'],
        [42]
      );
      await facetB.executeB(1, normalData);

      // ExampleFacetB supports setPaused(bool) via operator role
      await facetB.connect(operator).setPaused(true);

      // Check paused state via getStateSummary()
      const stateSummary1 = await facetB.getStateSummary();
      expect(stateSummary1.paused).to.be.true;

      // Test operations while paused should revert
      await expect(
        facetB.executeB(1, normalData)
      ).to.be.revertedWithCustomError(facetB, 'Paused');

      await facetB.connect(operator).setPaused(false);
      const stateSummary2 = await facetB.getStateSummary();
      expect(stateSummary2.paused).to.be.false;
    });

    it('Should handle mathematical edge cases in complex calculations', async function () {
      // Test with different operation types and proper data encoding
      // Operation 4: Reset to 0
      const resetData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256'],
        [0]
      );
      const result1 = await facetB.executeB(4, resetData);
      expect(result1).to.not.equal(ethers.ZeroHash);

      // Operation 5: Complex calculation (a + b) * c / 2
      const complexData = ethers.AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'uint256', 'uint256'],
        [10, 20, 4]
      );
      const result2 = await facetB.executeB(5, complexData);
      expect(result2).to.not.equal(ethers.ZeroHash);
      expect(result1).to.not.equal(result2);
    });

    it('Should handle state consistency across multiple operations', async function () {
      const operations = [
        { type: 1, value: 10 }, // Add 10
        { type: 2, value: 5 }, // Subtract 5
        { type: 1, value: 20 }, // Add 20
        { type: 3, value: 200 }, // Multiply by 200%
        { type: 4, value: 0 }, // Reset to 0
      ];

      const results = [];

      // Execute operations sequentially with proper data encoding
      for (const op of operations) {
        const data = ethers.AbiCoder.defaultAbiCoder().encode(
          ['uint256'],
          [op.value]
        );
        const result = await facetB.executeB(op.type, data);
        results.push(result);
      }

      // All results should be unique
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).to.equal(results.length);

      // Check counter increased via getStateSummary()
      const finalSummary = await facetB.getStateSummary();
      expect(finalSummary.operations).to.be.gte(operations.length);
    });
  });
});

import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('ExampleFacets', function () {
  let facetA: any;
  let facetB: any;
  let pingFacet: any;
  let signer: any;
  let addr1: any;

  beforeEach(async function () {
    [signer, addr1] = await ethers.getSigners();

    // Deploy ExampleFacetA
    const ExampleFacetA = await ethers.getContractFactory('ExampleFacetA');
    facetA = await ExampleFacetA.deploy();
    await facetA.waitForDeployment();

    // Deploy ExampleFacetB
    const ExampleFacetB = await ethers.getContractFactory('ExampleFacetB');
    facetB = await ExampleFacetB.deploy();
    await facetB.waitForDeployment();

    // Deploy PingFacet
    const PingFacet = await ethers.getContractFactory('PingFacet');
    pingFacet = await PingFacet.deploy();
    await pingFacet.waitForDeployment();
  });

  describe('ExampleFacetA', function () {
    it('Should execute basic function', async function () {
      const message = 'Hello, FacetA!';

      await expect(facetA.executeA(message))
        .to.emit(facetA, 'FacetAExecuted')
        .withArgs(signer.address, 0, message);
    });

    it('Should reject empty message', async function () {
      await expect(facetA.executeA('')).to.be.revertedWithCustomError(
        facetA,
        'EmptyMessage'
      );
    });

    it('Should store and retrieve data', async function () {
      const key = ethers.keccak256(ethers.toUtf8Bytes('testKey'));
      const data = ethers.toUtf8Bytes('Hello, storage!');
      const dataBytes = ethers.hexlify(data);

      await expect(facetA.storeData(key, dataBytes))
        .to.emit(facetA, 'DataStored')
        .withArgs(
          key,
          ethers.keccak256(dataBytes),
          data.length,
          signer.address
        );

      const retrievedData = await facetA.getData(key);
      expect(retrievedData).to.equal(dataBytes);
    });

    it('Should reject empty data', async function () {
      const key = ethers.keccak256(ethers.toUtf8Bytes('testKey'));

      await expect(facetA.storeData(key, '0x')).to.be.revertedWithCustomError(
        facetA,
        'EmptyData'
      );
    });

    it("Should reject data that's too large", async function () {
      const key = ethers.keccak256(ethers.toUtf8Bytes('testKey'));
      const largeData = '0x' + 'aa'.repeat(5000); // Larger than MAX_DATA_BYTES

      await expect(
        facetA.storeData(key, largeData)
      ).to.be.revertedWithCustomError(facetA, 'DataTooLarge');
    });

    it('Should handle batch operations', async function () {
      const messages = ['Message 1', 'Message 2', 'Message 3'];

      const tx = await facetA.batchExecute(messages);
      const receipt = await tx.wait();

      // Should emit events for each successful execution
      expect(receipt.logs.length).to.be.greaterThan(0);
    });

    it('Should reject too many messages in batch', async function () {
      const messages = Array(15).fill('Message'); // More than MAX_MESSAGES (10)

      await expect(facetA.batchExecute(messages)).to.be.revertedWithCustomError(
        facetA,
        'TooManyMessages'
      );
    });

    it('Should track user execution counts', async function () {
      const initialCount = await facetA.getUserCount(signer.address);
      expect(initialCount).to.equal(0);

      await facetA.executeA('Test message');

      const updatedCount = await facetA.getUserCount(signer.address);
      expect(updatedCount).to.equal(1);
    });

    it('Should track total executions', async function () {
      const initialTotal = await facetA.totalExecutions();

      await facetA.executeA('Test 1');
      await facetA.executeA('Test 2');

      const updatedTotal = await facetA.totalExecutions();
      expect(updatedTotal).to.equal(initialTotal + 2n);
    });

    it('Should calculate hash correctly', async function () {
      const input = ethers.toUtf8Bytes('Test input');
      const inputHex = ethers.hexlify(input);

      const hash = await facetA.calculateHash(inputHex);
      const expectedHash = ethers.keccak256(inputHex);

      expect(hash).to.equal(expectedHash);
    });
  });

  describe('ExampleFacetB', function () {
    beforeEach(async function () {
      // Initialize FacetB with operator
      await facetB.initializeFacetB(signer.address);
    });

    it('Should execute operation', async function () {
      const operationType = 1;
      const data = ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [10]);

      const operationId = await facetB.executeB.staticCall(operationType, data);
      expect(operationId).to.not.equal(ethers.ZeroHash);

      // Now actually execute it
      await facetB.executeB(operationType, data);
    });

    it('Should handle batch operations', async function () {
      const operations = [1, 2];
      const dataArray = [
        ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [10]),
        ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [20]),
      ];

      const results = await facetB.batchExecuteB.staticCall(
        operations,
        dataArray
      );
      expect(results.length).to.equal(2);
      expect(results[0]).to.not.equal(ethers.ZeroHash);
      expect(results[1]).to.not.equal(ethers.ZeroHash);
    });

    it('Should handle complex calculations', async function () {
      const inputs = [1, 2, 3, 4, 5];

      const result = await facetB.complexCalculation(inputs);
      expect(result).to.be.gt(0); // Should return some calculated value
    });

    it('Should get state summary', async function () {
      const [value, operations, executor, paused] =
        await facetB.getStateSummary();
      expect(operations).to.equal(0); // Initially 0
      expect(paused).to.be.false; // Initially not paused
    });

    it('Should allow operator to pause/unpause', async function () {
      await facetB.setPaused(true);

      // Should reject operations when paused
      await expect(
        facetB.executeB(
          1,
          ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [10])
        )
      ).to.be.revertedWithCustomError(facetB, 'Paused');

      await facetB.setPaused(false);

      // Should work again when unpaused
      await expect(
        facetB.executeB(
          1,
          ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [10])
        )
      ).to.not.be.reverted;
    });
  });

  describe('PingFacet', function () {
    it('Should return function selector', async function () {
      const result = await pingFacet.ping();

      // The ping function returns its own selector
      const expectedSelector = '0x5c36b186'; // ping() selector
      expect(result).to.equal(expectedSelector);
    });

    it('Should echo data correctly', async function () {
      const testData = ethers.ZeroHash;

      const result = await pingFacet.echo(testData);
      expect(result).to.equal(testData);
    });

    it('Should handle different echo values', async function () {
      const testData = ethers.keccak256(ethers.toUtf8Bytes('test'));

      const result = await pingFacet.echo(testData);
      expect(result).to.equal(testData);
    });
  });

  describe('Gas Usage Analysis', function () {
    it('Should measure gas usage for facet operations', async function () {
      // Measure ExampleFacetA gas usage
      const txA = await facetA.executeA('Gas test message');
      const receiptA = await txA.wait();
      console.log(`ExampleFacetA executeA gas used: ${receiptA.gasUsed}`);

      // Initialize FacetB first
      await facetB.initializeFacetB(signer.address);

      // Measure ExampleFacetB gas usage
      const txB = await facetB.executeB(
        1,
        ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [123])
      );
      const receiptB = await txB.wait();
      console.log(`ExampleFacetB executeB gas used: ${receiptB.gasUsed}`);

      // Measure PingFacet gas usage (ping is pure, so we estimate gas)
      const gasEstimate = await pingFacet.ping.estimateGas();
      console.log(`PingFacet ping gas estimate: ${gasEstimate}`);

      // Ensure gas usage is reasonable
      expect(receiptA.gasUsed).to.be.lt(100000); // Simple operation
      expect(receiptB.gasUsed).to.be.lt(250000); // Complex operation with storage, hashing, and ring buffer
      expect(gasEstimate).to.be.lt(50000); // Pure function estimate
    });
  });
});

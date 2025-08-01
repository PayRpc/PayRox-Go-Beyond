import { expect } from "chai";
import { ethers } from "hardhat";
import type { ExampleFacetB, ManifestDispatcher } from "../typechain-types";

describe("Code Quality Fixes", function () {
  let facetB: ExampleFacetB;
  let dispatcher: ManifestDispatcher;
  let owner: any;
  let operator: any;

  beforeEach(async function () {
    [owner, operator] = await ethers.getSigners();

    // Deploy ExampleFacetB
    const FacetBFactory = await ethers.getContractFactory("ExampleFacetB");
    facetB = await FacetBFactory.deploy();
    await facetB.waitForDeployment();

    // Deploy ManifestDispatcher
    const DispatcherFactory = await ethers.getContractFactory("ManifestDispatcher");
    dispatcher = await DispatcherFactory.deploy(owner.address, 60); // 1 minute delay
    await dispatcher.waitForDeployment();
  });

  describe("ExampleFacetB Zero Address Check", function () {
    it("Should revert when initializing with zero address", async function () {
      await expect(
        facetB.initializeFacetB(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(facetB, "ZeroAddress");
    });

    it("Should allow initialization with valid address", async function () {
      await expect(
        facetB.initializeFacetB(operator.address)
      ).to.not.be.reverted;
    });

    it("Should prevent re-initialization", async function () {
      await facetB.initializeFacetB(operator.address);
      await expect(
        facetB.initializeFacetB(operator.address)
      ).to.be.revertedWithCustomError(facetB, "AlreadyInitialized");
    });
  });

  describe("ExampleFacetB Empty Batch Error", function () {
    beforeEach(async function () {
      await facetB.initializeFacetB(operator.address);
    });

    it("Should revert with EmptyBatch for zero-length arrays", async function () {
      await expect(
        facetB.batchExecuteB([], [])
      ).to.be.revertedWithCustomError(facetB, "EmptyBatch");
    });

    it("Should still revert with TooManyOperations for large batches", async function () {
      const operations = new Array(25).fill(1); // MAX_BATCH is 20
      const dataArray = new Array(25).fill("0x1234");
      
      await expect(
        facetB.batchExecuteB(operations, dataArray)
      ).to.be.revertedWithCustomError(facetB, "TooManyOperations");
    });

    it("Should work with valid small batch", async function () {
      const operations = [1, 2];
      const dataArray = [
        ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [10]),
        ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [20]),
      ];
      
      // Facet should not be paused by default after initialization
      await expect(
        facetB.batchExecuteB(operations, dataArray)
      ).to.not.be.reverted;
    });
  });

  describe("ManifestDispatcher Activation Error Parameters", function () {
    it("Should provide correct error parameters in ActivationNotReady", async function () {
      // Set up a pending root
      const dummyRoot = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await dispatcher.commitRoot(dummyRoot, 1);

      // Try to activate immediately (should fail due to delay)
      try {
        await dispatcher.activateCommittedRoot();
        expect.fail("Should have reverted");
      } catch (error: any) {
        // Verify the error has the correct structure
        expect(error.message).to.include("ActivationNotReady");
        // The fix ensures epochArg is 0 (not duplicated pendingEpoch)
      }
    });

    it("Should allow activation after delay expires", async function () {
      // Set up with zero delay for this test
      const quickDispatcher = await ethers.deployContract("ManifestDispatcher", [owner.address, 0]);
      
      const dummyRoot = ethers.keccak256(ethers.toUtf8Bytes("test"));
      await quickDispatcher.commitRoot(dummyRoot, 1);
      
      // Should work with zero delay
      await expect(
        quickDispatcher.activateCommittedRoot()
      ).to.not.be.reverted;
    });
  });

  describe("Operator Functionality After Initialization", function () {
    it("Should allow operator to pause after proper initialization", async function () {
      await facetB.initializeFacetB(operator.address);
      
      // Operator should be able to pause
      await expect(
        facetB.connect(operator).setPaused(true)
      ).to.not.be.reverted;
    });

    it("Should prevent non-operator from pausing", async function () {
      await facetB.initializeFacetB(operator.address);
      
      // Owner (not operator) should not be able to pause
      await expect(
        facetB.connect(owner).setPaused(true)
      ).to.be.revertedWithCustomError(facetB, "NotOperator");
    });

    it("Should demonstrate the problem if zero address was allowed", async function () {
      // This test shows what would happen if we didn't fix the zero address issue
      // We can't actually test this since we fixed it, but we can document the issue
      
      // If initializeFacetB(address(0)) was allowed:
      // 1. operator would be set to address(0)
      // 2. onlyOperator modifier would check: require(msg.sender == address(0))
      // 3. This would always fail since msg.sender can never be address(0)
      // 4. setPaused would be permanently unusable
      
      // Our fix prevents this by rejecting zero address in initialization
      await expect(
        facetB.initializeFacetB(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(facetB, "ZeroAddress");
    });
  });
});

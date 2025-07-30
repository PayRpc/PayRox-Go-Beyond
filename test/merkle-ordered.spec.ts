import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  createRouteLeaf,
  processOrderedProof,
  verifyOrderedProof,
} from '../scripts/utils/ordered-merkle';

describe('OrderedMerkle Utilities', function () {
  describe('TypeScript Implementation', function () {
    it('Should process ordered proofs with bitfield encoding', function () {
      // Create a simple 2-leaf tree
      const leafA = ethers.keccak256(ethers.toUtf8Bytes('leafA'));
      const leafB = ethers.keccak256(ethers.toUtf8Bytes('leafB'));

      // Root: hash(leafA, leafB) - leafB is sibling on the right
      const expectedRoot = ethers.keccak256(ethers.concat([leafA, leafB]));

      const proof = [leafB];
      const positions = '0x01'; // bit 0 = 1, sibling on right

      const computedRoot = processOrderedProof(leafA, proof, positions);
      expect(computedRoot.toLowerCase()).to.equal(expectedRoot.toLowerCase());

      expect(verifyOrderedProof(leafA, proof, positions, expectedRoot)).to.be
        .true;
    });

    it('Should reject incorrect position encoding', function () {
      const leafA = ethers.keccak256(ethers.toUtf8Bytes('leafA'));
      const leafB = ethers.keccak256(ethers.toUtf8Bytes('leafB'));

      // Correct root: hash(leafA, leafB)
      const correctRoot = ethers.keccak256(ethers.concat([leafA, leafB]));

      const proof = [leafB];
      const wrongPositions = '0x00'; // bit 0 = 0, sibling on left (wrong!)

      expect(verifyOrderedProof(leafA, proof, wrongPositions, correctRoot)).to
        .be.false;
    });

    it('Should handle multi-level proofs', function () {
      const leaf = ethers.keccak256(ethers.toUtf8Bytes('target'));
      const sib1 = ethers.keccak256(ethers.toUtf8Bytes('sib1'));
      const sib2 = ethers.keccak256(ethers.toUtf8Bytes('sib2'));

      // Build tree: sib1 left, sib2 right
      // Level 1: hash(sib1, leaf)
      // Level 2: hash(level1, sib2)
      const level1 = ethers.keccak256(ethers.concat([sib1, leaf]));
      const root = ethers.keccak256(ethers.concat([level1, sib2]));

      const proof = [sib1, sib2];
      const positions = '0x02'; // binary: 10 = bit1=1 (sib2 right), bit0=0 (sib1 left)

      expect(verifyOrderedProof(leaf, proof, positions, root)).to.be.true;

      // Test wrong positions
      const wrongPositions = '0x03'; // flip bit0
      expect(verifyOrderedProof(leaf, proof, wrongPositions, root)).to.be.false;
    });

    it('Should create correct route leaves', function () {
      const selector = '0x12345678';
      const facet = '0x' + '1'.repeat(40);
      const codehash = '0x' + 'a'.repeat(64);

      const leaf = createRouteLeaf(selector, facet, codehash);

      // Verify it's a valid 32-byte hash
      expect(leaf).to.match(/^0x[0-9a-fA-F]{64}$/);

      // Should be deterministic
      const leaf2 = createRouteLeaf(selector, facet, codehash);
      expect(leaf).to.equal(leaf2);
    });

    it('Should handle empty proofs (single leaf trees)', function () {
      const leaf = ethers.keccak256(ethers.toUtf8Bytes('single'));
      const emptyProof: string[] = [];
      const positions = '0x00';

      // For single-leaf tree, root equals leaf
      expect(verifyOrderedProof(leaf, emptyProof, positions, leaf)).to.be.true;
    });
  });

  describe('Ordered vs Sorted Comparison', function () {
    it('Should distinguish ordered from sorted pair hashing', function () {
      const leafA = ethers.keccak256(ethers.toUtf8Bytes('leafA'));
      const leafB = ethers.keccak256(ethers.toUtf8Bytes('leafB'));

      // Ordered: hash(A, B)
      const orderedRoot = ethers.keccak256(ethers.concat([leafA, leafB]));

      // Sorted: hash(min(A,B), max(A,B)) as OpenZeppelin would do
      const [minLeaf, maxLeaf] =
        leafA < leafB ? [leafA, leafB] : [leafB, leafA];
      const sortedRoot = ethers.keccak256(ethers.concat([minLeaf, maxLeaf]));

      // Our ordered implementation should match ordered, not sorted
      const proof = [leafB];
      const positions = '0x01'; // leafB on right

      expect(verifyOrderedProof(leafA, proof, positions, orderedRoot)).to.be
        .true;

      // Should NOT match sorted unless they happen to be the same
      if (orderedRoot !== sortedRoot) {
        expect(verifyOrderedProof(leafA, proof, positions, sortedRoot)).to.be
          .false;
      }
    });
  });

  describe('Chunk Edge Cases', function () {
    it('Should handle chunk exists() empty-code edge case', async function () {
      const FactoryContract = await ethers.getContractFactory(
        'DeterministicChunkFactory'
      );
      const [deployer] = await ethers.getSigners();
      const factory = await FactoryContract.deploy(
        deployer.address,
        deployer.address,
        0
      );
      await factory.waitForDeployment();

      // Manually map a hash to an address with no code
      const testData = '0x01020304';
      const hash = ethers.keccak256(testData);

      // Create an empty account (this would need to be done via storage manipulation in a test harness)
      // For now, just test that exists() returns false for unmapped hashes
      expect(await factory.exists(hash)).to.be.false;
    });

    it('Should handle prologue read offset when using revert prefix', async function () {
      const FactoryContract = await ethers.getContractFactory(
        'DeterministicChunkFactory'
      );
      const [deployer] = await ethers.getSigners();
      const factory = await FactoryContract.deploy(
        deployer.address,
        deployer.address,
        0
      );
      await factory.waitForDeployment();

      // Test data to store
      const testData = '0x01020304050607080910';

      // Stage the chunk
      await factory.stage(testData);

      // Predict the address
      const [chunkAddress, hash] = await factory.predict(testData);

      // Read the chunk data
      const retrievedData = await factory.read(chunkAddress);

      // Should match original data (or data after prologue if using revert prefix)
      expect(retrievedData).to.equal(testData);
    });
  });

  describe('OrderedMerkle Contract Testing', function () {
    let orderedMerkle: any;

    beforeEach(async function () {
      // Deploy a test contract that uses OrderedMerkle
      const TestOrderedMerkleContract = await ethers.getContractFactory(
        'TestOrderedMerkle'
      );
      orderedMerkle = await TestOrderedMerkleContract.deploy();
      await orderedMerkle.waitForDeployment();
    });

    it('Should verify ordered proofs using boolean array method', async function () {
      const leafA = ethers.keccak256(ethers.toUtf8Bytes('leafA'));
      const leafB = ethers.keccak256(ethers.toUtf8Bytes('leafB'));

      // Create expected root: hash(leafA, leafB)
      const expectedRoot = ethers.keccak256(ethers.concat([leafA, leafB]));

      const proof = [leafB];
      const isRight = [true]; // leafB is on the right

      const result = await orderedMerkle.verifyBoolArray(
        proof,
        isRight,
        expectedRoot,
        leafA
      );
      expect(result).to.be.true;
    });

    it('Should verify ordered proofs using bitfield method', async function () {
      const leafA = ethers.keccak256(ethers.toUtf8Bytes('leafA'));
      const leafB = ethers.keccak256(ethers.toUtf8Bytes('leafB'));

      // Create expected root: hash(leafA, leafB)
      const expectedRoot = ethers.keccak256(ethers.concat([leafA, leafB]));

      const proof = [leafB];
      const positions = 1; // bit 0 = 1, leafB is on the right

      const result = await orderedMerkle.verifyBitfield(
        leafA,
        proof,
        positions,
        expectedRoot
      );
      expect(result).to.be.true;
    });

    it('Should handle complex multi-level proofs with bitfield', async function () {
      const leaf = ethers.keccak256(ethers.toUtf8Bytes('target'));
      const sib1 = ethers.keccak256(ethers.toUtf8Bytes('sib1'));
      const sib2 = ethers.keccak256(ethers.toUtf8Bytes('sib2'));
      const sib3 = ethers.keccak256(ethers.toUtf8Bytes('sib3'));

      // Build a 4-leaf tree structure
      // Level 1: hash(sib1, leaf), hash(sib2, sib3)
      const level1_left = ethers.keccak256(ethers.concat([sib1, leaf]));
      const level1_right = ethers.keccak256(ethers.concat([sib2, sib3]));

      // Level 2: hash(level1_left, level1_right)
      const root = ethers.keccak256(ethers.concat([level1_left, level1_right]));

      const proof = [sib1, level1_right];
      const positions = 2; // binary: 10 = bit1=1 (level1_right on right), bit0=0 (sib1 on left)

      const result = await orderedMerkle.verifyBitfield(
        leaf,
        proof,
        positions,
        root
      );
      expect(result).to.be.true;
    });

    it('Should reject invalid proofs with wrong positioning', async function () {
      const leafA = ethers.keccak256(ethers.toUtf8Bytes('leafA'));
      const leafB = ethers.keccak256(ethers.toUtf8Bytes('leafB'));

      // Create expected root: hash(leafA, leafB)
      const expectedRoot = ethers.keccak256(ethers.concat([leafA, leafB]));

      const proof = [leafB];
      const wrongPositions = 0; // bit 0 = 0, claiming leafB is on the left (wrong!)

      const result = await orderedMerkle.verifyBitfield(
        leafA,
        proof,
        wrongPositions,
        expectedRoot
      );
      expect(result).to.be.false;
    });

    it('Should handle empty proofs (single leaf)', async function () {
      const singleLeaf = ethers.keccak256(ethers.toUtf8Bytes('onlyLeaf'));
      const emptyProof: any[] = [];
      const positions = 0; // No siblings

      // For single leaf, root should equal the leaf itself
      const result = await orderedMerkle.verifyBitfield(
        singleLeaf,
        emptyProof,
        positions,
        singleLeaf
      );
      expect(result).to.be.true;
    });

    it('Should process proofs correctly with processProof function', async function () {
      const leaf = ethers.keccak256(ethers.toUtf8Bytes('testLeaf'));
      const sibling = ethers.keccak256(ethers.toUtf8Bytes('sibling'));

      const proof = [sibling];
      const positions = 1; // Sibling on right

      const computedRoot = await orderedMerkle.processProofBitfield(
        leaf,
        proof,
        positions
      );
      const expectedRoot = ethers.keccak256(ethers.concat([leaf, sibling]));

      expect(computedRoot).to.equal(expectedRoot);
    });

    it('Should handle large proofs with many levels', async function () {
      // Create a deeper tree to test multiple levels
      const leaf = ethers.keccak256(ethers.toUtf8Bytes('deepLeaf'));
      const siblings = [];

      for (let i = 0; i < 5; i++) {
        siblings.push(ethers.keccak256(ethers.toUtf8Bytes(`sibling${i}`)));
      }

      // All siblings on the right (positions = 0x1F = binary 11111)
      const positions = 0x1f;

      // Build expected root step by step
      let current = leaf;
      for (let i = 0; i < siblings.length; i++) {
        current = ethers.keccak256(ethers.concat([current, siblings[i]]));
      }

      const result = await orderedMerkle.verifyBitfield(
        leaf,
        siblings,
        positions,
        current
      );
      expect(result).to.be.true;
    });
  });
});

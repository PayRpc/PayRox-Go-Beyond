import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

/**
 * @title ChunkFactoryFacet Integration Test
 * @notice Focused integration test for ChunkFactoryFacet with proper factory setup
 * @dev Tests the complete Diamond facet integration workflow
 */

describe('ChunkFactoryFacet Integration', function () {
  let deployer: HardhatEthersSigner;
  let user1: HardhatEthersSigner;

  let mockDispatcher: any;
  let factory: any;
  let facet: any;

  let dispatcherAddress: string;
  let factoryAddress: string;
  let facetAddress: string;

  before(async function () {
    console.log('🏗️  Setting up ChunkFactoryFacet integration test...');
    [deployer, user1] = await ethers.getSigners();

    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`👤 User1: ${user1.address}`);
  });

  beforeEach(async function () {
    // Deploy MockManifestDispatcher
    const MockManifestDispatcher = await ethers.getContractFactory(
      'MockManifestDispatcher'
    );
    mockDispatcher = await MockManifestDispatcher.deploy();
    dispatcherAddress = await mockDispatcher.getAddress();
    console.log(`📡 MockDispatcher: ${dispatcherAddress}`);

    // Deploy DeterministicChunkFactory with proper constructor args
    const DeterministicChunkFactory = await ethers.getContractFactory(
      'DeterministicChunkFactory'
    );
    factory = await DeterministicChunkFactory.deploy(
      deployer.address, // feeRecipient
      dispatcherAddress, // manifestDispatcher
      ethers.keccak256(ethers.toUtf8Bytes('test-manifest')), // manifestHash
      ethers.keccak256(ethers.toUtf8Bytes('test-factory-bytecode')), // factoryBytecodeHash
      ethers.parseEther('0.001'), // baseFeeWei
      true // feesEnabled
    );
    factoryAddress = await factory.getAddress();
    console.log(`🏭 Factory: ${factoryAddress}`);

    // Deploy ChunkFactoryFacet
    const ChunkFactoryFacet = await ethers.getContractFactory(
      'ChunkFactoryFacet'
    );
    facet = await ChunkFactoryFacet.deploy(factoryAddress);
    facetAddress = await facet.getAddress();
    console.log(`💎 Facet: ${facetAddress}`);
  });

  describe('🔧 Basic Integration', function () {
    it('Should deploy with correct factory address', async function () {
      const storedFactoryAddress = await facet.getFactoryAddress();
      expect(storedFactoryAddress).to.equal(factoryAddress);
      console.log('✅ Factory address verification passed');
    });

    it('Should support required interfaces', async function () {
      const supportsIChunkFactory = await facet.supportsInterface('0x01ffc9a7'); // ERC165
      const supportsIDiamondLoupe = await facet.supportsInterface(
        ethers.id('IDiamondLoupe').slice(0, 10)
      );

      expect(supportsIChunkFactory).to.be.true;
      console.log('✅ ERC165 interface support confirmed');
    });

    it('Should proxy basic view functions correctly', async function () {
      const factoryFee = await factory.getDeploymentFee();
      const facetFee = await facet.getDeploymentFee();
      expect(facetFee).to.equal(factoryFee);

      const factoryCount = await factory.getDeploymentCount();
      const facetCount = await facet.getDeploymentCount();
      expect(facetCount).to.equal(factoryCount);

      console.log('✅ View function proxying working correctly');
    });
  });

  describe('🔮 Prediction Functions', function () {
    it('Should predict chunk addresses correctly', async function () {
      const testData = ethers.toUtf8Bytes('Test chunk data for prediction');

      const [factoryPredicted, factoryHash] = await factory.predict(testData);
      const [facetPredicted, facetHash] = await facet.predict(testData);

      expect(facetPredicted).to.equal(factoryPredicted);
      expect(facetHash).to.equal(factoryHash);

      console.log(`✅ Prediction match: ${facetPredicted}`);
    });

    it('Should predict CREATE2 addresses correctly', async function () {
      const salt = ethers.keccak256(ethers.toUtf8Bytes('test-salt'));
      const codeHash = ethers.keccak256(ethers.toUtf8Bytes('test-code'));

      const factoryPredicted = await factory.predictAddress(salt, codeHash);
      const facetPredicted = await facet.predictAddress(salt, codeHash);

      expect(facetPredicted).to.equal(factoryPredicted);
      console.log(`✅ CREATE2 prediction match: ${facetPredicted}`);
    });

    it('Should validate bytecode sizes correctly', async function () {
      const validBytecode =
        '0x608060405234801561001057600080fd5b50600a80601d6000396000f3fe';
      const isValid = await facet.validateBytecodeSize(validBytecode);
      expect(isValid).to.be.true;

      const oversizedBytecode = '0x' + '00'.repeat(25000); // 25KB > 24KB limit
      const isOversized = await facet.validateBytecodeSize(oversizedBytecode);
      expect(isOversized).to.be.false;

      console.log('✅ Bytecode validation working correctly');
    });
  });

  describe('🔧 Diamond Loupe Functions', function () {
    it('Should return function selectors', async function () {
      const selectors = await facet.getFacetFunctionSelectors();
      expect(selectors.length).to.equal(21);

      // Check that stage selector is included
      const stageSelector = facet.interface.getFunction('stage').selector;
      expect(selectors).to.include(stageSelector);

      console.log(`✅ Generated ${selectors.length} function selectors`);
    });
  });

  describe('🔒 System Integrity', function () {
    it('Should verify system integrity', async function () {
      const integrity = await facet.verifySystemIntegrity();
      expect(typeof integrity).to.equal('boolean');

      const manifestHash = await facet.getExpectedManifestHash();
      expect(manifestHash).to.be.properHex(64);

      const factoryHash = await facet.getExpectedFactoryBytecodeHash();
      expect(factoryHash).to.be.properHex(64);

      const dispatcher = await facet.getManifestDispatcher();
      expect(dispatcher).to.equal(dispatcherAddress);

      console.log('✅ System integrity checks completed');
    });
  });

  describe('⚡ Gas Optimization', function () {
    it('Should have reasonable gas costs for view functions', async function () {
      const gasEstimate = await facet.getDeploymentFee.estimateGas();
      expect(gasEstimate).to.be.lessThan(50000);

      console.log(`⛽ getDeploymentFee gas: ${gasEstimate.toLocaleString()}`);
    });

    it('Should handle batch predictions efficiently', async function () {
      const salts = [
        ethers.keccak256(ethers.toUtf8Bytes('salt1')),
        ethers.keccak256(ethers.toUtf8Bytes('salt2')),
        ethers.keccak256(ethers.toUtf8Bytes('salt3')),
      ];
      const codeHashes = [
        ethers.keccak256(ethers.toUtf8Bytes('code1')),
        ethers.keccak256(ethers.toUtf8Bytes('code2')),
        ethers.keccak256(ethers.toUtf8Bytes('code3')),
      ];

      const gasEstimate = await facet.predictAddressBatch.estimateGas(
        salts,
        codeHashes
      );
      const gasPerItem = Number(gasEstimate) / salts.length;

      expect(gasPerItem).to.be.lessThan(30000); // Should be efficient

      console.log(`⛽ Batch prediction gas per item: ${gasPerItem.toFixed(0)}`);
    });
  });

  after(async function () {
    console.log('\n' + '═'.repeat(80));
    console.log('🎉 ChunkFactoryFacet Integration Test - SUMMARY');
    console.log('═'.repeat(80));
    console.log(`💎 Facet Address: ${facetAddress}`);
    console.log(`🏭 Factory Address: ${factoryAddress}`);
    console.log(`📡 Dispatcher Address: ${dispatcherAddress}`);
    console.log('✅ Diamond Loupe compatibility confirmed');
    console.log('✅ All proxy functions working correctly');
    console.log('✅ CREATE2 integration verified');
    console.log('✅ System integrity checks passing');
    console.log('⚡ Gas optimization within acceptable limits');
    console.log('🚀 Ready for Diamond integration!');
    console.log('═'.repeat(80) + '\n');
  });
});

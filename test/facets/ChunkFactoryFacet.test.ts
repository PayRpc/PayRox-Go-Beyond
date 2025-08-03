import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

/**
 * @title ChunkFactoryFacet Enhanced Test Suite
 * @notice Comprehensive testing for Diamond facet integration with DeterministicChunkFactory
 * @dev Tests proxy functionality, gas optimization, and system integrity validation
 */

describe('ChunkFactoryFacet - Enhanced Test Suite', function () {
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // TEST INFRASTRUCTURE
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

  let deployer: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let unauthorized: HardhatEthersSigner;

  let factory: any;
  let facet: any;
  let manifestDispatcher: any;

  let factoryAddress: string;
  let facetAddress: string;
  let dispatcherAddress: string;

  const TEST_DEPLOYMENT_FEE = ethers.parseEther('0.001');
  const TEST_CHUNK_DATA = ethers.toUtf8Bytes(
    'Test chunk data for CREATE2 deployment'
  );
  const TEST_BYTECODE =
    '0x608060405234801561001057600080fd5b5060008055348015601c57600080fd5b50603e80602a6000396000f3fe6080604052600080fdfea264697066735822122001234567890123456789012345678901234567890123456789012345678901234564736f6c63430008140033';

  // Test performance tracking
  interface TestMetrics {
    gasUsed: bigint;
    executionTime: number;
    success: boolean;
    error?: string;
  }

  const metrics: { [key: string]: TestMetrics } = {};

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // SETUP AND TEARDOWN
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

  before(async function () {
    console.log('🏗️  Setting up ChunkFactoryFacet test environment...');

    [deployer, user1, user2, unauthorized] = await ethers.getSigners();

    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`👤 User1: ${user1.address}`);
    console.log(`👤 User2: ${user2.address}`);
    console.log(`👤 Unauthorized: ${unauthorized.address}`);
  });

  beforeEach(async function () {
    // Deploy MockManifestDispatcher for testing
    const MockManifestDispatcher = await ethers.getContractFactory(
      'MockManifestDispatcher'
    );
    manifestDispatcher = await MockManifestDispatcher.deploy();
    dispatcherAddress = await manifestDispatcher.getAddress();

    // Deploy DeterministicChunkFactory with all required constructor parameters
    const DeterministicChunkFactory = await ethers.getContractFactory(
      'DeterministicChunkFactory'
    );
    factory = await DeterministicChunkFactory.deploy(
      deployer.address, // _feeRecipient
      dispatcherAddress, // _manifestDispatcher
      ethers.keccak256(ethers.toUtf8Bytes('test-manifest')), // _manifestHash
      ethers.keccak256(ethers.toUtf8Bytes('test-factory-bytecode')), // _factoryBytecodeHash
      TEST_DEPLOYMENT_FEE, // _baseFeeWei
      true // _feesEnabled
    );
    factoryAddress = await factory.getAddress();

    // Deploy ChunkFactoryFacet
    const ChunkFactoryFacet = await ethers.getContractFactory(
      'ChunkFactoryFacet'
    );
    facet = await ChunkFactoryFacet.deploy(factoryAddress);
    facetAddress = await facet.getAddress();

    console.log(`🏭 Factory deployed at: ${factoryAddress}`);
    console.log(`💎 Facet deployed at: ${facetAddress}`);

    // Ensure deployer has proper roles
    const DEFAULT_ADMIN_ROLE = await factory.DEFAULT_ADMIN_ROLE();
    const FEE_ROLE = await factory.FEE_ROLE();
    const OPERATOR_ROLE = await factory.OPERATOR_ROLE();

    if (!(await factory.hasRole(DEFAULT_ADMIN_ROLE, deployer.address))) {
      await factory.grantRole(DEFAULT_ADMIN_ROLE, deployer.address);
    }
    if (!(await factory.hasRole(FEE_ROLE, deployer.address))) {
      await factory.grantRole(FEE_ROLE, deployer.address);
    }
    if (!(await factory.hasRole(OPERATOR_ROLE, deployer.address))) {
      await factory.grantRole(OPERATOR_ROLE, deployer.address);
    }
  });

  afterEach(async function () {
    // Log test metrics
    const testName = this.currentTest?.title || 'unknown';
    if (metrics[testName]) {
      const m = metrics[testName];
      console.log(
        `📊 [${testName}] Gas: ${m.gasUsed.toLocaleString()}, Time: ${
          m.executionTime
        }ms, Success: ${m.success}`
      );
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

  async function measurePerformance<T>(
    testName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let gasUsed = 0n;
    let success = false;
    let error: string | undefined;

    try {
      const result = await operation();
      success = true;

      // Try to extract gas usage if result is a transaction
      if (result && typeof result === 'object' && 'gasUsed' in result) {
        gasUsed = (result as any).gasUsed;
      }

      return result;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e;
    } finally {
      const executionTime = Date.now() - startTime;
      metrics[testName] = { gasUsed, executionTime, success, error };
    }
  }

  function generateRandomSalt(): string {
    return ethers.keccak256(
      ethers.toUtf8Bytes(`test-salt-${Math.random()}-${Date.now()}`)
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // DEPLOYMENT AND INITIALIZATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

  describe('🏗️  Deployment and Initialization', function () {
    it('Should deploy with correct factory address', async function () {
      await measurePerformance('deploy-validation', async () => {
        const storedFactoryAddress = await facet.getFactoryAddress();
        expect(storedFactoryAddress).to.equal(factoryAddress);
        return null;
      });
    });

    it('Should reject zero address factory', async function () {
      await measurePerformance('zero-address-rejection', async () => {
        const ChunkFactoryFacet = await ethers.getContractFactory(
          'ChunkFactoryFacet'
        );
        await expect(
          ChunkFactoryFacet.deploy(ethers.ZeroAddress)
        ).to.be.revertedWith('ChunkFactoryFacet: Zero address');
        return null;
      });
    });

    it('Should reject non-contract factory address', async function () {
      await measurePerformance('non-contract-rejection', async () => {
        const ChunkFactoryFacet = await ethers.getContractFactory(
          'ChunkFactoryFacet'
        );
        await expect(
          ChunkFactoryFacet.deploy(user1.address)
        ).to.be.revertedWith('ChunkFactoryFacet: Not a contract');
        return null;
      });
    });

    it('Should support ERC165 interface', async function () {
      await measurePerformance('erc165-support', async () => {
        const supportsERC165 = await facet.supportsInterface('0x01ffc9a7');
        expect(supportsERC165).to.be.true;
        return null;
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // CORE FUNCTIONALITY TESTS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

  describe('🔧 Core Functionality', function () {
    it('Should proxy getDeploymentFee correctly', async function () {
      await measurePerformance('get-deployment-fee', async () => {
        const factoryFee = await factory.getDeploymentFee();
        const facetFee = await facet.getDeploymentFee();
        expect(facetFee).to.equal(factoryFee);
        return null;
      });
    });

    it('Should proxy getDeploymentCount correctly', async function () {
      await measurePerformance('get-deployment-count', async () => {
        const factoryCount = await factory.getDeploymentCount();
        const facetCount = await facet.getDeploymentCount();
        expect(facetCount).to.equal(factoryCount);
        return null;
      });
    });

    it('Should proxy getUserTier correctly', async function () {
      await measurePerformance('get-user-tier', async () => {
        const factoryTier = await factory.getUserTier(user1.address);
        const facetTier = await facet.getUserTier(user1.address);
        expect(facetTier).to.equal(factoryTier);
        return null;
      });
    });

    it('Should proxy verifySystemIntegrity correctly', async function () {
      await measurePerformance('verify-system-integrity', async () => {
        const factoryIntegrity = await factory.verifySystemIntegrity();
        const facetIntegrity = await facet.verifySystemIntegrity();
        expect(facetIntegrity).to.equal(factoryIntegrity);
        return null;
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // PREDICTION FUNCTIONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

  describe('🔮 Prediction Functions', function () {
    it('Should predict chunk addresses correctly', async function () {
      await measurePerformance('predict-chunk-address', async () => {
        const [factoryPredicted, factoryHash] = await factory.predict(
          TEST_CHUNK_DATA
        );
        const [facetPredicted, facetHash] = await facet.predict(
          TEST_CHUNK_DATA
        );

        expect(facetPredicted).to.equal(factoryPredicted);
        expect(facetHash).to.equal(factoryHash);
        return null;
      });
    });

    it('Should predict CREATE2 addresses correctly', async function () {
      await measurePerformance('predict-create2-address', async () => {
        const salt = generateRandomSalt();
        const codeHash = ethers.keccak256(TEST_BYTECODE);

        const factoryPredicted = await factory.predictAddress(salt, codeHash);
        const facetPredicted = await facet.predictAddress(salt, codeHash);

        expect(facetPredicted).to.equal(factoryPredicted);
        return null;
      });
    });

    it('Should handle batch predictions correctly', async function () {
      await measurePerformance('predict-batch', async () => {
        const salts = [
          generateRandomSalt(),
          generateRandomSalt(),
          generateRandomSalt(),
        ];
        const codeHashes = [
          ethers.keccak256(TEST_BYTECODE),
          ethers.keccak256(ethers.toUtf8Bytes('code2')),
          ethers.keccak256(ethers.toUtf8Bytes('code3')),
        ];

        const factoryPredicted = await factory.predictAddressBatch(
          salts,
          codeHashes
        );
        const facetPredicted = await facet.predictAddressBatch(
          salts,
          codeHashes
        );

        expect(facetPredicted.length).to.equal(factoryPredicted.length);
        for (let i = 0; i < factoryPredicted.length; i++) {
          expect(facetPredicted[i]).to.equal(factoryPredicted[i]);
        }
        return null;
      });
    });

    it('Should validate bytecode sizes correctly', async function () {
      await measurePerformance('validate-bytecode-size', async () => {
        // Test valid bytecode
        const factoryValid = await factory.validateBytecodeSize(TEST_BYTECODE);
        const facetValid = await facet.validateBytecodeSize(TEST_BYTECODE);

        expect(facetValid).to.equal(factoryValid);
        expect(factoryValid).to.be.true; // Small bytecode should be valid

        // Test oversized bytecode (EIP-3860 init-code limit is 49,152 bytes)
        const oversizedBytecode = '0x' + '00'.repeat(50000); // 50KB - exceeds limit
        const factoryOversized = await factory.validateBytecodeSize(
          oversizedBytecode
        );
        const facetOversized = await facet.validateBytecodeSize(
          oversizedBytecode
        );

        expect(facetOversized).to.equal(factoryOversized);
        expect(factoryOversized).to.be.false; // Oversized should be invalid
        return null;
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // DEPLOYMENT TESTS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

  describe('🚀 Deployment Operations', function () {
    beforeEach(async function () {
      // Set deployment fee
      await factory.setTierFee(0, TEST_DEPLOYMENT_FEE);
    });

    it('Should stage chunks via facet', async function () {
      await measurePerformance('stage-chunk', async () => {
        // Try with very simple data first
        const SIMPLE_TEST_DATA = ethers.toUtf8Bytes('Hello');

        // Debug: Check factory state before staging
        console.log('🔍 Factory paused status:', await factory.paused());
        console.log('🔍 Fee enabled status:', await factory.feesEnabled());
        console.log('🔍 Base fee:', await factory.baseFeeWei());
        console.log('🔍 User1 tier:', await factory.getUserTier(user1.address));
        console.log(
          '🔍 Deployment fee for user1:',
          await factory.connect(user1).getDeploymentFee()
        );
        console.log('🔍 Idempotent mode:', await factory.idempotentMode());
        console.log('🔍 SIMPLE_TEST_DATA length:', SIMPLE_TEST_DATA.length);
        console.log('🔍 SIMPLE_TEST_DATA:', ethers.hexlify(SIMPLE_TEST_DATA));

        // Test if factory works directly first with simple data
        console.log('🔍 Testing factory directly with simple data...');
        try {
          const directTx = await factory
            .connect(user1)
            .stage(SIMPLE_TEST_DATA, {
              value: TEST_DEPLOYMENT_FEE,
              gasLimit: 1000000, // Explicit gas limit
            });
          const directReceipt = await directTx.wait();
          console.log('✅ Direct factory call succeeded');
        } catch (error) {
          console.log('❌ Direct factory call failed:', error.message);
          console.log('❌ Error details:', error);
        }

        const tx = await facet.connect(user1).stage(SIMPLE_TEST_DATA, {
          value: TEST_DEPLOYMENT_FEE,
          gasLimit: 1000000, // Explicit gas limit
        });
        const receipt = await tx.wait();

        expect(receipt.status).to.equal(1);

        // Verify chunk was created
        const [predicted, hash] = await facet.predict(TEST_CHUNK_DATA);
        const exists = await facet.exists(hash);
        expect(exists).to.be.true;

        return { gasUsed: receipt.gasUsed };
      });
    });

    it('Should deploy deterministic contracts via facet', async function () {
      await measurePerformance('deploy-deterministic', async () => {
        const salt = generateRandomSalt();

        const tx = await facet.connect(user1).deployDeterministic(
          salt,
          TEST_BYTECODE,
          '0x', // No constructor args
          { value: TEST_DEPLOYMENT_FEE }
        );
        const receipt = await tx.wait();

        expect(receipt.status).to.equal(1);

        // Verify deployment
        const codeHash = ethers.keccak256(TEST_BYTECODE);
        const predicted = await facet.predictAddress(salt, codeHash);
        const deployed = await facet.isDeployed(predicted);
        expect(deployed).to.be.true;

        return { gasUsed: receipt.gasUsed };
      });
    });

    it('Should handle batch chunk staging via facet', async function () {
      await measurePerformance('stage-batch', async () => {
        const blobs = [
          ethers.toUtf8Bytes('chunk1'),
          ethers.toUtf8Bytes('chunk2'),
          ethers.toUtf8Bytes('chunk3'),
        ];

        const tx = await facet.connect(user1).stageBatch(blobs, {
          value: TEST_DEPLOYMENT_FEE * BigInt(blobs.length),
        });
        const receipt = await tx.wait();

        expect(receipt.status).to.equal(1);

        // Verify all chunks were created
        for (const blob of blobs) {
          const [, hash] = await facet.predict(blob);
          const exists = await facet.exists(hash);
          expect(exists).to.be.true;
        }

        return { gasUsed: receipt.gasUsed };
      });
    });

    it('Should handle batch deterministic deployments via facet', async function () {
      await measurePerformance('deploy-batch', async () => {
        const salts = [generateRandomSalt(), generateRandomSalt()];
        const bytecodes = [TEST_BYTECODE, TEST_BYTECODE];
        const constructorArgs = ['0x', '0x'];

        const tx = await facet
          .connect(user1)
          .deployDeterministicBatch(salts, bytecodes, constructorArgs, {
            value: TEST_DEPLOYMENT_FEE * BigInt(salts.length),
          });
        const receipt = await tx.wait();

        expect(receipt.status).to.equal(1);

        // Verify deployments
        for (let i = 0; i < salts.length; i++) {
          const codeHash = ethers.keccak256(bytecodes[i]);
          const predicted = await facet.predictAddress(salts[i], codeHash);
          const deployed = await facet.isDeployed(predicted);
          expect(deployed).to.be.true;
        }

        return { gasUsed: receipt.gasUsed };
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // ACCESS CONTROL TESTS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

  describe('🔒 Access Control', function () {
    it('Should proxy admin functions correctly', async function () {
      await measurePerformance('admin-functions', async () => {
        // Only admin should be able to set tier fees
        await expect(
          facet.connect(unauthorized).setTierFee(1, TEST_DEPLOYMENT_FEE)
        ).to.be.revertedWithCustomError(
          factory,
          'AccessControlUnauthorizedAccount'
        );

        // Admin should succeed
        await facet.connect(deployer).setTierFee(1, TEST_DEPLOYMENT_FEE);

        return null;
      });
    });

    it('Should proxy pause/unpause correctly', async function () {
      await measurePerformance('pause-unpause', async () => {
        // Only admin should be able to pause
        await expect(
          facet.connect(unauthorized).pause()
        ).to.be.revertedWithCustomError(
          factory,
          'AccessControlUnauthorizedAccount'
        );

        // Admin should succeed
        await facet.connect(deployer).pause();

        // Should not be able to deploy when paused
        await expect(
          facet
            .connect(user1)
            .stage(TEST_CHUNK_DATA, { value: TEST_DEPLOYMENT_FEE })
        ).to.be.revertedWithCustomError(factory, 'EnforcedPause');

        // Unpause
        await facet.connect(deployer).unpause();

        return null;
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING TESTS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

  describe('❌ Error Handling', function () {
    it('Should handle insufficient fees correctly', async function () {
      await measurePerformance('insufficient-fees', async () => {
        await factory.setTierFee(0, TEST_DEPLOYMENT_FEE);

        await expect(
          facet.connect(user1).stage(TEST_CHUNK_DATA, {
            value: TEST_DEPLOYMENT_FEE / 2n,
          })
        ).to.be.reverted;

        return null;
      });
    });

    it('Should handle duplicate deployments correctly', async function () {
      await measurePerformance('duplicate-deployments', async () => {
        await factory.setTierFee(0, TEST_DEPLOYMENT_FEE);

        const salt = generateRandomSalt();

        // First deployment should succeed
        await facet
          .connect(user1)
          .deployDeterministic(salt, TEST_BYTECODE, '0x', {
            value: TEST_DEPLOYMENT_FEE,
          });

        // Second deployment with same salt should fail
        await expect(
          facet.connect(user1).deployDeterministic(salt, TEST_BYTECODE, '0x', {
            value: TEST_DEPLOYMENT_FEE,
          })
        ).to.be.reverted;

        return null;
      });
    });

    it('Should handle invalid bytecode correctly', async function () {
      await measurePerformance('invalid-bytecode', async () => {
        await factory.setTierFee(0, TEST_DEPLOYMENT_FEE);

        const salt = generateRandomSalt();
        // Use bytecode that will cause CREATE2 to fail - contains INVALID opcode (0xfe)
        const invalidBytecode = '0xfe'; // INVALID opcode will cause deployment to fail

        await expect(
          facet
            .connect(user1)
            .deployDeterministic(salt, invalidBytecode, '0x', {
              value: TEST_DEPLOYMENT_FEE,
            })
        ).to.be.reverted;

        return null;
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // INTEGRATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

  describe('🔗 Integration Tests', function () {
    it('Should maintain consistency between factory and facet', async function () {
      await measurePerformance('consistency-check', async () => {
        await factory.setTierFee(0, TEST_DEPLOYMENT_FEE);

        // Deploy via factory
        const salt1 = generateRandomSalt();
        await factory
          .connect(user1)
          .deployDeterministic(salt1, TEST_BYTECODE, '0x', {
            value: TEST_DEPLOYMENT_FEE,
          });

        // Deploy via facet
        const salt2 = generateRandomSalt();
        await facet
          .connect(user1)
          .deployDeterministic(salt2, TEST_BYTECODE, '0x', {
            value: TEST_DEPLOYMENT_FEE,
          });

        // Both should be reflected in counts
        const factoryCount = await factory.getDeploymentCount();
        const facetCount = await facet.getDeploymentCount();

        expect(facetCount).to.equal(factoryCount);
        expect(factoryCount).to.be.gte(2);

        return null;
      });
    });

    it('Should handle system integrity validation', async function () {
      await measurePerformance('system-integrity', async () => {
        const factoryIntegrity = await factory.verifySystemIntegrity();
        const facetIntegrity = await facet.verifySystemIntegrity();

        expect(facetIntegrity).to.equal(factoryIntegrity);

        // Test getter functions
        const expectedManifestHash = await facet.getExpectedManifestHash();
        const expectedFactoryHash =
          await facet.getExpectedFactoryBytecodeHash();
        const dispatcherAddr = await facet.getManifestDispatcher();

        expect(expectedManifestHash).to.be.properHex(64);
        expect(expectedFactoryHash).to.be.properHex(64);
        expect(dispatcherAddr).to.equal(dispatcherAddress);

        return null;
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // PERFORMANCE AND GAS OPTIMIZATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

  describe('⚡ Performance Tests', function () {
    it('Should have minimal gas overhead for proxy calls', async function () {
      await measurePerformance('proxy-overhead', async () => {
        await factory.setTierFee(0, TEST_DEPLOYMENT_FEE);

        // Measure direct factory call
        const factoryTx = await factory.connect(user1).stage(TEST_CHUNK_DATA, {
          value: TEST_DEPLOYMENT_FEE,
        });
        const factoryReceipt = await factoryTx.wait();

        // Measure facet proxy call
        const facetTx = await facet
          .connect(user2)
          .stage(ethers.toUtf8Bytes('Different data'), {
            value: TEST_DEPLOYMENT_FEE,
          });
        const facetReceipt = await facetTx.wait();

        // Calculate overhead
        const overhead = facetReceipt.gasUsed - factoryReceipt.gasUsed;
        const overheadPercentage =
          (Number(overhead) / Number(factoryReceipt.gasUsed)) * 100;

        console.log(
          `📊 Factory gas: ${factoryReceipt.gasUsed.toLocaleString()}`
        );
        console.log(`📊 Facet gas: ${facetReceipt.gasUsed.toLocaleString()}`);
        console.log(
          `📊 Overhead: ${overhead.toLocaleString()} (${overheadPercentage.toFixed(
            2
          )}%)`
        );

        // Overhead should be minimal (less than 10%)
        expect(overheadPercentage).to.be.lessThan(10);

        return null;
      });
    });

    it('Should scale efficiently with batch operations', async function () {
      await measurePerformance('batch-scaling', async () => {
        await factory.setTierFee(0, TEST_DEPLOYMENT_FEE);

        const batchSizes = [1, 3, 5];
        const gasPerItem: number[] = [];

        for (const size of batchSizes) {
          const blobs = Array(size)
            .fill(0)
            .map((_, i) => ethers.toUtf8Bytes(`batch-test-${i}-${Date.now()}`));

          const tx = await facet.connect(user1).stageBatch(blobs, {
            value: TEST_DEPLOYMENT_FEE * BigInt(size),
          });
          const receipt = await tx.wait();

          const gasPerUnit = Number(receipt.gasUsed) / size;
          gasPerItem.push(gasPerUnit);

          console.log(
            `📊 Batch size ${size}: ${receipt.gasUsed.toLocaleString()} gas (${gasPerUnit.toFixed(
              0
            )} per item)`
          );
        }

        // Gas per item should decrease with larger batches (efficiency gain)
        expect(gasPerItem[2]).to.be.lessThan(gasPerItem[0] * 1.1); // Allow 10% variance

        return null;
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

  after(async function () {
    console.log('\n' + '═'.repeat(100));
    console.log('🎉 ChunkFactoryFacet Enhanced Test Suite - SUMMARY');
    console.log('═'.repeat(100));

    let totalTests = 0;
    let passedTests = 0;
    let totalGas = 0n;
    let totalTime = 0;

    for (const [testName, metric] of Object.entries(metrics)) {
      totalTests++;
      if (metric.success) passedTests++;
      totalGas += metric.gasUsed;
      totalTime += metric.executionTime;

      const status = metric.success ? '✅' : '❌';
      console.log(
        `${status} ${testName}: ${metric.gasUsed.toLocaleString()} gas, ${
          metric.executionTime
        }ms`
      );
    }

    const successRate = (passedTests / totalTests) * 100;
    const averageGas = totalTests > 0 ? Number(totalGas) / totalTests : 0;
    const averageTime = totalTests > 0 ? totalTime / totalTests : 0;

    console.log('═'.repeat(100));
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests} (${successRate.toFixed(1)}%)`);
    console.log(`⛽ Total Gas: ${totalGas.toLocaleString()}`);
    console.log(`⚡ Average Gas per Test: ${averageGas.toLocaleString()}`);
    console.log(`⏱️  Total Time: ${totalTime}ms`);
    console.log(`🕐 Average Time per Test: ${averageTime.toFixed(1)}ms`);

    // Quality Assessment
    let grade = 'F';
    if (successRate >= 95) grade = 'A';
    else if (successRate >= 90) grade = 'B';
    else if (successRate >= 80) grade = 'C';
    else if (successRate >= 70) grade = 'D';

    console.log(`🏆 Quality Grade: ${grade}`);
    console.log('═'.repeat(100));

    if (successRate === 100) {
      console.log(
        '🎉 ALL TESTS PASSED! ChunkFactoryFacet is production-ready! 🎉'
      );
    } else if (successRate >= 95) {
      console.log('👍 Excellent test coverage with minor issues to address.');
    } else {
      console.log(
        '⚠️  Some tests failed - review and fix before production deployment.'
      );
    }

    console.log('═'.repeat(100) + '\n');
  });
});

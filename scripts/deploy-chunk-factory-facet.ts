import fs from 'fs/promises';
import { ethers } from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import path from 'path';

/**
 * @title Deploy ChunkFactory Diamond Facet
 * @notice Deploys and configures the ChunkFactoryFacet for ManifestDispatcher integration
 * @dev Provides hot-swappable factory logic via Diamond pattern
 */

export interface DeploymentConfig {
  factoryAddress?: string;
  verifyContracts: boolean;
  saveDeployment: boolean;
  networkName: string;
  gasLimit?: number;
}

export interface DeploymentResult {
  facetAddress: string;
  factoryAddress: string;
  transactionHash: string;
  gasUsed: bigint;
  deploymentCost: bigint;
  blockNumber: number;
  timestamp: number;
  selectors: string[];
  success: boolean;
  error?: string;
}

/**
 * Simple logging utility
 */
class Logger {
  constructor(private prefix: string) {}

  info(message: string) {
    console.log(`[${this.prefix}] ${message}`);
  }

  warn(message: string) {
    console.warn(`[${this.prefix}] ⚠️  ${message}`);
  }

  error(message: string) {
    console.error(`[${this.prefix}] ❌ ${message}`);
  }
}

/**
 * Deploy the ChunkFactoryFacet with enhanced monitoring
 */
export async function deployChunkFactoryFacet(
  hre: HardhatRuntimeEnvironment,
  config: DeploymentConfig
): Promise<DeploymentResult> {
  const logger = new Logger('ChunkFactoryFacet');
  logger.info('🚀 Starting ChunkFactoryFacet deployment...');

  try {
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    logger.info(`📍 Network: ${network.name} (Chain ID: ${network.chainId})`);
    logger.info(`👤 Deployer: ${deployer.address}`);
    logger.info(
      `💰 Balance: ${ethers.formatEther(
        await deployer.provider.getBalance(deployer.address)
      )} ETH`
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // PHASE 1: VALIDATE FACTORY ADDRESS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    let factoryAddress = config.factoryAddress;

    if (!factoryAddress) {
      logger.info('🔍 Searching for existing DeterministicChunkFactory...');

      try {
        // Try multiple possible factory deployment files
        const possiblePaths = [
          `./deployments/${config.networkName}/DeterministicChunkFactory.json`,
          `./deployments/${config.networkName}/factory.json`
        ];
        
        let factoryDeployment;
        for (const deploymentPath of possiblePaths) {
          try {
            const deploymentData = await fs.readFile(deploymentPath, 'utf8');
            factoryDeployment = JSON.parse(deploymentData);
            factoryAddress = factoryDeployment.address;
            logger.info(`✅ Found factory at: ${factoryAddress} (from ${deploymentPath})`);
            break;
          } catch {
            // Try next path
            continue;
          }
        }
        
        if (!factoryAddress) {
          throw new Error('Factory deployment file not found');
        }
      } catch {
        throw new Error(
          'DeterministicChunkFactory not found. Deploy it first or provide address.'
        );
      }
    }

    // Validate factory contract
    const factoryCode = await ethers.provider.getCode(factoryAddress);
    if (factoryCode === '0x') {
      throw new Error(
        `No contract found at factory address: ${factoryAddress}`
      );
    }

    const factory = await ethers.getContractAt(
      'DeterministicChunkFactory',
      factoryAddress
    );

    // Verify factory functionality
    try {
      const deploymentCount = await factory.getDeploymentCount();
      logger.info(`📊 Factory deployment count: ${deploymentCount}`);

      const systemIntegrity = await factory.verifySystemIntegrity();
      logger.info(
        `🔒 System integrity: ${systemIntegrity ? '✅ VERIFIED' : '❌ FAILED'}`
      );

      if (!systemIntegrity) {
        logger.warn(
          '⚠️  System integrity check failed - proceeding with caution'
        );
      }
    } catch (error) {
      logger.warn(`⚠️  Factory validation failed: ${error}`);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // PHASE 2: DEPLOY CHUNK FACTORY FACET
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    logger.info('🏗️  Deploying ChunkFactoryFacet...');

    const ChunkFactoryFacet = await ethers.getContractFactory(
      'ChunkFactoryFacet'
    );

    const deploymentTx = await ChunkFactoryFacet.deploy(factoryAddress, {
      gasLimit: config.gasLimit,
    });

    const receipt = await deploymentTx.deploymentTransaction()?.wait();
    if (!receipt) {
      throw new Error('Deployment transaction failed');
    }

    const facetAddress = await deploymentTx.getAddress();

    logger.info(`✅ ChunkFactoryFacet deployed at: ${facetAddress}`);
    logger.info(`🧾 Transaction hash: ${receipt.hash}`);
    logger.info(`⛽ Gas used: ${receipt.gasUsed.toLocaleString()}`);
    logger.info(
      `💰 Deployment cost: ${ethers.formatEther(
        receipt.gasUsed * receipt.gasPrice
      )} ETH`
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // PHASE 3: VALIDATE FACET FUNCTIONALITY
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    logger.info('🔍 Validating facet functionality...');

    const facet = await ethers.getContractAt('ChunkFactoryFacet', facetAddress);

    // Test basic functions
    try {
      const facetFactoryAddress = await facet.getFactoryAddress();
      if (facetFactoryAddress.toLowerCase() !== factoryAddress.toLowerCase()) {
        throw new Error(
          `Factory address mismatch: ${facetFactoryAddress} !== ${factoryAddress}`
        );
      }
      logger.info('✅ Factory address validation passed');

      const deploymentFee = await facet.getDeploymentFee();
      logger.info(
        `💰 Current deployment fee: ${ethers.formatEther(deploymentFee)} ETH`
      );

      const deploymentCount = await facet.getDeploymentCount();
      logger.info(`📊 Deployment count via facet: ${deploymentCount}`);

      // Test interface support
      const supportsERC165 = await facet.supportsInterface('0x01ffc9a7'); // ERC165
      logger.info(`🔌 ERC165 support: ${supportsERC165 ? '✅' : '❌'}`);
    } catch (error) {
      logger.error(`❌ Facet validation failed: ${error}`);
      throw error;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // PHASE 4: GENERATE FUNCTION SELECTORS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    logger.info('🔧 Generating function selectors for Diamond integration...');

    const selectors: string[] = [];
    const iface = facet.interface;

    // Get all function selectors
    iface.forEachFunction(fragment => {
      if (fragment.type === 'function') {
        selectors.push(fragment.selector);
      }
    });

    logger.info(`📋 Generated ${selectors.length} function selectors`);
    logger.info(`🔧 Key selectors: ${selectors.slice(0, 5).join(', ')}...`);

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // PHASE 5: SAVE DEPLOYMENT ARTIFACTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    if (config.saveDeployment) {
      logger.info('💾 Saving deployment artifacts...');

      const deploymentArtifact = {
        contractName: 'ChunkFactoryFacet',
        address: facetAddress,
        factoryAddress: factoryAddress,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        deploymentCost: (receipt.gasUsed * receipt.gasPrice).toString(),
        timestamp: Math.floor(Date.now() / 1000),
        network: {
          name: config.networkName,
          chainId: network.chainId.toString(),
        },
        deployer: deployer.address,
        selectors: selectors,
        abi: JSON.parse(iface.formatJson()),
        metadata: {
          compiler: '0.8.20',
          optimization: true,
          runs: 200,
        },
      };

      // Ensure directory exists
      const deploymentDir = `./deployments/${config.networkName}`;
      await fs.mkdir(deploymentDir, { recursive: true });

      await fs.writeFile(
        path.join(deploymentDir, 'ChunkFactoryFacet.json'),
        JSON.stringify(deploymentArtifact, null, 2)
      );

      // Save Diamond cut data
      const diamondCutData = {
        facetAddress: facetAddress,
        action: 0, // Add
        functionSelectors: selectors,
      };

      await fs.writeFile(
        path.join(deploymentDir, 'ChunkFactoryFacet-DiamondCut.json'),
        JSON.stringify(diamondCutData, null, 2)
      );

      logger.info('✅ Deployment artifacts saved');
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // PHASE 6: CONTRACT VERIFICATION
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    if (config.verifyContracts) {
      logger.info('🔍 Verifying contract on Etherscan...');

      try {
        await hre.run('verify:verify', {
          address: facetAddress,
          constructorArguments: [factoryAddress],
          contract: 'contracts/facets/ChunkFactoryFacet.sol:ChunkFactoryFacet',
        });
        logger.info('✅ Contract verified on Etherscan');
      } catch (error) {
        logger.warn(`⚠️  Verification failed: ${error}`);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
    // PHASE 7: DEPLOYMENT SUMMARY
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

    const deploymentResult: DeploymentResult = {
      facetAddress: facetAddress,
      factoryAddress: factoryAddress,
      transactionHash: receipt.hash,
      gasUsed: receipt.gasUsed,
      deploymentCost: receipt.gasUsed * receipt.gasPrice,
      blockNumber: receipt.blockNumber,
      timestamp: Math.floor(Date.now() / 1000),
      selectors: selectors,
      success: true,
    };

    logger.info('🎉 ChunkFactoryFacet deployment completed successfully!');
    logger.info(`📍 Facet Address: ${facetAddress}`);
    logger.info(`🏭 Factory Address: ${factoryAddress}`);
    logger.info(
      `💰 Total Cost: ${ethers.formatEther(
        deploymentResult.deploymentCost
      )} ETH`
    );
    logger.info(`🔧 Function Selectors: ${selectors.length}`);

    return deploymentResult;
  } catch (error) {
    logger.error(`❌ Deployment failed: ${error}`);

    return {
      facetAddress: '',
      factoryAddress: config.factoryAddress || '',
      transactionHash: '',
      gasUsed: 0n,
      deploymentCost: 0n,
      blockNumber: 0,
      timestamp: Math.floor(Date.now() / 1000),
      selectors: [],
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test the deployed facet with sample operations
 */
export async function testChunkFactoryFacet(
  hre: HardhatRuntimeEnvironment,
  facetAddress: string
): Promise<boolean> {
  const logger = new Logger('ChunkFactoryFacetTest');
  logger.info('🧪 Testing ChunkFactoryFacet functionality...');

  try {
    const facet = await ethers.getContractAt('ChunkFactoryFacet', facetAddress);

    // Test 1: Basic view functions
    logger.info('📊 Testing view functions...');
    const factoryAddress = await facet.getFactoryAddress();
    const deploymentFee = await facet.getDeploymentFee();
    const deploymentCount = await facet.getDeploymentCount();

    logger.info(`  Factory: ${factoryAddress}`);
    logger.info(`  Fee: ${ethers.formatEther(deploymentFee)} ETH`);
    logger.info(`  Count: ${deploymentCount}`);

    // Test 2: Address prediction
    logger.info('🔮 Testing address prediction...');
    const testData = ethers.toUtf8Bytes('Test chunk data for facet');
    const [predictedAddress, contentHash] = await facet.predict(testData);

    logger.info(`  Predicted: ${predictedAddress}`);
    logger.info(`  Hash: ${contentHash}`);

    // Test 3: CREATE2 prediction
    logger.info('🎯 Testing CREATE2 prediction...');
    const testSalt = ethers.keccak256(ethers.toUtf8Bytes('test-salt'));
    const testCodeHash = ethers.keccak256(ethers.toUtf8Bytes('test-code'));
    const predictedCreate2 = await facet.predictAddress(testSalt, testCodeHash);

    logger.info(`  CREATE2 Predicted: ${predictedCreate2}`);

    // Test 4: Batch prediction
    logger.info('📦 Testing batch prediction...');
    const salts = [
      testSalt,
      ethers.keccak256(ethers.toUtf8Bytes('test-salt-2')),
    ];
    const codeHashes = [
      testCodeHash,
      ethers.keccak256(ethers.toUtf8Bytes('test-code-2')),
    ];
    const batchPredicted = await facet.predictAddressBatch(salts, codeHashes);

    logger.info(`  Batch predicted: ${batchPredicted.length} addresses`);

    // Test 5: Validation functions
    logger.info('✅ Testing validation functions...');
    const smallBytecode =
      '0x608060405234801561001057600080fd5b50600a80601d6000396000f3fe';
    const isValidSize = await facet.validateBytecodeSize(smallBytecode);

    logger.info(`  Bytecode valid: ${isValidSize}`);

    logger.info('🎉 All facet tests passed!');
    return true;
  } catch (error) {
    logger.error(`❌ Facet test failed: ${error}`);
    return false;
  }
}

/**
 * Main deployment function for direct execution
 */
export async function main(hre: HardhatRuntimeEnvironment, params?: any) {
  console.log('🚀 Starting ChunkFactoryFacet deployment pipeline...');

  const config: DeploymentConfig = {
    factoryAddress: params?.factoryAddress,
    verifyContracts: params?.verify !== false,
    saveDeployment: params?.save !== false,
    networkName: hre.network.name,
    gasLimit: params?.gasLimit,
  };

  try {
    // Deploy the facet
    const result = await deployChunkFactoryFacet(hre, config);

    if (!result.success) {
      console.error('❌ Deployment failed:', result.error);
      process.exit(1);
    }

    // Test the deployment
    const testSuccess = await testChunkFactoryFacet(hre, result.facetAddress);

    if (!testSuccess) {
      console.warn('⚠️  Tests failed but deployment succeeded');
    }

    console.log('✅ ChunkFactoryFacet deployment and testing completed!');
    console.log(`📍 Facet Address: ${result.facetAddress}`);
    console.log(`🏭 Factory Address: ${result.factoryAddress}`);

    return result;
  } catch (error) {
    console.error('❌ Pipeline failed:', error);
    throw error;
  }
}

// Enable direct execution
if (require.main === module) {
  const hre = require('hardhat');
  main(hre)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

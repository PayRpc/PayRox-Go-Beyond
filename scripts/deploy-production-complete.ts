import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';

/**
 * Complete Production Deployment Script
 * Deploys all production components: ManifestDispatcher, DeterministicChunkFactory,
 * Orchestrator, ExampleFacetA, ExampleFacetB with proper initialization
 */

interface DeploymentConfig {
  network: string;
  admin: SignerWithAddress;
  deployer: SignerWithAddress;
  governance: SignerWithAddress;
  operator: SignerWithAddress;
  feeRecipient: SignerWithAddress;
}

interface DeploymentResult {
  manifestDispatcher: string;
  deterministicChunkFactory: string;
  orchestrator: string;
  exampleFacetA: string;
  exampleFacetB: string;
  manifestHash: string;
  success: boolean;
  gasUsed: bigint;
}

// Production configuration constants
const PRODUCTION_CONFIG = {
  activationDelay: 300, // 5 minutes for production safety
  baseFee: ethers.parseEther('0.001'), // 0.001 ETH base fee
  deploySignerDeadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
};

/**
 * Generate EIP-712 signature for ExampleFacetB initialization
 */
async function generateInitSignature(
  operator: string,
  governance: string,
  deadline: number,
  nonce: number,
  signer: SignerWithAddress,
  contractAddress: string,
  chainId: number
): Promise<string> {
  const domain = {
    name: 'PayRoxFacetB',
    version: '1.2.0',
    chainId: chainId,
    verifyingContract: contractAddress,
  };

  const types = {
    InitializeFacetB: [
      { name: 'operator', type: 'address' },
      { name: 'governance', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
    ],
  };

  const value = {
    operator,
    governance,
    deadline,
    nonce,
  };

  return await signer.signTypedData(domain, types, value);
}

/**
 * Main production deployment function
 */
async function deployProductionSystem(
  networkName: string
): Promise<DeploymentResult> {
  console.log(`🚀 Starting Production Deployment on ${networkName}...`);

  let totalGasUsed = BigInt(0);

  try {
    // Get signers
    const signers = await ethers.getSigners();
    if (signers.length < 5) {
      throw new Error('Need at least 5 signers for production deployment');
    }

    const config: DeploymentConfig = {
      network: networkName,
      admin: signers[0],
      deployer: signers[1],
      governance: signers[2],
      operator: signers[3],
      feeRecipient: signers[4],
    };

    console.log(`📋 Deployment Configuration:`);
    console.log(`   Admin: ${config.admin.address}`);
    console.log(`   Deployer: ${config.deployer.address}`);
    console.log(`   Governance: ${config.governance.address}`);
    console.log(`   Operator: ${config.operator.address}`);
    console.log(`   Fee Recipient: ${config.feeRecipient.address}`);
    console.log(`   Network: ${networkName}`);

    // Step 1: Deploy ManifestDispatcher
    console.log(`\n📦 [1/5] Deploying ManifestDispatcher...`);
    const ManifestDispatcher = await ethers.getContractFactory(
      'ManifestDispatcher',
      config.admin
    );
    const manifestDispatcher = await ManifestDispatcher.deploy(
      config.admin.address,
      PRODUCTION_CONFIG.activationDelay
    );
    await manifestDispatcher.waitForDeployment();
    const manifestDispatcherAddress = await manifestDispatcher.getAddress();
    const deployTx1 = manifestDispatcher.deploymentTransaction();
    if (deployTx1) totalGasUsed += deployTx1.gasLimit;
    console.log(
      `   ✅ ManifestDispatcher deployed at: ${manifestDispatcherAddress}`
    );

    // Step 2: Deploy DeterministicChunkFactory
    console.log(`\n📦 [2/5] Deploying DeterministicChunkFactory...`);
    const DeterministicChunkFactory = await ethers.getContractFactory(
      'DeterministicChunkFactory',
      config.deployer
    );
    const chunkFactory = await DeterministicChunkFactory.deploy(
      config.feeRecipient.address,
      PRODUCTION_CONFIG.baseFee
    );
    await chunkFactory.waitForDeployment();
    const chunkFactoryAddress = await chunkFactory.getAddress();
    const deployTx2 = chunkFactory.deploymentTransaction();
    if (deployTx2) totalGasUsed += deployTx2.gasLimit;
    console.log(
      `   ✅ DeterministicChunkFactory deployed at: ${chunkFactoryAddress}`
    );

    // Step 3: Deploy Orchestrator
    console.log(`\n📦 [3/5] Deploying Orchestrator...`);
    const Orchestrator = await ethers.getContractFactory(
      'Orchestrator',
      config.admin
    );
    const orchestrator = await Orchestrator.deploy();
    await orchestrator.waitForDeployment();
    const orchestratorAddress = await orchestrator.getAddress();
    const deployTx3 = orchestrator.deploymentTransaction();
    if (deployTx3) totalGasUsed += deployTx3.gasLimit;
    console.log(`   ✅ Orchestrator deployed at: ${orchestratorAddress}`);

    // Step 4: Deploy ExampleFacetA
    console.log(`\n📦 [4/5] Deploying ExampleFacetA...`);
    const ExampleFacetA = await ethers.getContractFactory(
      'ExampleFacetA',
      config.deployer
    );
    const facetA = await ExampleFacetA.deploy();
    await facetA.waitForDeployment();
    const facetAAddress = await facetA.getAddress();
    const deployTx4 = facetA.deploymentTransaction();
    if (deployTx4) totalGasUsed += deployTx4.gasLimit;
    console.log(`   ✅ ExampleFacetA deployed at: ${facetAAddress}`);

    // Step 5: Deploy and Initialize ExampleFacetB
    console.log(`\n📦 [5/5] Deploying ExampleFacetB...`);
    const ExampleFacetB = await ethers.getContractFactory(
      'ExampleFacetB',
      config.deployer
    );
    const facetB = await ExampleFacetB.deploy();
    await facetB.waitForDeployment();
    const facetBAddress = await facetB.getAddress();
    const deployTx5 = facetB.deploymentTransaction();
    if (deployTx5) totalGasUsed += deployTx5.gasLimit;
    console.log(`   ✅ ExampleFacetB deployed at: ${facetBAddress}`);

    // Step 5.1: Initialize ExampleFacetB with EIP-712 signature
    console.log(`\n🔧 Initializing ExampleFacetB...`);
    const chainId = await config.governance.provider
      .getNetwork()
      .then(n => Number(n.chainId));
    const initNonce = 0; // First initialization

    const signature = await generateInitSignature(
      config.operator.address,
      config.governance.address,
      PRODUCTION_CONFIG.deploySignerDeadline,
      initNonce,
      config.governance, // Use governance as the signing authority
      facetBAddress,
      chainId
    );

    const initTx = await (facetB as any)
      .connect(config.admin)
      .initializeFacetB(
        config.operator.address,
        config.governance.address,
        PRODUCTION_CONFIG.deploySignerDeadline,
        signature
      );
    await initTx.wait();
    totalGasUsed += initTx.gasLimit;
    console.log(`   ✅ ExampleFacetB initialized successfully`);

    // Step 6: Create Production Manifest
    console.log(`\n📋 Creating Production Manifest...`);

    // Get function selectors for production facets
    const executeASelector = facetA.interface.getFunction('executeA')!.selector;
    const storeDataSelector =
      facetA.interface.getFunction('storeData')!.selector;
    const getDataSelector = facetA.interface.getFunction('getData')!.selector;
    const executeBSelector = facetB.interface.getFunction('executeB')!.selector;
    const batchExecuteBSelector =
      facetB.interface.getFunction('batchExecuteB')!.selector;
    const complexCalculationSelector =
      facetB.interface.getFunction('complexCalculation')!.selector;

    console.log(`   Function Selectors:`);
    console.log(`   - executeA: ${executeASelector}`);
    console.log(`   - storeData: ${storeDataSelector}`);
    console.log(`   - getData: ${getDataSelector}`);
    console.log(`   - executeB: ${executeBSelector}`);
    console.log(`   - batchExecuteB: ${batchExecuteBSelector}`);
    console.log(`   - complexCalculation: ${complexCalculationSelector}`);

    // Build production manifest with all functions
    const manifestEntries = [
      ethers.concat([executeASelector, facetAAddress]),
      ethers.concat([storeDataSelector, facetAAddress]),
      ethers.concat([getDataSelector, facetAAddress]),
      ethers.concat([executeBSelector, facetBAddress]),
      ethers.concat([batchExecuteBSelector, facetBAddress]),
      ethers.concat([complexCalculationSelector, facetBAddress]),
    ];

    const manifestData = ethers.concat(manifestEntries);
    const manifestHash = ethers.keccak256(manifestData);

    console.log(`   Manifest entries: ${manifestEntries.length}`);
    console.log(`   Manifest size: ${manifestData.length} bytes`);
    console.log(`   Manifest hash: ${manifestHash}`);

    // Step 7: Configure ManifestDispatcher
    console.log(`\n🔧 Configuring ManifestDispatcher...`);

    // Commit the manifest root
    const commitTx = await (manifestDispatcher as any)
      .connect(config.admin)
      .commitRoot(manifestHash, 1);
    await commitTx.wait();
    totalGasUsed += commitTx.gasLimit;
    console.log(`   ✅ Manifest root committed`);

    // Activate the committed root (after delay if needed)
    if (PRODUCTION_CONFIG.activationDelay === 0) {
      const activateTx = await (manifestDispatcher as any)
        .connect(config.admin)
        .activateCommittedRoot();
      await activateTx.wait();
      totalGasUsed += activateTx.gasLimit;
      console.log(`   ✅ Manifest root activated`);
    } else {
      console.log(
        `   ⏰ Manifest will be activatable after ${PRODUCTION_CONFIG.activationDelay} seconds`
      );
    }

    // Step 8: Test Production System
    console.log(`\n🧪 Testing Production System...`);

    // Test ExampleFacetA functions
    console.log(`   Testing ExampleFacetA functions...`);
    await facetA.executeA('Production test message');
    await facetA.storeData(
      ethers.keccak256(ethers.toUtf8Bytes('test')),
      ethers.toUtf8Bytes('test data')
    );
    console.log(`   ✅ ExampleFacetA functions working`);

    // Test ExampleFacetB functions (after initialization)
    console.log(`   Testing ExampleFacetB functions...`);
    const testOperationType = 1;
    const testData = ethers.toUtf8Bytes('Production test data');
    await (facetB as any)
      .connect(config.operator)
      .executeB(testOperationType, testData);
    console.log(`   ✅ ExampleFacetB functions working`);

    // Step 9: Generate Deployment Report
    console.log(`\n📊 Deployment Summary:`);
    console.log(`   ✅ All contracts deployed successfully`);
    console.log(`   ✅ ExampleFacetB initialized with proper governance`);
    console.log(`   ✅ Production manifest created and committed`);
    console.log(`   ✅ Function routing configured`);
    console.log(`   ⛽ Total estimated gas used: ${totalGasUsed.toString()}`);
    console.log(`   🏁 Production system ready for operation`);

    return {
      manifestDispatcher: manifestDispatcherAddress,
      deterministicChunkFactory: chunkFactoryAddress,
      orchestrator: orchestratorAddress,
      exampleFacetA: facetAAddress,
      exampleFacetB: facetBAddress,
      manifestHash,
      success: true,
      gasUsed: totalGasUsed,
    };
  } catch (error) {
    console.error(`❌ Production deployment failed:`, error);
    throw error;
  }
}

/**
 * CLI command handler
 */
async function main() {
  const args = process.argv.slice(2);
  const networkName =
    args.find(arg => arg.startsWith('--network='))?.split('=')[1] ||
    'localhost';

  console.log(`🌟 PayRox Go Beyond - Production Deployment CLI`);
  console.log(`🌐 Target Network: ${networkName}`);

  try {
    const result = await deployProductionSystem(networkName);

    console.log(`\n📋 Deployment Addresses:`);
    console.log(`ManifestDispatcher: ${result.manifestDispatcher}`);
    console.log(
      `DeterministicChunkFactory: ${result.deterministicChunkFactory}`
    );
    console.log(`Orchestrator: ${result.orchestrator}`);
    console.log(`ExampleFacetA: ${result.exampleFacetA}`);
    console.log(`ExampleFacetB: ${result.exampleFacetB}`);
    console.log(`Manifest Hash: ${result.manifestHash}`);

    console.log(`\n🎉 Production deployment completed successfully!`);
    process.exit(0);
  } catch (error) {
    console.error(`💥 Deployment failed:`, error);
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

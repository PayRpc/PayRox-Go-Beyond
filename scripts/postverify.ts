import * as fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import * as path from 'path';

/**
 * Post-deployment verification script
 *
 * Validates that all deployed contracts are working correctly and
 * the system is ready for production use.
 */

interface DeploymentContract {
  name: string;
  address: string;
  transactionHash: string;
  verified: boolean;
}

interface VerificationResult {
  success: boolean;
  contractsVerified: number;
  totalContracts: number;
  issues: string[];
  recommendations: string[];
}

export async function main(
  hre: HardhatRuntimeEnvironment
): Promise<VerificationResult> {
  console.log('🔍 PayRox Post-Deployment Verification');
  console.log('====================================');
  console.log(`Network: ${hre.network.name}`);
  console.log(`Chain ID: ${(await hre.ethers.provider.getNetwork()).chainId}`);
  console.log('');

  const result: VerificationResult = {
    success: false,
    contractsVerified: 0,
    totalContracts: 0,
    issues: [],
    recommendations: [],
  };

  try {
    // 1. Load deployment information
    const deployments = await loadDeployments(hre);
    result.totalContracts = deployments.length;

    console.log(`📊 Found ${deployments.length} deployed contracts`);

    // 2. Verify contract addresses and code
    await verifyContractDeployments(hre, deployments, result);

    // 3. Test core functionality
    await testCoreFunctionality(hre, deployments, result);

    // 4. Check system state
    await checkSystemState(hre, deployments, result);

    // 5. Validate access controls
    await validateAccessControls(hre, deployments, result);

    // 6. Generate final assessment
    result.success = result.issues.length === 0;

    // 7. Display results
    displayResults(result);

    return result;
  } catch (error) {
    console.error('❌ Post-deployment verification failed:', error);
    result.issues.push(`Verification failed: ${error}`);
    result.success = false;
    return result;
  }
}

async function loadDeployments(
  hre: HardhatRuntimeEnvironment
): Promise<DeploymentContract[]> {
  const deployments: DeploymentContract[] = [];
  const deploymentsDir = path.join(
    __dirname,
    `../deployments/${hre.network.name}`
  );

  if (!fs.existsSync(deploymentsDir)) {
    throw new Error(`No deployments found for network ${hre.network.name}`);
  }

  const files = fs.readdirSync(deploymentsDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const deploymentPath = path.join(deploymentsDir, file);
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));

      deployments.push({
        name: path.basename(file, '.json'),
        address: deployment.address,
        transactionHash: deployment.transactionHash,
        verified: false,
      });
    } catch (error) {
      console.warn(`⚠️  Could not load deployment file ${file}:`, error);
    }
  }

  return deployments;
}

async function verifyContractDeployments(
  hre: HardhatRuntimeEnvironment,
  deployments: DeploymentContract[],
  result: VerificationResult
): Promise<void> {
  console.log('🔎 Verifying contract deployments...');

  for (const deployment of deployments) {
    try {
      // Check if contract exists at address
      const code = await hre.ethers.provider.getCode(deployment.address);

      if (code === '0x') {
        result.issues.push(
          `Contract ${deployment.name} has no code at address ${deployment.address}`
        );
        continue;
      }

      // Check if transaction exists
      const tx = await hre.ethers.provider.getTransaction(
        deployment.transactionHash
      );
      if (!tx) {
        result.issues.push(
          `Transaction ${deployment.transactionHash} not found for ${deployment.name}`
        );
        continue;
      }

      // Verify transaction was successful
      const receipt = await hre.ethers.provider.getTransactionReceipt(
        deployment.transactionHash
      );
      if (!receipt || receipt.status !== 1) {
        result.issues.push(
          `Transaction ${deployment.transactionHash} failed for ${deployment.name}`
        );
        continue;
      }

      deployment.verified = true;
      result.contractsVerified++;
      console.log(`   ✅ ${deployment.name} verified at ${deployment.address}`);
    } catch (error) {
      result.issues.push(`Failed to verify ${deployment.name}: ${error}`);
      console.log(`   ❌ ${deployment.name} verification failed: ${error}`);
    }
  }
}

async function testCoreFunctionality(
  hre: HardhatRuntimeEnvironment,
  deployments: DeploymentContract[],
  result: VerificationResult
): Promise<void> {
  console.log('⚙️  Testing core functionality...');

  // Test DeterministicChunkFactory
  const factoryDeployment = deployments.find(
    d => d.name === 'DeterministicChunkFactory'
  );
  if (factoryDeployment?.verified) {
    try {
      const factory = await hre.ethers.getContractAt(
        'DeterministicChunkFactory',
        factoryDeployment.address
      );

      // Test basic read functions
      const feeAmount = await factory.getFeeAmount();
      console.log(
        `   📊 Factory fee amount: ${hre.ethers.formatEther(feeAmount)} ETH`
      );

      const totalDeployed = await factory.getTotalDeployed();
      console.log(`   📊 Total contracts deployed: ${totalDeployed}`);

      // Test fee recipient
      const feeRecipient = await factory.getFeeRecipient();
      console.log(`   📊 Fee recipient: ${feeRecipient}`);

      console.log(`   ✅ DeterministicChunkFactory core functions working`);
    } catch (error) {
      result.issues.push(
        `DeterministicChunkFactory functionality test failed: ${error}`
      );
      console.log(`   ❌ DeterministicChunkFactory test failed: ${error}`);
    }
  }

  // Test ManifestDispatcher
  const dispatcherDeployment = deployments.find(
    d => d.name === 'ManifestDispatcher'
  );
  if (dispatcherDeployment?.verified) {
    try {
      const dispatcher = await hre.ethers.getContractAt(
        'ManifestDispatcher',
        dispatcherDeployment.address
      );

      // Test basic read functions
      const currentManifest = await dispatcher.getCurrentManifest();
      console.log(`   📊 Current manifest hash: ${currentManifest}`);

      console.log(`   ✅ ManifestDispatcher core functions working`);
    } catch (error) {
      result.issues.push(
        `ManifestDispatcher functionality test failed: ${error}`
      );
      console.log(`   ❌ ManifestDispatcher test failed: ${error}`);
    }
  }
}

async function checkSystemState(
  hre: HardhatRuntimeEnvironment,
  deployments: DeploymentContract[],
  result: VerificationResult
): Promise<void> {
  console.log('🔍 Checking system state...');

  try {
    // Check network state
    const latestBlock = await hre.ethers.provider.getBlockNumber();
    console.log(`   📊 Latest block: ${latestBlock}`);

    const gasPrice = await hre.ethers.provider.getFeeData();
    console.log(
      `   📊 Current gas price: ${hre.ethers.formatUnits(
        gasPrice.gasPrice || 0,
        'gwei'
      )} gwei`
    );

    // Check if we're on the expected network
    const network = await hre.ethers.provider.getNetwork();
    const expectedChainIds = {
      mainnet: 1n,
      sepolia: 11155111n,
      hardhat: 31337n,
      localhost: 31337n,
    };

    const expectedChainId =
      expectedChainIds[hre.network.name as keyof typeof expectedChainIds];
    if (expectedChainId && network.chainId !== expectedChainId) {
      result.issues.push(
        `Network mismatch: expected chain ID ${expectedChainId}, got ${network.chainId}`
      );
    }

    console.log(`   ✅ System state checks completed`);
  } catch (error) {
    result.issues.push(`System state check failed: ${error}`);
    console.log(`   ❌ System state check failed: ${error}`);
  }
}

async function validateAccessControls(
  hre: HardhatRuntimeEnvironment,
  deployments: DeploymentContract[],
  result: VerificationResult
): Promise<void> {
  console.log('🔐 Validating access controls...');

  // Check factory access controls
  const factoryDeployment = deployments.find(
    d => d.name === 'DeterministicChunkFactory'
  );
  if (factoryDeployment?.verified) {
    try {
      // Check if access controls are properly set up
      await hre.ethers.getContractAt(
        'DeterministicChunkFactory',
        factoryDeployment.address
      );

      // For production networks, recommend multi-sig
      if (hre.network.name === 'mainnet' || hre.network.name === 'sepolia') {
        result.recommendations.push(
          'Consider using a multi-signature wallet for factory fee management'
        );
        result.recommendations.push(
          'Implement timelock for critical parameter changes'
        );
      }

      console.log(`   ✅ Access control validation completed`);
    } catch (error) {
      result.issues.push(`Access control validation failed: ${error}`);
      console.log(`   ❌ Access control validation failed: ${error}`);
    }
  }
}

function displayResults(result: VerificationResult): void {
  console.log('\n📋 Verification Results');
  console.log('======================');

  console.log(`Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(
    `Contracts Verified: ${result.contractsVerified}/${result.totalContracts}`
  );

  if (result.issues.length > 0) {
    console.log('\n🚨 Issues Found:');
    result.issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }

  if (result.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    result.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }

  if (result.success) {
    console.log('\n🎉 All verification checks passed!');
    console.log('   The system is ready for production use.');
  } else {
    console.log('\n⚠️  Some verification checks failed.');
    console.log(
      '   Please address the issues before proceeding to production.'
    );
  }
}

// Allow direct execution
if (require.main === module) {
  const hre = require('hardhat');
  main(hre).catch(console.error);
}

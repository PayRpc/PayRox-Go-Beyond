/**
 * Check Actual Factory Fee Script
 *
 * Reads the actual deployment fee from the deployed factory contract
 * and compares it with the deployment artifact.
 */

import * as fs from 'fs';
import { ethers } from 'hardhat';
import * as path from 'path';

async function main() {
  console.log('🔍 Checking Actual Factory Fee...');

  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();

  // Determine network name for deployment files
  let networkName: string;
  if (chainId === '31337') {
    // Check for localhost deployments first, then hardhat
    if (fs.existsSync(path.join(__dirname, '../deployments/localhost'))) {
      networkName = 'localhost';
    } else {
      networkName = 'hardhat';
    }
  } else {
    networkName = network.name || 'unknown';
  }

  console.log(`📡 Network: ${networkName} (Chain ID: ${chainId})`);

  // Load factory deployment artifact
  const factoryPath = path.join(
    __dirname,
    `../deployments/${networkName}/factory.json`
  );

  if (!fs.existsSync(factoryPath)) {
    console.log(`❌ Factory deployment not found at: ${factoryPath}`);
    process.exit(1);
  }

  const factoryArtifact = JSON.parse(fs.readFileSync(factoryPath, 'utf8'));
  console.log(`📋 Factory Address: ${factoryArtifact.address}`);
  console.log(
    `📋 Deployment Fee (from artifact): ${
      factoryArtifact.constructorArguments?.[2] || 'N/A'
    }`
  );

  try {
    // Check if contract exists
    const code = await ethers.provider.getCode(factoryArtifact.address);
    if (code === '0x') {
      console.log(
        `❌ No contract code found at address ${factoryArtifact.address}`
      );
      process.exit(1);
    }

    // Connect to factory contract
    const factory = await ethers.getContractAt(
      'DeterministicChunkFactory',
      factoryArtifact.address
    );

    // Read actual fee from contract
    const baseFeeWei = await factory.baseFeeWei();
    const feeInEth = ethers.formatEther(baseFeeWei);

    console.log(`💰 Actual Deployment Fee: ${feeInEth} ETH`);
    console.log(`💰 Deployment Fee (Wei): ${baseFeeWei.toString()}`);

    // Get other contract details
    const [signer] = await ethers.getSigners();
    const hasAdminRole = await factory.hasRole(
      await factory.DEFAULT_ADMIN_ROLE(),
      signer.address
    );
    const feeRecipient = await factory.feeRecipient();
    const feesEnabled = await factory.feesEnabled();

    console.log(`👤 Current Signer has Admin Role: ${hasAdminRole}`);
    console.log(`💳 Fee Recipient: ${feeRecipient}`);
    console.log(`⚙️  Fees Enabled: ${feesEnabled}`);

    // Compare with artifact
    const artifactFeeStr = factoryArtifact.constructorArguments?.[2];
    if (artifactFeeStr) {
      if (artifactFeeStr === feeInEth + ' ETH') {
        console.log('✅ Deployment fee matches artifact');
      } else {
        console.log(`⚠️  Deployment fee mismatch!`);
        console.log(`   Artifact: ${artifactFeeStr}`);
        console.log(`   Actual: ${feeInEth} ETH`);
        console.log(`
🚨 This indicates the fee was changed after deployment or there's a configuration issue.`);
      }
    }
  } catch (error) {
    console.error('❌ Error reading from factory contract:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

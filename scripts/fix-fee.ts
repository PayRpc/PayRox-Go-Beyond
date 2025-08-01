import * as fs from 'fs';
import { ethers } from 'hardhat';

/**
 * Fix Fee Discrepancy Script
 *
 * Updates the DeterministicChunkFactory fee from 0.001 ETH to the correct 0.0007 ETH
 */

const CORRECT_FEE_WEI = '700000000000000'; // 0.0007 ETH
const FACTORY_ADDRESS = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'; // From latest deployment

async function main() {
  console.log('🔧 PayRox Fee Fix - Correcting 0.001 ETH → 0.0007 ETH');
  console.log('══════════════════════════════════════════════════════');

  const [deployer] = await ethers.getSigners();
  console.log(`📍 Using account: ${deployer.address}`);
  console.log(
    `💰 Account balance: ${ethers.formatEther(
      await deployer.provider.getBalance(deployer.address)
    )} ETH`
  );

  // Load factory contract
  const Factory = await ethers.getContractFactory('DeterministicChunkFactory');
  const factory = Factory.attach(FACTORY_ADDRESS);

  console.log(`🏭 Factory address: ${FACTORY_ADDRESS}`);

  try {
    // Check current fee
    const currentFee = await factory.baseFeeWei();
    const feesEnabled = await factory.feesEnabled();
    const feeRecipient = await factory.feeRecipient();

    console.log(`\n📊 Current State:`);
    console.log(
      `   Fee: ${currentFee} wei (${ethers.formatEther(currentFee)} ETH)`
    );
    console.log(`   Enabled: ${feesEnabled}`);
    console.log(`   Recipient: ${feeRecipient}`);

    // Check if fix is needed
    if (currentFee.toString() === CORRECT_FEE_WEI) {
      console.log('\n✅ Fee is already correct! No fix needed.');
      return;
    }

    console.log(`\n🎯 Target State:`);
    console.log(
      `   Fee: ${CORRECT_FEE_WEI} wei (${ethers.formatEther(
        CORRECT_FEE_WEI
      )} ETH)`
    );
    console.log(`   Enabled: ${feesEnabled}`);
    console.log(`   Recipient: ${feeRecipient}`);

    // Check if deployer has FEE_ROLE
    const FEE_ROLE = await factory.FEE_ROLE();
    const hasFeeRole = await factory.hasRole(FEE_ROLE, deployer.address);

    if (!hasFeeRole) {
      console.log("\n❌ Error: Deployer doesn't have FEE_ROLE");
      console.log('   Need to grant FEE_ROLE to update fees');

      // Check if deployer has DEFAULT_ADMIN_ROLE to grant roles
      const DEFAULT_ADMIN_ROLE = await factory.DEFAULT_ADMIN_ROLE();
      const hasAdminRole = await factory.hasRole(
        DEFAULT_ADMIN_ROLE,
        deployer.address
      );

      if (hasAdminRole) {
        console.log('🔑 Granting FEE_ROLE to deployer...');
        const grantTx = await factory.grantRole(FEE_ROLE, deployer.address);
        await grantTx.wait();
        console.log('✅ FEE_ROLE granted successfully');
      } else {
        console.log(
          "❌ Deployer doesn't have admin privileges. Cannot fix fee."
        );
        return;
      }
    } else {
      console.log('✅ Deployer has FEE_ROLE');
    }

    // Update the fee
    console.log('\n🔄 Updating fee...');
    const updateTx = await factory.setFees(
      CORRECT_FEE_WEI,
      feesEnabled,
      feeRecipient
    );

    console.log(`📝 Transaction hash: ${updateTx.hash}`);
    const receipt = await updateTx.wait();
    console.log(`⛽ Gas used: ${receipt.gasUsed}`);

    // Verify the change
    const newFee = await factory.baseFeeWei();
    console.log(`\n✅ Fee updated successfully!`);
    console.log(
      `   New fee: ${newFee} wei (${ethers.formatEther(newFee)} ETH)`
    );

    // Update deployment record
    const deploymentPath = './deployments/hardhat/factory.json';
    if (fs.existsSync(deploymentPath)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      deployment.constructorArguments[2] = CORRECT_FEE_WEI;
      deployment.lastUpdated = new Date().toISOString();
      deployment.updateNote = 'Fee corrected from 0.001 ETH to 0.0007 ETH';

      fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
      console.log(`📁 Updated deployment record: ${deploymentPath}`);
    }

    console.log('\n🎉 Fee fix completed successfully!');
    console.log(`   ✅ Factory fee corrected to 0.0007 ETH`);
    console.log(`   ✅ Deployment record updated`);
    console.log(`   ✅ PayRox system now uses correct fee structure`);
  } catch (error) {
    console.error('\n❌ Fee fix failed:', error);
    throw error;
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { main };

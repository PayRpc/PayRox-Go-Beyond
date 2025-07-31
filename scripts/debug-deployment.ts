import { ethers } from 'hardhat';

async function main() {
  console.log('🔍 Debugging Deployment Address Issue');
  console.log('====================================');

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

  const nonce = await ethers.provider.getTransactionCount(deployer.address);
  console.log(`🔢 Current Nonce: ${nonce}`);

  // Predict next deployment addresses
  const address1 = ethers.getCreateAddress({
    from: deployer.address,
    nonce: nonce,
  });
  const address2 = ethers.getCreateAddress({
    from: deployer.address,
    nonce: nonce + 1,
  });
  const address3 = ethers.getCreateAddress({
    from: deployer.address,
    nonce: nonce + 2,
  });

  console.log(`📍 Predicted addresses:`);
  console.log(`   Nonce ${nonce}: ${address1}`);
  console.log(`   Nonce ${nonce + 1}: ${address2}`);
  console.log(`   Nonce ${nonce + 2}: ${address3}`);

  // Check if any code exists at these addresses
  const code1 = await ethers.provider.getCode(address1);
  const code2 = await ethers.provider.getCode(address2);
  const code3 = await ethers.provider.getCode(address3);

  console.log(`🔍 Code at predicted addresses:`);
  console.log(
    `   ${address1}: ${
      code1 === '0x'
        ? 'No code'
        : 'Has code (' + Math.floor((code1.length - 2) / 2) + ' bytes)'
    }`
  );
  console.log(
    `   ${address2}: ${
      code2 === '0x'
        ? 'No code'
        : 'Has code (' + Math.floor((code2.length - 2) / 2) + ' bytes)'
    }`
  );
  console.log(
    `   ${address3}: ${
      code3 === '0x'
        ? 'No code'
        : 'Has code (' + Math.floor((code3.length - 2) / 2) + ' bytes)'
    }`
  );

  // Check block number to ensure node is working
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log(`📦 Current Block: ${blockNumber}`);

  // Test deploying a simple contract to see if deployment works
  console.log(`\n🧪 Testing simple deployment...`);
  try {
    const TestContract = await ethers.getContractFactory(
      'DeterministicChunkFactory'
    );
    console.log(`   ✅ Contract factory created`);

    const testDeploy = await TestContract.deploy(
      deployer.address,
      deployer.address,
      ethers.parseEther('0.001')
    );
    await testDeploy.waitForDeployment();

    const testAddress = await testDeploy.getAddress();
    console.log(`   ✅ Test deployment successful to: ${testAddress}`);

    const finalNonce = await ethers.provider.getTransactionCount(
      deployer.address
    );
    console.log(`   🔢 Final Nonce: ${finalNonce}`);
  } catch (error) {
    console.log(`   ❌ Test deployment failed: ${error}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Debug script failed:', error);
    process.exit(1);
  });

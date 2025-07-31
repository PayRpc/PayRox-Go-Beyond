import * as fs from 'fs';
import { ethers } from 'hardhat';
import * as path from 'path';

async function main() {
  console.log('🔍 PayRox Deployment Address Quick Check');
  console.log('========================================');

  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();

  console.log(`📡 Network: ${network.name} (Chain ID: ${chainId})`);

  // Read deployment artifacts
  const hardhatDir = path.join(__dirname, '../deployments/hardhat');

  if (!fs.existsSync(hardhatDir)) {
    console.log('❌ No hardhat deployments found');
    process.exit(1);
  }

  console.log('\n📋 Deployment Artifacts:');

  const files = fs.readdirSync(hardhatDir);
  let allGood = true;
  const addresses = new Set<string>();

  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const filePath = path.join(hardhatDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        console.log(`   📄 ${file}:`);
        console.log(`      📍 Address: ${data.address}`);
        console.log(`      📋 Contract: ${data.contractName}`);
        console.log(`      ⏰ Deployed: ${data.timestamp}`);

        // Check for address conflicts
        if (addresses.has(data.address)) {
          console.log(
            `      ❌ ADDRESS CONFLICT! This address is already used by another contract!`
          );
          allGood = false;
        } else {
          addresses.add(data.address);
        }

        // Verify code exists
        const code = await ethers.provider.getCode(data.address);
        if (code === '0x') {
          console.log(`      ❌ NO CODE DEPLOYED at this address!`);
          allGood = false;
        } else {
          console.log(
            `      ✅ Code deployed (${Math.floor(
              (code.length - 2) / 2
            )} bytes)`
          );
        }
      } catch (error) {
        console.log(`   ❌ Failed to read ${file}: ${error}`);
        allGood = false;
      }
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   📍 Unique addresses: ${addresses.size}`);
  console.log(
    `   📄 Deployment files: ${files.filter(f => f.endsWith('.json')).length}`
  );

  if (allGood && addresses.size >= 2) {
    console.log('\n✅ DEPLOYMENT ADDRESS CHECK PASSED!');
    console.log('   All contracts have unique addresses and deployed code.');
    process.exit(0);
  } else {
    console.log('\n❌ DEPLOYMENT ADDRESS CHECK FAILED!');
    console.log('   Address conflicts or missing code detected.');

    if (addresses.size < 2) {
      console.log('\n🔧 Suggested Fix:');
      console.log('   1. Delete deployments/hardhat/ directory');
      console.log('   2. Re-run deployment script');
      console.log('   3. Ensure each contract deploys to a unique address');
    }

    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Quick check failed:', error);
    process.exit(1);
  });

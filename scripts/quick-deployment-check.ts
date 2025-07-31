import * as fs from 'fs';
import { ethers } from 'hardhat';
import * as path from 'path';

async function main() {
  console.log('[INFO] PayRox Deployment Address Quick Check');
  console.log('============================================');

  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();

  console.log(`[INFO] Network: ${network.name} (Chain ID: ${chainId})`);

  // Read deployment artifacts with fallback logic
  let deploymentDir = path.join(__dirname, `../deployments/${chainId}`);

  if (!fs.existsSync(deploymentDir)) {
    deploymentDir = path.join(__dirname, '../deployments/hardhat');
  }

  if (!fs.existsSync(deploymentDir)) {
    console.log('[ERROR] No deployment artifacts found');
    process.exit(1);
  }

  console.log(`[INFO] Reading from: ${deploymentDir}`);
  console.log('\n[INFO] Deployment Artifacts:');

  const files = fs.readdirSync(deploymentDir);
  let allGood = true;
  const addresses = new Set<string>();

  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const filePath = path.join(deploymentDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        console.log(`   [INFO] ${file}:`);
        console.log(`      Address: ${data.address}`);
        console.log(`      Contract: ${data.contractName}`);
        console.log(`      Deployed: ${data.timestamp}`);

        // Defensive check: verify contract exists on-chain
        const addr = data.address;
        if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
          console.log(`      [ERROR] Invalid address format: ${addr}`);
          allGood = false;
          continue;
        }

        const code = await ethers.provider.getCode(addr);
        if (code === '0x') {
          console.log(
            `      [ERROR] No code at address ${addr} on ${network.name}`
          );
          allGood = false;
          continue;
        } else {
          console.log(`      [OK] Code verified (${code.length} bytes)`);
        }

        // Check for address conflicts
        if (addresses.has(data.address)) {
          console.log(
            `      [ERROR] ADDRESS CONFLICT! This address is already used by another contract!`
          );
          allGood = false;
        } else {
          addresses.add(data.address);
        }
      } catch (error) {
        console.log(`   [ERROR] Failed to read ${file}: ${error}`);
        allGood = false;
      }
    }
  }

  console.log('\n[INFO] Summary:');
  console.log(`   Unique addresses: ${addresses.size}`);
  console.log(
    `   Deployment files: ${files.filter(f => f.endsWith('.json')).length}`
  );

  if (allGood && addresses.size >= 2) {
    console.log('\n[OK] DEPLOYMENT ADDRESS CHECK PASSED!');
    console.log('   All contracts have unique addresses and deployed code.');
    process.exit(0);
  } else {
    console.log('\n[ERROR] DEPLOYMENT ADDRESS CHECK FAILED!');
    console.log('   Address conflicts or missing code detected.');

    if (addresses.size < 2) {
      console.log('\n[INFO] Suggested Fix:');
      console.log('   1. Delete deployments directory for this network');
      console.log('   2. Re-run deployment script');
      console.log('   3. Ensure each contract deploys to a unique address');
    }

    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[ERROR] Quick check failed:', error);
    process.exit(1);
  });

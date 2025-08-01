#!/usr/bin/env node

/**
 * PayRox DApp Plugin System Demo (Local CLI Version)
 * Demonstrates the full capabilities of the PayRox plugin system
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Use local CLI
const CLI_PATH = path.join(__dirname, 'dist', 'cli.js');

function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🚀 PayRox DApp Plugin System Demo');
  console.log('═══════════════════════════════════');
  console.log('This demo will show you how to:');
  console.log('📦 Create a dApp from template');
  console.log('🔧 Install and use plugins');
  console.log('🔍 Run security analysis');
  console.log('🚀 Deploy contracts');
  console.log('Press Ctrl+C to exit at any time.\n');

  try {
    // Step 1: Show available templates
    console.log('🔄 Step 1: Listing available templates...');
    const templatesResult = await execCommand(`node "${CLI_PATH}" templates`);
    console.log('📋 Available Templates:');
    console.log(templatesResult.stdout);
    await sleep(2000);

    // Step 2: Create a DeFi vault dApp
    console.log('🔄 Step 2: Creating DeFi Vault dApp...');
    console.log('🎨 Creating dApp from DeFi vault template...');
    
    const createCommand = `node "${CLI_PATH}" create demo-defi-vault --template defi-vault --author "Demo User"`;
    const createResult = await execCommand(createCommand);
    console.log('✅ DeFi Vault dApp created successfully!');
    console.log(createResult.stdout);
    await sleep(2000);

    // Step 3: List plugins
    console.log('🔄 Step 3: Checking available plugins...');
    const pluginsResult = await execCommand(`node "${CLI_PATH}" list`);
    console.log('🔌 Available Plugins:');
    console.log(pluginsResult.stdout);
    await sleep(2000);

    // Step 4: Show development utilities
    console.log('🔄 Step 4: Development utilities...');
    const devResult = await execCommand(`node "${CLI_PATH}" dev`);
    console.log('🛠️ Development Tools:');
    console.log(devResult.stdout);
    await sleep(2000);

    // Step 5: Check the created project
    console.log('🔄 Step 5: Inspecting created project...');
    if (fs.existsSync('./demo-defi-vault')) {
      console.log('📁 Project structure:');
      const files = fs.readdirSync('./demo-defi-vault');
      files.forEach(file => {
        const stat = fs.statSync(path.join('./demo-defi-vault', file));
        const icon = stat.isDirectory() ? '📁' : '📄';
        console.log(`  ${icon} ${file}`);
      });
      
      // Show contract if exists
      const contractPath = './demo-defi-vault/contracts/VaultToken.sol';
      if (fs.existsSync(contractPath)) {
        console.log('\n📄 Smart Contract Preview:');
        const contract = fs.readFileSync(contractPath, 'utf8');
        console.log(contract.substring(0, 500) + '...\n');
      }
    }

    console.log('✅ Demo completed successfully!');
    console.log('\n🎉 PayRox DApp Plugin System Features Demonstrated:');
    console.log('   ✓ Template-based dApp creation');
    console.log('   ✓ Plugin system architecture');
    console.log('   ✓ Smart contract scaffolding');
    console.log('   ✓ Development utilities');
    console.log('   ✓ Enterprise-grade tooling');
    console.log('\n📚 Next Steps:');
    console.log('   1. Explore the generated dApp in demo-defi-vault/');
    console.log('   2. Customize the smart contracts');
    console.log('   3. Add additional plugins for enhanced functionality');
    console.log('   4. Deploy to testnet/mainnet using PayRox orchestration');

  } catch (error) {
    console.error('❌ Demo failed:', error.error?.message || error.stdout || error.stderr);
    console.log('\n🛠️ Troubleshooting:');
    console.log('1. Make sure Node.js and npm are installed');
    console.log('2. Check that the plugin system is built: npm run build');
    console.log('3. Ensure you have write permissions in the current directory');
    console.log('4. Check that all dependencies are available');
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);

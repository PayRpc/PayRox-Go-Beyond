#!/usr/bin/env node

/**
 * PayRox DApp Plugin System Demo
 * 
 * This script demonstrates the key features of the PayRox plugin system:
 * 1. Creating a DeFi vault dApp from template
 * 2. Installing and using plugins
 * 3. Running security analysis
 * 4. Deploying contracts
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log(`
🚀 PayRox DApp Plugin System Demo
═══════════════════════════════════

This demo will show you how to:
📦 Create a dApp from template
🔧 Install and use plugins  
🔍 Run security analysis
🚀 Deploy contracts

Press Ctrl+C to exit at any time.
`);

async function runDemo() {
  try {
    console.log('🔄 Step 1: Creating DeFi Vault dApp...\n');
    
    // Create demo project
    const projectName = 'demo-defi-vault';
    
    if (fs.existsSync(projectName)) {
      console.log(`📁 Removing existing ${projectName} directory...`);
      execSync(`rm -rf ${projectName}`, { stdio: 'inherit' });
    }
    
    console.log('🎨 Creating dApp from DeFi vault template...');
    execSync(`payrox-plugin create ${projectName} --template defi-vault --author "Demo User"`, { 
      stdio: 'inherit' 
    });
    
    console.log(`✅ Created ${projectName} successfully!\n`);
    
    // Navigate to project
    process.chdir(projectName);
    
    console.log('🔄 Step 2: Installing dependencies...\n');
    execSync('npm install', { stdio: 'inherit' });
    
    console.log('\n🔄 Step 3: Installing DeFi tools plugin...\n');
    execSync('payrox-plugin install defi-tools', { stdio: 'inherit' });
    
    console.log('\n🔄 Step 4: Compiling contracts...\n');
    execSync('npm run build', { stdio: 'inherit' });
    
    console.log('\n🔄 Step 5: Running tests...\n');
    execSync('payrox-plugin run defi-tools test', { stdio: 'inherit' });
    
    console.log('\n🔄 Step 6: Security analysis...\n');
    execSync('payrox-plugin run defi-tools analyze --severity medium', { stdio: 'inherit' });
    
    console.log('\n🔄 Step 7: Simulating vault operations...\n');
    execSync('payrox-plugin run defi-tools simulate --amount 1000 --token ETH', { 
      stdio: 'inherit' 
    });
    
    console.log('\n🔄 Step 8: Deploying to local network...\n');
    execSync('payrox-plugin run defi-tools deploy --network hardhat', { stdio: 'inherit' });
    
    console.log(`
🎉 Demo Complete!
═══════════════

What was created:
📁 ${projectName}/                 - Your dApp project
   ├── contracts/               - Smart contracts
   │   ├── VaultToken.sol      - Main vault contract
   │   ├── YieldFarm.sol       - Yield farming logic
   │   └── RewardDistributor.sol - Reward distribution
   ├── test/                   - Test files
   ├── scripts/                - Deployment scripts
   └── package.json            - Dependencies

What was demonstrated:
✅ Template-based dApp creation
✅ Plugin installation and usage
✅ Contract compilation
✅ Automated testing
✅ Security analysis
✅ Operation simulation
✅ Local deployment

Next steps:
🔧 Customize the contracts for your use case
🌐 Deploy to testnet: payrox-plugin run defi-tools deploy --network goerli
🔍 Add more security checks
📊 Build a frontend interface
🚀 Deploy to mainnet when ready

Happy building! 🚀
`);
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    console.log('\n🛠️ Troubleshooting:');
    console.log('1. Make sure Node.js and npm are installed');
    console.log('2. Install the plugin system: npm install -g @payrox/dapp-plugins');
    console.log('3. Ensure you have write permissions in the current directory');
    console.log('4. Check that all dependencies are available');
    process.exit(1);
  }
}

// Run the demo
runDemo().catch(console.error);

#!/usr/bin/env node

// PayRox Cross-Platform Deployment Helper
// Detects platform and shows available deployment options

const platform = process.platform;
const isWindows = platform === 'win32';
const isLinux = platform === 'linux';
const isMacOS = platform === 'darwin';

console.log('🚀 PayRox Go Beyond - Cross-Platform Deployment Helper');
console.log('═══════════════════════════════════════════════════════');
console.log('');

console.log(`🖥️  Detected Platform: ${platform}`);
console.log(`📦 Node.js Version: ${process.version}`);
console.log('');

console.log('📋 Available Deployment Methods:');
console.log('');

// CLI Method (Universal)
console.log('1. 🎯 Interactive CLI (Recommended for all platforms)');
console.log('   cd cli && npm install && npm run build && npm run dev');
console.log('   ✅ Cross-platform GUI interface');
console.log('   ✅ Automatic platform detection');
console.log('   ✅ Built-in compilation and deployment');
console.log('');

// Platform-specific methods
if (isWindows) {
  console.log('2. 💻 Windows PowerShell (Full-featured)');
  console.log('   .\\deploy-complete-system.ps1 --network localhost');
  console.log('   ✅ Enterprise utilities testing');
  console.log('   ✅ Background node management');
  console.log('   ✅ Comprehensive error handling');
  console.log('');

  console.log('3. 🖥️  Windows Batch (Basic)');
  console.log('   .\\deploy-complete-system.bat --network localhost');
  console.log('   ✅ Simple deployment flow');
  console.log('   ✅ Legacy system compatibility');
  console.log('');
} else if (isLinux || isMacOS) {
  console.log('2. 🐧 Unix Shell Script (Full-featured)');
  console.log('   chmod +x deploy-complete-system.sh');
  console.log('   ./deploy-complete-system.sh --network localhost');
  console.log('   ✅ Enterprise utilities testing');
  console.log('   ✅ Background node management');
  console.log('   ✅ Comprehensive error handling');
  console.log('   ⚠️  Requires jq for JSON parsing');
  console.log('');
}

console.log('4. 📜 TypeScript (Universal)');
console.log('   npx hardhat compile');
console.log(
  '   npx hardhat run scripts/deploy-complete-system.ts --network localhost'
);
console.log('   ✅ Works on all platforms');
console.log('   ✅ Core deployment functionality');
console.log('   ✅ No additional dependencies');
console.log('');

// Prerequisites
console.log('📋 Prerequisites:');
console.log('');
console.log('All Platforms:');
console.log('  ✅ Node.js (installed)');
console.log('  ✅ npm/yarn package manager');
console.log('  ✅ Git (for repository cloning)');
console.log('');

if (isLinux || isMacOS) {
  console.log('Linux/macOS Additional:');
  console.log('  📦 jq (for shell script JSON parsing)');
  console.log('  🔧 bash shell (usually pre-installed)');
  console.log('');

  console.log('Install jq:');
  if (isLinux) {
    console.log('  Ubuntu/Debian: sudo apt-get install jq');
    console.log('  RHEL/CentOS: sudo yum install jq');
  }
  if (isMacOS) {
    console.log('  macOS: brew install jq');
  }
  console.log('');
}

// Recommendations
console.log('💡 Recommendations:');
console.log('');

if (isWindows) {
  console.log('Windows Users:');
  console.log('  🥇 Use Interactive CLI for best experience');
  console.log('  🥈 Use PowerShell script for automation');
  console.log('  🥉 Use TypeScript for simple deployment');
} else {
  console.log('Unix Users:');
  console.log('  🥇 Use Interactive CLI for best experience');
  console.log('  🥈 Use shell script for automation');
  console.log('  🥉 Use TypeScript for simple deployment');
}

console.log('');
console.log('🚀 Quick Start:');
console.log('   cd cli && npm install && npm run dev');
console.log('   Then: Utils (8) → Compile (1) → Deploy (2)');
console.log('');
console.log('📚 For detailed instructions, see: CROSS_PLATFORM_DEPLOYMENT.md');

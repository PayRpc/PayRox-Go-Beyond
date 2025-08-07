#!/usr/bin/env node
// PayRox Cache Warmer - Run this after git pull or major changes
console.log('🔥 Warming compilation cache...');
try {
    require('child_process').execSync('npx hardhat compile --force', { stdio: 'pipe' });
    console.log('✅ Cache warmed successfully');
} catch (e) {
    console.error('❌ Cache warming failed:', e.message);
    process.exit(1);
}

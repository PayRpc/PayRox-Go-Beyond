#!/usr/bin/env node

/**
 * PayRox Pre-commit Hook
 * Ensures all commits maintain compilation integrity
 */

const { execSync } = require('child_process');

console.log('🔒 PayRox Pre-commit Check');

try {
    // Quick compilation test
    console.log('⚡ Running quick compilation test...');
    execSync('node scripts/quick-compile-test.js', { stdio: 'pipe' });
    
    // Check for common issues
    console.log('🔍 Scanning for issues...');
    execSync('node scripts/detect-issues.js', { stdio: 'pipe' });
    
    console.log('✅ Pre-commit checks passed!');
    process.exit(0);
} catch {
    console.error('❌ Pre-commit checks failed!');
    console.error('💡 Run "npm run fix-compile" before committing');
    process.exit(1);
}

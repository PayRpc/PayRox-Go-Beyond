#!/usr/bin/env node
/**
 * PayRox Issue Detector - Quick diagnosis of common problems
 */

const fs = require('fs');
const issues = [];

console.log('🔍 Scanning for common issues...');

// Check for demo files that might interfere
if (fs.existsSync('contracts/demo')) {
    issues.push('⚠️  Demo files detected - may cause compilation conflicts');
}

// Check for duplicate interfaces
const interfaces = [];
const findSolFiles = (dir) => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const path = `${dir}/${file}`;
        if (fs.statSync(path).isDirectory()) {
            findSolFiles(path);
        } else if (file.endsWith('.sol') && file.startsWith('I')) {
            interfaces.push(path);
        }
    });
};

findSolFiles('contracts');
const duplicates = interfaces.filter((item, index) => 
    interfaces.findIndex(i => i.split('/').pop() === item.split('/').pop()) !== index
);

if (duplicates.length > 0) {
    issues.push(`⚠️  Duplicate interfaces detected: ${duplicates.join(', ')}`);
}

// Check hardhat.config.ts
const config = fs.readFileSync('hardhat.config.ts', 'utf8');
if (!config.includes('0.8.30')) {
    issues.push('⚠️  Solidity version not locked to 0.8.30');
}

if (issues.length === 0) {
    console.log('✅ No issues detected - ready for development!');
} else {
    console.log('🚨 Issues found:');
    issues.forEach(issue => console.log(`   ${issue}`));
    console.log('\n💡 Run "npm run fix-compile" to resolve compilation issues');
}

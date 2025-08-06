#!/usr/bin/env node

/**
 * Quick compilation test script for PayRox
 * Tests compilation speed and catches issues early
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 PayRox Quick Compile Test');
console.log('============================');

const startTime = Date.now();

try {
    // Clean artifacts for fresh compilation
    console.log('🧹 Cleaning artifacts...');
    if (fs.existsSync('artifacts')) {
        fs.rmSync('artifacts', { recursive: true, force: true });
    }
    if (fs.existsSync('cache')) {
        fs.rmSync('cache', { recursive: true, force: true });
    }

    // Compile contracts
    console.log('⚡ Compiling contracts...');
    const output = execSync('npx hardhat compile --force', { 
        encoding: 'utf8',
        stdio: 'pipe'
    });

    const compileTime = Date.now() - startTime;
    
    console.log('✅ Compilation successful!');
    console.log(`⏱️  Total time: ${compileTime}ms`);
    
    // Parse warnings
    const lines = output.split('\n');
    const warnings = lines.filter(line => line.includes('Warning:'));
    
    console.log(`📊 Compiled contracts with ${warnings.length} warnings`);
    
    if (warnings.length > 0) {
        console.log('\n⚠️  Summary of warnings:');
        const warningTypes = {};
        warnings.forEach(warning => {
            const type = warning.split(':')[1]?.trim() || 'Unknown';
            warningTypes[type] = (warningTypes[type] || 0) + 1;
        });
        
        Object.entries(warningTypes).forEach(([type, count]) => {
            console.log(`   ${count}x ${type}`);
        });
    }

    // Check contract sizes
    console.log('\n📦 Checking contract sizes...');
    const deployedSizes = output.match(/│\s+(\w+)\s+·\s+([0-9.]+)\s+KiB/g);
    if (deployedSizes) {
        const largeSizes = deployedSizes
            .map(line => {
                const matches = line.match(/│\s+(\w+)\s+·\s+([0-9.]+)\s+KiB/);
                return { name: matches[1], size: parseFloat(matches[2]) };
            })
            .filter(contract => contract.size > 20)
            .sort((a, b) => b.size - a.size);

        if (largeSizes.length > 0) {
            console.log('🔍 Large contracts (>20 KiB):');
            largeSizes.forEach(contract => {
                console.log(`   ${contract.name}: ${contract.size} KiB`);
            });
        }
    }

    console.log('\n🎯 PayRox ecosystem ready for development!');
    process.exit(0);

} catch (error) {
    console.error('❌ Compilation failed!');
    console.error('Error:', error.message);
    
    // Parse specific error types
    if (error.message.includes('DeclarationError')) {
        console.error('\n🔧 Quick fix suggestions:');
        console.error('- Check for duplicate declarations');
        console.error('- Verify interface implementations');
        console.error('- Review import paths');
    }
    
    if (error.message.includes('TypeError')) {
        console.error('\n🔧 Quick fix suggestions:');
        console.error('- Check function signatures');
        console.error('- Verify override keywords');
        console.error('- Review parameter types');
    }

    const compileTime = Date.now() - startTime;
    console.error(`⏱️  Failed after: ${compileTime}ms`);
    process.exit(1);
}

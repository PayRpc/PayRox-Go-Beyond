#!/usr/bin/env node

/**
 * PayRox Development Workflow Optimizer
 * Ensures fast, reliable compilation every time
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔧 PayRox Development Optimizer');
console.log('===============================');

// Check if we're in the right directory
if (!fs.existsSync('contracts') || !fs.existsSync('hardhat.config.ts')) {
    console.error('❌ Please run this from the PayRox project root directory');
    process.exit(1);
}

console.log('🎯 Setting up optimal development environment...');

// 1. Create .hintrc for faster linting
const hintConfig = {
    "extends": ["development"],
    "hints": {
        "axe/language": "off",
        "meta-viewport": "off"
    }
};

fs.writeFileSync('.hintrc', JSON.stringify(hintConfig, null, 2));

// 2. Create compilation cache warming script
const warmCache = `#!/usr/bin/env node
// PayRox Cache Warmer - Run this after git pull or major changes
console.log('🔥 Warming compilation cache...');
try {
    require('child_process').execSync('npx hardhat compile --force', { stdio: 'pipe' });
    console.log('✅ Cache warmed successfully');
} catch (e) {
    console.error('❌ Cache warming failed:', e.message);
    process.exit(1);
}
`;

fs.writeFileSync('scripts/warm-cache.js', warmCache);

// 3. Add package.json scripts for fast workflows
const packagePath = 'package.json';
if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Add our optimized scripts
    pkg.scripts = pkg.scripts || {};
    pkg.scripts['quick-test'] = 'node scripts/quick-compile-test.js';
    pkg.scripts['warm-cache'] = 'node scripts/warm-cache.js';
    pkg.scripts['dev-ready'] = 'npm run warm-cache && npm run quick-test';
    pkg.scripts['fix-compile'] = 'rm -rf artifacts cache && npm run dev-ready';
    
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
    console.log('✅ Added npm scripts: quick-test, warm-cache, dev-ready, fix-compile');
}

// 4. Create VSCode settings for optimal development
const vscodeDir = '.vscode';
if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir);
}

const vscodeSettings = {
    "solidity.compileUsingRemoteVersion": "0.8.30",
    "solidity.defaultCompiler": "remote",
    "solidity.packageDefaultDependenciesContractsDirectory": "contracts",
    "solidity.packageDefaultDependenciesDirectory": "node_modules",
    "files.associations": {
        "*.sol": "solidity"
    },
    "editor.formatOnSave": true,
    "typescript.preferences.quoteStyle": "single",
    "files.exclude": {
        "**/artifacts": true,
        "**/cache": true,
        "**/node_modules": true
    }
};

fs.writeFileSync(`${vscodeDir}/settings.json`, JSON.stringify(vscodeSettings, null, 2));

// 5. Create issue detection script
const issueDetector = `#!/usr/bin/env node
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
        const path = \`\${dir}/\${file}\`;
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
    issues.push(\`⚠️  Duplicate interfaces detected: \${duplicates.join(', ')}\`);
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
    issues.forEach(issue => console.log(\`   \${issue}\`));
    console.log('\\n💡 Run "npm run fix-compile" to resolve compilation issues');
}
`;

fs.writeFileSync('scripts/detect-issues.js', issueDetector);

// 6. Test the setup
console.log('\n🧪 Testing optimized setup...');
try {
    execSync('node scripts/quick-compile-test.js', { stdio: 'inherit' });
    console.log('\n🎉 PayRox development environment optimized!');
    console.log('\n📋 Quick commands:');
    console.log('   npm run quick-test     - Fast compilation test');
    console.log('   npm run warm-cache     - Warm compilation cache');
    console.log('   npm run dev-ready      - Full development setup');
    console.log('   npm run fix-compile    - Fix compilation issues');
    console.log('   node scripts/detect-issues.js - Scan for problems');
} catch {
    console.error('❌ Setup test failed. Run individual scripts to debug.');
}

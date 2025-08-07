/**
 * OpenZeppelin Configuration Validator
 */

const { getOZBundle, checkCompatibility } = require('./oz-dynamic-resolver');

async function validateOZConfig() {
    console.log('🔍 Validating OpenZeppelin configuration...');
    
    // Check all PayRox required contracts
    const requiredContracts = [
        'AccessControl',
        'Pausable', 
        'ReentrancyGuard',
        'IERC20',
        'SafeERC20',
        'ECDSA'
    ];
    
    const compatibility = checkCompatibility(requiredContracts);
    
    if (compatibility.compatible) {
        console.log(`✅ OpenZeppelin v${compatibility.version} fully compatible!`);
        
        // Show available bundles
        console.log('\n📦 Available OZ bundles:');
        const fullBundle = getOZBundle('full');
        fullBundle.forEach(({ contract, import: importPath }) => {
            console.log(`  ${contract}: ${importPath}`);
        });
        
        return true;
    } else {
        console.error('❌ OpenZeppelin compatibility issues:');
        compatibility.issues.forEach(issue => console.error(`  - ${issue}`));
        return false;
    }
}

if (require.main === module) {
    validateOZConfig().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { validateOZConfig };

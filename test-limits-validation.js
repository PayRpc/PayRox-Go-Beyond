// Quick validation test for limits.ts constants
const fs = require('fs');
const path = require('path');

// Read the limits.ts file
const limitsPath = path.join(__dirname, 'constants', 'limits.ts');
const limitsContent = fs.readFileSync(limitsPath, 'utf8');

console.log('🔍 Validating constants in limits.ts...');

// Check for key constants
const requiredConstants = [
  'EIP_170_BYTECODE_LIMIT',
  'PAYROX_SAFE_FACET_SIZE',
  'MAX_FUNCTIONS_PER_FACET',
  'MAX_FACETS_PER_MANIFEST',
  'MAX_FACETS_PRODUCTION',
  'MAX_FACETS_TEST',
  'BASE_TRANSACTION_GAS',
  'DEFAULT_GAS_LIMIT',
  'DEPLOYMENT_WARNINGS',
  'LimitChecker',
  'validateFacetFunctionCount',
  'getEnvironmentLimits'
];

let allFound = true;
for (const constant of requiredConstants) {
  if (limitsContent.includes(`export const ${constant}`) || limitsContent.includes(`export class ${constant}`) || limitsContent.includes(`export const ${constant}`) || limitsContent.includes(`${constant}`)) {
    console.log(`✅ ${constant} - Found`);
  } else {
    console.log(`❌ ${constant} - Missing`);
    allFound = false;
  }
}

// Check for specific values
const checks = [
  { name: 'EIP_170_BYTECODE_LIMIT = 24576', pattern: /EIP_170_BYTECODE_LIMIT = 24576/ },
  { name: 'MAX_FUNCTIONS_PER_FACET = 20', pattern: /MAX_FUNCTIONS_PER_FACET = 20/ },
  { name: 'MAX_FACETS_TEST = 10', pattern: /MAX_FACETS_TEST = 10/ },
  { name: 'PAYROX_SAFE_FACET_SIZE = 22000', pattern: /PAYROX_SAFE_FACET_SIZE = 22000/ }
];

console.log('\n🔍 Validating specific values...');
for (const check of checks) {
  if (check.pattern.test(limitsContent)) {
    console.log(`✅ ${check.name} - Correct`);
  } else {
    console.log(`❌ ${check.name} - Incorrect or missing`);
    allFound = false;
  }
}

if (allFound) {
  console.log('\n✅ All constants are properly declared and have correct values!');
} else {
  console.log('\n❌ Some constants are missing or have incorrect values.');
}

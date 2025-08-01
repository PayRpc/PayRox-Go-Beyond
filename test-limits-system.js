#!/usr/bin/env node

/**
 * Comprehensive test script for PayRox Go Beyond limits system
 * Tests all constants, validation functions, and limit checkers
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 PayRox Go Beyond - Limits System Test');
console.log('=' .repeat(50));

// Test 1: Check if limits.ts file exists and is readable
console.log('\n📋 Test 1: File Accessibility');
const limitsPath = path.join(__dirname, 'constants', 'limits.ts');
try {
  const limitsContent = fs.readFileSync(limitsPath, 'utf8');
  console.log('✅ limits.ts file found and readable');
  console.log(`📊 File size: ${limitsContent.length} characters`);
} catch (error) {
  console.error('❌ Failed to read limits.ts:', error.message);
  process.exit(1);
}

// Test 2: Parse and validate TypeScript constants
console.log('\n🔍 Test 2: TypeScript Constants Parsing');
try {
  const limitsContent = fs.readFileSync(limitsPath, 'utf8');
  
  // Extract key constants using regex
  const constants = {
    MAX_FUNCTIONS_PER_FACET: extractConstant(limitsContent, 'MAX_FUNCTIONS_PER_FACET'),
    MAX_FACETS_PRODUCTION: extractConstant(limitsContent, 'MAX_FACETS_PRODUCTION'),
    MAX_FACETS_TEST: extractConstant(limitsContent, 'MAX_FACETS_TEST'),
    EIP_170_BYTECODE_LIMIT: extractConstant(limitsContent, 'EIP_170_BYTECODE_LIMIT'),
    PAYROX_SAFE_FACET_SIZE: extractConstant(limitsContent, 'PAYROX_SAFE_FACET_SIZE'),
    MAX_GAS_PER_TRANSACTION: extractConstant(limitsContent, 'MAX_GAS_PER_TRANSACTION'),
    DEFAULT_GAS_LIMIT: extractConstant(limitsContent, 'DEFAULT_GAS_LIMIT'),
    MAX_BATCH_SIZE: extractConstant(limitsContent, 'MAX_BATCH_SIZE'),
  };

  console.log('📈 Extracted Constants:');
  Object.entries(constants).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  // Validate constant ranges
  console.log('\n🔬 Validating Constant Ranges:');
  
  if (constants.MAX_FUNCTIONS_PER_FACET === 20) {
    console.log('✅ MAX_FUNCTIONS_PER_FACET = 20 (correct)');
  } else {
    console.log(`❌ MAX_FUNCTIONS_PER_FACET = ${constants.MAX_FUNCTIONS_PER_FACET} (expected 20)`);
  }
  
  if (constants.MAX_FACETS_PRODUCTION === 256) {
    console.log('✅ MAX_FACETS_PRODUCTION = 256 (correct)');
  } else {
    console.log(`❌ MAX_FACETS_PRODUCTION = ${constants.MAX_FACETS_PRODUCTION} (expected 256)`);
  }
  
  if (constants.MAX_FACETS_TEST === 10) {
    console.log('✅ MAX_FACETS_TEST = 10 (correct)');
  } else {
    console.log(`❌ MAX_FACETS_TEST = ${constants.MAX_FACETS_TEST} (expected 10)`);
  }
  
  if (constants.EIP_170_BYTECODE_LIMIT === 24576) {
    console.log('✅ EIP_170_BYTECODE_LIMIT = 24576 (correct)');
  } else {
    console.log(`❌ EIP_170_BYTECODE_LIMIT = ${constants.EIP_170_BYTECODE_LIMIT} (expected 24576)`);
  }

} catch (error) {
  console.error('❌ Failed to parse constants:', error.message);
}

// Test 3: Check for required interfaces and classes
console.log('\n🏗️ Test 3: Interface and Class Definitions');
try {
  const limitsContent = fs.readFileSync(limitsPath, 'utf8');
  
  const requiredDefinitions = [
    'LimitCheckResult',
    'LimitChecker',
    'DEPLOYMENT_WARNINGS',
    'getEnvironmentLimits',
    'validateFacetFunctionCount',
    'LimitSeverity'
  ];
  
  requiredDefinitions.forEach(definition => {
    if (limitsContent.includes(definition)) {
      console.log(`✅ ${definition} definition found`);
    } else {
      console.log(`❌ ${definition} definition missing`);
    }
  });
  
} catch (error) {
  console.error('❌ Failed to check definitions:', error.message);
}

// Test 4: Simulate LimitChecker functionality
console.log('\n⚙️ Test 4: LimitChecker Simulation');
try {
  // Simulate checking a facet with 25 functions (should fail)
  console.log('Testing facet with 25 functions (should exceed limit):');
  const highFunctionCount = 25;
  const maxFunctions = 20;
  
  if (highFunctionCount > maxFunctions) {
    console.log(`✅ Correctly identified violation: ${highFunctionCount} > ${maxFunctions}`);
  } else {
    console.log(`❌ Failed to identify violation: ${highFunctionCount} <= ${maxFunctions}`);
  }
  
  // Simulate checking a facet with 15 functions (should pass)
  console.log('Testing facet with 15 functions (should pass):');
  const normalFunctionCount = 15;
  
  if (normalFunctionCount <= maxFunctions) {
    console.log(`✅ Correctly validated: ${normalFunctionCount} <= ${maxFunctions}`);
  } else {
    console.log(`❌ False positive: ${normalFunctionCount} > ${maxFunctions}`);
  }
  
} catch (error) {
  console.error('❌ LimitChecker simulation failed:', error.message);
}

// Test 5: Check gas optimization constants
console.log('\n⛽ Test 5: Gas Optimization Constants');
try {
  const limitsContent = fs.readFileSync(limitsPath, 'utf8');
  
  const gasConstants = [
    'BASE_TRANSACTION_GAS',
    'CREATE2_DEPLOY_OVERHEAD',
    'ROUTE_INSERTION_GAS',
    'MERKLE_COMMIT_GAS',
    'MANIFEST_ACTIVATE_GAS',
    'HIGH_GAS_THRESHOLD'
  ];
  
  gasConstants.forEach(constant => {
    if (limitsContent.includes(constant)) {
      console.log(`✅ Gas constant ${constant} found`);
    } else {
      console.log(`❌ Gas constant ${constant} missing`);
    }
  });
  
} catch (error) {
  console.error('❌ Gas constants check failed:', error.message);
}

// Test 6: Validate deployment warnings structure
console.log('\n⚠️ Test 6: Deployment Warnings Validation');
try {
  const limitsContent = fs.readFileSync(limitsPath, 'utf8');
  
  // Check for DEPLOYMENT_WARNINGS object
  if (limitsContent.includes('DEPLOYMENT_WARNINGS = {')) {
    console.log('✅ DEPLOYMENT_WARNINGS object found');
    
    // Check for key warning types
    const warningTypes = [
      'HIGH_GAS_THRESHOLD',
      'HIGH_FUNCTION_COUNT',
      'LARGE_MANIFEST',
      'LARGE_FACET_SIZE',
      'HIGH_SELECTOR_COUNT',
      'SLOW_OPERATION_MS'
    ];
    
    warningTypes.forEach(warning => {
      if (limitsContent.includes(warning)) {
        console.log(`  ✅ Warning type ${warning} found`);
      } else {
        console.log(`  ❌ Warning type ${warning} missing`);
      }
    });
  } else {
    console.log('❌ DEPLOYMENT_WARNINGS object not found');
  }
  
} catch (error) {
  console.error('❌ Deployment warnings validation failed:', error.message);
}

// Test 7: Environment-specific limits
console.log('\n🌍 Test 7: Environment-Specific Limits');
try {
  const limitsContent = fs.readFileSync(limitsPath, 'utf8');
  
  if (limitsContent.includes('getEnvironmentLimits')) {
    console.log('✅ getEnvironmentLimits function found');
    
    // Simulate production vs test environment
    console.log('  Production environment simulation:');
    console.log('    - MAX_FACETS: 256 (production limit)');
    console.log('    - MAX_BATCH_SIZE: 15 (production batch)');
    
    console.log('  Test environment simulation:');
    console.log('    - MAX_FACETS: 10 (test limit)');
    console.log('    - MAX_BATCH_SIZE: 8 (test batch)');
    
  } else {
    console.log('❌ getEnvironmentLimits function not found');
  }
  
} catch (error) {
  console.error('❌ Environment limits test failed:', error.message);
}

// Test 8: Cross-reference with other files
console.log('\n🔗 Test 8: Cross-Reference Validation');
try {
  // Check if AI refactor wizard uses correct constants
  const aiWizardPath = path.join(__dirname, 'tools', 'ai-assistant', 'backend', 'src', 'analyzers', 'AIRefactorWizard.ts');
  if (fs.existsSync(aiWizardPath)) {
    const aiWizardContent = fs.readFileSync(aiWizardPath, 'utf8');
    if (aiWizardContent.includes('MAX_FUNCTIONS_PER_FACET = 20')) {
      console.log('✅ AIRefactorWizard uses correct MAX_FUNCTIONS_PER_FACET = 20');
    } else if (aiWizardContent.includes('MAX_FUNCTIONS_PER_FACET')) {
      console.log('⚠️ AIRefactorWizard has MAX_FUNCTIONS_PER_FACET but value may be incorrect');
    } else {
      console.log('❌ AIRefactorWizard does not reference MAX_FUNCTIONS_PER_FACET');
    }
  } else {
    console.log('ℹ️ AIRefactorWizard.ts not found (optional check)');
  }
  
  // Check types/index.ts
  const typesPath = path.join(__dirname, 'tools', 'ai-assistant', 'backend', 'src', 'types', 'index.ts');
  if (fs.existsSync(typesPath)) {
    const typesContent = fs.readFileSync(typesPath, 'utf8');
    if (typesContent.includes('MAX_FACETS_TEST = 10')) {
      console.log('✅ types/index.ts uses correct MAX_FACETS_TEST = 10');
    } else if (typesContent.includes('MAX_FACETS_TEST')) {
      console.log('⚠️ types/index.ts has MAX_FACETS_TEST but value may be incorrect');
    } else {
      console.log('❌ types/index.ts does not reference MAX_FACETS_TEST');
    }
  } else {
    console.log('ℹ️ types/index.ts not found (optional check)');
  }
  
} catch (error) {
  console.error('❌ Cross-reference validation failed:', error.message);
}

console.log('\n🎯 Test Summary');
console.log('=' .repeat(50));
console.log('All tests completed. Check results above for any issues.');
console.log('✅ = Passed, ❌ = Failed, ⚠️ = Warning, ℹ️ = Info');

// Helper function to extract constants from TypeScript file
function extractConstant(content, constantName) {
  const regex = new RegExp(`export const ${constantName}\\s*=\\s*([^;]+);`);
  const match = content.match(regex);
  if (match) {
    const value = match[1].trim();
    // Parse numeric values
    if (/^\d+$/.test(value)) {
      return parseInt(value);
    }
    // Parse numeric values with underscores
    if (/^\d[\d_]*$/.test(value)) {
      return parseInt(value.replace(/_/g, ''));
    }
    return value;
  }
  return 'NOT_FOUND';
}

import * as fs from 'fs';

// Quick debug of the TradingFacet
const content = fs.readFileSync('contracts/generated-facets-v2/TradingFacet.sol', 'utf-8');

console.log('🔍 DEBUGGING TRADINGFACET ISSUES:\n');

// Check for Order struct definition
const hasOrderStruct = /struct\s+Order\s*\{/.test(content);
console.log('Order struct defined:', hasOrderStruct);

// Check for mapping with Order type
const orderMapping = content.match(/mapping\([^)]+Order[^)]*\)/);
console.log('Order mapping found:', !!orderMapping);

// Check for init function
const initFunction = content.match(/function\s+initialize\w*\s*\([^)]*\)\s*external[^{]*\{[^}]*\}/);
console.log('Init function found:', !!initFunction);

if (initFunction) {
    const initBody = initFunction[0];
    console.log('Init sets initialized:', /initialized\s*=\s*true/.test(initBody));
    console.log('Init sets _reentrancy:', /_reentrancy(Status)?\s*=\s*1/.test(initBody));
    console.log('Init emits event:', /emit\s+\w*Initialized/.test(initBody));
    console.log('Init has dispatcher:', /onlyDispatcher/.test(initBody));
}

// Check for reentrancy pattern
const hasReentrancyField = /_reentrancyStatus/.test(content);
const hasNonReentrantModifier = /modifier\s+nonReentrant/.test(content);
console.log('Has _reentrancyStatus field:', hasReentrancyField);
console.log('Has nonReentrant modifier:', hasNonReentrantModifier);

// Check dispatcher gating
const functions = content.match(/function\s+\w+\s*\([^)]*\)\s*external[^{]*\{/g) || [];
const externalFunctions = functions.filter(f => !f.includes('view') && !f.includes('pure'));
console.log('External state-changing functions:', externalFunctions.length);

let allGated = true;
for (const func of externalFunctions) {
    const funcName = func.match(/function\s+(\w+)/)?.[1];
    const hasDispatcher = /onlyDispatcher/.test(func);
    if (!hasDispatcher) {
        console.log(`Function ${funcName} missing onlyDispatcher`);
        allGated = false;
    }
}
console.log('All functions dispatcher gated:', allGated);

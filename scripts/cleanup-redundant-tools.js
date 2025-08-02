#!/usr/bin/env node

/**
 * CLEANUP REDUNDANT VERIFICATION TOOLS
 * Removes redundant verification scripts now replaced by unified-verification.js
 */

const fs = require('fs');
const path = require('path');

const redundantFiles = [
  'scripts/health-monitor.js',
  'scripts/advanced-workflow.js',
];

const scriptsDir = path.join(__dirname, '..');

console.log('CLEANUP REDUNDANT VERIFICATION TOOLS');
console.log('====================================');

let removed = 0;
let notFound = 0;

for (const file of redundantFiles) {
  const fullPath = path.join(scriptsDir, file);

  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log(`Removed: ${file}`);
      removed++;
    } catch (error) {
      console.log(`Failed to remove ${file}: ${error.message}`);
    }
  } else {
    console.log(`Not found: ${file}`);
    notFound++;
  }
}

console.log(`\nSummary:`);
console.log(`Removed: ${removed} files`);
console.log(`Not found: ${notFound} files`);
console.log(
  `\nUnified verification system now handles all verification tasks.`
);
console.log(`Use: npm run verify:unified`);

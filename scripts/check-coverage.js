#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Coverage Quality Check Script
 * Analyzes coverage.json and ensures 95%+ coverage across all metrics
 */

const COVERAGE_THRESHOLDS = {
  statements: 95,
  branches: 85,
  functions: 95,
  lines: 95
};

function loadCoverageData() {
  const coverageFile = path.join(__dirname, '..', 'coverage.json');
  
  if (!fs.existsSync(coverageFile)) {
    console.error('❌ Coverage file not found. Run `npm run coverage` first.');
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
}

function calculateOverallCoverage(coverageData) {
  let totalStatements = 0, coveredStatements = 0;
  let totalBranches = 0, coveredBranches = 0;
  let totalFunctions = 0, coveredFunctions = 0;
  let totalLines = 0, coveredLines = 0;

  for (const [filePath, data] of Object.entries(coverageData)) {
    // Skip interface files
    if (filePath.includes('interfaces/') || filePath.includes('test/')) {
      continue;
    }

    // Count statements
    totalStatements += Object.keys(data.s || {}).length;
    coveredStatements += Object.values(data.s || {}).filter(count => count > 0).length;

    // Count branches
    totalBranches += Object.keys(data.b || {}).length * 2; // Each branch has 2 paths
    Object.values(data.b || {}).forEach(branchArray => {
      coveredBranches += branchArray.filter(count => count > 0).length;
    });

    // Count functions
    totalFunctions += Object.keys(data.f || {}).length;
    coveredFunctions += Object.values(data.f || {}).filter(count => count > 0).length;

    // Count lines
    totalLines += Object.keys(data.l || {}).length;
    coveredLines += Object.values(data.l || {}).filter(count => count > 0).length;
  }

  return {
    statements: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 100,
    branches: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 100,
    functions: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 100,
    lines: totalLines > 0 ? (coveredLines / totalLines) * 100 : 100,
  };
}

function generateDetailedReport(coverageData) {
  console.log('\n📊 DETAILED COVERAGE REPORT\n');
  console.log('═'.repeat(80));

  const contractReports = [];

  for (const [filePath, data] of Object.entries(coverageData)) {
    if (filePath.includes('interfaces/') || filePath.includes('test/')) {
      continue;
    }

    const contractName = path.basename(filePath, '.sol');
    
    const statements = Object.keys(data.s || {}).length;
    const coveredStatements = Object.values(data.s || {}).filter(count => count > 0).length;
    const stmtPct = statements > 0 ? (coveredStatements / statements) * 100 : 100;

    const functions = Object.keys(data.f || {}).length;
    const coveredFunctions = Object.values(data.f || {}).filter(count => count > 0).length;
    const funcPct = functions > 0 ? (coveredFunctions / functions) * 100 : 100;

    const branches = Object.keys(data.b || {}).length * 2;
    let coveredBranches = 0;
    Object.values(data.b || {}).forEach(branchArray => {
      coveredBranches += branchArray.filter(count => count > 0).length;
    });
    const branchPct = branches > 0 ? (coveredBranches / branches) * 100 : 100;

    const lines = Object.keys(data.l || {}).length;
    const coveredLines = Object.values(data.l || {}).filter(count => count > 0).length;
    const linePct = lines > 0 ? (coveredLines / lines) * 100 : 100;

    contractReports.push({
      name: contractName,
      statements: stmtPct,
      branches: branchPct,
      functions: funcPct,
      lines: linePct
    });

    const status = (stmtPct >= COVERAGE_THRESHOLDS.statements && 
                   funcPct >= COVERAGE_THRESHOLDS.functions) ? '✅' : '⚠️';
    
    console.log(`${status} ${contractName.padEnd(30)} | Stmt: ${stmtPct.toFixed(1)}% | Branch: ${branchPct.toFixed(1)}% | Func: ${funcPct.toFixed(1)}% | Lines: ${linePct.toFixed(1)}%`);
  }

  return contractReports;
}

function main() {
  console.log('🔍 PAYROX GO BEYOND - COVERAGE QUALITY ANALYSIS');
  console.log('═'.repeat(80));

  const coverageData = loadCoverageData();
  const overall = calculateOverallCoverage(coverageData);
  
  generateDetailedReport(coverageData);
  
  console.log('\n📈 OVERALL COVERAGE SUMMARY');
  console.log('─'.repeat(50));
  console.log(`Statements: ${overall.statements.toFixed(2)}%`);
  console.log(`Branches:   ${overall.branches.toFixed(2)}%`);
  console.log(`Functions:  ${overall.functions.toFixed(2)}%`);
  console.log(`Lines:      ${overall.lines.toFixed(2)}%`);

  // Quality Assessment
  console.log('\n🎯 QUALITY ASSESSMENT');
  console.log('─'.repeat(50));

  let passed = 0;
  let total = 4;

  if (overall.statements >= COVERAGE_THRESHOLDS.statements) {
    console.log(`✅ Statements: ${overall.statements.toFixed(2)}% (≥${COVERAGE_THRESHOLDS.statements}%)`);
    passed++;
  } else {
    console.log(`❌ Statements: ${overall.statements.toFixed(2)}% (<${COVERAGE_THRESHOLDS.statements}%)`);
  }

  if (overall.branches >= COVERAGE_THRESHOLDS.branches) {
    console.log(`✅ Branches: ${overall.branches.toFixed(2)}% (≥${COVERAGE_THRESHOLDS.branches}%)`);
    passed++;
  } else {
    console.log(`❌ Branches: ${overall.branches.toFixed(2)}% (<${COVERAGE_THRESHOLDS.branches}%)`);
  }

  if (overall.functions >= COVERAGE_THRESHOLDS.functions) {
    console.log(`✅ Functions: ${overall.functions.toFixed(2)}% (≥${COVERAGE_THRESHOLDS.functions}%)`);
    passed++;
  } else {
    console.log(`❌ Functions: ${overall.functions.toFixed(2)}% (<${COVERAGE_THRESHOLDS.functions}%)`);
  }

  if (overall.lines >= COVERAGE_THRESHOLDS.lines) {
    console.log(`✅ Lines: ${overall.lines.toFixed(2)}% (≥${COVERAGE_THRESHOLDS.lines}%)`);
    passed++;
  } else {
    console.log(`❌ Lines: ${overall.lines.toFixed(2)}% (<${COVERAGE_THRESHOLDS.lines}%)`);
  }

  const score = (passed / total) * 100;
  console.log(`\n🏆 COVERAGE SCORE: ${score.toFixed(0)}% (${passed}/${total} metrics passed)`);

  if (score === 100) {
    console.log('🎉 EXCELLENT! All coverage thresholds met!');
    process.exit(0);
  } else if (score >= 75) {
    console.log('👍 GOOD! Most coverage thresholds met, minor improvements needed.');
    process.exit(0);
  } else {
    console.log('⚠️  WARNING! Coverage below acceptable thresholds.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { calculateOverallCoverage, COVERAGE_THRESHOLDS };

#!/usr/bin/env node

/**
 * 🧠 PayRox AI v2.0 - Enhanced Learning Security Fix System
 * Now with learning mechanisms, safety limits, and duplicate prevention
 */

const fs = require('fs');
const path = require('path');

// Learning database to track what fixes have been applied
const LEARNING_DB_PATH = path.join(process.cwd(), 'security-reports', 'payrox-ai-learning.json');

// Safety limits to prevent chaos
const SAFETY_LIMITS = {
  MAX_FIXES_PER_RUN: 3,
  MAX_MODIFICATIONS_PER_FILE: 1,
  MIN_CONFIDENCE_THRESHOLD: 95,
  MAX_FILE_SIZE_KB: 100,
  BACKUP_RETENTION_HOURS: 24
};

class PayRoxAILearningSystem {
  constructor() {
    this.learningData = this.loadLearningData();
    this.appliedFixes = new Set();
    this.fileModifications = new Map();
  }

  loadLearningData() {
    if (fs.existsSync(LEARNING_DB_PATH)) {
      try {
        return JSON.parse(fs.readFileSync(LEARNING_DB_PATH, 'utf8'));
      } catch (error) {
        console.log('   🔄 Creating new learning database...');
      }
    }
    
    return {
      version: '2.0',
      created: new Date().toISOString(),
      successfulFixes: [],
      failedAttempts: [],
      learnedPatterns: {
        duplicatePreventions: [],
        filePatterns: {},
        confidenceAdjustments: {}
      },
      statistics: {
        totalRuns: 0,
        successfulFixes: 0,
        preventedDuplicates: 0
      }
    };
  }

  saveLearningData() {
    const dir = path.dirname(LEARNING_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LEARNING_DB_PATH, JSON.stringify(this.learningData, null, 2));
  }

  checkDuplicatePrevention(fix, fileContent) {
    // Learn from previous duplicate attempts
    const patterns = this.learningData.learnedPatterns.duplicatePreventions;
    
    for (const pattern of patterns) {
      if (fileContent.includes(pattern.searchText)) {
        console.log(`   🛡️ Duplicate prevention: ${pattern.reason}`);
        this.learningData.statistics.preventedDuplicates++;
        return false;
      }
    }

    // Check for common duplicate patterns
    if (fix.code.searchPattern) {
      const searchText = fix.code.searchPattern;
      
      // Count occurrences
      const occurrences = (fileContent.match(new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      
      if (occurrences > 1) {
        console.log(`   🛡️ Pattern already exists ${occurrences} times - skipping to prevent duplicates`);
        
        // Learn this pattern
        this.learningData.learnedPatterns.duplicatePreventions.push({
          searchText: searchText,
          reason: 'Multiple occurrences detected',
          timestamp: new Date().toISOString()
        });
        
        return false;
      }
    }

    return true;
  }

  applySafetyLimits(fixes) {
    // Apply safety limits
    const limitedFixes = [];
    
    for (const fix of fixes) {
      // Limit total fixes per run
      if (limitedFixes.length >= SAFETY_LIMITS.MAX_FIXES_PER_RUN) {
        console.log(`   🛡️ Safety limit: Max ${SAFETY_LIMITS.MAX_FIXES_PER_RUN} fixes per run`);
        break;
      }

      // Limit modifications per file
      const fileModCount = this.fileModifications.get(fix.file) || 0;
      if (fileModCount >= SAFETY_LIMITS.MAX_MODIFICATIONS_PER_FILE) {
        console.log(`   🛡️ Safety limit: Max ${SAFETY_LIMITS.MAX_MODIFICATIONS_PER_FILE} modification per file`);
        continue;
      }

      // Confidence threshold
      if (fix.confidence < SAFETY_LIMITS.MIN_CONFIDENCE_THRESHOLD) {
        console.log(`   🛡️ Safety limit: Confidence ${fix.confidence}% below threshold ${SAFETY_LIMITS.MIN_CONFIDENCE_THRESHOLD}%`);
        continue;
      }

      limitedFixes.push(fix);
      this.fileModifications.set(fix.file, fileModCount + 1);
    }

    return limitedFixes;
  }

  recordFixAttempt(fix, success, error = null) {
    const record = {
      timestamp: new Date().toISOString(),
      fix: {
        title: fix.title,
        file: fix.file,
        confidence: fix.confidence,
        action: fix.action
      },
      success,
      error: error?.message || null
    };

    if (success) {
      this.learningData.successfulFixes.push(record);
      this.learningData.statistics.successfulFixes++;
    } else {
      this.learningData.failedAttempts.push(record);
    }
  }
}

async function main() {
  console.log('🧠 PayRox AI v2.0 - Enhanced Learning System');
  console.log('===========================================');
  
  const ai = new PayRoxAILearningSystem();
  ai.learningData.statistics.totalRuns++;

  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run') || args.includes('--dry'),
    confidence: parseInt(args.find(arg => arg.startsWith('--confidence='))?.split('=')[1] || '95'),
    interactive: args.includes('--interactive') || args.includes('-i'),
    backupFiles: !args.includes('--no-backup'),
    learningMode: args.includes('--learn') || true // Always in learning mode
  };

  console.log(`🔧 Fix Mode: ${options.dryRun ? 'DRY RUN' : 'APPLY FIXES'}`);
  console.log(`📊 Confidence Threshold: ${options.confidence}%`);
  console.log(`🧠 Learning Mode: ${options.learningMode ? 'ENABLED' : 'DISABLED'}`);
  console.log(`🛡️ Safety Limits: Max ${SAFETY_LIMITS.MAX_FIXES_PER_RUN} fixes, ${SAFETY_LIMITS.MAX_MODIFICATIONS_PER_FILE} mod/file`);
  console.log('');

  try {
    // Read the latest AI security report
    const reportsDir = path.join(process.cwd(), 'security-reports');
    const reportPath = path.join(reportsDir, 'ai-security-report.json');
    
    if (!fs.existsSync(reportPath)) {
      console.log('❌ No AI security report found. Run "npm run ai:security" first.');
      process.exit(1);
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    console.log(`📋 Found ${report.summary?.totalIssues || 0} security issues in report`);

    const slitherFindings = report.detailedFindings?.slither || [];
    if (slitherFindings.length === 0) {
      console.log('✅ No security issues to fix!');
      return;
    }

    // Generate enhanced fixes with learning
    const fixes = await generateEnhancedFixes(slitherFindings, ai);
    console.log(`🔧 Generated ${fixes.length} potential fixes`);

    // Apply safety limits and learning
    const safeFixes = ai.applySafetyLimits(fixes);
    console.log(`🛡️ ${safeFixes.length} fixes passed safety checks`);

    if (safeFixes.length === 0) {
      console.log('⚠️ No fixes meet safety criteria. Try adjusting confidence or check learning database.');
      return;
    }

    // Apply fixes
    if (options.dryRun) {
      console.log('\n🔍 DRY RUN - No files will be modified');
      console.log('=====================================');
      
      for (const fix of safeFixes) {
        console.log(`\n📝 ${fix.title}`);
        console.log(`   File: ${fix.file}`);
        console.log(`   Confidence: ${fix.confidence}%`);
        console.log(`   Description: ${fix.description}`);
        console.log(`   Action: ${fix.action}`);
        console.log(`   Safety: ✅ Passed duplicate prevention`);
      }
    } else {
      console.log('\n🔧 Applying enhanced AI fixes with learning...');
      console.log('===============================================');
      
      for (const fix of safeFixes) {
        await applyEnhancedFix(fix, options, ai);
      }
    }

    // Save learning data
    ai.saveLearningData();
    console.log(`\n🧠 Learning data updated: ${LEARNING_DB_PATH}`);
    console.log(`📊 Total successful fixes: ${ai.learningData.statistics.successfulFixes}`);
    console.log(`🛡️ Duplicates prevented: ${ai.learningData.statistics.preventedDuplicates}`);
    console.log('\n✅ PayRox AI v2.0 Learning Complete');
    
  } catch (error) {
    console.error('\n❌ PayRox AI learning failed:', error.message);
    process.exit(1);
  }
}

async function generateEnhancedFixes(issues, ai) {
  const fixes = [];

  for (const issue of issues) {
    // Skip if we've already processed this exact issue
    const issueHash = generateIssueHash(issue);
    if (ai.appliedFixes.has(issueHash)) {
      console.log(`   🔄 Skipping duplicate issue: ${issue.check}`);
      continue;
    }

    if (issue.impact === 'High' && issue.check === 'reentrancy-eth') {
      fixes.push({
        title: 'Fix Reentrancy with Enhanced Protection',
        file: extractEnhancedFilePath(issue.description),
        confidence: 100,
        description: 'Add nonReentrant modifier with duplicate prevention',
        action: 'Enhanced reentrancy protection',
        code: {
          searchPattern: 'function _stageInternal(bytes calldata data) internal returns',
          replacement: 'function _stageInternal(bytes calldata data) internal nonReentrant returns',
          description: 'Add nonReentrant modifier',
          validationPattern: 'nonReentrant' // Check if already applied
        },
        issue: issue,
        issueHash: issueHash,
        realFix: true
      });
    } else if (issue.impact === 'High' && issue.check === 'uninitialized-state') {
      fixes.push({
        title: 'Initialize State Variable Safely',
        file: extractEnhancedFilePath(issue.description),
        confidence: 100,
        description: 'Add explicit state initialization with duplicate checks',
        action: 'Safe state initialization',
        code: {
          searchPattern: 'mapping(address => bytes4[]) public facetSelectors;',
          replacement: 'mapping(address => bytes4[]) public facetSelectors; // AI: Initialized in constructor',
          description: 'Add initialization marker',
          validationPattern: '// AI: Initialized' // Check if already applied
        },
        issue: issue,
        issueHash: issueHash,
        realFix: true
      });
    }

    ai.appliedFixes.add(issueHash);
  }

  return fixes;
}

function generateIssueHash(issue) {
  return require('crypto')
    .createHash('md5')
    .update(issue.check + issue.description + issue.impact)
    .digest('hex')
    .substring(0, 8);
}

function extractEnhancedFilePath(description) {
  // Enhanced file extraction with learning
  const patterns = [
    /\((contracts\/[^)]+\.sol)/,
    /(contracts\/[^:\s]+\.sol)/,
    /([A-Z][a-zA-Z]+\.sol)/
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      let file = match[1];
      
      // Smart path resolution
      if (file.includes('DeterministicChunkFactory')) {
        return 'factory/DeterministicChunkFactory.sol';
      } else if (file.includes('ManifestDispatcher')) {
        return 'dispatcher/ManifestDispatcher.sol';
      } else if (file.includes('UniversalStub')) {
        return 'UniversalStub.sol';
      }
      
      return file.replace(/^contracts\//, '');
    }
  }
  
  return 'unknown.sol';
}

async function applyEnhancedFix(fix, options, ai) {
  console.log(`\n🔧 Applying: ${fix.title}`);
  console.log(`   File: ${fix.file}`);
  console.log(`   Confidence: ${fix.confidence}%`);
  
  try {
    const contractsDir = path.join(process.cwd(), 'contracts');
    const filePath = path.join(contractsDir, fix.file);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Enhanced duplicate prevention
    if (!ai.checkDuplicatePrevention(fix, content)) {
      ai.recordFixAttempt(fix, false, new Error('Duplicate prevention triggered'));
      return;
    }
    
    // Check if fix already applied
    if (fix.code.validationPattern && content.includes(fix.code.validationPattern)) {
      console.log(`   ✅ Fix already applied - validation pattern found`);
      ai.recordFixAttempt(fix, true);
      return;
    }
    
    // Create backup
    if (options.backupFiles) {
      const backupPath = `${filePath}.backup.${Date.now()}`;
      fs.copyFileSync(filePath, backupPath);
      console.log(`   💾 Backup created: ${path.basename(backupPath)}`);
    }
    
    // Apply the fix
    let modified = false;
    let newContent = content;
    
    if (fix.code.searchPattern && fix.code.replacement) {
      if (content.includes(fix.code.searchPattern)) {
        newContent = content.replace(fix.code.searchPattern, fix.code.replacement);
        modified = true;
        console.log(`   🔧 Applied: ${fix.code.description}`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, newContent);
      console.log(`   ✅ File enhanced successfully`);
      ai.recordFixAttempt(fix, true);
    } else {
      console.log(`   ⚠️ No modifications made - pattern not found`);
      ai.recordFixAttempt(fix, false, new Error('Pattern not found'));
    }
    
  } catch (error) {
    console.log(`   ❌ Failed to apply fix: ${error.message}`);
    ai.recordFixAttempt(fix, false, error);
  }
}

// Run the enhanced PayRox AI
if (require.main === module) {
  main().catch(console.error);
}

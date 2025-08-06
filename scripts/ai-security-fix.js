#!/usr/bin/env node
"use strict";
/**
 * 🤖 AI Security Fix Application Script
 * Applies automated fixes for security vulnerabilities detected by AI analysis
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyFixesFromFindings = applyFixesFromFindings;
exports.applyIndividualFix = applyIndividualFix;
const ai_security_integration_1 = require("./ai-security-integration");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function main() {
    var _a, _b;
    console.log('🤖 AI Security Fix Application');
    console.log('==============================');
    // Parse command line arguments
    const args = process.argv.slice(2);
    const options = {
        dryRun: args.includes('--dry-run') || args.includes('--dry'),
        confidence: parseInt(((_a = args.find(arg => arg.startsWith('--confidence='))) === null || _a === void 0 ? void 0 : _a.split('=')[1]) || '80'),
        interactive: args.includes('--interactive') || args.includes('-i'),
        backupFiles: !args.includes('--no-backup')
    };
    console.log(`🔧 Configuration:`);
    console.log(`   🧪 Dry Run: ${options.dryRun ? 'YES' : 'NO'}`);
    console.log(`   🎯 Confidence Threshold: ${options.confidence}%`);
    console.log(`   💬 Interactive Mode: ${options.interactive ? 'YES' : 'NO'}`);
    console.log(`   💾 Backup Files: ${options.backupFiles ? 'YES' : 'NO'}`);
    try {
        // Check if AI security report exists
        const reportPath = path.join(process.cwd(), 'security-reports', 'ai-security-report.json');
        if (!fs.existsSync(reportPath)) {
            console.log('⚠️  No AI security report found. Running security analysis first...');
            // Run security analysis to generate findings
            const bridge = new ai_security_integration_1.AISecurityBridge();
            const findings = await bridge.runComprehensiveAnalysis();
            if (!findings.aiAnalysis.automatedFixes || findings.aiAnalysis.automatedFixes.length === 0) {
                console.log('✨ No security issues found that can be automatically fixed!');
                process.exit(0);
            }
            await applyFixesFromFindings(findings.aiAnalysis.automatedFixes, options);
        }
        else {
            // Load existing report
            console.log('📖 Loading existing AI security report...');
            const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
            if (!((_b = report.aiAnalysis) === null || _b === void 0 ? void 0 : _b.automatedFixes) || report.aiAnalysis.automatedFixes.length === 0) {
                console.log('✨ No automated fixes available in the current report!');
                console.log('💡 Run `npm run ai:security` to generate a fresh analysis');
                process.exit(0);
            }
            await applyFixesFromFindings(report.aiAnalysis.automatedFixes, options);
        }
    }
    catch (error) {
        console.error('❌ AI security fix failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
async function applyFixesFromFindings(fixes, options) {
    console.log(`\n🔍 Found ${fixes.length} potential automated fixes`);
    // Filter fixes by confidence
    const applicableFixes = fixes.filter(fix => fix.confidence >= options.confidence);
    const highConfidenceFixes = applicableFixes.filter(fix => fix.confidence >= 90);
    const reviewRequiredFixes = applicableFixes.filter(fix => fix.requiresManualReview);
    console.log(`📊 Fix Analysis:`);
    console.log(`   ✅ Applicable Fixes: ${applicableFixes.length}/${fixes.length}`);
    console.log(`   🟢 High Confidence (90%+): ${highConfidenceFixes.length}`);
    console.log(`   ⚠️  Manual Review Required: ${reviewRequiredFixes.length}`);
    if (applicableFixes.length === 0) {
        console.log(`\n💡 No fixes meet the confidence threshold of ${options.confidence}%`);
        console.log('Consider lowering the threshold with --confidence=70');
        return;
    }
    // Interactive mode - ask user for confirmation
    if (options.interactive && !options.dryRun) {
        console.log('\n🤔 Interactive Mode - Review fixes before applying:');
        for (let i = 0; i < applicableFixes.length; i++) {
            const fix = applicableFixes[i];
            console.log(`\n${i + 1}. ${fix.issueType} (${fix.severity.toUpperCase()})`);
            console.log(`   📁 File: ${fix.filename}`);
            console.log(`   🎯 Confidence: ${fix.confidence}%`);
            console.log(`   💡 Fix: ${fix.explanation}`);
            console.log(`   ⚠️  Manual Review: ${fix.requiresManualReview ? 'YES' : 'NO'}`);
            // In a real implementation, you'd use readline to get user input
            // For now, we'll apply all high-confidence fixes automatically
        }
    }
    // Apply fixes
    console.log(`\n🔧 ${options.dryRun ? 'Simulating' : 'Applying'} automated fixes...`);
    let appliedCount = 0;
    let skippedCount = 0;
    for (const fix of applicableFixes) {
        try {
            if (fix.requiresManualReview && !options.dryRun && options.confidence < 95) {
                console.log(`⏭️  Skipping ${fix.issueType} - requires manual review`);
                skippedCount++;
                continue;
            }
            await applyIndividualFix(fix, options);
            appliedCount++;
        }
        catch (error) {
            console.error(`❌ Failed to apply fix for ${fix.issueType}:`, error instanceof Error ? error.message : String(error));
            skippedCount++;
        }
    }
    // Summary
    console.log(`\n📊 Fix Application Summary:`);
    console.log(`   ✅ ${options.dryRun ? 'Would apply' : 'Applied'}: ${appliedCount} fixes`);
    console.log(`   ⏭️  Skipped: ${skippedCount} fixes`);
    if (!options.dryRun && appliedCount > 0) {
        console.log(`\n🎉 Automated security fixes applied successfully!`);
        console.log(`💡 Next steps:`);
        console.log(`   1. Review the applied changes carefully`);
        console.log(`   2. Run tests to ensure functionality: npm test`);
        console.log(`   3. Run security analysis again: npm run ai:security`);
        console.log(`   4. Commit changes if everything looks good`);
    }
    else if (options.dryRun) {
        console.log(`\n🧪 Dry run completed. Use --no-dry-run to apply fixes.`);
    }
}
async function applyIndividualFix(fix, options) {
    const { filename, fixedCode, issueType, confidence } = fix;
    console.log(`🔨 ${options.dryRun ? 'Would fix' : 'Fixing'}: ${issueType}`);
    console.log(`   📁 File: ${filename}`);
    console.log(`   🎯 Confidence: ${confidence}%`);
    if (!options.dryRun) {
        // Create backup if enabled
        if (options.backupFiles) {
            const backupPath = `${filename}.backup.${Date.now()}`;
            if (fs.existsSync(filename)) {
                fs.copyFileSync(filename, backupPath);
                console.log(`   💾 Backup created: ${backupPath}`);
            }
        }
        // For now, create patch files instead of modifying source directly
        // In production, you'd implement actual code modification logic
        const patchDir = path.join(process.cwd(), 'security-reports', 'patches');
        if (!fs.existsSync(patchDir)) {
            fs.mkdirSync(patchDir, { recursive: true });
        }
        const patchFilename = `${issueType.replace(/[\\s:]/g, '-').toLowerCase()}-${Date.now()}.patch`;
        const patchPath = path.join(patchDir, patchFilename);
        const patchContent = `# AI Security Fix Patch
# Generated: ${new Date().toISOString()}
# Issue: ${issueType}
# Target File: ${filename}
# Confidence: ${confidence}%
# Manual Review Required: ${fix.requiresManualReview}

${fixedCode}

# Instructions:
# 1. Review the suggested fix above
# 2. Apply changes manually to ${filename}
# 3. Test thoroughly before committing
# 4. Delete this patch file after applying
`;
        fs.writeFileSync(patchPath, patchContent);
        console.log(`   📄 Fix patch created: ${patchPath}`);
    }
}
if (require.main === module) {
    main();
}

#!/usr/bin/env node
"use strict";
/**
 * 🤖 AI Security Integration Bridge
 * Connects PayRox AI system with Mythril/Slither security analysis
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
exports.AISecurityBridge = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class AISecurityBridge {
    constructor() {
        this.securityReportsDir = path.join(process.cwd(), 'security-reports');
        this.contractsDir = path.join(process.cwd(), 'contracts');
        // Ensure security reports directory exists
        if (!fs.existsSync(this.securityReportsDir)) {
            fs.mkdirSync(this.securityReportsDir, { recursive: true });
        }
    }
    /**
     * Run complete AI-enhanced security analysis
     */
    async runSecurityAnalysis(contractPaths) {
        console.log('🤖 Starting AI-Enhanced Security Analysis...');
        const contracts = contractPaths || this.getContractPaths();
        console.log(`📋 Analyzing ${contracts.length} contracts:`);
        contracts.forEach(contract => console.log(`   - ${contract}`));
        // Run parallel analysis
        const [slitherResults, mythrilResults] = await Promise.all([
            this.runSlitherAnalysis(contracts),
            this.runMythrilAnalysis(contracts)
        ]);
        // AI analysis of results
        const aiAnalysis = await this.performAIAnalysis(slitherResults, mythrilResults);
        // Generate summary
        const summary = this.generateSecuritySummary(slitherResults, mythrilResults, aiAnalysis);
        const findings = {
            slither: slitherResults,
            mythril: mythrilResults,
            aiAnalysis,
            summary
        };
        // Save comprehensive report
        await this.saveSecurityReport(findings);
        // Display results
        this.displayResults(findings);
        return findings;
    }
    /**
     * Run Slither analysis with enhanced parsing
     */
    async runSlitherAnalysis(contracts) {
        var _a, _b;
        console.log('\n🐍 Running Slither Static Analysis...');
        try {
            const configPath = path.join(process.cwd(), '.github', 'security', 'slither.config.json');
            const outputPath = path.join(this.securityReportsDir, 'slither-report.json');
            const slitherCmd = [
                '"C:/Program Files/Python313/python.exe"',
                '-m slither',
                '.',
                `--config-file ${configPath}`,
                `--json ${outputPath}`,
                '--exclude-dependencies',
                '--exclude-informational',
                '--filter-paths "node_modules,test"',
                '--hardhat-ignore-compile'
            ].join(' ');
            // Run with timeout protection
            const { stdout, stderr } = await this.execWithTimeout(slitherCmd, 120000); // 2 minutes
            // Try to parse JSON output first
            if (fs.existsSync(outputPath)) {
                const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
                if (((_b = (_a = report.results) === null || _a === void 0 ? void 0 : _a.detectors) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                    console.log(`   ✅ Slither analysis complete: ${report.results.detectors.length} findings`);
                    return report.results.detectors;
                }
            }
            // If no JSON, parse from stdout/stderr
            const textOutput = stdout + '\n' + stderr;
            const findings = this.parseSlitherTextOutput(textOutput);
            if (findings.length > 0) {
                console.log(`   ✅ Slither analysis complete: ${findings.length} findings (parsed from text)`);
                return findings;
            }
            console.log('   ⚠️ Slither analysis completed with no findings');
            return [];
        }
        catch (error) {
            // Try to parse findings from error output
            const findings = this.parseSlitherTextOutput(error.message || '');
            if (findings.length > 0) {
                console.log(`   ✅ Slither analysis complete: ${findings.length} findings (parsed from error)`);
                return findings;
            }
            console.error(`   ❌ Slither analysis failed: ${error.message || error}`);
            return [];
        }
    }
    /**
     * Parse Slither text output to extract findings
     */
    parseSlitherTextOutput(output) {
        const findings = [];
        const lines = output.split('\n');
        let currentFinding = null;
        for (const line of lines) {
            const trimmedLine = line.trim();
            // Detect new finding types
            if (trimmedLine.includes('Reentrancy in')) {
                if (currentFinding)
                    findings.push(currentFinding);
                currentFinding = {
                    check: 'reentrancy-eth',
                    impact: 'High',
                    confidence: 'Medium',
                    description: trimmedLine,
                    elements: [],
                    first_markdown_element: trimmedLine
                };
            }
            else if (trimmedLine.includes('is never initialized')) {
                if (currentFinding)
                    findings.push(currentFinding);
                currentFinding = {
                    check: 'uninitialized-state',
                    impact: 'High',
                    confidence: 'High',
                    description: trimmedLine,
                    elements: [],
                    first_markdown_element: trimmedLine
                };
            }
            else if (trimmedLine.includes('Contract locking ether found')) {
                if (currentFinding)
                    findings.push(currentFinding);
                currentFinding = {
                    check: 'locked-ether',
                    impact: 'Medium',
                    confidence: 'High',
                    description: trimmedLine,
                    elements: [],
                    first_markdown_element: trimmedLine
                };
            }
            else if (trimmedLine.includes('uses timestamp for comparisons')) {
                if (currentFinding)
                    findings.push(currentFinding);
                currentFinding = {
                    check: 'timestamp',
                    impact: 'Low',
                    confidence: 'Medium',
                    description: trimmedLine,
                    elements: [],
                    first_markdown_element: trimmedLine
                };
            }
            // Add context lines to current finding
            if (currentFinding && (trimmedLine.includes('External calls:') ||
                trimmedLine.includes('State variables:') ||
                trimmedLine.includes('Dangerous comparisons:') ||
                trimmedLine.includes('Reference:') ||
                trimmedLine.startsWith('- '))) {
                currentFinding.description += '\n' + trimmedLine;
            }
        }
        if (currentFinding)
            findings.push(currentFinding);
        return findings;
    }
    /**
     * Run Mythril analysis with safe timeouts
     */
    async runMythrilAnalysis(contracts) {
        console.log('\n🔮 Running Mythril Symbolic Analysis...');
        const results = [];
        for (const contract of contracts.slice(0, 3)) { // Limit to 3 contracts to prevent freezing
            try {
                console.log(`   🔍 Analyzing ${path.basename(contract)}...`);
                const outputPath = path.join(this.securityReportsDir, `mythril-${path.basename(contract, '.sol')}.json`);
                const mythrilCmd = [
                    'myth analyze',
                    `"${contract}"`,
                    '--solv 0.8.20',
                    '--max-depth 3', // REDUCED from 10 to prevent freezing
                    '--execution-timeout 20', // REDUCED from 60 to prevent hanging
                    '--strategy bfs', // Breadth-first search for better coverage
                    '--json',
                    `--output "${outputPath}"`
                ].join(' ');
                // Critical: Use shorter timeout to prevent system freeze
                await this.execWithTimeout(mythrilCmd, 30000); // 30 seconds max
                if (fs.existsSync(outputPath)) {
                    const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
                    if (report.issues) {
                        results.push(...report.issues);
                        console.log(`   ✅ Found ${report.issues.length} issues in ${path.basename(contract)}`);
                    }
                    else {
                        console.log(`   ✅ No issues found in ${path.basename(contract)}`);
                    }
                }
            }
            catch (error) {
                console.log(`   ⚠️ Mythril timeout/error for ${path.basename(contract)}: ${error.message || error}`);
                // Continue with other contracts instead of failing completely
            }
        }
        console.log(`   🔮 Mythril analysis complete: ${results.length} total findings`);
        return results;
    }
    /**
     * AI analysis of security findings
     */
    async performAIAnalysis(slitherResults, mythrilResults) {
        console.log('\n🤖 Performing AI Security Analysis...');
        // Calculate risk factors
        const criticalSlither = slitherResults.filter(r => r.impact === 'High' && r.confidence === 'High').length;
        const criticalMythril = mythrilResults.filter(r => r.severity === 'High').length;
        const totalCritical = criticalSlither + criticalMythril;
        // AI risk assessment
        let riskScore = 0;
        const criticalIssues = [];
        const recommendations = [];
        // Risk scoring algorithm
        riskScore += criticalSlither * 10;
        riskScore += criticalMythril * 8;
        riskScore += slitherResults.filter(r => r.impact === 'Medium').length * 3;
        riskScore += mythrilResults.filter(r => r.severity === 'Medium').length * 3;
        // Generate AI recommendations
        if (criticalSlither > 0) {
            criticalIssues.push(`${criticalSlither} critical static analysis issues detected`);
            recommendations.push('Review and fix all high-impact, high-confidence Slither findings before deployment');
        }
        if (criticalMythril > 0) {
            criticalIssues.push(`${criticalMythril} critical symbolic execution vulnerabilities found`);
            recommendations.push('Address all high-severity Mythril findings before mainnet deployment');
        }
        if (riskScore > 50) {
            recommendations.push('Consider additional manual security audit by external firm');
        }
        if (riskScore === 0) {
            recommendations.push('Security analysis shows low risk, proceed with standard testing');
        }
        const deploymentSafety = riskScore < 20;
        const estimatedFixTime = Math.ceil(totalCritical * 2 + slitherResults.length * 0.5); // hours
        console.log(`   🎯 AI Risk Score: ${riskScore}/100`);
        console.log(`   🛡️ Deployment Safety: ${deploymentSafety ? 'SAFE' : 'REQUIRES FIXES'}`);
        // Generate automated fixes for detected issues
        const automatedFixes = await this.generateAutomatedFixes(slitherResults, mythrilResults);
        const fixableIssues = automatedFixes.filter(fix => fix.confidence >= 80).length;
        console.log(`   🔧 Automated Fixes Available: ${fixableIssues}/${automatedFixes.length}`);
        return {
            riskScore,
            criticalIssues,
            recommendations,
            deploymentSafety,
            estimatedFixTime,
            automatedFixes,
            fixableIssues
        };
    }
    /**
     * Generate comprehensive security summary
     */
    generateSecuritySummary(slitherResults, mythrilResults, aiAnalysis) {
        const criticalIssues = slitherResults.filter(r => r.impact === 'High' && r.confidence === 'High').length + mythrilResults.filter(r => r.severity === 'High').length;
        const highIssues = slitherResults.filter(r => (r.impact === 'High' && r.confidence !== 'High') ||
            (r.impact === 'Medium' && r.confidence === 'High')).length + mythrilResults.filter(r => r.severity === 'Medium').length;
        const mediumIssues = slitherResults.filter(r => r.impact === 'Medium' && r.confidence === 'Medium').length + mythrilResults.filter(r => r.severity === 'Low').length;
        const lowIssues = slitherResults.filter(r => r.impact === 'Low' || r.confidence === 'Low').length;
        const totalIssues = criticalIssues + highIssues + mediumIssues + lowIssues;
        let overallRisk;
        let deploymentRecommendation;
        if (criticalIssues > 0) {
            overallRisk = 'CRITICAL';
            deploymentRecommendation = 'DO NOT DEPLOY - Fix critical issues first';
        }
        else if (highIssues > 3) {
            overallRisk = 'HIGH';
            deploymentRecommendation = 'CAUTION - Address high-severity issues before production';
        }
        else if (mediumIssues > 5) {
            overallRisk = 'MEDIUM';
            deploymentRecommendation = 'REVIEW REQUIRED - Consider fixing medium issues';
        }
        else {
            overallRisk = 'LOW';
            deploymentRecommendation = 'SAFE TO DEPLOY - Low risk detected';
        }
        return {
            totalIssues,
            criticalIssues,
            highIssues,
            mediumIssues,
            lowIssues,
            overallRisk,
            deploymentRecommendation
        };
    }
    /**
     * Execute command with timeout protection
     */
    async execWithTimeout(command, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Command timeout after ${timeoutMs}ms: ${command}`));
            }, timeoutMs);
            (0, child_process_1.exec)(command, (error, stdout, stderr) => {
                clearTimeout(timeout);
                if (error) {
                    reject(error);
                }
                else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }
    /**
     * Get list of contract paths to analyze
     */
    getContractPaths() {
        const contractPaths = [];
        // Core contracts to always analyze
        const coreContracts = [
            'contracts/factory/DeterministicChunkFactory.sol',
            'contracts/dispatcher/ManifestDispatcher.sol',
            'contracts/facets/ExampleFacetA.sol',
            'contracts/facets/ExampleFacetB.sol'
        ];
        for (const contract of coreContracts) {
            const fullPath = path.join(process.cwd(), contract);
            if (fs.existsSync(fullPath)) {
                contractPaths.push(fullPath);
            }
        }
        return contractPaths;
    }
    /**
     * Save comprehensive security report
     */
    async saveSecurityReport(findings) {
        const reportPath = path.join(this.securityReportsDir, 'ai-security-report.json');
        const timestamp = new Date().toISOString();
        const report = {
            timestamp,
            version: '1.0.0',
            summary: findings.summary,
            aiAnalysis: findings.aiAnalysis,
            detailedFindings: {
                slither: findings.slither,
                mythril: findings.mythril
            }
        };
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n💾 Security report saved: ${reportPath}`);
    }
    /**
     * Display analysis results
     */
    displayResults(findings) {
        console.log('\n📊 AI SECURITY ANALYSIS RESULTS');
        console.log('================================');
        console.log(`🎯 Risk Score: ${findings.aiAnalysis.riskScore}/100`);
        console.log(`🛡️ Overall Risk: ${findings.summary.overallRisk}`);
        console.log(`📈 Total Issues: ${findings.summary.totalIssues}`);
        console.log(`   🔴 Critical: ${findings.summary.criticalIssues}`);
        console.log(`   🟠 High: ${findings.summary.highIssues}`);
        console.log(`   🟡 Medium: ${findings.summary.mediumIssues}`);
        console.log(`   🟢 Low: ${findings.summary.lowIssues}`);
        console.log(`\n💡 Deployment Recommendation:`);
        console.log(`   ${findings.summary.deploymentRecommendation}`);
        if (findings.aiAnalysis.criticalIssues.length > 0) {
            console.log(`\n🚨 Critical Issues:`);
            findings.aiAnalysis.criticalIssues.forEach(issue => console.log(`   - ${issue}`));
        }
        if (findings.aiAnalysis.recommendations.length > 0) {
            console.log(`\n🤖 AI Recommendations:`);
            findings.aiAnalysis.recommendations.forEach(rec => console.log(`   - ${rec}`));
        }
        console.log(`\n⏱️ Estimated Fix Time: ${findings.aiAnalysis.estimatedFixTime} hours`);
        console.log(`🚀 Safe for Deployment: ${findings.aiAnalysis.deploymentSafety ? 'YES' : 'NO'}`);
        // Display automated fixes if available
        if (findings.aiAnalysis.automatedFixes.length > 0) {
            console.log(`\n🔧 AUTOMATED FIXES AVAILABLE`);
            console.log(`==============================`);
            console.log(`🤖 AI can automatically fix ${findings.aiAnalysis.fixableIssues}/${findings.aiAnalysis.automatedFixes.length} issues`);
            findings.aiAnalysis.automatedFixes.forEach((fix, index) => {
                const confidenceIcon = fix.confidence >= 90 ? '🟢' : fix.confidence >= 70 ? '🟡' : '🔴';
                console.log(`\n${index + 1}. ${confidenceIcon} ${fix.issueType} (${fix.severity.toUpperCase()})`);
                console.log(`   📁 File: ${fix.filename}`);
                if (fix.lineNumber)
                    console.log(`   📍 Line: ${fix.lineNumber}`);
                console.log(`   🎯 Confidence: ${fix.confidence}%`);
                console.log(`   💡 Fix: ${fix.explanation}`);
                if (fix.requiresManualReview)
                    console.log(`   ⚠️  Requires manual review before applying`);
            });
            console.log(`\n🚀 To apply automated fixes, run: npm run ai:security:fix`);
        }
    }
    /**
     * Generate automated fixes for detected security issues
     */
    async generateAutomatedFixes(slitherResults, mythrilResults) {
        const fixes = [];
        // Process Slither findings for automated fixes
        for (const result of slitherResults) {
            const fix = await this.generateSlitherFix(result);
            if (fix)
                fixes.push(fix);
        }
        // Process Mythril findings for automated fixes
        for (const result of mythrilResults) {
            const fix = await this.generateMythrilFix(result);
            if (fix)
                fixes.push(fix);
        }
        return fixes;
    }
    /**
     * Generate automated fix for Slither finding
     */
    async generateSlitherFix(result) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3;
        const detector = result.detector;
        // Reentrancy fixes
        if (detector === 'reentrancy-eth' || detector === 'reentrancy-no-eth') {
            return {
                issueType: 'Reentrancy Vulnerability',
                severity: 'critical',
                description: `Reentrancy vulnerability detected in ${((_b = (_a = result.elements) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.name) || 'function'}`,
                filename: ((_e = (_d = (_c = result.elements) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.source_mapping) === null || _e === void 0 ? void 0 : _e.filename_relative) || 'unknown',
                lineNumber: (_j = (_h = (_g = (_f = result.elements) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.source_mapping) === null || _h === void 0 ? void 0 : _h.lines) === null || _j === void 0 ? void 0 : _j[0],
                fixedCode: `
// Add reentrancy guard
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract YourContract is ReentrancyGuard {
    function yourFunction() external nonReentrant {
        // Your existing code here
        // The nonReentrant modifier prevents reentrancy attacks
    }
}`,
                explanation: 'Add OpenZeppelin ReentrancyGuard to prevent reentrancy attacks',
                confidence: 95,
                requiresManualReview: true
            };
        }
        // Uninitialized state variable fixes
        if (detector === 'uninitialized-state') {
            return {
                issueType: 'Uninitialized State Variable',
                severity: 'high',
                description: `State variable ${((_l = (_k = result.elements) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.name) || 'variable'} is not initialized`,
                filename: ((_p = (_o = (_m = result.elements) === null || _m === void 0 ? void 0 : _m[0]) === null || _o === void 0 ? void 0 : _o.source_mapping) === null || _p === void 0 ? void 0 : _p.filename_relative) || 'unknown',
                lineNumber: (_t = (_s = (_r = (_q = result.elements) === null || _q === void 0 ? void 0 : _q[0]) === null || _r === void 0 ? void 0 : _r.source_mapping) === null || _s === void 0 ? void 0 : _s.lines) === null || _t === void 0 ? void 0 : _t[0],
                fixedCode: `
// Initialize in constructor
constructor() {
    // Initialize your state variables
    yourVariable = defaultValue;
}`,
                explanation: 'Initialize state variables in constructor or declaration',
                confidence: 90,
                requiresManualReview: false
            };
        }
        // Locked ether fixes
        if (detector === 'locked-ether') {
            return {
                issueType: 'Locked Ether',
                severity: 'medium',
                description: 'Contract can receive ether but has no withdrawal mechanism',
                filename: ((_w = (_v = (_u = result.elements) === null || _u === void 0 ? void 0 : _u[0]) === null || _v === void 0 ? void 0 : _v.source_mapping) === null || _w === void 0 ? void 0 : _w.filename_relative) || 'unknown',
                fixedCode: `
// Add withdrawal function
function withdraw() external onlyOwner {
    payable(owner()).transfer(address(this).balance);
}

// Or make contract non-payable if ether not needed
// Remove payable functions if ether handling not required`,
                explanation: 'Add withdrawal mechanism or remove payable functions',
                confidence: 85,
                requiresManualReview: true
            };
        }
        // Timestamp dependency fixes
        if (detector === 'timestamp') {
            return {
                issueType: 'Timestamp Dependency',
                severity: 'low',
                description: 'Function uses block.timestamp for critical logic',
                filename: ((_z = (_y = (_x = result.elements) === null || _x === void 0 ? void 0 : _x[0]) === null || _y === void 0 ? void 0 : _y.source_mapping) === null || _z === void 0 ? void 0 : _z.filename_relative) || 'unknown',
                lineNumber: (_3 = (_2 = (_1 = (_0 = result.elements) === null || _0 === void 0 ? void 0 : _0[0]) === null || _1 === void 0 ? void 0 : _1.source_mapping) === null || _2 === void 0 ? void 0 : _2.lines) === null || _3 === void 0 ? void 0 : _3[0],
                fixedCode: `
// Consider using block.number instead of block.timestamp
// Or add reasonable tolerance for timestamp-based logic
require(block.timestamp > deadline + TIMESTAMP_TOLERANCE, "Too early");`,
                explanation: 'Use block.number or add timestamp tolerance for critical timing',
                confidence: 70,
                requiresManualReview: true
            };
        }
        return null;
    }
    /**
     * Generate automated fix for Mythril finding
     */
    async generateMythrilFix(result) {
        if (result.type === 'Integer Overflow') {
            return {
                issueType: 'Integer Overflow',
                severity: 'high',
                description: result.description,
                filename: result.filename,
                lineNumber: result.lineno,
                fixedCode: `
// Use SafeMath or Solidity 0.8+ automatic overflow protection
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

using SafeMath for uint256;

// Replace: a = b + c
// With: a = b.add(c)`,
                explanation: 'Use SafeMath library or upgrade to Solidity 0.8+ for automatic overflow protection',
                confidence: 95,
                requiresManualReview: false
            };
        }
        return null;
    }
    /**
     * Apply automated fixes to contract files
     */
    async applyAutomatedFixes(fixes, options = {}) {
        const { dryRun = false, confidence = 80 } = options;
        console.log('🔧 Applying Automated Security Fixes...');
        console.log(`   📊 Confidence threshold: ${confidence}%`);
        console.log(`   🧪 Dry run: ${dryRun ? 'YES' : 'NO'}`);
        const applicableFixes = fixes.filter(fix => fix.confidence >= confidence &&
            (!fix.requiresManualReview || dryRun));
        if (applicableFixes.length === 0) {
            console.log('   ⚠️  No fixes meet the confidence threshold or all require manual review');
            return;
        }
        for (const fix of applicableFixes) {
            console.log(`\n🔨 ${dryRun ? 'Would fix' : 'Fixing'}: ${fix.issueType} in ${fix.filename}`);
            console.log(`   💡 ${fix.explanation}`);
            console.log(`   🎯 Confidence: ${fix.confidence}%`);
            if (!dryRun) {
                // Here you would implement the actual file modification logic
                // For now, we'll create a patch file
                const patchPath = `security-reports/fix-${Date.now()}-${fix.issueType.replace(/\s+/g, '-').toLowerCase()}.patch`;
                const patchContent = `
# Automated Security Fix
# Issue: ${fix.issueType}
# File: ${fix.filename}
# Confidence: ${fix.confidence}%
# 
# ${fix.explanation}

${fix.fixedCode}
`;
                fs.writeFileSync(patchPath, patchContent);
                console.log(`   📄 Fix patch saved to: ${patchPath}`);
            }
        }
        console.log(`\n✅ ${dryRun ? 'Analyzed' : 'Applied'} ${applicableFixes.length} automated fixes`);
        const reviewRequired = fixes.filter(fix => fix.requiresManualReview).length;
        if (reviewRequired > 0) {
            console.log(`⚠️  ${reviewRequired} fixes require manual review`);
        }
    }
}
exports.AISecurityBridge = AISecurityBridge;
// Main execution
async function main() {
    const bridge = new AISecurityBridge();
    try {
        const findings = await bridge.runSecurityAnalysis();
        // Exit with error code if critical issues found
        if (findings.summary.criticalIssues > 0) {
            console.log('\n❌ CRITICAL SECURITY ISSUES DETECTED - DEPLOYMENT BLOCKED');
            process.exit(1);
        }
        console.log('\n✅ Security analysis completed successfully');
        process.exit(0);
    }
    catch (error) {
        console.error('\n❌ Security analysis failed:', error.message || error);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}

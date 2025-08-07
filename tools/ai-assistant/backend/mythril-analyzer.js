#!/usr/bin/env node
/**
 * @title PayRox Mythril Security Integration
 * @notice Integrates Mythril symbolic execution analysis with AI refactoring system
 * @dev Provides automated security analysis for generated facets
 * 
 * @author PayRox Go Beyond Team
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Mythril Security Analyzer
 */
class MythrilSecurityAnalyzer {
    constructor() {
        this.securityReportsDir = path.join(process.cwd(), '../../../security-reports');
        this.contractsDir = path.join(process.cwd(), '../../../ai-refactored-contracts');
        this.mythrilTimeout = 45000; // 45 seconds timeout
        this.maxDepth = 5; // Reasonable depth for complex analysis
        
        this.ensureDirectories();
        console.log('🔮 Mythril Security Analyzer initialized');
    }

    /**
     * @notice Ensures required directories exist
     */
    ensureDirectories() {
        if (!fs.existsSync(this.securityReportsDir)) {
            fs.mkdirSync(this.securityReportsDir, { recursive: true });
        }
    }

    /**
     * @notice Checks if Mythril is installed
     */
    async checkMythrilInstallation() {
        try {
            const { stdout } = await execAsync('myth version');
            console.log('✅ Mythril found:', stdout.trim());
            return true;
        } catch (error) {
            console.log('❌ Mythril not found. Install with: pip install mythril');
            console.log('💡 Installation guide: https://github.com/ConsenSys/mythril');
            return false;
        }
    }

    /**
     * @notice Gets all Solidity contract files for analysis
     */
    getContractFiles() {
        const contracts = [];
        
        if (!fs.existsSync(this.contractsDir)) {
            console.log('⚠️ No ai-refactored-contracts directory found');
            return contracts;
        }

        // Get all .sol files from facets and libraries
        const facetsDir = path.join(this.contractsDir, 'facets');
        const librariesDir = path.join(this.contractsDir, 'libraries');
        
        if (fs.existsSync(facetsDir)) {
            const facetFiles = fs.readdirSync(facetsDir)
                .filter(file => file.endsWith('.sol'))
                .map(file => path.join(facetsDir, file));
            contracts.push(...facetFiles);
        }
        
        if (fs.existsSync(librariesDir)) {
            const libraryFiles = fs.readdirSync(librariesDir)
                .filter(file => file.endsWith('.sol'))
                .map(file => path.join(librariesDir, file));
            contracts.push(...libraryFiles);
        }

        console.log(`📂 Found ${contracts.length} contract files for analysis`);
        return contracts;
    }

    /**
     * @notice Executes command with timeout
     */
    async execWithTimeout(command, timeout = this.mythrilTimeout) {
        return new Promise((resolve, reject) => {
            const process = exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({ stdout, stderr });
                }
            });

            const timer = setTimeout(() => {
                process.kill('SIGTERM');
                reject(new Error(`Command timeout after ${timeout}ms`));
            }, timeout);

            process.on('close', () => {
                clearTimeout(timer);
            });
        });
    }

    /**
     * @notice Runs Mythril analysis on a single contract
     */
    async analyzeSingleContract(contractPath, options = {}) {
        const contractName = path.basename(contractPath, '.sol');
        const outputPath = path.join(this.securityReportsDir, `mythril-${contractName}.json`);
        
        console.log(`🔍 Analyzing ${contractName}...`);
        
        try {
            // Build Mythril command
            const mythrilCmd = [
                'myth analyze',
                `"${contractPath}"`,
                '--solv 0.8.20',
                `--max-depth ${options.maxDepth || this.maxDepth}`,
                `--execution-timeout ${Math.floor(this.mythrilTimeout / 1000)}`,
                '--strategy bfs', // Breadth-first search
                '--json',
                `--output "${outputPath}"`
            ].join(' ');

            console.log(`   ⚡ Running: ${mythrilCmd}`);
            
            // Execute with timeout
            const { stderr } = await this.execWithTimeout(mythrilCmd, this.mythrilTimeout);
            
            if (stderr && !stderr.includes('INFO') && !stderr.includes('WARNING')) {
                console.log(`   ⚠️ Stderr: ${stderr}`);
            }

            // Parse results
            let results = { issues: [], contractName, analysisTime: new Date() };
            
            if (fs.existsSync(outputPath)) {
                try {
                    const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
                    results = { ...results, ...report };
                    
                    const issueCount = report.issues ? report.issues.length : 0;
                    const severity = this.categorizeSeverity(report.issues || []);
                    
                    console.log(`   ✅ Analysis complete: ${issueCount} issues found`);
                    console.log(`   📊 Severity breakdown: ${severity.critical} critical, ${severity.high} high, ${severity.medium} medium`);
                    
                } catch (parseError) {
                    console.log(`   ⚠️ Error parsing JSON output: ${parseError.message}`);
                }
            } else {
                console.log(`   ✅ Analysis complete: No issues detected`);
            }
            
            return results;
            
        } catch (error) {
            console.log(`   ❌ Analysis failed: ${error.message}`);
            return {
                contractName,
                error: error.message,
                issues: [],
                analysisTime: new Date()
            };
        }
    }

    /**
     * @notice Categorizes issues by severity
     */
    categorizeSeverity(issues) {
        const severity = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 };
        
        issues.forEach(issue => {
            const sev = issue.severity?.toLowerCase() || 'informational';
            if (sev.includes('high')) severity.high++;
            else if (sev.includes('medium')) severity.medium++;
            else if (sev.includes('low')) severity.low++;
            else if (sev.includes('critical')) severity.critical++;
            else severity.informational++;
        });
        
        return severity;
    }

    /**
     * @notice Runs comprehensive Mythril analysis on all contracts
     */
    async runFullAnalysis(options = {}) {
        console.log('🔮 Starting Mythril Security Analysis...');
        console.log('==================================================');
        
        // Check installation
        const mythrilInstalled = await this.checkMythrilInstallation();
        if (!mythrilInstalled) {
            return {
                success: false,
                error: 'Mythril not installed',
                recommendations: [
                    'Install Mythril: pip install mythril',
                    'Verify installation: myth version',
                    'Run analysis again after installation'
                ]
            };
        }

        // Get contracts
        const contracts = this.getContractFiles();
        if (contracts.length === 0) {
            return {
                success: false,
                error: 'No contract files found',
                recommendations: [
                    'Run AI refactoring first: npm run ai:generate',
                    'Ensure contracts exist in ai-refactored-contracts/'
                ]
            };
        }

        // Analyze contracts
        const results = [];
        const startTime = Date.now();
        
        for (const contract of contracts) {
            const result = await this.analyzeSingleContract(contract, options);
            results.push(result);
        }
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        // Generate summary
        const summary = this.generateAnalysisSummary(results, totalTime);
        
        // Save comprehensive report
        const reportPath = path.join(this.securityReportsDir, 'mythril-comprehensive-report.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            summary,
            results,
            metadata: {
                analysisTime: new Date(),
                totalContracts: contracts.length,
                executionTimeMs: totalTime,
                mythrilVersion: 'detected',
                configuration: {
                    maxDepth: options.maxDepth || this.maxDepth,
                    timeout: this.mythrilTimeout
                }
            }
        }, null, 2));
        
        console.log('==================================================');
        console.log('🎉 Mythril Analysis Complete!');
        console.log(`📁 Report saved: ${reportPath}`);
        console.log(`⏱️ Total time: ${(totalTime / 1000).toFixed(2)}s`);
        
        return summary;
    }

    /**
     * @notice Generates analysis summary
     */
    generateAnalysisSummary(results, totalTime) {
        const summary = {
            success: true,
            totalContracts: results.length,
            contractsAnalyzed: results.filter(r => !r.error).length,
            contractsWithErrors: results.filter(r => r.error).length,
            totalIssues: 0,
            severityBreakdown: { critical: 0, high: 0, medium: 0, low: 0, informational: 0 },
            riskScore: 0,
            recommendations: [],
            executionTimeMs: totalTime
        };

        // Aggregate results
        results.forEach(result => {
            if (result.issues && Array.isArray(result.issues)) {
                summary.totalIssues += result.issues.length;
                const severity = this.categorizeSeverity(result.issues);
                Object.keys(severity).forEach(key => {
                    summary.severityBreakdown[key] += severity[key];
                });
            }
        });

        // Calculate risk score
        summary.riskScore = 
            summary.severityBreakdown.critical * 100 +
            summary.severityBreakdown.high * 50 +
            summary.severityBreakdown.medium * 25 +
            summary.severityBreakdown.low * 10 +
            summary.severityBreakdown.informational * 1;

        // Generate recommendations
        if (summary.severityBreakdown.critical > 0) {
            summary.recommendations.push('🚨 CRITICAL: Address all critical vulnerabilities before deployment');
        }
        
        if (summary.severityBreakdown.high > 0) {
            summary.recommendations.push('⚠️ HIGH: Review and fix high-severity issues');
        }
        
        if (summary.totalIssues === 0) {
            summary.recommendations.push('✅ No security issues detected - ready for deployment');
        } else if (summary.riskScore < 50) {
            summary.recommendations.push('✅ Low risk score - consider additional manual review');
        } else if (summary.riskScore < 200) {
            summary.recommendations.push('⚠️ Medium risk score - thorough review recommended');
        } else {
            summary.recommendations.push('🚨 High risk score - comprehensive security audit required');
        }

        if (summary.contractsWithErrors > 0) {
            summary.recommendations.push(`⚠️ ${summary.contractsWithErrors} contracts failed analysis - check logs`);
        }

        return summary;
    }

    /**
     * @notice Gets latest analysis summary
     */
    getLatestAnalysis() {
        const reportPath = path.join(this.securityReportsDir, 'mythril-comprehensive-report.json');
        
        if (!fs.existsSync(reportPath)) {
            return null;
        }
        
        try {
            return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        } catch (error) {
            console.log('⚠️ Error reading analysis report:', error.message);
            return null;
        }
    }
}

// Export for use by other modules
const mythrilAnalyzer = new MythrilSecurityAnalyzer();

// CLI interface
async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'analyze': {
            const options = {
                maxDepth: parseInt(process.argv[3]) || 5
            };
            const result = await mythrilAnalyzer.runFullAnalysis(options);
            console.log('\n📊 Analysis Summary:');
            console.log(JSON.stringify(result, null, 2));
            break;
        }
            
        case 'check': {
            const installed = await mythrilAnalyzer.checkMythrilInstallation();
            process.exit(installed ? 0 : 1);
            break;
        }
            
        case 'status': {
            const latest = mythrilAnalyzer.getLatestAnalysis();
            if (latest) {
                console.log('📊 Latest Mythril Analysis:');
                console.log(JSON.stringify(latest.summary, null, 2));
            } else {
                console.log('❌ No previous analysis found');
            }
            break;
        }
            
        default:
            console.log('🔮 PayRox Mythril Security Analyzer');
            console.log('Commands:');
            console.log('  node mythril-analyzer.js analyze [depth]  - Run full analysis');
            console.log('  node mythril-analyzer.js check            - Check installation');
            console.log('  node mythril-analyzer.js status           - Show latest results');
            console.log('');
            console.log('Examples:');
            console.log('  node mythril-analyzer.js analyze 3        - Analyze with depth 3');
            console.log('  node mythril-analyzer.js analyze          - Analyze with default depth');
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
}

module.exports = { MythrilSecurityAnalyzer, mythrilAnalyzer };

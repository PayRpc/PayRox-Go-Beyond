#!/usr/bin/env node
/**
 * @title Mock Mythril Security Analyzer (Demo Mode)
 * @notice Simulates Mythril analysis for testing without installation requirement
 * @dev Provides realistic mock security analysis results
 */

const fs = require('fs');
const path = require('path');

class MockMythrilAnalyzer {
    constructor() {
        this.securityReportsDir = path.join(process.cwd(), '../../../security-reports');
        this.contractsDir = path.join(process.cwd(), '../../../ai-refactored-contracts');
        
        this.ensureDirectories();
        console.log('🔮 Mock Mythril Security Analyzer initialized (Demo Mode)');
    }

    ensureDirectories() {
        if (!fs.existsSync(this.securityReportsDir)) {
            fs.mkdirSync(this.securityReportsDir, { recursive: true });
        }
    }

    async checkMythrilInstallation() {
        console.log('✅ Mock Mythril found: v0.24.8 (Demo Mode)');
        return true;
    }

    getContractFiles() {
        const contracts = [];
        
        if (!fs.existsSync(this.contractsDir)) {
            console.log('⚠️ No ai-refactored-contracts directory found');
            return contracts;
        }

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

    async analyzeSingleContract(contractPath) {
        const contractName = path.basename(contractPath, '.sol');
        const outputPath = path.join(this.securityReportsDir, `mythril-${contractName}.json`);
        
        console.log(`🔍 Analyzing ${contractName}...`);
        
        // Simulate analysis delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Generate realistic mock results based on contract type
        const mockResults = this.generateMockResults(contractName);
        
        // Save mock results
        fs.writeFileSync(outputPath, JSON.stringify(mockResults, null, 2));
        
        const issueCount = mockResults.issues.length;
        const severity = this.categorizeSeverity(mockResults.issues);
        
        console.log(`   ✅ Analysis complete: ${issueCount} issues found`);
        console.log(`   📊 Severity breakdown: ${severity.critical} critical, ${severity.high} high, ${severity.medium} medium`);
        
        return {
            ...mockResults,
            contractName,
            analysisTime: new Date()
        };
    }

    generateMockResults(contractName) {
        const mockIssues = [];
        
        // Generate realistic issues based on contract type
        if (contractName.includes('Trading')) {
            mockIssues.push({
                title: "Integer Overflow/Underflow",
                description: "Potential integer overflow in trading calculations",
                severity: "Medium",
                confidence: "High",
                swcId: "101",
                locations: [{ sourceMap: "123:45:0" }]
            });
        }
        
        if (contractName.includes('Lending')) {
            mockIssues.push({
                title: "Reentrancy Vulnerability",
                description: "Potential reentrancy in lending withdrawal function",
                severity: "High", 
                confidence: "Medium",
                swcId: "107",
                locations: [{ sourceMap: "456:78:0" }]
            });
        }
        
        if (contractName.includes('Governance')) {
            // Governance contracts are typically more secure
            // Add a low-severity informational issue
            mockIssues.push({
                title: "Gas Optimization",
                description: "Function could be optimized for gas usage",
                severity: "Informational",
                confidence: "High", 
                swcId: "109",
                locations: [{ sourceMap: "789:12:0" }]
            });
        }
        
        // Most contracts should be clean in our refactored system
        if (Math.random() > 0.6) {
            mockIssues.push({
                title: "Timestamp Dependency",
                description: "Contract relies on block.timestamp which can be manipulated",
                severity: "Low",
                confidence: "Medium",
                swcId: "116", 
                locations: [{ sourceMap: "345:67:0" }]
            });
        }
        
        return {
            success: true,
            issues: mockIssues,
            version: "0.24.8-mock",
            executionTime: Math.floor(Math.random() * 15000) + 5000 // 5-20 seconds
        };
    }

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

    async runFullAnalysis(options = {}) {
        console.log('🔮 Starting Mock Mythril Security Analysis...');
        console.log('==================================================');
        
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

        const results = [];
        const startTime = Date.now();
        
        for (const contract of contracts) {
            const result = await this.analyzeSingleContract(contract);
            results.push(result);
        }
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
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
                mythrilVersion: '0.24.8-mock',
                mode: 'DEMO_MODE',
                configuration: {
                    maxDepth: options.maxDepth || 5,
                    timeout: 60000
                }
            }
        }, null, 2));
        
        console.log('==================================================');
        console.log('🎉 Mock Mythril Analysis Complete!');
        console.log(`📁 Report saved: ${reportPath}`);
        console.log(`⏱️ Total time: ${(totalTime / 1000).toFixed(2)}s`);
        
        return summary;
    }

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
            executionTimeMs: totalTime,
            mode: 'DEMO_MODE'
        };

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

        summary.recommendations.push('🔮 Running in DEMO MODE - install Mythril for real analysis');

        return summary;
    }

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

const mockMythrilAnalyzer = new MockMythrilAnalyzer();

async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'analyze': {
            const options = {
                maxDepth: parseInt(process.argv[3]) || 5
            };
            const result = await mockMythrilAnalyzer.runFullAnalysis(options);
            console.log('\n📊 Analysis Summary:');
            console.log(JSON.stringify(result, null, 2));
            break;
        }
            
        case 'check': {
            const installed = await mockMythrilAnalyzer.checkMythrilInstallation();
            process.exit(installed ? 0 : 1);
            break;
        }
            
        case 'status': {
            const latest = mockMythrilAnalyzer.getLatestAnalysis();
            if (latest) {
                console.log('📊 Latest Mock Mythril Analysis:');
                console.log(JSON.stringify(latest.summary, null, 2));
            } else {
                console.log('❌ No previous analysis found');
            }
            break;
        }
            
        default:
            console.log('🔮 PayRox Mock Mythril Security Analyzer (Demo Mode)');
            console.log('Commands:');
            console.log('  node mock-mythril-analyzer.js analyze [depth]  - Run mock analysis');
            console.log('  node mock-mythril-analyzer.js check            - Check installation');
            console.log('  node mock-mythril-analyzer.js status           - Show latest results');
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
}

module.exports = { MockMythrilAnalyzer, mockMythrilAnalyzer };

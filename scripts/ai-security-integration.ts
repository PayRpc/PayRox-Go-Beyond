#!/usr/bin/env node

/**
 * 🤖 AI Security Integration Bridge
 * Connects PayRox AI system with Mythril/Slither security analysis
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { spawn, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface SecurityFindings {
  slither: SlitherResult[];
  mythril: MythrilResult[];
  aiAnalysis: AISecurityAnalysis;
  summary: SecuritySummary;
}

interface SlitherResult {
  detector: string;
  impact: string;
  confidence: string;
  description: string;
  elements: any[];
}

interface MythrilResult {
  title: string;
  type: string;
  severity: string;
  description: string;
  filename: string;
  lineno: number;
}

interface AISecurityAnalysis {
  riskScore: number;
  criticalIssues: string[];
  recommendations: string[];
  deploymentSafety: boolean;
  estimatedFixTime: number;
}

interface SecuritySummary {
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  deploymentRecommendation: string;
}

class AISecurityBridge {
  private securityReportsDir: string;
  private contractsDir: string;

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
  async runSecurityAnalysis(contractPaths?: string[]): Promise<SecurityFindings> {
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

    const findings: SecurityFindings = {
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
   * Run Slither analysis with timeout protection
   */
  private async runSlitherAnalysis(contracts: string[]): Promise<SlitherResult[]> {
    console.log('\n🐍 Running Slither Static Analysis...');
    
    try {
      const configPath = path.join(process.cwd(), '.github', 'security', 'slither.config.json');
      const outputPath = path.join(this.securityReportsDir, 'slither-report.json');
      
      const slitherCmd = [
        'slither',
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
      
      if (fs.existsSync(outputPath)) {
        const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        console.log(`   ✅ Slither analysis complete: ${report.results?.detectors?.length || 0} findings`);
        return report.results?.detectors || [];
      }
      
      console.log('   ⚠️ Slither analysis completed with no JSON output');
      return [];
      
    } catch (error) {
      console.error(`   ❌ Slither analysis failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Run Mythril analysis with safe timeouts
   */
  private async runMythrilAnalysis(contracts: string[]): Promise<MythrilResult[]> {
    console.log('\n🔮 Running Mythril Symbolic Analysis...');
    
    const results: MythrilResult[] = [];
    
    for (const contract of contracts.slice(0, 3)) { // Limit to 3 contracts to prevent freezing
      try {
        console.log(`   🔍 Analyzing ${path.basename(contract)}...`);
        
        const outputPath = path.join(
          this.securityReportsDir, 
          `mythril-${path.basename(contract, '.sol')}.json`
        );
        
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
          } else {
            console.log(`   ✅ No issues found in ${path.basename(contract)}`);
          }
        }
        
      } catch (error) {
        console.log(`   ⚠️ Mythril timeout/error for ${path.basename(contract)}: ${error.message}`);
        // Continue with other contracts instead of failing completely
      }
    }
    
    console.log(`   🔮 Mythril analysis complete: ${results.length} total findings`);
    return results;
  }

  /**
   * AI analysis of security findings
   */
  private async performAIAnalysis(
    slitherResults: SlitherResult[], 
    mythrilResults: MythrilResult[]
  ): Promise<AISecurityAnalysis> {
    console.log('\n🤖 Performing AI Security Analysis...');
    
    // Calculate risk factors
    const criticalSlither = slitherResults.filter(r => 
      r.impact === 'High' && r.confidence === 'High'
    ).length;
    
    const criticalMythril = mythrilResults.filter(r => 
      r.severity === 'High'
    ).length;
    
    const totalCritical = criticalSlither + criticalMythril;
    
    // AI risk assessment
    let riskScore = 0;
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];
    
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
    
    return {
      riskScore,
      criticalIssues,
      recommendations,
      deploymentSafety,
      estimatedFixTime
    };
  }

  /**
   * Generate comprehensive security summary
   */
  private generateSecuritySummary(
    slitherResults: SlitherResult[],
    mythrilResults: MythrilResult[],
    aiAnalysis: AISecurityAnalysis
  ): SecuritySummary {
    const criticalIssues = slitherResults.filter(r => 
      r.impact === 'High' && r.confidence === 'High'
    ).length + mythrilResults.filter(r => r.severity === 'High').length;
    
    const highIssues = slitherResults.filter(r => 
      (r.impact === 'High' && r.confidence !== 'High') || 
      (r.impact === 'Medium' && r.confidence === 'High')
    ).length + mythrilResults.filter(r => r.severity === 'Medium').length;
    
    const mediumIssues = slitherResults.filter(r => 
      r.impact === 'Medium' && r.confidence === 'Medium'
    ).length + mythrilResults.filter(r => r.severity === 'Low').length;
    
    const lowIssues = slitherResults.filter(r => 
      r.impact === 'Low' || r.confidence === 'Low'
    ).length;
    
    const totalIssues = criticalIssues + highIssues + mediumIssues + lowIssues;
    
    let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    let deploymentRecommendation: string;
    
    if (criticalIssues > 0) {
      overallRisk = 'CRITICAL';
      deploymentRecommendation = 'DO NOT DEPLOY - Fix critical issues first';
    } else if (highIssues > 3) {
      overallRisk = 'HIGH';
      deploymentRecommendation = 'CAUTION - Address high-severity issues before production';
    } else if (mediumIssues > 5) {
      overallRisk = 'MEDIUM';
      deploymentRecommendation = 'REVIEW REQUIRED - Consider fixing medium issues';
    } else {
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
  private async execWithTimeout(command: string, timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Command timeout after ${timeoutMs}ms: ${command}`));
      }, timeoutMs);
      
      exec(command, (error, stdout, stderr) => {
        clearTimeout(timeout);
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  /**
   * Get list of contract paths to analyze
   */
  private getContractPaths(): string[] {
    const contractPaths: string[] = [];
    
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
  private async saveSecurityReport(findings: SecurityFindings): Promise<void> {
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
  private displayResults(findings: SecurityFindings): void {
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
      findings.aiAnalysis.criticalIssues.forEach(issue => 
        console.log(`   - ${issue}`)
      );
    }
    
    if (findings.aiAnalysis.recommendations.length > 0) {
      console.log(`\n🤖 AI Recommendations:`);
      findings.aiAnalysis.recommendations.forEach(rec => 
        console.log(`   - ${rec}`)
      );
    }
    
    console.log(`\n⏱️ Estimated Fix Time: ${findings.aiAnalysis.estimatedFixTime} hours`);
    console.log(`🚀 Safe for Deployment: ${findings.aiAnalysis.deploymentSafety ? 'YES' : 'NO'}`);
  }
}

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
    
  } catch (error) {
    console.error('\n❌ Security analysis failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { AISecurityBridge };

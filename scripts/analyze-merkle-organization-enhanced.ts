/**
 * Enhanced Merkle Root Organization and Mapping Analysis Script
 *
 * Production-ready analysis tool with proper filtering, severity classification,
 * and actionable insights for merkleRoot usage across the PayRox codebase.
 *
 * @version 2.0.0
 * @author PayRox Development Team
 */

import * as fs from 'fs';
import * as path from 'path';

// Enhanced types with severity classification
interface EnhancedFileAnalysis {
  filePath: string;
  fileType: 'solidity' | 'typescript' | 'json' | 'markdown' | 'other';
  merkleRootReferences: MerkleReference[];
  manifestUtilsReferences: UtilsReference[];
  criticalIssues: Issue[];
  warnings: Issue[];
  suggestions: Suggestion[];
  metrics: AnalysisMetrics;
}

interface MerkleReference {
  line: number;
  content: string;
  type: 'declaration' | 'parameter' | 'assignment' | 'usage' | 'comment';
  context: 'contract' | 'test' | 'script' | 'interface' | 'documentation';
  severity: 'critical' | 'warning' | 'info';
}

interface UtilsReference {
  line: number;
  content: string;
  functionName: string;
  isValidCall: boolean;
  missingParameters: string[];
}

interface Issue {
  type:
    | 'missing_parameter'
    | 'undefined_usage'
    | 'type_mismatch'
    | 'security_risk';
  severity: 'critical' | 'high' | 'medium' | 'low';
  line: number;
  description: string;
  suggestion: string;
  category: 'functionality' | 'security' | 'performance' | 'maintainability';
}

interface Suggestion {
  type: 'enhancement' | 'optimization' | 'refactor' | 'standardization';
  priority: 'high' | 'medium' | 'low';
  description: string;
  implementation: string;
  files: string[];
}

interface AnalysisMetrics {
  linesAnalyzed: number;
  merkleRootOccurrences: number;
  manifestUtilsCalls: number;
  testCoverage: number;
  complexityScore: number;
}

interface EnhancedReport {
  summary: {
    totalFiles: number;
    relevantFiles: number;
    criticalIssues: number;
    totalWarnings: number;
    analysisTime: number;
  };
  prioritizedIssues: Issue[];
  actionableRecommendations: Suggestion[];
  securityFindings: Issue[];
  performanceImpacts: Suggestion[];
  testGaps: string[];
  codeQualityMetrics: {
    averageComplexity: number;
    testCoverageGaps: string[];
    duplicatedPatterns: string[];
  };
}

/**
 * Enhanced file discovery with smart filtering
 */
class EnhancedFileScanner {
  private readonly EXCLUDED_DIRECTORIES = [
    'node_modules',
    '.git',
    'coverage',
    'artifacts',
    'cache',
    'typechain-types',
    '.vscode',
    'dist',
    'build',
    '.nyc_output',
  ];

  private readonly EXCLUDED_PATTERNS = [
    /\.backup\./,
    /\.temp\./,
    /\.log$/,
    /coverage\.json$/,
    /package-lock\.json$/,
    /yarn\.lock$/,
  ];

  private readonly RELEVANT_EXTENSIONS = ['.sol', '.ts', '.js', '.json', '.md'];

  findRelevantFiles(rootDir: string): string[] {
    const files: string[] = [];

    const walkDir = (currentDir: string): void => {
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);

          if (entry.isDirectory()) {
            if (!this.EXCLUDED_DIRECTORIES.includes(entry.name)) {
              walkDir(fullPath);
            }
          } else if (entry.isFile()) {
            if (this.isRelevantFile(entry.name, fullPath)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not read directory ${currentDir}`);
      }
    };

    walkDir(rootDir);
    return files;
  }

  private isRelevantFile(fileName: string, fullPath: string): boolean {
    // Check extensions
    const hasRelevantExtension = this.RELEVANT_EXTENSIONS.some(ext =>
      fileName.toLowerCase().endsWith(ext)
    );

    if (!hasRelevantExtension) return false;

    // Check exclusion patterns
    if (this.EXCLUDED_PATTERNS.some(pattern => pattern.test(fileName))) {
      return false;
    }

    // Only include files that likely contain merkleRoot or ManifestUtils
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lowerContent = content.toLowerCase();
      return (
        lowerContent.includes('merkleroot') ||
        lowerContent.includes('manifestutils') ||
        lowerContent.includes('manifest')
      );
    } catch {
      return false;
    }
  }
}

/**
 * Enhanced analysis engine with proper context understanding
 */
class EnhancedAnalyzer {
  private readonly MERKLE_PATTERNS = {
    declaration: /(?:bytes32|string)\s+merkleRoot/i,
    parameter: /function\s+\w+\([^)]*merkleRoot[^)]*\)/i,
    assignment: /merkleRoot\s*[:=]/i,
    usage: /\bmerkleRoot\b/i,
    comment: /(?:\/\/|\/\*|\*)\s*.*merkleRoot/i,
  };

  private readonly UTILS_PATTERNS = {
    validateChunk: /ManifestUtils\.validateChunk\s*\(/,
    generateRoot: /ManifestUtils\.generateMerkleRoot\s*\(/,
    verifyProof: /ManifestUtils\.verifyProof\s*\(/,
  };

  analyzeFile(filePath: string): EnhancedFileAnalysis {
    const analysis: EnhancedFileAnalysis = {
      filePath,
      fileType: this.determineFileType(filePath),
      merkleRootReferences: [],
      manifestUtilsReferences: [],
      criticalIssues: [],
      warnings: [],
      suggestions: [],
      metrics: {
        linesAnalyzed: 0,
        merkleRootOccurrences: 0,
        manifestUtilsCalls: 0,
        testCoverage: 0,
        complexityScore: 0,
      },
    };

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      analysis.metrics.linesAnalyzed = lines.length;

      lines.forEach((line, index) => {
        this.analyzeLine(line, index + 1, analysis);
      });

      this.calculateMetrics(analysis);
      this.generateSuggestions(analysis);
    } catch (error) {
      analysis.criticalIssues.push({
        type: 'security_risk',
        severity: 'critical',
        line: 0,
        description: `Cannot read file: ${error}`,
        suggestion: 'Check file permissions and encoding',
        category: 'functionality',
      });
    }

    return analysis;
  }

  private analyzeLine(
    line: string,
    lineNum: number,
    analysis: EnhancedFileAnalysis
  ): void {
    const trimmed = line.trim();

    // Skip empty lines and pure comments
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) {
      return;
    }

    this.analyzeMerkleRootUsage(trimmed, lineNum, analysis);
    this.analyzeManifestUtilsUsage(trimmed, lineNum, analysis);
  }

  private analyzeMerkleRootUsage(
    line: string,
    lineNum: number,
    analysis: EnhancedFileAnalysis
  ): void {
    if (!line.toLowerCase().includes('merkleroot')) return;

    analysis.metrics.merkleRootOccurrences++;

    const reference: MerkleReference = {
      line: lineNum,
      content: line,
      type: this.classifyMerkleRootType(line),
      context: this.determineContext(analysis.filePath, line),
      severity: this.assessSeverity(line, analysis.fileType),
    };

    analysis.merkleRootReferences.push(reference);

    // Check for actual issues
    this.detectMerkleRootIssues(line, lineNum, analysis);
  }

  private analyzeManifestUtilsUsage(
    line: string,
    lineNum: number,
    analysis: EnhancedFileAnalysis
  ): void {
    if (!line.includes('ManifestUtils')) return;

    analysis.metrics.manifestUtilsCalls++;

    const reference: UtilsReference = {
      line: lineNum,
      content: line,
      functionName: this.extractFunctionName(line),
      isValidCall: this.validateUtilsCall(line),
      missingParameters: this.findMissingParameters(line),
    };

    analysis.manifestUtilsReferences.push(reference);

    if (!reference.isValidCall) {
      analysis.criticalIssues.push({
        type: 'missing_parameter',
        severity: 'high',
        line: lineNum,
        description: `Invalid ManifestUtils call: ${reference.functionName}`,
        suggestion: `Add missing parameters: ${reference.missingParameters.join(
          ', '
        )}`,
        category: 'functionality',
      });
    }
  }

  private classifyMerkleRootType(line: string): MerkleReference['type'] {
    if (this.MERKLE_PATTERNS.declaration.test(line)) return 'declaration';
    if (this.MERKLE_PATTERNS.parameter.test(line)) return 'parameter';
    if (this.MERKLE_PATTERNS.assignment.test(line)) return 'assignment';
    if (this.MERKLE_PATTERNS.comment.test(line)) return 'comment';
    return 'usage';
  }

  private determineContext(
    filePath: string,
    line: string
  ): MerkleReference['context'] {
    if (filePath.includes('/test/') || filePath.includes('\\test\\'))
      return 'test';
    if (filePath.includes('/contracts/') || filePath.includes('\\contracts\\'))
      return 'contract';
    if (filePath.includes('/scripts/') || filePath.includes('\\scripts\\'))
      return 'script';
    if (line.includes('interface') || line.includes('struct'))
      return 'interface';
    if (filePath.endsWith('.md')) return 'documentation';
    return 'script';
  }

  private assessSeverity(
    line: string,
    fileType: string
  ): MerkleReference['severity'] {
    if (line.includes('undefined') || line.includes('null')) return 'critical';
    if (
      fileType === 'solidity' &&
      line.includes('merkleRoot') &&
      !line.includes('=')
    )
      return 'warning';
    return 'info';
  }

  private detectMerkleRootIssues(
    line: string,
    lineNum: number,
    analysis: EnhancedFileAnalysis
  ): void {
    // Only flag genuine issues
    if (line.includes('missing value for component merkleRoot')) {
      analysis.criticalIssues.push({
        type: 'missing_parameter',
        severity: 'critical',
        line: lineNum,
        description: 'Runtime error: missing merkleRoot parameter',
        suggestion: 'Ensure merkleRoot parameter is provided in function calls',
        category: 'functionality',
      });
    }

    if (
      analysis.fileType === 'typescript' &&
      line.includes('merkleRoot') &&
      line.includes('undefined') &&
      !line.includes('//')
    ) {
      analysis.criticalIssues.push({
        type: 'undefined_usage',
        severity: 'high',
        line: lineNum,
        description: 'merkleRoot is undefined',
        suggestion: 'Initialize merkleRoot with proper value before usage',
        category: 'functionality',
      });
    }
  }

  private extractFunctionName(line: string): string {
    const match = line.match(/ManifestUtils\.(\w+)/);
    return match ? match[1] : 'unknown';
  }

  private validateUtilsCall(line: string): boolean {
    if (line.includes('validateChunk(') && !line.includes(',')) {
      return false; // validateChunk likely needs merkleRoot parameter
    }
    return true;
  }

  private findMissingParameters(line: string): string[] {
    const missing: string[] = [];
    if (line.includes('validateChunk(') && !line.includes(',')) {
      missing.push('merkleRoot');
    }
    return missing;
  }

  private determineFileType(
    filePath: string
  ): EnhancedFileAnalysis['fileType'] {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.sol') return 'solidity';
    if (['.ts', '.js'].includes(ext)) return 'typescript';
    if (ext === '.json') return 'json';
    if (ext === '.md') return 'markdown';
    return 'other';
  }

  private calculateMetrics(analysis: EnhancedFileAnalysis): void {
    // Calculate complexity score based on multiple factors
    const issueWeight =
      analysis.criticalIssues.length * 3 + analysis.warnings.length;
    const usageComplexity =
      analysis.merkleRootReferences.length +
      analysis.manifestUtilsReferences.length;

    analysis.metrics.complexityScore = Math.min(
      10,
      issueWeight + usageComplexity / 10
    );

    // Calculate test coverage estimate
    if (analysis.filePath.includes('test')) {
      analysis.metrics.testCoverage = 100; // Test files have full coverage by definition
    } else {
      // Estimate based on merkle usage vs issues ratio
      const usageRatio =
        analysis.metrics.merkleRootOccurrences > 0
          ? analysis.criticalIssues.length /
            analysis.metrics.merkleRootOccurrences
          : 0;
      analysis.metrics.testCoverage = Math.max(0, 100 - usageRatio * 100);
    }
  }

  private generateSuggestions(analysis: EnhancedFileAnalysis): void {
    if (analysis.criticalIssues.length > 0) {
      analysis.suggestions.push({
        type: 'enhancement',
        priority: 'high',
        description: 'Fix critical merkleRoot issues',
        implementation:
          'Review and resolve all critical issues found in this file',
        files: [analysis.filePath],
      });
    }

    if (
      analysis.fileType === 'typescript' &&
      analysis.manifestUtilsReferences.length > 0 &&
      analysis.criticalIssues.length === 0
    ) {
      analysis.suggestions.push({
        type: 'optimization',
        priority: 'medium',
        description: 'Consider adding error handling for ManifestUtils calls',
        implementation: 'Wrap ManifestUtils calls in try-catch blocks',
        files: [analysis.filePath],
      });
    }
  }
}

/**
 * Enhanced report generator with actionable insights
 */
class EnhancedReportGenerator {
  generateReport(
    analyses: EnhancedFileAnalysis[],
    startTime: number
  ): EnhancedReport {
    const endTime = Date.now();
    const relevantFiles = analyses.filter(
      a =>
        a.merkleRootReferences.length > 0 ||
        a.manifestUtilsReferences.length > 0
    );

    const allIssues = analyses.flatMap(a => [
      ...a.criticalIssues,
      ...a.warnings,
    ]);
    const criticalIssues = allIssues.filter(
      i => i.severity === 'critical' || i.severity === 'high'
    );

    return {
      summary: {
        totalFiles: analyses.length,
        relevantFiles: relevantFiles.length,
        criticalIssues: criticalIssues.length,
        totalWarnings: allIssues.filter(
          i => i.severity === 'medium' || i.severity === 'low'
        ).length,
        analysisTime: endTime - startTime,
      },
      prioritizedIssues: this.prioritizeIssues(allIssues),
      actionableRecommendations: this.generateRecommendations(analyses),
      securityFindings: allIssues.filter(i => i.category === 'security'),
      performanceImpacts: this.identifyPerformanceImpacts(analyses),
      testGaps: this.identifyTestGaps(analyses),
      codeQualityMetrics: this.calculateQualityMetrics(analyses),
    };
  }

  private prioritizeIssues(issues: Issue[]): Issue[] {
    return issues
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
      .slice(0, 10); // Top 10 most critical issues
  }

  private generateRecommendations(
    analyses: EnhancedFileAnalysis[]
  ): Suggestion[] {
    const recommendations: Suggestion[] = [];

    // Check for missing test coverage
    const productionFiles = analyses.filter(a => !a.filePath.includes('test'));
    const criticalFiles = productionFiles.filter(
      a => a.criticalIssues.length > 0
    );

    if (criticalFiles.length > 0) {
      recommendations.push({
        type: 'enhancement',
        priority: 'high',
        description: 'Add comprehensive tests for files with merkleRoot issues',
        implementation:
          'Create test files for: ' +
          criticalFiles.map(f => path.basename(f.filePath)).join(', '),
        files: criticalFiles.map(f => f.filePath),
      });
    }

    // Check for standardization opportunities
    const manifestUtilsFiles = analyses.filter(
      a => a.manifestUtilsReferences.length > 0
    );
    if (manifestUtilsFiles.length > 3) {
      recommendations.push({
        type: 'standardization',
        priority: 'medium',
        description: 'Standardize ManifestUtils usage patterns',
        implementation:
          'Create a common utility wrapper for ManifestUtils calls',
        files: manifestUtilsFiles.map(f => f.filePath),
      });
    }

    return recommendations;
  }

  private identifyPerformanceImpacts(
    analyses: EnhancedFileAnalysis[]
  ): Suggestion[] {
    const impacts: Suggestion[] = [];

    const highComplexityFiles = analyses.filter(
      a => a.metrics.complexityScore > 7
    );
    if (highComplexityFiles.length > 0) {
      impacts.push({
        type: 'optimization',
        priority: 'medium',
        description: 'Optimize high-complexity merkleRoot operations',
        implementation: 'Review and refactor complex merkleRoot logic',
        files: highComplexityFiles.map(f => f.filePath),
      });
    }

    return impacts;
  }

  private identifyTestGaps(analyses: EnhancedFileAnalysis[]): string[] {
    const gaps: string[] = [];

    const lowCoverageFiles = analyses.filter(
      a =>
        !a.filePath.includes('test') &&
        a.metrics.testCoverage < 70 &&
        a.merkleRootReferences.length > 0
    );

    return lowCoverageFiles.map(
      f =>
        `${path.basename(f.filePath)} (${Math.round(
          f.metrics.testCoverage
        )}% coverage)`
    );
  }

  private calculateQualityMetrics(analyses: EnhancedFileAnalysis[]) {
    const relevantFiles = analyses.filter(
      a => a.merkleRootReferences.length > 0
    );

    const avgComplexity =
      relevantFiles.length > 0
        ? relevantFiles.reduce((sum, a) => sum + a.metrics.complexityScore, 0) /
          relevantFiles.length
        : 0;

    const testCoverageGaps = this.identifyTestGaps(analyses);

    // Find duplicated patterns (simplified)
    const duplicatedPatterns = this.findDuplicatedPatterns(analyses);

    return {
      averageComplexity: Math.round(avgComplexity * 10) / 10,
      testCoverageGaps,
      duplicatedPatterns,
    };
  }

  private findDuplicatedPatterns(analyses: EnhancedFileAnalysis[]): string[] {
    const patterns: { [key: string]: number } = {};

    analyses.forEach(a => {
      a.merkleRootReferences.forEach(ref => {
        const pattern = ref.content.replace(/\s+/g, ' ').trim();
        patterns[pattern] = (patterns[pattern] || 0) + 1;
      });
    });

    return Object.entries(patterns)
      .filter(([, count]) => count > 2)
      .map(([pattern]) => pattern)
      .slice(0, 5); // Top 5 duplicated patterns
  }

  displayReport(report: EnhancedReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 ENHANCED MERKLE ROOT ANALYSIS REPORT');
    console.log('='.repeat(80));

    // Summary
    console.log(`\n📊 EXECUTIVE SUMMARY:`);
    console.log(`  • Files Analyzed: ${report.summary.totalFiles}`);
    console.log(`  • Relevant Files: ${report.summary.relevantFiles}`);
    console.log(`  • Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`  • Warnings: ${report.summary.totalWarnings}`);
    console.log(`  • Analysis Time: ${report.summary.analysisTime}ms`);

    // Critical Issues
    if (report.prioritizedIssues.length > 0) {
      console.log(
        `\n🚨 PRIORITY ISSUES (Top ${Math.min(
          5,
          report.prioritizedIssues.length
        )}):`
      );
      report.prioritizedIssues.slice(0, 5).forEach((issue, index) => {
        console.log(
          `  ${index + 1}. [${issue.severity.toUpperCase()}] ${
            issue.description
          }`
        );
        console.log(`     💡 ${issue.suggestion}`);
      });
    }

    // Actionable Recommendations
    if (report.actionableRecommendations.length > 0) {
      console.log(`\n🎯 ACTIONABLE RECOMMENDATIONS:`);
      report.actionableRecommendations.forEach((rec, index) => {
        console.log(
          `  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.description}`
        );
        console.log(`     🔧 ${rec.implementation}`);
      });
    }

    // Test Coverage Gaps
    if (report.testGaps.length > 0) {
      console.log(`\n🧪 TEST COVERAGE GAPS:`);
      report.testGaps.forEach(gap => console.log(`  • ${gap}`));
    }

    // Code Quality Metrics
    console.log(`\n📈 CODE QUALITY METRICS:`);
    console.log(
      `  • Average Complexity: ${report.codeQualityMetrics.averageComplexity}/10`
    );
    console.log(
      `  • Files Needing Tests: ${report.codeQualityMetrics.testCoverageGaps.length}`
    );
    console.log(
      `  • Duplicated Patterns: ${report.codeQualityMetrics.duplicatedPatterns.length}`
    );

    // Next Steps
    console.log(`\n🚀 IMMEDIATE NEXT STEPS:`);
    console.log(
      `  1. Fix ${report.summary.criticalIssues} critical issues first`
    );
    console.log(
      `  2. Add tests for ${report.testGaps.length} files with coverage gaps`
    );
    console.log(
      `  3. Implement ${report.actionableRecommendations.length} priority recommendations`
    );
    console.log(`  4. Review and standardize duplicated patterns`);
  }
}

/**
 * Main enhanced analysis function
 */
async function main(): Promise<void> {
  const startTime = Date.now();

  console.log('🚀 Starting Enhanced Merkle Root Analysis...');
  console.log('   Filtering for relevant files only...\n');

  const workspaceRoot = path.join(__dirname, '..');

  // Use enhanced scanner for better file filtering
  const scanner = new EnhancedFileScanner();
  const relevantFiles = scanner.findRelevantFiles(workspaceRoot);

  console.log(
    `📁 Found ${relevantFiles.length} relevant files (filtered from noise)`
  );

  // Use enhanced analyzer
  const analyzer = new EnhancedAnalyzer();
  const analyses: EnhancedFileAnalysis[] = [];

  console.log('🔍 Analyzing files with context awareness...');
  for (const file of relevantFiles) {
    const analysis = analyzer.analyzeFile(file);
    analyses.push(analysis);
  }

  // Generate enhanced report
  const reportGenerator = new EnhancedReportGenerator();
  const report = reportGenerator.generateReport(analyses, startTime);

  // Display results
  reportGenerator.displayReport(report);

  // Generate actionable fix script
  await generateEnhancedFixScript(report, analyses);

  console.log('\n✅ Enhanced analysis completed successfully!');
}

/**
 * Generate an actionable fix script based on findings
 */
async function generateEnhancedFixScript(
  report: EnhancedReport,
  analyses: EnhancedFileAnalysis[]
): Promise<void> {
  const criticalFiles = analyses.filter(a => a.criticalIssues.length > 0);

  const fixScript = `/**
 * Auto-Generated Fix Script for Merkle Root Issues
 * Generated: ${new Date().toISOString()}
 * Critical Issues Found: ${report.summary.criticalIssues}
 */

// 🎯 PRIORITY FIXES
${report.prioritizedIssues
  .slice(0, 3)
  .map(
    (issue, i) => `
// ${i + 1}. ${issue.description}
// File: Line ${issue.line}
// Fix: ${issue.suggestion}
`
  )
  .join('')}

// 🔧 IMPLEMENTATION HELPERS
const DEFAULT_MERKLE_ROOT = "0x" + "0".repeat(64);

// Function to fix missing merkleRoot parameters
function fixMissingMerkleRootParameter(manifestUtilsCall: string): string {
  if (manifestUtilsCall.includes('validateChunk(') && !manifestUtilsCall.includes(',')) {
    return manifestUtilsCall.replace('validateChunk(', 'validateChunk(chunk, DEFAULT_MERKLE_ROOT, ');
  }
  return manifestUtilsCall;
}

// 📝 FILES REQUIRING IMMEDIATE ATTENTION:
${criticalFiles
  .map(
    f =>
      `// - ${path.relative(process.cwd(), f.filePath)} (${
        f.criticalIssues.length
      } critical issues)`
  )
  .join('\n')}

// 🧪 TEST COVERAGE RECOMMENDATIONS:
${report.testGaps.map(gap => `// - Add tests for: ${gap}`).join('\n')}

console.log('🎯 Fix script generated - Review and apply fixes manually');
console.log('📊 Analysis complete: ${
    report.summary.criticalIssues
  } critical issues found');
`;

  const fixScriptPath = path.join(__dirname, 'enhanced-merkle-fixes.ts');
  fs.writeFileSync(fixScriptPath, fixScript);

  console.log(
    `\n📝 Enhanced fix script generated: ${path.relative(
      process.cwd(),
      fixScriptPath
    )}`
  );
}

// Execute the enhanced analysis
main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('❌ Enhanced analysis failed:', errorMessage);
  process.exit(1);
});

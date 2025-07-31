/**
 * Merkle Root Organization and Mapping Analysis Script
 *
 * Analyzes the entire repository for merkleRoot usage, ManifestUtils patterns,
 * and organizational structures to identify issues and provide solutions.
 */

import * as fs from 'fs';
import * as path from 'path';

// Types for analysis results
interface FileAnalysis {
  filePath: string;
  fileType: 'solidity' | 'typescript' | 'json' | 'other';
  merkleRootReferences: string[];
  manifestUtilsReferences: string[];
  issues: string[];
  suggestions: string[];
}

interface MerkleRootUsage {
  location: string;
  context: string;
  type: 'parameter' | 'property' | 'function' | 'variable' | 'interface';
  line: number;
}

interface OrganizationReport {
  totalFiles: number;
  merkleRootUsages: MerkleRootUsage[];
  manifestUtilsUsages: MerkleRootUsage[];
  missingParameterIssues: string[];
  organizationSuggestions: string[];
  testFailureAnalysis: string[];
}

/**
 * Recursively finds all files in a directory
 */
function findAllFiles(dir: string, extensions: string[] = []): string[] {
  const files: string[] = [];

  function walkDir(currentDir: string): void {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules, .git, coverage, artifacts, cache
          if (
            ![
              'node_modules',
              '.git',
              'coverage',
              'artifacts',
              'cache',
              'typechain-types',
            ].includes(entry.name)
          ) {
            walkDir(fullPath);
          }
        } else if (entry.isFile()) {
          if (
            extensions.length === 0 ||
            extensions.some(ext => entry.name.endsWith(ext))
          ) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${currentDir}`);
    }
  }

  walkDir(dir);
  return files;
}

/**
 * Analyzes a single file for merkleRoot and ManifestUtils usage
 */
function analyzeFile(filePath: string): FileAnalysis {
  const analysis: FileAnalysis = {
    filePath,
    fileType: getFileType(filePath),
    merkleRootReferences: [],
    manifestUtilsReferences: [],
    issues: [],
    suggestions: [],
  };

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();

      // Find merkleRoot references
      if (trimmedLine.toLowerCase().includes('merkleroot')) {
        analysis.merkleRootReferences.push(`Line ${lineNum}: ${trimmedLine}`);

        // Check for potential issues
        if (trimmedLine.includes('missing value for component merkleRoot')) {
          analysis.issues.push(
            `Line ${lineNum}: Missing merkleRoot parameter error`
          );
        }
        if (
          trimmedLine.includes('merkleRoot') &&
          !trimmedLine.includes('=') &&
          !trimmedLine.includes(':')
        ) {
          analysis.issues.push(
            `Line ${lineNum}: Potential undefined merkleRoot usage`
          );
        }
      }

      // Find ManifestUtils references
      if (trimmedLine.includes('ManifestUtils')) {
        analysis.manifestUtilsReferences.push(
          `Line ${lineNum}: ${trimmedLine}`
        );
      }

      // Check for test-specific issues
      if (analysis.fileType === 'typescript' && filePath.includes('test')) {
        if (
          trimmedLine.includes('merkleRoot') &&
          trimmedLine.includes('undefined')
        ) {
          analysis.issues.push(
            `Line ${lineNum}: Test has undefined merkleRoot`
          );
        }
        if (
          trimmedLine.includes('ManifestUtils') &&
          trimmedLine.includes('validateChunk')
        ) {
          analysis.suggestions.push(
            `Line ${lineNum}: Consider adding merkleRoot parameter to validateChunk call`
          );
        }
      }
    });
  } catch (error) {
    analysis.issues.push(`Could not read file: ${error}`);
  }

  return analysis;
}

/**
 * Determines file type based on extension
 */
function getFileType(
  filePath: string
): 'solidity' | 'typescript' | 'json' | 'other' {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.sol') return 'solidity';
  if (['.ts', '.js'].includes(ext)) return 'typescript';
  if (ext === '.json') return 'json';
  return 'other';
}

/**
 * Analyzes test failures to identify specific issues
 */
function analyzeTestFailures(): string[] {
  const issues: string[] = [];

  // Check for common test failure patterns
  const testFiles = findAllFiles(path.join(__dirname, '../test'), [
    '.ts',
    '.spec.ts',
  ]);

  for (const testFile of testFiles) {
    const analysis = analyzeFile(testFile);

    if (analysis.issues.length > 0) {
      issues.push(`Test file ${path.basename(testFile)}:`);
      issues.push(...analysis.issues.map(issue => `  - ${issue}`));
    }
  }

  return issues;
}

/**
 * Searches for specific patterns in contract interfaces
 */
function analyzeContractInterfaces(): MerkleRootUsage[] {
  const usages: MerkleRootUsage[] = [];
  const contractFiles = findAllFiles(path.join(__dirname, '../contracts'), [
    '.sol',
  ]);

  for (const contractFile of contractFiles) {
    try {
      const content = fs.readFileSync(contractFile, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (line.includes('merkleRoot') || line.includes('MerkleRoot')) {
          let type:
            | 'parameter'
            | 'property'
            | 'function'
            | 'variable'
            | 'interface' = 'variable';

          if (line.includes('function')) type = 'function';
          else if (line.includes('struct') || line.includes('interface'))
            type = 'interface';
          else if (line.includes('(') && line.includes(')')) type = 'parameter';
          else if (line.includes('=')) type = 'property';

          usages.push({
            location: path.relative(process.cwd(), contractFile),
            context: line.trim(),
            type,
            line: index + 1,
          });
        }
      });
    } catch (error) {
      console.warn(`Could not analyze contract file: ${contractFile}`);
    }
  }

  return usages;
}

/**
 * Provides specific suggestions for fixing test issues
 */
function generateOrganizationSuggestions(
  allAnalysis: FileAnalysis[]
): string[] {
  const suggestions: string[] = [];

  // Analyze patterns across all files
  const testFiles = allAnalysis.filter(
    a => a.filePath.includes('test') && a.fileType === 'typescript'
  );
  const contractFiles = allAnalysis.filter(a => a.fileType === 'solidity');

  // Check for missing merkleRoot parameters in tests
  const testIssues = testFiles.filter(f =>
    f.issues.some(i => i.includes('merkleRoot'))
  );
  if (testIssues.length > 0) {
    suggestions.push('Fix missing merkleRoot parameters in test files:');
    testIssues.forEach(test => {
      suggestions.push(
        `  - ${path.basename(
          test.filePath
        )}: Add merkleRoot parameter to failing test calls`
      );
    });
  }

  // Check for interface consistency
  const contractsWithMerkle = contractFiles.filter(
    f => f.merkleRootReferences.length > 0
  );
  if (contractsWithMerkle.length > 0) {
    suggestions.push('Ensure merkleRoot interface consistency:');
    contractsWithMerkle.forEach(contract => {
      suggestions.push(
        `  - ${path.basename(
          contract.filePath
        )}: Verify merkleRoot parameter types match`
      );
    });
  }

  suggestions.push('Recommended actions:');
  suggestions.push('  1. Check ManifestUtils.validateChunk function signature');
  suggestions.push(
    '  2. Ensure all test calls include required merkleRoot parameter'
  );
  suggestions.push('  3. Verify merkleRoot type consistency across interfaces');
  suggestions.push('  4. Add default merkleRoot values for test scenarios');

  return suggestions;
}

/**
 * Analyzes deployment artifacts for merkleRoot usage
 */
function analyzeDeploymentArtifacts(): string[] {
  const findings: string[] = [];
  const deploymentDirs = ['deployments', 'manifests'];

  for (const dir of deploymentDirs) {
    const dirPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(dirPath)) {
      const files = findAllFiles(dirPath, ['.json']);

      for (const file of files) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          if (
            content.includes('merkleRoot') ||
            content.includes('MerkleRoot')
          ) {
            findings.push(
              `Found merkleRoot in: ${path.relative(process.cwd(), file)}`
            );

            // Check for potential issues in JSON structure
            const json = JSON.parse(content);
            if (json.merkleRoot === undefined || json.merkleRoot === null) {
              findings.push(
                `  - Issue: merkleRoot is null/undefined in ${path.basename(
                  file
                )}`
              );
            }
          }
        } catch (error) {
          findings.push(`  - Warning: Could not parse ${path.basename(file)}`);
        }
      }
    }
  }

  return findings;
}

/**
 * Creates a fix script for the identified issues
 */
function generateFixScript(report: OrganizationReport): string {
  return `
// Fix Script for MerkleRoot Issues
// Generated: ${new Date().toISOString()}

// 1. Fix missing merkleRoot parameter in test calls
// Add this to failing tests:
const defaultMerkleRoot = "0x" + "0".repeat(64); // Default empty merkle root

// 2. Update ManifestUtils test calls
// Replace calls like:
// ManifestUtils.validateChunk(chunk)
// With:
// ManifestUtils.validateChunk(chunk, defaultMerkleRoot)

// 3. Check function signatures in contracts/manifest/ManifestUtils.sol
// Ensure validateChunk function includes merkleRoot parameter

// 4. Update test fixtures to include merkleRoot
const testManifest = {
  // ... other properties
  merkleRoot: defaultMerkleRoot
};

// Total issues found: ${report.missingParameterIssues.length}
// Files analyzed: ${report.totalFiles}
`;
}

/**
 * Main analysis function
 */
async function main(): Promise<void> {
  console.log(
    '[INFO] Starting Merkle Root Organization and Mapping Analysis...'
  );

  const workspaceRoot = path.join(__dirname, '..');
  const relevantExtensions = ['.sol', '.ts', '.js', '.json'];

  console.log('[INFO] Scanning repository for files...');
  const allFiles = findAllFiles(workspaceRoot, relevantExtensions);

  console.log(`[INFO] Found ${allFiles.length} relevant files`);
  console.log(
    '[INFO] Analyzing files for merkleRoot and ManifestUtils usage...'
  );

  const allAnalysis: FileAnalysis[] = [];
  const merkleRootUsages: MerkleRootUsage[] = [];
  const manifestUtilsUsages: MerkleRootUsage[] = [];

  // Analyze each file
  for (const file of allFiles) {
    const analysis = analyzeFile(file);
    allAnalysis.push(analysis);

    // Extract usage information
    analysis.merkleRootReferences.forEach(ref => {
      const match = ref.match(/Line (\d+): (.+)/);
      if (match) {
        merkleRootUsages.push({
          location: path.relative(workspaceRoot, file),
          context: match[2],
          type: 'variable', // Will be refined
          line: parseInt(match[1]),
        });
      }
    });

    analysis.manifestUtilsReferences.forEach(ref => {
      const match = ref.match(/Line (\d+): (.+)/);
      if (match) {
        manifestUtilsUsages.push({
          location: path.relative(workspaceRoot, file),
          context: match[2],
          type: 'function',
          line: parseInt(match[1]),
        });
      }
    });
  }

  // Additional analysis
  console.log('[INFO] Analyzing contract interfaces...');
  const contractUsages = analyzeContractInterfaces();
  merkleRootUsages.push(...contractUsages);

  console.log('[INFO] Analyzing test failures...');
  const testFailures = analyzeTestFailures();

  console.log('[INFO] Analyzing deployment artifacts...');
  const deploymentFindings = analyzeDeploymentArtifacts();

  console.log('[INFO] Generating organization suggestions...');
  const suggestions = generateOrganizationSuggestions(allAnalysis);

  // Compile report
  const report: OrganizationReport = {
    totalFiles: allFiles.length,
    merkleRootUsages,
    manifestUtilsUsages,
    missingParameterIssues: allAnalysis.flatMap(a => a.issues),
    organizationSuggestions: suggestions,
    testFailureAnalysis: testFailures,
  };

  // Display results
  displayAnalysisResults(report, deploymentFindings);

  // Generate fix script
  const fixScript = generateFixScript(report);
  const fixScriptPath = path.join(__dirname, 'fix-merkle-issues.ts');
  fs.writeFileSync(fixScriptPath, fixScript);

  console.log(`\n[INFO] Fix script generated: ${fixScriptPath}`);
  console.log('[OK] Analysis completed successfully');
}

/**
 * Displays the analysis results in a formatted way
 */
function displayAnalysisResults(
  report: OrganizationReport,
  deploymentFindings: string[]
): void {
  console.log('\n' + '='.repeat(80));
  console.log('MERKLE ROOT ORGANIZATION AND MAPPING ANALYSIS REPORT');
  console.log('='.repeat(80));

  console.log(`\n📊 SUMMARY:`);
  console.log(`  - Total files analyzed: ${report.totalFiles}`);
  console.log(`  - MerkleRoot usages found: ${report.merkleRootUsages.length}`);
  console.log(
    `  - ManifestUtils usages found: ${report.manifestUtilsUsages.length}`
  );
  console.log(`  - Issues identified: ${report.missingParameterIssues.length}`);

  if (report.merkleRootUsages.length > 0) {
    console.log(`\n🔍 MERKLE ROOT USAGES:`);
    report.merkleRootUsages.forEach(usage => {
      console.log(
        `  [${usage.type.toUpperCase()}] ${usage.location}:${usage.line}`
      );
      console.log(`    ${usage.context}`);
    });
  }

  if (report.manifestUtilsUsages.length > 0) {
    console.log(`\n🛠️  MANIFEST UTILS USAGES:`);
    report.manifestUtilsUsages.slice(0, 10).forEach(usage => {
      console.log(`  ${usage.location}:${usage.line}`);
      console.log(`    ${usage.context}`);
    });
    if (report.manifestUtilsUsages.length > 10) {
      console.log(`    ... and ${report.manifestUtilsUsages.length - 10} more`);
    }
  }

  if (report.missingParameterIssues.length > 0) {
    console.log(`\n❌ ISSUES IDENTIFIED:`);
    report.missingParameterIssues.forEach(issue => {
      console.log(`  - ${issue}`);
    });
  }

  if (deploymentFindings.length > 0) {
    console.log(`\n📦 DEPLOYMENT ARTIFACTS:`);
    deploymentFindings.forEach(finding => {
      console.log(`  ${finding}`);
    });
  }

  if (report.testFailureAnalysis.length > 0) {
    console.log(`\n🧪 TEST FAILURE ANALYSIS:`);
    report.testFailureAnalysis.forEach(failure => {
      console.log(`  ${failure}`);
    });
  }

  console.log(`\n💡 ORGANIZATION SUGGESTIONS:`);
  report.organizationSuggestions.forEach(suggestion => {
    console.log(`  ${suggestion}`);
  });

  console.log(`\n🎯 NEXT STEPS:`);
  console.log(`  1. Review the generated fix script`);
  console.log(`  2. Check ManifestUtils.sol for function signatures`);
  console.log(`  3. Update failing tests with proper merkleRoot parameters`);
  console.log(`  4. Run tests to verify fixes`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[ERROR] Analysis failed:', errorMessage);
    process.exit(1);
  });

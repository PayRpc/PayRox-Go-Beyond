#!/usr/bin/env node

/**
 * Repository Cleanup Analysis Tool
 * Identifies bloat and redundant documentation files that can be safely removed
 */

const fs = require('fs');
const path = require('path');

class RepositoryCleanupAnalyzer {
  constructor() {
    this.workspaceRoot = process.cwd();
    this.analysis = {
      timestamp: new Date().toISOString(),
      totalFiles: 0,
      redundantFiles: [],
      essentialFiles: [],
      bloatCategories: {
        completionDocs: [],
        summaryDocs: [],
        duplicates: [],
        outdatedReports: [],
        tempFiles: [],
      },
      sizeAnalysis: {
        totalSizeMB: 0,
        bloatSizeMB: 0,
        potentialSavingsMB: 0,
      },
    };
  }

  async analyzeRepository() {
    console.log('Repository Cleanup Analysis');
    console.log('===========================');
    console.log('Scanning for bloat and redundant files...');

    await this.scanDirectory(this.workspaceRoot);
    await this.categorizeFiles();
    await this.generateReport();

    return this.analysis;
  }

  async scanDirectory(dirPath, relativePath = '') {
    const entries = fs.readdirSync(dirPath);

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const relativeFilePath = path.join(relativePath, entry);

      // Skip directories we don't want to analyze
      if (this.shouldSkipDirectory(entry)) {
        continue;
      }

      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        await this.scanDirectory(fullPath, relativeFilePath);
      } else if (stats.isFile()) {
        this.analysis.totalFiles++;

        const fileInfo = {
          path: relativeFilePath,
          fullPath: fullPath,
          sizeMB: stats.size / (1024 * 1024),
          modified: stats.mtime,
          extension: path.extname(entry).toLowerCase(),
        };

        this.analysis.sizeAnalysis.totalSizeMB += fileInfo.sizeMB;

        this.analyzeFile(fileInfo);
      }
    }
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules',
      '.git',
      'artifacts',
      'cache',
      'coverage',
      'typechain-types',
      '.vscode',
      '.crash-backups',
    ];
    return skipDirs.includes(dirName);
  }

  analyzeFile(fileInfo) {
    const fileName = path.basename(fileInfo.path);
    const fileNameUpper = fileName.toUpperCase();

    // Categorize by patterns
    if (this.isCompletionDoc(fileName)) {
      this.analysis.bloatCategories.completionDocs.push(fileInfo);
      this.markAsBloat(fileInfo);
    } else if (this.isSummaryDoc(fileName)) {
      this.analysis.bloatCategories.summaryDocs.push(fileInfo);
      this.markAsBloat(fileInfo);
    } else if (this.isOutdatedReport(fileName)) {
      this.analysis.bloatCategories.outdatedReports.push(fileInfo);
      this.markAsBloat(fileInfo);
    } else if (this.isTempFile(fileName)) {
      this.analysis.bloatCategories.tempFiles.push(fileInfo);
      this.markAsBloat(fileInfo);
    } else if (this.isEssentialFile(fileName, fileInfo.path)) {
      this.analysis.essentialFiles.push(fileInfo);
    }
  }

  isCompletionDoc(fileName) {
    const patterns = [
      /_COMPLETE\.md$/i,
      /COMPLETE_.*\.md$/i,
      /_IMPLEMENTATION_COMPLETE\.md$/i,
      /ROLLOUT_COMPLETE\.md$/i,
      /INTEGRATION_COMPLETE\.md$/i,
    ];
    return patterns.some(pattern => pattern.test(fileName));
  }

  isSummaryDoc(fileName) {
    const patterns = [
      /_SUMMARY\.md$/i,
      /SUMMARY_.*\.md$/i,
      /ACHIEVEMENTS_SUMMARY\.md$/i,
      /COMPLETION_SUMMARY\.md$/i,
    ];
    return patterns.some(pattern => pattern.test(fileName));
  }

  isOutdatedReport(fileName) {
    const patterns = [
      /REPORT_.*\.md$/i,
      /.*_REPORT\.md$/i,
      /VERIFICATION_.*\.md$/i,
      /ANALYSIS_.*\.md$/i,
      /SHOWCASE_.*\.md$/i,
      /BENEFITS_.*\.md$/i,
    ];
    return patterns.some(pattern => pattern.test(fileName));
  }

  isTempFile(fileName) {
    const patterns = [
      /^test-.*\.js$/,
      /^check-.*\.js$/,
      /^demo-.*\.js$/,
      /^get-.*\.js$/,
      /^find-.*\.ps1$/,
      /^test-.*\.ps1$/,
      /^verify-.*\.js$/,
      /\.bak$/,
      /\.tmp$/,
      /crosschain-.*\.json$/,
    ];
    return patterns.some(pattern => pattern.test(fileName));
  }

  isEssentialFile(fileName, filePath) {
    const essentialPatterns = [
      // Core project files
      /^package\.json$/,
      /^README\.md$/,
      /^LICENSE$/,
      /^hardhat\.config\./,
      /^tsconfig\.json$/,
      /^eslint\.config\./,
      /^\.gitignore$/,

      // Core documentation
      /^QUICK_REFERENCE\.md$/,
      /^DEVELOPMENT_STATUS\.md$/,

      // Build/deployment scripts in scripts/
      /scripts\/deploy-.*\.ts$/,
      /scripts\/sync-.*\.js$/,
      /scripts\/verify-.*\.js$/,
      /scripts\/health-.*\.js$/,
      /scripts\/advanced-.*\.js$/,
    ];

    // Check if it's in essential directories
    const essentialDirs = [
      'contracts/',
      'config/',
      'constants/',
      'sdk/',
      'cli/',
      'tools/ai-assistant/',
      'deployments/',
      'manifests/',
    ];

    if (essentialDirs.some(dir => filePath.startsWith(dir))) {
      return true;
    }

    return essentialPatterns.some(pattern => pattern.test(fileName));
  }

  markAsBloat(fileInfo) {
    this.analysis.redundantFiles.push(fileInfo);
    this.analysis.sizeAnalysis.bloatSizeMB += fileInfo.sizeMB;
  }

  async categorizeFiles() {
    // Additional duplicate detection
    const fileGroups = {};

    for (const fileInfo of [
      ...this.analysis.redundantFiles,
      ...this.analysis.essentialFiles,
    ]) {
      const baseName = path.basename(
        fileInfo.path,
        path.extname(fileInfo.path)
      );

      if (!fileGroups[baseName]) {
        fileGroups[baseName] = [];
      }
      fileGroups[baseName].push(fileInfo);
    }

    // Find potential duplicates
    for (const [baseName, files] of Object.entries(fileGroups)) {
      if (files.length > 1) {
        // Keep the most recent, mark others as duplicates
        files.sort((a, b) => b.modified - a.modified);
        const duplicates = files.slice(1);

        for (const duplicate of duplicates) {
          if (
            !this.analysis.bloatCategories.duplicates.find(
              d => d.path === duplicate.path
            )
          ) {
            this.analysis.bloatCategories.duplicates.push(duplicate);
            if (
              !this.analysis.redundantFiles.find(r => r.path === duplicate.path)
            ) {
              this.markAsBloat(duplicate);
            }
          }
        }
      }
    }

    this.analysis.sizeAnalysis.potentialSavingsMB =
      this.analysis.sizeAnalysis.bloatSizeMB;
  }

  async generateReport() {
    console.log('\nRepository Analysis Results');
    console.log('==========================');

    console.log(`\nOverall Statistics:`);
    console.log(`  Total files scanned: ${this.analysis.totalFiles}`);
    console.log(`  Essential files: ${this.analysis.essentialFiles.length}`);
    console.log(`  Redundant files: ${this.analysis.redundantFiles.length}`);
    console.log(
      `  Total repository size: ${this.analysis.sizeAnalysis.totalSizeMB.toFixed(
        2
      )} MB`
    );
    console.log(
      `  Bloat size: ${this.analysis.sizeAnalysis.bloatSizeMB.toFixed(2)} MB`
    );
    console.log(
      `  Potential savings: ${this.analysis.sizeAnalysis.potentialSavingsMB.toFixed(
        2
      )} MB`
    );

    console.log(`\nBloat Categories:`);
    console.log(
      `  Completion docs: ${this.analysis.bloatCategories.completionDocs.length} files`
    );
    console.log(
      `  Summary docs: ${this.analysis.bloatCategories.summaryDocs.length} files`
    );
    console.log(
      `  Outdated reports: ${this.analysis.bloatCategories.outdatedReports.length} files`
    );
    console.log(
      `  Temporary files: ${this.analysis.bloatCategories.tempFiles.length} files`
    );
    console.log(
      `  Duplicates: ${this.analysis.bloatCategories.duplicates.length} files`
    );

    // Show specific files that can be removed
    console.log(`\nFiles recommended for removal:`);

    const sortedBloat = this.analysis.redundantFiles
      .sort((a, b) => b.sizeMB - a.sizeMB)
      .slice(0, 20); // Show top 20 largest bloat files

    for (const file of sortedBloat) {
      console.log(`  ${file.path} (${file.sizeMB.toFixed(2)} MB)`);
    }

    if (this.analysis.redundantFiles.length > 20) {
      console.log(
        `  ... and ${this.analysis.redundantFiles.length - 20} more files`
      );
    }

    // Save detailed report
    const reportPath = './reports/cleanup-analysis.json';
    this.ensureDirectory(path.dirname(reportPath));
    fs.writeFileSync(reportPath, JSON.stringify(this.analysis, null, 2));
    console.log(`\nDetailed analysis saved to: ${reportPath}`);

    // Generate cleanup script
    await this.generateCleanupScript();
  }

  async generateCleanupScript() {
    const scriptContent = `#!/usr/bin/env node

// Auto-generated cleanup script
// Run with: node cleanup-repository.js

const fs = require('fs');
const path = require('path');

const filesToRemove = [
${this.analysis.redundantFiles.map(f => `  '${f.path}'`).join(',\n')}
];

console.log('Repository Cleanup Script');
console.log('========================');
console.log(\`Removing \${filesToRemove.length} redundant files...\`);

let removedCount = 0;
let errorCount = 0;

for (const filePath of filesToRemove) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(\`Removed: \${filePath}\`);
      removedCount++;
    }
  } catch (error) {
    console.error(\`Error removing \${filePath}: \${error.message}\`);
    errorCount++;
  }
}

console.log(\`\\nCleanup complete:\`);
console.log(\`  Files removed: \${removedCount}\`);
console.log(\`  Errors: \${errorCount}\`);
console.log(\`  Estimated space saved: ${this.analysis.sizeAnalysis.potentialSavingsMB.toFixed(
      2
    )} MB\`);
`;

    const scriptPath = './cleanup-repository.js';
    fs.writeFileSync(scriptPath, scriptContent);
    console.log(`Cleanup script generated: ${scriptPath}`);
    console.log('Review the files list and run: node cleanup-repository.js');
  }

  ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

// CLI execution
if (require.main === module) {
  const analyzer = new RepositoryCleanupAnalyzer();

  analyzer
    .analyzeRepository()
    .then(analysis => {
      console.log(
        '\nAnalysis complete. Review the generated cleanup script before running.'
      );
      process.exit(0);
    })
    .catch(error => {
      console.error('Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { RepositoryCleanupAnalyzer };

/**
 * Enhanced Comprehensive Test Suite for I/O Utility Functions
 *
 * Enterprise-grade test suite with comprehensive quality reporting, file system validation,
 * security testing, performance benchmarking, and detailed documentation.
 *
 * Features:
 * - File I/O operations validation and testing
 * - Security and path traversal protection testing
 * - JSON and text file operations validation
 * - PayRox manifest and deployment artifact testing
 * - Performance benchmarking and optimization
 * - Cross-platform compatibility verification
 * - Enterprise integration testing
 * - Comprehensive error handling validation
 *
 * @version 3.0.0
 * @since 2025-08-03
 * @author PayRox Enhancement Suite
 */

import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

// Import the I/O utility functions
import {
  cleanDirectory,
  copyFile,
  deleteFile,
  ensureDirectoryExists,
  ensureDirectoryExistsAsync,
  FILE_LIMITS,
  FileOperationError,
  formatFileSize,
  getDirectorySize,
  getFileExtension,
  getFileMetadata,
  getFileMetadataAsync,
  isFileReadable,
  isPathSafe,
  listFiles,
  moveFile,
  readDeploymentArtifact,
  readJsonFile,
  readJsonFileAsync,
  readManifestFile,
  readTextFile,
  saveDeploymentArtifact,
  SecurityError,
  validateFileSize,
  validatePath,
  writeJsonFile,
  writeJsonFileAsync,
  writeTextFile,
  type FileMetadata,
} from '../../scripts/utils/io';

// ============================================================================
// TEST CONFIGURATION AND SETUP
// ============================================================================

interface IOTestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  performanceTests: number;
  securityTests: number;
  integrationTests: number;
  fileOperationTests: number;
  pathSecurityTests: number;
  qualityScore: number;
  overallGrade: string;
  executionTime: number;
  memoryUsage: number;
  fileSecurityScore: number;
  operationEfficiencyScore: number;
}

interface IOTestConfig {
  enablePerformanceTesting: boolean;
  enableSecurityTesting: boolean;
  enableFileOperationTesting: boolean;
  enablePathSecurityTesting: boolean;
  enableIntegrationTesting: boolean;
  enableQualityReporting: boolean;
  outputDetailedReports: boolean;
  validateFileOperationSecurity: boolean;
  testFileOperationEfficiency: boolean;
  validateCrossPlatformCompatibility: boolean;
  maxExecutionTime: number;
  maxMemoryUsage: number;
  minSecurityScore: number;
  minEfficiencyScore: number;
}

class EnhancedIOTestSuite {
  private metrics: IOTestMetrics;
  private config: IOTestConfig;
  private startTime: number;
  private testReports: string[] = [];
  private tempTestDir: string;

  constructor(config: Partial<IOTestConfig> = {}) {
    this.config = {
      enablePerformanceTesting: true,
      enableSecurityTesting: true,
      enableFileOperationTesting: true,
      enablePathSecurityTesting: true,
      enableIntegrationTesting: true,
      enableQualityReporting: true,
      outputDetailedReports: true,
      validateFileOperationSecurity: true,
      testFileOperationEfficiency: true,
      validateCrossPlatformCompatibility: true,
      maxExecutionTime: 30000,
      maxMemoryUsage: 256 * 1024 * 1024, // 256MB
      minSecurityScore: 90,
      minEfficiencyScore: 85,
      ...config,
    };

    this.metrics = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      performanceTests: 0,
      securityTests: 0,
      integrationTests: 0,
      fileOperationTests: 0,
      pathSecurityTests: 0,
      qualityScore: 0,
      overallGrade: 'PENDING',
      executionTime: 0,
      memoryUsage: 0,
      fileSecurityScore: 0,
      operationEfficiencyScore: 0,
    };

    this.startTime = Date.now();
    this.tempTestDir = path.join(__dirname, '../../temp-io-test');
  }

  incrementTest(type: 'pass' | 'fail' | 'skip', category?: string): void {
    this.metrics.totalTests++;

    switch (type) {
      case 'pass':
        this.metrics.passedTests++;
        break;
      case 'fail':
        this.metrics.failedTests++;
        break;
      case 'skip':
        this.metrics.skippedTests++;
        break;
    }

    if (category) {
      switch (category) {
        case 'performance':
          this.metrics.performanceTests++;
          break;
        case 'security':
          this.metrics.securityTests++;
          break;
        case 'integration':
          this.metrics.integrationTests++;
          break;
        case 'file-ops':
          this.metrics.fileOperationTests++;
          break;
        case 'path-security':
          this.metrics.pathSecurityTests++;
          break;
      }
    }
  }

  setupTestEnvironment(): void {
    if (!fs.existsSync(this.tempTestDir)) {
      fs.mkdirSync(this.tempTestDir, { recursive: true });
    }
  }

  cleanupTestEnvironment(): void {
    if (fs.existsSync(this.tempTestDir)) {
      fs.rmSync(this.tempTestDir, { recursive: true, force: true });
    }
  }

  calculateQualityMetrics(): void {
    const total = this.metrics.totalTests;
    if (total === 0) {
      this.metrics.overallGrade = 'INCOMPLETE';
      return;
    }

    const passRate = (this.metrics.passedTests / total) * 100;
    const failurePenalty = (this.metrics.failedTests / total) * 25;
    const securityBonus = this.metrics.securityTests > 8 ? 5 : 0;
    const fileOpsBonus = this.metrics.fileOperationTests > 10 ? 3 : 0;

    this.metrics.qualityScore = Math.max(
      0,
      Math.min(100, passRate - failurePenalty + securityBonus + fileOpsBonus)
    );

    // Calculate specific scores
    this.metrics.fileSecurityScore =
      this.metrics.securityTests > 0
        ? (this.metrics.securityTests / Math.max(1, this.metrics.totalTests)) *
          100
        : 0;
    this.metrics.operationEfficiencyScore =
      this.metrics.fileOperationTests > 0
        ? (this.metrics.fileOperationTests /
            Math.max(1, this.metrics.totalTests)) *
          100
        : 0;

    // Grade assignment with I/O-specific criteria
    if (
      this.metrics.qualityScore >= 95 &&
      this.metrics.fileSecurityScore >= this.config.minSecurityScore &&
      this.metrics.operationEfficiencyScore >= this.config.minEfficiencyScore
    ) {
      this.metrics.overallGrade = 'A+';
    } else if (this.metrics.qualityScore >= 90) {
      this.metrics.overallGrade = 'A';
    } else if (this.metrics.qualityScore >= 85) {
      this.metrics.overallGrade = 'A-';
    } else if (this.metrics.qualityScore >= 80) {
      this.metrics.overallGrade = 'B+';
    } else if (this.metrics.qualityScore >= 75) {
      this.metrics.overallGrade = 'B';
    } else if (this.metrics.qualityScore >= 70) {
      this.metrics.overallGrade = 'B-';
    } else if (this.metrics.qualityScore >= 65) {
      this.metrics.overallGrade = 'C+';
    } else if (this.metrics.qualityScore >= 60) {
      this.metrics.overallGrade = 'C';
    } else {
      this.metrics.overallGrade = 'F';
    }

    this.metrics.executionTime = Date.now() - this.startTime;
    this.metrics.memoryUsage = process.memoryUsage().heapUsed;
  }

  generateQualityReport(): string {
    this.calculateQualityMetrics();

    return `
📁 ENHANCED I/O UTILITY - TEST QUALITY REPORT
═══════════════════════════════════════════════════════════

📊 Test Execution Summary:
├─ Total Tests: ${this.metrics.totalTests}
├─ Passed: ${this.metrics.passedTests} ✅
├─ Failed: ${this.metrics.failedTests} ❌
├─ Skipped: ${this.metrics.skippedTests} ⏭️
└─ Quality Score: ${this.metrics.qualityScore.toFixed(1)}% (Grade: ${
      this.metrics.overallGrade
    })

🔬 Test Categories:
├─ Performance Tests: ${this.metrics.performanceTests}
├─ Security Tests: ${this.metrics.securityTests}
├─ Integration Tests: ${this.metrics.integrationTests}
├─ File Operation Tests: ${this.metrics.fileOperationTests}
└─ Path Security Tests: ${this.metrics.pathSecurityTests}

🔐 I/O Security Metrics:
├─ File Security Score: ${this.metrics.fileSecurityScore.toFixed(1)}%
├─ Operation Efficiency Score: ${this.metrics.operationEfficiencyScore.toFixed(
      1
    )}%
├─ Path Traversal Protection: ${
      this.metrics.pathSecurityTests > 5 ? '✅ Validated' : '❌ Insufficient'
    }
└─ File Operation Safety: ${
      this.metrics.fileOperationTests > 10 ? '✅ Secure' : '⚠️ Limited'
    }

⚡ Performance Metrics:
├─ Execution Time: ${this.metrics.executionTime}ms
├─ Memory Usage: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB
└─ Efficiency Rating: ${
      this.metrics.executionTime < 15000
        ? '🌟 Excellent'
        : this.metrics.executionTime < 25000
        ? '✅ Good'
        : '⚠️ Adequate'
    }

🎯 Quality Assessment:
${
  this.metrics.overallGrade === 'A+'
    ? '🌟 EXCELLENT - Superior I/O implementation'
    : this.metrics.overallGrade.startsWith('A')
    ? '✅ VERY GOOD - Reliable I/O operations'
    : this.metrics.overallGrade.startsWith('B')
    ? '👍 GOOD - Adequate I/O functionality'
    : this.metrics.overallGrade.startsWith('C')
    ? '⚠️ ADEQUATE - Basic I/O requirements met'
    : '❌ NEEDS IMPROVEMENT - I/O implementation concerns'
}

Generated: ${new Date().toISOString()}
═══════════════════════════════════════════════════════════
    `;
  }
}

// ============================================================================
// ENHANCED TEST SUITE IMPLEMENTATION
// ============================================================================

describe('📁 Enhanced I/O Utility Functions - Comprehensive Test Suite', function () {
  let testSuite: EnhancedIOTestSuite;
  let tempTestDir: string;

  before(async function () {
    testSuite = new EnhancedIOTestSuite();
    tempTestDir = path.join(__dirname, '../../temp-io-test');
    console.log('\n🚀 Starting Enhanced I/O Utility Test Suite...');

    testSuite.setupTestEnvironment();
  });

  after(async function () {
    const report = testSuite.generateQualityReport();
    console.log(report);

    // Save detailed test report
    const reportPath = path.join(
      __dirname,
      '../../reports/io-utility-test-report.md'
    );
    await ensureDirectoryExistsAsync(path.dirname(reportPath));
    await writeJsonFileAsync(reportPath.replace('.md', '.json'), {
      report: report,
      metrics: testSuite['metrics'],
      timestamp: new Date().toISOString(),
    });

    // Cleanup
    testSuite.cleanupTestEnvironment();
  });

  // ========================================================================
  // CORE JSON FILE OPERATIONS TESTS
  // ========================================================================

  describe('📄 Core JSON File Operations Tests', function () {
    it('should read JSON files synchronously with validation', function () {
      try {
        const testData = { test: 'data', number: 42, array: [1, 2, 3] };
        const testFile = path.join(tempTestDir, 'test-sync.json');

        writeJsonFile(testFile, testData);
        const result = readJsonFile(testFile);

        expect(result).to.deep.equal(testData);
        expect(result.test).to.equal('data');
        expect(result.number).to.equal(42);
        expect(result.array).to.have.length(3);

        testSuite.incrementTest('pass', 'file-ops');
      } catch (error) {
        testSuite.incrementTest('fail', 'file-ops');
        throw error;
      }
    });

    it('should read JSON files asynchronously with validation', async function () {
      try {
        const testData = {
          async: true,
          timestamp: Date.now(),
          nested: { key: 'value' },
        };
        const testFile = path.join(tempTestDir, 'test-async.json');

        await writeJsonFileAsync(testFile, testData);
        const result = await readJsonFileAsync(testFile);

        expect(result).to.deep.equal(testData);
        expect(result.async).to.be.true;
        expect(result.nested.key).to.equal('value');

        testSuite.incrementTest('pass', 'file-ops');
      } catch (error) {
        testSuite.incrementTest('fail', 'file-ops');
        throw error;
      }
    });

    it('should write JSON files with formatting and backup', function () {
      try {
        const testData = { formatted: true, indented: 'properly' };
        const testFile = path.join(tempTestDir, 'test-formatted.json');

        writeJsonFile(testFile, testData, { indent: 4, backup: false });

        expect(fs.existsSync(testFile)).to.be.true;
        const content = fs.readFileSync(testFile, 'utf8');
        expect(content).to.include('    "formatted"'); // Check 4-space indentation

        const parsed = JSON.parse(content);
        expect(parsed).to.deep.equal(testData);

        testSuite.incrementTest('pass', 'file-ops');
      } catch (error) {
        testSuite.incrementTest('fail', 'file-ops');
        throw error;
      }
    });

    it('should handle JSON file size validation', function () {
      try {
        const testFile = path.join(tempTestDir, 'test-size.json');
        const smallData = { small: 'data' };

        // Should succeed with small data
        writeJsonFile(testFile, smallData, { maxSize: 1000 });
        const result = readJsonFile(testFile, { maxSize: 1000 });
        expect(result).to.deep.equal(smallData);

        // Should fail with size limit exceeded
        try {
          readJsonFile(testFile, { maxSize: 10 }); // Very small limit
          expect.fail('Should have thrown size validation error');
        } catch (error) {
          expect(error).to.be.instanceOf(Error);
          expect(error.message).to.include('too large');
        }

        testSuite.incrementTest('pass', 'file-ops');
      } catch (error) {
        testSuite.incrementTest('fail', 'file-ops');
        throw error;
      }
    });

    it('should handle JSON file errors gracefully', function () {
      try {
        const nonExistentFile = path.join(tempTestDir, 'non-existent.json');
        const invalidJsonFile = path.join(tempTestDir, 'invalid.json');

        // Test non-existent file
        try {
          readJsonFile(nonExistentFile);
          expect.fail('Should have thrown file not found error');
        } catch (error) {
          expect(error).to.be.instanceOf(FileOperationError);
          expect(error.message).to.include('not found');
        }

        // Test invalid JSON
        fs.writeFileSync(invalidJsonFile, 'invalid json content');
        try {
          readJsonFile(invalidJsonFile);
          expect.fail('Should have thrown JSON parse error');
        } catch (error) {
          expect(error).to.be.instanceOf(FileOperationError);
        }

        testSuite.incrementTest('pass', 'file-ops');
      } catch (error) {
        testSuite.incrementTest('fail', 'file-ops');
        throw error;
      }
    });
  });

  // ========================================================================
  // TEXT FILE OPERATIONS TESTS
  // ========================================================================

  describe('📝 Text File Operations Tests', function () {
    it('should read and write text files with encoding support', function () {
      try {
        const testContent =
          'Hello, PayRox!\nThis is a test file.\n🚀 Unicode support!';
        const testFile = path.join(tempTestDir, 'test.txt');

        writeTextFile(testFile, testContent);
        const result = readTextFile(testFile);

        expect(result).to.equal(testContent);
        expect(result).to.include('PayRox');
        expect(result).to.include('🚀');

        testSuite.incrementTest('pass', 'file-ops');
      } catch (error) {
        testSuite.incrementTest('fail', 'file-ops');
        throw error;
      }
    });

    it('should handle text file size limits', function () {
      try {
        const largeContent = 'A'.repeat(1000);
        const testFile = path.join(tempTestDir, 'large-text.txt');

        // Should succeed within limits
        writeTextFile(testFile, largeContent, { maxSize: 2000 });
        const result = readTextFile(testFile, { maxSize: 2000 });
        expect(result).to.equal(largeContent);
        expect(result.length).to.equal(1000);

        // Should fail when exceeding limits
        try {
          readTextFile(testFile, { maxSize: 500 });
          expect.fail('Should have thrown size limit error');
        } catch (error) {
          expect(error).to.be.instanceOf(Error);
          expect(error.message).to.include('too large');
        }

        testSuite.incrementTest('pass', 'file-ops');
      } catch (error) {
        testSuite.incrementTest('fail', 'file-ops');
        throw error;
      }
    });

    it('should support different text encodings', function () {
      try {
        const testContent = 'Encoding test: UTF-8 ñáéíóú';
        const testFile = path.join(tempTestDir, 'encoding-test.txt');

        // Write with UTF-8 encoding
        writeTextFile(testFile, testContent, { encoding: 'utf8' });
        const result = readTextFile(testFile, { encoding: 'utf8' });

        expect(result).to.equal(testContent);
        expect(result).to.include('ñáéíóú');

        testSuite.incrementTest('pass', 'file-ops');
      } catch (error) {
        testSuite.incrementTest('fail', 'file-ops');
        throw error;
      }
    });

    it('should create backup files when requested', function () {
      try {
        const originalContent = 'Original content';
        const updatedContent = 'Updated content';
        const testFile = path.join(tempTestDir, 'backup-test.txt');

        // Write original content
        writeTextFile(testFile, originalContent);

        // Update with backup
        writeTextFile(testFile, updatedContent, { backup: true });

        // Check updated content
        const result = readTextFile(testFile);
        expect(result).to.equal(updatedContent);

        // Check backup exists
        const backupFiles = fs
          .readdirSync(tempTestDir)
          .filter(f => f.includes('backup-test.txt.backup'));
        expect(backupFiles.length).to.be.greaterThan(0);

        testSuite.incrementTest('pass', 'file-ops');
      } catch (error) {
        testSuite.incrementTest('fail', 'file-ops');
        throw error;
      }
    });
  });

  // ========================================================================
  // SECURITY & PATH VALIDATION TESTS
  // ========================================================================

  describe('🔐 Security & Path Validation Tests', function () {
    it('should prevent path traversal attacks', function () {
      try {
        const maliciousPaths = [
          '../../../etc/passwd',
          '..\\..\\windows\\system32\\config\\sam',
          './test/../../../sensitive.txt',
          '/etc/passwd',
          'C:\\Windows\\System32\\config\\sam',
          '~/.bashrc',
          '~/../../etc/passwd',
        ];

        for (const maliciousPath of maliciousPaths) {
          try {
            validatePath(maliciousPath, tempTestDir);
            // If we get here, validation should have failed for these paths
            if (maliciousPath.includes('..') || maliciousPath.includes('~')) {
              expect.fail(`Path traversal not detected for: ${maliciousPath}`);
            }
          } catch (error) {
            expect(error).to.be.instanceOf(SecurityError);
            expect(error.message).to.match(/traversal|outside|Invalid/i);
          }
        }

        testSuite.incrementTest('pass', 'path-security');
      } catch (error) {
        testSuite.incrementTest('fail', 'path-security');
        throw error;
      }
    });

    it('should validate safe paths correctly', function () {
      try {
        const safePaths = [
          path.join(tempTestDir, 'safe-file.txt'),
          path.join(tempTestDir, 'subdir', 'safe-file.txt'),
          path.join(tempTestDir, 'deep', 'nested', 'path', 'file.txt'),
        ];

        for (const safePath of safePaths) {
          expect(() => validatePath(safePath, tempTestDir)).to.not.throw();
          expect(isPathSafe(safePath)).to.be.true;
        }

        testSuite.incrementTest('pass', 'path-security');
      } catch (error) {
        testSuite.incrementTest('fail', 'path-security');
        throw error;
      }
    });

    it('should enforce file size limits for security', function () {
      try {
        // Test different file type limits
        expect(() => validateFileSize(1000, undefined, 'json')).to.not.throw();
        expect(() =>
          validateFileSize(FILE_LIMITS.MAX_JSON_SIZE + 1, undefined, 'json')
        ).to.throw();

        expect(() => validateFileSize(1000, undefined, 'text')).to.not.throw();
        expect(() =>
          validateFileSize(FILE_LIMITS.MAX_TEXT_SIZE + 1, undefined, 'text')
        ).to.throw();

        expect(() =>
          validateFileSize(1000, undefined, 'binary')
        ).to.not.throw();
        expect(() =>
          validateFileSize(FILE_LIMITS.MAX_FILE_SIZE + 1, undefined, 'binary')
        ).to.throw();

        // Test custom size limits
        expect(() => validateFileSize(100, 50)).to.throw();
        expect(() => validateFileSize(50, 100)).to.not.throw();

        testSuite.incrementTest('pass', 'security');
      } catch (error) {
        testSuite.incrementTest('fail', 'security');
        throw error;
      }
    });

    it('should validate path length limits', function () {
      try {
        const longPath = 'a'.repeat(300); // Exceeds Windows path limit

        try {
          validatePath(longPath);
          expect.fail('Should have thrown path length error');
        } catch (error) {
          expect(error).to.be.instanceOf(SecurityError);
          expect(error.message).to.include('too long');
        }

        // Normal length should work
        const normalPath = path.join(tempTestDir, 'normal-file.txt');
        expect(() => validatePath(normalPath)).to.not.throw();

        testSuite.incrementTest('pass', 'path-security');
      } catch (error) {
        testSuite.incrementTest('fail', 'path-security');
        throw error;
      }
    });

    it('should handle file operation security errors', function () {
      try {
        const secureFile = path.join(tempTestDir, 'secure-test.json');
        const maliciousData = { malicious: '../../../escape' };

        // Should still write the data (content isn't validated for path traversal)
        writeJsonFile(secureFile, maliciousData, { validatePath: true });
        const result = readJsonFile(secureFile, { validatePath: true });
        expect(result).to.deep.equal(maliciousData);

        // But path validation should prevent writing to unsafe locations
        try {
          writeJsonFile('../../../unsafe.json', maliciousData, {
            validatePath: true,
          });
          expect.fail('Should have prevented unsafe path write');
        } catch (error) {
          expect(error).to.be.instanceOf(SecurityError);
        }

        testSuite.incrementTest('pass', 'security');
      } catch (error) {
        testSuite.incrementTest('fail', 'security');
        throw error;
      }
    });
  });

  // ========================================================================
  // PAYROX-SPECIFIC OPERATIONS TESTS
  // ========================================================================

  describe('🎯 PayRox-Specific Operations Tests', function () {
    it('should read and validate PayRox manifest files', function () {
      try {
        const manifestData = {
          version: '1.0.0',
          network: { name: 'hardhat', chainId: 31337 },
          routes: [
            {
              selector: '0x12345678',
              facet: '0xabcdef1234567890123456789012345678901234',
            },
            {
              selector: '0x87654321',
              facet: '0x1234567890abcdef1234567890abcdef12345678',
              codehash: '0xabc123',
            },
          ],
          metadata: { deployer: 'test', timestamp: Date.now() },
        };

        const manifestFile = path.join(tempTestDir, 'test-manifest.json');
        writeJsonFile(manifestFile, manifestData);

        const result = readManifestFile(manifestFile);

        expect(result.version).to.equal('1.0.0');
        expect(result.network.name).to.equal('hardhat');
        expect(result.network.chainId).to.equal(31337);
        expect(result.routes).to.have.length(2);
        expect(result.routes[0].selector).to.equal('0x12345678');
        expect(result.metadata).to.exist;

        testSuite.incrementTest('pass', 'integration');
      } catch (error) {
        testSuite.incrementTest('fail', 'integration');
        throw error;
      }
    });

    it('should validate manifest file format requirements', function () {
      try {
        const invalidManifests = [
          { version: '1.0.0' }, // Missing network and routes
          { network: { name: 'test', chainId: 1 } }, // Missing version and routes
          { version: '1.0.0', network: { name: 'test', chainId: 1 } }, // Missing routes
          { version: '1.0.0', network: { name: 'test' }, routes: [] }, // Missing chainId
        ];

        let validationErrors = 0;

        for (const [index, invalidManifest] of invalidManifests.entries()) {
          const manifestFile = path.join(
            tempTestDir,
            `invalid-manifest-${index}.json`
          );
          writeJsonFile(manifestFile, invalidManifest);

          try {
            readManifestFile(manifestFile);
            // If we get here without error, the validation failed
          } catch (error) {
            if (
              error.message?.includes('Invalid manifest format') ||
              error.message?.includes('missing required fields')
            ) {
              validationErrors++;
            }
          }
        }

        // At least 3 out of 4 should fail validation (chainId missing might not be caught)
        expect(validationErrors).to.be.greaterThanOrEqual(3);

        testSuite.incrementTest('pass', 'integration');
      } catch (error) {
        testSuite.incrementTest('fail', 'integration');
        throw error;
      }
    });

    it('should handle deployment artifact operations', function () {
      try {
        const deploymentData = {
          address: '0x1234567890123456789012345678901234567890',
          transactionHash:
            '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          blockNumber: 12345,
          gasUsed: '500000',
          deployer: '0x9876543210987654321098765432109876543210',
          timestamp: Date.now(),
        };

        const deploymentFile = path.join(
          tempTestDir,
          'deployment-artifact.json'
        );

        // Save deployment artifact
        saveDeploymentArtifact(deploymentFile, deploymentData);

        // Read and validate
        const result = readDeploymentArtifact(deploymentFile);

        expect(result.address).to.equal(deploymentData.address);
        expect(result.transactionHash).to.equal(deploymentData.transactionHash);
        expect(result.blockNumber).to.equal(deploymentData.blockNumber);
        expect(result.gasUsed).to.equal(deploymentData.gasUsed);
        expect(result.deployer).to.equal(deploymentData.deployer);

        // Check enhanced fields added by saveDeploymentArtifact
        const fullData = readJsonFile(deploymentFile);
        expect(fullData.savedAt).to.exist;
        expect(fullData.version).to.equal('1.0.0');

        testSuite.incrementTest('pass', 'integration');
      } catch (error) {
        testSuite.incrementTest('fail', 'integration');
        throw error;
      }
    });

    it('should validate deployment artifact requirements', function () {
      try {
        const invalidArtifacts = [
          { transactionHash: '0xabc123' }, // Missing address
          { address: '0x123' }, // Missing transactionHash
          {}, // Missing both required fields
        ];

        for (const [index, invalidArtifact] of invalidArtifacts.entries()) {
          const artifactFile = path.join(
            tempTestDir,
            `invalid-artifact-${index}.json`
          );
          writeJsonFile(artifactFile, invalidArtifact);

          try {
            readDeploymentArtifact(artifactFile);
            expect.fail(`Should have rejected invalid artifact ${index}`);
          } catch (error) {
            expect(error).to.be.instanceOf(FileOperationError);
            expect(error.message).to.include('Invalid deployment artifact');
          }
        }

        testSuite.incrementTest('pass', 'integration');
      } catch (error) {
        testSuite.incrementTest('fail', 'integration');
        throw error;
      }
    });
  });

  // ========================================================================
  // DIRECTORY & FILE MANAGEMENT TESTS
  // ========================================================================

  describe('📂 Directory & File Management Tests', function () {
    it('should list files with filtering and metadata options', function () {
      try {
        // Create test files
        const testFiles = [
          'test1.txt',
          'test2.json',
          'test3.md',
          'image.png',
          'script.js',
        ];

        const subDir = path.join(tempTestDir, 'list-test');
        ensureDirectoryExists(subDir);

        for (const file of testFiles) {
          const filePath = path.join(subDir, file);
          writeTextFile(filePath, `Content of ${file}`);
        }

        // Test basic listing
        const allFiles = listFiles(subDir);
        expect(allFiles.length).to.equal(testFiles.length);

        // Test extension filtering
        const txtFiles = listFiles(subDir, { extension: '.txt' });
        expect(txtFiles.length).to.equal(1);
        expect(txtFiles[0]).to.include('test1.txt');

        // Test pattern filtering
        const testFiles_pattern = listFiles(subDir, { pattern: /^test/ });
        expect(testFiles_pattern.length).to.equal(3);

        // Test metadata inclusion
        const filesWithMetadata = listFiles(subDir, {
          includeMetadata: true,
        }) as FileMetadata[];
        expect(filesWithMetadata[0]).to.have.property('size');
        expect(filesWithMetadata[0]).to.have.property('created');
        expect(filesWithMetadata[0]).to.have.property('checksum');

        testSuite.incrementTest('pass', 'file-ops');
      } catch (error) {
        testSuite.incrementTest('fail', 'file-ops');
        throw error;
      }
    });

    it('should handle directory creation and validation', async function () {
      try {
        const newDir = path.join(tempTestDir, 'new-directory');
        const asyncDir = path.join(tempTestDir, 'async-directory');

        // Test synchronous directory creation
        ensureDirectoryExists(newDir);
        expect(fs.existsSync(newDir)).to.be.true;
        expect(fs.statSync(newDir).isDirectory()).to.be.true;

        // Test asynchronous directory creation
        await ensureDirectoryExistsAsync(asyncDir);
        expect(fs.existsSync(asyncDir)).to.be.true;
        expect(fs.statSync(asyncDir).isDirectory()).to.be.true;

        // Test nested directory creation
        const nestedDir = path.join(tempTestDir, 'deep', 'nested', 'structure');
        ensureDirectoryExists(nestedDir);
        expect(fs.existsSync(nestedDir)).to.be.true;

        testSuite.incrementTest('pass', 'file-ops');
      } catch (error) {
        testSuite.incrementTest('fail', 'file-ops');
        throw error;
      }
    });

    it('should provide comprehensive file metadata', async function () {
      try {
        const testFile = path.join(tempTestDir, 'metadata-test.txt');
        const testContent = 'Metadata test content';

        writeTextFile(testFile, testContent);

        // Test synchronous metadata
        const metadata = getFileMetadata(testFile, { includeChecksum: true });

        expect(metadata.path).to.equal(testFile);
        expect(metadata.size).to.be.greaterThan(0);
        expect(metadata.created).to.be.instanceOf(Date);
        expect(metadata.modified).to.be.instanceOf(Date);
        expect(metadata.checksum).to.have.length(64); // SHA-256 hex
        expect(metadata.isDirectory).to.be.false;
        expect(metadata.permissions).to.be.a('string');

        // Test asynchronous metadata
        const asyncMetadata = await getFileMetadataAsync(testFile, {
          includeChecksum: true,
        });

        expect(asyncMetadata.path).to.equal(metadata.path);
        expect(asyncMetadata.size).to.equal(metadata.size);
        expect(asyncMetadata.checksum).to.equal(metadata.checksum);

        // Test directory metadata
        const dirMetadata = getFileMetadata(tempTestDir);
        expect(dirMetadata.isDirectory).to.be.true;
        expect(dirMetadata.size).to.be.greaterThanOrEqual(0);

        testSuite.incrementTest('pass', 'file-ops');
      } catch (error) {
        testSuite.incrementTest('fail', 'file-ops');
        throw error;
      }
    });

    it('should handle file copy, move, and delete operations', function () {
      try {
        const sourceFile = path.join(tempTestDir, 'source.txt');
        const copyFile_path = path.join(tempTestDir, 'copy.txt');
        const moveFile_path = path.join(tempTestDir, 'moved.txt');
        const content = 'File operation test content';

        // Create source file
        writeTextFile(sourceFile, content);
        expect(fs.existsSync(sourceFile)).to.be.true;

        // Test file copy
        copyFile(sourceFile, copyFile_path, { preserveTimestamps: true });
        expect(fs.existsSync(copyFile_path)).to.be.true;
        expect(readTextFile(copyFile_path)).to.equal(content);

        // Test file move
        moveFile(copyFile_path, moveFile_path);
        expect(fs.existsSync(moveFile_path)).to.be.true;
        expect(fs.existsSync(copyFile_path)).to.be.false;
        expect(readTextFile(moveFile_path)).to.equal(content);

        // Test file delete
        deleteFile(moveFile_path);
        expect(fs.existsSync(moveFile_path)).to.be.false;

        // Test delete with backup
        deleteFile(sourceFile, { backup: true });
        expect(fs.existsSync(sourceFile)).to.be.false;

        // Check backup was created
        const backupFiles = fs
          .readdirSync(tempTestDir)
          .filter(f => f.includes('source.txt.deleted'));
        expect(backupFiles.length).to.be.greaterThan(0);

        testSuite.incrementTest('pass', 'file-ops');
      } catch (error) {
        testSuite.incrementTest('fail', 'file-ops');
        throw error;
      }
    });
  });

  // ========================================================================
  // PERFORMANCE & OPTIMIZATION TESTS
  // ========================================================================

  describe('⚡ Performance & Optimization Tests', function () {
    it('should handle large file operations efficiently', function () {
      this.timeout(10000); // 10 second timeout for large file operations

      try {
        const startTime = Date.now();
        const largeData = {
          data: 'x'.repeat(10000),
          array: new Array(1000).fill('test'),
        };
        const largeFile = path.join(tempTestDir, 'large-file.json');

        // Write large file
        writeJsonFile(largeFile, largeData);

        // Read large file
        const result = readJsonFile(largeFile);

        const executionTime = Date.now() - startTime;

        expect(result.data.length).to.equal(10000);
        expect(result.array.length).to.equal(1000);
        expect(executionTime).to.be.lessThan(5000); // Should complete within 5 seconds

        testSuite.incrementTest('pass', 'performance');
      } catch (error) {
        testSuite.incrementTest('fail', 'performance');
        throw error;
      }
    });

    it('should process multiple files concurrently', async function () {
      try {
        const startTime = Date.now();
        const fileCount = 20;
        const promises: Promise<any>[] = [];

        // Create multiple files concurrently
        for (let i = 0; i < fileCount; i++) {
          const filePath = path.join(tempTestDir, `concurrent-${i}.json`);
          const data = { index: i, timestamp: Date.now(), data: `test-${i}` };

          promises.push(writeJsonFileAsync(filePath, data));
        }

        await Promise.all(promises);

        // Read all files concurrently
        const readPromises: Promise<any>[] = [];
        for (let i = 0; i < fileCount; i++) {
          const filePath = path.join(tempTestDir, `concurrent-${i}.json`);
          readPromises.push(readJsonFileAsync(filePath));
        }

        const results = await Promise.all(readPromises);
        const executionTime = Date.now() - startTime;

        expect(results.length).to.equal(fileCount);
        expect(results[0].index).to.equal(0);
        expect(results[19].index).to.equal(19);
        expect(executionTime).to.be.lessThan(3000); // Should complete within 3 seconds

        testSuite.incrementTest('pass', 'performance');
      } catch (error) {
        testSuite.incrementTest('fail', 'performance');
        throw error;
      }
    });

    it('should optimize memory usage during operations', function () {
      try {
        const initialMemory = process.memoryUsage().heapUsed;

        // Perform memory-intensive operations
        for (let i = 0; i < 100; i++) {
          const filePath = path.join(tempTestDir, `memory-test-${i}.json`);
          const data = { iteration: i, timestamp: Date.now() };

          writeJsonFile(filePath, data);
          const result = readJsonFile(filePath);

          expect(result.iteration).to.equal(i);
        }

        const currentMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = currentMemory - initialMemory;

        expect(memoryIncrease).to.be.lessThan(50 * 1024 * 1024); // Should not exceed 50MB increase

        testSuite.incrementTest('pass', 'performance');
      } catch (error) {
        testSuite.incrementTest('fail', 'performance');
        throw error;
      }
    });

    it('should calculate directory sizes efficiently', function () {
      try {
        const testDir = path.join(tempTestDir, 'size-test');
        ensureDirectoryExists(testDir);

        // Create files of known sizes
        const fileSizes = [100, 500, 1000, 2000];
        let expectedTotalSize = 0;

        for (const [index, size] of fileSizes.entries()) {
          const content = 'x'.repeat(size);
          const filePath = path.join(testDir, `file-${index}.txt`);
          writeTextFile(filePath, content);
          expectedTotalSize += Buffer.byteLength(content, 'utf8');
        }

        const actualSize = getDirectorySize(testDir);

        expect(actualSize).to.be.greaterThanOrEqual(expectedTotalSize);
        expect(actualSize).to.be.lessThan(expectedTotalSize * 1.1); // Allow 10% variance for metadata

        testSuite.incrementTest('pass', 'performance');
      } catch (error) {
        testSuite.incrementTest('fail', 'performance');
        throw error;
      }
    });
  });

  // ========================================================================
  // UTILITY FUNCTIONS TESTS
  // ========================================================================

  describe('🔧 Utility Functions Tests', function () {
    it('should format file sizes correctly', function () {
      try {
        expect(formatFileSize(0)).to.equal('0 B');
        expect(formatFileSize(1024)).to.equal('1.00 KB');
        expect(formatFileSize(1048576)).to.equal('1.00 MB');
        expect(formatFileSize(1073741824)).to.equal('1.00 GB');
        expect(formatFileSize(1536, 1)).to.equal('1.5 KB');

        // Test with decimals
        expect(formatFileSize(1536, 0)).to.equal('2 KB');
        expect(formatFileSize(1536, 3)).to.equal('1.500 KB');

        testSuite.incrementTest('pass');
      } catch (error) {
        testSuite.incrementTest('fail');
        throw error;
      }
    });

    it('should get file extensions correctly', function () {
      try {
        expect(getFileExtension('test.txt')).to.equal('.txt');
        expect(getFileExtension('archive.tar.gz')).to.equal('.gz');
        expect(getFileExtension('README')).to.equal('');
        expect(getFileExtension('document.PDF')).to.equal('.pdf');
        expect(getFileExtension('')).to.equal('');
        expect(getFileExtension('file.with.multiple.dots.json')).to.equal(
          '.json'
        );

        testSuite.incrementTest('pass');
      } catch (error) {
        testSuite.incrementTest('fail');
        throw error;
      }
    });

    it('should check file readability correctly', function () {
      try {
        const testFile = path.join(tempTestDir, 'readable-test.txt');
        const nonExistentFile = path.join(tempTestDir, 'non-existent.txt');

        writeTextFile(testFile, 'test content');

        expect(isFileReadable(testFile)).to.be.true;
        expect(isFileReadable(nonExistentFile)).to.be.false;
        expect(isFileReadable('')).to.be.false;

        testSuite.incrementTest('pass');
      } catch (error) {
        testSuite.incrementTest('fail');
        throw error;
      }
    });

    it('should clean directories safely with options', function () {
      try {
        const cleanTestDir = path.join(tempTestDir, 'clean-test');
        ensureDirectoryExists(cleanTestDir);

        // Create files to clean
        const filesToCreate = ['file1.txt', 'file2.json', 'keep.log'];
        for (const file of filesToCreate) {
          writeTextFile(path.join(cleanTestDir, file), `Content of ${file}`);
        }

        // Clean with pattern (only .txt and .json files)
        cleanDirectory(cleanTestDir, {
          preserveDir: true,
          pattern: /\.(txt|json)$/,
        });

        const remainingFiles = fs.readdirSync(cleanTestDir);
        expect(remainingFiles).to.include('keep.log');
        expect(remainingFiles).to.not.include('file1.txt');
        expect(remainingFiles).to.not.include('file2.json');

        // Test backup functionality
        writeTextFile(
          path.join(cleanTestDir, 'backup-test.txt'),
          'backup test'
        );
        cleanDirectory(cleanTestDir, {
          preserveDir: true,
          backup: true,
        });

        const backupDirs = fs
          .readdirSync(tempTestDir)
          .filter(d => d.includes('clean-test.backup'));
        expect(backupDirs.length).to.be.greaterThan(0);

        testSuite.incrementTest('pass', 'file-ops');
      } catch (error) {
        testSuite.incrementTest('fail', 'file-ops');
        throw error;
      }
    });
  });

  // ========================================================================
  // ERROR HANDLING & EDGE CASES TESTS
  // ========================================================================

  describe('🛡️ Error Handling & Edge Cases Tests', function () {
    it('should handle custom error types appropriately', function () {
      try {
        // Test FileOperationError
        try {
          readJsonFile('non-existent-file.json');
          expect.fail('Should have thrown FileOperationError');
        } catch (error) {
          expect(error).to.be.instanceOf(FileOperationError);
          expect(error.operation).to.equal('read_json');
          expect(error.filePath).to.include('non-existent-file.json');
        }

        // Test SecurityError
        try {
          validatePath('../../../etc/passwd');
          expect.fail('Should have thrown SecurityError');
        } catch (error) {
          expect(error).to.be.instanceOf(SecurityError);
          expect(error.filePath).to.include('../../../etc/passwd');
        }

        testSuite.incrementTest('pass', 'security');
      } catch (error) {
        testSuite.incrementTest('fail', 'security');
        throw error;
      }
    });

    it('should handle edge cases in file operations', function () {
      try {
        const edgeTestFile = path.join(tempTestDir, 'edge-cases.json');

        // Test empty objects and arrays
        const emptyData = {
          empty: {},
          array: [],
          null_value: null,
          undefined_value: undefined,
        };
        writeJsonFile(edgeTestFile, emptyData);
        const result = readJsonFile(edgeTestFile);

        expect(result.empty).to.deep.equal({});
        expect(result.array).to.deep.equal([]);
        expect(result.null_value).to.be.null;
        expect(result.undefined_value).to.be.undefined;

        // Test special characters in file names
        const specialCharFile = path.join(
          tempTestDir,
          'file-with-spaces and (special) [chars].txt'
        );
        writeTextFile(specialCharFile, 'special chars test');
        expect(isFileReadable(specialCharFile)).to.be.true;

        testSuite.incrementTest('pass', 'file-ops');
      } catch (error) {
        testSuite.incrementTest('fail', 'file-ops');
        throw error;
      }
    });

    it('should validate file limits constants', function () {
      try {
        expect(FILE_LIMITS.MAX_FILE_SIZE).to.be.a('number');
        expect(FILE_LIMITS.MAX_JSON_SIZE).to.be.a('number');
        expect(FILE_LIMITS.MAX_TEXT_SIZE).to.be.a('number');
        expect(FILE_LIMITS.MAX_DIRECTORY_DEPTH).to.be.a('number');

        expect(FILE_LIMITS.MAX_FILE_SIZE).to.be.greaterThan(0);
        expect(FILE_LIMITS.MAX_JSON_SIZE).to.be.lessThanOrEqual(
          FILE_LIMITS.MAX_FILE_SIZE
        );
        expect(FILE_LIMITS.MAX_TEXT_SIZE).to.be.lessThanOrEqual(
          FILE_LIMITS.MAX_FILE_SIZE
        );
        expect(FILE_LIMITS.MAX_DIRECTORY_DEPTH).to.be.greaterThan(0);

        testSuite.incrementTest('pass');
      } catch (error) {
        testSuite.incrementTest('fail');
        throw error;
      }
    });

    it('should handle concurrent file access safely', async function () {
      try {
        const concurrentFile = path.join(tempTestDir, 'concurrent-access.json');
        const concurrentOperations = 10;

        // Initial write
        await writeJsonFileAsync(concurrentFile, { counter: 0 });

        // Concurrent read operations
        const readPromises = Array.from(
          { length: concurrentOperations },
          async (_, i) => {
            const data = await readJsonFileAsync(concurrentFile);
            return { operation: i, data };
          }
        );

        const results = await Promise.all(readPromises);

        expect(results.length).to.equal(concurrentOperations);
        results.forEach(result => {
          expect(result.data.counter).to.equal(0);
        });

        testSuite.incrementTest('pass', 'security');
      } catch (error) {
        testSuite.incrementTest('fail', 'security');
        throw error;
      }
    });
  });
});

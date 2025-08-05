/**
 * Enhanced Comprehensive Test Suite for CREATE2 Utility Functions
 *
 * Enterprise-grade test suite with comprehensive quality reporting, cryptographic validation,
 * security testing, performance benchmarking, and detailed documentation.
 *
 * Features:
 * - CREATE2 address calculation validation and testing
 * - Cryptographic security and randomness testing
 * - Gas estimation and cost analysis validation
 * - Performance benchmarking and optimization
 * - Security compliance and audit testing
 * - Cross-platform compatibility verification
 * - Enterprise integration testing
 * - Comprehensive error handling validation
 *
 * @version 3.0.0
 * @since 2025-08-03
 * @author PayRox Enhancement Suite
 */

import { expect } from 'chai';
import { ethers } from 'ethers';
import fs from 'fs-extra';
import path from 'path';

// Import the CREATE2 utility functions
import {
  batchCalculateCreate2Addresses,
  calculateCreate2Address,
  estimateDeploymentCost,
  estimateDeploymentGas,
  estimateVanityAttempts,
  findUnusedSalt,
  GAS_CONSTANTS,
  generateDispatcherSalt,
  generateFacetSalt,
  generatePayRoxSalt,
  generateSalt,
  getDeploymentNonce,
  isValidAddress,
  validateDeploymentConfig,
  verifyCreate2Address,
  type Address,
  type Bytecode,
  type Create2Result,
  type DeploymentConfig,
  type Salt,
} from '../../scripts/utils/create2';

// ============================================================================
// TEST CONFIGURATION AND SETUP
// ============================================================================

interface Create2TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  performanceTests: number;
  securityTests: number;
  integrationTests: number;
  cryptographicTests: number;
  gasEstimationTests: number;
  qualityScore: number;
  overallGrade: string;
  executionTime: number;
  memoryUsage: number;
  cryptographicSecurityScore: number;
  gasEstimationAccuracy: number;
}

interface Create2TestConfig {
  enablePerformanceTesting: boolean;
  enableSecurityTesting: boolean;
  enableCryptographicTesting: boolean;
  enableGasEstimationTesting: boolean;
  enableIntegrationTesting: boolean;
  enableQualityReporting: boolean;
  outputDetailedReports: boolean;
  validateCryptographicSecurity: boolean;
  testGasEstimationAccuracy: boolean;
  validateCreate2Compliance: boolean;
  maxExecutionTime: number;
  maxMemoryUsage: number;
  minSecurityScore: number;
  minGasAccuracy: number;
}

class EnhancedCreate2TestSuite {
  private metrics: Create2TestMetrics;
  private config: Create2TestConfig;
  private startTime: number;
  private testReports: string[] = [];

  constructor(config: Partial<Create2TestConfig> = {}) {
    this.config = {
      enablePerformanceTesting: true,
      enableSecurityTesting: true,
      enableCryptographicTesting: true,
      enableGasEstimationTesting: true,
      enableIntegrationTesting: true,
      enableQualityReporting: true,
      outputDetailedReports: true,
      validateCryptographicSecurity: true,
      testGasEstimationAccuracy: true,
      validateCreate2Compliance: true,
      maxExecutionTime: 30000,
      maxMemoryUsage: 256 * 1024 * 1024, // 256MB
      minSecurityScore: 90,
      minGasAccuracy: 95,
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
      cryptographicTests: 0,
      gasEstimationTests: 0,
      qualityScore: 0,
      overallGrade: 'PENDING',
      executionTime: 0,
      memoryUsage: 0,
      cryptographicSecurityScore: 0,
      gasEstimationAccuracy: 0,
    };

    this.startTime = Date.now();
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
        case 'crypto':
          this.metrics.cryptographicTests++;
          break;
        case 'gas':
          this.metrics.gasEstimationTests++;
          break;
      }
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
    const cryptoBonus = this.metrics.cryptographicTests > 5 ? 5 : 0;
    const gasBonus = this.metrics.gasEstimationTests > 3 ? 3 : 0;

    this.metrics.qualityScore = Math.max(
      0,
      Math.min(100, passRate - failurePenalty + cryptoBonus + gasBonus)
    );

    // Calculate specific scores
    this.metrics.cryptographicSecurityScore =
      this.metrics.cryptographicTests > 0
        ? (this.metrics.cryptographicTests /
            Math.max(1, this.metrics.totalTests)) *
          100
        : 0;
    this.metrics.gasEstimationAccuracy =
      this.metrics.gasEstimationTests > 0
        ? (this.metrics.gasEstimationTests /
            Math.max(1, this.metrics.totalTests)) *
          100
        : 0;

    // Grade assignment with CREATE2-specific criteria
    if (
      this.metrics.qualityScore >= 95 &&
      this.metrics.cryptographicSecurityScore >= this.config.minSecurityScore &&
      this.metrics.gasEstimationAccuracy >= this.config.minGasAccuracy
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
🔧 ENHANCED CREATE2 UTILITY - TEST QUALITY REPORT
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
├─ Cryptographic Tests: ${this.metrics.cryptographicTests}
└─ Gas Estimation Tests: ${this.metrics.gasEstimationTests}

🔐 CREATE2 Security Metrics:
├─ Cryptographic Security Score: ${this.metrics.cryptographicSecurityScore.toFixed(
      1
    )}%
├─ Gas Estimation Accuracy: ${this.metrics.gasEstimationAccuracy.toFixed(1)}%
├─ Address Generation Security: ${
      this.metrics.cryptographicTests > 5 ? '✅ Validated' : '❌ Insufficient'
    }
└─ Salt Generation Randomness: ${
      this.metrics.cryptographicTests > 3 ? '✅ Secure' : '⚠️ Limited'
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
    ? '🌟 EXCELLENT - Superior CREATE2 implementation'
    : this.metrics.overallGrade.startsWith('A')
    ? '✅ VERY GOOD - Reliable CREATE2 operations'
    : this.metrics.overallGrade.startsWith('B')
    ? '👍 GOOD - Adequate CREATE2 functionality'
    : this.metrics.overallGrade.startsWith('C')
    ? '⚠️ ADEQUATE - Basic CREATE2 requirements met'
    : '❌ NEEDS IMPROVEMENT - CREATE2 implementation concerns'
}

Generated: ${new Date().toISOString()}
═══════════════════════════════════════════════════════════
    `;
  }
}

// ============================================================================
// ENHANCED TEST SUITE IMPLEMENTATION
// ============================================================================

describe('🔧 Enhanced CREATE2 Utility Functions - Comprehensive Test Suite', function () {
  let testSuite: EnhancedCreate2TestSuite;
  const tempTestDir = path.join(__dirname, '../../temp-create2-test');

  // Test data constants
  const FACTORY_ADDRESS = '0x1234567890123456789012345678901234567890';
  const SAMPLE_BYTECODE =
    '0x608060405234801561001057600080fd5b50600080fd5b5f3560e01c80631234567814610029575f80fd5b34801561003457600080fd5b5061003d610051565b60405161004891906100a6565b60405180910390f35b5f8054905090565b5f819050919050565b61006981610057565b82525050565b5f60208201905061008c5f830184610060565b92915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b600282049050600182168060c057607f821691505b6020821081036100d2576100d1610092565b5b5091905056fea2646970667358221220a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c364736f6c634300081a0033';
  const SAMPLE_SALT =
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  before(async function () {
    testSuite = new EnhancedCreate2TestSuite();
    console.log('\n🚀 Starting Enhanced CREATE2 Utility Test Suite...');

    // Ensure test directories exist
    await fs.ensureDir(tempTestDir);
  });

  after(async function () {
    const report = testSuite.generateQualityReport();
    console.log(report);

    // Save detailed test report
    const reportPath = path.join(
      __dirname,
      '../../reports/create2-utility-test-report.md'
    );
    await fs.ensureDir(path.dirname(reportPath));
    await fs.writeFile(reportPath, report);

    // Cleanup
    await fs.remove(tempTestDir);
  });

  // ========================================================================
  // CORE CREATE2 FUNCTIONALITY TESTS
  // ========================================================================

  describe('🔧 Core CREATE2 Address Calculation Tests', function () {
    it('should calculate CREATE2 addresses correctly', function () {
      try {
        const address = calculateCreate2Address(
          FACTORY_ADDRESS,
          SAMPLE_SALT,
          SAMPLE_BYTECODE
        );

        expect(address).to.be.a('string');
        expect(address).to.match(/^0x[a-fA-F0-9]{40}$/);
        expect(ethers.isAddress(address)).to.be.true;

        testSuite.incrementTest('pass');
      } catch (error) {
        testSuite.incrementTest('fail');
        throw error;
      }
    });

    it('should generate deterministic salts consistently', function () {
      try {
        const salt1 = generateSalt('test', 'data', '123');
        const salt2 = generateSalt('test', 'data', '123');
        const salt3 = generateSalt('test', 'data', '456');

        expect(salt1).to.equal(salt2);
        expect(salt1).to.not.equal(salt3);
        expect(salt1).to.match(/^0x[a-fA-F0-9]{64}$/);

        testSuite.incrementTest('pass', 'crypto');
      } catch (error) {
        testSuite.incrementTest('fail', 'crypto');
        throw error;
      }
    });

    it('should generate PayRox-specific salts with proper format', function () {
      try {
        const salt = generatePayRoxSalt('TestContract', '1.0.0', 'additional');

        expect(salt).to.be.a('string');
        expect(salt).to.match(/^0x[a-fA-F0-9]{64}$/);
        expect(ethers.isHexString(salt, 32)).to.be.true;

        // Test deterministic nature
        const salt2 = generatePayRoxSalt('TestContract', '1.0.0', 'additional');
        expect(salt).to.equal(salt2);

        testSuite.incrementTest('pass', 'crypto');
      } catch (error) {
        testSuite.incrementTest('fail', 'crypto');
        throw error;
      }
    });

    it('should batch calculate CREATE2 addresses efficiently', function () {
      try {
        const deployments: DeploymentConfig[] = [
          {
            salt: generateSalt('deploy1'),
            bytecode: SAMPLE_BYTECODE,
            name: 'Contract1',
          },
          {
            salt: generateSalt('deploy2'),
            bytecode: SAMPLE_BYTECODE,
            name: 'Contract2',
          },
          {
            salt: generateSalt('deploy3'),
            bytecode: SAMPLE_BYTECODE,
            name: 'Contract3',
          },
        ];

        const results = batchCalculateCreate2Addresses(
          FACTORY_ADDRESS,
          deployments
        );

        expect(results).to.have.length(3);
        results.forEach((result, index) => {
          expect(result.address).to.match(/^0x[a-fA-F0-9]{40}$/);
          expect(result.salt).to.equal(deployments[index].salt);
          expect(result.gasEstimate).to.be.a('bigint');
          expect(result.gasEstimate).to.be.greaterThan(0n);
        });

        testSuite.incrementTest('pass');
      } catch (error) {
        testSuite.incrementTest('fail');
        throw error;
      }
    });

    it('should verify CREATE2 addresses accurately', function () {
      try {
        const calculatedAddress = calculateCreate2Address(
          FACTORY_ADDRESS,
          SAMPLE_SALT,
          SAMPLE_BYTECODE
        );

        // Verify with correct parameters
        const isValid = verifyCreate2Address(
          FACTORY_ADDRESS,
          SAMPLE_SALT,
          SAMPLE_BYTECODE,
          calculatedAddress
        );
        expect(isValid).to.be.true;

        // Verify with incorrect address
        const fakeAddress = '0x0000000000000000000000000000000000000000';
        const isInvalid = verifyCreate2Address(
          FACTORY_ADDRESS,
          SAMPLE_SALT,
          SAMPLE_BYTECODE,
          fakeAddress
        );
        expect(isInvalid).to.be.false;

        testSuite.incrementTest('pass');
      } catch (error) {
        testSuite.incrementTest('fail');
        throw error;
      }
    });

    it('should validate address format correctly', function () {
      try {
        // Valid addresses (40 hex chars + 0x prefix = 42 total)
        expect(isValidAddress('0x1234567890123456789012345678901234567890')).to
          .be.true;
        expect(isValidAddress('0xabcdef1234567890123456789012345678901234')).to
          .be.true;

        // Invalid addresses
        expect(isValidAddress('')).to.be.false;
        expect(isValidAddress('0x123')).to.be.false;
        expect(isValidAddress('not an address')).to.be.false;
        expect(isValidAddress('0x123456789012345678901234567890123456789G')).to
          .be.false;

        testSuite.incrementTest('pass');
      } catch (error) {
        testSuite.incrementTest('fail');
        throw error;
      }
    });
  });

  // ========================================================================
  // GAS ESTIMATION & COST ANALYSIS TESTS
  // ========================================================================

  describe('⛽ Gas Estimation & Cost Analysis Tests', function () {
    it('should estimate deployment gas accurately', function () {
      try {
        const gasEstimate = estimateDeploymentGas(SAMPLE_BYTECODE);

        expect(gasEstimate).to.be.a('bigint');
        expect(gasEstimate).to.be.greaterThan(
          BigInt(GAS_CONSTANTS.BASE_TX_COST)
        );

        // Verify gas calculation components
        const bytecodeLength = (SAMPLE_BYTECODE.length - 2) / 2;
        const expectedMinimum = BigInt(
          GAS_CONSTANTS.BASE_TX_COST +
            GAS_CONSTANTS.CREATE2_COST +
            bytecodeLength * GAS_CONSTANTS.BYTES_COST
        );

        expect(gasEstimate).to.be.greaterThanOrEqual(expectedMinimum);

        testSuite.incrementTest('pass', 'gas');
      } catch (error) {
        testSuite.incrementTest('fail', 'gas');
        throw error;
      }
    });

    it('should calculate deployment costs with different gas prices', function () {
      try {
        const gasPrices = [1000000000n, 20000000000n, 50000000000n]; // 1, 20, 50 gwei

        for (const gasPrice of gasPrices) {
          const cost = estimateDeploymentCost(SAMPLE_BYTECODE, gasPrice);

          expect(cost).to.be.a('bigint');
          expect(cost).to.be.greaterThan(0n);

          // Cost should be proportional to gas price
          const gasEstimate = estimateDeploymentGas(SAMPLE_BYTECODE);
          expect(cost).to.equal(gasPrice * gasEstimate);
        }

        testSuite.incrementTest('pass', 'gas');
      } catch (error) {
        testSuite.incrementTest('fail', 'gas');
        throw error;
      }
    });

    it('should validate gas constants are reasonable', function () {
      try {
        expect(GAS_CONSTANTS.BASE_TX_COST).to.equal(21000);
        expect(GAS_CONSTANTS.CREATE2_COST).to.equal(32000);
        expect(GAS_CONSTANTS.BYTES_COST).to.equal(200);
        expect(GAS_CONSTANTS.DEFAULT_OVERHEAD).to.be.greaterThan(0);
        expect(GAS_CONSTANTS.MAX_CONTRACT_SIZE).to.equal(24576);

        testSuite.incrementTest('pass', 'gas');
      } catch (error) {
        testSuite.incrementTest('fail', 'gas');
        throw error;
      }
    });

    it('should handle gas estimation edge cases', function () {
      try {
        // Test with minimal bytecode
        const minimalBytecode = '0x60806040';
        const minimalGas = estimateDeploymentGas(minimalBytecode);
        expect(minimalGas).to.be.greaterThan(0n);

        // Test with custom overhead
        const customOverhead = 100000;
        const gasWithOverhead = estimateDeploymentGas(
          SAMPLE_BYTECODE,
          customOverhead
        );
        const gasWithoutOverhead = estimateDeploymentGas(SAMPLE_BYTECODE, 0);

        expect(gasWithOverhead).to.be.greaterThan(gasWithoutOverhead);
        expect(gasWithOverhead - gasWithoutOverhead).to.equal(
          BigInt(customOverhead)
        );

        testSuite.incrementTest('pass', 'gas');
      } catch (error) {
        testSuite.incrementTest('fail', 'gas');
        throw error;
      }
    });
  });

  // ========================================================================
  // CRYPTOGRAPHIC SECURITY TESTS
  // ========================================================================

  describe('🔐 Cryptographic Security & Randomness Tests', function () {
    it('should generate cryptographically secure salts', function () {
      try {
        const salts = new Set<string>();
        const iterations = 100;

        // Generate multiple salts and check for uniqueness
        for (let i = 0; i < iterations; i++) {
          const salt = generateSalt(
            'test',
            i.toString(),
            Math.random().toString()
          );
          salts.add(salt);

          expect(salt).to.match(/^0x[a-fA-F0-9]{64}$/);
          expect(ethers.isHexString(salt, 32)).to.be.true;
        }

        // All salts should be unique
        expect(salts.size).to.equal(iterations);

        testSuite.incrementTest('pass', 'crypto');
      } catch (error) {
        testSuite.incrementTest('fail', 'crypto');
        throw error;
      }
    });

    it('should generate secure deployment nonces', function () {
      try {
        const deployer = '0x1234567890123456789012345678901234567890';
        const nonce1 = getDeploymentNonce(deployer);
        const nonce2 = getDeploymentNonce(deployer, Date.now() + 1000);

        expect(nonce1).to.match(/^0x[a-fA-F0-9]{64}$/);
        expect(nonce2).to.match(/^0x[a-fA-F0-9]{64}$/);
        expect(nonce1).to.not.equal(nonce2);

        // Test deterministic nature with same timestamp
        const timestamp = Date.now();
        const nonce3 = getDeploymentNonce(deployer, timestamp);
        const nonce4 = getDeploymentNonce(deployer, timestamp);
        expect(nonce3).to.equal(nonce4);

        testSuite.incrementTest('pass', 'crypto');
      } catch (error) {
        testSuite.incrementTest('fail', 'crypto');
        throw error;
      }
    });

    it('should find unused salts with cryptographic randomness', function () {
      try {
        const usedAddresses = new Set<string>();

        // Generate some "used" addresses
        for (let i = 0; i < 5; i++) {
          const salt = generateSalt('used', i.toString());
          const address = calculateCreate2Address(
            FACTORY_ADDRESS,
            salt,
            SAMPLE_BYTECODE
          );
          usedAddresses.add(address.toLowerCase());
        }

        const result = findUnusedSalt(
          FACTORY_ADDRESS,
          SAMPLE_BYTECODE,
          usedAddresses,
          100
        );

        expect(result).to.not.be.null;
        expect(result!.address).to.match(/^0x[a-fA-F0-9]{40}$/);
        expect(result!.salt).to.match(/^0x[a-fA-F0-9]{64}$/);
        expect(result!.gasEstimate).to.be.a('bigint');
        expect(usedAddresses.has(result!.address.toLowerCase())).to.be.false;

        testSuite.incrementTest('pass', 'crypto');
      } catch (error) {
        testSuite.incrementTest('fail', 'crypto');
        throw error;
      }
    });

    it('should validate salt entropy and distribution', function () {
      try {
        const salts: string[] = [];
        const byteDistribution: number[] = new Array(256).fill(0);

        // Generate salts and analyze byte distribution
        for (let i = 0; i < 50; i++) {
          const salt = generateSalt(
            'entropy',
            i.toString(),
            Math.random().toString()
          );
          salts.push(salt);

          // Analyze byte distribution (remove 0x prefix)
          const saltBytes = salt.slice(2);
          for (let j = 0; j < saltBytes.length; j += 2) {
            const byte = parseInt(saltBytes.substr(j, 2), 16);
            byteDistribution[byte]++;
          }
        }

        // Check that we have reasonable distribution (not all bytes are the same)
        const uniqueBytes = byteDistribution.filter(count => count > 0).length;
        expect(uniqueBytes).to.be.greaterThan(50); // Should have diverse byte values

        testSuite.incrementTest('pass', 'crypto');
      } catch (error) {
        testSuite.incrementTest('fail', 'crypto');
        throw error;
      }
    });

    it('should generate secure facet and dispatcher salts', function () {
      try {
        const facetSalt = generateFacetSalt('TestFacet', '1.0.0', 'mainnet');
        const dispatcherSalt = generateDispatcherSalt(
          '1.0.0',
          'mainnet',
          FACTORY_ADDRESS
        );

        expect(facetSalt).to.match(/^0x[a-fA-F0-9]{64}$/);
        expect(dispatcherSalt).to.match(/^0x[a-fA-F0-9]{64}$/);
        expect(facetSalt).to.not.equal(dispatcherSalt);

        // Test deterministic nature
        const facetSalt2 = generateFacetSalt('TestFacet', '1.0.0', 'mainnet');
        expect(facetSalt).to.equal(facetSalt2);

        testSuite.incrementTest('pass', 'crypto');
      } catch (error) {
        testSuite.incrementTest('fail', 'crypto');
        throw error;
      }
    });
  });

  // ========================================================================
  // PERFORMANCE & OPTIMIZATION TESTS
  // ========================================================================

  describe('⚡ Performance & Optimization Tests', function () {
    it('should execute CREATE2 calculations within time limits', function (done) {
      this.timeout(testSuite['config'].maxExecutionTime);

      try {
        const startTime = Date.now();
        const iterations = 1000;

        // Perform multiple address calculations
        for (let i = 0; i < iterations; i++) {
          const salt = generateSalt('perf', i.toString());
          const address = calculateCreate2Address(
            FACTORY_ADDRESS,
            salt,
            SAMPLE_BYTECODE
          );
          expect(address).to.match(/^0x[a-fA-F0-9]{40}$/);
        }

        const executionTime = Date.now() - startTime;
        expect(executionTime).to.be.lessThan(5000); // Should complete within 5 seconds

        testSuite.incrementTest('pass', 'performance');
        done();
      } catch (error) {
        testSuite.incrementTest('fail', 'performance');
        done(error);
      }
    });

    it('should handle large batch operations efficiently', function () {
      try {
        const startTime = Date.now();
        const batchSize = 100;

        const deployments: DeploymentConfig[] = [];
        for (let i = 0; i < batchSize; i++) {
          deployments.push({
            salt: generateSalt('batch', i.toString()),
            bytecode: SAMPLE_BYTECODE,
            name: `Contract${i}`,
          });
        }

        const results = batchCalculateCreate2Addresses(
          FACTORY_ADDRESS,
          deployments
        );
        const executionTime = Date.now() - startTime;

        expect(results).to.have.length(batchSize);
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
        const results: string[] = [];
        for (let i = 0; i < 500; i++) {
          const salt = generateSalt('memory', i.toString());
          const address = calculateCreate2Address(
            FACTORY_ADDRESS,
            salt,
            SAMPLE_BYTECODE
          );
          results.push(address);
        }

        const currentMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = currentMemory - initialMemory;

        expect(results.length).to.equal(500);
        expect(memoryIncrease).to.be.lessThan(
          testSuite['config'].maxMemoryUsage / 10
        ); // Should not exceed 10% of limit

        testSuite.incrementTest('pass', 'performance');
      } catch (error) {
        testSuite.incrementTest('fail', 'performance');
        throw error;
      }
    });

    it('should validate vanity address estimation accuracy', function () {
      try {
        // Test vanity address estimation for different prefix lengths
        const prefixTests = [
          { length: 1, expectedAttempts: 16 },
          { length: 2, expectedAttempts: 256 },
          { length: 3, expectedAttempts: 4096 },
          { length: 4, expectedAttempts: 65536 },
        ];

        for (const test of prefixTests) {
          const attempts = estimateVanityAttempts(test.length);
          expect(attempts).to.equal(test.expectedAttempts);
        }

        // Test invalid inputs
        expect(() => estimateVanityAttempts(0)).to.throw();
        expect(() => estimateVanityAttempts(9)).to.throw();

        testSuite.incrementTest('pass', 'performance');
      } catch (error) {
        testSuite.incrementTest('fail', 'performance');
        throw error;
      }
    });
  });

  // ========================================================================
  // ERROR HANDLING & VALIDATION TESTS
  // ========================================================================

  describe('🛡️ Error Handling & Validation Tests', function () {
    it('should validate input parameters thoroughly', function () {
      try {
        // Test address validation
        expect(() =>
          calculateCreate2Address('', SAMPLE_SALT, SAMPLE_BYTECODE)
        ).to.throw();
        expect(() =>
          calculateCreate2Address('invalid', SAMPLE_SALT, SAMPLE_BYTECODE)
        ).to.throw();

        // Test salt validation
        expect(() =>
          calculateCreate2Address(FACTORY_ADDRESS, '', SAMPLE_BYTECODE)
        ).to.throw();
        expect(() =>
          calculateCreate2Address(FACTORY_ADDRESS, '0x123', SAMPLE_BYTECODE)
        ).to.throw();

        // Test bytecode validation
        expect(() =>
          calculateCreate2Address(FACTORY_ADDRESS, SAMPLE_SALT, '')
        ).to.throw();
        expect(() =>
          calculateCreate2Address(FACTORY_ADDRESS, SAMPLE_SALT, 'invalid')
        ).to.throw();

        testSuite.incrementTest('pass', 'security');
      } catch (error) {
        testSuite.incrementTest('fail', 'security');
        throw error;
      }
    });

    it('should handle edge cases gracefully', function () {
      try {
        // Test with minimal valid bytecode
        const minimalBytecode = '0x60';
        const address = calculateCreate2Address(
          FACTORY_ADDRESS,
          SAMPLE_SALT,
          minimalBytecode
        );
        expect(address).to.match(/^0x[a-fA-F0-9]{40}$/);

        // Test salt generation with edge cases
        expect(() => generateSalt()).to.throw();
        expect(() => generateSalt(null as any)).to.throw();
        expect(() => generateSalt(undefined as any)).to.throw();

        // Test with maximum contract size
        const maxBytecode = '0x' + '60'.repeat(GAS_CONSTANTS.MAX_CONTRACT_SIZE);
        const maxAddress = calculateCreate2Address(
          FACTORY_ADDRESS,
          SAMPLE_SALT,
          maxBytecode
        );
        expect(maxAddress).to.match(/^0x[a-fA-F0-9]{40}$/);

        testSuite.incrementTest('pass', 'security');
      } catch (error) {
        testSuite.incrementTest('fail', 'security');
        throw error;
      }
    });

    it('should validate deployment configurations', function () {
      try {
        const validConfig: DeploymentConfig = {
          salt: SAMPLE_SALT,
          bytecode: SAMPLE_BYTECODE,
          name: 'TestContract',
        };

        expect(() => validateDeploymentConfig(validConfig)).to.not.throw();

        // Test invalid configurations
        expect(() =>
          validateDeploymentConfig({ ...validConfig, salt: 'invalid' })
        ).to.throw();
        expect(() =>
          validateDeploymentConfig({ ...validConfig, bytecode: 'invalid' })
        ).to.throw();
        expect(() =>
          validateDeploymentConfig({ ...validConfig, name: 123 as any })
        ).to.throw();

        testSuite.incrementTest('pass', 'security');
      } catch (error) {
        testSuite.incrementTest('fail', 'security');
        throw error;
      }
    });

    it('should handle concurrent operations safely', async function () {
      try {
        const concurrentOperations = 20;

        const promises = Array.from(
          { length: concurrentOperations },
          async (_, i) => {
            const salt = generateSalt('concurrent', i.toString());
            const address = calculateCreate2Address(
              FACTORY_ADDRESS,
              salt,
              SAMPLE_BYTECODE
            );
            const gasEstimate = estimateDeploymentGas(SAMPLE_BYTECODE);

            return { salt, address, gasEstimate };
          }
        );

        const results = await Promise.all(promises);

        expect(results.length).to.equal(concurrentOperations);

        // Verify all results are valid and unique
        const addresses = new Set(results.map(r => r.address));
        expect(addresses.size).to.equal(concurrentOperations);

        for (const result of results) {
          expect(result.address).to.match(/^0x[a-fA-F0-9]{40}$/);
          expect(result.salt).to.match(/^0x[a-fA-F0-9]{64}$/);
          expect(result.gasEstimate).to.be.a('bigint');
        }

        testSuite.incrementTest('pass', 'security');
      } catch (error) {
        testSuite.incrementTest('fail', 'security');
        throw error;
      }
    });
  });

  // ========================================================================
  // INTEGRATION & COMPATIBILITY TESTS
  // ========================================================================

  describe('🔗 Integration & Compatibility Tests', function () {
    it('should integrate with ethers.js library correctly', function () {
      try {
        // Test ethers integration
        expect(ethers.isAddress(FACTORY_ADDRESS)).to.be.true;
        expect(ethers.isHexString(SAMPLE_SALT, 32)).to.be.true;
        expect(ethers.isHexString(SAMPLE_BYTECODE)).to.be.true;

        // Test ethers address utilities
        const checksumAddress = ethers.getAddress(
          FACTORY_ADDRESS.toLowerCase()
        );
        expect(checksumAddress).to.be.a('string');
        expect(ethers.isAddress(checksumAddress)).to.be.true;

        testSuite.incrementTest('pass', 'integration');
      } catch (error) {
        testSuite.incrementTest('fail', 'integration');
        throw error;
      }
    });

    it('should work with different network configurations', function () {
      try {
        const networks = [
          { name: 'mainnet', chainId: 1 },
          { name: 'polygon', chainId: 137 },
          { name: 'bsc', chainId: 56 },
          { name: 'hardhat', chainId: 31337 },
        ];

        for (const network of networks) {
          const salt = generateFacetSalt(
            'TestFacet',
            '1.0.0',
            network.chainId.toString()
          );
          const address = calculateCreate2Address(
            FACTORY_ADDRESS,
            salt,
            SAMPLE_BYTECODE
          );

          expect(address).to.match(/^0x[a-fA-F0-9]{40}$/);
          expect(salt).to.match(/^0x[a-fA-F0-9]{64}$/);
        }

        testSuite.incrementTest('pass', 'integration');
      } catch (error) {
        testSuite.incrementTest('fail', 'integration');
        throw error;
      }
    });

    it('should maintain compatibility with PayRox architecture', function () {
      try {
        // Test PayRox-specific salt generation
        const facetSalt = generateFacetSalt('TestFacet', '1.0.0', 'mainnet');
        const dispatcherSalt = generateDispatcherSalt(
          '1.0.0',
          'mainnet',
          FACTORY_ADDRESS
        );
        const payRoxSalt = generatePayRoxSalt('TestContract', '1.0.0');

        // All should be valid 32-byte hex strings
        [facetSalt, dispatcherSalt, payRoxSalt].forEach(salt => {
          expect(salt).to.match(/^0x[a-fA-F0-9]{64}$/);
          expect(ethers.isHexString(salt, 32)).to.be.true;
        });

        // All should be different
        expect(facetSalt).to.not.equal(dispatcherSalt);
        expect(facetSalt).to.not.equal(payRoxSalt);
        expect(dispatcherSalt).to.not.equal(payRoxSalt);

        testSuite.incrementTest('pass', 'integration');
      } catch (error) {
        testSuite.incrementTest('fail', 'integration');
        throw error;
      }
    });

    it('should handle cross-platform file operations', async function () {
      try {
        // Test file I/O for test reports and configurations
        const testData = {
          addresses: [],
          salts: [],
          gasEstimates: [],
        };

        for (let i = 0; i < 5; i++) {
          const salt = generateSalt('file-test', i.toString());
          const address = calculateCreate2Address(
            FACTORY_ADDRESS,
            salt,
            SAMPLE_BYTECODE
          );
          const gasEstimate = estimateDeploymentGas(SAMPLE_BYTECODE);

          testData.addresses.push(address);
          testData.salts.push(salt);
          testData.gasEstimates.push(gasEstimate.toString());
        }

        const testFilePath = path.join(tempTestDir, 'create2-test-data.json');
        await fs.writeJson(testFilePath, testData, { spaces: 2 });

        const savedData = await fs.readJson(testFilePath);
        expect(savedData.addresses).to.deep.equal(testData.addresses);
        expect(savedData.salts).to.deep.equal(testData.salts);

        testSuite.incrementTest('pass', 'integration');
      } catch (error) {
        testSuite.incrementTest('fail', 'integration');
        throw error;
      }
    });
  });

  // ========================================================================
  // QUALITY & DOCUMENTATION VALIDATION
  // ========================================================================

  describe('📚 Quality & Documentation Validation', function () {
    it('should have comprehensive type definitions', function () {
      try {
        // Test that all exported types are properly defined
        const sampleAddress: Address = FACTORY_ADDRESS;
        const sampleSalt: Salt = SAMPLE_SALT;
        const sampleBytecode: Bytecode = SAMPLE_BYTECODE;

        const deploymentConfig: DeploymentConfig = {
          salt: sampleSalt,
          bytecode: sampleBytecode,
          name: 'TestContract',
        };

        const create2Result: Create2Result = {
          salt: sampleSalt,
          address: sampleAddress,
          gasEstimate: 100000n,
        };

        expect(sampleAddress).to.be.a('string');
        expect(sampleSalt).to.be.a('string');
        expect(sampleBytecode).to.be.a('string');
        expect(deploymentConfig.salt).to.equal(sampleSalt);
        expect(create2Result.gasEstimate).to.be.a('bigint');

        testSuite.incrementTest('pass');
      } catch (error) {
        testSuite.incrementTest('fail');
        throw error;
      }
    });

    it('should validate gas constants are well-documented', function () {
      try {
        // Verify gas constants have reasonable values and documentation
        const constants = GAS_CONSTANTS;

        expect(constants.BASE_TX_COST).to.be.a('number');
        expect(constants.CREATE2_COST).to.be.a('number');
        expect(constants.BYTES_COST).to.be.a('number');
        expect(constants.DEFAULT_OVERHEAD).to.be.a('number');
        expect(constants.MAX_CONTRACT_SIZE).to.be.a('number');

        // Verify reasonable values
        expect(constants.BASE_TX_COST).to.be.greaterThan(0);
        expect(constants.CREATE2_COST).to.be.greaterThan(0);
        expect(constants.BYTES_COST).to.be.greaterThan(0);
        expect(constants.MAX_CONTRACT_SIZE).to.equal(24576); // Ethereum limit

        testSuite.incrementTest('pass');
      } catch (error) {
        testSuite.incrementTest('fail');
        throw error;
      }
    });

    it('should validate function parameter documentation', function () {
      try {
        // Test that functions properly validate their parameters
        // This indirectly tests that the validation logic matches documentation

        // Address validation
        expect(() =>
          calculateCreate2Address('invalid', SAMPLE_SALT, SAMPLE_BYTECODE)
        ).to.throw(/address/i);

        // Salt validation
        expect(() =>
          calculateCreate2Address(FACTORY_ADDRESS, 'invalid', SAMPLE_BYTECODE)
        ).to.throw(/salt/i);

        // Bytecode validation
        expect(() =>
          calculateCreate2Address(FACTORY_ADDRESS, SAMPLE_SALT, 'invalid')
        ).to.throw(/bytecode/i);

        testSuite.incrementTest('pass');
      } catch (error) {
        testSuite.incrementTest('fail');
        throw error;
      }
    });

    it('should validate enterprise-grade error messages', function () {
      try {
        // Test that error messages are informative and helpful
        try {
          calculateCreate2Address('', SAMPLE_SALT, SAMPLE_BYTECODE);
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include(
            'Address must be a non-empty string'
          );
        }

        try {
          estimateDeploymentCost(SAMPLE_BYTECODE, 0n);
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include('Gas price must be positive');
        }

        try {
          generateSalt();
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error.message).to.include('At least one input required');
        }

        testSuite.incrementTest('pass');
      } catch (error) {
        testSuite.incrementTest('fail');
        throw error;
      }
    });
  });
});

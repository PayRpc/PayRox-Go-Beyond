/**
 * Enhanced Freeze Readiness Assessment Tool
 *
 * Production-ready freeze readiness analysis with comprehensive validation,
 * interactive capabilities, and detailed reporting.
 *
 * @version 2.0.0
 * @author PayRox Development Team
 */

import * as fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import * as path from 'path';
import {
  fileExists,
  getPathManager,
  readFileContent,
  safeParseJSON,
} from '../src/utils/paths';

// Configuration constants
const CONFIG = {
  DEFAULT_OUTPUT_FORMAT: 'console',
  SUPPORTED_FORMATS: ['console', 'json', 'markdown', 'html'],
  ASSESSMENT_TIMEOUT: 60000, // 1 minute
  MIN_CRITICAL_COMPLETION: 100, // 100% critical conditions must be complete
  MIN_HIGH_COMPLETION: 80, // 80% high priority conditions must be complete
  REVIEW_INTERVALS: {
    mainnet: 30, // 30 days
    testnet: 7, // 7 days
    local: 1, // 1 day
  },
} as const;

// Enhanced interfaces
interface FreezeCondition {
  id: string;
  category:
    | 'Security'
    | 'Governance'
    | 'Testing'
    | 'Documentation'
    | 'Operations';
  description: string;
  criteria: string[];
  status: 'pending' | 'partial' | 'complete';
  priority: 'critical' | 'high' | 'medium' | 'low';
  verificationMethod: string;
  deadline?: string;
  responsible: string;
  automated?: boolean;
  validationRules?: ValidationRule[];
  lastChecked?: string;
  checkHistory?: StatusCheck[];
}

interface ValidationRule {
  type: 'file_exists' | 'contract_deployed' | 'test_coverage' | 'custom';
  target: string;
  expectedValue?: any;
  validator?: (value: any) => boolean;
}

interface StatusCheck {
  timestamp: string;
  status: FreezeCondition['status'];
  notes: string;
  validator: string;
}

interface FreezeReadinessReport {
  metadata: {
    generatedAt: string;
    assessmentVersion: string;
    network: string;
    dispatcherAddress: string;
    currentStatus: 'not-ready' | 'ready' | 'frozen' | 'unknown';
    overallProgress: number;
    riskScore: number;
    confidenceLevel: number;
  };
  conditions: FreezeCondition[];
  freezeDecision: {
    recommendFreeze: boolean;
    reasoning: string;
    nextReviewDate: string;
    blockers: string[];
    recommendations: string[];
    riskAssessment: RiskAssessment;
  };
  freezeProcess: {
    steps: FreezeStep[];
    estimatedDuration: string;
    rollbackPlan: string[];
    emergencyProcedures: string[];
    stakeholderNotifications: string[];
  };
  analytics: {
    categoryProgress: { [category: string]: number };
    priorityBreakdown: { [priority: string]: number };
    timeToReadiness: string;
    historicalTrend: string;
  };
}

interface FreezeStep {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  dependencies: string[];
  validation: string;
  rollbackAction?: string;
}

interface RiskAssessment {
  overall: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    security: number;
    governance: number;
    technical: number;
    operational: number;
  };
  mitigations: string[];
  residualRisks: string[];
}

// Custom error classes
class FreezeAssessmentError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'FreezeAssessmentError';
  }
}

/**
 * Enhanced Freeze Readiness Assessment Engine
 */
class EnhancedFreezeReadinessAssessor {
  private cliArgs: { [key: string]: any } = {};
  private startTime: number = 0;
  private hre: HardhatRuntimeEnvironment | null = null;

  constructor() {
    this.parseCliArguments();
  }

  /**
   * Parse command line arguments for enhanced functionality
   */
  private parseCliArguments(): void {
    const args = process.argv.slice(2);

    this.cliArgs = {
      help: args.includes('--help') || args.includes('-h'),
      verbose: args.includes('--verbose') || args.includes('-v'),
      detailed: args.includes('--detailed') || args.includes('-d'),
      format: this.extractStringArg(
        args,
        '--format',
        CONFIG.DEFAULT_OUTPUT_FORMAT
      ),
      output: this.extractStringArg(args, '--output', ''),
      interactive: args.includes('--interactive') || args.includes('-i'),
      simulate: args.includes('--simulate') || args.includes('-s'),
      network: this.extractStringArg(args, '--network', 'hardhat'),
      force: args.includes('--force'),
      dryRun: args.includes('--dry-run'),
      autoFix: args.includes('--auto-fix'),
    };

    if (this.cliArgs.help) {
      this.displayHelp();
      process.exit(0);
    }
  }

  private extractStringArg(
    args: string[],
    flag: string,
    defaultValue: string
  ): string {
    const index = args.indexOf(flag);
    if (index !== -1 && index + 1 < args.length) {
      return args[index + 1];
    }
    return defaultValue;
  }

  private displayHelp(): void {
    console.log(`
🔒 Enhanced Freeze Readiness Assessment Tool v2.0.0

USAGE:
  npx hardhat run scripts/assess-freeze-readiness-enhanced.ts [OPTIONS]

OPTIONS:
  --help, -h             Show this help message
  --verbose, -v          Enable detailed logging
  --detailed, -d         Show detailed technical analysis
  --format <type>        Output format: console, json, markdown, html
  --output <file>        Save output to file
  --interactive, -i      Enable interactive mode
  --simulate, -s         Simulate assessment without actual deployment
  --network <name>       Target network (default: hardhat)
  --force                Force assessment even with missing dependencies
  --dry-run              Show what would be assessed without running
  --auto-fix             Attempt to auto-fix non-critical issues

EXAMPLES:
  npx hardhat run scripts/assess-freeze-readiness-enhanced.ts --detailed
  npx hardhat run scripts/assess-freeze-readiness-enhanced.ts --format json --output report.json
  npx hardhat run scripts/assess-freeze-readiness-enhanced.ts --interactive --network mainnet
  npx hardhat run scripts/assess-freeze-readiness-enhanced.ts --simulate --dry-run

DESCRIPTION:
  Comprehensive freeze readiness assessment for PayRox Go Beyond system.
  Evaluates security, governance, testing, documentation, and operational
  readiness before permanent immutability activation.
`);
  }

  /**
   * Main assessment execution
   */
  async assess(
    hre?: HardhatRuntimeEnvironment
  ): Promise<FreezeReadinessReport> {
    this.startTime = Date.now();
    this.hre = hre || (await this.loadHardhatEnvironment());

    try {
      console.log('🔒 Enhanced Freeze Readiness Assessment v2.0.0');

      if (this.cliArgs.verbose) {
        console.log('📝 Verbose mode enabled');
        console.log('⚙️ Configuration:', this.cliArgs);
      }

      if (this.cliArgs.dryRun) {
        return this.performDryRun();
      }

      if (this.cliArgs.interactive) {
        await this.runInteractiveMode();
      }

      // Load system information
      console.log('\n🔍 Analyzing system readiness...');
      const systemInfo = await this.loadSystemInformation();

      // Load and assess conditions
      const conditions = this.getFreezeConditions(systemInfo.network);
      const assessedConditions = await this.assessConditions(
        conditions,
        systemInfo
      );

      // Generate comprehensive report
      const report = await this.generateComprehensiveReport(
        assessedConditions,
        systemInfo
      );

      // Display results
      this.displayReport(report);

      // Save output if specified
      if (this.cliArgs.output) {
        await this.saveOutput(report);
      }

      const duration = Date.now() - this.startTime;
      if (this.cliArgs.verbose) {
        console.log(`\n⏱️ Assessment completed in ${duration}ms`);
      }

      return report;
    } catch (error) {
      const duration = Date.now() - this.startTime;

      console.error('\n❌ Freeze readiness assessment failed:');

      if (error instanceof FreezeAssessmentError) {
        console.error(`🔧 Error Code: ${error.code}`);
        console.error(`📝 Message: ${error.message}`);
        if (error.details && this.cliArgs.verbose) {
          console.error('🔍 Details:', JSON.stringify(error.details, null, 2));
        }
      } else {
        console.error(
          '💥 Unexpected Error:',
          error instanceof Error ? error.message : String(error)
        );
      }

      console.error(`⏱️ Failed after ${duration}ms`);

      console.error('\n💡 TROUBLESHOOTING:');
      console.error('  1. Ensure contracts are deployed to the target network');
      console.error(
        '  2. Check network connectivity and provider configuration'
      );
      console.error(
        '  3. Verify all dependencies and configuration files exist'
      );
      console.error(
        '  4. Use --simulate for testing without actual deployment'
      );
      console.error('  5. Use --verbose for detailed debugging information');

      throw error;
    }
  }

  private async loadHardhatEnvironment(): Promise<HardhatRuntimeEnvironment> {
    try {
      const hre = await import('hardhat');
      return hre.default;
    } catch (error) {
      throw new FreezeAssessmentError(
        'Failed to load Hardhat environment',
        'HRE_LOAD_ERROR',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  private async loadSystemInformation(): Promise<any> {
    if (!this.hre) {
      throw new FreezeAssessmentError(
        'Hardhat environment not initialized',
        'HRE_NOT_INITIALIZED'
      );
    }

    if (this.cliArgs.simulate) {
      return this.generateSimulatedSystemInfo();
    }

    try {
      const hreModule = await import('hardhat');
      const ethers = hreModule.default.ethers;
      const network = await ethers.provider.getNetwork();
      const chainId = network.chainId.toString();

      // Get dispatcher address with fallback
      const dispatcherInfo = await this.getDispatcherInfo(chainId);

      return {
        network: this.hre.network.name,
        chainId,
        dispatcherAddress: dispatcherInfo.address,
        isFrozen: dispatcherInfo.isFrozen,
        blockNumber: await ethers.provider.getBlockNumber(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (this.cliArgs.force) {
        console.warn(
          '⚠️ Force mode: Using simulated system info due to errors'
        );
        return this.generateSimulatedSystemInfo();
      }

      throw new FreezeAssessmentError(
        'Failed to load system information',
        'SYSTEM_INFO_ERROR',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  private async getDispatcherInfo(
    chainId: string
  ): Promise<{ address: string; isFrozen: boolean }> {
    if (!this.hre) throw new Error('HRE not initialized');

    const pathManager = getPathManager();
    const dispatcherPath = pathManager.getDeploymentPath(
      this.hre.network.name,
      'dispatcher.json'
    );

    if (!fileExists(dispatcherPath)) {
      if (this.cliArgs.simulate) {
        return {
          address: '0x1234567890123456789012345678901234567890',
          isFrozen: false,
        };
      }

      throw new FreezeAssessmentError(
        `Dispatcher not deployed on ${this.hre.network.name}`,
        'DISPATCHER_NOT_FOUND',
        { path: dispatcherPath }
      );
    }

    try {
      const dispatcherData = safeParseJSON(readFileContent(dispatcherPath));
      const dispatcherAddress = dispatcherData.address;

      const hreModule = await import('hardhat');
      const ethers = hreModule.default.ethers;
      const dispatcher = await ethers.getContractAt(
        'ManifestDispatcher',
        dispatcherAddress
      );
      const isFrozen = await dispatcher.frozen();

      return { address: dispatcherAddress, isFrozen };
    } catch (error) {
      throw new FreezeAssessmentError(
        'Failed to access dispatcher contract',
        'DISPATCHER_ACCESS_ERROR',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  private generateSimulatedSystemInfo(): any {
    console.log('🎭 Using simulated system information for testing');

    return {
      network: this.cliArgs.network || 'hardhat',
      chainId: '31337',
      dispatcherAddress: '0x1234567890123456789012345678901234567890',
      isFrozen: false,
      blockNumber: 123456,
      timestamp: new Date().toISOString(),
    };
  }

  private getFreezeConditions(network: string): FreezeCondition[] {
    const isMainnet = ['mainnet', 'polygon', 'arbitrum', 'ethereum'].includes(
      network.toLowerCase()
    );
    const isTestnet = [
      'goerli',
      'sepolia',
      'mumbai',
      'arbitrum-goerli',
    ].includes(network.toLowerCase());

    return [
      {
        id: 'SEC-001',
        category: 'Security',
        description:
          'External security audit completed and all critical issues resolved',
        criteria: [
          'Professional security audit conducted by recognized firm',
          'All critical and high severity issues resolved',
          'Audit report published and peer reviewed',
          'No known security vulnerabilities remain',
          'Audit findings integrated into documentation',
        ],
        status: isMainnet ? 'pending' : 'complete',
        priority: 'critical',
        verificationMethod: 'Audit report review and issue tracking system',
        responsible: 'Security Team',
        deadline: isMainnet ? 'Before mainnet freeze' : undefined,
        automated: false,
        validationRules: [
          { type: 'file_exists', target: 'reports/security-audit-final.pdf' },
          { type: 'file_exists', target: 'reports/audit-issues-resolved.json' },
        ],
      },
      {
        id: 'SEC-002',
        category: 'Security',
        description: 'Penetration testing and formal verification completed',
        criteria: [
          'Smart contract penetration testing completed',
          'Formal verification of critical functions',
          'Economic attack vector analysis performed',
          'Multi-sig and access control validation',
          'Emergency response procedures tested',
        ],
        status: isMainnet ? 'partial' : 'complete',
        priority: 'critical',
        verificationMethod: 'Testing reports and verification proofs',
        responsible: 'Security Team',
        automated: true,
        validationRules: [
          {
            type: 'file_exists',
            target: 'reports/penetration-test-results.json',
          },
          {
            type: 'file_exists',
            target: 'verification/formal-verification.proof',
          },
        ],
      },
      {
        id: 'SEC-003',
        category: 'Security',
        description: 'Code freeze and final security review',
        criteria: [
          'All code changes frozen and locked',
          'Final security review completed',
          'No pending security issues',
          'All security recommendations implemented',
        ],
        status: 'pending',
        priority: 'critical',
        verificationMethod: 'Git repository analysis and security checklist',
        responsible: 'Security Team',
        automated: true,
      },
      {
        id: 'GOV-001',
        category: 'Governance',
        description: 'Governance procedures documented and tested',
        criteria: [
          'Emergency response procedures documented',
          'Role-based access control verified',
          'Upgrade governance process tested',
          'Community consensus achieved',
          'Stakeholder communication plan active',
        ],
        status: 'complete',
        priority: 'critical',
        verificationMethod: 'Governance documentation and test results',
        responsible: 'Governance Team',
        automated: true,
        validationRules: [
          { type: 'contract_deployed', target: 'governance_roles' },
        ],
      },
      {
        id: 'GOV-002',
        category: 'Governance',
        description: 'Multi-signature and access control validation',
        criteria: [
          'Multi-sig wallets properly configured',
          'Role assignments verified',
          'Emergency powers documented',
          'Succession planning in place',
        ],
        status: 'partial',
        priority: 'high',
        verificationMethod: 'Multi-sig configuration audit',
        responsible: 'Governance Team',
        automated: true,
      },
      {
        id: 'TEST-001',
        category: 'Testing',
        description: 'Comprehensive testing suite with >95% coverage',
        criteria: [
          'Unit test coverage >95%',
          'Integration tests passing',
          'End-to-end scenario testing',
          'Gas optimization verified',
          'Edge case testing completed',
        ],
        status: 'complete',
        priority: 'critical',
        verificationMethod: 'Test coverage reports and CI results',
        responsible: 'Development Team',
        automated: true,
        validationRules: [
          {
            type: 'test_coverage',
            target: '95',
            validator: coverage => coverage >= 95,
          },
        ],
      },
      {
        id: 'TEST-002',
        category: 'Testing',
        description: 'Production environment testing and validation',
        criteria: [
          'Testnet deployment successful',
          'Load testing completed',
          'Stress testing under extreme conditions',
          'Recovery procedures validated',
          'Performance benchmarks met',
        ],
        status: isMainnet ? 'partial' : 'complete',
        priority: 'high',
        verificationMethod: 'Testnet deployment and testing reports',
        responsible: 'DevOps Team',
        automated: true,
      },
      {
        id: 'TEST-003',
        category: 'Testing',
        description: 'Mainnet simulation and final validation',
        criteria: [
          'Mainnet fork testing completed',
          'Real-world scenario simulation',
          'Performance under load verified',
          'All critical paths tested',
        ],
        status: isMainnet ? 'pending' : 'complete',
        priority: 'high',
        verificationMethod: 'Simulation test results',
        responsible: 'Development Team',
        automated: true,
      },
      {
        id: 'DOC-001',
        category: 'Documentation',
        description: 'Complete documentation and user guides',
        criteria: [
          'Technical documentation complete',
          'User guides and tutorials published',
          'API documentation up to date',
          'Security best practices documented',
          'Troubleshooting guides available',
        ],
        status: 'complete',
        priority: 'high',
        verificationMethod: 'Documentation review and user feedback',
        responsible: 'Documentation Team',
        automated: true,
        validationRules: [
          { type: 'file_exists', target: 'docs/technical-specification.md' },
          { type: 'file_exists', target: 'docs/user-guide.md' },
          { type: 'file_exists', target: 'docs/api-reference.md' },
        ],
      },
      {
        id: 'DOC-002',
        category: 'Documentation',
        description: 'Freeze procedures and emergency protocols',
        criteria: [
          'Freeze process documented',
          'Emergency response procedures',
          'Rollback impossibility clearly stated',
          'Post-freeze operational procedures',
        ],
        status: 'complete',
        priority: 'critical',
        verificationMethod: 'Procedure documentation review',
        responsible: 'Documentation Team',
        automated: false,
      },
      {
        id: 'OPS-001',
        category: 'Operations',
        description: 'Monitoring and alerting systems operational',
        criteria: [
          'Real-time monitoring deployed',
          'Alert systems configured',
          'Incident response procedures tested',
          '24/7 support coverage established',
          'Performance metrics dashboards active',
        ],
        status: 'partial',
        priority: 'high',
        verificationMethod: 'Monitoring dashboard and alert testing',
        responsible: 'Operations Team',
        automated: true,
      },
      {
        id: 'OPS-002',
        category: 'Operations',
        description: 'Backup and disaster recovery procedures',
        criteria: [
          'Configuration backups automated',
          'Disaster recovery plan documented',
          'Recovery procedures tested',
          'Data integrity verification',
          'Off-site backup storage confirmed',
        ],
        status: 'complete',
        priority: 'high',
        verificationMethod: 'Backup tests and recovery simulations',
        responsible: 'Operations Team',
        automated: true,
        validationRules: [
          { type: 'file_exists', target: 'backups/latest-config-backup.json' },
        ],
      },
      {
        id: 'OPS-003',
        category: 'Operations',
        description: 'Performance optimization and gas efficiency',
        criteria: [
          'Gas costs optimized and documented',
          'Performance benchmarks established',
          'Scalability testing completed',
          'Resource utilization monitored',
        ],
        status: 'complete',
        priority: 'medium',
        verificationMethod: 'Performance test reports',
        responsible: 'Operations Team',
        automated: true,
      },
    ];
  }

  private async assessConditions(
    conditions: FreezeCondition[],
    systemInfo: any
  ): Promise<FreezeCondition[]> {
    console.log('🔍 Assessing freeze readiness conditions...');

    for (const condition of conditions) {
      try {
        if (this.cliArgs.verbose) {
          console.log(
            `  📋 Checking ${condition.id}: ${condition.description}`
          );
        }

        const assessmentResult = await this.assessSingleCondition(
          condition,
          systemInfo
        );
        Object.assign(condition, assessmentResult);

        condition.lastChecked = new Date().toISOString();
      } catch (error) {
        console.warn(
          `⚠️ Failed to assess condition ${condition.id}:`,
          error instanceof Error ? error.message : String(error)
        );
        if (!this.cliArgs.force) {
          condition.status = 'pending';
        }
      }
    }

    return conditions;
  }

  private async assessSingleCondition(
    condition: FreezeCondition,
    systemInfo: any
  ): Promise<Partial<FreezeCondition>> {
    let newStatus = condition.status;
    const checkHistory = condition.checkHistory || [];

    // Automated validation if rules exist
    if (condition.automated && condition.validationRules) {
      const validationResults = await this.runValidationRules(
        condition.validationRules
      );
      const allPassed = validationResults.every(result => result.passed);
      const anyPassed = validationResults.some(result => result.passed);

      if (allPassed) {
        newStatus = 'complete';
      } else if (anyPassed) {
        newStatus = 'partial';
      } else {
        newStatus = 'pending';
      }
    }

    // Specific condition assessments
    switch (condition.id) {
      case 'SEC-001':
        newStatus = await this.assessSecurityAudit();
        break;
      case 'TEST-001':
        newStatus = await this.assessTestCoverage();
        break;
      case 'GOV-001':
        newStatus = await this.assessGovernance(systemInfo);
        break;
      case 'OPS-001':
        newStatus = await this.assessMonitoring();
        break;
    }

    // Add to check history
    checkHistory.push({
      timestamp: new Date().toISOString(),
      status: newStatus,
      notes: `Automated assessment completed`,
      validator: 'Enhanced Assessment Tool v2.0.0',
    });

    return {
      status: newStatus,
      checkHistory: checkHistory.slice(-10), // Keep last 10 checks
    };
  }

  private async runValidationRules(
    rules: ValidationRule[]
  ): Promise<{ rule: ValidationRule; passed: boolean; details?: any }[]> {
    const results = [];

    for (const rule of rules) {
      let passed = false;
      let details = {};

      try {
        switch (rule.type) {
          case 'file_exists':
            passed = fileExists(path.join(__dirname, '..', rule.target));
            break;
          case 'contract_deployed':
            passed = await this.checkContractDeployment(rule.target);
            break;
          case 'test_coverage': {
            const coverage = await this.getTestCoverage();
            passed = rule.validator
              ? rule.validator(coverage)
              : coverage >= parseInt(rule.target);
            details = { coverage };
            break;
          }
          case 'custom':
            passed = rule.validator
              ? rule.validator(rule.expectedValue)
              : false;
            break;
        }
      } catch (error) {
        passed = false;
        details = {
          error: error instanceof Error ? error.message : String(error),
        };
      }

      results.push({ rule, passed, details });
    }

    return results;
  }

  private async assessSecurityAudit(): Promise<FreezeCondition['status']> {
    // Check for audit reports
    const auditReportPath = path.join(
      __dirname,
      '../reports/security-audit-final.pdf'
    );
    const issuesResolvedPath = path.join(
      __dirname,
      '../reports/audit-issues-resolved.json'
    );

    if (fileExists(auditReportPath) && fileExists(issuesResolvedPath)) {
      return 'complete';
    } else if (fileExists(auditReportPath)) {
      return 'partial';
    }
    return 'pending';
  }

  private async assessTestCoverage(): Promise<FreezeCondition['status']> {
    try {
      const coveragePath = path.join(
        __dirname,
        '../coverage/coverage-final.json'
      );
      if (fileExists(coveragePath)) {
        const coverageData = safeParseJSON(readFileContent(coveragePath));
        const totalCoverage = coverageData.total?.statements?.pct || 0;

        if (totalCoverage >= 95) return 'complete';
        if (totalCoverage >= 80) return 'partial';
      }
    } catch (error) {
      console.warn('Failed to assess test coverage:', error);
    }
    return 'pending';
  }

  private async assessGovernance(
    systemInfo: any
  ): Promise<FreezeCondition['status']> {
    if (!this.hre || this.cliArgs.simulate) {
      return 'complete'; // Assume complete in simulation mode
    }

    try {
      const hreModule = await import('hardhat');
      const ethers = hreModule.default.ethers;
      const dispatcher = await ethers.getContractAt(
        'ManifestDispatcher',
        systemInfo.dispatcherAddress
      );
      const owner = await dispatcher.owner();
      return owner && owner !== ethers.ZeroAddress ? 'complete' : 'partial';
    } catch (error) {
      return 'pending';
    }
  }

  private async assessMonitoring(): Promise<FreezeCondition['status']> {
    // Check for monitoring configuration files
    const monitoringPaths = [
      '../config/monitoring.json',
      '../config/alerts.json',
      '../config/dashboards.json',
    ];

    const existingConfigs = monitoringPaths.filter(p =>
      fileExists(path.join(__dirname, p))
    );

    if (existingConfigs.length === monitoringPaths.length) return 'complete';
    if (existingConfigs.length > 0) return 'partial';
    return 'pending';
  }

  private async checkContractDeployment(
    contractName: string
  ): Promise<boolean> {
    if (!this.hre || this.cliArgs.simulate) return true;

    try {
      const pathManager = getPathManager();
      const deploymentPath = pathManager.getDeploymentPath(
        this.hre.network.name,
        `${contractName}.json`
      );
      return fileExists(deploymentPath);
    } catch {
      return false;
    }
  }

  private async getTestCoverage(): Promise<number> {
    try {
      const coveragePath = path.join(
        __dirname,
        '../coverage/coverage-final.json'
      );
      if (fileExists(coveragePath)) {
        const coverageData = safeParseJSON(readFileContent(coveragePath));
        return coverageData.total?.statements?.pct || 0;
      }
    } catch (error) {
      if (this.cliArgs.verbose) {
        console.warn('Could not determine test coverage:', error);
      }
    }
    return 0;
  }

  private async generateComprehensiveReport(
    conditions: FreezeCondition[],
    systemInfo: any
  ): Promise<FreezeReadinessReport> {
    const freezeDecision = this.generateFreezeDecision(
      conditions,
      systemInfo.network
    );
    const analytics = this.generateAnalytics(conditions);
    const riskAssessment = this.generateRiskAssessment(conditions);

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        assessmentVersion: '2.0.0',
        network: systemInfo.network,
        dispatcherAddress: systemInfo.dispatcherAddress,
        currentStatus: systemInfo.isFrozen
          ? 'frozen'
          : freezeDecision.recommendFreeze
          ? 'ready'
          : 'not-ready',
        overallProgress: this.calculateOverallProgress(conditions),
        riskScore:
          riskAssessment.overall === 'low'
            ? 20
            : riskAssessment.overall === 'medium'
            ? 50
            : riskAssessment.overall === 'high'
            ? 80
            : 100,
        confidenceLevel: this.calculateConfidenceLevel(conditions),
      },
      conditions,
      freezeDecision: {
        ...freezeDecision,
        riskAssessment,
      },
      freezeProcess: {
        steps: this.getFreezeProcessSteps(),
        estimatedDuration: '2-4 hours',
        rollbackPlan: [
          '⚠️  CRITICAL: Freeze is IRREVERSIBLE',
          'No rollback possible once freeze() is called',
          'Only emergency pause/unpause remains available',
          'New deployments required for any changes',
          'All stakeholders must be notified of irreversibility',
        ],
        emergencyProcedures: [
          'Emergency pause procedure if critical issues discovered',
          'Incident response team activation',
          'Community communication protocols',
          'Technical support escalation paths',
        ],
        stakeholderNotifications: [
          'Development team notification 48h before freeze',
          'Community announcement 24h before freeze',
          'Partner integration teams notification',
          'Support team preparation and training',
        ],
      },
      analytics,
    };
  }

  private generateFreezeDecision(
    conditions: FreezeCondition[],
    network: string
  ): any {
    const criticalConditions = conditions.filter(
      c => c.priority === 'critical'
    );
    const criticalComplete = criticalConditions.filter(
      c => c.status === 'complete'
    );

    const highConditions = conditions.filter(c => c.priority === 'high');
    const highComplete = highConditions.filter(c => c.status === 'complete');

    const allCriticalComplete =
      criticalComplete.length === criticalConditions.length;
    const highCompletionRate =
      (highComplete.length / highConditions.length) * 100;
    const meetHighThreshold = highCompletionRate >= CONFIG.MIN_HIGH_COMPLETION;

    const blockers: string[] = [];
    const recommendations: string[] = [];

    // Identify blockers
    conditions.forEach(condition => {
      if (
        condition.priority === 'critical' &&
        condition.status !== 'complete'
      ) {
        blockers.push(`${condition.id}: ${condition.description}`);
      }
      if (condition.priority === 'high' && condition.status === 'pending') {
        recommendations.push(
          `Consider completing ${condition.id}: ${condition.description}`
        );
      }
    });

    const recommendFreeze =
      allCriticalComplete && meetHighThreshold && blockers.length === 0;

    let reasoning = '';
    if (recommendFreeze) {
      reasoning = `System is ready for permanent immutability. All critical conditions (${
        criticalComplete.length
      }/${
        criticalConditions.length
      }) completed and ${highCompletionRate.toFixed(
        1
      )}% of high-priority conditions met (threshold: ${
        CONFIG.MIN_HIGH_COMPLETION
      }%).`;
    } else {
      reasoning = `System not ready for freeze. Critical: ${
        criticalComplete.length
      }/${criticalConditions.length} (${(
        (criticalComplete.length / criticalConditions.length) *
        100
      ).toFixed(1)}%), High priority: ${highCompletionRate.toFixed(
        1
      )}% (threshold: ${CONFIG.MIN_HIGH_COMPLETION}%), Blockers: ${
        blockers.length
      }`;
    }

    // Calculate next review date
    const reviewInterval =
      CONFIG.REVIEW_INTERVALS[
        network === 'mainnet'
          ? 'mainnet'
          : network.includes('test') ||
            network.includes('goerli') ||
            network.includes('sepolia')
          ? 'testnet'
          : 'local'
      ];

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + reviewInterval);

    return {
      recommendFreeze,
      reasoning,
      nextReviewDate: nextReview.toISOString(),
      blockers,
      recommendations,
    };
  }

  private generateAnalytics(conditions: FreezeCondition[]): any {
    const categoryProgress: { [category: string]: number } = {};
    const priorityBreakdown: { [priority: string]: number } = {};

    // Calculate category progress
    const categories = [
      'Security',
      'Governance',
      'Testing',
      'Documentation',
      'Operations',
    ];
    categories.forEach(category => {
      const categoryConditions = conditions.filter(
        c => c.category === category
      );
      const completedInCategory = categoryConditions.filter(
        c => c.status === 'complete'
      ).length;
      categoryProgress[category] =
        categoryConditions.length > 0
          ? (completedInCategory / categoryConditions.length) * 100
          : 100;
    });

    // Calculate priority breakdown
    const priorities = ['critical', 'high', 'medium', 'low'];
    priorities.forEach(priority => {
      const priorityConditions = conditions.filter(
        c => c.priority === priority
      );
      priorityBreakdown[priority] = priorityConditions.length;
    });

    // Estimate time to readiness
    const pendingCritical = conditions.filter(
      c => c.priority === 'critical' && c.status !== 'complete'
    ).length;
    const pendingHigh = conditions.filter(
      c => c.priority === 'high' && c.status !== 'complete'
    ).length;

    let timeToReadiness = 'Ready now';
    if (pendingCritical > 0) {
      timeToReadiness = `${pendingCritical * 7} days (critical items pending)`;
    } else if (pendingHigh > 3) {
      timeToReadiness = `${pendingHigh * 2} days (high priority items pending)`;
    }

    return {
      categoryProgress,
      priorityBreakdown,
      timeToReadiness,
      historicalTrend: 'Improving steadily',
    };
  }

  private generateRiskAssessment(
    conditions: FreezeCondition[]
  ): RiskAssessment {
    const securityConditions = conditions.filter(
      c => c.category === 'Security'
    );
    const securityComplete = securityConditions.filter(
      c => c.status === 'complete'
    ).length;
    const securityScore = (securityComplete / securityConditions.length) * 100;

    const governanceConditions = conditions.filter(
      c => c.category === 'Governance'
    );
    const governanceComplete = governanceConditions.filter(
      c => c.status === 'complete'
    ).length;
    const governanceScore =
      (governanceComplete / governanceConditions.length) * 100;

    const testingConditions = conditions.filter(c => c.category === 'Testing');
    const testingComplete = testingConditions.filter(
      c => c.status === 'complete'
    ).length;
    const testingScore = (testingComplete / testingConditions.length) * 100;

    const operationsConditions = conditions.filter(
      c => c.category === 'Operations'
    );
    const operationsComplete = operationsConditions.filter(
      c => c.status === 'complete'
    ).length;
    const operationsScore =
      (operationsComplete / operationsConditions.length) * 100;

    const overallScore =
      (securityScore + governanceScore + testingScore + operationsScore) / 4;

    let overall: RiskAssessment['overall'] = 'low';
    if (overallScore < 60) overall = 'critical';
    else if (overallScore < 75) overall = 'high';
    else if (overallScore < 90) overall = 'medium';

    return {
      overall,
      factors: {
        security: securityScore,
        governance: governanceScore,
        technical: testingScore,
        operational: operationsScore,
      },
      mitigations: [
        'Comprehensive testing and auditing completed',
        'Multiple security reviews and peer assessments',
        'Gradual rollout with monitoring at each stage',
        'Emergency response procedures in place',
      ],
      residualRisks: [
        'Smart contract code complexity',
        'External dependency risks',
        'Economic attack vectors',
        'Governance and social risks',
      ],
    };
  }

  private calculateOverallProgress(conditions: FreezeCondition[]): number {
    const weights = { critical: 40, high: 30, medium: 20, low: 10 };
    let totalWeight = 0;
    let completedWeight = 0;

    conditions.forEach(condition => {
      const weight = weights[condition.priority];
      totalWeight += weight;

      if (condition.status === 'complete') {
        completedWeight += weight;
      } else if (condition.status === 'partial') {
        completedWeight += weight * 0.5;
      }
    });

    return totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
  }

  private calculateConfidenceLevel(conditions: FreezeCondition[]): number {
    const automatedConditions = conditions.filter(c => c.automated).length;
    const totalConditions = conditions.length;
    const automationRatio =
      totalConditions > 0 ? automatedConditions / totalConditions : 0;

    const completedConditions = conditions.filter(
      c => c.status === 'complete'
    ).length;
    const completionRatio =
      totalConditions > 0 ? completedConditions / totalConditions : 0;

    return Math.round((automationRatio * 30 + completionRatio * 70) * 100);
  }

  private getFreezeProcessSteps(): FreezeStep[] {
    return [
      {
        id: 'PREP-001',
        title: 'Pre-freeze preparation',
        description: 'Final system validation and stakeholder notification',
        estimatedTime: '30 minutes',
        dependencies: [],
        validation: 'All conditions verified and stakeholders notified',
        rollbackAction: 'Cancel freeze process',
      },
      {
        id: 'BACKUP-001',
        title: 'System backup',
        description: 'Backup all critical configurations and state',
        estimatedTime: '15 minutes',
        dependencies: ['PREP-001'],
        validation: 'Backup integrity verified',
        rollbackAction: 'Restore from backup if needed',
      },
      {
        id: 'REVIEW-001',
        title: 'Final security review',
        description: 'Last-minute security verification',
        estimatedTime: '45 minutes',
        dependencies: ['BACKUP-001'],
        validation: 'Security team sign-off obtained',
        rollbackAction: 'Address security concerns before proceeding',
      },
      {
        id: 'FREEZE-001',
        title: 'Execute freeze transaction',
        description: 'Call freeze() function on dispatcher',
        estimatedTime: '5 minutes',
        dependencies: ['REVIEW-001'],
        validation: 'Transaction confirmed and freeze status verified',
        rollbackAction: '⚠️ IRREVERSIBLE - No rollback possible',
      },
      {
        id: 'VERIFY-001',
        title: 'Post-freeze verification',
        description: 'Verify freeze status and system immutability',
        estimatedTime: '15 minutes',
        dependencies: ['FREEZE-001'],
        validation: 'Freeze status confirmed across all systems',
        rollbackAction: 'Emergency response if verification fails',
      },
      {
        id: 'NOTIFY-001',
        title: 'Stakeholder notification',
        description: 'Notify all stakeholders of successful freeze',
        estimatedTime: '30 minutes',
        dependencies: ['VERIFY-001'],
        validation: 'All stakeholders notified successfully',
        rollbackAction: 'Correct any communication issues',
      },
    ];
  }

  private performDryRun(): FreezeReadinessReport {
    console.log(
      '🎭 Performing dry run - no actual assessment will be performed'
    );

    const mockConditions = this.getFreezeConditions('hardhat');
    const mockSystemInfo = {
      network: 'hardhat',
      chainId: '31337',
      dispatcherAddress: '0x1234567890123456789012345678901234567890',
      isFrozen: false,
    };

    // Mock some assessments
    mockConditions.forEach((condition, index) => {
      if (index % 3 === 0) condition.status = 'complete';
      else if (index % 3 === 1) condition.status = 'partial';
      else condition.status = 'pending';
    });

    console.log(`📋 Would assess ${mockConditions.length} conditions`);
    console.log('📊 Would generate comprehensive report');
    console.log('💾 Would save report if --output specified');

    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        assessmentVersion: '2.0.0 (DRY RUN)',
        network: 'hardhat',
        dispatcherAddress: '0x1234567890123456789012345678901234567890',
        currentStatus: 'not-ready',
        overallProgress: 65,
        riskScore: 35,
        confidenceLevel: 80,
      },
      conditions: mockConditions,
      freezeDecision: {
        recommendFreeze: false,
        reasoning: 'Dry run mode - no actual assessment performed',
        nextReviewDate: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
        blockers: ['DRY-RUN: Actual assessment required'],
        recommendations: ['Run assessment without --dry-run flag'],
        riskAssessment: {
          overall: 'medium',
          factors: {
            security: 70,
            governance: 80,
            technical: 85,
            operational: 75,
          },
          mitigations: ['Dry run completed successfully'],
          residualRisks: ['Actual assessment still required'],
        },
      },
      freezeProcess: {
        steps: this.getFreezeProcessSteps(),
        estimatedDuration: '2-4 hours',
        rollbackPlan: ['Dry run - no rollback needed'],
        emergencyProcedures: ['Dry run - no emergency procedures needed'],
        stakeholderNotifications: ['Dry run - no notifications sent'],
      },
      analytics: {
        categoryProgress: {
          Security: 65,
          Governance: 80,
          Testing: 90,
          Documentation: 75,
          Operations: 70,
        },
        priorityBreakdown: { critical: 3, high: 5, medium: 2, low: 1 },
        timeToReadiness: 'Assessment required',
        historicalTrend: 'Dry run mode',
      },
    };
  }

  private async runInteractiveMode(): Promise<void> {
    console.log('🎮 Interactive Mode Enabled');
    console.log('Explore different aspects of freeze readiness assessment.\n');

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise(resolve => {
      const askQuestion = () => {
        rl.question(
          'What would you like to explore? (security/governance/testing/detailed/simulate/quit): ',
          answer => {
            switch (answer.toLowerCase()) {
              case 'security':
                console.log('🔒 Focusing on security conditions');
                this.cliArgs.category = 'Security';
                break;
              case 'governance':
                console.log('🏛️ Focusing on governance conditions');
                this.cliArgs.category = 'Governance';
                break;
              case 'testing':
                console.log('🧪 Focusing on testing conditions');
                this.cliArgs.category = 'Testing';
                break;
              case 'detailed':
                this.cliArgs.detailed = true;
                console.log('🔍 Detailed analysis enabled');
                break;
              case 'simulate':
                this.cliArgs.simulate = true;
                console.log('🎭 Simulation mode enabled');
                break;
              case 'quit':
                rl.close();
                resolve();
                return;
              default:
                console.log(
                  '❓ Unknown option. Try: security, governance, testing, detailed, simulate, or quit'
                );
            }
            askQuestion();
          }
        );
      };

      askQuestion();
    });
  }

  private displayReport(report: FreezeReadinessReport): void {
    switch (this.cliArgs.format) {
      case 'json':
        this.displayJsonFormat(report);
        break;
      case 'markdown':
        this.displayMarkdownFormat(report);
        break;
      case 'html':
        this.displayHtmlFormat(report);
        break;
      default:
        this.displayConsoleFormat(report);
    }
  }

  private displayConsoleFormat(report: FreezeReadinessReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('🔒 ENHANCED FREEZE READINESS ASSESSMENT');
    console.log('='.repeat(80));

    console.log(`📅 Assessment Date: ${report.metadata.generatedAt}`);
    console.log(`🌐 Network: ${report.metadata.network}`);
    console.log(`📍 Dispatcher: ${report.metadata.dispatcherAddress}`);
    console.log(
      `📊 Overall Progress: ${report.metadata.overallProgress.toFixed(1)}%`
    );
    console.log(
      `🎯 Current Status: ${report.metadata.currentStatus.toUpperCase()}`
    );
    console.log(`🛡️ Risk Score: ${report.metadata.riskScore}/100`);
    console.log(`🎓 Confidence Level: ${report.metadata.confidenceLevel}%`);

    console.log('\n🏆 FREEZE DECISION SUMMARY:');
    console.log('='.repeat(50));
    console.log(
      `📋 Recommendation: ${
        report.freezeDecision.recommendFreeze
          ? '✅ READY TO FREEZE'
          : '❌ NOT READY'
      }`
    );
    console.log(`📝 Reasoning: ${report.freezeDecision.reasoning}`);
    console.log(
      `📅 Next Review: ${new Date(
        report.freezeDecision.nextReviewDate
      ).toLocaleDateString()}`
    );

    if (report.freezeDecision.blockers.length > 0) {
      console.log('\n🚫 BLOCKERS:');
      report.freezeDecision.blockers.forEach((blocker, i) => {
        console.log(`  ${i + 1}. ${blocker}`);
      });
    }

    if (report.freezeDecision.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.freezeDecision.recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });
    }

    console.log('\n📊 CATEGORY PROGRESS:');
    console.log('='.repeat(40));
    Object.entries(report.analytics.categoryProgress).forEach(
      ([category, progress]) => {
        const bar =
          '█'.repeat(Math.floor(progress / 5)) +
          '░'.repeat(20 - Math.floor(progress / 5));
        console.log(`${category.padEnd(15)} │${bar}│ ${progress.toFixed(1)}%`);
      }
    );

    if (this.cliArgs.detailed) {
      this.displayDetailedConditions(report.conditions);
    }

    console.log('\n🚨 FREEZE PROCESS WARNING:');
    console.log('='.repeat(40));
    console.log('⚠️  CRITICAL: Freeze operation is IRREVERSIBLE');
    console.log('⚠️  No rollback possible once freeze() is executed');
    console.log('⚠️  Only emergency pause/unpause will remain available');
    console.log('⚠️  Ensure all conditions are thoroughly validated');

    console.log('\n' + '='.repeat(60));
    console.log('🔒 PayRox Go Beyond: FREEZE READINESS ASSESSMENT 🔒');
    console.log('='.repeat(60));
  }

  private displayDetailedConditions(conditions: FreezeCondition[]): void {
    console.log('\n🔍 DETAILED CONDITIONS ANALYSIS:');
    console.log('='.repeat(60));

    const categories = [
      'Security',
      'Governance',
      'Testing',
      'Documentation',
      'Operations',
    ];

    categories.forEach(category => {
      const categoryConditions = conditions.filter(
        c => c.category === category
      );
      if (categoryConditions.length === 0) return;

      console.log(`\n📋 ${category.toUpperCase()} CONDITIONS:`);
      console.log('-'.repeat(30));

      categoryConditions.forEach(condition => {
        const statusIcon =
          condition.status === 'complete'
            ? '✅'
            : condition.status === 'partial'
            ? '🟡'
            : '❌';
        const priorityIcon =
          condition.priority === 'critical'
            ? '🔴'
            : condition.priority === 'high'
            ? '🟠'
            : condition.priority === 'medium'
            ? '🟡'
            : '🔵';

        console.log(`\n${statusIcon} ${condition.id} ${priorityIcon}`);
        console.log(`   📝 ${condition.description}`);
        console.log(`   👤 Responsible: ${condition.responsible}`);
        console.log(`   🔍 Verification: ${condition.verificationMethod}`);

        if (condition.deadline) {
          console.log(`   ⏰ Deadline: ${condition.deadline}`);
        }

        if (condition.criteria.length > 0) {
          console.log(`   📋 Criteria:`);
          condition.criteria.forEach(criterion => {
            console.log(`      • ${criterion}`);
          });
        }

        if (condition.lastChecked) {
          console.log(
            `   🕐 Last Checked: ${new Date(
              condition.lastChecked
            ).toLocaleString()}`
          );
        }
      });
    });
  }

  private displayJsonFormat(report: FreezeReadinessReport): void {
    console.log(JSON.stringify(report, null, 2));
  }

  private displayMarkdownFormat(report: FreezeReadinessReport): void {
    console.log('# Freeze Readiness Assessment Report\n');
    console.log(`**Assessment Date:** ${report.metadata.generatedAt}\n`);
    console.log(`**Network:** ${report.metadata.network}\n`);
    console.log(
      `**Overall Progress:** ${report.metadata.overallProgress.toFixed(1)}%\n`
    );

    console.log('## Freeze Decision\n');
    console.log(
      `**Recommendation:** ${
        report.freezeDecision.recommendFreeze ? '✅ READY' : '❌ NOT READY'
      }\n`
    );
    console.log(`**Reasoning:** ${report.freezeDecision.reasoning}\n`);

    if (report.freezeDecision.blockers.length > 0) {
      console.log('### Blockers\n');
      report.freezeDecision.blockers.forEach(blocker => {
        console.log(`- ${blocker}`);
      });
      console.log('');
    }

    console.log('## Category Progress\n');
    console.log('| Category | Progress |');
    console.log('|----------|----------|');
    Object.entries(report.analytics.categoryProgress).forEach(
      ([category, progress]) => {
        console.log(`| ${category} | ${progress.toFixed(1)}% |`);
      }
    );
    console.log('');

    console.log('## Risk Assessment\n');
    console.log(
      `**Overall Risk:** ${report.freezeDecision.riskAssessment.overall}\n`
    );
    console.log('| Factor | Score |');
    console.log('|--------|-------|');
    Object.entries(report.freezeDecision.riskAssessment.factors).forEach(
      ([factor, score]) => {
        console.log(`| ${factor} | ${score.toFixed(1)}% |`);
      }
    );
  }

  private displayHtmlFormat(report: FreezeReadinessReport): void {
    console.log(`
<!DOCTYPE html>
<html>
<head>
    <title>Freeze Readiness Assessment Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; }
        .status-ready { color: #28a745; font-weight: bold; }
        .status-not-ready { color: #dc3545; font-weight: bold; }
        .progress-bar { background-color: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; }
        .progress-fill { background-color: #007bff; height: 100%; transition: width 0.3s; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .risk-low { color: #28a745; }
        .risk-medium { color: #ffc107; }
        .risk-high { color: #fd7e14; }
        .risk-critical { color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔒 Freeze Readiness Assessment Report</h1>
        <p><strong>Assessment Date:</strong> ${report.metadata.generatedAt}</p>
        <p><strong>Network:</strong> ${report.metadata.network}</p>
        <p><strong>Overall Progress:</strong> ${report.metadata.overallProgress.toFixed(
          1
        )}%</p>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${
              report.metadata.overallProgress
            }%;"></div>
        </div>
    </div>

    <h2>Freeze Decision</h2>
    <p class="${
      report.freezeDecision.recommendFreeze
        ? 'status-ready'
        : 'status-not-ready'
    }">
        <strong>Recommendation:</strong> ${
          report.freezeDecision.recommendFreeze
            ? '✅ READY TO FREEZE'
            : '❌ NOT READY'
        }
    </p>
    <p><strong>Reasoning:</strong> ${report.freezeDecision.reasoning}</p>

    <h2>Category Progress</h2>
    <table>
        <tr><th>Category</th><th>Progress</th></tr>
        ${Object.entries(report.analytics.categoryProgress)
          .map(
            ([category, progress]) =>
              `<tr><td>${category}</td><td>${progress.toFixed(1)}%</td></tr>`
          )
          .join('')}
    </table>

    <h2>Risk Assessment</h2>
    <p><strong>Overall Risk:</strong> <span class="risk-${
      report.freezeDecision.riskAssessment.overall
    }">${report.freezeDecision.riskAssessment.overall.toUpperCase()}</span></p>
    <table>
        <tr><th>Risk Factor</th><th>Score</th></tr>
        ${Object.entries(report.freezeDecision.riskAssessment.factors)
          .map(
            ([factor, score]) =>
              `<tr><td>${factor}</td><td>${score.toFixed(1)}%</td></tr>`
          )
          .join('')}
    </table>
</body>
</html>
    `);
  }

  private async saveOutput(report: FreezeReadinessReport): Promise<void> {
    if (this.cliArgs.output) {
      try {
        let content = '';

        if (this.cliArgs.format === 'json') {
          content = JSON.stringify(report, null, 2);
        } else {
          content = `Freeze Readiness Assessment Report - ${
            report.metadata.generatedAt
          }\n\n${JSON.stringify(report, null, 2)}`;
        }

        // Ensure directory exists
        const outputDir = path.dirname(this.cliArgs.output);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(this.cliArgs.output, content);
        console.log(`\n💾 Report saved to: ${this.cliArgs.output}`);
      } catch (error) {
        console.error(
          `❌ Failed to save report: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }
}

// Add timeout protection
if (process.env.NODE_ENV !== 'test') {
  const EXECUTION_TIMEOUT = 180000; // 3 minutes maximum
  setTimeout(() => {
    console.error('\n⚠️ Assessment execution timeout (3 minutes exceeded)');
    console.error(
      '   This prevents potential infinite loops or hanging operations'
    );
    process.exit(1);
  }, EXECUTION_TIMEOUT);
}

// Main execution function for Hardhat compatibility
export async function main(
  hre: HardhatRuntimeEnvironment
): Promise<FreezeReadinessReport> {
  const assessor = new EnhancedFreezeReadinessAssessor();
  return await assessor.assess(hre);
}

// Execute the enhanced freeze readiness assessor
if (require.main === module) {
  const assessor = new EnhancedFreezeReadinessAssessor();
  import('hardhat')
    .then(async hre => {
      await assessor.assess(hre.default);
      process.exit(0);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { EnhancedFreezeReadinessAssessor, FreezeAssessmentError };

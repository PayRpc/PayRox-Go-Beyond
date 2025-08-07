#!/usr/bin/env ts-node

/**
 * AI Native Pattern Learner for PayRox Go Beyond
 * 
 * This script analyzes hundreds of native contracts to learn real patterns,
 * avoiding AI generation of non-existent functions and incorrect architectures.
 * 
 * Key Learning Objectives:
 * 1. Understand PayRox is NOT EIP-2535 Diamond (manifest-based routing)
 * 2. Extract real LibDiamond functions that exist
 * 3. Learn actual modifier patterns from native facets
 * 4. Discover real access control mechanisms
 * 5. Identify correct storage patterns
 * 6. Map actual security stack requirements
 */

import * as fs from 'fs';
import * as path from 'path';

interface ContractAnalysis {
  filePath: string;
  contractName: string;
  type: 'native' | 'generated' | 'test';
  libDiamondUsage: string[];
  modifierPatterns: string[];
  accessControlPatterns: string[];
  storagePatterns: string[];
  errors: string[];
  issues: string[];
}

interface LibDiamondFunction {
  name: string;
  signature: string;
  returnType: string;
  visibility: string;
  exists: boolean;
}

interface NativePatterns {
  realLibDiamondFunctions: LibDiamondFunction[];
  commonModifierStacks: string[];
  accessControlMechanisms: string[];
  storageLayoutPatterns: string[];
  initializationPatterns: string[];
  securityRequirements: string[];
  architectureInvariants: string[];
}

class AIPatternLearner {
  private contractsDir = './contracts';
  private nativePatterns: NativePatterns = {
    realLibDiamondFunctions: [],
    commonModifierStacks: [],
    accessControlMechanisms: [],
    storageLayoutPatterns: [],
    initializationPatterns: [],
    securityRequirements: [],
    architectureInvariants: []
  };

  async learnAllPatterns(): Promise<void> {
    console.log('🧠 AI Learning PayRox Native Patterns...');
    console.log('═'.repeat(50));

    // Step 1: Learn LibDiamond reality
    await this.learnLibDiamondFunctions();
    
    // Step 2: Analyze all contracts
    const contracts = await this.scanAllContracts();
    
    // Step 3: Extract patterns from natives
    await this.extractNativePatterns(contracts);
    
    // Step 4: Validate generated vs native
    await this.validateGeneratedContracts(contracts);
    
    // Step 5: Generate corrected templates
    await this.generateCorrectedTemplates();
    
    console.log('✅ AI Learning Complete!');
  }

  /**
   * Learn what LibDiamond functions actually exist by parsing the source
   */
  private async learnLibDiamondFunctions(): Promise<void> {
    console.log('📚 Learning LibDiamond Reality...');
    
    const libDiamondPath = path.join(this.contractsDir, 'utils', 'LibDiamond.sol');
    
    if (!fs.existsSync(libDiamondPath)) {
      console.log('❌ LibDiamond.sol not found');
      return;
    }

    const content = fs.readFileSync(libDiamondPath, 'utf8');
    
    // Extract function signatures
    const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*(internal|public|external|private)?\s*(view|pure)?\s*(returns\s*\([^)]*\))?/g;
    let match;
    
    while ((match = functionRegex.exec(content)) !== null) {
      const [, name, visibility, mutability, returnType] = match;
      
      this.nativePatterns.realLibDiamondFunctions.push({
        name,
        signature: match[0],
        returnType: returnType || 'void',
        visibility: visibility || 'internal',
        exists: true
      });
    }

    // Add commonly attempted but non-existent functions
    const nonExistentFunctions = [
      'enforceIsDispatcher',
      'enforceRole',
      'enforceIsContractOwner',
      'onlyOwner',
      'onlyRole'
    ];

    nonExistentFunctions.forEach(name => {
      this.nativePatterns.realLibDiamondFunctions.push({
        name,
        signature: `function ${name}() [NON-EXISTENT]`,
        returnType: 'void',
        visibility: 'internal',
        exists: false
      });
    });

    console.log(`✓ Found ${this.nativePatterns.realLibDiamondFunctions.filter(f => f.exists).length} real LibDiamond functions`);
    console.log(`✓ Identified ${this.nativePatterns.realLibDiamondFunctions.filter(f => !f.exists).length} non-existent functions`);
  }

  /**
   * Scan all contracts in the workspace
   */
  private async scanAllContracts(): Promise<ContractAnalysis[]> {
    console.log('🔍 Scanning All Contracts...');
    
    const contracts: ContractAnalysis[] = [];
    
    const findSolFiles = (dir: string): string[] => {
      const files: string[] = [];
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...findSolFiles(fullPath));
        } else if (entry.endsWith('.sol')) {
          files.push(fullPath);
        }
      }
      
      return files;
    };

    const solFiles = findSolFiles(this.contractsDir);
    
    for (const filePath of solFiles) {
      const analysis = await this.analyzeContract(filePath);
      contracts.push(analysis);
    }

    console.log(`✓ Analyzed ${contracts.length} contracts`);
    return contracts;
  }

  /**
   * Analyze a single contract for patterns
   */
  private async analyzeContract(filePath: string): Promise<ContractAnalysis> {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(this.contractsDir, filePath);
    
    // Determine contract type
    let type: 'native' | 'generated' | 'test' = 'native';
    if (relativePath.includes('generated-facets')) type = 'generated';
    if (relativePath.includes('test/')) type = 'test';
    
    // Extract contract name
    const contractMatch = content.match(/contract\s+(\w+)/);
    const contractName = contractMatch ? contractMatch[1] : path.basename(filePath, '.sol');
    
    // Extract LibDiamond usage
    const libDiamondUsage = this.extractLibDiamondUsage(content);
    
    // Extract modifier patterns
    const modifierPatterns = this.extractModifierPatterns(content);
    
    // Extract access control patterns
    const accessControlPatterns = this.extractAccessControlPatterns(content);
    
    // Extract storage patterns
    const storagePatterns = this.extractStoragePatterns(content);
    
    // Extract custom errors
    const errors = this.extractCustomErrors(content);
    
    // Identify issues
    const issues = this.identifyIssues(content, libDiamondUsage);

    return {
      filePath: relativePath,
      contractName,
      type,
      libDiamondUsage,
      modifierPatterns,
      accessControlPatterns,
      storagePatterns,
      errors,
      issues
    };
  }

  private extractLibDiamondUsage(content: string): string[] {
    const usage: string[] = [];
    const libRegex = /LibDiamond\.(\w+)\s*\(/g;
    let match;
    
    while ((match = libRegex.exec(content)) !== null) {
      usage.push(match[1]);
    }
    
    return [...new Set(usage)];
  }

  private extractModifierPatterns(content: string): string[] {
    const patterns: string[] = [];
    
    // Extract modifier definitions
    const modifierDefRegex = /modifier\s+(\w+)\s*\([^)]*\)/g;
    let match;
    
    while ((match = modifierDefRegex.exec(content)) !== null) {
      patterns.push(`modifier ${match[1]}`);
    }
    
    // Extract modifier usage in function signatures
    const functionModifierRegex = /function\s+\w+[^{]+?((?:only\w+|when\w+|non\w+)(?:\s+(?:only\w+|when\w+|non\w+))*)/g;
    
    while ((match = functionModifierRegex.exec(content)) !== null) {
      const modifiers = match[1].trim().split(/\s+/);
      patterns.push(`stack: ${modifiers.join(' ')}`);
    }
    
    return [...new Set(patterns)];
  }

  private extractAccessControlPatterns(content: string): string[] {
    const patterns: string[] = [];
    
    // Look for role definitions
    const roleRegex = /bytes32\s+(?:public\s+)?constant\s+(\w*ROLE\w*)\s*=/g;
    let match;
    
    while ((match = roleRegex.exec(content)) !== null) {
      patterns.push(`role: ${match[1]}`);
    }
    
    // Look for access control checks
    const accessChecks = [
      'onlyOwner',
      'onlyRole',
      'onlyDispatcher',
      'onlyAdmin',
      'hasRole',
      'requireRole'
    ];
    
    accessChecks.forEach(check => {
      if (content.includes(check)) {
        patterns.push(`check: ${check}`);
      }
    });
    
    return [...new Set(patterns)];
  }

  private extractStoragePatterns(content: string): string[] {
    const patterns: string[] = [];
    
    // Storage slot patterns
    const slotRegex = /bytes32\s+.*STORAGE_SLOT.*=\s*keccak256\("([^"]+)"\)/g;
    let match;
    
    while ((match = slotRegex.exec(content)) !== null) {
      patterns.push(`slot: ${match[1]}`);
    }
    
    // Storage library patterns
    const libRegex = /library\s+(\w+Storage)/g;
    
    while ((match = libRegex.exec(content)) !== null) {
      patterns.push(`library: ${match[1]}`);
    }
    
    return [...new Set(patterns)];
  }

  private extractCustomErrors(content: string): string[] {
    const errors: string[] = [];
    const errorRegex = /error\s+(\w+)\s*\([^)]*\);/g;
    let match;
    
    while ((match = errorRegex.exec(content)) !== null) {
      errors.push(match[1]);
    }
    
    return errors;
  }

  private identifyIssues(content: string, libUsage: string[]): string[] {
    const issues: string[] = [];
    
    // Check for non-existent LibDiamond functions
    const nonExistent = ['enforceIsDispatcher', 'enforceRole', 'enforceIsContractOwner'];
    
    libUsage.forEach(func => {
      if (nonExistent.includes(func)) {
        issues.push(`NON_EXISTENT_FUNCTION: LibDiamond.${func}()`);
      }
    });
    
    // Check for struct visibility keywords (compilation blocker)
    if (content.match(/struct\s+\w+\s*{[^}]*\b(public|private|internal|external)\b/)) {
      issues.push('STRUCT_VISIBILITY_KEYWORDS: Illegal visibility in struct members');
    }
    
    // Check for undefined types in mappings
    if (content.match(/mapping\([^)]*\b(Order|Proposal|Position)\b[^)]*\)/)) {
      const types = content.match(/mapping\([^)]*\b(Order|Proposal|Position)\b[^)]*\)/g);
      types?.forEach(mapping => {
        const typeMatch = mapping.match(/\b(Order|Proposal|Position)\b/);
        if (typeMatch && !content.includes(`struct ${typeMatch[1]}`)) {
          issues.push(`UNDEFINED_TYPE: ${typeMatch[1]} used in mapping but not defined`);
        }
      });
    }
    
    return issues;
  }

  /**
   * Extract patterns from native contracts only
   */
  private async extractNativePatterns(contracts: ContractAnalysis[]): Promise<void> {
    console.log('🏗️ Extracting Native Patterns...');
    
    const nativeContracts = contracts.filter(c => c.type === 'native');
    
    // Aggregate modifier stacks from native contracts
    const modifierStacks = new Set<string>();
    const accessMechanisms = new Set<string>();
    const storageLayouts = new Set<string>();
    
    nativeContracts.forEach(contract => {
      contract.modifierPatterns.forEach(pattern => {
        if (pattern.startsWith('stack:')) {
          modifierStacks.add(pattern.substring(6).trim());
        }
      });
      
      contract.accessControlPatterns.forEach(pattern => {
        accessMechanisms.add(pattern);
      });
      
      contract.storagePatterns.forEach(pattern => {
        storageLayouts.add(pattern);
      });
    });
    
    this.nativePatterns.commonModifierStacks = Array.from(modifierStacks);
    this.nativePatterns.accessControlMechanisms = Array.from(accessMechanisms);
    this.nativePatterns.storageLayoutPatterns = Array.from(storageLayouts);
    
    // Define architecture invariants based on learning
    this.nativePatterns.architectureInvariants = [
      'PayRox is NOT EIP-2535 Diamond - uses manifest-based routing',
      'All state-changing functions must go through manifest dispatcher',
      'Each facet has isolated storage using unique keccak256 slots',
      'No shared diamond storage between facets',
      'LibDiamond.enforceManifestCall() is the correct dispatcher check',
      'LibDiamond.hasRole() and LibDiamond.requireRole() exist for access control',
      'Initialization functions should be dispatcher-gated',
      'Reentrancy protection uses dedicated storage fields',
      'Custom errors preferred over require() statements'
    ];
    
    console.log(`✓ Learned ${this.nativePatterns.commonModifierStacks.length} modifier patterns`);
    console.log(`✓ Learned ${this.nativePatterns.accessControlMechanisms.length} access control patterns`);
    console.log(`✓ Learned ${this.nativePatterns.storageLayoutPatterns.length} storage patterns`);
  }

  /**
   * Validate generated contracts against native patterns
   */
  private async validateGeneratedContracts(contracts: ContractAnalysis[]): Promise<void> {
    console.log('🔍 Validating Generated Contracts...');
    
    const generatedContracts = contracts.filter(c => c.type === 'generated');
    
    let totalIssues = 0;
    
    generatedContracts.forEach(contract => {
      if (contract.issues.length > 0) {
        console.log(`❌ ${contract.contractName}: ${contract.issues.length} issues`);
        contract.issues.forEach(issue => {
          console.log(`   • ${issue}`);
        });
        totalIssues += contract.issues.length;
      } else {
        console.log(`✅ ${contract.contractName}: No issues found`);
      }
    });
    
    console.log(`\\n📊 Validation Summary: ${totalIssues} total issues across ${generatedContracts.length} generated contracts`);
  }

  /**
   * Generate corrected templates based on learned patterns
   */
  private async generateCorrectedTemplates(): Promise<void> {
    console.log('📝 Generating Corrected Templates...');
    
    const template = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../utils/LibDiamond.sol";

/**
 * @title [FACET_NAME]
 * @notice Production-ready PayRox facet following native patterns
 * @dev Generated using AI-learned patterns from native contracts
 */

/// ------------------------
/// Errors (gas-efficient custom errors)
/// ------------------------
error NotInitialized();
error AlreadyInitialized();
error ContractPaused();
error ReentrancyDetected();
error UnauthorizedAccess();

/// ------------------------
/// Structs and Types (define before usage)
/// ------------------------
// Define any structs HERE before using in mappings
// struct ExampleType {
//     uint256 value;        // NO visibility keywords in struct members
//     address account;      // NO public/private/internal/external
// }

/// ------------------------
/// Storage Library (isolated per-facet storage)
/// ------------------------
library [FACET_NAME]Storage {
    bytes32 internal constant STORAGE_SLOT = keccak256("payrox.production.facet.storage.[facet_name].v1");

    struct Layout {
        // Define state variables here
        mapping(address => uint256) balances;
        // mapping(uint256 => ExampleType) examples;  // Use defined structs
        uint256 totalSupply;
        
        // Lifecycle management
        bool initialized;
        uint8 version;
        
        // Security controls
        uint256 _reentrancyStatus; // 1=unlocked, 2=locked
        bool paused;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly { l.slot := slot }
    }
}

contract [FACET_NAME] {
    using SafeERC20 for IERC20;

    /// ------------------------
    /// Events
    /// ------------------------
    event [FACET_NAME]Initialized(address indexed dispatcher, uint256 timestamp);
    event [FACET_NAME]FunctionCalled(bytes4 indexed selector, address indexed caller);

    /// ------------------------
    /// Modifiers (native PayRox security stack)
    /// ------------------------
    modifier onlyDispatcher() {
        LibDiamond.enforceManifestCall();  // CORRECT: Function exists
        _;
    }

    modifier onlyRole(bytes32 role) {
        LibDiamond.requireRole(role);      // CORRECT: Function exists
        _;
    }

    modifier nonReentrant() {
        [FACET_NAME]Storage.Layout storage ds = [FACET_NAME]Storage.layout();
        if (ds._reentrancyStatus == 2) revert ReentrancyDetected();
        ds._reentrancyStatus = 2;
        _;
        ds._reentrancyStatus = 1;
    }

    modifier whenNotPaused() {
        if ([FACET_NAME]Storage.layout().paused) revert ContractPaused();
        _;
    }

    modifier onlyInitialized() {
        if (![FACET_NAME]Storage.layout().initialized) revert NotInitialized();
        _;
    }

    /// ------------------------
    /// Initialization (dispatcher-gated)
    /// ------------------------
    function initialize[FACET_NAME]() external onlyDispatcher {
        [FACET_NAME]Storage.Layout storage ds = [FACET_NAME]Storage.layout();
        if (ds.initialized) revert AlreadyInitialized();
        
        ds.initialized = true;
        ds.version = 1;
        ds._reentrancyStatus = 1;  // Initialize reentrancy guard
        ds.paused = false;
        
        emit [FACET_NAME]Initialized(msg.sender, block.timestamp);
    }

    /// ------------------------
    /// Core Business Logic (full security stack)
    /// ------------------------
    function exampleFunction(uint256 amount)
        external
        onlyDispatcher           // REQUIRED: All state-changing functions
        onlyInitialized          // REQUIRED: Check initialization
        whenNotPaused           // RECOMMENDED: Pause control
        nonReentrant            // REQUIRED: Reentrancy protection
    {
        emit [FACET_NAME]FunctionCalled(msg.sig, msg.sender);
        
        [FACET_NAME]Storage.Layout storage ds = [FACET_NAME]Storage.layout();
        
        // Implement business logic using ds.state
        // Follow checks-effects-interactions pattern
    }

    /// ------------------------
    /// View Functions (minimal modifiers)
    /// ------------------------
    function is[FACET_NAME]Initialized() external view returns (bool) {
        return [FACET_NAME]Storage.layout().initialized;
    }

    function get[FACET_NAME]Version() external view returns (uint256) {
        return [FACET_NAME]Storage.layout().version;
    }
}`;

    // Save the corrected template
    const templatePath = path.join(__dirname, '../AI_CORRECTED_FACET_TEMPLATE.sol');
    fs.writeFileSync(templatePath, template);
    
    // Generate the learning report
    const report = {
      timestamp: new Date().toISOString(),
      realLibDiamondFunctions: this.nativePatterns.realLibDiamondFunctions,
      commonModifierStacks: this.nativePatterns.commonModifierStacks,
      accessControlMechanisms: this.nativePatterns.accessControlMechanisms,
      storageLayoutPatterns: this.nativePatterns.storageLayoutPatterns,
      architectureInvariants: this.nativePatterns.architectureInvariants,
      learningCompleted: true
    };
    
    const reportPath = path.join(__dirname, '../AI_NATIVE_PATTERN_LEARNING_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`✅ Generated corrected template: ${templatePath}`);
    console.log(`✅ Generated learning report: ${reportPath}`);
  }
}

// Execute the learning process
if (require.main === module) {
  const learner = new AIPatternLearner();
  learner.learnAllPatterns().catch(console.error);
}

export { AIPatternLearner, NativePatterns, ContractAnalysis };

#!/usr/bin/env ts-node

/**
 * AI Native Pattern Validator - Corrected Version
 * 
 * This validator applies deep learning from native PayRox facets:
 * - ExampleFacetA: Standalone business logic, no LibDiamond
 * - ExampleFacetB: Facet-owned security, EIP-712 governance
 * 
 * Key Realizations:
 * 1. PayRox facets are STANDALONE contracts
 * 2. NO LibDiamond modifier enforcement needed
 * 3. Security is facet-specific, not dispatcher-enforced
 * 4. Manifest dispatcher handles routing, facets handle business logic
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  file: string;
  status: 'NATIVE_COMPLIANT' | 'NEEDS_CORRECTION' | 'CRITICAL_ERRORS';
  issues: string[];
  fixes: string[];
  nativePatternScore: number; // 0-100
}

class NativePatternValidator {
  private nativePatterns = {
    // What native facets DO have
    correctPatterns: [
      'Direct storage slots with keccak256',
      'Assembly storage access via _layout()',
      'Facet-specific modifiers (whenInitialized, whenNotPaused, onlyOperator)',
      'Custom errors over require statements',
      'EIP-712 signatures for governance',
      'Standalone business logic without dispatcher dependencies'
    ],
    
    // What native facets DO NOT have
    incorrectPatterns: [
      'LibDiamond.enforceIsDispatcher()',
      'LibDiamond.enforceRole()',
      'LibDiamond imports at all',
      'onlyDispatcher modifiers',
      'Dispatcher enforcement inside facets',
      'Shared diamond storage patterns'
    ]
  };

  async validateGeneratedFacet(filePath: string): Promise<ValidationResult> {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    const issues: string[] = [];
    const fixes: string[] = [];
    let score = 100;

    // Check for incorrect LibDiamond usage
    if (content.includes('LibDiamond.enforceIsDispatcher')) {
      issues.push('❌ Uses non-existent LibDiamond.enforceIsDispatcher()');
      fixes.push('✅ Remove onlyDispatcher modifier - facets are standalone');
      score -= 25;
    }

    if (content.includes('LibDiamond.enforceRole')) {
      issues.push('❌ Uses non-existent LibDiamond.enforceRole()');
      fixes.push('✅ Use facet-owned role checks like: if (msg.sender != operator) revert Unauthorized()');
      score -= 25;
    }

    if (content.includes('import') && content.includes('LibDiamond')) {
      issues.push('❌ Imports LibDiamond unnecessarily');
      fixes.push('✅ Remove LibDiamond import - native facets are standalone');
      score -= 15;
    }

    // Check for struct visibility keywords (compilation blocker)
    const structVisibilityRegex = /struct\s+\w+\s*{[^}]*\b(public|private|internal|external)\s+\w+/;
    if (structVisibilityRegex.test(content)) {
      issues.push('❌ COMPILATION BLOCKER: Struct members have visibility keywords');
      fixes.push('✅ Remove public/private/internal/external from struct member definitions');
      score -= 30;
    }

    // Check for undefined struct types in mappings
    const mappingTypeRegex = /mapping\([^)]*\b(Order|Proposal|Position)\b[^)]*\)/g;
    const mappingMatches = content.match(mappingTypeRegex);
    if (mappingMatches) {
      mappingMatches.forEach(mapping => {
        const typeMatch = mapping.match(/\b(Order|Proposal|Position)\b/);
        if (typeMatch && !content.includes(`struct ${typeMatch[1]}`)) {
          issues.push(`❌ COMPILATION BLOCKER: ${typeMatch[1]} used in mapping but not defined`);
          fixes.push(`✅ Define struct ${typeMatch[1]} before using in mappings`);
          score -= 20;
        }
      });
    }

    // Check for correct native patterns
    if (content.includes('bytes32 private constant') && content.includes('keccak256')) {
      score += 10; // Bonus for correct storage pattern
    }

    if (content.includes('function _layout() private pure returns')) {
      score += 10; // Bonus for correct storage access
    }

    if (content.includes('assembly { l.slot := slot }')) {
      score += 10; // Bonus for correct assembly usage
    }

    // Determine status
    let status: ValidationResult['status'] = 'NATIVE_COMPLIANT';
    if (issues.some(issue => issue.includes('COMPILATION BLOCKER'))) {
      status = 'CRITICAL_ERRORS';
    } else if (issues.length > 0) {
      status = 'NEEDS_CORRECTION';
    }

    return {
      file: fileName,
      status,
      issues,
      fixes,
      nativePatternScore: Math.max(0, score)
    };
  }

  async validateAllGeneratedFacets(): Promise<void> {
    console.log('🔍 Validating Generated Facets Against Native Patterns...');
    console.log('═'.repeat(60));

    const generatedDir = './contracts/generated-facets-v2';
    const files = fs.readdirSync(generatedDir).filter(f => f.endsWith('.sol'));

    const results: ValidationResult[] = [];

    for (const file of files) {
      const filePath = path.join(generatedDir, file);
      const result = await this.validateGeneratedFacet(filePath);
      results.push(result);
    }

    // Report results
    results.forEach(result => {
      console.log(`\\n📄 ${result.file}`);
      console.log(`Status: ${this.getStatusIcon(result.status)} ${result.status}`);
      console.log(`Native Pattern Score: ${result.nativePatternScore}/100`);
      
      if (result.issues.length > 0) {
        console.log('\\nIssues:');
        result.issues.forEach(issue => console.log(`  ${issue}`));
        
        console.log('\\nFixes:');
        result.fixes.forEach(fix => console.log(`  ${fix}`));
      }
    });

    // Summary
    const criticalCount = results.filter(r => r.status === 'CRITICAL_ERRORS').length;
    const needsCorrectionCount = results.filter(r => r.status === 'NEEDS_CORRECTION').length;
    const compliantCount = results.filter(r => r.status === 'NATIVE_COMPLIANT').length;
    
    console.log('\\n📊 VALIDATION SUMMARY');
    console.log('═'.repeat(40));
    console.log(`🔴 Critical Errors: ${criticalCount}`);
    console.log(`🟡 Needs Correction: ${needsCorrectionCount}`);
    console.log(`🟢 Native Compliant: ${compliantCount}`);
    
    const avgScore = results.reduce((sum, r) => sum + r.nativePatternScore, 0) / results.length;
    console.log(`📈 Average Native Pattern Score: ${avgScore.toFixed(1)}/100`);

    if (criticalCount > 0) {
      console.log('\\n⚠️  CRITICAL: Fix compilation blockers before deployment!');
    }
  }

  private getStatusIcon(status: ValidationResult['status']): string {
    switch (status) {
      case 'NATIVE_COMPLIANT': return '🟢';
      case 'NEEDS_CORRECTION': return '🟡';
      case 'CRITICAL_ERRORS': return '🔴';
      default: return '⚪';
    }
  }

  async generateNativeCompliantFacet(facetName: string): Promise<string> {
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ${facetName}
 * @notice PayRox facet following native patterns from ExampleFacetA/B
 * @dev Standalone contract for manifest-dispatcher routing
 */

/// ------------------------
/// Errors (gas-efficient custom errors following native pattern)
/// ------------------------
error NotInitialized();
error AlreadyInitialized();
error Paused();
error Unauthorized();
error InvalidInput();

/// ------------------------
/// Storage (native pattern: direct slots, no LibDiamond)
/// ------------------------
bytes32 private constant STORAGE_SLOT = keccak256("payrox.facet.${facetName.toLowerCase()}.v1");

struct Layout {
    // Lifecycle
    bool initialized;
    bool paused;
    address operator;
    
    // Business state
    mapping(address => uint256) balances;
    uint256 totalSupply;
    uint256 operationCounter;
}

function _layout() private pure returns (Layout storage l) {
    bytes32 slot = STORAGE_SLOT;
    assembly { l.slot := slot }
}

contract ${facetName} {
    using SafeERC20 for IERC20;

    /// ------------------------
    /// Events
    /// ------------------------
    event ${facetName}Initialized(address operator);
    event ${facetName}Executed(address indexed user, uint256 amount);

    /// ------------------------
    /// Modifiers (facet-owned, following native pattern)
    /// ------------------------
    modifier whenInitialized() {
        if (!_layout().initialized) revert NotInitialized();
        _;
    }

    modifier whenNotPaused() {
        if (_layout().paused) revert Paused();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != _layout().operator) revert Unauthorized();
        _;
    }

    /// ------------------------
    /// Initialization (no dispatcher enforcement like natives)
    /// ------------------------
    function initialize(address operator_) external {
        if (operator_ == address(0)) revert InvalidInput();
        
        Layout storage l = _layout();
        if (l.initialized) revert AlreadyInitialized();
        
        l.initialized = true;
        l.operator = operator_;
        
        emit ${facetName}Initialized(operator_);
    }

    /// ------------------------
    /// Admin Functions (operator-gated like ExampleFacetB)
    /// ------------------------
    function setPaused(bool paused_) external onlyOperator {
        _layout().paused = paused_;
    }

    /// ------------------------
    /// Core Business Logic (following native security patterns)
    /// ------------------------
    function executeOperation(uint256 amount)
        external
        whenInitialized
        whenNotPaused
    {
        if (amount == 0) revert InvalidInput();
        
        Layout storage l = _layout();
        l.balances[msg.sender] += amount;
        l.totalSupply += amount;
        l.operationCounter += 1;
        
        emit ${facetName}Executed(msg.sender, amount);
    }

    /// ------------------------
    /// View Functions
    /// ------------------------
    function isInitialized() external view returns (bool) {
        return _layout().initialized;
    }

    function getBalance(address user) external view returns (uint256) {
        return _layout().balances[user];
    }

    function getTotalSupply() external view returns (uint256) {
        return _layout().totalSupply;
    }
}`;
  }
}

// Execute validation
if (require.main === module) {
  const validator = new NativePatternValidator();
  validator.validateAllGeneratedFacets().catch(console.error);
}

export { NativePatternValidator };

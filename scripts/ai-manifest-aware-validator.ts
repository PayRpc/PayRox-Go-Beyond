#!/usr/bin/env ts-node

/**
 * AI Manifest-Aware Facet Validator
 * 
 * This validator combines deep learning from:
 * 1. Native PayRox facet patterns (ExampleFacetA/B)
 * 2. PayRox manifest system architecture (ManifestTypes/Utils)
 * 
 * Validates facets for both standalone functionality AND manifest integration.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ManifestIntegrationCheck {
  hasFacetInfo: boolean;
  hasSelectors: boolean;
  selectorsValid: boolean;
  manifestCompatible: boolean;
  gasEstimateReady: boolean;
}

interface ComprehensiveValidation {
  file: string;
  nativePatternScore: number;
  manifestIntegrationScore: number;
  overallScore: number;
  status: 'PRODUCTION_READY' | 'NEEDS_MANIFEST_INTEGRATION' | 'NEEDS_NATIVE_FIXES' | 'CRITICAL_ERRORS';
  nativeIssues: string[];
  manifestIssues: string[];
  recommendations: string[];
}

class ManifestAwareFacetValidator {
  
  async validateFacetComprehensive(filePath: string): Promise<ComprehensiveValidation> {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Native pattern validation (from previous learning)
    const nativeResult = this.validateNativePatterns(content);
    
    // Manifest integration validation (new learning)
    const manifestResult = this.validateManifestIntegration(content);
    
    // Calculate overall score
    const overallScore = (nativeResult.score + manifestResult.score) / 2;
    
    // Determine status
    let status: ComprehensiveValidation['status'] = 'PRODUCTION_READY';
    if (nativeResult.score < 50) {
      status = 'CRITICAL_ERRORS';
    } else if (nativeResult.score < 80) {
      status = 'NEEDS_NATIVE_FIXES';
    } else if (manifestResult.score < 70) {
      status = 'NEEDS_MANIFEST_INTEGRATION';
    }
    
    return {
      file: fileName,
      nativePatternScore: nativeResult.score,
      manifestIntegrationScore: manifestResult.score,
      overallScore,
      status,
      nativeIssues: nativeResult.issues,
      manifestIssues: manifestResult.issues,
      recommendations: this.generateRecommendations(nativeResult, manifestResult)
    };
  }

  private validateNativePatterns(content: string): { score: number; issues: string[] } {
    let score = 100;
    const issues: string[] = [];

    // Check for compilation blockers (critical)
    if (content.includes('LibDiamond.enforceIsDispatcher')) {
      issues.push('❌ Uses non-existent LibDiamond.enforceIsDispatcher()');
      score -= 30;
    }
    
    if (content.includes('LibDiamond.enforceRole')) {
      issues.push('❌ Uses non-existent LibDiamond.enforceRole()');
      score -= 30;
    }

    // Check struct visibility keywords (compilation blocker)
    if (content.match(/struct\\s+\\w+\\s*{[^}]*\\b(public|private|internal|external)\\s+\\w+/)) {
      issues.push('❌ COMPILATION BLOCKER: Struct members have visibility keywords');
      score -= 40;
    }

    // Check for native storage pattern
    if (!content.includes('bytes32 constant STORAGE_SLOT = keccak256')) {
      issues.push('❌ Missing native storage slot pattern');
      score -= 15;
    }

    if (!content.includes('function _layout() private pure returns')) {
      issues.push('❌ Missing native _layout() function');
      score -= 15;
    }

    if (!content.includes('assembly { l.slot := slot }')) {
      issues.push('❌ Missing native assembly storage access');
      score -= 10;
    }

    // Positive points for correct patterns
    if (content.includes('modifier whenInitialized()')) {
      score += 5;
    }

    if (content.includes('modifier onlyOperator()')) {
      score += 5;
    }

    if (content.includes('using SafeERC20 for IERC20')) {
      score += 5;
    }

    return { score: Math.max(0, score), issues };
  }

  private validateManifestIntegration(content: string): { score: number; issues: string[] } {
    let score = 100;
    const issues: string[] = [];

    // Check for getFacetInfo function (required for manifest)
    if (!content.includes('function getFacetInfo()')) {
      issues.push('❌ Missing getFacetInfo() function for manifest integration');
      score -= 25;
    }

    // Check if getFacetInfo returns correct structure
    if (content.includes('getFacetInfo()')) {
      if (!content.includes('returns (string memory name, string memory version, bytes4[] memory selectors)')) {
        issues.push('❌ getFacetInfo() has incorrect return signature');
        score -= 15;
      } else {
        score += 10; // Bonus for correct signature
      }
    }

    // Check for selector definitions
    if (content.includes('getFacetInfo()')) {
      if (!content.includes('this.') || !content.includes('.selector')) {
        issues.push('❌ getFacetInfo() missing selector array construction');
        score -= 20;
      } else {
        score += 10; // Bonus for selector construction
      }
    }

    // Check for gas limit considerations
    if (!content.includes('gasLimit') && content.includes('external')) {
      issues.push('⚠️  No gas limit considerations for external functions');
      score -= 10;
    }

    // Check for facet metadata
    if (!content.includes('version')) {
      issues.push('❌ Missing version information for manifest tracking');
      score -= 15;
    }

    // Check for proper events (required for manifest monitoring)
    if (!content.includes('event ') || !content.includes('Initialized')) {
      issues.push('❌ Missing proper events for manifest monitoring');
      score -= 15;
    }

    // Check for selector uniqueness (critical for manifest)
    const selectorMatches = content.match(/this\\.(\\w+)\\.selector/g);
    if (selectorMatches) {
      const selectors = selectorMatches.map(match => match.match(/this\\.(\\w+)\\.selector/)?.[1]).filter(Boolean);
      const uniqueSelectors = new Set(selectors);
      if (selectors.length !== uniqueSelectors.size) {
        issues.push('❌ CRITICAL: Duplicate selectors detected');
        score -= 30;
      } else {
        score += 5; // Bonus for unique selectors
      }
    }

    // Check for manifest-compatible initialization
    if (content.includes('initialize') && content.includes('external')) {
      if (!content.includes('AlreadyInitialized')) {
        issues.push('❌ Missing proper initialization guards');
        score -= 10;
      }
    }

    // Bonus points for manifest best practices
    if (content.includes('pure') && content.includes('getFacetInfo')) {
      score += 5; // Pure function is gas-efficient for manifest queries
    }

    if (content.includes('indexed') && content.includes('event')) {
      score += 5; // Indexed events for efficient manifest monitoring
    }

    return { score: Math.max(0, score), issues };
  }

  private generateRecommendations(
    nativeResult: { score: number; issues: string[] },
    manifestResult: { score: number; issues: string[] }
  ): string[] {
    const recommendations: string[] = [];

    // Native pattern recommendations
    if (nativeResult.score < 70) {
      recommendations.push('🔧 Fix native pattern compliance before manifest integration');
      recommendations.push('📚 Study ExampleFacetA/B patterns for standalone facet design');
    }

    // Manifest integration recommendations
    if (manifestResult.score < 70) {
      recommendations.push('🔗 Add getFacetInfo() function for manifest integration');
      recommendations.push('📊 Include proper selector array construction');
      recommendations.push('📝 Add version metadata for manifest tracking');
    }

    // Security recommendations
    if (nativeResult.issues.some(issue => issue.includes('COMPILATION BLOCKER'))) {
      recommendations.push('🚨 URGENT: Fix compilation blockers before deployment');
    }

    if (manifestResult.issues.some(issue => issue.includes('CRITICAL'))) {
      recommendations.push('🚨 CRITICAL: Fix selector issues for manifest safety');
    }

    // Performance recommendations
    if (manifestResult.score > 80 && nativeResult.score > 80) {
      recommendations.push('✅ Consider gas optimization for production deployment');
      recommendations.push('📈 Ready for manifest-based deployment');
    }

    return recommendations;
  }

  async validateAllFacets(): Promise<void> {
    console.log('🔍 Comprehensive Facet Validation (Native + Manifest)...');
    console.log('═'.repeat(60));

    const generatedDir = './contracts/generated-facets-v2';
    const files = fs.readdirSync(generatedDir).filter(f => f.endsWith('.sol'));

    const results: ComprehensiveValidation[] = [];

    for (const file of files) {
      const filePath = path.join(generatedDir, file);
      const result = await this.validateFacetComprehensive(filePath);
      results.push(result);
    }

    // Report results
    results.forEach(result => {
      console.log(`\\n📄 ${result.file}`);
      console.log(`Status: ${this.getStatusIcon(result.status)} ${result.status}`);
      console.log(`Native Patterns: ${result.nativePatternScore}/100`);
      console.log(`Manifest Integration: ${result.manifestIntegrationScore}/100`);
      console.log(`Overall Score: ${result.overallScore.toFixed(1)}/100`);

      if (result.nativeIssues.length > 0) {
        console.log('\\n🔧 Native Pattern Issues:');
        result.nativeIssues.forEach(issue => console.log(`  ${issue}`));
      }

      if (result.manifestIssues.length > 0) {
        console.log('\\n🔗 Manifest Integration Issues:');
        result.manifestIssues.forEach(issue => console.log(`  ${issue}`));
      }

      if (result.recommendations.length > 0) {
        console.log('\\n💡 Recommendations:');
        result.recommendations.forEach(rec => console.log(`  ${rec}`));
      }
    });

    // Summary
    const productionReady = results.filter(r => r.status === 'PRODUCTION_READY').length;
    const needsManifest = results.filter(r => r.status === 'NEEDS_MANIFEST_INTEGRATION').length;
    const needsNative = results.filter(r => r.status === 'NEEDS_NATIVE_FIXES').length;
    const critical = results.filter(r => r.status === 'CRITICAL_ERRORS').length;

    console.log('\\n📊 COMPREHENSIVE VALIDATION SUMMARY');
    console.log('═'.repeat(50));
    console.log(`🟢 Production Ready: ${productionReady}`);
    console.log(`🟡 Needs Manifest Integration: ${needsManifest}`);
    console.log(`🟠 Needs Native Fixes: ${needsNative}`);
    console.log(`🔴 Critical Errors: ${critical}`);

    const avgNative = results.reduce((sum, r) => sum + r.nativePatternScore, 0) / results.length;
    const avgManifest = results.reduce((sum, r) => sum + r.manifestIntegrationScore, 0) / results.length;
    const avgOverall = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;

    console.log(`\\n📈 Average Scores:`);
    console.log(`   Native Patterns: ${avgNative.toFixed(1)}/100`);
    console.log(`   Manifest Integration: ${avgManifest.toFixed(1)}/100`);
    console.log(`   Overall: ${avgOverall.toFixed(1)}/100`);

    if (productionReady === results.length) {
      console.log('\\n🎉 ALL FACETS PRODUCTION READY!');
    } else {
      console.log(`\\n⚠️  ${results.length - productionReady} facets need attention before production`);
    }
  }

  private getStatusIcon(status: ComprehensiveValidation['status']): string {
    switch (status) {
      case 'PRODUCTION_READY': return '🟢';
      case 'NEEDS_MANIFEST_INTEGRATION': return '🟡';
      case 'NEEDS_NATIVE_FIXES': return '🟠';
      case 'CRITICAL_ERRORS': return '🔴';
      default: return '⚪';
    }
  }

  async generateManifestReadyTemplate(): Promise<void> {
    const template = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title [FACET_NAME]
 * @notice PayRox facet following native patterns with manifest integration
 * @dev Standalone contract for manifest-dispatcher routing
 */

/// ------------------------
/// Errors (gas-efficient custom errors)
/// ------------------------
error NotInitialized();
error AlreadyInitialized();
error Paused();
error Unauthorized();

/// ------------------------
/// Storage (native pattern: direct slots, no LibDiamond)
/// ------------------------
bytes32 constant STORAGE_SLOT = keccak256("payrox.facet.[facet_name].v1");

struct Layout {
    bool initialized;
    bool paused;
    address operator;
    uint8 version;
    // Add facet-specific state here
}

contract [FACET_NAME] {
    using SafeERC20 for IERC20;

    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly { l.slot := slot }
    }

    /// ------------------------
    /// Events (indexed for manifest monitoring)
    /// ------------------------
    event [FACET_NAME]Initialized(address indexed operator, uint256 timestamp);
    event [FACET_NAME]ActionExecuted(address indexed user, bytes32 indexed actionHash);

    /// ------------------------
    /// Modifiers (native PayRox pattern - facet-owned)
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
    /// Initialization (manifest-compatible)
    /// ------------------------
    function initialize[FACET_NAME](address operator_) external {
        if (operator_ == address(0)) revert Unauthorized();
        
        Layout storage l = _layout();
        if (l.initialized) revert AlreadyInitialized();
        
        l.initialized = true;
        l.operator = operator_;
        l.version = 1;
        l.paused = false;
        
        emit [FACET_NAME]Initialized(operator_, block.timestamp);
    }

    /// ------------------------
    /// Core Business Logic (native security patterns)
    /// ------------------------
    function executeAction(bytes32 actionData)
        external
        whenInitialized
        whenNotPaused
    {
        Layout storage l = _layout();
        
        // Implement business logic using l.state
        
        emit [FACET_NAME]ActionExecuted(msg.sender, actionData);
    }

    /// ------------------------
    /// View Functions
    /// ------------------------
    function is[FACET_NAME]Initialized() external view returns (bool) {
        return _layout().initialized;
    }

    function get[FACET_NAME]Version() external view returns (uint8) {
        return _layout().version;
    }

    /// ------------------------
    /// Manifest Integration (REQUIRED for PayRox deployment)
    /// ------------------------
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "[FACET_NAME]";
        version = "1.0.0";

        // CRITICAL: All external function selectors for manifest routing
        selectors = new bytes4[](4);
        selectors[0] = this.initialize[FACET_NAME].selector;
        selectors[1] = this.executeAction.selector;
        selectors[2] = this.is[FACET_NAME]Initialized.selector;
        selectors[3] = this.get[FACET_NAME]Version.selector;
        // Add all other external function selectors
    }
}`;

    fs.writeFileSync('./AI_MANIFEST_READY_TEMPLATE.sol', template);
    console.log('✅ Generated manifest-ready template: AI_MANIFEST_READY_TEMPLATE.sol');
  }
}

// Execute comprehensive validation
if (require.main === module) {
  const validator = new ManifestAwareFacetValidator();
  validator.validateAllFacets()
    .then(() => validator.generateManifestReadyTemplate())
    .catch(console.error);
}

export { ManifestAwareFacetValidator };

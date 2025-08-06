#!/usr/bin/env ts-node

/**
 * MUST-FIX VALIDATOR v2.0
 * 
 * Enforces production-safety standards for PayRox facets
 * Based on comprehensive MUST-FIX specification
 */

import * as fs from 'fs';
import * as path from 'path';

interface MustFixResult {
  file: string;
  passed: boolean;
  score: number;
  violations: string[];
  warnings: string[];
  details: Record<string, boolean>;
}

class MustFixValidator {
  
  async validateFacet(filePath: string): Promise<MustFixResult> {
    console.log(`🔍 MUST-FIX Validation: ${path.basename(filePath)}`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    const violations: string[] = [];
    const warnings: string[] = [];
    const details: Record<string, boolean> = {};
    
    // 1. Custom errors (gas-efficient)
    const customErrorsCheck = this.checkCustomErrors(content);
    details.customErrors = customErrorsCheck.passed;
    if (!customErrorsCheck.passed) violations.push(customErrorsCheck.message);
    
    // 2. Namespaced storage (collision-safe)
    const namespacedStorageCheck = this.checkNamespacedStorage(content);
    details.namespacedStorage = namespacedStorageCheck.passed;
    if (!namespacedStorageCheck.passed) violations.push(namespacedStorageCheck.message);
    
    // 3. Init-only pattern (no constructor)
    const initOnlyCheck = this.checkInitOnlyPattern(content);
    details.initOnly = initOnlyCheck.passed;
    if (!initOnlyCheck.passed) violations.push(initOnlyCheck.message);
    
    // 4. Dispatcher gating
    const dispatcherGatingCheck = this.checkDispatcherGating(content);
    details.dispatcherGating = dispatcherGatingCheck.passed;
    if (!dispatcherGatingCheck.passed) violations.push(dispatcherGatingCheck.message);
    
    // 5. Local reentrancy guard
    const reentrancyGuardCheck = this.checkReentrancyGuard(content);
    details.reentrancyGuard = reentrancyGuardCheck.passed;
    if (!reentrancyGuardCheck.passed) violations.push(reentrancyGuardCheck.message);
    
    // 6. Pause control
    const pauseControlCheck = this.checkPauseControl(content);
    details.pauseControl = pauseControlCheck.passed;
    if (!pauseControlCheck.passed) violations.push(pauseControlCheck.message);
    
    // 7. Role/authority
    const roleAuthorityCheck = this.checkRoleAuthority(content);
    details.roleAuthority = roleAuthorityCheck.passed;
    if (!roleAuthorityCheck.passed) violations.push(roleAuthorityCheck.message);
    
    // 8. Checks-effects-interactions
    const ceiCheck = this.checkCEIPattern(content);
    details.ceiPattern = ceiCheck.passed;
    if (!ceiCheck.passed) violations.push(ceiCheck.message);
    
    // 9. ASCII-only source
    const asciiOnlyCheck = this.checkAsciiOnly(content);
    details.asciiOnly = asciiOnlyCheck.passed;
    if (!asciiOnlyCheck.passed) violations.push(asciiOnlyCheck.message);
    
    // 10. Order/Record struct (domain-specific)
    const orderStructCheck = this.checkOrderStruct(content);
    details.orderStruct = orderStructCheck.passed;
    if (orderStructCheck.required && !orderStructCheck.passed) {
      violations.push(orderStructCheck.message);
    } else if (!orderStructCheck.required && !orderStructCheck.passed) {
      warnings.push(orderStructCheck.message);
    }
    
    // 11. Unique IDs
    const uniqueIdsCheck = this.checkUniqueIds(content);
    details.uniqueIds = uniqueIdsCheck.passed;
    if (uniqueIdsCheck.required && !uniqueIdsCheck.passed) {
      violations.push(uniqueIdsCheck.message);
    } else if (!uniqueIdsCheck.required && !uniqueIdsCheck.passed) {
      warnings.push(uniqueIdsCheck.message);
    }
    
    // 12. Fail-closed approvals
    const failClosedCheck = this.checkFailClosedApprovals(content);
    details.failClosed = failClosedCheck.passed;
    if (failClosedCheck.required && !failClosedCheck.passed) {
      violations.push(failClosedCheck.message);
    } else if (!failClosedCheck.required && !failClosedCheck.passed) {
      warnings.push(failClosedCheck.message);
    }
    
    // 13. Pricing hooks
    const pricingHooksCheck = this.checkPricingHooks(content);
    details.pricingHooks = pricingHooksCheck.passed;
    if (pricingHooksCheck.required && !pricingHooksCheck.passed) {
      violations.push(pricingHooksCheck.message);
    } else if (!pricingHooksCheck.required && !pricingHooksCheck.passed) {
      warnings.push(pricingHooksCheck.message);
    }
    
    // 14. Complete selector list
    const selectorListCheck = this.checkSelectorList(content);
    details.selectorList = selectorListCheck.passed;
    if (!selectorListCheck.passed) violations.push(selectorListCheck.message);
    
    // 15. Events on state changes
    const eventsCheck = this.checkStateChangeEvents(content);
    details.stateEvents = eventsCheck.passed;
    if (!eventsCheck.passed) violations.push(eventsCheck.message);
    
    // 16. Refactor safety integration
    const refactorSafetyCheck = this.checkRefactorSafetyIntegration(content);
    details.refactorSafety = refactorSafetyCheck.passed;
    if (refactorSafetyCheck.required && !refactorSafetyCheck.passed) {
      violations.push(refactorSafetyCheck.message);
    } else if (!refactorSafetyCheck.required && !refactorSafetyCheck.passed) {
      warnings.push(refactorSafetyCheck.message);
    }
    
    // 17. Storage layout documentation
    const storageDocCheck = this.checkStorageLayoutDocumentation(content);
    details.storageDocumentation = storageDocCheck.passed;
    if (storageDocCheck.required && !storageDocCheck.passed) {
      violations.push(storageDocCheck.message);
    } else if (!storageDocCheck.required && !storageDocCheck.passed) {
      warnings.push(storageDocCheck.message);
    }
    
    // Calculate score
    const totalChecks = Object.keys(details).length;
    const passedChecks = Object.values(details).filter(Boolean).length;
    const score = Math.round((passedChecks / totalChecks) * 100);
    
    const passed = violations.length === 0;
    
    return {
      file: filePath,
      passed,
      score,
      violations,
      warnings,
      details
    };
  }
  
  private checkCustomErrors(content: string): { passed: boolean; message: string } {
    const errorCount = (content.match(/error\\s+\\w+/g) || []).length;
    return {
      passed: errorCount >= 3,
      message: errorCount < 3 ? `Insufficient custom errors: ${errorCount}/3 minimum` : ''
    };
  }
  
  private checkNamespacedStorage(content: string): { passed: boolean; message: string } {
    const hasSlot = content.includes('constant') && content.includes('_SLOT') && content.includes('keccak256');
    const hasLayout = content.includes('Layout') && content.includes('struct');
    const hasAssembly = content.includes('assembly') && content.includes('l.slot := slot');
    
    return {
      passed: hasSlot && hasLayout && hasAssembly,
      message: !hasSlot ? 'Missing namespaced storage slot' : 
               !hasLayout ? 'Missing Layout struct' :
               !hasAssembly ? 'Missing assembly storage access' : ''
    };
  }
  
  private checkInitOnlyPattern(content: string): { passed: boolean; message: string } {
    const hasConstructor = content.includes('constructor(');
    const hasInitialize = content.includes('initialize') && content.includes('function');
    const hasInitialized = content.includes('initialized') && content.includes('bool');
    
    return {
      passed: !hasConstructor && hasInitialize && hasInitialized,
      message: hasConstructor ? 'Constructor found - use initialize pattern only' :
               !hasInitialize ? 'Missing initialize function' :
               !hasInitialized ? 'Missing initialized flag' : ''
    };
  }
  
  private checkDispatcherGating(content: string): { passed: boolean; message: string } {
    const hasDispatcherModifier = content.includes('onlyDispatcher') || content.includes('enforceIsDispatcher') || content.includes('enforceManifestCall');
    const hasExternalFunctions = content.includes('external') && !content.includes('view');
    
    return {
      passed: !hasExternalFunctions || hasDispatcherModifier,
      message: hasExternalFunctions && !hasDispatcherModifier ? 'External functions missing dispatcher gating' : ''
    };
  }
  
  private checkReentrancyGuard(content: string): { passed: boolean; message: string } {
    const hasReentrancyFlag = content.includes('_reentrancy');
    const hasNonReentrantModifier = content.includes('nonReentrant');
    const hasReentrancyLogic = content.includes('_reentrancy = 2') && content.includes('_reentrancy = 1');
    
    return {
      passed: hasReentrancyFlag && hasNonReentrantModifier && hasReentrancyLogic,
      message: !hasReentrancyFlag ? 'Missing _reentrancy flag in storage' :
               !hasNonReentrantModifier ? 'Missing nonReentrant modifier' :
               !hasReentrancyLogic ? 'Missing reentrancy guard logic' : ''
    };
  }
  
  private checkPauseControl(content: string): { passed: boolean; message: string } {
    const hasPausedFlag = content.includes('paused') && content.includes('bool');
    const hasSetPaused = content.includes('setPaused');
    const hasWhenNotPaused = content.includes('whenNotPaused') || content.includes('paused') && content.includes('revert');
    
    return {
      passed: hasPausedFlag && hasSetPaused && hasWhenNotPaused,
      message: !hasPausedFlag ? 'Missing paused flag' :
               !hasSetPaused ? 'Missing setPaused function' :
               !hasWhenNotPaused ? 'Missing pause checks' : ''
    };
  }
  
  private checkRoleAuthority(content: string): { passed: boolean; message: string } {
    const hasOperator = content.includes('operator') || content.includes('onlyOperator');
    const hasRole = content.includes('Role') || content.includes('enforceRole');
    const hasAuthority = content.includes('Unauthorized') || content.includes('onlyOwner');
    
    return {
      passed: hasOperator || hasRole || hasAuthority,
      message: 'Missing role/authority control (operator, role, or owner checks)'
    };
  }
  
  private checkCEIPattern(content: string): { passed: boolean; message: string } {
    const hasSafeERC20 = content.includes('SafeERC20') || !content.includes('transfer(');
    const hasExternalCalls = content.includes('.call(') || content.includes('transfer(');
    
    return {
      passed: !hasExternalCalls || hasSafeERC20,
      message: hasExternalCalls && !hasSafeERC20 ? 'Use SafeERC20 for token operations' : ''
    };
  }
  
  private checkAsciiOnly(content: string): { passed: boolean; message: string } {
    for (let i = 0; i < content.length; i++) {
      if (content.charCodeAt(i) > 127) {
        return {
          passed: false,
          message: `Non-ASCII character found at position ${i}`
        };
      }
    }
    return { passed: true, message: '' };
  }
  
  private checkOrderStruct(content: string): { passed: boolean; message: string; required: boolean } {
    const needsOrderStruct = content.includes('Order') || content.includes('order') || content.includes('trading');
    const hasOrderStruct = content.includes('struct Order') || content.includes('struct.*Order');
    const hasCompleteFields = hasOrderStruct && content.includes('id') && content.includes('user') && content.includes('amount');
    
    return {
      passed: !needsOrderStruct || hasCompleteFields,
      message: needsOrderStruct && !hasCompleteFields ? 'Order struct missing required fields (id, user, amount, timestamp)' : 'Order struct not required',
      required: needsOrderStruct
    };
  }
  
  private checkUniqueIds(content: string): { passed: boolean; message: string; required: boolean } {
    const needsUniqueIds = content.includes('Order') || content.includes('Record') || content.includes('nonce');
    const hasNonce = content.includes('nonce') || content.includes('counter');
    const hasKeccak = content.includes('keccak256') && content.includes('abi.encodePacked');
    
    return {
      passed: !needsUniqueIds || (hasNonce && hasKeccak),
      message: needsUniqueIds && !(hasNonce && hasKeccak) ? 'Missing deterministic unique ID generation (nonce + keccak256)' : 'Unique IDs not required',
      required: needsUniqueIds
    };
  }
  
  private checkFailClosedApprovals(content: string): { passed: boolean; message: string; required: boolean } {
    const hasTokenOperations = content.includes('transfer') || content.includes('IERC20');
    const hasSafeERC20 = content.includes('SafeERC20');
    const hasApprovalChecks = content.includes('approved') || content.includes('allowance');
    
    return {
      passed: !hasTokenOperations || (hasSafeERC20 || hasApprovalChecks),
      message: hasTokenOperations && !(hasSafeERC20 || hasApprovalChecks) ? 'Token operations missing approval/SafeERC20 checks' : 'Token operations not detected',
      required: hasTokenOperations
    };
  }
  
  private checkPricingHooks(content: string): { passed: boolean; message: string; required: boolean } {
    const hasPricing = content.includes('price') || content.includes('quote') || content.includes('rate');
    const hasPricingHook = content.includes('_quote') || content.includes('_getPrice') || content.includes('oracle');
    
    return {
      passed: !hasPricing || hasPricingHook,
      message: hasPricing && !hasPricingHook ? 'Pricing operations missing pluggable pricing hook (_quote)' : 'Pricing operations not detected',
      required: hasPricing
    };
  }
  
  private checkSelectorList(content: string): { passed: boolean; message: string } {
    const hasFacetInfo = content.includes('getFacetInfo');
    const hasSelectorArray = content.includes('selectors = new bytes4');
    const hasExternalFunctions = (content.match(/function\\s+\\w+.*external/g) || []).length;
    const hasSelectorAssignments = (content.match(/selectors\\[.*\\] = this\\./g) || []).length;
    
    return {
      passed: hasFacetInfo && hasSelectorArray && (hasExternalFunctions <= hasSelectorAssignments + 2), // Allow some tolerance
      message: !hasFacetInfo ? 'Missing getFacetInfo function' :
               !hasSelectorArray ? 'Missing selector array initialization' :
               'Selector count mismatch with external functions'
    };
  }
  
  private checkStateChangeEvents(content: string): { passed: boolean; message: string } {
    const hasInitEvent = content.includes('Initialized');
    const hasPauseEvent = content.includes('PauseStatusChanged') || content.includes('Paused');
    const eventCount = (content.match(/event\\s+\\w+/g) || []).length;
    
    return {
      passed: hasInitEvent && hasPauseEvent && eventCount >= 3,
      message: !hasInitEvent ? 'Missing initialization event' :
               !hasPauseEvent ? 'Missing pause event' :
               eventCount < 3 ? `Insufficient events: ${eventCount}/3 minimum` : ''
    };
  }

  // ==================== REFACTOR SAFETY VALIDATIONS ====================
  
  private checkRefactorSafetyIntegration(content: string): { passed: boolean; message: string; required: boolean } {
    // Check for refactor safety patterns
    const hasRefactorSafetyImport = /import.*RefactorSafetyLib/.test(content);
    const hasVersionFunction = /function get.*Version\(\).*returns\s*\(uint8\)/.test(content);
    const hasStorageNamespace = /keccak256\(".*\.v\d+"\)/.test(content);
    const hasDocumentation = /\/\/.*refactor|\/\*.*refactor|@notice.*refactor/i.test(content);
    
    const checks = [hasRefactorSafetyImport, hasVersionFunction, hasStorageNamespace, hasDocumentation];
    const passedChecks = checks.filter(Boolean).length;
    
    return {
      passed: passedChecks >= 2, // At least 2/4 patterns required
      required: true,
      message: passedChecks >= 2 
        ? 'Refactor safety patterns implemented'
        : `Insufficient refactor safety: ${passedChecks}/4 patterns found (need versioning + namespace minimum)`
    };
  }

  private checkStorageLayoutDocumentation(content: string): { passed: boolean; message: string; required: boolean } {
    const hasLayoutComment = /\/\/.*Storage.*namespaced|\/\*.*Storage.*namespaced/i.test(content);
    const hasVersionedSlot = /keccak256\(".*\.v\d+"\)/.test(content);
    const hasStructComment = /struct.*Layout[\s\S]*?\/\//.test(content);
    const hasSlotComment = /\/\/.*slot|\/\*.*slot/i.test(content);
    
    const checks = [hasLayoutComment, hasVersionedSlot, hasStructComment, hasSlotComment];
    const passedChecks = checks.filter(Boolean).length;
    
    return {
      passed: passedChecks >= 3, // Need good documentation
      required: true,
      message: passedChecks >= 3
        ? 'Storage layout properly documented for refactor safety'
        : `Storage documentation incomplete: ${passedChecks}/4 documentation checks (critical for refactor safety)`
    };
  }
  
  async validateDirectory(dirPath: string): Promise<MustFixResult[]> {
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.sol'));
    const results: MustFixResult[] = [];
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const result = await this.validateFacet(filePath);
      results.push(result);
    }
    
    return results;
  }
  
  printReport(results: MustFixResult[]): void {
    console.log('\\n📊 MUST-FIX VALIDATION REPORT');
    console.log('═'.repeat(60));
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / total;
    
    console.log(`\\n📈 Summary: ${passed}/${total} passed (${avgScore.toFixed(1)}% average score)`);
    
    results.forEach(result => {
      const status = result.passed ? '🟢 PASS' : '🔴 FAIL';
      console.log(`\\n${status} ${path.basename(result.file)} - Score: ${result.score}%`);
      
      if (result.violations.length > 0) {
        console.log('   ❌ Violations:');
        result.violations.forEach(v => console.log(`     • ${v}`));
      }
      
      if (result.warnings.length > 0) {
        console.log('   ⚠️  Warnings:');
        result.warnings.forEach(w => console.log(`     • ${w}`));
      }
    });
    
    if (passed === total) {
      console.log('\\n🎉 ALL FACETS PASS MUST-FIX REQUIREMENTS!');
      console.log('✅ Ready for production deployment');
    } else {
      console.log('\\n❌ Some facets require fixes before deployment');
    }
  }
}

// CLI Interface
if (require.main === module) {
  const validator = new MustFixValidator();
  
  const target = process.argv[2];
  
  if (!target) {
    console.error('Usage: npx ts-node must-fix-validator.ts <file.sol|directory>');
    process.exit(1);
  }
  
  if (fs.statSync(target).isDirectory()) {
    validator.validateDirectory(target)
      .then(results => {
        validator.printReport(results);
        const allPassed = results.every(r => r.passed);
        process.exit(allPassed ? 0 : 1);
      })
      .catch(console.error);
  } else {
    validator.validateFacet(target)
      .then(result => {
        validator.printReport([result]);
        process.exit(result.passed ? 0 : 1);
      })
      .catch(console.error);
  }
}

export { MustFixValidator };

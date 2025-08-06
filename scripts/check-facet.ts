/**
 * MUST-FIX Compliance Validation Script
 * Validates that generated facets meet all production safety requirements
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

interface MustFixRequirements {
  customErrors: boolean;
  orderStruct: boolean;
  uniqueIds: boolean;
  roleGatedAdmin: boolean;
  failClosedApprovals: boolean;
  pricingHooks: boolean;
  namespacedStorage: boolean;
  asciiOnly: boolean;
}

class MustFixValidator {
  private code: string;
  
  constructor(filePath: string) {
    try {
      this.code = readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(Failed to read file: ${error});
    }
  }

  validateCustomErrors(): boolean {
    // Must have at least 3 custom errors defined
    const errorPattern = /error\s+[A-Z][a-zA-Z0-9]*\([^)]*\);/g;
    const errors = this.code.match(errorPattern);
    return errors !== null && errors.length >= 3;
  }

  validateOrderStruct(): boolean {
    // Must have Order struct with required fields
    const orderPattern = /struct\s+Order\s*\{[^}]*\}/s;
    const orderMatch = this.code.match(orderPattern);
    if (!orderMatch) return false;
    
    const orderContent = orderMatch[0];
    const requiredFields = ['id', 'user', 'amount', 'timestamp'];
    return requiredFields.every(field => 
      new RegExp(\\b${field}\\b).test(orderContent)
    );
  }

  validateUniqueIds(): boolean {
    // Must have nonce-based unique ID generation
    return /nonce\+\+/.test(this.code) || 
           /orderNonce/.test(this.code) ||
           /uniqueId.*nonce/.test(this.code);
  }

  validateRoleGatedAdmin(): boolean {
    // Must have role-based access control
    return /onlyRole|enforceRole|hasRole/.test(this.code) &&
           /ADMIN_ROLE|MANAGER_ROLE|DEFAULT_ADMIN_ROLE/.test(this.code);
  }

  validateFailClosedApprovals(): boolean {
    // Must use SafeERC20 or similar patterns
    return /SafeERC20|safeTransfer|safeTransferFrom/.test(this.code) ||
           /require.*allowance/.test(this.code);
  }

  validatePricingHooks(): boolean {
    // Must have internal pricing functions
    return /_quote|_getPrice|pricing.*internal|function.*quote.*internal/.test(this.code);
  }

  validateNamespacedStorage(): boolean {
    // Must use Diamond storage pattern
    return /bytes32.*SLOT.*keccak256/.test(this.code) &&
           /Storage.*Layout/.test(this.code);
  }

  validateAsciiOnly(): boolean {
    // Check for non-ASCII characters
    for (let i = 0; i < this.code.length; i++) {
      if (this.code.charCodeAt(i) > 127) {
        return false;
      }
    }
    return true;
  }

  validate(): MustFixRequirements {
    return {
      customErrors: this.validateCustomErrors(),
      orderStruct: this.validateOrderStruct(),
      uniqueIds: this.validateUniqueIds(),
      roleGatedAdmin: this.validateRoleGatedAdmin(),
      failClosedApprovals: this.validateFailClosedApprovals(),
      pricingHooks: this.validatePricingHooks(),
      namespacedStorage: this.validateNamespacedStorage(),
      asciiOnly: this.validateAsciiOnly()
    };
  }

  generateReport(): string {
    const results = this.validate();
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    let report = \n🔍 MUST-FIX Compliance Report\n;
    report += ═══════════════════════════════════\n;
    report += Overall: ${passed}/${total} requirements met\n\n;

    Object.entries(results).forEach(([requirement, passed]) => {
      const icon = passed ? '✅' : '❌';
      const status = passed ? 'PASS' : 'FAIL';
      report += ${icon} ${requirement}: ${status}\n;
    });

    report += \n;
    if (passed === total) {
      report += 🎉 PRODUCTION READY - All MUST-FIX requirements satisfied!\n;
    } else {
      report += ⚠️  PRODUCTION NOT READY - Missing ${total - passed} requirements\n;
    }

    return report;
  }
}

// Main execution
async function main() {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('Usage: npx ts-node scripts/check-facet.ts <path-to-facet>');
    process.exit(1);
  }

  try {
    const validator = new MustFixValidator(resolve(filePath));
    const report = validator.generateReport();
    console.log(report);
    
    const results = validator.validate();
    const allPassed = Object.values(results).every(Boolean);
    
    if (allPassed) {
      console.log('🚀 Facet is ready for production deployment!');
      process.exit(0);
    } else {
      console.log('❌ Facet requires fixes before production deployment');
      process.exit(1);
    }
  } catch (error) {
    console.error('Validation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { MustFixValidator };

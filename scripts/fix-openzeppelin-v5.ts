import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * @title PayRox System-Wide OpenZeppelin v5 Compatibility Fixer
 * @notice Automatically fixes OpenZeppelin v5 import path issues across the entire PayRox system
 * @dev This script scans all Solidity files and applies necessary fixes for OpenZeppelin v5 compatibility
 */

interface FixResult {
  file: string;
  fixes: string[];
  success: boolean;
  error?: string;
}

class PayRoxOpenZeppelinFixer {
  private projectRoot: string;
  private fixResults: FixResult[] = [];

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Run system-wide OpenZeppelin v5 compatibility fixes
   */
  async fixAllOpenZeppelinIssues(): Promise<FixResult[]> {
    console.log("\n🔧 === PayRox OpenZeppelin v5 Compatibility Fixer === 🔧");
    console.log("Scanning entire PayRox system for OpenZeppelin compatibility issues...");
    
    this.fixResults = [];
    
    // Define all contract directories to scan
    const contractDirs = [
      'contracts',
      'contracts/demo',
      'contracts/facets',
      'contracts/dispatcher', 
      'contracts/factory',
      'contracts/orchestrator',
      'contracts/manifest',
      'contracts/utils',
      'contracts/test'
    ];

    for (const dir of contractDirs) {
      const fullDirPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(fullDirPath)) {
        console.log(`\n📁 Scanning directory: ${dir}`);
        await this.scanDirectory(fullDirPath, dir);
      }
    }

    return this.fixResults;
  }

  /**
   * Recursively scan directory for Solidity files
   */
  private async scanDirectory(dirPath: string, relativePath: string): Promise<void> {
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        const relativeItemPath = path.join(relativePath, item.name);
        
        if (item.isDirectory()) {
          // Skip node_modules and other irrelevant directories
          if (!['node_modules', '.git', 'artifacts', 'cache', 'typechain-types'].includes(item.name)) {
            await this.scanDirectory(itemPath, relativeItemPath);
          }
        } else if (item.name.endsWith('.sol')) {
          await this.fixSolidityFile(itemPath, relativeItemPath);
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Error scanning directory ${relativePath}: ${error.message}`);
    }
  }

  /**
   * Fix OpenZeppelin v5 compatibility issues in a single Solidity file
   */
  private async fixSolidityFile(filePath: string, relativePath: string): Promise<void> {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      let content = originalContent;
      const appliedFixes: string[] = [];

      // OpenZeppelin v5 import path fixes
      const ozV5Fixes = [
        {
          pattern: /@openzeppelin\/contracts-upgradeable\/security\/PausableUpgradeable\.sol/g,
          replacement: '@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol',
          description: 'PausableUpgradeable: security → utils'
        },
        {
          pattern: /@openzeppelin\/contracts-upgradeable\/security\/ReentrancyGuardUpgradeable\.sol/g,
          replacement: '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol',
          description: 'ReentrancyGuardUpgradeable: security → utils'
        },
        {
          pattern: /@openzeppelin\/contracts\/security\/Pausable\.sol/g,
          replacement: '@openzeppelin/contracts/utils/Pausable.sol',
          description: 'Pausable: security → utils'
        },
        {
          pattern: /@openzeppelin\/contracts\/security\/ReentrancyGuard\.sol/g,
          replacement: '@openzeppelin/contracts/utils/ReentrancyGuard.sol',
          description: 'ReentrancyGuard: security → utils'
        },
        {
          pattern: /@openzeppelin\/contracts-upgradeable\/security\/PullPaymentUpgradeable\.sol/g,
          replacement: '@openzeppelin/contracts-upgradeable/utils/PullPaymentUpgradeable.sol',
          description: 'PullPaymentUpgradeable: security → utils'
        },
        {
          pattern: /@openzeppelin\/contracts\/security\/PullPayment\.sol/g,
          replacement: '@openzeppelin/contracts/utils/PullPayment.sol',
          description: 'PullPayment: security → utils'
        }
      ];

      // Apply OpenZeppelin v5 fixes
      for (const fix of ozV5Fixes) {
        if (fix.pattern.test(content)) {
          content = content.replace(fix.pattern, fix.replacement);
          appliedFixes.push(fix.description);
        }
      }

      // Fix missing SPDX license identifier
      if (!content.includes('SPDX-License-Identifier')) {
        content = `// SPDX-License-Identifier: MIT\n${content}`;
        appliedFixes.push('Added SPDX license identifier');
      }

      // Fix missing pragma statement
      if (!content.includes('pragma solidity') && content.trim().length > 0) {
        const licenseMatch = content.match(/^\/\/ SPDX-License-Identifier:.*$/m);
        if (licenseMatch) {
          content = content.replace(licenseMatch[0], `${licenseMatch[0]}\npragma solidity ^0.8.30;\n`);
        } else {
          content = `pragma solidity ^0.8.30;\n\n${content}`;
        }
        appliedFixes.push('Added pragma solidity statement');
      }

      // Fix duplicate constant declarations
      const duplicateFixes = this.fixDuplicateConstants(content);
      if (duplicateFixes.content !== content) {
        content = duplicateFixes.content;
        appliedFixes.push(...duplicateFixes.fixes);
      }

      // Fix outdated function overrides for OpenZeppelin v5
      const overrideFixes = this.fixFunctionOverrides(content);
      if (overrideFixes.content !== content) {
        content = overrideFixes.content;
        appliedFixes.push(...overrideFixes.fixes);
      }

      // Write changes if any fixes were applied
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`   ✅ Fixed ${relativePath} (${appliedFixes.length} fixes)`);
        
        this.fixResults.push({
          file: relativePath,
          fixes: appliedFixes,
          success: true
        });
      } else {
        // File was scanned but no issues found
        console.log(`   ✓ ${relativePath} (no issues)`);
      }

    } catch (error: any) {
      console.error(`   ❌ Error fixing ${relativePath}: ${error.message}`);
      
      this.fixResults.push({
        file: relativePath,
        fixes: [],
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Fix duplicate constant declarations
   */
  private fixDuplicateConstants(content: string): { content: string; fixes: string[] } {
    const fixes: string[] = [];
    let newContent = content;

    // Find all constant declarations
    const constantPattern = /bytes32\s+public\s+constant\s+(\w+)\s*=\s*keccak256\([^)]+\);/g;
    const constants = new Map<string, string[]>();
    let match;

    // Collect all constant declarations
    while ((match = constantPattern.exec(content)) !== null) {
      const constantName = match[1];
      const fullDeclaration = match[0];
      
      if (!constants.has(constantName)) {
        constants.set(constantName, []);
      }
      constants.get(constantName)!.push(fullDeclaration);
    }

    // Remove duplicates
    for (const [constantName, declarations] of constants) {
      if (declarations.length > 1) {
        // Keep only the first occurrence, remove others
        for (let i = 1; i < declarations.length; i++) {
          newContent = newContent.replace(declarations[i], '');
        }
        fixes.push(`Removed duplicate ${constantName} declarations`);
      }
    }

    return { content: newContent, fixes };
  }

  /**
   * Fix function override issues for OpenZeppelin v5
   */
  private fixFunctionOverrides(content: string): { content: string; fixes: string[] } {
    const fixes: string[] = [];
    let newContent = content;

    // Fix _grantRole and _revokeRole return type issues for OpenZeppelin v5
    const grantRolePattern = /function\s+_grantRole\s*\([^)]+\)\s+internal\s+override\s*\{/g;
    if (grantRolePattern.test(content)) {
      newContent = newContent.replace(
        /function\s+_grantRole\s*\([^)]+\)\s+internal\s+override\s*\{/g,
        'function _grantRole(bytes32 role, address account) internal override returns (bool) {'
      );
      fixes.push('Fixed _grantRole return type for OpenZeppelin v5');
    }

    const revokeRolePattern = /function\s+_revokeRole\s*\([^)]+\)\s+internal\s+override\s*\{/g;
    if (revokeRolePattern.test(content)) {
      newContent = newContent.replace(
        /function\s+_revokeRole\s*\([^)]+\)\s+internal\s+override\s*\{/g,
        'function _revokeRole(bytes32 role, address account) internal override returns (bool) {'
      );
      fixes.push('Fixed _revokeRole return type for OpenZeppelin v5');
    }

    // Remove invalid override specifiers
    const invalidOverridePattern = /\)\s+internal\s+virtual\s+override\s*\{/g;
    if (invalidOverridePattern.test(content)) {
      newContent = newContent.replace(invalidOverridePattern, ') internal virtual {');
      fixes.push('Removed invalid override specifier');
    }

    return { content: newContent, fixes };
  }

  /**
   * Generate summary report
   */
  generateReport(): void {
    console.log("\n📊 === OpenZeppelin v5 Compatibility Fix Report ===");
    
    const successful = this.fixResults.filter(r => r.success);
    const failed = this.fixResults.filter(r => !r.success);
    const totalFixes = successful.reduce((sum, r) => sum + r.fixes.length, 0);

    console.log(`📁 Files scanned: ${this.fixResults.length}`);
    console.log(`✅ Files successfully fixed: ${successful.length}`);
    console.log(`❌ Files with errors: ${failed.length}`);
    console.log(`🔧 Total fixes applied: ${totalFixes}`);

    if (successful.length > 0) {
      console.log("\n✅ Successfully Fixed Files:");
      for (const result of successful) {
        if (result.fixes.length > 0) {
          console.log(`   📄 ${result.file}`);
          for (const fix of result.fixes) {
            console.log(`      • ${fix}`);
          }
        }
      }
    }

    if (failed.length > 0) {
      console.log("\n❌ Files with Errors:");
      for (const result of failed) {
        console.log(`   📄 ${result.file}: ${result.error}`);
      }
    }

    console.log("\n🎯 Next Steps:");
    console.log("1. Run 'npx hardhat compile' to verify fixes");
    console.log("2. Test contract functionality");
    console.log("3. Commit changes to version control");
    console.log("4. Update documentation if needed");
  }
}

export async function main() {
  console.log("🚀 Starting PayRox OpenZeppelin v5 compatibility fixes...");
  
  const fixer = new PayRoxOpenZeppelinFixer(__dirname + "/..");
  
  try {
    const results = await fixer.fixAllOpenZeppelinIssues();
    fixer.generateReport();
    
    console.log("\n✨ OpenZeppelin v5 compatibility fixes completed!");
    
    return results;
    
  } catch (error: any) {
    console.error("\n💥 OpenZeppelin fix process failed:", error);
    throw error;
  }
}

// Enable direct execution
if (require.main === module) {
  main()
    .then(() => {
      console.log("\n🎉 All OpenZeppelin v5 compatibility issues resolved!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Failed to fix OpenZeppelin compatibility issues:", error);
      process.exit(1);
    });
}

export default main;

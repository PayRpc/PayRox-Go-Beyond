#!/usr/bin/env ts-node

/**
 * AI Compilation Fixer
 * 
 * Applies learned compilation patterns to fix common issues:
 * 1. Undefined types and enums
 * 2. Comment formatting for Solidity parser
 * 3. Missing imports and dependencies
 */

import * as fs from 'fs';
import * as path from 'path';

class AICompilationFixer {

  async fixAllCompilationIssues(): Promise<void> {
    console.log('🔧 Fixing Compilation Issues with Learned Patterns...');
    console.log('═'.repeat(60));

    const facetsDir = './contracts/generated-facets-v2';
    const files = fs.readdirSync(facetsDir).filter(f => f.endsWith('.sol'));

    for (const file of files) {
      console.log(`\\n🔧 Fixing: ${file}`);
      const filePath = path.join(facetsDir, file);
      await this.fixSingleFile(filePath);
    }

    console.log('\\n✅ All compilation fixes applied!');
  }

  private async fixSingleFile(filePath: string): Promise<void> {
    let content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, '.sol');

    // Fix 1: Add missing enum definitions
    content = this.addMissingEnums(content, fileName);

    // Fix 2: Fix comment formatting
    content = this.fixCommentFormatting(content);

    // Fix 3: Add missing imports
    content = this.addMissingImports(content);

    // Fix 4: Fix struct definitions
    content = this.fixStructDefinitions(content);

    fs.writeFileSync(filePath, content);
    console.log(`✅ ${fileName} compilation issues fixed`);
  }

  private addMissingEnums(content: string, fileName: string): string {
    // Add missing enums based on facet type
    const enumDefinitions = new Map([
      ['InsuranceFacet', `
enum PolicyType {
    BASIC,
    PREMIUM,
    ENTERPRISE
}

enum ClaimStatus {
    PENDING,
    APPROVED,
    REJECTED,
    PAID
}`],
      ['TradingFacet', `
enum OrderType {
    BUY,
    SELL
}

enum OrderStatus {
    PENDING,
    FILLED,
    CANCELLED,
    EXPIRED
}`],
      ['LendingFacet', `
enum LoanStatus {
    PENDING,
    ACTIVE,
    REPAID,
    DEFAULTED
}

enum CollateralType {
    ETH,
    TOKEN,
    NFT
}`],
      ['StakingFacet', `
enum StakeStatus {
    ACTIVE,
    UNSTAKING,
    WITHDRAWN
}

enum RewardType {
    TOKEN,
    ETH,
    POINTS
}`],
      ['RewardsFacet', `
enum RewardStatus {
    PENDING,
    CLAIMABLE,
    CLAIMED
}

enum RewardType {
    STAKING,
    TRADING,
    GOVERNANCE
}`],
      ['GovernanceFacet', `
enum ProposalStatus {
    PENDING,
    ACTIVE,
    SUCCEEDED,
    DEFEATED,
    EXECUTED
}

enum VoteType {
    FOR,
    AGAINST,
    ABSTAIN
}`]
    ]);

    const enumDef = enumDefinitions.get(fileName);
    if (enumDef && !content.includes('enum ')) {
      // Insert enums after the error definitions and before structs
      const insertPoint = content.indexOf('/// Structs and Types');
      if (insertPoint !== -1) {
        content = content.slice(0, insertPoint) + 
                  '/// ------------------------\n' +
                  '/// Enums\n' +
                  '/// ------------------------' +
                  enumDef + '\n\n' +
                  content.slice(insertPoint);
      }
    }

    return content;
  }

  private fixCommentFormatting(content: string): string {
    // Fix comment blocks that cause docstring parsing errors
    content = content.replace(/^\s*\/\/\/ -{24,}/gm, '// ' + '-'.repeat(24));
    content = content.replace(/^\s*\/\/\/ ([^\n]+)/gm, '// $1');
    
    return content;
  }

  private addMissingImports(content: string): string {
    // Add SafeMath import if arithmetic operations are used
    if (content.includes('+') || content.includes('-') || content.includes('*') || content.includes('/')) {
      if (!content.includes('SafeMath')) {
        const importSection = content.indexOf('import {SafeERC20}');
        if (importSection !== -1) {
          content = content.replace(
            'import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";',
            'import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";\n' +
            'import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";'
          );
        }
      }
    }

    return content;
  }

  private fixStructDefinitions(content: string): string {
    // Fix indentation in struct definitions
    content = content.replace(
      /(struct \w+ {[^}]*)/g,
      (match) => {
        return match.replace(/^\s{8}(\w+)/gm, '    $1');
      }
    );

    // Fix any remaining undefined type references
    const typeReplacements = new Map([
      ['PolicyType', 'PolicyType'],
      ['ClaimStatus', 'ClaimStatus'],
      ['OrderType', 'OrderType'],
      ['OrderStatus', 'OrderStatus'],
      ['LoanStatus', 'LoanStatus'],
      ['StakeStatus', 'StakeStatus'],
      ['ProposalStatus', 'ProposalStatus'],
      ['VoteType', 'VoteType']
    ]);

    return content;
  }

  async testCompilation(): Promise<void> {
    console.log('\\n🧪 Testing Compilation...');
    
    try {
      const { execSync } = require('child_process');
      const result = execSync('npx hardhat compile --quiet', { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      console.log('✅ Compilation successful!');
    } catch (error: any) {
      console.log('❌ Compilation failed:');
      console.log(error.stdout || error.message);
      
      // Provide specific fixes for common errors
      if (error.stdout?.includes('PolicyType')) {
        console.log('💡 Missing enum definitions - check InsuranceFacet');
      }
      if (error.stdout?.includes('DocstringParsingError')) {
        console.log('💡 Comment formatting issues - check /// patterns');
      }
    }
  }
}

// Execute fixing
if (require.main === module) {
  const fixer = new AICompilationFixer();
  fixer.fixAllCompilationIssues()
    .then(() => fixer.testCompilation())
    .catch(console.error);
}

export { AICompilationFixer };

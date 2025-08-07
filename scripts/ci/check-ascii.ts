/**
 * CI Guard: Check for ASCII-only output in generated Solidity - Fix #8
 * 
 * Validates that generated Solidity files contain only ASCII characters
 * and no emoji or unicode characters that could cause compilation issues.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ASCIIValidationResult {
  file: string;
  errors: string[];
  nonASCIICharacters: Array<{
    char: string;
    line: number;
    column: number;
    context: string;
  }>;
}

class ASCIIValidator {
  private results: ASCIIValidationResult[] = [];

  async validateSolidityFiles(directory: string): Promise<void> {
    console.log('🔍 Checking Solidity files for ASCII-only content...');
    
    if (!fs.existsSync(directory)) {
      console.error(`❌ Directory not found: ${directory}`);
      return;
    }

    const files = this.findSolidityFiles(directory);
    
    for (const file of files) {
      await this.validateFile(file);
    }

    this.printResults();
  }

  private findSolidityFiles(directory: string): string[] {
    const files: string[] = [];
    
    const scan = (dir: string) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scan(fullPath);
        } else if (item.endsWith('.sol')) {
          files.push(fullPath);
        }
      }
    };
    
    scan(directory);
    return files;
  }

  private async validateFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result: ASCIIValidationResult = {
      file: path.relative(process.cwd(), filePath),
      errors: [],
      nonASCIICharacters: []
    };

    const lines = content.split('\n');
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        const charCode = char.charCodeAt(0);
        
        // Check if character is outside ASCII range (0-127)
        if (charCode > 127) {
          const context = line.substring(Math.max(0, charIndex - 10), charIndex + 10);
          result.nonASCIICharacters.push({
            char: char,
            line: lineIndex + 1,
            column: charIndex + 1,
            context: context.replace(/\s/g, '·') // Make whitespace visible
          });
        }
      }
    }

    // Common problematic patterns
    const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const unicodePattern = /[^\x00-\x7F]/g;
    
    if (emojiPattern.test(content)) {
      result.errors.push('Contains emoji characters that should be removed from Solidity');
    }
    
    if (result.nonASCIICharacters.length > 0) {
      result.errors.push(`Contains ${result.nonASCIICharacters.length} non-ASCII characters`);
    }

    this.results.push(result);
  }

  private printResults(): void {
    let totalErrors = 0;
    let totalNonASCII = 0;

    console.log('\n📊 ASCII Validation Results:');
    console.log('═'.repeat(50));

    for (const result of this.results) {
      if (result.errors.length > 0 || result.nonASCIICharacters.length > 0) {
        console.log(`\n📄 ${result.file}:`);
        
        for (const error of result.errors) {
          console.log(`  ❌ ERROR: ${error}`);
          totalErrors++;
        }
        
        if (result.nonASCIICharacters.length > 0) {
          console.log(`  📍 Non-ASCII characters found:`);
          for (const char of result.nonASCIICharacters.slice(0, 5)) { // Show first 5
            console.log(`    Line ${char.line}:${char.column} '${char.char}' (U+${char.char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}) in: "${char.context}"`);
            totalNonASCII++;
          }
          if (result.nonASCIICharacters.length > 5) {
            console.log(`    ... and ${result.nonASCIICharacters.length - 5} more`);
          }
        }
      } else {
        console.log(`✅ ${result.file}: ASCII-only content verified`);
      }
    }

    console.log('\n📈 Summary:');
    console.log(`  📄 Files checked: ${this.results.length}`);
    console.log(`  ❌ Files with errors: ${this.results.filter(r => r.errors.length > 0).length}`);
    console.log(`  🔤 Non-ASCII characters: ${totalNonASCII}`);

    if (totalErrors > 0) {
      console.log('\n❌ ASCII validation FAILED - Remove non-ASCII characters from Solidity files');
      console.log('\n💡 Tip: Replace emoji and unicode with ASCII comments');
      process.exit(1);
    } else {
      console.log('\n✅ ASCII validation PASSED - All Solidity files contain ASCII-only content');
    }
  }
}

// Main execution
async function main() {
  const validator = new ASCIIValidator();
  
  // Check contracts directory and all subdirectories
  const contractsDir = 'contracts';
  
  if (fs.existsSync(contractsDir)) {
    await validator.validateSolidityFiles(contractsDir);
  } else {
    console.error('❌ contracts directory not found');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ASCIIValidator };

import * as fs from 'fs';
import * as path from 'path';

/**
 * AI Facet Validation System
 * Teaches AI to recognize and fix the 5 critical blockers
 */
class AIFacetValidator {
    private validationResults: any[] = [];

    async validateAllFacets(): Promise<void> {
        console.log("🤖 AI LEARNING: Validating facets against production standards...\n");
        
        const facetDirs = [
            'contracts/facets',
            'demo-archive/generated-facets'
        ];

        for (const dir of facetDirs) {
            await this.validateDirectory(dir);
        }

        this.printLearningReport();
    }

    private async validateDirectory(dirPath: string): Promise<void> {
        const fullPath = path.join(process.cwd(), dirPath);
        if (!fs.existsSync(fullPath)) return;

        const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.sol'));
        
        console.log(`📁 Analyzing ${dirPath}:`);
        
        for (const file of files) {
            const filePath = path.join(fullPath, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            
            const result = this.validateFacet(file, content);
            this.validationResults.push(result);
            
            this.printValidationResult(result);
        }
        console.log();
    }

    private validateFacet(filename: string, content: string): any {
        const result = {
            filename,
            blockers: [] as string[],
            warnings: [] as string[],
            score: 0,
            isProduction: false
        };

        // BLOCKER 1: Duplicate storage fields
        const storageMatches = content.match(/mapping\([^)]+\)\s+(\w+);/g) || [];
        const fieldNames = storageMatches.map(m => m.match(/\)\s+(\w+);/)?.[1]).filter(Boolean);
        const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
        
        if (duplicates.length > 0) {
            result.blockers.push(`❌ DUPLICATE STORAGE: ${duplicates.join(', ')}`);
        } else {
            result.score += 20;
        }

        // BLOCKER 2: Missing dispatcher gating
        const stateChangingFunctions = content.match(/function\s+\w+\([^)]*\)\s+external[^{]*{/g) || [];
        const ungatedFunctions = stateChangingFunctions.filter(func => {
            const funcText = func + content.split(func)[1]?.split('}')[0] || '';
            return !funcText.includes('onlyDispatcher') && 
                   !funcText.includes('view') && 
                   !funcText.includes('pure');
        });

        if (ungatedFunctions.length > 0) {
            result.blockers.push(`❌ UNGATED FUNCTIONS: ${ungatedFunctions.length} functions missing onlyDispatcher`);
        } else {
            result.score += 25;
        }

        // BLOCKER 3: Inconsistent init checks  
        const inlineInitChecks = content.match(/if\s*\([^)]*\.initialized[^)]*\)/g) || [];
        const modifierInitChecks = content.match(/onlyInitialized/g) || [];
        
        // Filter out initialization functions which legitimately use inline checks
        const nonInitInlineChecks = inlineInitChecks.filter(check => {
            const context = content.substring(content.indexOf(check) - 200, content.indexOf(check) + 200);
            return !context.includes('function initialize') && !context.includes('function init');
        });
        
        if (nonInitInlineChecks.length > 0 && modifierInitChecks.length > 0) {
            result.blockers.push(`❌ INCONSISTENT INIT: Mix of inline checks and modifiers in business functions`);
        } else if (nonInitInlineChecks.length > 0) {
            result.warnings.push(`⚠️  Uses inline init checks instead of modifiers`);
        } else {
            result.score += 15;
        }

        // BLOCKER 4: Non-ASCII characters
        const asciiOnly = /^[\x20-\x7E\s]*$/;
        if (!asciiOnly.test(content)) {
            const nonAsciiCount = content.split('').filter(char => char.charCodeAt(0) > 127).length;
            result.blockers.push(`❌ NON-ASCII: ${nonAsciiCount} unicode characters found`);
        } else {
            result.score += 15;
        }

        // BLOCKER 5: Unused imports
        const imports = content.match(/import\s+.*?from\s+["']([^"']+)["'];/g) || [];
        const unusedImports = imports.filter(imp => {
            const importName = imp.match(/import\s+(?:{[^}]+}|\w+)/)?.[0];
            if (!importName) return false;
            
            const symbols = importName.includes('{') 
                ? importName.match(/{([^}]+)}/)?.[1]?.split(',').map(s => s.trim()) || []
                : [importName.replace('import ', '').trim()];
            
            return symbols.some(symbol => {
                const cleanSymbol = symbol.replace(/[{}]/g, '').trim();
                return !content.includes(cleanSymbol) || content.indexOf(cleanSymbol) === content.lastIndexOf(cleanSymbol);
            });
        });

        if (unusedImports.length > 0) {
            result.warnings.push(`⚠️  ${unusedImports.length} potentially unused imports`);
        } else {
            result.score += 10;
        }

        // PRODUCTION PATTERNS
        const hasCustomErrors = content.includes('error ') && !content.includes('require(');
        const hasStorageLibrary = content.includes('library ') && content.includes('Storage');
        const hasModifierStack = content.includes('onlyDispatcher') && 
                                content.includes('onlyInitialized') && 
                                content.includes('whenNotPaused') && 
                                content.includes('nonReentrant');
        const hasRoleBasedAccess = content.includes('Role') || content.includes('ROLE');
        const hasSafeERC20 = content.includes('SafeERC20') && content.includes('safeTransfer');

        if (hasCustomErrors) result.score += 5;
        if (hasStorageLibrary) result.score += 5;
        if (hasModifierStack) result.score += 5;
        if (hasRoleBasedAccess) result.score += 3;
        if (hasSafeERC20) result.score += 2;

        result.isProduction = result.blockers.length === 0 && result.score >= 80;

        return result;
    }

    private printValidationResult(result: any): void {
        const status = result.isProduction ? '✅ PRODUCTION' : 
                      result.blockers.length === 0 ? '⚠️  NEEDS WORK' : '❌ BLOCKED';
        
        console.log(`  ${status} ${result.filename} (Score: ${result.score}/100)`);
        
        if (result.blockers.length > 0) {
            result.blockers.forEach((blocker: string) => console.log(`    ${blocker}`));
        }
        
        if (result.warnings.length > 0) {
            result.warnings.forEach((warning: string) => console.log(`    ${warning}`));
        }
    }

    private printLearningReport(): void {
        console.log("\n🧠 AI LEARNING SUMMARY:");
        console.log("=" .repeat(60));

        const total = this.validationResults.length;
        const production = this.validationResults.filter(r => r.isProduction).length;
        const blocked = this.validationResults.filter(r => r.blockers.length > 0).length;
        const avgScore = this.validationResults.reduce((sum, r) => sum + r.score, 0) / total;

        console.log(`📊 Total Facets: ${total}`);
        console.log(`✅ Production Ready: ${production} (${Math.round(production/total*100)}%)`);
        console.log(`❌ Blocked: ${blocked} (${Math.round(blocked/total*100)}%)`);
        console.log(`📈 Average Score: ${avgScore.toFixed(1)}/100`);

        console.log("\n🎯 TOP BLOCKERS LEARNED:");
        const allBlockers = this.validationResults.flatMap(r => r.blockers);
        const blockerCounts = allBlockers.reduce((acc: any, blocker) => {
            const type = blocker.split(':')[0];
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        Object.entries(blockerCounts)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .forEach(([blocker, count]) => {
                console.log(`  ${blocker}: ${count} occurrences`);
            });

        console.log("\n🚀 AI IMPROVEMENT RECOMMENDATIONS:");
        if (blocked > 0) {
            console.log("  1. Fix critical blockers first (compilation failures)");
            console.log("  2. Add onlyDispatcher to all state-changing functions");
            console.log("  3. Use consistent modifier patterns");
            console.log("  4. Remove non-ASCII characters from comments");
            console.log("  5. Clean up unused imports");
        } else {
            console.log("  ✅ All critical blockers resolved!");
            console.log("  📈 Focus on production patterns: custom errors, storage libraries, role-based access");
        }

        console.log(`\n🤖 AI has learned ${this.validationResults.length} facet patterns and identified ${Object.keys(blockerCounts).length} blocker types`);
    }
}

// Execute validation
async function main() {
    const validator = new AIFacetValidator();
    await validator.validateAllFacets();
}

main().catch(console.error);

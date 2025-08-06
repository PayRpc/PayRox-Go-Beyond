#!/usr/bin/env node

/**
 * 💎 PayRox Diamond Selector Management CLI Tool
 * 
 * @notice Advanced function selector calculation and Diamond Cut preparation
 * @dev Production tooling for PayRox Diamond ecosystem integration
 * 
 * Features:
 * - Function selector calculation with collision detection
 * - DiamondCut transaction preparation
 * - Facet compatibility validation
 * - Ecosystem tooling integration
 * - Gas optimization analysis
 */

import { ethers } from 'hardhat';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

interface SelectorInfo {
  selector: string;
  functionName: string;
  functionSignature: string;
  facetName: string;
  facetAddress?: string;
  gasEstimate?: number;
}

interface DiamondCutAction {
  facetAddress: string;
  action: 0 | 1 | 2; // 0=add, 1=replace, 2=remove
  functionSelectors: string[];
}

interface CompatibilityReport {
  compatible: boolean;
  collisions: SelectorCollision[];
  warnings: string[];
  recommendations: string[];
}

interface SelectorCollision {
  selector: string;
  facets: string[];
  severity: 'error' | 'warning' | 'info';
}

class PayRoxSelectorManager {
  private facetsPath: string;
  private selectorsCache: Map<string, SelectorInfo[]> = new Map();
  
  constructor() {
    this.facetsPath = join(process.cwd(), 'contracts', 'facets');
  }

  /**
   * 🎯 Main CLI interface
   */
  async execute(command: string, args: string[]): Promise<void> {
    console.log('💎 PayRox Diamond Selector Manager');
    console.log('=' .repeat(60));

    switch (command) {
      case 'calculate':
        await this.calculateSelectors(args);
        break;
      case 'prepare-cut':
        await this.prepareDiamondCut(args);
        break;
      case 'validate':
        await this.validateCompatibility(args);
        break;
      case 'analyze':
        await this.analyzeGasUsage(args);
        break;
      case 'export':
        await this.exportSelectors(args);
        break;
      default:
        this.showHelp();
    }
  }

  /**
   * 📊 Calculate function selectors for facets
   */
  async calculateSelectors(args: string[]): Promise<void> {
    const facetPattern = args[0] || '*';
    console.log(`🧮 Calculating selectors for pattern: ${facetPattern}`);

    const facets = await this.discoverFacets(facetPattern);
    const allSelectors: SelectorInfo[] = [];

    for (const facet of facets) {
      console.log(`\n📋 Processing ${facet.name}...`);
      const selectors = await this.extractFacetSelectors(facet);
      allSelectors.push(...selectors);

      console.log(`   Functions: ${selectors.length}`);
      selectors.forEach(sel => {
        console.log(`   - ${sel.selector} → ${sel.functionSignature}`);
      });
    }

    // Check for collisions
    const collisions = this.detectCollisions(allSelectors);
    if (collisions.length > 0) {
      console.log(`\n⚠️ Selector Collisions Detected: ${collisions.length}`);
      collisions.forEach(collision => {
        console.log(`   ${collision.selector}: ${collision.facets.join(', ')}`);
      });
    }

    // Save results
    await this.saveSelectorReport(allSelectors, collisions);
    console.log('\n✅ Selector calculation complete!');
  }

  /**
   * ⚔️ Prepare DiamondCut transaction
   */
  async prepareDiamondCut(args: string[]): Promise<void> {
    const facetNames = args[0]?.split(',') || [];
    const action = args[1] || 'add'; // add, replace, remove

    console.log(`⚔️ Preparing DiamondCut for: ${facetNames.join(', ')}`);
    console.log(`   Action: ${action}`);

    const cuts: DiamondCutAction[] = [];

    for (const facetName of facetNames) {
      const facet = await this.loadFacetInfo(facetName);
      const selectors = await this.extractFacetSelectors(facet);

      const cut: DiamondCutAction = {
        facetAddress: facet.address || ethers.ZeroAddress,
        action: action === 'add' ? 0 : action === 'replace' ? 1 : 2,
        functionSelectors: selectors.map(s => s.selector)
      };

      cuts.push(cut);
      console.log(`   ${facetName}: ${selectors.length} selectors`);
    }

    // Generate DiamondCut calldata
    const cutCalldata = this.generateDiamondCutCalldata(cuts);
    
    // Save DiamondCut script
    await this.saveDiamondCutScript(cuts, cutCalldata);
    
    console.log('\n✅ DiamondCut preparation complete!');
    console.log('📋 Check diamond-cut-script.ts for execution');
  }

  /**
   * 🔍 Validate facet compatibility
   */
  async validateCompatibility(args: string[]): Promise<void> {
    const facetPattern = args[0] || '*';
    console.log(`🔍 Validating compatibility for: ${facetPattern}`);

    const facets = await this.discoverFacets(facetPattern);
    const report = await this.generateCompatibilityReport(facets);

    console.log(`\n📊 Compatibility Report:`);
    console.log(`   Compatible: ${report.compatible ? '✅ Yes' : '❌ No'}`);
    console.log(`   Collisions: ${report.collisions.length}`);
    console.log(`   Warnings: ${report.warnings.length}`);

    if (report.collisions.length > 0) {
      console.log('\n⚠️ Selector Collisions:');
      report.collisions.forEach(collision => {
        console.log(`   ${collision.selector}: ${collision.facets.join(' vs ')}`);
      });
    }

    if (report.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      report.warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
    }

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }

    await this.saveCompatibilityReport(report);
    console.log('\n✅ Compatibility validation complete!');
  }

  /**
   * ⛽ Analyze gas usage for selectors
   */
  async analyzeGasUsage(args: string[]): Promise<void> {
    const facetPattern = args[0] || '*';
    console.log(`⛽ Analyzing gas usage for: ${facetPattern}`);

    const facets = await this.discoverFacets(facetPattern);
    const gasAnalysis: Array<{facet: string, function: string, gasEstimate: number}> = [];

    for (const facet of facets) {
      const selectors = await this.extractFacetSelectors(facet);
      
      for (const selector of selectors) {
        // Estimate gas usage (simplified calculation)
        const gasEstimate = this.estimateGasUsage(selector);
        gasAnalysis.push({
          facet: facet.name,
          function: selector.functionSignature,
          gasEstimate
        });
      }
    }

    // Sort by gas usage
    gasAnalysis.sort((a, b) => b.gasEstimate - a.gasEstimate);

    console.log('\n⛽ Gas Usage Analysis:');
    gasAnalysis.slice(0, 10).forEach(item => {
      console.log(`   ${item.gasEstimate.toLocaleString()} gas - ${item.facet}.${item.function}`);
    });

    await this.saveGasAnalysis(gasAnalysis);
    console.log('\n✅ Gas analysis complete!');
  }

  /**
   * 📤 Export selectors for ecosystem tooling
   */
  async exportSelectors(args: string[]): Promise<void> {
    const format = args[0] || 'json'; // json, csv, typescript
    console.log(`📤 Exporting selectors in ${format} format...`);

    const facets = await this.discoverFacets('*');
    const allSelectors: SelectorInfo[] = [];

    for (const facet of facets) {
      const selectors = await this.extractFacetSelectors(facet);
      allSelectors.push(...selectors);
    }

    switch (format) {
      case 'json':
        await this.exportAsJSON(allSelectors);
        break;
      case 'csv':
        await this.exportAsCSV(allSelectors);
        break;
      case 'typescript':
        await this.exportAsTypeScript(allSelectors);
        break;
      default:
        console.log('❌ Unsupported format. Use: json, csv, typescript');
    }

    console.log('\n✅ Export complete!');
  }

  /**
   * 🔍 Discover facets based on pattern
   */
  private async discoverFacets(pattern: string): Promise<Array<{name: string, path: string, address?: string}>> {
    const facets: Array<{name: string, path: string, address?: string}> = [];

    // Search in contracts/facets
    if (existsSync(this.facetsPath)) {
      const files = readdirSync(this.facetsPath)
        .filter(file => file.endsWith('.sol'))
        .filter(file => pattern === '*' || file.includes(pattern));

      for (const file of files) {
        facets.push({
          name: basename(file, '.sol'),
          path: join(this.facetsPath, file)
        });
      }
    }

    // Search in deployable-modules
    const modulesPath = join(process.cwd(), 'deployable-modules');
    if (existsSync(modulesPath)) {
      const dirs = readdirSync(modulesPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const dir of dirs) {
        const dirPath = join(modulesPath, dir);
        const files = readdirSync(dirPath)
          .filter(file => file.endsWith('.sol'))
          .filter(file => pattern === '*' || file.includes(pattern));

        for (const file of files) {
          facets.push({
            name: basename(file, '.sol'),
            path: join(dirPath, file)
          });
        }
      }
    }

    return facets;
  }

  /**
   * 🔬 Extract selectors from a facet
   */
  private async extractFacetSelectors(facet: {name: string, path: string}): Promise<SelectorInfo[]> {
    const content = readFileSync(facet.path, 'utf8');
    const selectors: SelectorInfo[] = [];

    // Extract function signatures using regex
    const functionRegex = /function\s+(\w+)\s*\(([^)]*)\)\s*(external|public)/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const functionName = match[1];
      const params = match[2];
      const visibility = match[3];

      if (visibility === 'external' || visibility === 'public') {
        const functionSignature = `${functionName}(${params})`;
        const selector = ethers.id(functionSignature).slice(0, 10);

        selectors.push({
          selector,
          functionName,
          functionSignature,
          facetName: facet.name
        });
      }
    }

    return selectors;
  }

  /**
   * 🔍 Detect selector collisions
   */
  private detectCollisions(selectors: SelectorInfo[]): SelectorCollision[] {
    const selectorMap = new Map<string, SelectorInfo[]>();
    
    selectors.forEach(sel => {
      if (!selectorMap.has(sel.selector)) {
        selectorMap.set(sel.selector, []);
      }
      selectorMap.get(sel.selector)!.push(sel);
    });

    const collisions: SelectorCollision[] = [];
    
    selectorMap.forEach((sels, selector) => {
      if (sels.length > 1) {
        collisions.push({
          selector,
          facets: sels.map(s => s.facetName),
          severity: 'error'
        });
      }
    });

    return collisions;
  }

  /**
   * ⛽ Estimate gas usage for a function
   */
  private estimateGasUsage(selector: SelectorInfo): number {
    // Simplified gas estimation based on function complexity
    let gasEstimate = 21000; // Base transaction cost

    // Add costs based on function name patterns
    if (selector.functionName.includes('batch')) gasEstimate += 50000;
    if (selector.functionName.includes('mint') || selector.functionName.includes('burn')) gasEstimate += 30000;
    if (selector.functionName.includes('transfer')) gasEstimate += 25000;
    if (selector.functionName.includes('approve')) gasEstimate += 20000;
    if (selector.functionName.includes('stake')) gasEstimate += 40000;
    if (selector.functionName.includes('random')) gasEstimate += 60000;

    // Add costs based on parameter complexity
    const paramCount = selector.functionSignature.split(',').length;
    gasEstimate += paramCount * 1000;

    return gasEstimate;
  }

  /**
   * 💾 Save selector report
   */
  private async saveSelectorReport(selectors: SelectorInfo[], collisions: SelectorCollision[]): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      totalSelectors: selectors.length,
      uniqueSelectors: new Set(selectors.map(s => s.selector)).size,
      collisions: collisions.length,
      selectors: selectors.map(s => ({
        selector: s.selector,
        function: s.functionSignature,
        facet: s.facetName
      })),
      collisionDetails: collisions
    };

    writeFileSync(
      join(process.cwd(), 'selector-report.json'),
      JSON.stringify(report, null, 2)
    );
  }

  /**
   * ⚔️ Generate DiamondCut calldata
   */
  private generateDiamondCutCalldata(cuts: DiamondCutAction[]): string {
    // This would generate actual DiamondCut calldata
    // For demo purposes, we'll create a simplified version
    const cutInterface = new ethers.Interface([
      'function diamondCut(tuple(address facetAddress, uint8 action, bytes4[] functionSelectors)[] _diamondCut, address _init, bytes _calldata)'
    ]);

    return cutInterface.encodeFunctionData('diamondCut', [cuts, ethers.ZeroAddress, '0x']);
  }

  /**
   * 💾 Save DiamondCut script
   */
  private async saveDiamondCutScript(cuts: DiamondCutAction[], calldata: string): Promise<void> {
    const script = `// Generated PayRox DiamondCut Script
import { ethers } from 'hardhat';

async function main() {
  console.log('⚔️ Executing PayRox DiamondCut...');
  
  const cuts = ${JSON.stringify(cuts, null, 2)};
  
  // Execute DiamondCut
  const [signer] = await ethers.getSigners();
  const diamond = await ethers.getContractAt('Diamond', 'DIAMOND_ADDRESS');
  
  const tx = await diamond.diamondCut(cuts, ethers.ZeroAddress, '0x');
  await tx.wait();
  
  console.log('✅ DiamondCut executed successfully!');
  console.log('Tx Hash:', tx.hash);
}

main().catch(console.error);
`;

    writeFileSync(join(process.cwd(), 'diamond-cut-script.ts'), script);
  }

  /**
   * 📊 Generate compatibility report
   */
  private async generateCompatibilityReport(facets: any[]): Promise<CompatibilityReport> {
    const allSelectors: SelectorInfo[] = [];
    
    for (const facet of facets) {
      const selectors = await this.extractFacetSelectors(facet);
      allSelectors.push(...selectors);
    }

    const collisions = this.detectCollisions(allSelectors);
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Analyze for warnings
    if (allSelectors.length > 100) {
      warnings.push('Large number of selectors may impact gas costs');
    }

    // Generate recommendations
    if (collisions.length > 0) {
      recommendations.push('Resolve selector collisions before deployment');
    }

    return {
      compatible: collisions.length === 0,
      collisions,
      warnings,
      recommendations
    };
  }

  /**
   * 📤 Export as JSON
   */
  private async exportAsJSON(selectors: SelectorInfo[]): Promise<void> {
    const exportData = {
      metadata: {
        timestamp: new Date().toISOString(),
        totalSelectors: selectors.length,
        generator: 'PayRox Diamond Selector Manager'
      },
      selectors: selectors
    };

    writeFileSync(
      join(process.cwd(), 'payrox-selectors.json'),
      JSON.stringify(exportData, null, 2)
    );
  }

  /**
   * 📤 Export as TypeScript
   */
  private async exportAsTypeScript(selectors: SelectorInfo[]): Promise<void> {
    const tsContent = `// Generated PayRox Diamond Selectors
export const PAYROX_SELECTORS = {
${selectors.map(s => `  '${s.functionName}': '${s.selector}', // ${s.facetName}`).join('\n')}
} as const;

export type PayRoxSelector = keyof typeof PAYROX_SELECTORS;
`;

    writeFileSync(join(process.cwd(), 'payrox-selectors.ts'), tsContent);
  }

  /**
   * 📤 Export as CSV
   */
  private async exportAsCSV(selectors: SelectorInfo[]): Promise<void> {
    const csvLines = [
      'Selector,Function,Facet,Signature',
      ...selectors.map(s => `${s.selector},${s.functionName},${s.facetName},"${s.functionSignature}"`)
    ];

    writeFileSync(join(process.cwd(), 'payrox-selectors.csv'), csvLines.join('\n'));
  }

  /**
   * 💾 Save compatibility report
   */
  private async saveCompatibilityReport(report: CompatibilityReport): Promise<void> {
    writeFileSync(
      join(process.cwd(), 'compatibility-report.json'),
      JSON.stringify(report, null, 2)
    );
  }

  /**
   * 💾 Save gas analysis
   */
  private async saveGasAnalysis(analysis: any[]): Promise<void> {
    writeFileSync(
      join(process.cwd(), 'gas-analysis.json'),
      JSON.stringify(analysis, null, 2)
    );
  }

  /**
   * 💾 Load facet info
   */
  private async loadFacetInfo(facetName: string): Promise<{name: string, path: string, address?: string}> {
    const facets = await this.discoverFacets(facetName);
    const facet = facets.find(f => f.name === facetName);
    
    if (!facet) {
      throw new Error(`Facet not found: ${facetName}`);
    }
    
    return facet;
  }

  /**
   * 📖 Show help information
   */
  private showHelp(): void {
    console.log(`
💎 PayRox Diamond Selector Manager Usage:

COMMANDS:
  calculate [pattern]     Calculate function selectors for facets
  prepare-cut <facets>    Prepare DiamondCut transaction
  validate [pattern]      Validate facet compatibility
  analyze [pattern]       Analyze gas usage for functions
  export [format]         Export selectors (json|csv|typescript)

EXAMPLES:
  npm run payrox:selector calculate
  npm run payrox:selector calculate "Token*"
  npm run payrox:selector prepare-cut "TokenFacet,UtilsFacet"
  npm run payrox:selector validate
  npm run payrox:selector analyze "Random*"
  npm run payrox:selector export typescript

OPTIONS:
  pattern     Glob pattern to match facet names (* for all)
  facets      Comma-separated list of facet names
  format      Export format: json, csv, typescript
`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const [command, ...args] = process.argv.slice(2);
  
  if (!command) {
    console.log('❌ Command required. Use --help for usage information.');
    process.exit(1);
  }

  try {
    const manager = new PayRoxSelectorManager();
    await manager.execute(command, args);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { PayRoxSelectorManager };

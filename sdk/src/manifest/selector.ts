// sdk/src/manifest/selector.ts
import { ethers } from 'ethers';

export interface SelectorInfo {
  selector: string;
  signature: string;
  functionName: string;
  inputs: string[];
  outputs: string[];
  stateMutability: string;
}

export interface SelectorMap {
  [selector: string]: SelectorInfo;
}

/**
 * Utility for managing function selectors and 4-byte mappings
 * Provides comprehensive selector analysis and collision detection
 */
export class SelectorManager {
  private selectors: Map<string, SelectorInfo> = new Map();
  private nameToSelectors: Map<string, string[]> = new Map();

  /**
   * Add a function selector with metadata
   */
  addSelector(info: SelectorInfo): void {
    if (!ethers.isHexString(info.selector, 4)) {
      throw new Error(`Invalid selector format: ${info.selector}`);
    }

    this.selectors.set(info.selector, info);

    // Track function name to selector mappings
    if (!this.nameToSelectors.has(info.functionName)) {
      this.nameToSelectors.set(info.functionName, []);
    }
    const selectors = this.nameToSelectors.get(info.functionName);
    if (selectors && !selectors.includes(info.selector)) {
      selectors.push(info.selector);
    }
  }

  /**
   * Generate selector from function signature
   */
  static generateSelector(signature: string): string {
    return ethers.id(signature).slice(0, 10);
  }

  /**
   * Parse ABI and extract all selectors
   */
  addSelectorsFromABI(abi: ethers.JsonFragment[]): void {
    const functions = abi.filter(item => item.type === 'function');

    for (const func of functions) {
      const inputs = (func.inputs || []).map(input =>
        typeof input === 'string' ? input : input.type || 'unknown'
      );
      const outputs = (func.outputs || []).map(output =>
        typeof output === 'string' ? output : output.type || 'unknown'
      );

      const signature = `${func.name}(${inputs.join(',')})`;
      const selector = SelectorManager.generateSelector(signature);

      this.addSelector({
        selector,
        signature,
        functionName: func.name || 'unknown',
        inputs,
        outputs,
        stateMutability: func.stateMutability || 'nonpayable',
      });
    }
  }

  /**
   * Get selector information
   */
  getSelector(selector: string): SelectorInfo | undefined {
    return this.selectors.get(selector);
  }

  /**
   * Get all selectors for a function name
   */
  getSelectorsForFunction(functionName: string): string[] {
    return this.nameToSelectors.get(functionName) || [];
  }

  /**
   * Check for selector collisions
   */
  findCollisions(): { [selector: string]: SelectorInfo[] } {
    const collisions: { [selector: string]: SelectorInfo[] } = {};
    const selectorCounts = new Map<string, SelectorInfo[]>();

    // Group by selector
    for (const [selector, info] of this.selectors) {
      if (!selectorCounts.has(selector)) {
        selectorCounts.set(selector, []);
      }
      const infos = selectorCounts.get(selector);
      if (infos) {
        infos.push(info);
      }
    }

    // Find actual collisions
    for (const [selector, infos] of selectorCounts) {
      if (infos.length > 1) {
        collisions[selector] = infos;
      }
    }

    return collisions;
  }

  /**
   * Detect common ERC standard function overlaps
   */
  detectStandardOverlaps(): { [standard: string]: string[] } {
    const standards = {
      ERC20: [
        '0x70a08231', // balanceOf(address)
        '0xa9059cbb', // transfer(address,uint256)
        '0x095ea7b3', // approve(address,uint256)
        '0xdd62ed3e', // allowance(address,address)
        '0x18160ddd', // totalSupply()
      ],
      ERC721: [
        '0x70a08231', // balanceOf(address)
        '0x6352211e', // ownerOf(uint256)
        '0x095ea7b3', // approve(address,uint256)
        '0x081812fc', // getApproved(uint256)
        '0xa22cb465', // setApprovalForAll(address,bool)
      ],
      ERC1155: [
        '0x00fdd58e', // balanceOf(address,uint256)
        '0x4e1273f4', // balanceOfBatch(address[],uint256[])
        '0xa22cb465', // setApprovalForAll(address,bool)
        '0xe985e9c5', // isApprovedForAll(address,address)
      ],
    };

    const overlaps: { [standard: string]: string[] } = {};

    for (const [standard, standardSelectors] of Object.entries(standards)) {
      const found = standardSelectors.filter(sel => this.selectors.has(sel));
      if (found.length > 0) {
        overlaps[standard] = found;
      }
    }

    return overlaps;
  }

  /**
   * Generate selector statistics
   */
  getStatistics() {
    const totalSelectors = this.selectors.size;
    const uniqueFunctions = this.nameToSelectors.size;
    const collisions = Object.keys(this.findCollisions()).length;
    const standardOverlaps = this.detectStandardOverlaps();

    // Calculate complexity distribution
    const complexityDistribution = {
      simple: 0, // 0-2 inputs
      moderate: 0, // 3-5 inputs
      complex: 0, // 6+ inputs
    };

    for (const info of this.selectors.values()) {
      const inputCount = info.inputs.length;
      if (inputCount <= 2) {
        complexityDistribution.simple++;
      } else if (inputCount <= 5) {
        complexityDistribution.moderate++;
      } else {
        complexityDistribution.complex++;
      }
    }

    return {
      totalSelectors,
      uniqueFunctions,
      collisions,
      standardOverlaps: Object.keys(standardOverlaps),
      complexityDistribution,
      averageInputsPerFunction:
        totalSelectors > 0
          ? Math.round(
              (Array.from(this.selectors.values()).reduce(
                (sum, info) => sum + info.inputs.length,
                0
              ) /
                totalSelectors) *
                100
            ) / 100
          : 0,
    };
  }

  /**
   * Export selectors as JSON map
   */
  exportSelectorMap(): SelectorMap {
    const map: SelectorMap = {};
    for (const [selector, info] of this.selectors) {
      map[selector] = info;
    }
    return map;
  }

  /**
   * Import selectors from JSON map
   */
  importSelectorMap(map: SelectorMap): void {
    for (const [selector, info] of Object.entries(map)) {
      this.addSelector({ ...info, selector });
    }
  }

  /**
   * Generate human-readable selector report
   */
  generateReport(): string {
    const stats = this.getStatistics();
    const collisions = this.findCollisions();
    const overlaps = this.detectStandardOverlaps();

    let report = '# Function Selector Analysis Report\n\n';

    report += '## Overview\n';
    report += `- Total Selectors: ${stats.totalSelectors}\n`;
    report += `- Unique Functions: ${stats.uniqueFunctions}\n`;
    report += `- Selector Collisions: ${stats.collisions}\n`;
    report += `- Average Inputs per Function: ${stats.averageInputsPerFunction}\n\n`;

    report += '## Complexity Distribution\n';
    report += `- Simple (0-2 inputs): ${stats.complexityDistribution.simple}\n`;
    report += `- Moderate (3-5 inputs): ${stats.complexityDistribution.moderate}\n`;
    report += `- Complex (6+ inputs): ${stats.complexityDistribution.complex}\n\n`;

    if (Object.keys(collisions).length > 0) {
      report += '## Selector Collisions\n';
      for (const [selector, infos] of Object.entries(collisions)) {
        report += `### ${selector}\n`;
        for (const info of infos) {
          report += `- ${info.signature}\n`;
        }
        report += '\n';
      }
    }

    if (Object.keys(overlaps).length > 0) {
      report += '## Standard Overlaps\n';
      for (const [standard, selectors] of Object.entries(overlaps)) {
        report += `### ${standard}\n`;
        for (const selector of selectors) {
          const info = this.getSelector(selector);
          report += `- ${selector}: ${info?.signature || 'unknown'}\n`;
        }
        report += '\n';
      }
    }

    return report;
  }

  /**
   * Clear all selectors
   */
  clear(): void {
    this.selectors.clear();
    this.nameToSelectors.clear();
  }

  /**
   * Get all selectors as array
   */
  getAllSelectors(): SelectorInfo[] {
    return Array.from(this.selectors.values());
  }
}

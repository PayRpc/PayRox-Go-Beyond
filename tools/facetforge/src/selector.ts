// tools/facetforge/src/selector.ts
 
import { keccak256 } from 'ethers';
import type { FunctionInfo } from './parser';

// Re-export the interface for external use
export type { FunctionInfo };

export interface SelectorInfo {
  selector: string;
  signature: string;
  functionName: string;
  isCollision: boolean;
}

export interface SelectorMap {
  [selector: string]: SelectorInfo[];
}

export interface CollisionReport {
  [selector: string]: string[];
}

export interface SelectorCalculatorOptions {
  includeCommonStandards?: boolean;
  customStandards?: string[];
}

export class SelectorCalculator {
  private options: SelectorCalculatorOptions;
  private commonStandards: { [selector: string]: string[] };

  constructor(options: SelectorCalculatorOptions = {}) {
    this.options = {
      includeCommonStandards: true,
      ...options,
    };

    // Common ERC standard selectors for collision detection
    this.commonStandards = {
      '0x70a08231': ['balanceOf(address)'], // ERC20, ERC721
      '0xa9059cbb': ['transfer(address,uint256)'], // ERC20
      '0x23b872dd': ['transferFrom(address,address,uint256)'], // ERC20, ERC721
      '0x095ea7b3': ['approve(address,uint256)'], // ERC20, ERC721
      '0xdd62ed3e': ['allowance(address,address)'], // ERC20
      '0x06fdde03': ['name()'], // ERC20, ERC721
      '0x95d89b41': ['symbol()'], // ERC20, ERC721
      '0x313ce567': ['decimals()'], // ERC20
      '0x18160ddd': ['totalSupply()'], // ERC20, ERC721
      '0x6352211e': ['ownerOf(uint256)'], // ERC721
      '0x42842e0e': ['safeTransferFrom(address,address,uint256)'], // ERC721
      '0xb88d4fde': ['safeTransferFrom(address,address,uint256,bytes)'], // ERC721
      '0x081812fc': ['getApproved(uint256)'], // ERC721
      '0xa22cb465': ['setApprovalForAll(address,bool)'], // ERC721
      '0xe985e9c5': ['isApprovedForAll(address,address)'], // ERC721
      '0x01ffc9a7': ['supportsInterface(bytes4)'], // ERC165
      '0x8da5cb5b': ['owner()'], // Ownable
      '0xf2fde38b': ['transferOwnership(address)'], // Ownable
      '0x715018a6': ['renounceOwnership()'], // Ownable
      '0x5c975abb': ['paused()'], // Pausable
      '0x8456cb59': ['pause()'], // Pausable
      '0x3f4ba83a': ['unpause()'], // Pausable
    };
  }

  calculateSelectors(functions: FunctionInfo[]): SelectorMap {
    const selectorMap: SelectorMap = {};

    for (const func of functions) {
      const signature = this.buildFunctionSignature(func);
      const selector = this.calculateSelector(signature);

      if (!selectorMap[selector]) {
        selectorMap[selector] = [];
      }

      selectorMap[selector].push({
        selector,
        signature,
        functionName: func.name,
        isCollision: false,
      });
    }

    // Mark collisions
    Object.keys(selectorMap).forEach(selector => {
      if (selectorMap[selector].length > 1) {
        selectorMap[selector].forEach(info => {
          info.isCollision = true;
        });
      }
    });

    return selectorMap;
  }

  detectCollisions(selectorMap: SelectorMap): CollisionReport {
    const collisions: CollisionReport = {};

    // Internal collisions
    Object.entries(selectorMap).forEach(([selector, infos]) => {
      if (infos.length > 1) {
        collisions[selector] = infos.map(info => info.signature);
      }
    });

    // Standard collisions if enabled
    if (this.options.includeCommonStandards) {
      Object.entries(selectorMap).forEach(([selector]) => {
        if (this.commonStandards[selector]) {
          const existing = collisions[selector] || [];
          collisions[selector] = [
            ...existing,
            ...this.commonStandards[selector],
          ].filter((item, index, array) => array.indexOf(item) === index);
        }
      });
    }

    return collisions;
  }

  generateReport(
    selectorMap: SelectorMap,
    collisions: CollisionReport
  ): string {
    let report = 'Function Selector Analysis Report\n';
    report += '================================\n\n';

    const totalSelectors = Object.keys(selectorMap).length;
    const collisionCount = Object.keys(collisions).length;

    report += `Total Selectors: ${totalSelectors}\n`;
    report += `Collisions Detected: ${collisionCount}\n`;
    report += `Collision Rate: ${(
      (collisionCount / totalSelectors) *
      100
    ).toFixed(2)}%\n\n`;

    if (collisionCount > 0) {
      report += 'COLLISIONS:\n';
      report += '-----------\n';
      Object.entries(collisions).forEach(([selector, signatures]) => {
        report += `${selector}:\n`;
        signatures.forEach(sig => {
          report += `  - ${sig}\n`;
        });
        report += '\n';
      });
    }

    report += 'ALL SELECTORS:\n';
    report += '--------------\n';
    Object.entries(selectorMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([selector, infos]) => {
        infos.forEach(info => {
          const collision = info.isCollision ? ' [COLLISION]' : '';
          report += `${selector}: ${info.signature}${collision}\n`;
        });
      });

    return report;
  }

  private buildFunctionSignature(func: FunctionInfo): string {
    const params = func.parameters
      .map(param => {
        return this.normalizeType(param.type);
      })
      .join(',');

    return `${func.name}(${params})`;
  }

  private normalizeType(type: string): string {
    // Remove storage location keywords
    return type
      .replace(/\s*(memory|storage|calldata)\s*/g, '')
      .replace(/\s+/g, '')
      .trim();
  }

  private calculateSelector(signature: string): string {
    try {
      const hash = keccak256(Buffer.from(signature, 'utf8'));
      return hash.slice(0, 10); // First 4 bytes (8 hex chars + 0x)
    } catch (error) {
      throw new Error(
        `Failed to calculate selector for ${signature}: ${error}`
      );
    }
  }

  validateSelector(selector: string): boolean {
    return /^0x[0-9a-fA-F]{8}$/.test(selector);
  }

  findCollisionRisk(
    targetSelector: string,
    functions: FunctionInfo[]
  ): {
    risk: 'none' | 'low' | 'medium' | 'high';
    similar: string[];
    explanation: string;
  } {
    const selectorMap = this.calculateSelectors(functions);
    const collisions = this.detectCollisions(selectorMap);

    if (collisions[targetSelector]) {
      return {
        risk: 'high',
        similar: collisions[targetSelector],
        explanation: 'Direct collision detected with existing functions',
      };
    }

    // Check for near misses (differing by 1-2 hex chars)
    const similar: string[] = [];
    Object.keys(selectorMap).forEach(selector => {
      const diff = this.calculateHexDifference(targetSelector, selector);
      if (diff > 0 && diff <= 2) {
        similar.push(selector);
      }
    });

    if (similar.length > 0) {
      return {
        risk: 'medium',
        similar,
        explanation:
          'Similar selectors found that differ by only 1-2 hex characters',
      };
    }

    // Check against common standards
    const commonCollisions = Object.keys(this.commonStandards).filter(
      selector => this.calculateHexDifference(targetSelector, selector) <= 2
    );

    if (commonCollisions.length > 0) {
      return {
        risk: 'low',
        similar: commonCollisions,
        explanation: 'Similar to common ERC standard selectors',
      };
    }

    return {
      risk: 'none',
      similar: [],
      explanation: 'No collision risk detected',
    };
  }

  private calculateHexDifference(hex1: string, hex2: string): number {
    if (hex1.length !== hex2.length) {
      return Infinity;
    }

    let differences = 0;
    for (let i = 2; i < hex1.length; i++) {
      // Skip '0x'
      if (hex1[i] !== hex2[i]) {
        differences++;
      }
    }
    return differences;
  }

  exportToJson(selectorMap: SelectorMap, collisions: CollisionReport): any {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalSelectors: Object.keys(selectorMap).length,
        collisionCount: Object.keys(collisions).length,
        collisionRate:
          (Object.keys(collisions).length / Object.keys(selectorMap).length) *
          100,
      },
      selectors: selectorMap,
      collisions,
      standards: this.options.includeCommonStandards
        ? this.commonStandards
        : {},
    };
  }
}

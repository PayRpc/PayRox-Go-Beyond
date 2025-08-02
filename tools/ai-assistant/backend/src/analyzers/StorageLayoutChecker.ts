import {
  DiamondStoragePattern,
  FacetStorageMetadata,
  ParsedContract,
  PayRoxCompatibilityReport,
  RiskLevel,
  SeverityLevel,
  SlotInfo,
  StorageConflict,
  StorageLayoutReport,
  VariableInfo,
} from '../types/index';

import { keccak256 } from 'ethers';
import { SolidityAnalyzer } from './SolidityAnalyzer';

/**
 * PayRox Go Beyond Storage Layout Checker
 *
 * Advanced analyzer for diamond proxy storage layouts with:
 * - Slot conflict detection
 * - Diamond pattern verification
 * - Gas optimization suggestions
 * - Security vulnerability scanning
 * - PayRox manifest compatibility
 * - Storage isolation scoring
 */
export class StorageLayoutChecker {
  private readonly namespacePrefix: string;
  private readonly analyzer: SolidityAnalyzer;

  constructor(namespacePrefix: string = 'payrox.facets') {
    this.namespacePrefix = namespacePrefix;
    this.analyzer = new SolidityAnalyzer();
  }

  /**
   * Comprehensive storage analysis for facet-based contracts
   */
  async checkFacetStorageCompatibility(
    facets: ParsedContract[]
  ): Promise<StorageLayoutReport> {
    const slotUsage = new Map<number, StorageSlotUsage[]>();
    const diamondPatterns: DiamondStoragePattern[] = [];
    const slotConflicts: StorageConflict[] = [];
    const securityIssues: string[] = [];
    const gasOptimizations: string[] = [];
    const recommendations: string[] = [];
    const facetStorageMetadata: Record<string, FacetStorageMetadata> = {};

    // Phase 1: Collect storage data
    let totalSlots = 0;
    for (const facet of facets) {
      const metadata = this.analyzeFacetStorage(facet);
      facetStorageMetadata[facet.name] = metadata;

      // Update slot usage
      Array.from(metadata.slotMap.entries()).forEach(([slot, slotInfo]) => {
        if (!slotUsage.has(slot)) {
          slotUsage.set(slot, []);
        }
        slotUsage.get(slot)?.push({
          facet: facet.name,
          variable: slotInfo.variable,
          slotInfo,
        });
        totalSlots = Math.max(totalSlots, slot);
      });

      // Identify diamond patterns
      const patterns = this.identifyDiamondPatterns(facet);
      diamondPatterns.push(...patterns);
    }
    totalSlots++; // Convert max index to count

    // Phase 2: Detect conflicts
    Array.from(slotUsage.entries()).forEach(([slot, usages]) => {
      if (usages.length > 1) {
        const conflict = this.analyzeSlotConflict(slot, usages);
        slotConflicts.push(conflict);
      }
    });

    // Phase 3: Security analysis
    securityIssues.push(
      ...this.identifySecurityIssues(slotConflicts, diamondPatterns)
    );

    // Phase 4: Optimization analysis
    gasOptimizations.push(...this.generateGasOptimizations(facets, slotUsage));

    // Phase 5: Generate recommendations
    recommendations.push(
      ...this.generateStorageRecommendations(facets, slotConflicts)
    );

    // Phase 6: Isolation assessment
    const isolationReport = this.assessFacetIsolation(
      slotConflicts,
      facets,
      diamondPatterns
    );

    return {
      totalSlots,
      usedSlots: slotUsage.size,
      conflicts: slotConflicts,
      diamondPatterns,
      facetStorageMetadata,
      facetIsolation: isolationReport,
      diagnostics: {
        securityIssues,
        gasOptimizations,
        recommendations,
      },
      compatibility: this.validatePayRoxCompatibility(facets, isolationReport),
    };
  }

  /**
   * Generate diamond-safe storage layout implementation
   */
  generateDiamondSafeLayout(facets: ParsedContract[]): {
    storageStructs: string[];
    storageSlots: DiamondStorageSlot[];
    implementation: string;
    manifest: string;
  } {
    const storageStructs: string[] = [];
    const storageSlots: DiamondStorageSlot[] = [];
    const manifestEntries: string[] = [];

    // Track namespaces to prevent collisions
    const namespaceRegistry = new Set<string>();
    let slotCounter = 0;

    for (const facet of facets) {
      const namespace = `${
        this.namespacePrefix
      }.${facet.name.toLowerCase()}.v1`;

      // Ensure unique namespace
      if (namespaceRegistry.has(namespace)) {
        throw new Error(`Namespace collision detected: ${namespace}`);
      }
      namespaceRegistry.add(namespace);

      const structName = `${facet.name}Storage`;
      const slotName = `${facet.name.toUpperCase()}_STORAGE_SLOT`;
      const slotValue = keccak256(Buffer.from(namespace));

      const variables = facet.variables
        .filter(v => !v.constant && !v.immutable)
        .map(v => `${v.type} ${v.name};`)
        .join('\n    ');

      // Generate struct definition
      storageStructs.push(`
struct ${structName} {
  ${variables}
}`);

      // Generate slot assignment
      storageSlots.push({
        facet: facet.name,
        slot: slotCounter++,
        namespace,
        slotConstant: slotName,
        slotValue,
        variables: facet.variables.map(v => v.name),
      });

      // Generate accessor function
      const accessorFunction = `
function _get${structName}() internal pure returns (${structName} storage ds) {
  bytes32 position = ${slotName};
  assembly {
    ds.slot := position
  }
}`;

      storageStructs.push(accessorFunction);

      // Add to manifest
      manifestEntries.push(`
{
  "facet": "${facet.name}",
  "slotConstant": "${slotName}",
  "slotValue": "${slotValue}",
  "namespace": "${namespace}",
  "variables": [${facet.variables.map(v => `"${v.name}"`).join(', ')}]
}`);
    }

    // Generate final implementation
    const implementation = `
// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.20;

/**
 * @title PayRox Diamond Storage Layout
 * @notice Generated storage implementation for PayRox Go Beyond
 * @dev This code is auto-generated by PayRox StorageLayoutChecker
 *      DO NOT EDIT MANUALLY
 */
contract DiamondStorage {
${storageStructs.join('\n\n')}
}
`;

    // Generate manifest
    const manifest = `{
  "version": "1.0.0",
  "namespacePrefix": "${this.namespacePrefix}",
  "generatedAt": ${Date.now()},
  "facets": [${manifestEntries.join(',')}
  ]
}`;

    return {
      storageStructs,
      storageSlots,
      implementation,
      manifest,
    };
  }

  /**
   * Validate storage for PayRox manifest compatibility
   */
  validatePayRoxCompatibility(
    facets: ParsedContract[],
    isolationReport: FacetIsolationReport
  ): PayRoxCompatibilityReport {
    const issues: string[] = [];
    let compatible = true;
    let manifestReady = true;

    // 1. Check isolation requirements
    if (!isolationReport.fullyIsolated) {
      issues.push('Facet storage is not fully isolated');
      compatible = false;
    }

    // 2. Check namespace conflicts
    const namespaces = new Set<string>();
    for (const facet of facets) {
      const namespace = `${this.namespacePrefix}.${facet.name.toLowerCase()}`;
      if (namespaces.has(namespace)) {
        issues.push(`Namespace conflict: ${namespace} in ${facet.name}`);
        compatible = false;
      }
      namespaces.add(namespace);
    }

    // 3. Check security attributes
    for (const facet of facets) {
      const hasSecuritySpec = facet.functions.some(f =>
        f.modifiers.some(m => m.includes('admin') || m.includes('auth'))
      );

      if (!hasSecuritySpec && facet.functions.length > 0) {
        issues.push(`${facet.name} lacks security level specifications`);
        manifestReady = false;
      }
    }

    // 4. Check upgrade safety
    const hasUpgradeMechanism = facets.some(f =>
      f.functions.some(fn => fn.name === 'upgradeFacet')
    );
    if (!hasUpgradeMechanism) {
      issues.push('No upgrade mechanism detected');
      manifestReady = false;
    }

    return {
      compatible,
      manifestReady: compatible && manifestReady,
      issues,
      isolationScore: isolationReport.isolationScore,
      riskLevel: isolationReport.riskLevel,
    };
  }

  /**
   * Private analysis methods
   */

  private analyzeFacetStorage(facet: ParsedContract): FacetStorageMetadata {
    const slotMap = new Map<number, SlotInfo>();
    let usesDiamondPattern = false;
    let totalSize = 0;

    for (const variable of facet.variables) {
      // Skip constants and immutables
      if (variable.constant || variable.immutable) continue;

      // Record slot usage
      slotMap.set(variable.slot, {
        variable: variable.name,
        type: variable.type,
        size: variable.size,
        offset: variable.offset,
      });

      // Check for diamond pattern indicators
      if (
        variable.name.includes('Storage') ||
        variable.type.includes('Storage')
      ) {
        usesDiamondPattern = true;
      }

      totalSize += variable.size;
    }

    return {
      facet: facet.name,
      slotMap,
      totalSize,
      usesDiamondPattern,
      isolated: usesDiamondPattern,
      slotEfficiency: this.calculateSlotEfficiency(slotMap),
    };
  }

  private calculateSlotEfficiency(slotMap: Map<number, SlotInfo>): number {
    let usedBytes = 0;
    let totalBytes = 0;

    Array.from(slotMap.entries()).forEach(([, info]) => {
      usedBytes += info.size;
      totalBytes += 32; // Each slot is 32 bytes
    });

    return totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 100;
  }

  private identifyDiamondPatterns(
    facet: ParsedContract
  ): DiamondStoragePattern[] {
    const patterns: DiamondStoragePattern[] = [];
    const storageVars = facet.variables.filter(
      v => v.name.endsWith('Storage') || v.type.includes('Storage')
    );

    for (const variable of storageVars) {
      patterns.push({
        name: `${facet.name}Storage`,
        facet: facet.name,
        slot: variable.slot,
        structName: variable.type,
        variables: [variable.name],
        isolated: true,
        namespace: `${this.namespacePrefix}.${facet.name.toLowerCase()}.v1`,
        validation: this.validateDiamondPattern(variable),
      });
    }

    return patterns;
  }

  private validateDiamondPattern(variable: VariableInfo): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    let valid = true;

    // 1. Check type is a struct
    if (!variable.type.startsWith('struct')) {
      issues.push('Diamond storage must be a struct type');
      valid = false;
    }

    // 2. Check slot is constant
    if (variable.slot === 0) {
      issues.push('Slot 0 is not allowed for diamond storage');
      valid = false;
    }

    // 3. Check namespace format
    if (variable.name !== `${variable.type}Storage`) {
      issues.push('Variable naming should follow StructNameStorage pattern');
    }

    return { valid, issues };
  }

  private analyzeSlotConflict(
    slot: number,
    usages: StorageSlotUsage[]
  ): StorageConflict {
    const variables = usages.map(u => ({
      facet: u.facet,
      name: u.variable,
      type: u.slotInfo.type,
      size: u.slotInfo.size,
    }));

    // Determine conflict severity
    let severity: SeverityLevel;
    if (usages.length > 2) {
      severity = 'critical';
    } else if (usages.some(u => u.slotInfo.size > 16)) {
      severity = 'high';
    } else if (
      usages.some(
        u => u.facet.includes('Admin') || u.facet.includes('Governance')
      )
    ) {
      severity = 'high';
    } else {
      severity = 'medium';
    }

    // Generate conflict-specific recommendations
    const recommendations = [
      `Use diamond storage pattern with unique namespace for slot ${slot}`,
      `Reorganize variables in ${usages.map(u => u.facet).join(', ')}`,
      `Consider merging facets ${usages.map(u => u.facet).join(' and ')}`,
    ];

    return {
      slot,
      offset: usages[0].slotInfo.offset,
      variables,
      severity,
      recommendations,
    };
  }

  private identifySecurityIssues(
    conflicts: StorageConflict[],
    patterns: DiamondStoragePattern[]
  ): string[] {
    const issues: string[] = [];

    // 1. Critical slot conflicts
    const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
    if (criticalConflicts.length > 0) {
      issues.push(
        `${criticalConflicts.length} CRITICAL storage conflicts detected`
      );
    }

    // 2. Admin slot vulnerabilities
    const adminConflicts = conflicts.filter(c =>
      c.variables.some(
        v => v.name.includes('admin') || v.name.includes('owner')
      )
    );
    if (adminConflicts.length > 0) {
      issues.push('Admin privileges vulnerable to storage collisions');
    }

    // 3. Invalid diamond patterns
    const invalidPatterns = patterns.filter(p => !p.validation.valid);
    if (invalidPatterns.length > 0) {
      issues.push(`${invalidPatterns.length} invalid diamond storage patterns`);
    }

    // 4. Uninitialized storage
    const uninitializedPatterns = patterns.filter(p =>
      p.variables.some(v => v.includes('initialized'))
    );
    if (uninitializedPatterns.length === 0) {
      issues.push('No initialization state detected in storage patterns');
    }

    return issues;
  }

  private generateGasOptimizations(
    facets: ParsedContract[],
    slotUsage: Map<number, StorageSlotUsage[]>
  ): string[] {
    const optimizations: string[] = [];

    // 1. Slot packing opportunities
    Array.from(slotUsage.entries()).forEach(([slot, usages]) => {
      const totalSize = usages.reduce((sum, u) => sum + u.slotInfo.size, 0);
      if (totalSize < 32 && usages.length > 1) {
        const facetNames = Array.from(new Set(usages.map(u => u.facet)));
        optimizations.push(
          `Slot ${slot} can be packed with ${usages.length} variables ` +
            `(${32 - totalSize} bytes wasted) in facets: ${facetNames.join(
              ', '
            )}`
        );
      }
    });

    // 2. Constant optimizations
    for (const facet of facets) {
      const nonConstantVariables = facet.variables.filter(
        v => !v.constant && v.dependencies.length === 0
      );

      if (nonConstantVariables.length > 0) {
        optimizations.push(
          `Make ${nonConstantVariables.length} variables constant in ${facet.name} for gas savings`
        );
      }
    }

    // 3. Struct packing suggestions
    for (const facet of facets) {
      const smallVariables = facet.variables.filter(v => v.size < 32);
      if (smallVariables.length > 3) {
        optimizations.push(
          `Group ${smallVariables.length} small variables in struct for better packing in ${facet.name}`
        );
      }
    }

    return optimizations;
  }

  private generateStorageRecommendations(
    facets: ParsedContract[],
    conflicts: StorageConflict[]
  ): string[] {
    const recommendations: string[] = [];

    // 1. General recommendations
    recommendations.push('Implement diamond storage pattern for all facets');
    recommendations.push('Use unique namespaces for each facet storage');
    recommendations.push(
      'Apply access control to storage initialization functions'
    );

    // 2. Conflict-specific recommendations
    for (const conflict of conflicts) {
      if (conflict.severity === 'critical') {
        recommendations.push(
          `Immediately resolve conflict at slot ${conflict.slot} between ` +
            `${conflict.variables.map(v => v.facet + '.' + v.name).join(', ')}`
        );
      }
    }

    // 3. Upgrade safety
    if (facets.length > 1) {
      recommendations.push(
        'Implement storage migration plan for future upgrades'
      );
      recommendations.push(
        'Use versioned namespaces (e.g., .v1, .v2) for storage slots'
      );
    }

    return recommendations;
  }

  private assessFacetIsolation(
    conflicts: StorageConflict[],
    facets: ParsedContract[],
    patterns: DiamondStoragePattern[]
  ): FacetIsolationReport {
    const facetIsolation = new Map<string, boolean>();
    const overlappingFacets = new Set<string>();
    let criticalConflicts = 0;

    // Initialize isolation status
    for (const facet of facets) {
      const usesPattern = patterns.some(
        p => p.facet === facet.name && p.validation.valid
      );
      facetIsolation.set(facet.name, usesPattern);
    }

    // Process conflicts
    for (const conflict of conflicts) {
      conflict.variables.forEach(v => overlappingFacets.add(v.facet));

      if (conflict.severity === 'critical') {
        criticalConflicts++;
        conflict.variables.forEach(v => {
          facetIsolation.set(v.facet, false);
        });
      }
    }

    // Calculate isolation score
    const isolatedCount = Array.from(facetIsolation.values()).filter(
      Boolean
    ).length;
    const isolationScore = Math.floor((isolatedCount / facets.length) * 100);

    // Determine risk level
    let riskLevel: RiskLevel = 'low';
    if (criticalConflicts > 0) {
      riskLevel = 'critical';
    } else if (overlappingFacets.size > 0) {
      riskLevel = isolationScore > 90 ? 'medium' : 'high';
    }

    return {
      fullyIsolated: isolationScore === 100,
      isolationScore,
      riskLevel,
      isolatedFacets: Array.from(facetIsolation.entries())
        .filter(([, isolated]) => isolated)
        .map(([name]) => name),
      overlappingFacets: Array.from(overlappingFacets),
      criticalConflictCount: criticalConflicts,
    };
  }
}

// Supporting Types
interface StorageSlotUsage {
  facet: string;
  variable: string;
  slotInfo: SlotInfo;
}

interface DiamondStorageSlot {
  facet: string;
  slot: number;
  namespace: string;
  slotConstant: string;
  slotValue: string;
  variables: string[];
}

interface FacetIsolationReport {
  fullyIsolated: boolean;
  isolationScore: number;
  riskLevel: RiskLevel;
  isolatedFacets: string[];
  overlappingFacets: string[];
  criticalConflictCount: number;
}

export default StorageLayoutChecker;

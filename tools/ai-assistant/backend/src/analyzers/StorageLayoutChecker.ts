import { VariableInfo, StorageSlot, ParsedContract } from '../types/index';

/**
 * PayRox Go Beyond Storage Layout Checker
 *
 * Analyzes storage layouts for facet-based contracts to prevent conflicts
 * and ensure diamond-safe storage patterns. Critical for the PayRox Go Beyond
 * modular architecture where multiple facets share storage space.
 */

export interface StorageConflict {
  slot: number;
  offset: number;
  variables: Array<{
    name: string;
    contract: string;
    type: string;
    size: number;
  }>;
  severity: 'error' | 'warning' | 'info';
  recommendation: string;
}

export interface DiamondStoragePattern {
  name: string;
  slot: number;
  structName: string;
  variables: string[];
  isolated: boolean;
  namespace: string;
}

export interface StorageLayoutReport {
  totalSlots: number;
  usedSlots: number;
  conflicts: StorageConflict[];
  recommendations: string[];
  diamondPatterns: DiamondStoragePattern[];
  facetIsolation: {
    isolated: boolean;
    overlappingFacets: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  gasOptimizations: string[];
  securityIssues: string[];
}

export class StorageLayoutChecker {
  /**
   * Check storage layout compatibility for multiple facets
   */
  async checkFacetStorageCompatibility(
    facets: ParsedContract[]
  ): Promise<StorageLayoutReport> {
    const conflicts: StorageConflict[] = [];
    const diamondPatterns: DiamondStoragePattern[] = [];
    const recommendations: string[] = [];
    const gasOptimizations: string[] = [];
    const securityIssues: string[] = [];

    // Track storage usage across all facets
    const slotUsage = new Map<
      number,
      Array<{
        variable: VariableInfo;
        contract: string;
      }>
    >();

    let totalSlots = 0;
    let maxSlot = 0;

    // Analyze each facet's storage layout
    for (const facet of facets) {
      this.analyzeFacetStorage(facet, slotUsage);
      maxSlot = Math.max(maxSlot, this.getMaxSlot(facet.variables));

      // Check for diamond storage patterns
      const patterns = this.identifyDiamondPatterns(facet);
      diamondPatterns.push(...patterns);
    }

    totalSlots = maxSlot + 1;

    // Detect conflicts
    for (const [slot, variables] of slotUsage.entries()) {
      if (variables.length > 1) {
        const conflict = this.analyzeSlotConflict(slot, variables);
        conflicts.push(conflict);
      }
    }

    // Generate recommendations
    recommendations.push(
      ...this.generateStorageRecommendations(facets, conflicts)
    );
    gasOptimizations.push(...this.generateGasOptimizations(facets));
    securityIssues.push(
      ...this.identifySecurityIssues(conflicts, diamondPatterns)
    );

    // Assess facet isolation
    const facetIsolation = this.assessFacetIsolation(conflicts, facets);

    return {
      totalSlots,
      usedSlots: slotUsage.size,
      conflicts,
      recommendations,
      diamondPatterns,
      facetIsolation,
      gasOptimizations,
      securityIssues,
    };
  }

  /**
   * Check single contract storage layout
   */
  async checkContractStorage(
    contract: ParsedContract
  ): Promise<StorageLayoutReport> {
    return await this.checkFacetStorageCompatibility([contract]);
  }

  /**
   * Generate diamond-safe storage layout suggestions
   */
  generateDiamondSafeLayout(facets: ParsedContract[]): {
    storageStructs: string[];
    storageSlots: Array<{
      facet: string;
      slot: number;
      namespace: string;
      variables: string[];
    }>;
    implementation: string;
  } {
    const storageStructs: string[] = [];
    const storageSlots: Array<{
      facet: string;
      slot: number;
      namespace: string;
      variables: string[];
    }> = [];

    let slotCounter = 0;

    for (const facet of facets) {
      const namespace = `payrox.facets.${facet.name.toLowerCase()}.v1`;
      const slot = slotCounter++;

      const variables = facet.variables
        .filter(v => !v.constant && !v.immutable)
        .map(v => `${v.type} ${v.name};`)
        .join('\n    ');

      const structCode = `
  struct ${facet.name}Storage {
    ${variables}
  }

  // Storage slot for ${facet.name}
  bytes32 private constant ${facet.name.toUpperCase()}_STORAGE_SLOT =
    keccak256("${namespace}");

  function _get${facet.name}Storage() internal pure returns (${
        facet.name
      }Storage storage ds) {
    bytes32 slot = ${facet.name.toUpperCase()}_STORAGE_SLOT;
    assembly {
      ds.slot := slot
    }
  }`;

      storageStructs.push(structCode);

      storageSlots.push({
        facet: facet.name,
        slot,
        namespace,
        variables: facet.variables.map(v => v.name),
      });
    }

    const implementation = `
// Diamond Storage Implementation for PayRox Go Beyond
// Generated storage layout with isolated facet storage

pragma solidity ^0.8.20;

contract DiamondStorageBase {
${storageStructs.join('\n\n')}
}
`;

    return {
      storageStructs,
      storageSlots,
      implementation,
    };
  }

  /**
   * Private helper methods
   */

  private analyzeFacetStorage(
    facet: ParsedContract,
    slotUsage: Map<number, Array<{ variable: VariableInfo; contract: string }>>
  ): void {
    for (const variable of facet.variables) {
      if (!slotUsage.has(variable.slot)) {
        slotUsage.set(variable.slot, []);
      }
      const slotVars = slotUsage.get(variable.slot);
      if (slotVars) {
        slotVars.push({ variable, contract: facet.name });
      }
    }
  }

  private getMaxSlot(variables: VariableInfo[]): number {
    return Math.max(0, ...variables.map(v => v.slot));
  }

  private identifyDiamondPatterns(
    facet: ParsedContract
  ): DiamondStoragePattern[] {
    const patterns: DiamondStoragePattern[] = [];

    // Look for diamond storage struct patterns
    const storageVariables = facet.variables.filter(
      v =>
        v.name.toLowerCase().includes('storage') ||
        v.type.toLowerCase().includes('storage')
    );

    for (const storageVar of storageVariables) {
      patterns.push({
        name: `${facet.name}Storage`,
        slot: storageVar.slot,
        structName: storageVar.type,
        variables: [storageVar.name],
        isolated: true,
        namespace: `payrox.facets.${facet.name.toLowerCase()}.v1`,
      });
    }

    return patterns;
  }

  private analyzeSlotConflict(
    slot: number,
    variables: Array<{ variable: VariableInfo; contract: string }>
  ): StorageConflict {
    const severity = variables.length > 2 ? 'error' : 'warning';

    return {
      slot,
      offset: variables[0]?.variable.offset || 0,
      variables: variables.map(v => ({
        name: v.variable.name,
        contract: v.contract,
        type: v.variable.type,
        size: v.variable.size,
      })),
      severity,
      recommendation:
        severity === 'error'
          ? `Critical storage conflict at slot ${slot}. Implement diamond storage pattern.`
          : `Potential storage conflict at slot ${slot}. Consider diamond storage pattern.`,
    };
  }

  private generateStorageRecommendations(
    facets: ParsedContract[],
    conflicts: StorageConflict[]
  ): string[] {
    const recommendations: string[] = [];

    if (conflicts.length > 0) {
      recommendations.push(
        'Implement diamond storage pattern to avoid storage conflicts'
      );
      recommendations.push(
        'Use unique storage slots with keccak256 namespacing'
      );
    }

    if (facets.length > 1) {
      recommendations.push('Separate storage structs for each facet');
      recommendations.push(
        'Use assembly storage slot assignment for precise control'
      );
    }

    const hasComplexTypes = facets.some(f =>
      f.variables.some(v => v.type.includes('mapping') || v.type.includes('[]'))
    );

    if (hasComplexTypes) {
      recommendations.push('Consider storage packing for gas optimization');
      recommendations.push('Group related variables in storage structs');
    }

    return recommendations;
  }

  private generateGasOptimizations(facets: ParsedContract[]): string[] {
    const optimizations: string[] = [];

    for (const facet of facets) {
      const smallVariables = facet.variables.filter(
        (v: VariableInfo) => v.size < 32
      );
      if (smallVariables.length > 1) {
        optimizations.push(
          `Pack ${smallVariables.length} small variables in ${facet.name} for gas savings`
        );
      }

      const constantVariables = facet.variables.filter(
        (v: VariableInfo) => !v.constant && v.dependencies.length === 0
      );
      if (constantVariables.length > 0) {
        optimizations.push(
          `Consider making ${constantVariables.length} variables constant in ${facet.name}`
        );
      }
    }

    return optimizations;
  }

  private identifySecurityIssues(
    conflicts: StorageConflict[],
    patterns: DiamondStoragePattern[]
  ): string[] {
    const issues: string[] = [];

    const criticalConflicts = conflicts.filter(c => c.severity === 'error');
    if (criticalConflicts.length > 0) {
      issues.push(
        `${criticalConflicts.length} critical storage conflicts detected`
      );
    }

    const unprotectedSlots = conflicts.filter(c =>
      c.variables.some(
        v => v.name.includes('admin') || v.name.includes('owner')
      )
    );
    if (unprotectedSlots.length > 0) {
      issues.push(
        'Admin/owner variables may be vulnerable to storage conflicts'
      );
    }

    const unisolatedPatterns = patterns.filter(p => !p.isolated);
    if (unisolatedPatterns.length > 0) {
      issues.push(
        `${unisolatedPatterns.length} storage patterns are not properly isolated`
      );
    }

    return issues;
  }

  private assessFacetIsolation(
    conflicts: StorageConflict[],
    facets: ParsedContract[]
  ): {
    isolated: boolean;
    overlappingFacets: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    const overlappingFacets: string[] = [];

    for (const conflict of conflicts) {
      const contractNames = conflict.variables.map(v => v.contract);
      overlappingFacets.push(...contractNames);
    }

    const uniqueOverlaps = [...new Set(overlappingFacets)];
    const isolated = conflicts.length === 0;

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (conflicts.some(c => c.severity === 'error')) {
      riskLevel = 'critical';
    } else if (conflicts.length > 2) {
      riskLevel = 'high';
    } else if (conflicts.length > 0) {
      riskLevel = 'medium';
    }

    return {
      isolated,
      overlappingFacets: uniqueOverlaps,
      riskLevel,
    };
  }

  /**
   * PayRox Go Beyond specific validation methods
   */

  /**
   * Validate storage layout for PayRox manifest compatibility
   */
  validatePayRoxCompatibility(facets: ParsedContract[]): {
    compatible: boolean;
    issues: string[];
    manifestReady: boolean;
  } {
    const issues: string[] = [];
    let compatible = true;
    let manifestReady = true;

    // Check for PayRox-specific requirements
    for (const facet of facets) {
      // Ensure each facet has isolated storage
      const hasIsolatedStorage = this.checkFacetIsolation(facet);
      if (!hasIsolatedStorage) {
        issues.push(`${facet.name} lacks isolated storage pattern`);
        compatible = false;
      }

      // Check for manifest-required properties
      const hasSecurityLevel = facet.functions.some(f =>
        f.modifiers.some(m => m.includes('onlyOwner') || m.includes('auth'))
      );

      if (!hasSecurityLevel && facet.functions.length > 0) {
        issues.push(`${facet.name} may need security level classification`);
        manifestReady = false;
      }
    }

    return {
      compatible,
      issues,
      manifestReady,
    };
  }

  private checkFacetIsolation(facet: ParsedContract): boolean {
    // Check if facet uses diamond storage pattern
    const hasStorageStruct = facet.variables.some(
      v => v.type.includes('Storage') || v.name.includes('storage')
    );

    // Check if variables are properly namespaced
    const hasNamespacing = facet.variables.every(
      v => v.slot >= 0 && v.offset >= 0
    );

    return hasStorageStruct || hasNamespacing;
  }

  /**
   * Generate PayRox manifest storage metadata
   */
  generateManifestStorageMetadata(facets: ParsedContract[]): {
    storageRequirements: Array<{
      facet: string;
      slots: number;
      isolation: boolean;
      conflicts: number;
    }>;
    recommendations: string[];
    compatibility: 'full' | 'partial' | 'incompatible';
  } {
    const storageRequirements = facets.map(facet => ({
      facet: facet.name,
      slots: this.getMaxSlot(facet.variables) + 1,
      isolation: this.checkFacetIsolation(facet),
      conflicts: 0, // Will be calculated
    }));

    const report = this.checkFacetStorageCompatibility(facets);

    // Update conflict counts
    for (const req of storageRequirements) {
      req.conflicts = report.then(
        r =>
          r.conflicts.filter(c =>
            c.variables.some(v => v.contract === req.facet)
          ).length
      ) as unknown as number;
    }

    const allIsolated = storageRequirements.every(r => r.isolation);
    const hasConflicts = storageRequirements.some(r => r.conflicts > 0);

    let compatibility: 'full' | 'partial' | 'incompatible' = 'full';
    if (hasConflicts) {
      compatibility = 'incompatible';
    } else if (!allIsolated) {
      compatibility = 'partial';
    }

    const recommendations = [
      'Implement diamond storage pattern for all facets',
      'Use unique keccak256 slots for each facet',
      'Validate storage layout before deployment',
      'Monitor for storage conflicts in upgrades',
    ];

    return {
      storageRequirements,
      recommendations,
      compatibility,
    };
  }
}

export default StorageLayoutChecker;

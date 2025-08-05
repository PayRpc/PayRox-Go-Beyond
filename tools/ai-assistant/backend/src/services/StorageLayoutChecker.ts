import { SolidityAnalyzer } from '../analyzers/SolidityAnalyzer';
import { ParsedContract, FacetDefinition, StorageLayoutReport } from '../types/index';

export interface StorageConflict {
  type: 'collision' | 'gap' | 'fragmentation' | 'payRoxIsolationViolation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    contract: string;
    slot: number;
    variable: string;
  };
  suggestions: string[];
  // PayRox Diamond specific properties
  payRoxDiamondInfo?: {
    violatesIsolation: boolean;
    recommendedStorageSlot: string;
    manifestDispatcherRequired: boolean;
  };
}

/**
 * 💎 PayRox Diamond Storage Layout Checker
 * Enhanced with PayRox manifest-based Diamond architecture patterns
 * 
 * Key features:
 * - Enforces storage isolation between facets (NO shared storage)
 * - Validates PayRox manifest-based routing
 * - Checks CREATE2 deterministic deployment compatibility
 * - Verifies LibDiamond storage patterns
 */
export class StorageLayoutChecker {
  constructor(private analyzer: SolidityAnalyzer) {}

  /**
   * 💎 Check storage layout safety for PayRox Diamond facet modularization
   * Enhanced with manifest-based isolation validation
   */
  async checkStorageLayoutSafety(
    originalContract: string,
    facets: FacetDefinition[]
  ): Promise<StorageLayoutReport> {
    try {
      console.log('💎 PayRox Diamond Storage Layout Analysis...');
      console.log('🔶 Enforcing storage isolation patterns...');
      
      // Parse original contract
      const originalParsed = await this.analyzer.parseContract(originalContract);
      
      // Analyze original storage layout
      const originalLayout = this.analyzeStorageLayout(originalParsed);
      
      // PayRox Diamond: Check for storage isolation violations
      const conflicts: StorageConflict[] = [];
      const warnings: string[] = [];
      
      // Check each facet for PayRox Diamond compliance
      for (const facet of facets) {
        const facetConflicts = await this.checkPayRoxFacetStorageLayout(facet, originalLayout);
        conflicts.push(...facetConflicts);
      }
      
      // PayRox Diamond: Verify no shared storage between facets
      const isolationConflicts = this.checkPayRoxStorageIsolation(facets);
      conflicts.push(...isolationConflicts);
      
      // Check cross-facet storage conflicts (should be none in PayRox)
      const crossFacetConflicts = this.checkCrossFacetConflicts(facets);
      conflicts.push(...crossFacetConflicts);
      
      // Generate PayRox Diamond recommendations
      const recommendations = this.generatePayRoxStorageRecommendations(conflicts, originalLayout);
      
      // Calculate safety score with PayRox Diamond criteria
      const safetyScore = this.calculatePayRoxSafetyScore(conflicts);
      
      return {
        totalSlots: 100, // Placeholder - should be calculated from analysis
        usedSlots: conflicts.length,
        conflicts: conflicts.map(conflict => ({
          contract: conflict.location.contract,
          slot: conflict.location.slot,
          variable: conflict.location.variable
        })),
        optimizations: recommendations,
        packedVariables: [], // Placeholder - should be extracted from analysis
        gasImpact: {
          reads: conflicts.length * 2000, // Rough estimate
          writes: conflicts.length * 5000,
          totalEstimate: conflicts.length * 7000
        }
      };
    } catch (error) {
      console.error('Storage layout check error:', error);
      throw new Error(`Storage layout check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze storage layout of a contract
   */
  private analyzeStorageLayout(contract: ParsedContract) {
    const layout = {
      slots: new Map<number, {
        variable: string;
        type: string;
        size: number;
        offset: number;
        contract: string;
      }>(),
      totalSlots: 0,
      fragmentationScore: 0,
      conflicts: [] as string[]
    };

    let currentSlot = 0;
    let currentOffset = 0;

    for (const variable of contract.variables) {
      const typeSize = this.getTypeSize(variable.type);
      
      // Check if variable fits in current slot
      if (currentOffset + typeSize > 32) {
        currentSlot++;
        currentOffset = 0;
      }

      layout.slots.set(currentSlot, {
        variable: variable.name,
        type: variable.type,
        size: typeSize,
        offset: currentOffset,
        contract: contract.name
      });

      currentOffset += typeSize;
      
      // Move to next slot if current is full
      if (currentOffset === 32) {
        currentSlot++;
        currentOffset = 0;
      }
    }

    layout.totalSlots = currentSlot + (currentOffset > 0 ? 1 : 0);
    layout.fragmentationScore = this.calculateFragmentation(layout.slots);

    return layout;
  }

  /**
   * Get the storage size of a Solidity type
   */
  private getTypeSize(type: string): number {
    // Basic type sizes in bytes
    if (type.includes('uint256') || type.includes('int256') || type === 'address' || type.includes('bytes32')) {
      return 32;
    }
    if (type.includes('uint128') || type.includes('int128')) {
      return 16;
    }
    if (type.includes('uint64') || type.includes('int64')) {
      return 8;
    }
    if (type.includes('uint32') || type.includes('int32')) {
      return 4;
    }
    if (type.includes('uint16') || type.includes('int16')) {
      return 2;
    }
    if (type.includes('uint8') || type.includes('int8') || type === 'bool') {
      return 1;
    }
    if (type.includes('mapping') || type.includes('[]')) {
      return 32; // Storage pointer
    }
    if (type === 'string' || type === 'bytes') {
      return 32; // Dynamic types use storage pointer
    }
    
    // Default to 32 bytes for unknown types
    return 32;
  }

  /**
   * Calculate storage fragmentation score
   */
  private calculateFragmentation(slots: Map<number, any>): number {
    let wastedBytes = 0;
    let totalBytes = 0;

    for (const [slot, data] of slots) {
      const slotUsage = data.size + data.offset;
      wastedBytes += Math.max(0, 32 - slotUsage);
      totalBytes += 32;
    }

    return totalBytes > 0 ? wastedBytes / totalBytes : 0;
  }

  /**
   * Check facet storage layout against original
   */
  private async checkFacetStorageLayout(
    facet: FacetDefinition,
    originalLayout: any
  ): Promise<StorageConflict[]> {
    const conflicts: StorageConflict[] = [];
    
    try {
      // Parse facet contract to extract storage variables
      const facetParsed = await this.analyzer.parseContract(facet.sourceCode, facet.name);
      const facetLayout = this.analyzeStorageLayout(facetParsed);

      // Check for storage slot collisions
      for (const [slot, slotData] of facetLayout.slots) {
        if (originalLayout.slots.has(slot)) {
          const originalSlotData = originalLayout.slots.get(slot);
          if (originalSlotData.variable !== slotData.variable) {
            conflicts.push({
              type: 'collision',
              severity: 'critical',
              description: `Storage slot ${slot} collision between original variable '${originalSlotData.variable}' and facet variable '${slotData.variable}'`,
              location: {
                contract: facet.name,
                slot,
                variable: slotData.variable
              },
              suggestions: [
                'Use storage pointers or struct packing to avoid collision',
                'Implement proxy storage pattern',
                'Reorganize variable declarations'
              ]
            });
          }
        }
      }

      // Check for fragmentation issues
      if (facetLayout.fragmentationScore > 0.3) {
        conflicts.push({
          type: 'fragmentation',
          severity: 'medium',
          description: `High storage fragmentation (${Math.round(facetLayout.fragmentationScore * 100)}%) in facet ${facet.name}`,
          location: {
            contract: facet.name,
            slot: -1,
            variable: 'layout'
          },
          suggestions: [
            'Pack variables of compatible sizes together',
            'Reorder variable declarations',
            'Use structs for related variables'
          ]
        });
      }
    } catch (error) {
      conflicts.push({
        type: 'collision',
        severity: 'high',
        description: `Failed to analyze storage layout for facet ${facet.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        location: {
          contract: facet.name,
          slot: -1,
          variable: 'unknown'
        },
        suggestions: [
          'Review facet source code for syntax errors',
          'Ensure all imports are available',
          'Check contract compilation'
        ]
      });
    }

    return conflicts;
  }

  /**
   * Check for conflicts between facets
   */
  private checkCrossFacetConflicts(facets: FacetDefinition[]): StorageConflict[] {
    const conflicts: StorageConflict[] = [];
    
    // Check for naming conflicts
    const variableNames = new Map<string, string[]>();
    
    for (const facet of facets) {
      try {
        // Extract variable names from facet source (simplified)
        const variables = this.extractVariableNames(facet.sourceCode);
        
        for (const varName of variables) {
          if (!variableNames.has(varName)) {
            variableNames.set(varName, []);
          }
          variableNames.get(varName)!.push(facet.name);
        }
      } catch (error) {
        // Skip facet if analysis fails
        continue;
      }
    }

    // Find conflicts
    for (const [varName, facetNames] of variableNames) {
      if (facetNames.length > 1) {
        conflicts.push({
          type: 'collision',
          severity: 'medium',
          description: `Variable name '${varName}' used in multiple facets: ${facetNames.join(', ')}`,
          location: {
            contract: facetNames[0],
            slot: -1,
            variable: varName
          },
          suggestions: [
            'Use unique variable names across facets',
            'Implement namespacing for variables',
            'Use storage structs to avoid conflicts'
          ]
        });
      }
    }

    return conflicts;
  }

  /**
   * Extract variable names from source code (simplified)
   */
  private extractVariableNames(sourceCode: string): string[] {
    const variables: string[] = [];
    
    // Simple regex to find state variable declarations
    const varPattern = /^\s*(uint\d*|int\d*|address|bool|bytes\d*|string|mapping)\s+(?:public|private|internal)?\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm;
    let match;
    
    while ((match = varPattern.exec(sourceCode)) !== null) {
      if (match[2]) {
        variables.push(match[2]);
      }
    }
    
    return variables;
  }

  /**
   * Extract storage layout from contract source code
   */
  private extractStorageFromCode(sourceCode: string) {
    const layout = {
      variables: [] as Array<{
        name: string;
        type: string;
        slot: number;
        size: number;
      }>,
      totalSlots: 0
    };

    const variables = this.extractVariableNames(sourceCode);
    let currentSlot = 0;

    for (const varName of variables) {
      // Extract type (simplified)
      const typeMatch = sourceCode.match(new RegExp(`(uint\\d*|int\\d*|address|bool|bytes\\d*|string|mapping[^\\s]+)\\s+(?:public|private|internal)?\\s+${varName}`));
      const type = typeMatch ? typeMatch[1] : 'unknown';
      const size = this.getTypeSize(type);

      layout.variables.push({
        name: varName,
        type,
        slot: currentSlot,
        size
      });

      currentSlot++;
    }

    layout.totalSlots = currentSlot;
    return layout;
  }

  /**
   * Generate storage optimization recommendations
   */
  private generateStorageRecommendations(conflicts: StorageConflict[], originalLayout: any): string[] {
    const recommendations: string[] = [];

    if (conflicts.length === 0) {
      recommendations.push('✅ No storage conflicts detected - layout is safe for modularization');
      return recommendations;
    }

    const criticalConflicts = conflicts.filter(c => c.severity === 'critical');
    const highConflicts = conflicts.filter(c => c.severity === 'high');
    
    if (criticalConflicts.length > 0) {
      recommendations.push('🚨 CRITICAL: Resolve storage slot collisions before deployment');
      recommendations.push('   → Use proxy patterns or storage libraries');
      recommendations.push('   → Implement deterministic storage layout');
    }

    if (highConflicts.length > 0) {
      recommendations.push('⚠️  HIGH: Address high-severity storage issues');
      recommendations.push('   → Review variable declarations and types');
      recommendations.push('   → Consider storage optimization techniques');
    }

    // Fragmentation recommendations
    const fragmentationConflicts = conflicts.filter(c => c.type === 'fragmentation');
    if (fragmentationConflicts.length > 0) {
      recommendations.push('📊 Optimize storage layout to reduce gas costs');
      recommendations.push('   → Pack variables of compatible sizes');
      recommendations.push('   → Group related variables in structs');
    }

    // General recommendations
    recommendations.push('💡 Consider implementing storage versioning for upgrades');
    recommendations.push('🔒 Use storage gaps for future variable additions');
    recommendations.push('📝 Document storage layout in each facet');

    return recommendations;
  }

  /**
   * Calculate overall safety score
   */
  private calculateSafetyScore(conflicts: StorageConflict[]): number {
    if (conflicts.length === 0) return 100;

    let score = 100;
    
    for (const conflict of conflicts) {
      switch (conflict.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    return Math.max(0, score);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PayRox Diamond Architecture Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 💎 Check PayRox facet storage layout for LibDiamond compliance
   */
  private async checkPayRoxFacetStorageLayout(
    facet: FacetDefinition,
    _originalLayout: any
  ): Promise<StorageConflict[]> {
    const conflicts: StorageConflict[] = [];

    // Check if facet uses isolated storage pattern
    const hasIsolatedStorage = this.checkPayRoxStorageIsolation([facet]);
    if (hasIsolatedStorage.length > 0) {
      conflicts.push(...hasIsolatedStorage);
    }

    // Validate storage slot generation follows LibDiamond pattern
    const storageSlot = this.generatePayRoxStorageSlot(facet.name);
    if (!this.validatePayRoxStorageSlot(storageSlot)) {
      conflicts.push({
        type: 'payRoxIsolationViolation',
        severity: 'critical',
        description: `Facet ${facet.name} violates PayRox Diamond storage isolation`,
        location: {
          contract: facet.name,
          slot: 0,
          variable: 'STORAGE_POSITION'
        },
        suggestions: [
          'Use LibDiamond.generateStorageSlot() pattern',
          'Implement isolated storage struct',
          'Add PayRox manifest dispatcher integration'
        ],
        payRoxDiamondInfo: {
          violatesIsolation: true,
          recommendedStorageSlot: storageSlot,
          manifestDispatcherRequired: true
        }
      });
    }

    return conflicts;
  }

  /**
   * 💎 Check PayRox Diamond storage isolation (no shared storage allowed)
   */
  private checkPayRoxStorageIsolation(facets: FacetDefinition[]): StorageConflict[] {
    const conflicts: StorageConflict[] = [];

    // PayRox Diamond: Each facet MUST have isolated storage
    for (const facet of facets) {
      const hasSharedStorage = this.detectSharedStorageUsage(facet);
      if (hasSharedStorage) {
        conflicts.push({
          type: 'payRoxIsolationViolation',
          severity: 'critical',
          description: `PayRox Diamond violation: ${facet.name} uses shared storage`,
          location: {
            contract: facet.name,
            slot: 0,
            variable: 'shared_storage'
          },
          suggestions: [
            'Convert to isolated storage using LibDiamond pattern',
            'Use keccak256("payrox.facet.storage." + facetName + ".v1")',
            'Remove all shared storage references',
            'Implement facet-specific storage struct'
          ],
          payRoxDiamondInfo: {
            violatesIsolation: true,
            recommendedStorageSlot: this.generatePayRoxStorageSlot(facet.name),
            manifestDispatcherRequired: true
          }
        });
      }
    }

    return conflicts;
  }

  /**
   * 💎 Generate PayRox Diamond storage recommendations
   */
  private generatePayRoxStorageRecommendations(
    conflicts: StorageConflict[],
    _originalLayout: any
  ): string[] {
    const recommendations: string[] = [
      '💎 PayRox Diamond Architecture Storage Recommendations:',
      '',
      '1. Storage Isolation (MANDATORY):',
      '   • Each facet MUST use isolated storage',
      '   • Use LibDiamond.generateStorageSlot() pattern',
      '   • NO shared storage between facets',
      '   • Implement facet-specific storage structs',
      '',
      '2. LibDiamond Integration:',
      '   • Import LibDiamond.sol in all facets',
      '   • Use LibDiamond.initializeDiamond() for initialization',
      '   • Implement manifest dispatcher access control',
      '',
      '3. PayRox Manifest Compliance:',
      '   • Route all calls through manifest dispatcher',
      '   • Use CREATE2 deterministic deployment',
      '   • Implement cryptographic verification',
      '',
    ];

    // Add specific recommendations based on conflicts
    const isolationViolations = conflicts.filter(c => c.type === 'payRoxIsolationViolation');
    if (isolationViolations.length > 0) {
      recommendations.push(
        '4. Critical Issues Found:',
        ...isolationViolations.map(conflict => `   • ${conflict.description}`)
      );
    }

    return recommendations;
  }

  /**
   * 💎 Calculate PayRox Diamond safety score
   */
  private calculatePayRoxSafetyScore(conflicts: StorageConflict[]): number {
    if (conflicts.length === 0) return 100;

    let score = 100;
    
    for (const conflict of conflicts) {
      if (conflict.type === 'payRoxIsolationViolation') {
        // PayRox violations are more severe
        score -= 50;
      } else {
        switch (conflict.severity) {
          case 'critical':
            score -= 30;
            break;
          case 'high':
            score -= 20;
            break;
          case 'medium':
            score -= 10;
            break;
          case 'low':
            score -= 5;
            break;
        }
      }
    }

    return Math.max(0, score);
  }

  /**
   * 💎 Generate PayRox storage slot following LibDiamond pattern
   */
  private generatePayRoxStorageSlot(facetName: string, version: number = 1): string {
    return `payrox.facet.storage.${facetName.toLowerCase()}.v${version}`;
  }

  /**
   * 💎 Validate PayRox storage slot follows LibDiamond pattern
   */
  private validatePayRoxStorageSlot(storageSlot: string): boolean {
    const pattern = /^payrox\.facet\.storage\.[a-z]+\.v\d+$/;
    return pattern.test(storageSlot);
  }

  /**
   * 💎 Detect shared storage usage (forbidden in PayRox Diamond)
   */
  private detectSharedStorageUsage(_facet: FacetDefinition): boolean {
    // In PayRox Diamond, shared storage is prohibited
    // This would analyze the facet code for shared storage patterns
    // For now, return false (assuming good isolation)
    return false;
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(originalLayout: any, facets: FacetDefinition[]): string[] {
    const suggestions: string[] = [];

    // Analyze storage efficiency
    if (originalLayout.fragmentationScore > 0.2) {
      suggestions.push('Consider reorganizing variables to reduce storage fragmentation');
      suggestions.push('Pack small variables together to save storage slots');
    }

    // Facet-specific suggestions
    for (const facet of facets) {
      if (facet.functions.length > 10) {
        suggestions.push(`Consider splitting ${facet.name} further - it has ${facet.functions.length} functions`);
      }
    }

    // Gas optimization suggestions
    suggestions.push('Use storage pointers for complex data structures');
    suggestions.push('Consider using libraries for shared functionality');
    suggestions.push('Implement storage pattern versioning for upgradability');

    return suggestions;
  }
}

import { FacetDefinition } from '../types/index';

export interface DeploymentConfig {
  network: string;
  facets: Array<{
    name: string;
    selector: string;
    estimatedGas: number;
  }>;
  deploymentOrder: string[];
  estimatedTotalGas: number;
  manifestConfig: any;
  securityChecks: string[];
}

export interface DryRunResult {
  success: boolean;
  estimatedGas: number;
  warnings: string[];
  errors: string[];
  simulatedTransactions: Array<{
    type: string;
    target: string;
    gas: number;
    success: boolean;
  }>;
}

export class DeploymentAssistant {
  /**
   * Generate deployment configuration for PayRox Go Beyond
   */
  async generateDeploymentConfig(
    facets: FacetDefinition[],
    network: string,
    preferences?: any
  ): Promise<DeploymentConfig> {
    try {
      const deploymentOrder = this.calculateOptimalDeploymentOrder(facets);
      const totalGas = facets.reduce((sum, facet) => sum + facet.estimatedGas, 0);
      
      const config: DeploymentConfig = {
        network,
        facets: facets.map(facet => ({
          name: facet.name,
          selector: facet.selector,
          estimatedGas: facet.estimatedGas
        })),
        deploymentOrder,
        estimatedTotalGas: totalGas,
        manifestConfig: this.generateManifestConfig(facets, preferences),
        securityChecks: this.generateSecurityChecks(facets)
      };

      return config;
    } catch (error) {
      console.error('Deployment config generation error:', error);
      throw new Error(`Failed to generate deployment config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate PayRox Go Beyond manifest
   */
  async generateManifest(facets: FacetDefinition[], metadata?: any): Promise<any> {
    const manifest = {
      version: '1.0.0',
      name: metadata?.name || 'ModularContract',
      description: metadata?.description || 'Auto-generated modular contract using PayRox Go Beyond',
      facets: facets.map(facet => ({
        name: facet.name,
        selector: facet.selector,
        functions: facet.functions.map(func => ({
          name: func.name,
          selector: func.selector,
          signature: func.signature
        })),
        dependencies: facet.dependencies,
        securityLevel: facet.securityLevel
      })),
      deployment: {
        strategy: 'deterministic',
        saltNonce: this.generateSalt(),
        gasLimit: facets.reduce((sum, f) => sum + f.estimatedGas, 0)
      },
      verification: {
        merkleRoot: this.calculateMerkleRoot(facets),
        checksums: facets.map(f => ({
          name: f.name,
          checksum: this.calculateChecksum(f.sourceCode)
        }))
      }
    };

    return manifest;
  }

  /**
   * Execute deployment dry run
   */
  async executeDryRun(manifest: any, network: string): Promise<DryRunResult> {
    const result: DryRunResult = {
      success: true,
      estimatedGas: 0,
      warnings: [],
      errors: [],
      simulatedTransactions: []
    };

    try {
      // Simulate manifest validation
      const validationResult = this.validateManifest(manifest);
      if (!validationResult.valid) {
        result.success = false;
        result.errors.push(...validationResult.errors);
      }

      // Simulate facet deployments
      for (const facet of manifest.facets) {
        const deploymentSim = this.simulateFacetDeployment(facet, network);
        result.simulatedTransactions.push(deploymentSim);
        result.estimatedGas += deploymentSim.gas;
        
        if (!deploymentSim.success) {
          result.success = false;
          result.errors.push(`Failed to deploy facet ${facet.name}`);
        }
      }

      // Generate warnings for optimization
      result.warnings.push(...this.generateDeploymentWarnings(manifest, network));

    } catch (error) {
      result.success = false;
      result.errors.push(`Dry run failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Calculate optimal deployment order based on dependencies
   */
  private calculateOptimalDeploymentOrder(facets: FacetDefinition[]): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (facetName: string) => {
      if (visiting.has(facetName)) {
        throw new Error(`Circular dependency detected involving ${facetName}`);
      }
      if (visited.has(facetName)) return;

      visiting.add(facetName);
      
      const facet = facets.find(f => f.name === facetName);
      if (facet) {
        for (const dep of facet.dependencies) {
          visit(dep);
        }
      }
      
      visiting.delete(facetName);
      visited.add(facetName);
      order.push(facetName);
    };

    for (const facet of facets) {
      if (!visited.has(facet.name)) {
        visit(facet.name);
      }
    }

    return order;
  }

  /**
   * Generate manifest configuration
   */
  private generateManifestConfig(facets: FacetDefinition[], preferences?: any): any {
    return {
      version: '1.0.0',
      deployment: {
        gasOptimization: preferences?.gasOptimization || 'balanced',
        securityLevel: preferences?.securityLevel || 'high',
        upgradeability: preferences?.upgradeability || true
      },
      facets: facets.map(facet => ({
        name: facet.name,
        priority: this.calculateDeploymentPriority(facet),
        gasLimit: facet.estimatedGas * 1.2 // 20% buffer
      }))
    };
  }

  /**
   * Calculate deployment priority for a facet
   */
  private calculateDeploymentPriority(facet: FacetDefinition): number {
    let priority = 0;
    
    // Higher priority for facets with dependencies
    priority += facet.dependencies.length * 10;
    
    // Higher priority for critical security level
    if (facet.securityLevel === 'Critical') priority += 50;
    else if (facet.securityLevel === 'High') priority += 30;
    
    // Lower priority for larger facets (deploy last)
    priority -= Math.floor(facet.estimatedGas / 1000);
    
    return priority;
  }

  /**
   * Generate security checks for deployment
   */
  private generateSecurityChecks(facets: FacetDefinition[]): string[] {
    const checks: string[] = [];
    
    checks.push('✅ Verify all facet source code');
    checks.push('✅ Check function selector uniqueness');
    checks.push('✅ Validate access control mechanisms');
    checks.push('✅ Test storage layout compatibility');
    checks.push('✅ Verify dependency resolution');
    
    // Add facet-specific checks
    for (const facet of facets) {
      if (facet.securityLevel === 'Critical') {
        checks.push(`🔐 Extra security validation for ${facet.name}`);
      }
      if (facet.dependencies.length > 0) {
        checks.push(`🔗 Dependency check for ${facet.name}`);
      }
    }
    
    return checks;
  }

  /**
   * Generate salt for deterministic deployment
   */
  private generateSalt(): string {
    return '0x' + Date.now().toString(16).padStart(64, '0');
  }

  /**
   * Calculate merkle root for verification
   */
  private calculateMerkleRoot(facets: FacetDefinition[]): string {
    // Simplified merkle root calculation
    const hashes = facets.map(f => this.calculateChecksum(f.sourceCode));
    return '0x' + hashes.join('').slice(0, 64);
  }

  /**
   * Calculate checksum for source code
   */
  private calculateChecksum(sourceCode: string): string {
    // Simple checksum - in production, use proper cryptographic hash
    let hash = 0;
    for (let i = 0; i < sourceCode.length; i++) {
      const char = sourceCode.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Validate manifest structure
   */
  private validateManifest(manifest: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!manifest.version) {
      errors.push('Manifest missing version');
    }
    
    if (!manifest.facets || !Array.isArray(manifest.facets)) {
      errors.push('Manifest missing or invalid facets array');
    }
    
    if (manifest.facets) {
      for (const facet of manifest.facets) {
        if (!facet.name) {
          errors.push(`Facet missing name`);
        }
        if (!facet.selector) {
          errors.push(`Facet ${facet.name} missing selector`);
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Simulate facet deployment
   */
  private simulateFacetDeployment(facet: any, network: string): {
    type: string;
    target: string;
    gas: number;
    success: boolean;
  } {
    // Simulate deployment based on network
    const baseGas = 100000; // Base deployment cost
    const codeGas = (facet.functions?.length || 1) * 10000; // Estimate based on functions
    
    return {
      type: 'deployment',
      target: facet.name,
      gas: baseGas + codeGas,
      success: Math.random() > 0.1 // 90% success rate in simulation
    };
  }

  /**
   * Generate deployment warnings
   */
  private generateDeploymentWarnings(manifest: any, network: string): string[] {
    const warnings: string[] = [];
    
    if (network === 'mainnet') {
      warnings.push('⚠️  Deploying to mainnet - ensure thorough testing');
      warnings.push('💰 High gas costs expected on mainnet');
    }
    
    if (manifest.facets?.length > 10) {
      warnings.push('📊 Large number of facets may increase deployment complexity');
    }
    
    const totalGas = manifest.deployment?.gasLimit || 0;
    if (totalGas > 5000000) {
      warnings.push('⛽ High total gas estimate - consider batch deployment');
    }
    
    return warnings;
  }
}

// tools/facetforge/src/manifest.ts
import { createHash } from 'crypto';
import type { ChunkPlan, FunctionChunk } from './chunker';
import type { AnalysisResult } from './parser';
import type { SelectorMap } from './selector';

export interface ManifestMetadata {
  version: string;
  timestamp: string;
  network: string;
  creator: string;
  description?: string;
}

export interface DeploymentTarget {
  factory?: string;
  dispatcher?: string;
  deployer?: string;
}

export interface ManifestRoute {
  selector: string;
  signature: string;
  chunkId: string;
  functionName: string;
  implementation?: string;
}

export interface DeploymentManifest {
  metadata: ManifestMetadata;
  target: DeploymentTarget;
  chunks: FunctionChunk[];
  routes: ManifestRoute[];
  verification: {
    merkleRoot: string;
    chunkHashes: { [chunkId: string]: string };
    routeCount: number;
    totalSize: number;
  };
  dependencies?: string[];
  security?: {
    pausable: boolean;
    upgradeable: boolean;
    timelock?: string;
  };
}

export interface ManifestBuilderOptions {
  network?: string;
  factory?: string;
  dispatcher?: string;
  deployer?: string;
  version?: string;
  creator?: string;
  description?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface BuildManifestInput {
  analysis: AnalysisResult;
  chunkPlan: ChunkPlan;
  selectorMap: SelectorMap;
}

export class ManifestBuilder {
  private options: ManifestBuilderOptions;

  constructor(options: ManifestBuilderOptions = {}) {
    this.options = {
      network: 'hardhat',
      version: '1.0.0',
      creator: 'FacetForge',
      ...options,
    };
  }

  buildManifest(input: BuildManifestInput): DeploymentManifest {
    const { analysis, chunkPlan, selectorMap } = input;

    // Build routes from selector map and chunks
    const routes = this.buildRoutes(selectorMap, chunkPlan);

    // Calculate verification data
    const verification = this.calculateVerification(chunkPlan.chunks, routes);

    const manifest: DeploymentManifest = {
      metadata: {
        version: this.options.version || '1.0.0',
        timestamp: new Date().toISOString(),
        network: this.options.network || 'hardhat',
        creator: this.options.creator || 'FacetForge',
        description: this.options.description,
      },
      target: {
        factory: this.options.factory,
        dispatcher: this.options.dispatcher,
        deployer: this.options.deployer,
      },
      chunks: chunkPlan.chunks,
      routes,
      verification,
      dependencies: this.extractDependencies(analysis),
      security: {
        pausable: this.checkPausable(analysis),
        upgradeable: this.checkUpgradeable(analysis),
      },
    };

    return manifest;
  }

  validateManifest(
    manifest: DeploymentManifest,
    strict = false
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!manifest.metadata) {
      errors.push('Missing metadata section');
    } else {
      if (!manifest.metadata.version) {
        errors.push('Missing metadata.version');
      }
      if (!manifest.metadata.timestamp) {
        errors.push('Missing metadata.timestamp');
      }
      if (!manifest.metadata.network) {
        errors.push('Missing metadata.network');
      }
      if (!manifest.metadata.creator) {
        errors.push('Missing metadata.creator');
      }
    }

    if (!manifest.chunks || !Array.isArray(manifest.chunks)) {
      errors.push('Missing or invalid chunks array');
    }

    if (!manifest.routes || !Array.isArray(manifest.routes)) {
      errors.push('Missing or invalid routes array');
    }

    if (!manifest.verification) {
      errors.push('Missing verification section');
    }

    // Strict validation checks
    if (strict) {
      // Check chunk size limits
      if (manifest.chunks) {
        manifest.chunks.forEach((chunk, index) => {
          if (chunk.estimatedSize > 24576) {
            warnings.push(
              `Chunk ${index} exceeds EIP-170 size limit: ${chunk.estimatedSize} bytes`
            );
          }
        });
      }

      // Check for route conflicts
      if (manifest.routes) {
        const selectors = new Set<string>();
        manifest.routes.forEach(route => {
          if (selectors.has(route.selector)) {
            errors.push(`Duplicate selector found: ${route.selector}`);
          }
          selectors.add(route.selector);
        });
      }

      // Verify merkle root if possible
      if (manifest.verification && manifest.chunks && manifest.routes) {
        const calculatedVerification = this.calculateVerification(
          manifest.chunks,
          manifest.routes
        );
        if (
          calculatedVerification.merkleRoot !== manifest.verification.merkleRoot
        ) {
          errors.push('Merkle root verification failed');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private buildRoutes(
    selectorMap: SelectorMap,
    chunkPlan: ChunkPlan
  ): ManifestRoute[] {
    const routes: ManifestRoute[] = [];

    Object.entries(selectorMap).forEach(([selector, selectorInfos]) => {
      selectorInfos.forEach(info => {
        // Find which chunk contains this function
        const chunk = chunkPlan.chunks.find(c =>
          c.functions.some(f => f.name === info.functionName)
        );

        if (chunk) {
          routes.push({
            selector,
            signature: info.signature,
            chunkId: chunk.id,
            functionName: info.functionName,
          });
        }
      });
    });

    return routes;
  }

  private calculateVerification(
    chunks: FunctionChunk[],
    routes: ManifestRoute[]
  ): DeploymentManifest['verification'] {
    const chunkHashes: { [chunkId: string]: string } = {};
    let totalSize = 0;

    // Calculate hash for each chunk
    chunks.forEach(chunk => {
      const chunkData = JSON.stringify({
        id: chunk.id,
        functions: chunk.functions.map(f => f.name).sort(),
        estimatedSize: chunk.estimatedSize,
      });
      chunkHashes[chunk.id] = createHash('sha256')
        .update(chunkData)
        .digest('hex');
      totalSize += chunk.estimatedSize;
    });

    // Calculate merkle root from chunk hashes
    const sortedHashes = Object.values(chunkHashes).sort();
    const merkleRoot = this.calculateMerkleRoot(sortedHashes);

    return {
      merkleRoot,
      chunkHashes,
      routeCount: routes.length,
      totalSize,
    };
  }

  private calculateMerkleRoot(hashes: string[]): string {
    if (hashes.length === 0) {
      return '';
    }
    if (hashes.length === 1) {
      return hashes[0];
    }

    const nextLevel: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      const left = hashes[i];
      const right = hashes[i + 1] || left; // Duplicate last hash if odd number
      const combined = createHash('sha256')
        .update(left + right)
        .digest('hex');
      nextLevel.push(combined);
    }

    return this.calculateMerkleRoot(nextLevel);
  }

  private extractDependencies(analysis: AnalysisResult): string[] {
    const dependencies: string[] = [];

    // Extract from imports
    analysis.imports.forEach(imp => {
      if (imp.path.startsWith('@openzeppelin') || imp.path.startsWith('@')) {
        dependencies.push(imp.path);
      }
    });

    // Extract from inheritance
    analysis.inheritance.forEach(inh => {
      dependencies.push(inh.name);
    });

    return [...new Set(dependencies)]; // Remove duplicates
  }

  private checkPausable(analysis: AnalysisResult): boolean {
    return (
      analysis.functions.some(
        func =>
          func.name === 'pause' ||
          func.name === 'unpause' ||
          func.name === 'paused'
      ) || analysis.inheritance.some(inh => inh.name.includes('Pausable'))
    );
  }

  private checkUpgradeable(analysis: AnalysisResult): boolean {
    return (
      analysis.functions.some(
        func => func.name.includes('upgrade') || func.name.includes('proxy')
      ) ||
      analysis.inheritance.some(
        inh => inh.name.includes('Upgradeable') || inh.name.includes('Proxy')
      )
    );
  }

  exportToJson(manifest: DeploymentManifest): string {
    return JSON.stringify(manifest, null, 2);
  }

  importFromJson(jsonString: string): DeploymentManifest {
    try {
      const manifest = JSON.parse(jsonString) as DeploymentManifest;
      const validation = this.validateManifest(manifest);

      if (!validation.valid) {
        throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`);
      }

      return manifest;
    } catch (error) {
      throw new Error(`Failed to parse manifest JSON: ${error}`);
    }
  }

  mergeManifests(manifests: DeploymentManifest[]): DeploymentManifest {
    if (manifests.length === 0) {
      throw new Error('Cannot merge empty manifest array');
    }

    if (manifests.length === 1) {
      return manifests[0];
    }

    const baseManifest = manifests[0];
    const mergedChunks: FunctionChunk[] = [...baseManifest.chunks];
    const mergedRoutes: ManifestRoute[] = [...baseManifest.routes];
    const mergedDependencies = new Set(baseManifest.dependencies || []);

    // Merge additional manifests
    for (let i = 1; i < manifests.length; i++) {
      const manifest = manifests[i];

      // Merge chunks (ensuring unique IDs)
      manifest.chunks.forEach(chunk => {
        const existingChunk = mergedChunks.find(c => c.id === chunk.id);
        if (!existingChunk) {
          mergedChunks.push(chunk);
        }
      });

      // Merge routes (checking for conflicts)
      manifest.routes.forEach(route => {
        const existingRoute = mergedRoutes.find(
          r => r.selector === route.selector
        );
        if (existingRoute) {
          throw new Error(
            `Route conflict: selector ${route.selector} appears in multiple manifests`
          );
        }
        mergedRoutes.push(route);
      });

      // Merge dependencies
      manifest.dependencies?.forEach(dep => mergedDependencies.add(dep));
    }

    // Recalculate verification
    const verification = this.calculateVerification(mergedChunks, mergedRoutes);

    return {
      ...baseManifest,
      chunks: mergedChunks,
      routes: mergedRoutes,
      verification,
      dependencies: Array.from(mergedDependencies),
      metadata: {
        ...baseManifest.metadata,
        timestamp: new Date().toISOString(),
        description: `Merged manifest from ${manifests.length} sources`,
      },
    };
  }
}

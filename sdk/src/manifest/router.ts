// sdk/src/manifest/router.ts
import { ethers } from 'ethers';
import { FACET_LIMITS, GAS_LIMITS } from '../../../constants/system';
import { DeploymentManifest, ManifestRoute } from '../types';

export interface RouterConfig {
  network: string;
  factoryAddress?: string;
  dispatcherAddress?: string;
  gasLimit?: number;
}

export interface RouteTarget {
  selector: string;
  facet: string;
  codehash: string;
  functionName?: string;
  gasEstimate?: number;
}

/**
 * Manifest-based router for building and managing route configurations
 * Provides intelligent routing decisions and manifest construction
 */
export class ManifestRouter {
  private config: RouterConfig;
  private routes: Map<string, RouteTarget> = new Map();

  constructor(config: RouterConfig) {
    this.config = config;
  }

  /**
   * Add a route target for a specific function selector
   */
  addRoute(target: RouteTarget): void {
    if (!ethers.isHexString(target.selector, 4)) {
      throw new Error(`Invalid selector format: ${target.selector}`);
    }

    if (!ethers.isAddress(target.facet)) {
      throw new Error(`Invalid facet address: ${target.facet}`);
    }

    this.routes.set(target.selector, target);
  }

  /**
   * Add multiple routes from ABI analysis
   */
  addRoutesFromABI(
    facetAddress: string,
    abi: ethers.JsonFragment[],
    codehash: string
  ): void {
    const functions = abi.filter(item => item.type === 'function');

    for (const func of functions) {
      const signature = `${func.name}(${(func.inputs || [])
        .map((input: ethers.JsonFragmentType) =>
          typeof input === 'string' ? input : input.type
        )
        .join(',')})`;
      const selector = ethers.id(signature).slice(0, 10);

      this.addRoute({
        selector,
        facet: facetAddress,
        codehash,
        functionName: func.name,
        gasEstimate: this.estimateGasForFunction(func),
      });
    }
  }

  /**
   * Remove a route by selector
   */
  removeRoute(selector: string): boolean {
    return this.routes.delete(selector);
  }

  /**
   * Get route target for a selector
   */
  getRoute(selector: string): RouteTarget | undefined {
    return this.routes.get(selector);
  }

  /**
   * Get all routes as array
   */
  getAllRoutes(): RouteTarget[] {
    return Array.from(this.routes.values());
  }

  /**
   * Build deployment manifest from current routes
   */
  buildManifest(version: string = '1.0.0'): DeploymentManifest {
    const routes: ManifestRoute[] = Array.from(this.routes.entries()).map(
      ([selector, target]) => ({
        selector,
        facet: target.facet,
        codehash: target.codehash,
      })
    );

    return {
      version,
      timestamp: Date.now(),
      network: this.config.network,
      factory: this.config.factoryAddress || '',
      dispatcher: this.config.dispatcherAddress || '',
      routes,
      metadata: {
        totalRoutes: routes.length,
        buildTime: new Date().toISOString(),
        gasLimit: this.config.gasLimit || GAS_LIMITS.DEFAULT_DEPLOYMENT,
      },
    };
  }

  /**
   * Validate route consistency and detect conflicts
   */
  validateRoutes(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const facetSelectors = new Map<string, string[]>();

    // Check total facet count against system limits
    const uniqueFacets = new Set(
      Array.from(this.routes.values()).map(r => r.facet)
    );
    if (uniqueFacets.size > FACET_LIMITS.MAX_FACET_COUNT) {
      errors.push(
        `Total facet count ${uniqueFacets.size} exceeds maximum limit of ${FACET_LIMITS.MAX_FACET_COUNT}`
      );
    }

    // Group selectors by facet
    for (const [selector, target] of this.routes) {
      if (!facetSelectors.has(target.facet)) {
        facetSelectors.set(target.facet, []);
      }
      const selectors = facetSelectors.get(target.facet);
      if (selectors) {
        selectors.push(selector);
      }
    }

    // Check for common patterns and potential issues
    for (const [facet, selectors] of facetSelectors) {
      if (selectors.length > FACET_LIMITS.MAX_SELECTORS_PER_FACET) {
        errors.push(
          `Facet ${facet} has ${selectors.length} selectors (max: ${FACET_LIMITS.MAX_SELECTORS_PER_FACET})`
        );
      }

      // Check for common function selector collisions
      const commonSelectors = ['0x70a08231', '0xa9059cbb', '0x095ea7b3']; // balanceOf, transfer, approve
      const collisions = selectors.filter(sel => commonSelectors.includes(sel));
      if (collisions.length > 0) {
        errors.push(
          `Facet ${facet} implements common ERC20 selectors: ${collisions.join(
            ', '
          )}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Optimize route ordering for gas efficiency
   */
  optimizeRoutes(): void {
    const routeArray = this.getAllRoutes();

    // Sort by estimated gas usage (ascending) and frequency of use
    routeArray.sort((a, b) => {
      const gasA = a.gasEstimate || 50000;
      const gasB = b.gasEstimate || 50000;
      return gasA - gasB;
    });

    // Rebuild routes map with optimized order
    this.routes.clear();
    for (const route of routeArray) {
      this.routes.set(route.selector, route);
    }
  }

  /**
   * Estimate gas for a function based on complexity
   */
  private estimateGasForFunction(func: ethers.JsonFragment): number {
    let baseGas = GAS_LIMITS.BASE_TRANSACTION; // Base transaction cost

    // Add gas based on input complexity
    baseGas += (func.inputs?.length || 0) * 1000;

    // Add gas for view vs state-changing functions
    if (func.stateMutability === 'view' || func.stateMutability === 'pure') {
      baseGas += 5000;
    } else {
      baseGas += 15000;
    }

    // Add gas for complex types
    for (const input of func.inputs || []) {
      const inputType = typeof input === 'string' ? input : input.type;
      if (inputType && inputType.includes('[]')) {
        baseGas += 2000; // Array
      }
      if (inputType === 'string' || inputType === 'bytes') {
        baseGas += 1000; // Dynamic types
      }
    }

    return Math.min(baseGas, 100000); // Cap at reasonable limit
  }

  /**
   * Generate routing statistics
   */
  getStatistics() {
    const routes = this.getAllRoutes();
    const facetCount = new Set(routes.map(r => r.facet)).size;
    const totalGasEstimate = routes.reduce(
      (sum, r) => sum + (r.gasEstimate || 0),
      0
    );

    return {
      totalRoutes: routes.length,
      uniqueFacets: facetCount,
      averageRoutesPerFacet:
        Math.round((routes.length / facetCount) * 100) / 100,
      totalEstimatedGas: totalGasEstimate,
      averageGasPerRoute: Math.round(totalGasEstimate / routes.length),
    };
  }
}

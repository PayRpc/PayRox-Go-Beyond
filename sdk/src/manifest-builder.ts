import { ethers, BytesLike } from 'ethers';
import { NetworkConfig, ContractType } from './config';

export interface ManifestContract {
  name: string;
  bytecode: BytesLike;
  constructorArgs?: any[];
  contractType?: ContractType;
  address?: string;
}

export interface ManifestRoute {
  selector: string;
  facet: string;
  signature: string;
}

export interface Manifest {
  version: string;
  timestamp: string;
  network: string;
  chainId: number;
  contracts: ManifestContract[];
  routes: ManifestRoute[];
  merkleRoot: string;
  ipfsHash?: string;
}

/**
 * ManifestBuilder service for creating deployment manifests
 */
export class ManifestBuilder {
  private network: NetworkConfig;

  constructor(network: NetworkConfig) {
    this.network = network;
  }

  /**
   * Build a manifest from contract definitions
   */
  async build(contracts: ManifestContract[]): Promise<Manifest> {
    const routes: ManifestRoute[] = [];
    const processedContracts: ManifestContract[] = [];

    // Process each contract
    for (const contract of contracts) {
      // Calculate deterministic address if not provided
      let address = contract.address;
      if (!address) {
        address = await this.calculateContractAddress(contract.bytecode, contract.constructorArgs || []);
      }

      // Extract function selectors from bytecode (simplified)
      const contractRoutes = await this.extractRoutes(contract.name, contract.bytecode, address);
      routes.push(...contractRoutes);

      processedContracts.push({
        ...contract,
        address
      });
    }

    // Calculate Merkle root
    const merkleRoot = this.calculateMerkleRoot(routes);

    const manifest: Manifest = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      network: this.network.name,
      chainId: this.network.chainId,
      contracts: processedContracts,
      routes,
      merkleRoot
    };

    return manifest;
  }

  /**
   * Calculate deterministic address for a contract
   */
  private async calculateContractAddress(bytecode: BytesLike, constructorArgs: any[]): Promise<string> {
    // This is a simplified version - in practice, this would use the factory
    let deploymentData = bytecode;
    if (constructorArgs.length > 0) {
      const abiCoder = new ethers.AbiCoder();
      const encodedArgs = abiCoder.encode(['uint256[]'], [constructorArgs]);
      deploymentData = ethers.concat([bytecode, encodedArgs]);
    }

    const dataHash = ethers.keccak256(deploymentData);
    const salt = ethers.keccak256(ethers.toUtf8Bytes("chunk:" + dataHash.slice(2)));
    
    // Calculate CREATE2 address (simplified)
    const factoryAddress = this.network.contracts.factory;
    const initCodeHash = ethers.keccak256(deploymentData);
    
    return ethers.getCreate2Address(factoryAddress, salt, initCodeHash);
  }

  /**
   * Extract function routes from contract bytecode
   */
  private async extractRoutes(contractName: string, bytecode: BytesLike, address: string): Promise<ManifestRoute[]> {
    const routes: ManifestRoute[] = [];
    
    // This is a simplified version - in practice, you'd parse the ABI or analyze bytecode
    // For now, we'll create some example routes based on common patterns
    
    const commonSelectors = [
      { selector: "0x70a08231", signature: "balanceOf(address)" },
      { selector: "0xa9059cbb", signature: "transfer(address,uint256)" },
      { selector: "0x23b872dd", signature: "transferFrom(address,address,uint256)" },
      { selector: "0x095ea7b3", signature: "approve(address,uint256)" },
      { selector: "0x18160ddd", signature: "totalSupply()" },
      { selector: "0x06fdde03", signature: "name()" },
      { selector: "0x95d89b41", signature: "symbol()" },
      { selector: "0x313ce567", signature: "decimals()" }
    ];

    // Extract selectors from bytecode (simplified approach)
    const bytecodeString = ethers.hexlify(bytecode);
    
    for (const { selector, signature } of commonSelectors) {
      if (bytecodeString.includes(selector.slice(2))) {
        routes.push({
          selector,
          facet: address,
          signature
        });
      }
    }

    // If no common selectors found, add a generic route
    if (routes.length === 0) {
      routes.push({
        selector: "0x00000000", // Generic selector
        facet: address,
        signature: `${contractName}.fallback()`
      });
    }

    return routes;
  }

  /**
   * Calculate Merkle root from routes
   */
  private calculateMerkleRoot(routes: ManifestRoute[]): string {
    if (routes.length === 0) {
      return ethers.ZeroHash;
    }

    // Sort routes by selector for deterministic ordering
    const sortedRoutes = routes.sort((a, b) => a.selector.localeCompare(b.selector));

    // Create leaf nodes
    const leaves = sortedRoutes.map(route => 
      ethers.keccak256(ethers.toUtf8Bytes(route.selector + route.facet + route.signature))
    );

    // Build Merkle tree (simplified - single hash for now)
    if (leaves.length === 1) {
      return leaves[0];
    }

    // For multiple leaves, hash them together (simplified approach)
    let currentLevel = leaves;
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          const combined = ethers.concat([currentLevel[i], currentLevel[i + 1]]);
          nextLevel.push(ethers.keccak256(combined));
        } else {
          nextLevel.push(currentLevel[i]);
        }
      }
      
      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  /**
   * Validate a manifest structure
   */
  validateManifest(manifest: Manifest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (!manifest.version) errors.push("Missing version");
    if (!manifest.timestamp) errors.push("Missing timestamp");
    if (!manifest.network) errors.push("Missing network");
    if (!manifest.chainId) errors.push("Missing chainId");
    if (!manifest.contracts) errors.push("Missing contracts");
    if (!manifest.routes) errors.push("Missing routes");
    if (!manifest.merkleRoot) errors.push("Missing merkleRoot");

    // Check network compatibility
    if (manifest.chainId !== this.network.chainId) {
      errors.push(`Chain ID mismatch: expected ${this.network.chainId}, got ${manifest.chainId}`);
    }

    // Check contract addresses
    for (const contract of manifest.contracts || []) {
      if (!contract.address || !ethers.isAddress(contract.address)) {
        errors.push(`Invalid address for contract ${contract.name}`);
      }
    }

    // Check route selectors
    for (const route of manifest.routes || []) {
      if (!route.selector || !route.selector.startsWith('0x') || route.selector.length !== 10) {
        errors.push(`Invalid selector: ${route.selector}`);
      }
      if (!route.facet || !ethers.isAddress(route.facet)) {
        errors.push(`Invalid facet address: ${route.facet}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Compare two manifests
   */
  compareManifests(manifest1: Manifest, manifest2: Manifest): {
    identical: boolean;
    differences: string[];
  } {
    const differences: string[] = [];

    if (manifest1.merkleRoot !== manifest2.merkleRoot) {
      differences.push("Different Merkle roots");
    }

    if (manifest1.contracts.length !== manifest2.contracts.length) {
      differences.push("Different number of contracts");
    }

    if (manifest1.routes.length !== manifest2.routes.length) {
      differences.push("Different number of routes");
    }

    // Check individual contracts
    for (let i = 0; i < Math.min(manifest1.contracts.length, manifest2.contracts.length); i++) {
      const c1 = manifest1.contracts[i];
      const c2 = manifest2.contracts[i];
      
      if (c1.name !== c2.name) {
        differences.push(`Contract name difference: ${c1.name} vs ${c2.name}`);
      }
      if (c1.address !== c2.address) {
        differences.push(`Contract address difference: ${c1.address} vs ${c2.address}`);
      }
    }

    return {
      identical: differences.length === 0,
      differences
    };
  }

  /**
   * Export manifest to JSON string
   */
  exportManifest(manifest: Manifest): string {
    return JSON.stringify(manifest, null, 2);
  }

  /**
   * Import manifest from JSON string
   */
  importManifest(json: string): Manifest {
    try {
      const manifest = JSON.parse(json) as Manifest;
      const validation = this.validateManifest(manifest);
      
      if (!validation.valid) {
        throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`);
      }
      
      return manifest;
    } catch (error) {
      throw new Error(`Failed to import manifest: ${error}`);
    }
  }
}

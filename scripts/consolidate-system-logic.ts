/**
 * System Logic Consolidation and Mapping Script
 *
 * Analyzes the PayRox Go Beyond codebase to identify:
 * - Common patterns and logic that can be consolidated
 * - Path structures and network configurations
 * - Shared utilities and interfaces
 * - Opportunities for abstraction and DRY principles
 */

import * as fs from 'fs';
import * as path from 'path';

// Note: ethers import will be handled when needed in blockchain operations

/* ═══════════════════════════════════════════════════════════════════════════
   CONSOLIDATED TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════════ */

// Network and deployment types
interface NetworkConfig {
  name: string;
  chainId: string;
  deploymentPath: string;
  artifactsPath: string;
  hasDeployments: boolean;
}

interface ContractInfo {
  name: string;
  address: string;
  artifact: any;
  verified: boolean;
  hasCode: boolean;
}

interface ValidationResult {
  isValid: boolean;
  message: string;
  code?: string;
  recommendations?: string[];
}

// Path and file system types
interface PathMapping {
  type:
    | 'contract'
    | 'script'
    | 'test'
    | 'deployment'
    | 'config'
    | 'documentation';
  category: string;
  relativePath: string;
  absolutePath: string;
  dependencies: string[];
  exports: string[];
}

interface LogicPattern {
  pattern: string;
  occurrences: number;
  files: string[];
  consolidationOpportunity: boolean;
  suggestedLocation: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSOLIDATED ERROR HANDLING
   ═══════════════════════════════════════════════════════════════════════════ */

class PayRoxError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly category:
      | 'VALIDATION'
      | 'NETWORK'
      | 'CONTRACT'
      | 'FILE_SYSTEM'
      | 'CONFIGURATION'
  ) {
    super(message);
    this.name = `PayRox${category}Error`;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSOLIDATED PATH MANAGEMENT
   ═══════════════════════════════════════════════════════════════════════════ */

class PathManager {
  private static readonly BASE_PATHS = {
    contracts: 'contracts',
    scripts: 'scripts',
    test: 'test',
    deployments: 'deployments',
    config: 'config',
    docs: 'docs',
    sdk: 'sdk',
    cli: 'cli',
    manifests: 'manifests',
    releases: 'releases',
    tools: 'tools',
  } as const;

  private readonly rootPath: string;

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = rootPath;
  }

  /**
   * Get standardized path for any component
   */
  getPath(
    component: keyof typeof PathManager.BASE_PATHS,
    ...subPaths: string[]
  ): string {
    return path.join(
      this.rootPath,
      PathManager.BASE_PATHS[component],
      ...subPaths
    );
  }

  /**
   * Get deployment path for a specific network
   */
  getDeploymentPath(networkName: string, fileName?: string): string {
    const deploymentPath = this.getPath('deployments', networkName);
    return fileName ? path.join(deploymentPath, fileName) : deploymentPath;
  }

  /**
   * Get contract artifacts path
   */
  getArtifactPath(contractName: string): string {
    return path.join(
      this.rootPath,
      'artifacts',
      'contracts',
      `${contractName}.sol`,
      `${contractName}.json`
    );
  }

  /**
   * Validate path existence and accessibility
   */
  validatePath(targetPath: string): ValidationResult {
    try {
      if (!fs.existsSync(targetPath)) {
        return {
          isValid: false,
          message: `Path does not exist: ${targetPath}`,
          code: 'PATH_NOT_FOUND',
        };
      }

      const stats = fs.statSync(targetPath);
      return {
        isValid: true,
        message: `Path valid: ${stats.isDirectory() ? 'directory' : 'file'}`,
        code: 'PATH_VALID',
      };
    } catch (error) {
      return {
        isValid: false,
        message: `Path access error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        code: 'PATH_ACCESS_ERROR',
      };
    }
  }

  /**
   * Scan directory structure and build mapping
   */
  buildPathMapping(): PathMapping[] {
    const mappings: PathMapping[] = [];

    Object.entries(PathManager.BASE_PATHS).forEach(
      ([category, relativePath]) => {
        const absolutePath = path.join(this.rootPath, relativePath);
        if (fs.existsSync(absolutePath)) {
          this.scanDirectory(absolutePath, category as any, mappings);
        }
      }
    );

    return mappings;
  }

  private scanDirectory(
    dirPath: string,
    category: string,
    mappings: PathMapping[]
  ): void {
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });

      items.forEach(item => {
        const fullPath = path.join(dirPath, item.name);
        const relativePath = path.relative(this.rootPath, fullPath);

        if (item.isFile() && this.isRelevantFile(item.name)) {
          mappings.push({
            type: this.determineFileType(relativePath),
            category,
            relativePath,
            absolutePath: fullPath,
            dependencies: this.extractDependencies(fullPath),
            exports: this.extractExports(fullPath),
          });
        } else if (item.isDirectory()) {
          this.scanDirectory(fullPath, category, mappings);
        }
      });
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${dirPath}:`, error);
    }
  }

  private isRelevantFile(fileName: string): boolean {
    const relevantExtensions = [
      '.ts',
      '.js',
      '.sol',
      '.json',
      '.md',
      '.yaml',
      '.yml',
    ];
    return relevantExtensions.some(ext => fileName.endsWith(ext));
  }

  private determineFileType(relativePath: string): PathMapping['type'] {
    if (relativePath.includes('contracts/')) return 'contract';
    if (relativePath.includes('scripts/')) return 'script';
    if (relativePath.includes('test/')) return 'test';
    if (relativePath.includes('deployments/')) return 'deployment';
    if (relativePath.includes('config/')) return 'config';
    if (relativePath.includes('docs/')) return 'documentation';
    return 'script'; // default
  }

  private extractDependencies(filePath: string): string[] {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const importRegex = /import.*?from\s+['"`]([^'"`]+)['"`]/g;
      const requireRegex = /require\(['"`]([^'"`]+)['"`]\)/g;

      const dependencies: string[] = [];
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        dependencies.push(match[1]);
      }

      while ((match = requireRegex.exec(content)) !== null) {
        dependencies.push(match[1]);
      }

      return [...new Set(dependencies)];
    } catch {
      return [];
    }
  }

  private extractExports(filePath: string): string[] {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const exportRegex =
        /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type)\s+(\w+)/g;

      const exports: string[] = [];
      let match;

      while ((match = exportRegex.exec(content)) !== null) {
        exports.push(match[1]);
      }

      return exports;
    } catch {
      return [];
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSOLIDATED NETWORK MANAGEMENT
   ═══════════════════════════════════════════════════════════════════════════ */

class NetworkManager {
  private readonly pathManager: PathManager;

  constructor(pathManager: PathManager) {
    this.pathManager = pathManager;
  }

  /**
   * Determine network name from chain ID with fallback logic
   */
  determineNetworkName(chainId: string): string {
    const networkMappings: Record<string, string> = {
      '1': 'mainnet',
      '5': 'goerli',
      '11155111': 'sepolia',
      '137': 'polygon',
      '31337': this.detectLocalNetwork(),
      '1337': 'hardhat',
    };

    return networkMappings[chainId] || 'unknown';
  }

  private detectLocalNetwork(): string {
    // Check for localhost deployments first, then hardhat
    if (fs.existsSync(this.pathManager.getDeploymentPath('localhost'))) {
      return 'localhost';
    } else if (fs.existsSync(this.pathManager.getDeploymentPath('hardhat'))) {
      return 'hardhat';
    }
    return 'localhost'; // default for 31337
  }

  /**
   * Get all available networks with their configurations
   */
  getAvailableNetworks(): NetworkConfig[] {
    const deploymentsPath = this.pathManager.getPath('deployments');

    if (!fs.existsSync(deploymentsPath)) {
      return [];
    }

    return fs
      .readdirSync(deploymentsPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => ({
        name: item.name,
        chainId: this.getChainIdForNetwork(item.name),
        deploymentPath: this.pathManager.getDeploymentPath(item.name),
        artifactsPath: this.pathManager.getDeploymentPath(item.name, '*.json'),
        hasDeployments: this.hasDeploymentArtifacts(item.name),
      }));
  }

  private getChainIdForNetwork(networkName: string): string {
    const chainMappings: Record<string, string> = {
      mainnet: '1',
      goerli: '5',
      sepolia: '11155111',
      polygon: '137',
      localhost: '31337',
      hardhat: '31337',
    };
    return chainMappings[networkName] || 'unknown';
  }

  private hasDeploymentArtifacts(networkName: string): boolean {
    const deploymentPath = this.pathManager.getDeploymentPath(networkName);
    try {
      const files = fs.readdirSync(deploymentPath);
      return files.some(file => file.endsWith('.json'));
    } catch {
      return false;
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSOLIDATED CONTRACT VALIDATION
   ═══════════════════════════════════════════════════════════════════════════ */

class ContractValidator {
  /**
   * Validate that a contract address format is correct
   * Note: For full contract validation, use this in a blockchain context
   */
  static validateContractAddress(address: string): ValidationResult {
    // Basic address format validation
    if (!address || address.length !== 42 || !address.startsWith('0x')) {
      return {
        isValid: false,
        message: `Invalid contract address format: ${address}`,
        code: 'INVALID_ADDRESS_FORMAT',
        recommendations: [
          'Ensure address is 42 characters long',
          'Ensure address starts with 0x',
          'Verify the address is a valid Ethereum address',
        ],
      };
    }

    // Check if it's a valid hex string
    const hexPattern = /^0x[a-fA-F0-9]{40}$/;
    if (!hexPattern.test(address)) {
      return {
        isValid: false,
        message: `Invalid hex format in address: ${address}`,
        code: 'INVALID_HEX_FORMAT',
      };
    }

    return {
      isValid: true,
      message: `Address format valid: ${address}`,
      code: 'ADDRESS_FORMAT_VALID',
    };
  }

  /**
   * Get comprehensive contract information
   */
  static async getContractInfo(
    contractName: string,
    address: string,
    pathManager: PathManager
  ): Promise<ContractInfo> {
    const artifactPath = pathManager.getArtifactPath(contractName);

    let artifact = null;
    try {
      artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    } catch {
      // Artifact not found or invalid
    }

    const validation = this.validateContractAddress(address);

    return {
      name: contractName,
      address,
      artifact,
      verified: artifact !== null,
      hasCode: validation.isValid,
    };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSOLIDATED ARTIFACT MANAGEMENT
   ═══════════════════════════════════════════════════════════════════════════ */

class ArtifactManager {
  private readonly pathManager: PathManager;

  constructor(pathManager: PathManager) {
    this.pathManager = pathManager;
  }

  /**
   * Load and validate deployment artifact
   */
  loadDeploymentArtifact(networkName: string, contractName: string): any {
    const artifactPath = this.pathManager.getDeploymentPath(
      networkName,
      `${contractName}.json`
    );

    const pathValidation = this.pathManager.validatePath(artifactPath);
    if (!pathValidation.isValid) {
      throw new PayRoxError(
        `Deployment artifact not found: ${artifactPath}`,
        'ARTIFACT_NOT_FOUND',
        'FILE_SYSTEM'
      );
    }

    try {
      return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    } catch (parseError) {
      throw new PayRoxError(
        `Failed to parse deployment artifact: ${
          parseError instanceof Error ? parseError.message : String(parseError)
        }`,
        'ARTIFACT_PARSE_ERROR',
        'FILE_SYSTEM'
      );
    }
  }

  /**
   * Get all deployment artifacts for a network
   */
  getAllDeploymentArtifacts(networkName: string): Record<string, any> {
    const deploymentPath = this.pathManager.getDeploymentPath(networkName);
    const artifacts: Record<string, any> = {};

    try {
      const files = fs.readdirSync(deploymentPath);

      files
        .filter(file => file.endsWith('.json'))
        .forEach(file => {
          const contractName = path.basename(file, '.json');
          try {
            artifacts[contractName] = this.loadDeploymentArtifact(
              networkName,
              contractName
            );
          } catch (error) {
            console.warn(`Warning: Could not load artifact ${file}:`, error);
          }
        });
    } catch (error) {
      console.warn(
        `Warning: Could not read deployment directory ${deploymentPath}:`,
        error
      );
    }

    return artifacts;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOGIC PATTERN ANALYZER
   ═══════════════════════════════════════════════════════════════════════════ */

class LogicPatternAnalyzer {
  private readonly pathManager: PathManager;

  constructor(pathManager: PathManager) {
    this.pathManager = pathManager;
  }

  /**
   * Analyze common patterns across the codebase
   */
  analyzePatterns(): LogicPattern[] {
    const patterns: LogicPattern[] = [];
    const pathMappings = this.pathManager.buildPathMapping();

    // Common patterns to look for
    const patternDefinitions = [
      {
        pattern: 'Error handling',
        regex: /try\s*{[\s\S]*?}\s*catch/g,
        consolidationThreshold: 3,
      },
      {
        pattern: 'Network determination',
        regex: /chainId.*31337|localhost|hardhat/g,
        consolidationThreshold: 2,
      },
      {
        pattern: 'Path construction',
        regex: /path\.join\(.*__dirname/g,
        consolidationThreshold: 3,
      },
      {
        pattern: 'Contract validation',
        regex: /ethers\.provider\.getCode|getContractAt/g,
        consolidationThreshold: 2,
      },
      {
        pattern: 'File system operations',
        regex: /fs\.(readFileSync|existsSync|writeFileSync)/g,
        consolidationThreshold: 4,
      },
      {
        pattern: 'Manifest validation',
        regex: /manifest.*valid|validateManifest/g,
        consolidationThreshold: 2,
      },
    ];

    patternDefinitions.forEach(({ pattern, regex, consolidationThreshold }) => {
      const occurrences: { file: string; count: number }[] = [];

      pathMappings
        .filter(mapping => mapping.type === 'script' || mapping.type === 'test')
        .forEach(mapping => {
          try {
            const content = fs.readFileSync(mapping.absolutePath, 'utf8');
            const matches = content.match(regex);
            if (matches && matches.length > 0) {
              occurrences.push({
                file: mapping.relativePath,
                count: matches.length,
              });
            }
          } catch {
            // Skip files that can't be read
          }
        });

      const totalOccurrences = occurrences.reduce(
        (sum, occ) => sum + occ.count,
        0
      );
      const files = occurrences.map(occ => occ.file);

      patterns.push({
        pattern,
        occurrences: totalOccurrences,
        files,
        consolidationOpportunity: totalOccurrences >= consolidationThreshold,
        suggestedLocation: this.suggestConsolidationLocation(pattern, files),
      });
    });

    return patterns.filter(p => p.occurrences > 0);
  }

  private suggestConsolidationLocation(
    pattern: string,
    files: string[]
  ): string {
    // Suggest consolidation location based on pattern type and current usage
    const patternToLocation: Record<string, string> = {
      'Error handling': 'src/utils/errors.ts',
      'Network determination': 'src/utils/network.ts',
      'Path construction': 'src/utils/paths.ts',
      'Contract validation': 'src/utils/contracts.ts',
      'File system operations': 'src/utils/filesystem.ts',
      'Manifest validation': 'src/utils/manifest.ts',
    };

    return patternToLocation[pattern] || 'src/utils/common.ts';
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN CONSOLIDATION ANALYSIS
   ═══════════════════════════════════════════════════════════════════════════ */

async function analyzeSystemConsolidation(): Promise<void> {
  console.log('🔍 PayRox Go Beyond System Consolidation Analysis');
  console.log('='.repeat(60));

  const pathManager = new PathManager();
  const networkManager = new NetworkManager(pathManager);
  const patternAnalyzer = new LogicPatternAnalyzer(pathManager);

  try {
    // 1. Analyze path structure
    console.log('\n📁 PATH STRUCTURE ANALYSIS');
    console.log('-'.repeat(30));
    const pathMappings = pathManager.buildPathMapping();

    const typeGroups = pathMappings.reduce((groups, mapping) => {
      groups[mapping.type] = (groups[mapping.type] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);

    Object.entries(typeGroups).forEach(([type, count]) => {
      console.log(`${type}: ${count} files`);
    });

    // 2. Analyze network configurations
    console.log('\n🌐 NETWORK CONFIGURATION ANALYSIS');
    console.log('-'.repeat(30));
    const networks = networkManager.getAvailableNetworks();

    networks.forEach(network => {
      console.log(
        `${network.name}: Chain ${network.chainId} (${
          network.hasDeployments ? 'deployed' : 'no deployments'
        })`
      );
    });

    // 3. Analyze common patterns
    console.log('\n🔄 LOGIC PATTERN ANALYSIS');
    console.log('-'.repeat(30));
    const patterns = patternAnalyzer.analyzePatterns();

    patterns.forEach(pattern => {
      console.log(
        `${pattern.pattern}: ${pattern.occurrences} occurrences in ${pattern.files.length} files`
      );
      if (pattern.consolidationOpportunity) {
        console.log(
          `  ⚡ CONSOLIDATION OPPORTUNITY: ${pattern.suggestedLocation}`
        );
      }
    });

    // 4. Generate consolidation recommendations
    console.log('\n💡 CONSOLIDATION RECOMMENDATIONS');
    console.log('-'.repeat(30));

    const highPriorityPatterns = patterns.filter(
      p => p.consolidationOpportunity
    );

    if (highPriorityPatterns.length > 0) {
      console.log('High Priority Consolidations:');
      highPriorityPatterns.forEach(pattern => {
        console.log(`  1. ${pattern.pattern}`);
        console.log(`     📍 Location: ${pattern.suggestedLocation}`);
        console.log(`     📊 Impact: ${pattern.files.length} files affected`);
        console.log(
          `     🎯 Benefit: Reduce code duplication, improve maintainability`
        );
        console.log('');
      });
    } else {
      console.log('✅ Code structure is well-consolidated!');
    }

    // 5. Generate utility structure recommendations
    console.log('\n🏗️  SUGGESTED UTILITY STRUCTURE');
    console.log('-'.repeat(30));
    console.log('src/');
    console.log('├── utils/');
    console.log('│   ├── paths.ts          # Consolidated path management');
    console.log(
      '│   ├── network.ts        # Network detection & configuration'
    );
    console.log(
      '│   ├── contracts.ts      # Contract validation & interaction'
    );
    console.log('│   ├── artifacts.ts      # Deployment artifact management');
    console.log('│   ├── errors.ts         # Standardized error handling');
    console.log('│   ├── filesystem.ts     # File system operations');
    console.log('│   └── validation.ts     # Common validation logic');
    console.log('├── types/');
    console.log('│   ├── contracts.ts      # Contract-related types');
    console.log('│   ├── network.ts        # Network configuration types');
    console.log('│   └── common.ts         # Shared type definitions');
    console.log('└── constants/');
    console.log('    ├── networks.ts       # Network constants');
    console.log('    ├── paths.ts          # Path constants');
    console.log('    └── contracts.ts      # Contract constants');
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXECUTION
   ═══════════════════════════════════════════════════════════════════════════ */

async function main(): Promise<void> {
  try {
    await analyzeSystemConsolidation();
    console.log('\n✅ System consolidation analysis completed successfully!');
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export {
  ArtifactManager,
  ContractValidator,
  LogicPatternAnalyzer,
  NetworkManager,
  PathManager,
  PayRoxError,
  type ContractInfo,
  type LogicPattern,
  type NetworkConfig,
  type PathMapping,
  type ValidationResult,
};

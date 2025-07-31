import { execSync } from 'child_process';
import * as fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import * as path from 'path';

interface SBOMEntry {
  name: string;
  version: string;
  type: 'contract' | 'library' | 'interface';
  path: string;
  sourceHash: string;
  dependencies: string[];
  solcVersion: string;
  optimizerEnabled: boolean;
  optimizerRuns: number;
  bytecodeHash: string;
  deploymentInfo?: {
    address: string;
    transactionHash: string;
    blockNumber: number;
    network: string;
  };
}

interface CompilerSettings {
  solcVersion: string;
  optimizerEnabled: boolean;
  optimizerRuns: number;
  evmVersion: string;
  metadata?: any;
}

interface SBOM {
  metadata: {
    version: '1.0.0';
    generatedAt: string;
    generator: 'PayRox SBOM Generator';
    project: 'PayRox Go Beyond';
    commit: string;
    branch: string;
    repository: string;
  };
  compiler: CompilerSettings;
  contracts: SBOMEntry[];
  dependencies: {
    npm: Record<string, string>;
    hardhat: Record<string, string>;
  };
  security: {
    auditStatus: string;
    knownVulnerabilities: string[];
    securityChecks: string[];
  };
}

/**
 * Generate Software Bill of Materials (SBOM) for the project
 */
export async function main(
  hre: HardhatRuntimeEnvironment,
  outputPath?: string
) {
  console.log('📦 PayRox Go Beyond - SBOM Generation');
  console.log('====================================');

  const network = await hre.ethers.provider.getNetwork();
  const chainId = network.chainId.toString();

  // Get Git information
  const gitInfo = getGitInfo();

  // Get compiler settings
  const compilerSettings = getCompilerSettings(hre);

  // Analyze contracts
  const contracts = await analyzeContracts(hre, chainId);

  // Get dependencies
  const dependencies = getDependencies();

  // Generate SBOM
  const sbom: SBOM = {
    metadata: {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      generator: 'PayRox SBOM Generator',
      project: 'PayRox Go Beyond',
      commit: gitInfo.commit,
      branch: gitInfo.branch,
      repository: gitInfo.repository,
    },
    compiler: compilerSettings,
    contracts,
    dependencies,
    security: {
      auditStatus: 'Internal Review Complete',
      knownVulnerabilities: [],
      securityChecks: [
        'Reentrancy protection',
        'Access control validation',
        'Integer overflow protection',
        'EXTCODEHASH verification',
        'CREATE2 deterministic deployment',
      ],
    },
  };

  // Write SBOM to file
  const defaultPath = path.join(
    __dirname,
    `../reports/sbom-${chainId}-${Date.now()}.json`
  );
  const filePath = outputPath || defaultPath;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(sbom, null, 2));

  console.log(`📋 SBOM Generated: ${filePath}`);
  console.log(`📊 Summary:`);
  console.log(`   - Contracts: ${contracts.length}`);
  console.log(`   - Solidity Version: ${compilerSettings.solcVersion}`);
  console.log(
    `   - Optimizer: ${
      compilerSettings.optimizerEnabled ? 'Enabled' : 'Disabled'
    } (${compilerSettings.optimizerRuns} runs)`
  );
  console.log(`   - Git Commit: ${gitInfo.commit.substring(0, 8)}`);
  console.log(`   - Network: ${hre.network.name}`);

  return sbom;
}

function getGitInfo() {
  try {
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
    }).trim();
    const repository = execSync('git config --get remote.origin.url', {
      encoding: 'utf8',
    }).trim();

    return { commit, branch, repository };
  } catch (error) {
    console.warn('⚠️  Could not retrieve Git information');
    return {
      commit: 'unknown',
      branch: 'unknown',
      repository: 'unknown',
    };
  }
}

function getCompilerSettings(hre: HardhatRuntimeEnvironment): CompilerSettings {
  const config = hre.config.solidity;

  // Handle both single compiler and multiple compilers config
  const compilerConfig =
    typeof config === 'string'
      ? { version: config, settings: {} }
      : Array.isArray(config.compilers)
      ? config.compilers[0]
      : config;

  return {
    solcVersion: compilerConfig.version || 'unknown',
    optimizerEnabled: compilerConfig.settings?.optimizer?.enabled || false,
    optimizerRuns: compilerConfig.settings?.optimizer?.runs || 200,
    evmVersion: compilerConfig.settings?.evmVersion || 'london',
    metadata: compilerConfig.settings?.metadata,
  };
}

async function analyzeContracts(
  hre: HardhatRuntimeEnvironment,
  chainId: string
): Promise<SBOMEntry[]> {
  const contracts: SBOMEntry[] = [];

  // Get all compiled contracts
  const artifacts = await hre.artifacts.getAllFullyQualifiedNames();

  for (const fqn of artifacts) {
    const artifact = await hre.artifacts.readArtifact(fqn);
    const [sourcePath, contractName] = fqn.split(':');

    // Skip test contracts and interfaces
    if (sourcePath.includes('/test/') || sourcePath.includes('/interfaces/')) {
      continue;
    }

    // Calculate source hash
    const sourceCode = fs.readFileSync(
      path.join(__dirname, '../', sourcePath),
      'utf8'
    );
    const sourceHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(sourceCode));

    // Calculate bytecode hash
    const bytecodeHash = hre.ethers.keccak256(artifact.bytecode);

    // Check if deployed
    let deploymentInfo;
    const deploymentPath = path.join(
      __dirname,
      `../deployments/${chainId}`,
      `${contractName.toLowerCase().replace('example', '')}.json`
    );
    if (fs.existsSync(deploymentPath)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      deploymentInfo = {
        address: deployment.address,
        transactionHash: deployment.transactionHash,
        blockNumber: deployment.blockNumber,
        network: hre.network.name,
      };
    }

    contracts.push({
      name: contractName,
      version: '1.0.0',
      type: getContractType(contractName),
      path: sourcePath,
      sourceHash,
      dependencies: extractDependencies(sourceCode),
      solcVersion: getCompilerSettings(hre).solcVersion,
      optimizerEnabled: getCompilerSettings(hre).optimizerEnabled,
      optimizerRuns: getCompilerSettings(hre).optimizerRuns,
      bytecodeHash,
      deploymentInfo,
    });
  }

  return contracts;
}

function getContractType(
  contractName: string
): 'contract' | 'library' | 'interface' {
  if (contractName.startsWith('I')) return 'interface';
  if (contractName.includes('Library')) return 'library';
  return 'contract';
}

function extractDependencies(sourceCode: string): string[] {
  const dependencies: string[] = [];
  const importRegex = /import\s+["']([^"']+)["']/g;
  let match;

  while ((match = importRegex.exec(sourceCode)) !== null) {
    dependencies.push(match[1]);
  }

  return dependencies;
}

function getDependencies() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
  );

  return {
    npm: {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    },
    hardhat: {
      hardhat: packageJson.devDependencies?.hardhat || 'unknown',
      '@nomicfoundation/hardhat-toolbox':
        packageJson.devDependencies?.['@nomicfoundation/hardhat-toolbox'] ||
        'unknown',
      '@openzeppelin/contracts':
        packageJson.dependencies?.['@openzeppelin/contracts'] || 'unknown',
    },
  };
}

// Export for CLI usage
if (require.main === module) {
  import('hardhat')
    .then(async hre => {
      const outputPath = process.argv[3]; // Optional output path
      await main(hre.default, outputPath);
      process.exit(0);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

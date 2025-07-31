#!/usr/bin/env node

/**
 * Pre-deployment hook to generate SBOM and validate deployment readiness
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface PreDeploymentOptions {
  network: string;
  verbose: boolean;
  skipSbom: boolean;
  outputDir: string;
}

async function main() {
  const args = process.argv.slice(2);
  const options: PreDeploymentOptions = {
    network:
      args.find(arg => arg.startsWith('--network='))?.split('=')[1] ||
      'hardhat',
    verbose: args.includes('--verbose') || args.includes('-v'),
    skipSbom: args.includes('--skip-sbom'),
    outputDir:
      args.find(arg => arg.startsWith('--output='))?.split('=')[1] ||
      './reports',
  };

  console.log('🚀 PayRox Pre-Deployment Validation');
  console.log('===================================');

  if (options.verbose) {
    console.log(`📋 Configuration:`);
    console.log(`   - Network: ${options.network}`);
    console.log(`   - Output Directory: ${options.outputDir}`);
    console.log(`   - Skip SBOM: ${options.skipSbom}`);
  }

  try {
    // 1. Validate git status
    await validateGitStatus(options);

    // 2. Compile contracts
    await compileContracts(options);

    // 3. Run tests
    await runTests(options);

    // 4. Generate SBOM
    if (!options.skipSbom) {
      await generateSbom(options);
    }

    // 5. Validate deployment configuration
    await validateDeploymentConfig(options);

    console.log('✅ Pre-deployment validation successful!');
    console.log('🎯 Ready for deployment to', options.network);
  } catch (error) {
    console.error('❌ Pre-deployment validation failed:', error);
    process.exit(1);
  }
}

async function validateGitStatus(options: PreDeploymentOptions) {
  if (options.verbose) console.log('🔍 Validating git status...');

  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });

    if (
      status.trim() &&
      options.network !== 'hardhat' &&
      options.network !== 'localhost'
    ) {
      console.warn(
        '⚠️  Warning: Uncommitted changes detected for production deployment'
      );
      const uncommittedFiles = status.trim().split('\n');
      console.log('📝 Uncommitted files:');
      uncommittedFiles.forEach(file => console.log(`   ${file}`));

      if (!process.env.CI && options.network === 'mainnet') {
        throw new Error('Mainnet deployments require a clean git working tree');
      }
    }

    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
    }).trim();
    if (options.verbose) console.log(`   - Current branch: ${currentBranch}`);
  } catch (error) {
    console.warn('⚠️  Could not validate git status:', error);
  }
}

async function compileContracts(options: PreDeploymentOptions) {
  if (options.verbose) console.log('🔨 Compiling contracts...');

  try {
    execSync('npm run compile', {
      encoding: 'utf8',
      stdio: options.verbose ? 'inherit' : 'pipe',
    });

    if (options.verbose) console.log('✅ Compilation successful');
  } catch (error) {
    throw new Error(`Contract compilation failed: ${error}`);
  }
}

async function runTests(options: PreDeploymentOptions) {
  if (options.verbose) console.log('🧪 Running tests...');

  try {
    // Skip tests for local development networks unless explicitly requested
    if (options.network === 'hardhat' || options.network === 'localhost') {
      if (!process.env.RUN_TESTS) {
        if (options.verbose)
          console.log('⏭️  Skipping tests for local network');
        return;
      }
    }

    execSync('npm run test:acceptance', {
      encoding: 'utf8',
      stdio: options.verbose ? 'inherit' : 'pipe',
    });

    if (options.verbose) console.log('✅ All tests passed');
  } catch (error) {
    throw new Error(`Tests failed: ${error}`);
  }
}

async function generateSbom(options: PreDeploymentOptions) {
  if (options.verbose) console.log('📦 Generating SBOM...');

  try {
    // Ensure output directory exists
    fs.mkdirSync(options.outputDir, { recursive: true });

    // Generate SBOM
    execSync(
      `npx hardhat sbom --network ${options.network} ${
        options.verbose ? '--verbose' : ''
      }`,
      {
        encoding: 'utf8',
        stdio: options.verbose ? 'inherit' : 'pipe',
      }
    );

    // Find the generated SBOM file
    const sbomFiles = fs
      .readdirSync(options.outputDir)
      .filter(f => f.startsWith('sbom-'));

    if (sbomFiles.length > 0) {
      const sortedFiles = [...sbomFiles].sort((a, b) => a.localeCompare(b));
      const latestSbom = sortedFiles[sortedFiles.length - 1];

      if (latestSbom) {
        const sbomPath = path.join(options.outputDir, latestSbom);

        if (options.verbose) {
          console.log(`✅ SBOM generated: ${sbomPath}`);

          // Show SBOM summary
          const sbom = JSON.parse(fs.readFileSync(sbomPath, 'utf8'));
          console.log(`📊 SBOM Summary:`);
          console.log(`   - Contracts: ${sbom.contracts.length}`);
          console.log(`   - Compiler: ${sbom.compiler.solcVersion}`);
          console.log(
            `   - Git Commit: ${sbom.metadata.commit.substring(0, 8)}`
          );
        }
      }
    }
  } catch (error) {
    throw new Error(`SBOM generation failed: ${error}`);
  }
}

async function validateDeploymentConfig(options: PreDeploymentOptions) {
  if (options.verbose)
    console.log('⚙️  Validating deployment configuration...');

  try {
    // Check network configuration exists
    const configPath = path.join(__dirname, '../hardhat.config.ts');
    const config = fs.readFileSync(configPath, 'utf8');

    if (!config.includes(options.network) && options.network !== 'hardhat') {
      throw new Error(
        `Network '${options.network}' not found in hardhat.config.ts`
      );
    }

    // Validate environment variables for production networks
    if (options.network === 'mainnet' || options.network === 'testnet') {
      const requiredEnvVars = ['PRIVATE_KEY'];
      const missingVars = requiredEnvVars.filter(
        varName => !process.env[varName]
      );

      if (missingVars.length > 0) {
        throw new Error(
          `Missing required environment variables: ${missingVars.join(', ')}`
        );
      }
    }

    if (options.verbose) console.log('✅ Deployment configuration validated');
  } catch (error) {
    throw new Error(`Deployment configuration validation failed: ${error}`);
  }
}

// Show help
function showHelp() {
  console.log(`
PayRox Pre-Deployment Hook

Usage:
  node scripts/pre-deploy.ts [options]

Options:
  --network=<name>    Target network (default: hardhat)
  --output=<dir>      Output directory for reports (default: ./reports)
  --verbose, -v       Show verbose output
  --skip-sbom         Skip SBOM generation
  --help, -h          Show this help

Examples:
  node scripts/pre-deploy.ts --network=testnet --verbose
  node scripts/pre-deploy.ts --network=mainnet --output=./release-reports
  node scripts/pre-deploy.ts --skip-sbom --network=localhost
`);
}

// Handle CLI
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Run main function
main().catch(error => {
  console.error('💥 Pre-deployment hook failed:', error);
  process.exit(1);
});

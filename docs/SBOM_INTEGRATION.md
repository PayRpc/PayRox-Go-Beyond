# Software Bill of Materials (SBOM) Integration

This document describes the comprehensive SBOM generation and integration system for PayRox Go
Beyond.

## Overview

The SBOM (Software Bill of Materials) system provides complete visibility into the project's smart
contracts, dependencies, and security posture. It's fully integrated into the development, testing,
and deployment workflow.

## Features

### 🔍 **Comprehensive Analysis**

- **Contract Inventory**: All smart contracts with source code hashes
- **Dependency Tracking**: NPM packages and OpenZeppelin contracts
- **Compiler Settings**: Solidity version, optimizer configuration
- **Git Integration**: Commit hash, branch, and repository information
- **Deployment Tracking**: Contract addresses and transaction details
- **Security Assessment**: Audit status and security checks

### ⚡ **Automated Generation**

- **CLI Integration**: Hardhat tasks and NPM scripts
- **CI/CD Pipeline**: GitHub Actions workflow
- **Pre-deployment Hooks**: Validation before deployments
- **Release Artifacts**: Automatic SBOM attachment to releases

## Usage

### Basic Commands

```bash
# Generate SBOM for current network
npm run sbom

# Generate SBOM for specific networks
npm run sbom:local
npm run sbom:testnet
npm run sbom:mainnet

# Using Hardhat task directly
npx hardhat sbom --network hardhat --verbose
npx hardhat sbom --network testnet --output ./custom-path.json
```

### Pre-deployment Validation

```bash
# Run full pre-deployment validation (includes SBOM)
npm run pre-deploy:testnet
npm run pre-deploy:mainnet

# Integrated deployment with validation
npm run deploy:testnet  # Includes pre-deploy:testnet
npm run deploy:mainnet  # Includes pre-deploy:mainnet
```

### Build Integration

```bash
# Build with SBOM generation
npm run build

# CI pipeline with SBOM
npm run ci
```

## SBOM Structure

### Metadata Section

```json
{
  "metadata": {
    "version": "1.0.0",
    "generatedAt": "2025-07-31T03:41:49.487Z",
    "generator": "PayRox SBOM Generator",
    "project": "PayRox Go Beyond",
    "commit": "1dbb570c1f583821896a315487006fa8220c63ed",
    "branch": "main",
    "repository": "https://github.com/PayRpc/PayRox-Go-Beyond.git"
  }
}
```

### Compiler Information

```json
{
  "compiler": {
    "solcVersion": "0.8.30",
    "optimizerEnabled": true,
    "optimizerRuns": 200,
    "evmVersion": "paris"
  }
}
```

### Contract Inventory

```json
{
  "contracts": [
    {
      "name": "DeterministicChunkFactory",
      "version": "1.0.0",
      "type": "contract",
      "path": "contracts/factory/DeterministicChunkFactory.sol",
      "sourceHash": "0x1a6b4f6b7798ab80929d491b89d5427a9b3338c0...",
      "bytecodeHash": "0xc5d2460186f7233c927e7db2dcc703c0e500b653...",
      "dependencies": ["@openzeppelin/contracts/access/AccessControl.sol"],
      "deploymentInfo": {
        "address": "0x1234567890abcdef...",
        "transactionHash": "0xabcdef1234567890...",
        "blockNumber": 12345,
        "network": "testnet"
      }
    }
  ]
}
```

### Security Assessment

```json
{
  "security": {
    "auditStatus": "Internal Review Complete",
    "knownVulnerabilities": [],
    "securityChecks": [
      "Reentrancy protection",
      "Access control validation",
      "Integer overflow protection",
      "EXTCODEHASH verification",
      "CREATE2 deterministic deployment"
    ]
  }
}
```

## GitHub Actions Integration

### Automatic Triggers

- **Push to main/develop**: Generates SBOM for testnet
- **Pull Requests**: Generates SBOM and adds summary comment
- **Releases**: Generates SBOM for mainnet and attaches to release
- **Manual Dispatch**: Allows custom network selection

### Workflow Features

- **Artifact Upload**: SBOM files stored for 90 days
- **Release Assets**: Automatic attachment to GitHub releases
- **PR Comments**: Detailed SBOM summary in pull request comments
- **Security Scanning**: NPM audit integration

## Pre-deployment Hook

The pre-deployment system ensures quality and consistency before deployments:

### Validation Steps

1. **Git Status Check**: Ensures clean working tree for production
2. **Contract Compilation**: Verifies all contracts compile successfully
3. **Test Execution**: Runs acceptance test suite
4. **SBOM Generation**: Creates fresh bill of materials
5. **Configuration Validation**: Checks network settings and environment

### Configuration Options

```bash
# Basic usage
node scripts/pre-deploy.ts --network=testnet --verbose

# Skip SBOM for faster iteration
node scripts/pre-deploy.ts --skip-sbom --network=localhost

# Custom output directory
node scripts/pre-deploy.ts --output=./release-reports --network=mainnet
```

## File Locations

### Generated Files

- **SBOM Reports**: `./reports/sbom-{chainId}-{timestamp}.json`
- **Build Artifacts**: `./artifacts/` (compilation artifacts)
- **Coverage Reports**: `./coverage/` (test coverage data)

### Source Files

- **Generator Script**: `scripts/generate-sbom.ts`
- **Pre-deploy Hook**: `scripts/pre-deploy.ts`
- **Hardhat Task**: `tasks/sbom.ts`
- **GitHub Workflow**: `.github/workflows/sbom.yml`

## Integration Points

### Package.json Scripts

```json
{
  "scripts": {
    "sbom": "hardhat run scripts/generate-sbom.ts --network hardhat",
    "pre-deploy:testnet": "ts-node scripts/pre-deploy.ts --network=testnet --verbose",
    "deploy:testnet": "npm run pre-deploy:testnet && hardhat run scripts/deploy.ts --network testnet",
    "build": "npm run compile && npm run sbom",
    "ci": "npm run lint && npm run test && npm run coverage && npm run sbom"
  }
}
```

### Hardhat Configuration

```typescript
// hardhat.config.ts
import './tasks/sbom';

// Enable SBOM task
npx hardhat sbom --help
```

## Security Considerations

### Source Code Integrity

- **Hash Verification**: SHA-256 hashes for all source files
- **Bytecode Verification**: Keccak256 hashes for compiled bytecode
- **Dependency Tracking**: Complete import and dependency mapping

### Deployment Verification

- **Address Tracking**: Contract deployment addresses
- **Transaction Records**: Deployment transaction hashes
- **Network Validation**: Correct network deployment verification

### Audit Trail

- **Git Integration**: Commit hash and branch tracking
- **Timestamp Recording**: Precise generation timestamps
- **Version Control**: SBOM versioning and change tracking

## Troubleshooting

### Common Issues

#### OpenZeppelin Contracts Not Found

```bash
# Error: ENOENT: no such file or directory
# Solution: Install dependencies
npm install

# Or check node_modules path
ls node_modules/@openzeppelin/contracts/
```

#### Network Connection Issues

```bash
# Error: Cannot connect to network
# Solution: Use hardhat network for offline generation
npm run sbom  # Uses hardhat network by default
```

#### Git Information Missing

```bash
# Warning: Could not retrieve Git information
# Solution: Ensure git is installed and repository initialized
git status
git remote -v
```

### Debugging Options

```bash
# Verbose output for debugging
npx hardhat sbom --verbose

# Check specific contract compilation
npx hardhat compile --force

# Validate deployment files
ls deployments/*/
```

## Best Practices

### Development Workflow

1. **Generate SBOM** after significant contract changes
2. **Review SBOM** before deployments to verify dependencies
3. **Include SBOM** in security reviews and audits
4. **Archive SBOM** for compliance and historical tracking

### Production Deployment

1. **Always run pre-deploy** validation before mainnet deployments
2. **Verify SBOM** matches expected contract inventory
3. **Store SBOM** in secure artifact repository
4. **Document SBOM** changes in release notes

### Security Reviews

1. **Analyze dependencies** for known vulnerabilities
2. **Verify compiler settings** match security requirements
3. **Check deployment addresses** for correctness
4. **Validate source hashes** for integrity verification

## API Reference

### SBOM Interface

```typescript
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
```

### Contract Entry

```typescript
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
```

## Related Documentation

- [System Architecture](./SYSTEM_ARCHITECTURE.md) - Overall system design
- [Threat Model](./ThreatModel.md) - Security considerations
- [Deployment Guide](../README.md#deployment) - Deployment procedures
- [Testing Guide](../README.md#testing) - Test execution

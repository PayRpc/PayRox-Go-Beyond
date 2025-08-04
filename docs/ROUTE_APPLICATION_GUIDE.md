# PayRox Route Application Guide

## Overview

The PayRox Route Application system provides enterprise-grade functionality for applying manifest routes to the dispatcher contract. This guide covers the enhanced features and best practices for production deployments.

## Quick Start

### Basic Usage

```bash
# Apply routes with default settings
npm run routes:apply

# Preview changes without applying (recommended first)
npm run routes:apply:dry

# Apply with detailed logging
npm run routes:apply:verbose

# Skip confirmation prompts (automation)
npm run routes:apply:force
```

### Network-Specific Deployment

```bash
# Sepolia testnet with verbose logging
npm run routes:apply:sepolia

# Mainnet with verbose logging
npm run routes:apply:mainnet

# Custom network
npx hardhat run scripts/apply-all-routes.ts --network <network_name> -- --verbose
```

## Enhanced Features

### 🔍 **Dry Run Mode**
Preview all operations before execution:
```bash
npm run routes:apply:dry
# or
npx hardhat run scripts/apply-all-routes.ts -- --dry-run
```

### ⚙️ **Configurable Batch Processing**
Optimize gas usage and transaction reliability:
```bash
# Small batches for safety (default: 3)
npx hardhat run scripts/apply-all-routes.ts -- --batch-size 2

# Larger batches for efficiency
npx hardhat run scripts/apply-all-routes.ts -- --batch-size 5
```

### 🔄 **Retry Mechanisms**
Automatic retry with configurable attempts:
```bash
# Increase retry attempts for unreliable networks
npx hardhat run scripts/apply-all-routes.ts -- --max-retries 5
```

### 📊 **Progress Tracking**
Real-time progress indicators and detailed reporting:
- Batch-by-batch progress
- Gas usage tracking
- Success rate calculations
- Comprehensive summary reports

### 🛡️ **Safety Features**
- **Data Validation**: Comprehensive input validation with structured error reporting
- **State Verification**: Validates dispatcher state and prerequisites
- **Route Verification**: Post-application verification of applied routes
- **Timeout Protection**: 10-minute timeout prevents hanging operations
- **Confirmation Prompts**: Safety prompts (can be skipped with `--force`)

## Command Line Interface

### Available Options

```
OPTIONS:
  --dry-run              Preview changes without applying them
  --verbose, -v          Enable detailed logging
  --force                Skip confirmation prompts
  --help, -h             Show help message
  --batch-size <n>       Number of routes per batch (default: 3)
  --max-retries <n>      Maximum retry attempts (default: 3)
  --timeout <ms>         Operation timeout in milliseconds (default: 300000)
```

### Examples

```bash
# Development/Testing
npx hardhat run scripts/apply-all-routes.ts -- --dry-run --verbose

# Production deployment with custom settings
npx hardhat run scripts/apply-all-routes.ts -- --batch-size 3 --max-retries 5 --verbose

# Automated deployment (CI/CD)
npx hardhat run scripts/apply-all-routes.ts -- --force --timeout 600000
```

## Prerequisites

### 1. Committed Root
Routes cannot be applied without a pending root:
```bash
# Commit the current manifest first
npx hardhat run scripts/commit-root.ts
```

### 2. Valid Manifest Data
Ensure manifest files exist and are valid:
- `manifests/current.manifest.json`
- `manifests/current.merkle.json`

### 3. Deployed Dispatcher
The dispatcher contract must be deployed and accessible.

## Error Handling

The enhanced system provides structured error reporting with specific error codes:

### Common Error Codes

- **MANIFEST_NOT_FOUND**: Manifest file missing
- **MERKLE_NOT_FOUND**: Merkle data file missing
- **DISPATCHER_NOT_FOUND**: Dispatcher contract not found
- **NO_PENDING_ROOT**: No pending root committed
- **DISPATCHER_FROZEN**: Dispatcher is frozen/paused
- **LEAF_NOT_FOUND**: Route leaf not found in merkle tree
- **CONNECTION_ERROR**: Failed to connect to dispatcher

### Troubleshooting Guide

1. **No pending root error**:
   ```bash
   npx hardhat run scripts/commit-root.ts
   ```

2. **Dispatcher not found**:
   - Verify deployment artifacts exist
   - Check network configuration
   - Ensure correct network selected

3. **Manifest validation errors**:
   - Verify manifest structure
   - Check route field completeness
   - Validate address formats

4. **Gas limit issues**:
   - Reduce batch size: `--batch-size 1`
   - Increase gas limit in hardhat config

5. **Network connectivity**:
   - Increase timeout: `--timeout 600000`
   - Increase retries: `--max-retries 5`

## Production Best Practices

### 1. Pre-Deployment Validation
```bash
# Always run dry-run first
npm run routes:apply:dry

# Verify with verbose logging
npm run routes:apply:verbose --dry-run
```

### 2. Staging Environment Testing
Test on testnets before mainnet:
```bash
# Test on Sepolia
npm run routes:apply:sepolia
```

### 3. Mainnet Deployment
```bash
# Production deployment with safety measures
npm run routes:apply:mainnet

# Or with custom settings
npx hardhat run scripts/apply-all-routes.ts --network mainnet -- --verbose --batch-size 3
```

### 4. Post-Deployment Verification
The system automatically verifies applied routes, but you can also:
```bash
# Manual verification
npx hardhat run scripts/verify-routes.ts

# Activate the root after successful application
npx hardhat run scripts/activate-root.ts
```

## Integration with PayRox Workflow

### Complete Deployment Sequence

1. **Build and commit manifest**:
   ```bash
   npx hardhat run scripts/build-manifest.ts
   npx hardhat run scripts/commit-root.ts
   ```

2. **Apply routes (this script)**:
   ```bash
   npm run routes:apply:verbose
   ```

3. **Activate the root**:
   ```bash
   npx hardhat run scripts/activate-root.ts
   ```

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Apply Routes
  run: |
    npm run routes:apply:dry  # Preview
    npm run routes:apply:force  # Apply without prompts
```

## Monitoring and Observability

### Output Analysis

The enhanced system provides comprehensive reporting:

```
📊 ROUTE APPLICATION SUMMARY
===============================================================
📋 Total Routes: 27
✅ Successfully Applied: 27
❌ Failed: 0
📦 Batches Processed: 9
⛽ Total Gas Used: 1,387,245
⏱️ Duration: 45,234ms
📈 Success Rate: 100%
```

### Gas Optimization

- **Batch Size**: Balance between gas efficiency and safety
- **Gas Tracking**: Monitor per-batch and total gas usage
- **Optimization**: Use larger batches for gas efficiency, smaller for safety

## Advanced Configuration

### Custom Configuration

The system uses these default configurations:
```typescript
const CONFIG = {
  DEFAULT_BATCH_SIZE: 3,
  MAX_BATCH_SIZE: 10,
  MIN_BATCH_SIZE: 1,
  GAS_LIMIT_BUFFER: 1.2,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,
  TIMEOUT_MS: 300000,
  VERIFICATION_SAMPLE_SIZE: 3,
};
```

### Environment Variables

Set these for enhanced functionality:
```bash
export NODE_ENV=production  # Enables production safety features
export HARDHAT_NETWORK=mainnet  # Default network
```

## Security Considerations

### 1. Access Control
- Ensure deployer has appropriate permissions
- Verify dispatcher is not frozen
- Check pending root ownership

### 2. Validation
- All inputs are validated before processing
- Address format verification
- Merkle proof validation

### 3. Safety Mechanisms
- Dry-run capability for risk-free testing
- Confirmation prompts for production
- Automatic timeout protection
- Comprehensive error handling

## Support and Troubleshooting

### Getting Help

```bash
# Show detailed help
npx hardhat run scripts/apply-all-routes.ts -- --help
```

### Debug Mode

```bash
# Maximum verbosity for debugging
npx hardhat run scripts/apply-all-routes.ts -- --verbose --dry-run
```

### Common Issues

1. **"Routes cannot be applied"**: Run `commit-root.ts` first
2. **"Dispatcher not found"**: Check deployment artifacts
3. **"Gas limit exceeded"**: Reduce batch size
4. **"Network timeout"**: Increase timeout or check connectivity

---

## Conclusion

The enhanced PayRox Route Application system provides enterprise-grade reliability, safety, and monitoring for critical blockchain operations. Always test with dry-run mode first, and use verbose logging for production deployments.

For additional support, refer to the PayRox documentation or contact the development team.

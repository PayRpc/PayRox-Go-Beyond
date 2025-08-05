# PayRox Tasks Integration Guide

## Overview

PayRox Go Beyond includes custom Hardhat tasks that are now seamlessly integrated with npm scripts
for improved developer workflow. These tasks handle manifest verification, chunk operations, and
orchestration management.

## Available PayRox Tasks

### 1. Manifest Operations

#### Basic Manifest Check

```bash
npm run payrox:manifest:check --path=manifests/example.json
```

- Verifies ordered Merkle proofs
- Recomputes manifest hash
- Validates manifest structure

#### Full Manifest Verification (with Facet Check)

```bash
npm run payrox:manifest:verify --path=manifests/example.json
```

- Includes all basic checks
- Verifies facet EXTCODEHASH off-chain
- Detects empty or mismatched codehashes

### 2. Chunk Operations

#### Predict Chunk Address

```bash
npm run payrox:chunk:predict --factory=0x1234... --data=0xabcd...
# OR using a file
npm run payrox:chunk:predict --factory=0x1234... --file=test-chunk.hex
```

- Predicts deployment address using factory
- Returns predicted address and content hash
- Uses deterministic CREATE2 addresses

#### Stage Chunk Data

```bash
npm run payrox:chunk:stage --factory=0x1234... --data=0xabcd... --value=0.001
# OR using a file
npm run payrox:chunk:stage --factory=0x1234... --file=test-chunk.hex --value=0.001
```

- Stages data chunk via factory
- Handles fee requirements
- Enforces size limits

### 3. Orchestration

#### Start Orchestration

```bash
npm run payrox:orchestrator:start --orchestrator=0x1234... --id=0xabcd... --gasLimit=500000
```

- Initiates new orchestration plan
- Manages complex deployment sequences
- Provides gas limit control

### 4. Complete Workflow

#### Full PayRox Workflow

```bash
npm run payrox:workflow:full --path=manifests/example.json
```

- Runs manifest verification
- Predicts chunk addresses
- Provides deployment readiness check

## Task Parameters

### Common Parameters

| Parameter        | Required | Description               | Example                  |
| ---------------- | -------- | ------------------------- | ------------------------ |
| `--path`         | Yes\*    | Path to manifest JSON     | `manifests/example.json` |
| `--factory`      | Yes\*    | Factory contract address  | `0x1234...`              |
| `--data`         | Optional | Hex data to process       | `0xabcd...`              |
| `--file`         | Optional | File path for data        | `test-chunk.hex`         |
| `--value`        | Optional | ETH value for fees        | `0.001`                  |
| `--check-facets` | Optional | Enable facet verification | `true`                   |

\*Required for specific tasks

### Advanced Parameters

| Parameter        | Task               | Description                   |
| ---------------- | ------------------ | ----------------------------- |
| `--orchestrator` | orchestrator:start | Orchestrator contract address |
| `--id`           | orchestrator:start | Orchestration ID (bytes32)    |
| `--gasLimit`     | orchestrator:start | Gas limit for orchestration   |

## Usage Examples

### Complete Deployment Workflow

```bash
# 1. Verify manifest
npm run payrox:manifest:verify --path=manifests/production.json

# 2. Predict chunk addresses
npm run payrox:chunk:predict --factory=0x742d35Cc63C84a94e5f14f0fB33aEc03bC5e4B3F --file=test-chunk.hex

# 3. Stage chunks
npm run payrox:chunk:stage --factory=0x742d35Cc63C84a94e5f14f0fB33aEc03bC5e4B3F --file=test-chunk.hex --value=0.001

# 4. Start orchestration
npm run payrox:orchestrator:start --orchestrator=0x1234... --id=0xabcd... --gasLimit=500000
```

### Quick Verification

```bash
# Run the full workflow check
npm run payrox:workflow:full --path=manifests/staging.json
```

## Error Handling

The PayRox tasks include comprehensive error handling:

- **NetworkError**: Connection and blockchain-related issues
- **FILE_NOT_FOUND**: Missing manifest or data files
- **INVALID_FACTORY_ADDRESS**: Malformed contract addresses
- **CODEHASH_MISMATCH**: Facet verification failures
- **MANIFEST_NOT_FOUND**: Missing manifest files

## File Format Support

### Manifest Files

- JSON format with specific structure
- Support for `merkleRoot` or `root` fields
- Optional header for hash computation

### Data Files

- Hex files (with or without `0x` prefix)
- Binary files (auto-converted to hex)
- Text files containing hex data

## Integration Benefits

### Developer Experience

- **Shorter Commands**: `npm run payrox:manifest:check` vs `npx hardhat payrox:manifest:selfcheck`
- **Better Discoverability**: All PayRox tasks visible in `npm run`
- **Consistent Patterns**: Follows existing npm script conventions
- **IDE Integration**: Better VS Code task runner support

### Workflow Automation

- **Chained Operations**: Workflow scripts combine multiple tasks
- **Error Propagation**: Failed tasks halt workflow execution
- **Status Reporting**: Clear success/failure indicators
- **Log Integration**: Consistent logging across all tasks

## Security Considerations

### Manifest Verification

- Always verify manifests before deployment
- Check facet codehashes in production
- Validate Merkle proofs for integrity

### Chunk Operations

- Verify predicted addresses before staging
- Ensure adequate fees for successful staging
- Monitor gas usage for large chunks

### Orchestration

- Use appropriate gas limits
- Verify orchestrator permissions
- Monitor orchestration progress

## Troubleshooting

### Common Issues

1. **File Not Found**

   ```bash
   # Ensure absolute paths or relative to project root
   npm run payrox:manifest:check --path=./manifests/example.json
   ```

2. **Invalid Factory Address**

   ```bash
   # Use full 42-character address with 0x prefix
   npm run payrox:chunk:predict --factory=0x742d35Cc63C84a94e5f14f0fB33aEc03bC5e4B3F
   ```

3. **Missing Data**
   ```bash
   # Provide either --data or --file parameter
   npm run payrox:chunk:predict --factory=0x1234... --data=0xabcd...
   ```

### Debug Mode

For detailed logging, use the original Hardhat tasks directly:

```bash
npx hardhat payrox:manifest:selfcheck --path=manifests/example.json
```

## Development Integration

### VS Code Tasks

The PayRox npm scripts are automatically available in VS Code's task runner:

1. Press `Ctrl+Shift+P`
2. Type "Tasks: Run Task"
3. Select any PayRox script

### CI/CD Integration

Include PayRox verification in your pipeline:

```yaml
- name: Verify Manifests
  run: npm run payrox:manifest:verify --path=manifests/production.json
```

## Future Enhancements

- Interactive task selection
- Batch manifest processing
- Automated deployment workflows
- Real-time orchestration monitoring
- Enhanced error recovery mechanisms

For more information, see the main [README.md](../README.md) and
[PayRox documentation](./README.md).

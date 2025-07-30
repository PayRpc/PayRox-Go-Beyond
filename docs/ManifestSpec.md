# PayRox Go Beyond Manifest Specification

## Overview

The PayRox Go Beyond Manifest System provides a declarative approach to managing smart contract deployments, function routing, and upgrade orchestration. This specification defines the structure, validation rules, and operational semantics of manifests.

## Manifest Structure

### Core Components

1. **Header** - Metadata and versioning information
2. **Facets** - Contract components with function selectors
3. **Chunks** - Deployment units with bytecode and addresses
4. **Routing** - Function selector to implementation mapping
5. **Security** - Policies and constraints
6. **Merkle Tree** - Cryptographic verification structure

### Manifest Schema

```json
{
  "header": {
    "version": "string",
    "timestamp": "ISO8601 datetime",
    "deployer": "ethereum address",
    "chainId": "number",
    "previousHash": "bytes32"
  },
  "facets": [
    {
      "name": "string",
      "address": "ethereum address",
      "selectors": ["bytes4[]"],
      "isActive": "boolean",
      "priority": "number",
      "gasLimit": "number"
    }
  ],
  "chunks": [
    {
      "hash": "bytes32",
      "address": "ethereum address", 
      "size": "number",
      "deploymentBlock": "number",
      "verified": "boolean"
    }
  ],
  "merkleRoot": "bytes32",
  "signature": "bytes"
}
```

## Validation Rules

### Header Validation

- **Version**: Must follow semantic versioning (e.g., "1.0.0")
- **Timestamp**: Must be valid ISO8601 format
- **Deployer**: Must be valid Ethereum address
- **ChainId**: Must match target network
- **PreviousHash**: Must reference valid previous manifest (for upgrades)

### Facet Validation

- **Name**: Unique within manifest, 1-64 characters
- **Address**: Valid Ethereum address, contract must exist
- **Selectors**: Array of unique 4-byte function selectors
- **Priority**: Positive integer for execution ordering
- **GasLimit**: Must not exceed block gas limit

### Chunk Validation

- **Hash**: Must match actual bytecode hash
- **Address**: Must be deterministic CREATE2 address
- **Size**: Must not exceed maximum facet size (24KB)
- **Verified**: Must be true for production deployments

### Cross-Validation

- No duplicate selectors across facets
- All chunk addresses must be unique
- Merkle root must validate against chunks
- Signature must be from authorized deployer

## Security Policies

### Size Constraints

```yaml
maxFacetSize: 24576        # 24KB Ethereum limit
maxFacetCount: 256         # Maximum facets per manifest
maxSelectorsPerFacet: 64   # Function selector limit
```

### Required Events

All facets must emit these events:
- `Deploy(address indexed facet, bytes32 indexed salt)`
- `Upgrade(address indexed oldFacet, address indexed newFacet)`
- `Transfer(address indexed from, address indexed to)`

### Forbidden Operations

- Direct storage manipulation outside facet scope
- Calling unregistered selectors
- Bypassing dispatcher routing
- Modifying manifest without authorization

## Deployment Process

### 1. Manifest Generation

1. Parse facet configurations
2. Generate chunk mappings
3. Calculate deterministic addresses
4. Build Merkle tree
5. Sign manifest hash

### 2. Validation Pipeline

1. Schema validation
2. Security policy checks
3. Cross-reference validation
4. Signature verification
5. Network compatibility check

### 3. Deployment Execution

1. Deploy chunks via factory
2. Update dispatcher manifest
3. Verify chunk addresses
4. Update Merkle proofs
5. Emit deployment events

## Upgrade Semantics

### Compatible Upgrades

- Adding new facets
- Adding new selectors to existing facets
- Increasing gas limits
- Activating previously inactive facets

### Breaking Changes

- Removing selectors
- Changing selector implementations
- Modifying facet addresses
- Reducing gas limits

### Upgrade Process

1. Generate new manifest with `previousHash`
2. Validate upgrade compatibility
3. Deploy new chunks
4. Update dispatcher routing
5. Deactivate old facets (if needed)

## Merkle Tree Structure

### Tree Construction

```typescript
// Leaf nodes from chunk data
leaves = chunks.map(chunk => keccak256(encode(chunk)))

// Build tree bottom-up
while (leaves.length > 1) {
  nextLevel = []
  for (i = 0; i < leaves.length; i += 2) {
    if (i + 1 < leaves.length) {
      combined = keccak256(concat(leaves[i], leaves[i+1]))
      nextLevel.push(combined)
    } else {
      nextLevel.push(leaves[i])
    }
  }
  leaves = nextLevel
}

merkleRoot = leaves[0]
```

### Proof Verification

```solidity
function verifyChunk(
    bytes32 chunkHash,
    bytes32[] calldata proof,
    bytes32 merkleRoot
) external pure returns (bool) {
    bytes32 hash = chunkHash;
    
    for (uint256 i = 0; i < proof.length; i++) {
        bytes32 proofElement = proof[i];
        if (hash <= proofElement) {
            hash = keccak256(abi.encodePacked(hash, proofElement));
        } else {
            hash = keccak256(abi.encodePacked(proofElement, hash));
        }
    }
    
    return hash == merkleRoot;
}
```

## Error Handling

### Common Errors

- `InvalidManifestVersion`: Version format incorrect
- `InvalidSignature`: Signature verification failed
- `UnauthorizedDeployer`: Signer not authorized
- `FacetSizeExceeded`: Chunk too large
- `ChunkNotFound`: Referenced chunk missing
- `VerificationFailed`: Merkle proof invalid

### Recovery Procedures

1. **Invalid Manifest**: Regenerate with correct parameters
2. **Failed Deployment**: Retry with increased gas
3. **Verification Failure**: Check network state and retry
4. **Authorization Error**: Update deployer permissions

## Best Practices

### Development

- Always validate manifests before deployment
- Use deterministic salts for reproducible addresses
- Test upgrades on testnets first
- Keep manifest history for audit trails

### Production

- Require multi-signature for manifest updates
- Implement timelock for critical changes
- Monitor deployment events
- Maintain backup deployment configurations

### Security

- Regular security audits of facets
- Monitor for unexpected state changes
- Implement emergency pause mechanisms
- Validate all external calls

## Tooling

### CLI Commands

```bash
# Generate manifest
payrox manifest --build

# Validate manifest
payrox manifest --verify

# Deploy from manifest
payrox deploy --network mainnet

# Upgrade deployment
payrox upgrade --manifest new-manifest.json
```

### SDK Integration

```typescript
import { PayRoxSDK } from '@payrox/go-beyond-sdk';

const sdk = new PayRoxSDK(config);

// Deploy from manifest
await sdk.deployFromManifest(manifest);

// Verify deployment
const isValid = await sdk.verifyManifest(manifestHash);
```

## Appendix

### Function Selector Calculation

```javascript
const selector = ethers.id("functionName(uint256,string)").slice(0, 10);
```

### CREATE2 Address Calculation

```javascript
const address = ethers.getCreate2Address(
  factoryAddress,
  salt,
  ethers.keccak256(bytecode)
);
```

### Signature Generation

```javascript
const manifestHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(manifest)));
const signature = await signer.signMessage(ethers.getBytes(manifestHash));
```

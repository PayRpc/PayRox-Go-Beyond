# OrderedMerkle Library API Documentation

## Overview

The `OrderedMerkle` library provides position-aware Merkle proof verification with enhanced features
for the PayRox Go Beyond system. Unlike OpenZeppelin's MerkleProof which sorts hash pairs, this
library maintains position awareness for deterministic verification.

## Key Features

- **Position-Aware Verification**: Maintains left/right positioning without sorting
- **Selector-Based Routing**: Enhanced security with function selector + address + codehash
  validation
- **Gas Optimization**: Bitfield encoding for efficient proof processing
- **Legacy Compatibility**: Backward compatibility with boolean array positioning
- **Stateless Design**: Pure library functions compatible with Solidity linking

## API Reference

### Core Verification Functions

#### `processProof(bytes32 leaf, bytes32[] calldata proof, uint256 positions) → bytes32`

Processes an ordered Merkle proof using bitfield position encoding.

**Parameters:**

- `leaf`: The leaf hash to prove
- `proof`: Array of sibling hashes
- `positions`: Bitfield where bit i = 1 means sibling at proof[i] is on the right

**Returns:** Computed root hash

**Gas Cost:** ~2,000 + (proof.length × 500)

```solidity
bytes32 root = OrderedMerkle.processProof(leafHash, proofArray, 0b1010);
```

#### `verify(bytes32 leaf, bytes32[] calldata proof, uint256 positions, bytes32 root) → bool`

Verifies an ordered Merkle proof using bitfield encoding.

**Parameters:**

- `leaf`: The leaf hash to prove
- `proof`: Array of sibling hashes
- `positions`: Bitfield position encoding
- `root`: Expected root hash

**Returns:** `true` if proof is valid

```solidity
bool isValid = OrderedMerkle.verify(leafHash, proofArray, 0b1010, expectedRoot);
```

### Legacy Compatibility Functions

#### `verify(bytes32[] memory proof, bool[] memory isRight, bytes32 root, bytes32 leaf) → bool`

Legacy verification function with boolean array positioning (for backward compatibility).

**Parameters:**

- `proof`: Array of sibling hashes (memory)
- `isRight`: Boolean array indicating right (true) or left (false) positioning
- `root`: Expected root hash
- `leaf`: The leaf hash to prove

**Returns:** `true` if proof is valid

```solidity
bool[] memory positions = new bool[](2);
positions[0] = false; // left
positions[1] = true;  // right
bool isValid = OrderedMerkle.verify(proofArray, positions, expectedRoot, leafHash);
```

### Enhanced Routing Functions

#### `leafOfSelectorRoute(bytes4 selector, address facet, bytes32 codehash) → bytes32`

Creates deterministic leaf hash for selector-based routing with enhanced security.

**Parameters:**

- `selector`: Function selector (4 bytes)
- `facet`: Implementation contract address
- `codehash`: Expected codehash for validation

**Returns:** Deterministic leaf hash

**Security:** Uses prefix `0x00` to prevent collision attacks

```solidity
bytes32 leaf = OrderedMerkle.leafOfSelectorRoute(
    bytes4(keccak256("transfer(address,uint256)")),
    facetAddress,
    facetAddress.codehash
);
```

#### `verifyRoute(bytes4 selector, address facet, bytes32 codehash, bytes32[] calldata proof, uint256 positions, bytes32 root) → bool`

Verifies a route proof with enhanced security validation.

**Parameters:**

- `selector`: Function selector
- `facet`: Implementation address
- `codehash`: Expected codehash
- `proof`: Merkle proof array
- `positions`: Bitfield positions
- `root`: Expected root hash

**Returns:** `true` if route proof is valid

```solidity
bool isValidRoute = OrderedMerkle.verifyRoute(
    selector,
    facetAddress,
    expectedCodehash,
    proof,
    positions,
    manifestRoot
);
```

## Position Encoding

### Bitfield Format (LSB-first)

The `positions` parameter uses LSB-first bitfield encoding:

```
Position 0: bit 0 (LSB)
Position 1: bit 1
Position 2: bit 2
...
Position 255: bit 255 (MSB)
```

**Example:**

- `positions = 0b1010` means: pos[0]=0 (left), pos[1]=1 (right), pos[2]=0 (left), pos[3]=1 (right)

### Boolean Array Conversion

To convert boolean arrays to bitfield:

```solidity
function boolArrayToBitfield(bool[] memory isRight) pure returns (uint256 positions) {
    positions = 0;
    for (uint256 i = 0; i < isRight.length; i++) {
        if (isRight[i]) {
            positions |= (1 << i);
        }
    }
}
```

## Security Considerations

### Hash Prefixing

The library uses domain separation to prevent collision attacks:

- **Leaf hashes**: `keccak256(0x00 || data)`
- **Node hashes**: `keccak256(0x01 || left || right)`

### Bounds Checking

- Maximum proof length: 256 elements
- Input validation prevents overflow attacks
- Gas limit protection for large proofs

### Route Security

Selector-based routing includes:

- Function selector (4 bytes)
- Implementation address (20 bytes)
- Expected codehash (32 bytes)

This prevents:

- Function selector collisions
- Implementation substitution attacks
- Code modification after deployment

## Migration Guide

### From Old API

**Old Code:**

```solidity
// Old API (removed)
bool valid = OrderedMerkle.verify(proof, isRight, root, leaf);
bytes32 computed = OrderedMerkle.processProof(proof, isRight, leaf);
```

**New Code:**

```solidity
// New API - Option 1: Use legacy compatibility
bool valid = OrderedMerkle.verify(proof, isRight, root, leaf);

// New API - Option 2: Convert to bitfield (more efficient)
uint256 positions = convertBoolArrayToBitfield(isRight);
bool valid = OrderedMerkle.verify(leaf, proof, positions, root);
bytes32 computed = OrderedMerkle.processProof(leaf, proof, positions);
```

### For ManifestDispatcher Integration

The `ManifestDispatcher` now uses enhanced security with `leafOfSelectorRoute`:

```solidity
// Enhanced security leaf generation
bytes32 leaf = OrderedMerkle.leafOfSelectorRoute(selector, facet, codehash);
require(OrderedMerkle.verify(proof, isRight, pendingRoot, leaf), "bad proof");
```

## Performance Characteristics

| Operation                     | Gas Cost     | Notes                         |
| ----------------------------- | ------------ | ----------------------------- |
| `processProof` (8 proofs)     | ~6,000       | Bitfield encoding             |
| `verify` (8 proofs)           | ~6,200       | Includes root comparison      |
| `leafOfSelectorRoute`         | ~1,500       | Deterministic leaf generation |
| Boolean → Bitfield conversion | ~300/element | One-time conversion cost      |

## Error Codes

| Error                 | Description                                | Mitigation                              |
| --------------------- | ------------------------------------------ | --------------------------------------- |
| `ProofLengthMismatch` | Proof and position arrays differ in length | Ensure array lengths match              |
| `ProofTooLong`        | Proof exceeds 256 elements                 | Use smaller proof or chunk verification |

## Integration Examples

### Basic Verification

```solidity
import {OrderedMerkle} from "./utils/OrderedMerkle.sol";

contract MyContract {
    function verifyUserProof(
        bytes32 userLeaf,
        bytes32[] calldata proof,
        uint256 positions,
        bytes32 merkleRoot
    ) external pure returns (bool) {
        return OrderedMerkle.verify(userLeaf, proof, positions, merkleRoot);
    }
}
```

### Route Verification

```solidity
contract Dispatcher {
    function validateRoute(
        bytes4 selector,
        address implementation,
        bytes32[] calldata proof,
        uint256 positions
    ) internal view returns (bool) {
        bytes32 expectedCodehash = implementation.codehash;
        return OrderedMerkle.verifyRoute(
            selector,
            implementation,
            expectedCodehash,
            proof,
            positions,
            currentManifestRoot
        );
    }
}
```

---

_This documentation covers OrderedMerkle library v2.0 as implemented in PayRox Go Beyond Phase 2._

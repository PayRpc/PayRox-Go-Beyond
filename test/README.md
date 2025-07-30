# CI Acceptance Tests

This directory contains acceptance tests that should be run in CI to ensure production readiness.

## Test Files

### 1. `facet-size-cap.spec.ts`
**Purpose**: Verify all facets respect EIP-170 runtime size limits (≤ 24,576 bytes)

**What it tests**:
- ExampleFacetA runtime bytecode size
- ExampleFacetB runtime bytecode size
- Fails build if any facet exceeds limit

**Run with**:
```bash
npx hardhat test test/facet-size-cap.spec.ts
```

### 2. `orchestrator-integration.spec.ts` 
**Purpose**: Unit test that Orchestrator properly integrates with IChunkFactory

**What it tests**:
- `orchestrateStage()` calls `IChunkFactory.stage()` and emits `ChunksStaged`
- `orchestrateStageBatch()` calls `IChunkFactory.stageBatch()` and emits `ChunksStaged`
- Component noting emits `ComponentNoted` events
- Orchestration lifecycle emits `OrchestrationStarted` and `OrchestrationCompleted`

**Run with**:
```bash
npx hardhat test test/orchestrator-integration.spec.ts
```

### 3. `route-proof-selfcheck.ts`
**Purpose**: Verify manifest Merkle proofs against computed leaves

**What it does**:
- Loads current manifest from `manifests/current.manifest.json`
- Recomputes leaves using `keccak256(abi.encode(selector, facet, codehash))`
- Rebuilds Merkle tree with ordered-pair hashing (no sorting)
- Verifies each proof against the manifest root
- Ensures OpenZeppelin MerkleProof compatibility

**Run with**:
```bash
npx hardhat run scripts/route-proof-selfcheck.ts
```

## Integration with CI

Add these commands to your CI pipeline:

```yaml
# In your GitHub Actions workflow or similar
- name: Run Facet Size Cap Tests
  run: npx hardhat test test/facet-size-cap.spec.ts

- name: Run Orchestrator Integration Tests  
  run: npx hardhat test test/orchestrator-integration.spec.ts

- name: Run Route Proof Self-Check
  run: npx hardhat run scripts/route-proof-selfcheck.ts --network hardhat
```

## Expected Outputs

### Facet Size Cap Test
```
  FacetSizeCap
    ExampleFacetA runtime size: 1234 bytes
    ✓ Should verify ExampleFacetA runtime size is within EIP-170 limit
    ExampleFacetB runtime size: 2345 bytes  
    ✓ Should verify ExampleFacetB runtime size is within EIP-170 limit
```

### Orchestrator Integration Test
```
  OrchestratorIntegration
    orchestrateStage
      ✓ Should call IChunkFactory.stage and emit ChunksStaged event
    orchestrateStageBatch
      ✓ Should call IChunkFactory.stageBatch and emit ChunksStaged event
    componentNote
      ✓ Should emit ComponentNoted event when noting components
    orchestration lifecycle
      ✓ Should emit OrchestrationStarted and OrchestrationCompleted events
```

### Route Proof Self-Check
```
🔍 Starting Route Proof Self-Check...
📋 Loaded manifest with 5 routes
🌳 Building Merkle tree from computed leaves...
📊 Computed root: 0x1234...
📊 Manifest root: 0x1234...
✅ Merkle root matches computed value
✅ Valid proof for selector 0x12345678
✅ Valid proof for selector 0x23456789
...
🎯 All route proofs verified successfully!
✅ Route Proof Self-Check completed
```

## Troubleshooting

### "Facet size exceeds EIP-170 limit"
- Review facet implementation for optimization opportunities
- Consider splitting large facets into smaller components
- Use assembly optimizations where appropriate

### "Invalid proof for selector"  
- Check manifest generation process
- Verify ordered-pair hashing implementation
- Ensure no sorting during Merkle tree construction

### "No routes found in manifest"
- Verify manifest file exists at `manifests/current.manifest.json`
- Check manifest generation scripts
- Ensure proper manifest structure

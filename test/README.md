# CI Acceptance Tests

This directory contains acceptance tests that should be run in CI to ensure production readiness and
comprehensive test coverage.

**📋 For Complete Technical Reference**: See
[`docs/AI_TOOLCHAIN_TECHNICAL_REFERENCE.md`](../docs/AI_TOOLCHAIN_TECHNICAL_REFERENCE.md) for
comprehensive documentation of the entire PayRox Go Beyond AI-powered ecosystem.

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

### 3. `coverage-boost.spec.ts` ⭐ **NEW**

**Purpose**: Comprehensive coverage enhancement targeting specific uncovered lines across all
contracts

**What it tests**:

- **ExampleFacetB edge cases**: Complex validation scenarios, batch processing limits, toggle state
  management
- **DeterministicChunkFactory advanced features**: Fee sweeping, batch operations, edge case
  handling
- **ManifestUtils comprehensive coverage**: Input validation, error handling, edge cases
- **TestOrderedMerkle complete verification**: All proof validation scenarios and edge cases
- **System integration patterns**: Cross-contract interactions and state management

**Coverage Achievement**:

- **Overall**: 89.66% → 93.79% (+4.13 percentage points)
- **ExampleFacetB**: 83.33% → 96.67% (+13.34 points)
- **DeterministicChunkFactory**: 87.5% → 93.75% (+6.25 points)
- **TestOrderedMerkle**: 75% → 100% (+25 points)

**Run with**:

```bash
npx hardhat test test/coverage-boost.spec.ts
```

### 4. `route-proof-selfcheck.ts`

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

- name: Run Coverage Enhancement Tests
  run: npx hardhat test test/coverage-boost.spec.ts

- name: Run Route Proof Self-Check
  run: npx hardhat run scripts/route-proof-selfcheck.ts --network hardhat
```

## Expected Outputs

### Facet Size Cap Test

```text
  FacetSizeCap
    ExampleFacetA runtime size: 1234 bytes
    ✓ Should verify ExampleFacetA runtime size is within EIP-170 limit
    ExampleFacetB runtime size: 2345 bytes
    ✓ Should verify ExampleFacetB runtime size is within EIP-170 limit
```

### Orchestrator Integration Test

```text
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

### Coverage Enhancement Test

```text
  Coverage Enhancement Tests
    ExampleFacetB Advanced Tests
      ✓ Should handle batch processing with multiple items
      ✓ Should validate complex validation scenarios
      ✓ Should manage toggle state transitions
    DeterministicChunkFactory Advanced Tests
      ✓ Should handle fee sweeping operations
      ✓ Should process batch operations efficiently
      ✓ Should handle edge cases properly
    ManifestUtils Comprehensive Tests
      ✓ Should validate all input scenarios
      ✓ Should handle error conditions gracefully
    TestOrderedMerkle Complete Tests
      ✓ Should verify all proof validation scenarios
      ✓ Should handle edge cases in Merkle operations

  175 passing tests (up from 166)
  Test Coverage: 93.79% (up from 89.66%)
```

### Route Proof Self-Check

```text
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

## AI Toolchain Integration

PayRox Go Beyond includes a complete AI-powered development toolchain:

### 🤖 **FacetForge** (`tools/facetforge/`)

- **Intelligent Contract Analysis**: Complete Solidity parsing and complexity analysis
- **Automated Chunking**: 3-strategy optimization (function/feature/gas)
- **Manifest Generation**: PayRox-compatible deployment manifests
- **CLI Tools**: Command-line interface for contract processing

### 🎨 **AI Assistant** (`tools/ai-assistant/`)

- **Backend Services**: REST API with AI-powered analysis
- **Frontend Interface**: Modern React UI for contract development
- **Storage Safety**: Automated storage layout conflict detection
- **Deployment Simulation**: Full deployment preview and validation

### 🧠 **Core AI Services**

- **ContractRefactorWizard**: AI-powered facet suggestions
- **FacetSimulator**: Inter-facet interaction testing
- **StorageLayoutChecker**: Comprehensive storage safety validation
- **DeploymentAssistant**: Orchestrated deployment configuration

**📖 Complete Documentation**:
[`docs/AI_TOOLCHAIN_TECHNICAL_REFERENCE.md`](../docs/AI_TOOLCHAIN_TECHNICAL_REFERENCE.md)

# Coverage threshold for CI/CD
## Repository Coverage Standards

This project maintains high code coverage standards:

- **Target Coverage**: 80%+ for smart contracts
- **Minimum Coverage**: 70% (CI failure threshold)
- **Critical Components**: 90%+ (security-sensitive code)

## Current Coverage Status

Based on latest coverage report:

### Core Contracts
- ✅ **DeterministicChunkFactory**: 87.5% (EXCELLENT)
- ✅ **ManifestDispatcher**: 89.7% (EXCELLENT) 
- ⚠️ **Orchestrator**: 76.3% (GOOD - could improve)

### Utility Libraries
- ❌ **ManifestUtils**: 0% (NEEDS TESTS - new tests added)
- ⚠️ **OrderedMerkle**: 42.9% (NEEDS IMPROVEMENT)

### Facets
- ❌ **ExampleFacetA**: 0% (NEEDS TESTS - new tests added)
- ❌ **ExampleFacetB**: 0% (NEEDS TESTS - new tests added)
- ✅ **PingFacet**: 50% (ACCEPTABLE)

## Coverage Improvement Plan

1. **New test files added**:
   - `test/manifest-utils.spec.ts` - Comprehensive ManifestUtils testing
   - `test/example-facets.spec.ts` - Example facets testing
   - `contracts/test/TestManifestUtils.sol` - Test helper contract

2. **Expected coverage improvements**:
   - ManifestUtils: 0% → 80%+
   - ExampleFacets: 0% → 70%+
   - Overall: 40% → 65%+

3. **Next priorities**:
   - Improve OrderedMerkle coverage
   - Add edge case tests for Orchestrator
   - Enhance dispatcher branch coverage

## Running Coverage

```bash
npm run coverage
```

Coverage reports are generated in `./coverage/` directory.

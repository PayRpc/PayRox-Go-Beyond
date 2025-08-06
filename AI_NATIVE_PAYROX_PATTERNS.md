# AI Native PayRox Architecture Learning

## Core Architecture Discovery

### 1. PayRox is NOT EIP-2535 Diamond Standard
- **IDiamondLoupe.sol** clearly states "NON-STANDARD" multiple times
- Uses "manifest-based facet introspection" instead of diamond cuts
- "Provides limited compatibility with diamond ecosystem while maintaining PayRox's unique manifest-based architecture"

### 2. Manifest-Based Routing System
- Function routing via "manifest routes, not diamond storage" 
- Facets deployed via "PayRox manifest system"
- Returns "current manifest state, not diamond cuts"
- Resolves via "manifest routes, not diamond storage"

### 3. Isolated Facet Storage
- "isolated facet storage" mentioned in interface
- Each facet has unique storage slots using keccak256
- No shared diamond storage pattern

## Learning Targets for AI System

### Native Contract Analysis Required:
1. **LibDiamond.sol** - Core library functions (NOT standard diamond)
2. **ManifestDispatcher.sol** - Routing implementation
3. **DeterministicChunkFactory.sol** - Deployment patterns
4. **Native facets** - Real patterns and modifiers
5. **Test contracts** - Usage examples

### Critical Questions to Answer:
1. What modifier functions exist in LibDiamond?
2. How does dispatcher gating actually work?
3. What are the real access control patterns?
4. How is initialization handled in native facets?
5. What are the actual security modifier stacks?

### AI Generation Issues to Fix:
- Using non-existent LibDiamond functions (enforceIsDispatcher, enforceRole)
- Incorrect modifier patterns
- Wrong access control mechanisms
- Misunderstanding of dispatcher routing

## Next Steps:
1. Scan all native contracts for actual patterns
2. Extract real modifier and access control usage
3. Document actual LibDiamond functions available
4. Update AI generation templates with correct patterns
5. Test against native contract compilation requirements

# AI Architecture Knowledge Base

## PayRox System Architecture (DEFINITIVE)

### ❌ **What PayRox IS NOT:**
- NOT an EIP-2535 Diamond
- NOT using shared Diamond storage
- NOT supporting runtime Diamond cuts
- NOT implementing standard Diamond Loupe (only compatibility interface)

### ✅ **What PayRox ACTUALLY IS:**
- **Manifest-Router Architecture** with cryptographic verification
- **Ordered-pair Merkle manifests** (commit → apply → activate)
- **EXTCODEHASH gates** before every DELEGATECALL
- **Emergency forbiddenSelectors override** with audit trail
- **Immutable routes** after deployment freeze
- **Isolated per-facet storage** (zero cross-facet interference)

## AI Deployment Instructions

When deploying or analyzing PayRox contracts, the AI should:

### 1. **Architecture Recognition**
```typescript
// CORRECT understanding:
const architecture = "MANIFEST_ROUTER"; // NOT "DIAMOND"
const storageModel = "ISOLATED_PER_FACET"; // NOT "SHARED_DIAMOND"
const upgradeModel = "IMMUTABLE_ROUTES"; // NOT "DIAMOND_CUTS"
```

### 2. **Deployment Pattern**
```typescript
// Manifest-Router deployment workflow:
// 1. Deploy ManifestDispatcher (router, not diamond proxy)
// 2. Deploy individual facets with isolated storage
// 3. Generate Merkle manifest with route proofs
// 4. Commit → Apply → Activate manifest
// 5. Routes become immutable after freeze
```

### 3. **Security Model**
```typescript
// PayRox security features:
const securityFeatures = {
  routeVerification: "Merkle proofs required for all routes",
  storageIsolation: "Each facet has unique namespace",
  emergencyControls: "forbiddenSelectors override with audit",
  governance: "COMMIT_ROLE, APPLY_ROLE, EMERGENCY_ROLE separation",
  immutability: "Routes cannot be changed after freeze"
};
```

### 4. **Current Facet Inventory**
```typescript
const currentFacets = {
  essential: [
    "ChunkFactoryFacet", // 24.0KB - External contract helper
    "ExampleFacetA",     // ~8KB - Message handling  
    "ExampleFacetB",     // ~10KB - Governance with EIP-712
    "TerraStakeCoreFacet", // 8.1KB - Core staking logic
    "TerraStakeTokenFacet", // 12.5KB - Token management
    "TerraStakeInsuranceFacet" // 10.5KB - Insurance system
  ],
  total: "6 facets, 109.9KB ecosystem",
  removed: ["PingFacet"] // Eliminated as non-essential
};
```

### 5. **Integration Health Score**
- **Current Score**: 90/100 (Excellent)
- **Storage Collisions**: 0 (perfect isolation)
- **Router Integrity**: Active with EXTCODEHASH gates
- **Governance**: Full role separation implemented

## AI Response Guidelines

When asked about PayRox architecture, always:

1. ✅ **Clarify it's Manifest-Router, not Diamond**
2. ✅ **Explain the security benefits of immutable routes**
3. ✅ **Mention isolated storage (no cross-facet interference)**
4. ✅ **Describe the Merkle proof verification system**
5. ✅ **Note emergency controls and governance model**

When deploying or analyzing:

1. ✅ **Look for ManifestDispatcher (not DiamondProxy)**
2. ✅ **Verify facet storage isolation patterns**
3. ✅ **Check for EXTCODEHASH gates in routing**
4. ✅ **Validate Merkle manifest structure**
5. ✅ **Confirm role-based governance setup**

## Common Misconceptions to Correct

❌ **"PayRox uses Diamond cuts for upgrades"**  
✅ **Correct**: PayRox uses immutable routes with manifest-based evolution

❌ **"Facets share Diamond storage"**  
✅ **Correct**: Each facet has isolated storage namespace

❌ **"It's a standard EIP-2535 implementation"**  
✅ **Correct**: It's a next-generation Manifest-Router architecture

❌ **"IDiamondLoupe indicates full Diamond compliance"**  
✅ **Correct**: IDiamondLoupe is only for ecosystem tooling compatibility

*Last Updated: 2025-08-05T01:59:41.389Z*
*Based on: 2025-07-30 architecture snapshot analysis*

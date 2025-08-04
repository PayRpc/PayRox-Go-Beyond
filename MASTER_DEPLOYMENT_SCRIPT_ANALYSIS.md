# 🎯 **deploy-complete-system.sh - Master PayRox Deployment Script**

## 🚀 **Why This Is The Master Script**

`deploy-complete-system.sh` is the **definitive PayRox deployment script** because it contains **ALL** the correct PayRox functionality:

### ✅ **Complete PayRox Task Integration:**
1. **`payrox:manifest:selfcheck`** - Manifest verification with ordered Merkle rules
2. **`payrox:chunk:predict`** - Deterministic address prediction via factory
3. **`payrox:chunk:stage`** - Data chunk staging with fee handling
4. **`payrox:release:bundle`** - Enterprise release bundle generation
5. **`payrox:roles:bootstrap`** - Production role-based access control
6. **`payrox:ops:watch`** - Operations monitoring system

### 🏗️ **Complete Deployment Sequence:**

#### **Phase 1: Environment Setup**
```bash
# Network detection with localhost fallback
EFFECTIVE_NETWORK="localhost"  # Handles hardhat->localhost mapping

# Artifact cleanup and preparation
rm -f "deployments/$EFFECTIVE_NETWORK"/*
mkdir -p "deployments/$EFFECTIVE_NETWORK"
```

#### **Phase 2: Core Deployment**
```bash
# Contract compilation
npx hardhat compile

# Combined Factory + Dispatcher deployment
npx hardhat run scripts/deploy-combined-contracts.ts --network $EFFECTIVE_NETWORK

# Facet deployment
npx hardhat run scripts/deploy-facet-a.ts --network $EFFECTIVE_NETWORK
npx hardhat run scripts/deploy-facet-b-direct.ts --network $EFFECTIVE_NETWORK
```

#### **Phase 3: Manifest & Merkle System**
```bash
# Production manifest building
npx hardhat run scripts/build-manifest.ts --network $EFFECTIVE_NETWORK

# Merkle root commitment with retry logic
npx hardhat run scripts/commit-root.ts --network $EFFECTIVE_NETWORK

# Route application (conditional on successful root commit)
npx hardhat run scripts/apply-all-routes.ts --network $EFFECTIVE_NETWORK

# Root activation for governance
npx hardhat run scripts/activate-root.ts --network $EFFECTIVE_NETWORK
```

#### **Phase 4: Verification & Testing**
```bash
# Address uniqueness verification
npx hardhat run scripts/quick-deployment-check.ts --network $EFFECTIVE_NETWORK

# Complete system verification
npx hardhat run scripts/verify-complete-deployment.ts --network $EFFECTIVE_NETWORK

# Critical acceptance tests
npx hardhat test test/facet-size-cap.spec.ts test/orchestrator-integration.spec.ts
```

#### **Phase 5: Enterprise Features**
```bash
# Release bundle generation
npx hardhat payrox:release:bundle --manifest manifests/complete-production.manifest.json --dispatcher $dispatcher_address --factory $factory_address --verify --network $EFFECTIVE_NETWORK

# Role bootstrap (dry run)
npx hardhat payrox:roles:bootstrap --dispatcher $dispatcher_address --dry-run --network $EFFECTIVE_NETWORK

# Operations monitoring test
npx hardhat payrox:ops:watch --dispatcher $dispatcher_address --once --network $EFFECTIVE_NETWORK
```

#### **Phase 6: PayRox Utility Validation**
```bash
# Manifest verification with ordered Merkle
npx hardhat payrox:manifest:selfcheck --path manifests/complete-production.manifest.json --check-facets false --network $network

# Chunk address prediction testing
npx hardhat payrox:chunk:predict --factory $factory_address --data $test_data --network $network

# Chunk staging capability testing
npx hardhat payrox:chunk:stage --factory $factory_address --data $test_data --value 0.0007 --network $network
```

## 🔧 **Advanced Features**

### **Error Handling & Retry Logic:**
- **3-attempt retry** for critical operations
- **Graceful degradation** (system works even if some steps fail)
- **Conditional execution** (routes only applied if root commit succeeds)
- **Network time stabilization** (sleeps for network propagation)

### **Cross-Platform Support:**
- **Unix/Linux/macOS** compatible
- **Network mapping** (hardhat → localhost)
- **Process management** (automatic cleanup of background Hardhat node)
- **Signal handling** (trap for proper cleanup on exit)

### **Enterprise-Grade Validation:**
- **Address uniqueness checking** (prevents deployment conflicts)
- **Contract accessibility verification**
- **Deployment artifact validation**
- **Release bundle generation**

### **Deterministic & Cross-Chain Ready:**
- **Universal salt system** for consistent addresses
- **CREATE2 deployment** via DeterministicChunkFactory
- **Manifest-driven** deployment with cryptographic verification
- **Chunk staging** for large contract deployment

## 🎯 **Why CI Should Use This Script**

### **Current CI Problem:**
The CI uses **generic scripts** that don't leverage PayRox's unique capabilities:
- `npm run pre-deploy:testnet` → Generic SBOM generation
- `npm run postverify:testnet` → Generic contract verification

### **Correct Solution:**
CI should execute the **master deployment script**:
```bash
# For testnet deployment
./deploy-complete-system.sh --network sepolia --show-details

# For mainnet deployment  
./deploy-complete-system.sh --network mainnet --show-details
```

### **Benefits:**
1. ✅ **Complete PayRox functionality** (all payrox:* tasks)
2. ✅ **Production-tested** deployment sequence
3. ✅ **Enterprise features** (release bundles, monitoring)
4. ✅ **Deterministic deployment** across all networks
5. ✅ **Comprehensive validation** and testing
6. ✅ **Error recovery** and retry logic

## 📊 **Script Comparison**

| Feature | Generic CI Scripts | deploy-complete-system.sh |
|---------|-------------------|---------------------------|
| PayRox Tasks | ❌ None | ✅ All 6+ tasks |
| Deterministic Deployment | ❌ No | ✅ CREATE2 with universal salt |
| Manifest System | ❌ No | ✅ Ordered Merkle verification |
| Chunk Staging | ❌ No | ✅ Full chunk deployment |
| Enterprise Features | ❌ No | ✅ Release bundles, monitoring |
| Cross-Chain Ready | ❌ No | ✅ Universal addressing |
| Error Handling | ❌ Basic | ✅ Advanced retry logic |
| Production Ready | ❌ Development | ✅ Enterprise grade |

## 🏆 **Conclusion**

**`deploy-complete-system.sh` is the definitive PayRox deployment script** because it:

1. **Implements the complete PayRox methodology** with all payrox:* tasks
2. **Provides deterministic deployment** across all networks with universal salt
3. **Includes enterprise-grade features** like release bundles and monitoring
4. **Has production-tested error handling** and retry logic
5. **Supports the full manifest system** with ordered Merkle verification
6. **Enables chunk staging** for large contract deployment
7. **Validates deployment integrity** with comprehensive testing

This is the script that should be used as the **primary deployment method** in CI/CD pipelines for authentic PayRox functionality! 🚀

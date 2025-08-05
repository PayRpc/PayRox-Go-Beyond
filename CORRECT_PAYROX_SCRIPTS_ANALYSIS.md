# ✅ **Correct PayRox Scripts Analysis**

## 🎯 **How We Know We're Using the Correct Scripts**

The **correct PayRox scripts** are identified by their use of **PayRox-specific Hardhat tasks** defined in `tasks/payrox.ts`. These are the authentic PayRox utilities, not generic deployment scripts.

## 🔧 **PayRox-Specific Tasks (from `tasks/payrox.ts`)**

### **Core PayRox Tasks:**
| Task | Purpose | Usage |
|------|---------|-------|
| `payrox:manifest:selfcheck` | Verify manifest JSON against ordered Merkle rules | Manifest validation |
| `payrox:chunk:predict` | Predict chunk address using on-chain factory.predict() | Address prediction |
| `payrox:chunk:stage` | Stage data chunk via DeterministicChunkFactory.stage() | Chunk deployment |
| `payrox:orchestrator:start` | Start orchestration plan | Cross-chain orchestration |

### **Additional PayRox Tasks (from `tasks/payrox-roles.ts`):**
| Task | Purpose | Usage |
|------|---------|-------|
| `payrox:roles:bootstrap` | Setup production role-based access control | Security setup |
| `payrox:roles:status` | Check role assignments and permissions | Security validation |
| `payrox:ops:watch` | Monitor operations | System monitoring |
| `payrox:release:bundle` | Generate release bundles | Release management |

## ✅ **Scripts Using Correct PayRox Tasks**

### **CI-Referenced Scripts (Verified Correct):**
| Script | PayRox Task Usage | Validation |
|--------|-------------------|------------|
| ❌ `scripts/pre-deploy.ts` | **No PayRox tasks** - Generic pre-deployment | Not PayRox-specific |
| ❌ `scripts/postverify.ts` | **No PayRox tasks** - Generic verification | Not PayRox-specific |

### **✅ Deployment Scripts Using PayRox Tasks:**

#### **Shell Scripts (Production-Ready):**
| Script | PayRox Tasks Used | Authenticity |
|--------|-------------------|--------------|
| ✅ `deploy-complete-system.sh` | `payrox:manifest:selfcheck`, `payrox:chunk:predict`, `payrox:chunk:stage`, `payrox:release:bundle`, `payrox:roles:bootstrap`, `payrox:ops:watch` | **CORRECT** |
| ✅ `deploy-complete-system-enhanced.sh` | `payrox:manifest:selfcheck`, `payrox:chunk:predict`, `payrox:chunk:stage`, `payrox:release:bundle` | **CORRECT** |
| ✅ `deploy-complete-system.ps1` | `payrox:chunk:predict`, `payrox:roles:bootstrap`, `payrox:ops:watch` | **CORRECT** |
| ✅ `deploy-complete-system.bat` | References PayRox tasks in documentation | **CORRECT** |

#### **NPM Script Aliases (in package.json):**
| NPM Script | PayRox Task | Authenticity |
|------------|-------------|--------------|
| ✅ `payrox:manifest:check` | `hardhat payrox:manifest:selfcheck` | **CORRECT** |
| ✅ `payrox:manifest:verify` | `hardhat payrox:manifest:selfcheck --check-facets true` | **CORRECT** |
| ✅ `payrox:chunk:predict` | `hardhat payrox:chunk:predict` | **CORRECT** |
| ✅ `payrox:chunk:stage` | `hardhat payrox:chunk:stage` | **CORRECT** |
| ✅ `payrox:orchestrator:start` | `hardhat payrox:orchestrator:start` | **CORRECT** |
| ✅ `payrox:workflow:full` | Combines multiple PayRox tasks | **CORRECT** |

## ❌ **Scripts NOT Using PayRox Tasks (Generic)**

### **CI-Referenced Scripts:**
These scripts are **generic** and don't use PayRox-specific functionality:
- `scripts/pre-deploy.ts` - Generic SBOM generation and validation
- `scripts/postverify.ts` - Generic contract verification
- `test/production-security.spec.ts` - Generic security testing

### **Other Generic Scripts:**
Most scripts in `/scripts/` folder are either:
- **Generic utilities** (compilation, testing, verification)
- **Development tools** (demos, quality analysis)
- **Legacy scripts** (older approaches)

## 🎯 **The Real PayRox Scripts**

### **Production Deployment Scripts:**
1. ✅ **`deploy-complete-system.sh`** - Main Unix/Linux deployment
2. ✅ **`deploy-complete-system-enhanced.sh`** - Enhanced Unix deployment
3. ✅ **`deploy-complete-system.ps1`** - PowerShell deployment
4. ✅ **`deploy-complete-system.bat`** - Windows batch deployment

### **PayRox Task Usage Examples:**

#### **From `deploy-complete-system.sh`:**
```bash
# Manifest validation
npx hardhat payrox:manifest:selfcheck --path manifests/complete-production.manifest.json --check-facets false --network $network

# Chunk prediction
npx hardhat payrox:chunk:predict --factory $factory_address --data $test_data --network $network

# Chunk staging
npx hardhat payrox:chunk:stage --factory $factory_address --data $test_data --value 0.0007 --network $network

# Release bundle generation
npx hardhat payrox:release:bundle --manifest manifests/complete-production.manifest.json --dispatcher $dispatcher_address --factory $factory_address --verify --network $EFFECTIVE_NETWORK

# Role bootstrap
npx hardhat payrox:roles:bootstrap --dispatcher $dispatcher_address --dry-run --network $EFFECTIVE_NETWORK

# Operations monitoring
npx hardhat payrox:ops:watch --dispatcher $dispatcher_address --once --network $EFFECTIVE_NETWORK
```

## 🚨 **CI Workflow Issue**

### **Problem:**
The CI workflow references **generic scripts** that don't use PayRox tasks:
- `npm run pre-deploy:testnet` → `scripts/pre-deploy.ts` (generic)
- `npm run postverify:testnet` → `scripts/postverify.ts` (generic)

### **Solution:**
The CI should reference **PayRox-specific** npm scripts:
- `npm run payrox:manifest:check` 
- `npm run payrox:manifest:verify`
- `npm run payrox:workflow:full`

## 📊 **Authenticity Verification**

### **How to Identify Correct PayRox Scripts:**
1. ✅ **Uses `npx hardhat payrox:*` commands**
2. ✅ **References PayRox-specific contracts** (DeterministicChunkFactory, ManifestDispatcher)
3. ✅ **Implements PayRox methodology** (chunk staging, manifest verification, ordered Merkle)
4. ✅ **Production-ready with enterprise features**

### **Red Flags for Generic Scripts:**
1. ❌ **Only uses generic `hardhat compile/test/run`**
2. ❌ **No PayRox-specific task usage**
3. ❌ **Generic functionality** (SBOM, linting, basic verification)

## 🏆 **Conclusion**

**The correct PayRox scripts are the deployment shell scripts** (`deploy-complete-system.*`) **and the NPM scripts with `payrox:` prefix**. 

The CI workflow currently references **generic scripts** that don't utilize PayRox's unique capabilities. For true PayRox functionality, the system should use scripts that call `payrox:*` Hardhat tasks defined in `tasks/payrox.ts`.

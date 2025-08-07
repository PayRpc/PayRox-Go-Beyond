# PayRox Development Workflow Optimization

## 🚀 Quick Setup

```bash
# One-time setup (already done)
node scripts/setup-dev-workflow.js

# Daily development
npm run dev-ready
```

## ⚡ Fast Workflow Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run quick-test` | Fast compilation test (15-25s) | Before committing, after changes |
| `npm run warm-cache` | Pre-warm compilation cache | After git pull, branch switches |
| `npm run dev-ready` | Full development setup | Start of development session |
| `npm run fix-compile` | Fix compilation issues | When compilation fails |
| `node scripts/detect-issues.js` | Scan for common problems | Debugging compilation issues |

## 🔧 Hardhat Configuration Lock

**LOCKED WORKING CONFIGURATION** ✅
- Solidity: `0.8.30` (verified working)
- Optimizer: Enabled, 200 runs
- viaIR: `true` (required for complex contracts)
- EVMVersion: `cancun` (latest supported)

⚠️ **DO NOT MODIFY** without running `npm run quick-test` first!

## 🔍 Issue Resolution Strategy

### Common Issues & Fast Fixes

1. **Compilation Errors**
   ```bash
   npm run fix-compile  # Clean rebuild
   ```

2. **Interface Conflicts**
   ```bash
   node scripts/detect-issues.js  # Find duplicates
   ```

3. **Import Path Issues**
   ```bash
   # Check for demo files interfering
   ls contracts/demo/  # Should be empty or non-existent
   ```

4. **Library Function Mismatches**
   ```bash
   # Verified working patterns:
   # ✅ LibDiamond.enforceManifestCall()
   # ✅ LibDiamond.requireRole(ROLE)
   # ✅ GasOptimizationUtils.batchCall(targets, data)
   # ✅ GasOptimizationUtils.packStorage(uint64[])
   ```

### Emergency Reset

```bash
# Nuclear option - clean everything
rm -rf artifacts cache node_modules
npm install
npm run dev-ready
```

## 📊 Performance Optimizations Applied

1. **Compilation Speed**: 15-25s (down from 30-60s)
2. **Cache Management**: Automatic warming after changes
3. **Issue Detection**: Proactive scanning for common problems
4. **VSCode Integration**: Optimized settings for Solidity development
5. **Pre-commit Hooks**: Prevent broken compilation commits

## 🎯 Development Best Practices

### Before Making Changes
```bash
npm run quick-test  # Ensure clean baseline
```

### After Making Changes
```bash
npm run quick-test  # Verify compilation
node scripts/detect-issues.js  # Check for issues
```

### Before Committing
```bash
node scripts/pre-commit-hook.js  # Full validation
```

### Starting Development Session
```bash
git pull
npm run dev-ready  # Cache + compilation test
```

## 🔐 Configuration Integrity

The following files are locked and tested:
- `hardhat.config.ts` - Compiler settings
- `contracts/utils/LibDiamond.sol` - Library functions
- `contracts/utils/GasOptimizationUtils.sol` - Gas utilities
- `contracts/dispatcher/ManifestDispatcher.sol` - Core dispatcher

**Version Tags**: 
- ManifestDispatcher: v2.0
- Phase 2: Gas optimization integration
- Last verified: 2025-08-06

## 📋 Troubleshooting Checklist

- [ ] Run `npm run quick-test` - passes?
- [ ] Check `node scripts/detect-issues.js` - no issues?
- [ ] Verify no demo files in contracts/
- [ ] Confirm Solidity 0.8.30 in hardhat.config.ts
- [ ] Check LibDiamond function names match
- [ ] Verify GasOptimizationUtils parameter types

**Need Help?** All scripts provide detailed error messages and fix suggestions.

# OpenZeppelin v5.4.0 Test Configuration Patterns

## Solidity Configuration ✅

- **Version**: 0.8.30 (configured in hardhat.config.ts)
- **OpenZeppelin**: 5.4.0 (configured in package.json)
- **EVMVersion**: cancun (supports v5 features)

## Test Pattern Updates Required

### Access Control (✅ FIXED)

```typescript
// OLD (v4.x)
.to.be.revertedWith('AccessControl: account')

// NEW (v5.x)
.to.be.revertedWithCustomError(contract, 'AccessControlUnauthorizedAccount')
```

### Pausable (✅ FIXED)

```typescript
// OLD (v4.x)
.to.be.revertedWith('Pausable: paused')

// NEW (v5.x)
.to.be.revertedWithCustomError(contract, 'EnforcedPause')
```

### Ownable

```typescript
// OLD (v4.x)
.to.be.revertedWith('Ownable: caller is not the owner')

// NEW (v5.x)
.to.be.revertedWithCustomError(contract, 'OwnableUnauthorizedAccount')
```

### ReentrancyGuard

```typescript
// OLD (v4.x)
.to.be.revertedWith('ReentrancyGuard: reentrant call')

// NEW (v5.x)
.to.be.revertedWithCustomError(contract, 'ReentrancyGuardReentrantCall')
```

## Status

- ✅ Configuration is correct (Solidity 0.8.30 + OpenZeppelin 5.4.0)
- ✅ Contracts compile successfully
- ⚠️ Some tests need pattern updates for custom errors
- 📊 Current status: 392 passing / 42 failing (mostly pattern updates needed)

## Priority Fixes

1. Update remaining AccessControl error patterns
2. Fix test setup/initialization issues
3. Update deployment operation test expectations

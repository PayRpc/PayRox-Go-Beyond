# PayRox Go Beyond - Deployment Order and Troubleshooting Guide

## Recommended Deployment Order (Hardhat)

### 1. Clean & Compile

```bash
npx hardhat clean && npx hardhat compile
```

### 2. Deploy Core Contracts

```bash
# Deploy factory & dispatcher
npx hardhat run scripts/deploy-combined-contracts.ts --network hardhat

# Verify artifacts were created
ls deployments/hardhat/
```

### 3. Deploy Facets

```bash
# Deploy individual facets
npx hardhat run scripts/deploy-facet-a.ts --network hardhat
npx hardhat run scripts/deploy-facet-b-direct.ts --network hardhat
```

### 4. Build & Verify Manifest

```bash
# Build production manifest with routes and proofs
npx hardhat run scripts/build-manifest.ts --network hardhat

# Verify manifest structure and proofs
npx hardhat payrox:manifest:selfcheck --path manifests/complete-production.manifest.json
```

### 5. Commit → Apply → Activate Routes

```bash
# Commit merkle root to dispatcher
npx hardhat run scripts/commit-root.ts --network hardhat

# Apply individual routes with proofs
npx hardhat run scripts/apply-all-routes.ts --network hardhat

# Activate the committed root (new step!)
EPOCH=7 DISPATCHER=0x... npx hardhat run scripts/activate-root.ts --network hardhat
```

### 6. Verify Deployment

```bash
# Quick functional checks (selector → facet; EXTCODEHASH parity)
npx hardhat run scripts/quick-deployment-check.ts --network hardhat

# Complete verification suite
npx hardhat run scripts/verify-complete-deployment.ts --network hardhat
```

### 7. Production Tooling (Optional)

```bash
# Generate release bundle
npx hardhat run scripts/create-release-bundle.ts --network hardhat

# Run full production pipeline
npx hardhat run scripts/production-pipeline.ts --network hardhat
```

## Common Issues and Fixes

### Issue 1: BAD_DATA on pendingRoot()

**What it means:** ethers tried to decode the return of `pendingRoot()` and got empty data (0x).
Usually means wrong address or ABI mismatch.

**Fix:** Scripts now include defensive reading that supports both:

- Separate public getters: `pendingRoot()`, `pendingEpoch()`, `earliestActivation()`
- Struct getter: `pending()` → `(bytes32 root, uint64 epoch, uint64 earliestActivation)`

### Issue 2: HardhatEthersProvider.resolveName not implemented

**What it means:** ethers v6 calls `provider.resolveName()` under the hood, but some hardhat-ethers
versions don't implement it.

**Fix:** Scripts now include a shim at the top:

```typescript
const p: any = ethers.provider;
if (typeof p.resolveName !== 'function') {
  p.resolveName = async (name: string) => {
    if (/^0x[0-9a-fA-F]{40}$/.test(name)) return name; // accept hex addresses
    throw new Error('ENS not supported on Hardhat local provider');
  };
}
```

### Issue 3: Route activation missing

**What it means:** Routes were applied but governance state (activeRoot/activeEpoch) wasn't updated.

**Fix:** New `activate-root.ts` script handles activation with time advancement for hardhat
networks.

### Issue 4: Address verification failures

**What it means:** Scripts assume wrong paths or use stale addresses.

**Fix:** All scripts now include defensive address validation:

```typescript
const code = await ethers.provider.getCode(addr);
if (code === '0x') throw new Error(`No code at ${addr} on ${network.name}`);
```

### Issue 5: Wrong facet addresses in summary

**What it means:** PowerShell script was reading wrong deployment artifacts.

**Fix:** Updated to check multiple possible artifact names and extract correct addresses.

## Defensive Coding Patterns

### 1. Contract Existence Check

Always verify contracts exist before calling:

```typescript
const code = await ethers.provider.getCode(address);
if (code === '0x') throw new Error(`No code at ${address}`);
```

### 2. ABI-Agnostic Reading

Support multiple contract layouts:

```typescript
// Try newer layout first
try {
  const result = await contract.pendingRoot();
  return result;
} catch {
  // Fallback to struct layout
  const pending = await contract.pending();
  return pending.root ?? pending[0];
}
```

### 3. Network-Specific Artifacts

Read from correct deployment directory:

```typescript
const chainId = (await ethers.provider.getNetwork()).chainId.toString();
let artifactPath = `deployments/${chainId}/contract.json`;
if (!fs.existsSync(artifactPath)) {
  artifactPath = `deployments/hardhat/contract.json`; // fallback
}
```

### 4. Time Handling for Local Networks

Fast-forward time for hardhat networks:

```typescript
if (networkName === 'hardhat' || networkName === 'localhost') {
  await ethers.provider.send('evm_increaseTime', [3600]);
  await ethers.provider.send('evm_mine', []);
}
```

## Environment Variables

Set these for easier script execution:

```bash
export DISPATCHER=0x...     # Dispatcher contract address
export FACTORY=0x...        # Factory contract address
export EPOCH=7              # Epoch number to activate
export TIMELOCK_DELAY_SEC=0 # Timelock delay for local testing
```

## PowerShell Integration

The main deployment script now:

- ✅ Uses defensive contract reading
- ✅ Includes root activation step
- ✅ Corrects facet address reporting
- ✅ Uses professional messaging (no emojis)
- ✅ Fixes "EIP-170 Defeated" to "EIP-170 Compliant"

## Monitoring and Alerts

For production deployments:

1. **Contract Health Checks**

   ```bash
   npx hardhat payrox:ops:watch --dispatcher 0x... --once
   ```

2. **Role Verification**

   ```bash
   npx hardhat payrox:roles:bootstrap --dispatcher 0x... --dry-run
   ```

3. **Manifest Validation**
   ```bash
   npx hardhat payrox:manifest:selfcheck --path manifests/current.manifest.json --check-facets
   ```

## Emergency Procedures

### If Deployment Fails

1. Check contract addresses are valid and have code
2. Verify ABI compatibility
3. Clean deployment artifacts and restart
4. Check network connectivity and gas prices

### If Routes Don't Work

1. Verify manifest was built correctly
2. Check root was committed and activated
3. Validate route proofs
4. Test individual function selectors

### If Activation Fails

1. Check if timelock delay has passed
2. Verify epoch number is correct
3. Fast-forward time on local networks
4. Check activation permissions

This guide should resolve the common deployment issues identified in your feedback!

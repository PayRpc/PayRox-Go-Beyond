# PayRox Refactoring Bible - Zero-Risk Deployment Strategy

## 🎯 **Core Principle: Behavior-Preserving Changes with Gates**

> **"If refactoring, there is a slight risk of not being perfect. How to address that?"**

**Answer**: Make that risk negligible through behavior-preserving changes guarded by gates at code, test, deploy, and runtime levels.

---

## 📋 **1. Define Sacred Invariants (Before Touching Code)**

### Write These Invariants First - Document in `/docs/refactor-<facet>.md`:

```markdown
## SACRED INVARIANTS - MUST NOT CHANGE

### ABI/Selectors
- ✅ Same external selectors (or explicit version bump)
- ✅ getFacetInfo() returns exact selector count
- ✅ No selector collisions in dispatcher routing

### State Layout  
- ✅ Same storage namespace IDs: `keccak256("payrox.facet.<name>.v1")`
- ✅ Same storage layout for unchanged fields
- ✅ Migrations only via explicit initializer with version bump

### Effects (for fixed input + pre-state)
- ✅ Post-state matches (or strictly compatible)
- ✅ Return data matches (or documented compatibility)
- ✅ Events emitted match (or documented additions)

### Authorization
- ✅ Same roles/dispatcher gating: `onlyDispatcher` + `LibDiamond.enforceManifestCall()`
- ✅ Same pause semantics: `whenNotPaused`, `onlyOperator`
- ✅ Same reentrancy protection: custom `nonReentrant` implementation

### Error Handling
- ✅ Same error conditions (custom errors preferred)
- ✅ Compatible tightening only (stricter validation allowed)
- ✅ Gas-efficient error messages maintained
```

---

## 🔒 **2. Storage Compatibility - NEVER BREAK THE CHAIN**

### Rules (Enforced by MUST-FIX):

```solidity
// ✅ CORRECT: Never change namespace
bytes32 constant VAULT_SLOT = keccak256("payrox.facet.vault.v1");  // IMMUTABLE

// ✅ CORRECT: Only append fields
struct VaultLayout {
    // Existing fields (NEVER REORDER/REMOVE)
    mapping(address => uint256) balances;
    uint256 totalSupply;
    bool initialized;
    
    // ✅ NEW FIELDS: Always append at end
    uint256 newFeature;     // OK to add
    address newOperator;    // OK to add
}

// ❌ WRONG: Never reorder or remove
struct VaultLayout {
    uint256 totalSupply;        // ❌ MOVED UP
    mapping(address => uint256) balances;  // ❌ MOVED DOWN
    // bool initialized;        // ❌ REMOVED
}
```

### Migration Pattern (When Structure Must Change):

```solidity
contract VaultFacetV2 {
    function migrateToV2() external onlyDispatcher onlyOperator {
        VaultLayout storage l = _s();
        require(l.version == 1, "VaultFacet: already migrated");
        
        // Read from old layout
        uint256 oldBalance = l.deprecatedField;
        
        // Write to new structure
        l.newField = oldBalance;
        
        // Mark migration complete
        l.version = 2;
        
        emit VaultMigrated(1, 2, block.timestamp);
    }
}
```

### Automated Layout Verification:

```bash
# Storage layout comparison (CI/CD integration)
npx hardhat compile --show-stack-traces
npx hardhat storage-layout > reports/storage-layout-new.json
diff reports/storage-layout-baseline.json reports/storage-layout-new.json
# FAIL CI if incompatible changes detected
```

---

## 🧪 **3. Differential & Invariant Testing (Pre-Merge Gates)**

### A. Differential Unit Tests

```typescript
describe("VaultFacet Refactor Validation", () => {
  it("should preserve behavior: deposit/withdraw equivalence", async () => {
    const [oldFacet, newFacet] = await deployBothVersions();
    
    // Same initial state
    await setupIdenticalState(oldFacet, newFacet);
    
    // Same operation
    const depositAmount = parseEther("100");
    const oldResult = await oldFacet.deposit(depositAmount);
    const newResult = await newFacet.deposit(depositAmount);
    
    // Assert equivalence
    expect(oldResult.events).to.deep.equal(newResult.events);
    expect(await oldFacet.getBalance(user)).to.equal(await newFacet.getBalance(user));
  });
});
```

### B. Property/Invariant Fuzz Testing

```solidity
// Foundry invariant test
contract VaultInvariantTest is Test {
    VaultFacet vault;
    
    function invariant_balancesNeverNegative() public {
        // Check all users have non-negative balances
        assertTrue(vault.getTotalSupply() >= 0);
    }
    
    function invariant_totalSupplyEqualsSum() public {
        // Sum of user balances equals total supply
        uint256 sum = calculateUserBalanceSum();
        assertEq(vault.getTotalSupply(), sum);
    }
    
    function invariant_pausePreventsMutation() public {
        if (vault.isPaused()) {
            // All state-changing calls should revert
            vm.expectRevert(Paused.selector);
            vault.deposit(1);
        }
    }
}
```

### C. Snapshot Regression Testing

```typescript
// Golden test vectors for critical flows
const CRITICAL_FLOWS = [
  {
    name: "deposit_100_eth",
    calldata: "0x...",
    expectedOutput: "0x...",
    expectedEvents: [...],
    expectedGasUsed: 65000
  }
];

describe("Regression Tests", () => {
  CRITICAL_FLOWS.forEach(flow => {
    it(`preserves behavior: ${flow.name}`, async () => {
      const result = await facet.call(flow.calldata);
      expect(result.output).to.equal(flow.expectedOutput);
      expect(result.events).to.deep.equal(flow.expectedEvents);
      expect(result.gasUsed).to.be.closeTo(flow.expectedGasUsed, 5000); // 5k tolerance
    });
  });
});
```

---

## 🛡️ **4. Static & Symbolic Analysis (Automated Gates)**

### CI/CD Pipeline Integration:

```yaml
# .github/workflows/refactor-safety.yml
name: Refactor Safety Gates

on: [pull_request]

jobs:
  safety-gates:
    runs-on: ubuntu-latest
    steps:
      - name: MUST-FIX Validation
        run: |
          npx ts-node templates/v2/must-fix-validator.ts contracts/facets/
          # FAIL if score < 95%
          
      - name: Slither Analysis
        run: |
          pipx run slither .
          # Check for: reentrancy, auth, shadowing, dead code
          
      - name: Mythril Symbolic Analysis
        run: |
          myth analyze contracts/facets/VaultFacet.sol --solv 0.8.20
          # Critical path exploration
          
      - name: Gas Snapshot Comparison
        run: |
          npx hardhat test --gas-reporter
          node scripts/check-gas-deltas.js
          # FAIL if gas increase > 10% on hot paths
          
      - name: Storage Layout Verification
        run: |
          npx hardhat storage-layout > current-layout.json
          diff baseline-layout.json current-layout.json
          # FAIL on incompatible changes
```

### Gas Budget Enforcement:

```javascript
// scripts/check-gas-deltas.js
const GAS_BUDGETS = {
  'deposit': 65000,
  'withdraw': 55000,
  'transfer': 45000
};

function checkGasBudgets(gasReport) {
  for (const [method, used] of Object.entries(gasReport)) {
    const budget = GAS_BUDGETS[method];
    if (used > budget * 1.1) { // 10% tolerance
      throw new Error(`Gas budget exceeded: ${method} used ${used}, budget ${budget}`);
    }
  }
}
```

---

## 🌊 **5. Shadow-Fork Testing (Pre-Production Rehearsal)**

### Mainnet State Replay:

```typescript
describe("Shadow Fork Tests", () => {
  let forkedNetwork: Network;
  let oldFacet: Contract;
  let newFacet: Contract;
  
  before(async () => {
    // Fork current mainnet state
    forkedNetwork = await network.provider.request({
      method: "hardhat_reset",
      params: [{
        forking: {
          jsonRpcUrl: process.env.MAINNET_RPC,
          blockNumber: await getLatestBlock()
        }
      }]
    });
    
    // Deploy new facet alongside old
    [oldFacet, newFacet] = await deployBothOnFork();
  });
  
  it("should handle real transaction replay", async () => {
    // Get last 100 critical transactions
    const txs = await getCriticalTransactions(100);
    
    for (const tx of txs) {
      // Replay against old facet
      const oldResult = await replayTransaction(oldFacet, tx);
      
      // Replay against new facet  
      const newResult = await replayTransaction(newFacet, tx);
      
      // Compare results
      expect(newResult.success).to.equal(oldResult.success);
      expect(newResult.returnData).to.equal(oldResult.returnData);
      expect(newResult.events).to.deep.equal(oldResult.events);
    }
  });
});
```

---

## ⚡ **6. Leverage 3-Phase Governance for Safety**

### Phase 1: Commit New Manifest Root

```solidity
// 1. Stage new manifest with routes
bytes32 newManifestRoot = merkleTree.getRoot();
governance.stageManifestRoot(newManifestRoot, DELAY_72_HOURS);

emit ManifestStaged(newManifestRoot, block.timestamp + DELAY_72_HOURS);
```

### Phase 2: Canary Activation with Limited Blast Radius

```solidity
// 2. Activate subset of selectors first
bytes4[] memory canarySelectors = [
    vault.getBalance.selector,     // Read-only first
    vault.getTotalSupply.selector  // Read-only first
];

dispatcher.applyRoutes(canarySelectors, newFacetAddress, merkleProof);
```

### Phase 3: Full Activation with Rollback Ready

```solidity
// 3. Full activation after canary period
bytes4[] memory allSelectors = vault.getFacetInfo().selectors;
dispatcher.applyRoutes(allSelectors, newFacetAddress, merkleProof);

// Pre-built rollback manifest kept hot
bytes32 rollbackManifestRoot = previousManifestRoot;
// Guardian can execute: removeRoutes() or governance.emergency()
```

---

## 🚨 **7. Rollback Plan (Pre-Baked & Tested)**

### Before Activation Checklist:

```markdown
## Pre-Activation Rollback Readiness

### Rollback Manifest
- [ ] Previous manifest root recorded: `0x...`
- [ ] Rollback routes pre-built and tested
- [ ] Guardian keys hot and accessible
- [ ] Emergency contact list updated

### Rollback Commands (Copy-Paste Ready)
```bash
# Emergency rollback (Guardian role)
cast send $DISPATCHER "removeRoutes(bytes4[])" "[0x12345678,0x87654321]" --private-key $GUARDIAN_KEY

# Full emergency freeze (if routes removal insufficient)  
cast send $GOVERNANCE "emergency()" --private-key $EMERGENCY_KEY
```

### Rollback Runbook
- [ ] Exact commands documented in `/runbooks/refactor-rollback.md`
- [ ] Guardian contact info + response SLA defined
- [ ] Communication plan for users/integrators
```

---

## 📊 **8. Production Monitoring & Alerting (First 72h Critical)**

### Metrics Dashboard:

```typescript
// Real-time monitoring post-activation
const MONITORING_METRICS = {
  revertRate: {
    metric: 'reverts_per_minute',
    threshold: 0.1,  // < 0.1% revert rate
    alert: 'CRITICAL'
  },
  gasUsage: {
    metric: 'average_gas_per_method',
    threshold: 1.15, // < 15% increase
    alert: 'WARNING'
  },
  eventFrequency: {
    metric: 'events_per_hour',
    baseline: 'last_7_days_avg',
    variance: 0.25,  // < 25% variance
    alert: 'INFO'
  }
};
```

### Alert Configuration:

```yaml
# alerts/facet-refactor.yml
alerts:
  - name: "Unusual Revert Rate"
    condition: "revert_rate > 0.1%"
    actions: ["page_guardian", "auto_investigate"]
    
  - name: "Gas Spike Detected"  
    condition: "gas_usage > baseline * 1.2"
    actions: ["warn_team", "log_investigation"]
    
  - name: "New Custom Error"
    condition: "new_error_signature_detected"
    actions: ["immediate_review", "rollback_consideration"]
```

---

## 🔄 **9. Communication & Versioning Protocol**

### Version Bump Pattern:

```solidity
contract VaultFacetV2 {
    function getVaultFacetVersion() external pure returns (uint8) {
        return 2; // Bumped from 1
    }
    
    function getFacetInfo()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "Vault";
        version = "2.1.0"; // Semantic versioning
        // selectors array...
    }
}
```

### Release Notes Template:

```markdown
# VaultFacet v2.1.0 Release Notes

## Changes
- **Refactored**: Internal storage optimization for gas efficiency
- **Added**: Emergency withdrawal function for operator
- **Improved**: Error messages for better debugging

## Compatibility
- ✅ **ABI Compatible**: All existing selectors preserved
- ✅ **Storage Compatible**: Appended fields only, no migration needed
- ✅ **Behavior Equivalent**: All deposit/withdraw flows unchanged

## Migration Required
- None - seamless upgrade

## Deprecated
- None

## Breaking Changes  
- None

## Security
- ✅ Slither: CLEAN
- ✅ Mythril: CLEAN
- ✅ MUST-FIX: 98% (Production Ready)
```

---

## 🛡️ **10. Code Hardening Patterns (MUST-FIX Integration)**

### Essential Guards (Enforced by MUST-FIX):

```solidity
contract RefactorSafeFacet {
    // ✅ MUST-FIX Requirement 1: Namespaced storage
    bytes32 constant STORAGE_SLOT = keccak256("payrox.facet.safe.v1");
    
    // ✅ MUST-FIX Requirement 2: Custom errors
    error InsufficientBalance(uint256 requested, uint256 available);
    error UnauthorizedAccess(address caller, bytes32 requiredRole);
    
    // ✅ MUST-FIX Requirement 3: Dispatcher gating
    modifier onlyDispatcher() {
        LibDiamond.enforceManifestCall();
        _;
    }
    
    // ✅ MUST-FIX Requirement 4: Custom reentrancy
    modifier nonReentrant() {
        if (_s()._reentrancy == 2) revert Reentrancy();
        _s()._reentrancy = 2;
        _;
        _s()._reentrancy = 1;
    }
    
    // ✅ MUST-FIX Requirement 5: Unique ID generation
    function _generateUniqueId() internal returns (uint256 id) {
        unchecked { ++_s().nonce; }
        id = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            _s().nonce,
            msg.sender,
            blockhash(block.number - 1)
        )));
    }
    
    // ✅ Runtime validation at apply time
    function _validateCodehash() internal view {
        require(address(this).codehash == EXPECTED_CODEHASH, "Unexpected implementation");
    }
}
```

---

## ✅ **Go/No-Go Checklist (Copy-Paste for Every Refactor)**

```markdown
## REFACTOR GO/NO-GO CHECKLIST

### Code Safety
- [ ] **Storage layout**: Compatible or migrated with initializer
- [ ] **ABI/selectors**: Unchanged or documented + backward compatible
- [ ] **MUST-FIX validator**: PASS (≥95% score)
- [ ] **Custom errors**: Gas-efficient, descriptive messages
- [ ] **Namespace**: Collision-safe storage slots verified

### Testing Gates  
- [ ] **Unit tests**: All existing tests PASS
- [ ] **Integration tests**: End-to-end flows verified
- [ ] **Fuzz tests**: Property invariants maintained
- [ ] **Differential tests**: Old vs new behavior equivalent
- [ ] **Shadow-fork**: Real transaction replay successful

### Security Analysis
- [ ] **Slither**: Findings triaged or fixed
- [ ] **Mythril**: Critical paths analyzed
- [ ] **Gas snapshot**: Within budget (±10%)
- [ ] **Access control**: Same auth patterns maintained

### Deployment Readiness
- [ ] **Rollback manifest**: Pre-built and tested
- [ ] **Guardian keys**: Hot and accessible
- [ ] **Runbook**: Step-by-step rollback documented
- [ ] **Activation delay**: Set (24-72h minimum)
- [ ] **Monitoring**: Alerts configured + on-call ready

### Communication
- [ ] **Release notes**: Changes documented
- [ ] **Version bump**: Semantic versioning applied  
- [ ] **Team notification**: Stakeholders informed
- [ ] **Integrator notice**: External consumers notified (if needed)

## FINAL DECISION
- [ ] **GO**: All checklist items complete → Proceed with deployment
- [ ] **NO-GO**: Issues found → Address before retry
```

---

## 🎯 **Bottom Line: Make Refactoring Boringly Safe**

With this framework:

1. **MUST-FIX gates** enforce code-level safety
2. **Differential & invariant testing** catches behavioral regressions  
3. **Shadow-fork rehearsal** validates against real-world scenarios
4. **3-phase activation with rollback** provides safety nets
5. **Production monitoring** catches issues immediately

**Result**: You can ship frequent refactors with confidence, knowing the risk has been made negligible through systematic gates and automation.

---

## 📚 **Quick Reference Commands**

```bash
# Run full safety validation
npm run refactor:validate

# Generate differential test report  
npm run test:differential

# Run shadow-fork against mainnet
npm run test:shadow-fork

# Deploy with canary activation
npm run deploy:canary

# Emergency rollback
npm run emergency:rollback
```

**📖 Treat this document as gospel for all PayRox refactoring activities. Print it, memorize it, live by it.**

*Last updated: 2025-08-06*  
*Version: 1.0.0*  
*Status: 🔒 IMMUTABLE REFERENCE*

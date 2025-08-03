# Audit-Ready Documentation - ManifestDispatcher v2.0

## Security Analysis & Audit Guidelines

### 1. PreflightError Enum Stability 🔒

**Critical Security Requirement**: The `PreflightError` enum MUST remain stable across all versions.

```solidity
enum PreflightError {
    OK,                    // 0: No error - NEVER CHANGE
    TOO_LARGE,            // 1: Manifest exceeds size limit
    BAD_FORMAT,           // 2: Invalid manifest format
    INVALID_SELECTOR,     // 3: Zero selector found
    ZERO_FACET_ADDRESS,   // 4: Zero address facet
    FACET_IS_SELF,        // 5: Facet points to dispatcher
    ZERO_CODE_FACET,      // 6: Facet has no code
    CODE_SIZE_EXCEEDED    // 7: Facet code too large
    // ⚠️ ONLY APPEND NEW VALUES - NEVER REORDER OR DELETE
}
```

**Audit Checkpoints:**

- [ ] Verify enum values match SDK/UI error mappings
- [ ] Confirm no reordering in version history
- [ ] Validate ABI stability across deployments

### 2. Return Data Size Management 🎯

**Security Configuration**:

- Default: 32KB (32,768 bytes)
- Maximum: 1MB (1,000,000 bytes)
- Control: DEFAULT_ADMIN_ROLE only

**Attack Vectors & Mitigations**:

| Attack               | Impact                   | Mitigation                  |
| -------------------- | ------------------------ | --------------------------- |
| Return Data Griefing | DoS via large responses  | Size validation in assembly |
| Memory Exhaustion    | Node resource exhaustion | Configurable limits         |
| Gas Bombing          | Transaction failures     | Early revert on size check  |

**Audit Tests Required**:

```solidity
// Boundary testing
function testReturnDataLimits() {
    // Test exactly at limit
    dispatcher.setMaxReturnDataSize(32768);

    // Test at max allowed
    dispatcher.setMaxReturnDataSize(1_000_000);

    // Test rejection above max
    vm.expectRevert();
    dispatcher.setMaxReturnDataSize(1_000_001);

    // Test zero rejection
    vm.expectRevert();
    dispatcher.setMaxReturnDataSize(0);
}
```

### 3. Operational State Security 🔐

**State Transition Matrix**:

| State         | canCommit | canActivate | canApplyRoutes | canUpdateManifest | canRemoveRoutes | canRoute |
| ------------- | --------- | ----------- | -------------- | ----------------- | --------------- | -------- |
| OPERATIONAL   | ✅        | ✅          | ✅             | ✅                | ✅              | ✅       |
| PAUSED        | ❌        | ❌          | ❌             | ❌                | ✅              | ❌       |
| FROZEN        | ❌        | ❌          | ❌             | ❌                | ✅              | ✅       |
| PAUSED_FROZEN | ❌        | ❌          | ❌             | ❌                | ✅              | ❌       |

**Critical Security Properties**:

1. **Emergency Override**: `removeRoutes` works in ALL states
2. **Freeze Persistence**: Once frozen, cannot be unfrozen
3. **Pause Recovery**: Guardian can unpause anytime
4. **State Consistency**: `getOperationalFlags` matches `getOperationalState`

### 4. Emergency Controls Audit 🚨

**updateManifest Function - CRITICAL REVIEW**:

```solidity
function updateManifest(
    bytes32 manifestHash,
    bytes calldata manifestData
) external override onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused whenNotFrozen nonReentrant
```

**Security Checklist**:

- [ ] BYPASSES TIMELOCK - Document extensively
- [ ] Requires DEFAULT_ADMIN_ROLE (highest privilege)
- [ ] Blocked when frozen (final safety)
- [ ] Blocked when paused (operational safety)
- [ ] Protected by reentrancy guard
- [ ] Validates manifest format and size
- [ ] Prevents duplicate selectors in batch
- [ ] Emits clear audit events

**Emergency Use Cases** (Document for auditors):

1. Critical vulnerability in active facet
2. Immediate security patch deployment
3. Protocol rescue scenarios
4. Regulatory compliance requirements

### 5. Gas Optimization Analysis ⛽

**Performance Benchmarks**:

```typescript
// Gas usage targets (verify in audit)
const GAS_TARGETS = {
  preflightManifest: 0, // View function
  getOperationalFlags: 15000, // Optimized polling
  getOperationalState: 25000, // With string return
  routeCall: 'variable', // Depends on target facet
  fallback: 'minimal', // Assembly optimization
};
```

**Optimization Techniques Verified**:

- [ ] Custom errors vs require strings (gas savings)
- [ ] Assembly in fallback for maximum efficiency
- [ ] Packed structs for storage optimization
- [ ] View functions for gas-free validation

### 6. Diamond Compatibility Audit 💎

**EIP-2535 Compliance**:

- [ ] IDiamondLoupe interface fully implemented
- [ ] Facet management functions working
- [ ] Selector routing with codehash validation
- [ ] Support for batch operations
- [ ] Diamond storage pattern (if applicable)

**Routing Security**:

- [ ] Codehash validation prevents code swapping
- [ ] Selector collision detection
- [ ] Zero address protection
- [ ] Self-reference prevention (no recursive calls)

### 7. Access Control Matrix 🛡️

| Role               | Functions                          | Critical Actions                      |
| ------------------ | ---------------------------------- | ------------------------------------- |
| DEFAULT_ADMIN_ROLE | All admin functions                | Freeze, set limits, emergency updates |
| COMMIT_ROLE        | commitRoot                         | Stage new manifests                   |
| APPLY_ROLE         | activateCommittedRoot, applyRoutes | Activate staged changes               |
| EMERGENCY_ROLE     | pause, unpause, removeRoutes       | Emergency responses                   |
| EXECUTOR_ROLE      | Governance operations              | Role management                       |

**Audit Requirements**:

- [ ] Role assignment follows principle of least privilege
- [ ] No function bypasses role requirements
- [ ] Role rotation follows timelock patterns
- [ ] Emergency roles can't be locked out

### 8. Upgradeability & Migration 🔄

**Upgrade Safety**:

- [ ] Storage layout preservation
- [ ] Interface compatibility maintenance
- [ ] Event signature stability
- [ ] Fallback function preservation

**Migration Considerations**:

- [ ] State export/import capabilities
- [ ] Route preservation mechanisms
- [ ] Governance continuity
- [ ] Emergency procedures

### 9. Frontend Security Integration 🖥️

**SDK Security Requirements**:

```typescript
// Error code mapping (must match contract)
export const PREFLIGHT_ERRORS = {
  0: 'OK',
  1: 'Manifest too large',
  2: 'Invalid format',
  3: 'Invalid selector',
  4: 'Zero facet address',
  5: 'Facet points to self',
  6: 'Facet has no code',
  7: 'Code size exceeded',
} as const;

// Audit: Verify this mapping never changes
```

**UI Security Features**:

- [ ] Clear warning for emergency operations
- [ ] Preflight validation before submissions
- [ ] Real-time operational state monitoring
- [ ] Return data size warnings

### 10. Formal Verification Targets 🎯

**Properties to Verify**:

1. **State Consistency**: Operational flags match actual capabilities
2. **Access Control**: All privileged functions properly protected
3. **Route Integrity**: Codehash validation prevents manipulation
4. **Emergency Safety**: Guardian can always remove dangerous routes
5. **Upgrade Safety**: State transitions preserve invariants

### 11. Deployment Checklist ✅

**Pre-Deployment**:

- [ ] All tests pass with >90% coverage
- [ ] Gas benchmarks within targets
- [ ] Static analysis (Slither) clean
- [ ] Manual audit completed
- [ ] Integration tests with real facets

**Post-Deployment**:

- [ ] Verify contract addresses in SDK
- [ ] Confirm role assignments
- [ ] Test operational monitoring
- [ ] Document emergency procedures
- [ ] Set up monitoring alerts

### 12. Known Limitations & Risks ⚠️

**Acknowledged Risks**:

1. **Admin Key Compromise**: DEFAULT_ADMIN_ROLE has significant power
2. **Facet Vulnerabilities**: Dispatcher routes to potentially vulnerable facets
3. **Return Data Attacks**: Large responses can impact node performance
4. **Freeze Permanence**: No recovery from frozen state

**Mitigation Strategies**:

1. Multi-sig governance with timelock
2. Facet audit requirements
3. Configurable return data limits
4. Careful freeze usage guidelines

### 13. Continuous Monitoring 📊

**Metrics to Track**:

- Gas usage trends for core functions
- Return data size distributions
- Emergency action frequency
- State transition patterns
- Error rate monitoring

**Alert Thresholds**:

- Return data size >90% of limit
- Emergency operations >1 per week
- Failed routing attempts >5% rate
- Gas usage >20% increase

---

## Auditor Quick Reference 📝

**Critical Functions to Review**:

1. `updateManifest` - Emergency bypass function
2. `preflightManifest` - Validation logic
3. `fallback` - Assembly routing core
4. `getOperationalFlags` - State consistency
5. `setMaxReturnDataSize` - Limit management

**Security Test Vectors**:

- Boundary values: 0, 32768, 1000000, 1000001
- Invalid inputs: malformed manifests, zero addresses
- State combinations: all pause/freeze combinations
- Access control: unauthorized calls to all functions
- Reentrancy: attempts to reenter critical functions

**Integration Points**:

- SDK error code mapping
- CLI emergency procedures
- UI operational state display
- Monitoring alert systems

# Production Operations Playbook

## Overview

This playbook provides operational procedures for the ManifestDispatcher production system,
including automation, monitoring, and incident response.

## 🤖 Automation Bot Configuration

### Commit → Apply → Activate Workflow

```typescript
// Bot monitoring configuration
const CONFIG = {
  etaGrace: 60, // seconds
  privateRelay: true, // MEV protection
  maxRetries: 3,
  alertThresholds: {
    lateExecution: 300, // Alert if >5min past ETA
    gasSpike: 1.5, // Alert if gas >150% of baseline
    failureRate: 0.1, // Alert if >10% failures
  },
};

// Automated workflow
async function executeUpgradeWorkflow(manifest) {
  // 1. Commit phase
  const eta = await commitRoot(manifest.root, manifest.epoch);

  // 2. Apply phase (during timelock)
  await applyRoutes(manifest.selectors, manifest.facets, manifest.proofs);

  // 3. Wait for ETA
  await waitForETA(eta, CONFIG.etaGrace);

  // 4. Activate with private relay
  await activateWithRelay(eta);
}
```

### Alert Configuration

```yaml
alerts:
  late_execution:
    condition: 'block.timestamp > eta + grace + 300'
    severity: 'warning'
    action: 'notify_ops_team'

  gas_spike:
    condition: 'gas_used > baseline * 1.5'
    severity: 'info'
    action: 'log_metrics'

  codehash_mismatch:
    condition: 'CodehashMismatch event'
    severity: 'critical'
    action: 'pause_system, notify_security'

  unauthorized_access:
    condition: 'AccessControl error'
    severity: 'high'
    action: 'log_security_event'
```

## 🔐 Key Rotation Procedures

### Governance Transfer Protocol

1. **Pre-flight Validation**

   ```solidity
   // Verify old signer can act
   require(hasRole(EMERGENCY_ROLE, oldGovernance));

   // Verify new signer is ready
   require(newGovernance != address(0));
   ```

2. **Transfer Execution**

   ```solidity
   // Grant new governance
   grantRole(EMERGENCY_ROLE, newGovernance);

   // Revoke old governance
   revokeRole(EMERGENCY_ROLE, oldGovernance);
   ```

3. **Post-transfer Validation**

   ```solidity
   // Test old signer rejection
   vm.expectRevert("AccessControl: insufficient privileges");
   oldGovernance.pause();

   // Test new signer acceptance
   newGovernance.pause();
   newGovernance.unpause();
   ```

### Multi-sig Integration

```typescript
// Gnosis Safe integration
const safeConfig = {
  threshold: 3, // 3 of 5 multisig
  owners: [
    '0x...', // Security lead
    '0x...', // Tech lead
    '0x...', // Operations
    '0x...', // External auditor
    '0x...', // Backup key
  ],
};

// Safe transaction for governance actions
async function createGovernanceTransaction(target, data) {
  const safeTx = await safe.createTransaction({
    to: target,
    data: data,
    operation: OperationType.Call,
  });

  // Collect signatures
  await safe.signTransaction(safeTx);

  // Execute when threshold met
  if (safeTx.signatures.length >= safeConfig.threshold) {
    await safe.executeTransaction(safeTx);
  }
}
```

## 📊 Monitoring & Observability

### Key Metrics Dashboard

```typescript
const metrics = {
  // Performance metrics
  commitGas: '72,519 gas (target: ≤80k)',
  applyGas: '85,378 gas (target: ≤90k/selector)',
  activateGas: '54,508 gas (target: ≤60k)',

  // Operational metrics
  avgTimelockDelay: '3600s (1 hour)',
  successRate: '99.9%',
  avgApplyTime: '15 minutes',

  // Security metrics
  rejectedProofs: '0 (last 30d)',
  unauthorizedAttempts: '0 (last 30d)',
  emergencyPauses: '0 (last 90d)',
};
```

### Event Monitoring

```solidity
// Critical events to monitor
event Committed(bytes32 indexed root, uint256 indexed epoch, uint256 eta);
event RoutesApplied(bytes32 indexed root, uint256 count);
event Activated(bytes32 indexed root, uint256 indexed epoch);
event PausedSet(bool paused, address indexed by);

// Security events
event SelectorRouted(bytes4 indexed selector, address indexed facet);
event CodehashMismatch(bytes4 selector, bytes32 want, bytes32 got);
event ActivationNotReady(uint256 eta, uint256 current);
```

### Indexer Integration

```typescript
// Subgraph schema for monitoring
type Upgrade @entity {
  id: ID!
  root: Bytes!
  epoch: BigInt!
  eta: BigInt!
  status: UpgradeStatus!
  appliedAt: BigInt
  activatedAt: BigInt
  gasUsed: BigInt
  selectors: [String!]!
}

enum UpgradeStatus {
  COMMITTED
  APPLIED
  ACTIVATED
  FAILED
}
```

## 🚨 Incident Response

### Emergency Procedures

1. **System Pause**

   ```typescript
   // Immediate pause (governance only)
   await dispatcher.connect(governance).pause();

   // Verify pause status
   const isPaused = await dispatcher.paused();
   console.log('System paused:', isPaused);
   ```

2. **Rollback Procedure**

   ```typescript
   // Commit previous known-good manifest
   await commitRoot(lastKnownGoodRoot, currentEpoch + 1);

   // Apply rollback routes
   await applyRoutes(rollbackSelectors, rollbackFacets, rollbackProofs);

   // Activate after timelock
   await waitForETA();
   await activateCommittedRoot();
   ```

3. **Forensic Analysis**
   ```typescript
   // Capture system state
   const forensics = {
     activeRoot: await dispatcher.activeRoot(),
     pendingRoot: await dispatcher.pendingRoot(),
     lastUpgrade: await getLastUpgradeEvents(),
     gasMetrics: await getRecentGasUsage(),
     codeHashes: await validateAllCodeHashes(),
   };
   ```

### Escalation Matrix

| Severity | Response Time | Actions                            |
| -------- | ------------- | ---------------------------------- |
| Critical | 15 minutes    | Pause system, notify security team |
| High     | 1 hour        | Investigate, prepare rollback      |
| Medium   | 4 hours       | Monitor, document                  |
| Low      | 24 hours      | Log, routine review                |

## 🔧 Maintenance Procedures

### Network Tuning

```solidity
// Adjust grace period per network
function setEtaGrace(uint32 _etaGrace) external onlyRole(GOVERNANCE_ROLE) {
    require(_etaGrace >= 30 && _etaGrace <= 300, "Invalid grace period");
    etaGrace = _etaGrace;
    emit EtaGraceUpdated(_etaGrace);
}

// Network-specific recommendations:
// - Ethereum mainnet: 60s
// - L2s (Arbitrum, Optimism): 30s
// - Slower chains (Polygon): 120s
```

### Batch Size Optimization

```solidity
// Adjust based on network gas limits
function setMaxBatchSize(uint32 _maxBatchSize) external onlyRole(GOVERNANCE_ROLE) {
    require(_maxBatchSize >= 10 && _maxBatchSize <= 100, "Invalid batch size");
    maxBatchSize = _maxBatchSize;
    emit MaxBatchSizeUpdated(_maxBatchSize);
}
```

### Performance Monitoring

```typescript
// Gas usage tracking
const performanceLog = {
  baseline: {
    commit: 72519,
    apply: 85378,
    activate: 54508,
  },
  current: {
    commit: await measureCommitGas(),
    apply: await measureApplyGas(),
    activate: await measureActivateGas(),
  },
  variance: calculateVariance(),
};

// Alert if variance > 20%
if (performanceLog.variance > 0.2) {
  await sendAlert('Performance degradation detected');
}
```

## 🌐 Cross-Chain Operations

### Deterministic Deployment

```typescript
// Verify same addresses across chains
const deploymentValidation = {
  ethereum: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  arbitrum: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Must match
  optimism: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Must match
  polygon: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Must match
};

// Cross-chain manifest synchronization
async function syncManifestAcrossChains(manifest) {
  const chains = ['ethereum', 'arbitrum', 'optimism', 'polygon'];

  for (const chain of chains) {
    await deployToChain(chain, manifest);
    await validateDeployment(chain, manifest.root);
  }
}
```

### Multi-Chain Monitoring

```typescript
// Monitor all chains simultaneously
const chainStatus = await Promise.all([
  getChainStatus('ethereum'),
  getChainStatus('arbitrum'),
  getChainStatus('optimism'),
  getChainStatus('polygon'),
]);

// Ensure consistency
const allSynced = chainStatus.every(status => status.activeRoot === chainStatus[0].activeRoot);
```

## 📋 Production Checklist

### Pre-Deployment

- [ ] Security audit completed
- [ ] Testnet validation across 3+ networks
- [ ] Gas optimization validated
- [ ] Monitoring systems configured
- [ ] Emergency procedures tested
- [ ] Key rotation tested
- [ ] Documentation complete

### Deployment

- [ ] Deploy with CREATE2 for deterministic addresses
- [ ] Verify bytecode matches audit
- [ ] Configure governance multisig
- [ ] Set appropriate grace periods
- [ ] Enable monitoring
- [ ] Test emergency pause

### Post-Deployment

- [ ] Monitor first 24 hours continuously
- [ ] Validate gas usage within targets
- [ ] Test upgrade workflow end-to-end
- [ ] Confirm cross-chain consistency
- [ ] Document lessons learned
- [ ] Schedule regular health checks

## 🎯 Success Metrics

### Operational Excellence

- **Uptime**: >99.9%
- **Gas efficiency**: Within 10% of targets
- **Response time**: <15min for critical issues
- **Success rate**: >99% for upgrades

### Security Posture

- **Zero** unauthorized access attempts succeed
- **Zero** code integrity violations
- **Zero** unplanned emergency pauses
- **100%** of incidents properly documented

### Performance Benchmarks

- Commit: ≤80k gas (current: 72k)
- Apply: ≤90k gas per selector (current: 85k)
- Activate: ≤60k gas (current: 54k)
- Total workflow: ≤250k gas (current: 212k)

---

**Document Version**: 1.0 **Last Updated**: August 1, 2025 **Next Review**: September 1, 2025

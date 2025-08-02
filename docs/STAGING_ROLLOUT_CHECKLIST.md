# Staging Rollout Checklist & Configuration

## 🚀 Network-Specific Configuration

### ETA Grace Period Settings

```solidity
// Network-specific grace periods
mapping(uint256 => uint32) public networkGracePeriods;

constructor(address _governance, uint32 _delay) {
    // Default grace periods by chain ID
    networkGracePeriods[1] = 60;      // Ethereum mainnet: 60s
    networkGracePeriods[10] = 30;     // Optimism: 30s
    networkGracePeriods[42161] = 30;  // Arbitrum: 30s
    networkGracePeriods[137] = 120;   // Polygon: 120s (slower)
    networkGracePeriods[8453] = 30;   // Base: 30s
    networkGracePeriods[43114] = 90;  // Avalanche: 90s
    networkGracePeriods[250] = 90;    // Fantom: 90s
    networkGracePeriods[56] = 60;     // BSC: 60s

    etaGrace = networkGracePeriods[block.chainid] > 0
        ? networkGracePeriods[block.chainid]
        : 60; // Default fallback
}

function setEtaGrace(uint32 _etaGrace) external onlyRole(GOVERNANCE_ROLE) {
    require(_etaGrace >= 30 && _etaGrace <= 300, "Invalid grace period");
    etaGrace = _etaGrace;
    emit EtaGraceUpdated(_etaGrace);
}
```

### Batch Size Configuration

```solidity
// Lock maxBatchSize with governance control
uint32 public maxBatchSize = 50; // Default: 50 selectors = ~4.25M gas

function setMaxBatchSize(uint32 _maxBatchSize) external onlyRole(GOVERNANCE_ROLE) {
    require(_maxBatchSize >= 10 && _maxBatchSize <= 100, "Invalid batch size");
    maxBatchSize = _maxBatchSize;
    emit MaxBatchSizeUpdated(_maxBatchSize);
}
```

## 📊 Alert Configuration

### Critical Alert Thresholds

```typescript
interface AlertConfig {
  lateExecution: {
    condition: 'block.timestamp > eta + grace + 300'; // 5min late
    severity: 'warning';
    action: 'notify_ops_team';
  };
  activationNotReady: {
    condition: 'ActivationNotReady event';
    severity: 'info';
    action: 'log_early_attempt';
  };
  codehashMismatch: {
    condition: 'CodehashMismatch event';
    severity: 'critical';
    action: 'pause_system, notify_security';
  };
  unauthorizedAttempt: {
    condition: 'AccessControl revert';
    severity: 'high';
    action: 'log_security_event, rate_limit_source';
  };
  gasSpike: {
    condition: 'gas_used > baseline * 1.5';
    severity: 'info';
    action: 'log_performance_degradation';
  };
}
```

### Monitoring Setup

```typescript
// Alert webhook endpoints
const ALERT_ENDPOINTS = {
  ops: 'https://hooks.slack.com/services/OPS_WEBHOOK',
  security: 'https://hooks.slack.com/services/SECURITY_WEBHOOK',
  performance: 'https://hooks.slack.com/services/PERF_WEBHOOK',
};

// Event monitoring
const CRITICAL_EVENTS = [
  'Committed',
  'RoutesApplied',
  'Activated',
  'CodehashMismatch',
  'ActivationNotReady',
  'PausedSet',
];
```

## 🔐 Private Relay Configuration

### MEV Protection Setup

```typescript
interface RelayConfig {
  flashbotsRelay: 'https://relay.flashbots.net';
  backupRelay: 'https://api.blocknative.com/v1/relay';
  gasMultiplier: 1.1; // 10% buffer
  maxRetries: 3;
  retryDelay: 15000; // 15 seconds
}

// Transaction recording
interface TxRecord {
  epoch: number;
  txHash: string;
  operation: 'commit' | 'apply' | 'activate';
  timestamp: number;
  gasUsed: number;
  relayUsed: string;
}

const txHistory: TxRecord[] = [];

async function submitWithRelay(tx: any, operation: string, epoch: number) {
  const relayTx = await flashbots.sendBundle([tx]);

  txHistory.push({
    epoch,
    txHash: relayTx.hash,
    operation,
    timestamp: Date.now(),
    gasUsed: relayTx.gasUsed,
    relayUsed: 'flashbots',
  });

  return relayTx;
}
```

## 🔄 Key Rotation Drill

### Governance Transfer Test

```typescript
async function testGovernanceTransfer() {
  console.log('🔄 Starting governance transfer drill...');

  const [oldGov, newGov, operator] = await ethers.getSigners();

  // Step 1: Verify old governance works
  console.log('1. Testing old governance functionality...');
  try {
    await dispatcher.connect(oldGov).pause();
    await dispatcher.connect(oldGov).unpause();
    console.log('✅ Old governance functional');
  } catch (error) {
    throw new Error('Old governance failed pre-transfer');
  }

  // Step 2: Transfer governance role
  console.log('2. Transferring governance role...');
  const EMERGENCY_ROLE = await dispatcher.EMERGENCY_ROLE();

  await dispatcher.connect(oldGov).grantRole(EMERGENCY_ROLE, newGov.address);
  await dispatcher.connect(oldGov).revokeRole(EMERGENCY_ROLE, oldGov.address);

  // Step 3: Test old governance fails
  console.log('3. Testing old governance rejection...');
  try {
    await dispatcher.connect(oldGov).pause();
    throw new Error('❌ CRITICAL: Old governance still works!');
  } catch (error) {
    if (error.message.includes('AccessControl')) {
      console.log('✅ Old governance properly rejected');
    } else {
      throw error;
    }
  }

  // Step 4: Test new governance works
  console.log('4. Testing new governance acceptance...');
  try {
    await dispatcher.connect(newGov).pause();
    await dispatcher.connect(newGov).unpause();
    console.log('✅ New governance functional');
  } catch (error) {
    throw new Error('❌ CRITICAL: New governance failed!');
  }

  console.log('🎉 Governance transfer drill PASSED');
}
```

## 📋 Large Manifest Splitting

### Ops Playbook for Batch Management

```typescript
interface ManifestSplitter {
  maxBatchSize: number;

  splitManifest(manifest: Manifest): ManifestBatch[] {
    const batches: ManifestBatch[] = [];
    const selectors = manifest.selectors;

    for (let i = 0; i < selectors.length; i += this.maxBatchSize) {
      const batchSelectors = selectors.slice(i, i + this.maxBatchSize);
      const batchFacets = manifest.facets.slice(i, i + this.maxBatchSize);
      const batchCodehashes = manifest.codehashes.slice(i, i + this.maxBatchSize);
      const batchProofs = manifest.proofs.slice(i, i + this.maxBatchSize);

      batches.push({
        selectors: batchSelectors,
        facets: batchFacets,
        codehashes: batchCodehashes,
        proofs: batchProofs,
        batchIndex: batches.length,
        totalBatches: Math.ceil(selectors.length / this.maxBatchSize)
      });
    }

    return batches;
  }
}

// Usage example
const splitter = new ManifestSplitter({ maxBatchSize: 50 });

async function deployLargeManifest(manifest: Manifest) {
  if (manifest.selectors.length <= 50) {
    // Single batch
    return await applyRoutes(
      manifest.selectors,
      manifest.facets,
      manifest.codehashes,
      manifest.proofs,
      manifest.isRightArrays
    );
  }

  // Multiple batches
  const batches = splitter.splitManifest(manifest);
  console.log(`📦 Splitting into ${batches.length} batches`);

  for (const batch of batches) {
    console.log(`⚡ Applying batch ${batch.batchIndex + 1}/${batch.totalBatches}`);
    await applyRoutes(
      batch.selectors,
      batch.facets,
      batch.codehashes,
      batch.proofs,
      batch.isRightArrays
    );

    // Wait between batches to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
```

## 🔧 Final Polish Implementation

### Empty Facet Cleanup (Swap-and-Pop)

```solidity
function _route(bytes4 sel, address facet) internal {
    address prev = selectorFacet[sel];
    if (prev == facet) return;

    if (prev != address(0)) {
        // Remove selector from previous facet
        bytes4[] storage arr = _facetSelectors[prev];
        for (uint i; i < arr.length; ++i) {
            if (arr[i] == sel) {
                arr[i] = arr[arr.length-1];
                arr.pop();
                break;
            }
        }
        _facetHasSelector[prev][sel] = false;
        emit SelectorUnrouted(sel, prev);

        // POLISH: Remove empty facet from _facetList (swap-and-pop)
        if (_facetSelectors[prev].length == 0) {
            for (uint i; i < _facetList.length; ++i) {
                if (_facetList[i] == prev) {
                    _facetList[i] = _facetList[_facetList.length-1];
                    _facetList.pop();
                    break;
                }
            }
        }
    }

    // Route to new facet
    selectorFacet[sel] = facet;
    if (facet != address(0)) {
        if (_facetSelectors[facet].length == 0) _facetList.push(facet);
        if (!_facetHasSelector[facet][sel]) {
            _facetSelectors[facet].push(sel);
            _facetHasSelector[facet][sel] = true;
        }
        emit SelectorRouted(sel, facet);
    }
}
```

### Always Emit RoutesApplied

```solidity
function applyRoutes(
    bytes4[] calldata selectors,
    address[] calldata facets,
    bytes32[] calldata codehashes,
    bytes32[][] calldata proofs,
    bool[][] calldata isRightArrays
) external onlyRole(APPLY_ROLE) {
    if (selectors.length > maxBatchSize) {
        revert BatchTooLarge(selectors.length, maxBatchSize);
    }

    // Duplicate detection
    for (uint i; i < selectors.length; ++i) {
        for (uint j = i + 1; j < selectors.length; ++j) {
            if (selectors[i] == selectors[j]) {
                revert DuplicateSelector(selectors[i]);
            }
        }
    }

    // Snapshot selectors for activation verification
    delete _activationSelectors;
    for (uint i; i < selectors.length; ++i) {
        _activationSelectors.push(selectors[i]);
    }

    // Apply routes
    for (uint i; i < selectors.length; ++i) {
        _route(selectors[i], facets[i]);
    }

    // POLISH: Always emit RoutesApplied (even when count=0)
    emit RoutesApplied(pendingRoot, selectors.length);
}
```

### Bounded Activation Verification

```solidity
bytes4[] private _activationSelectors;

function activateCommittedRoot() external onlyRole(APPLY_ROLE) whenNotPaused {
    if (block.timestamp + etaGrace < pendingEta) {
        revert ActivationNotReady(pendingEta, block.timestamp);
    }

    // POLISH: Bounded verification cost using snapshot
    for (uint i; i < _activationSelectors.length; ++i) {
        bytes4 sel = _activationSelectors[i];
        address facet = selectorFacet[sel];
        if (facet != address(0)) {
            bytes32 currentHash = facet.codehash;
            bytes32 expectedHash = routes[sel].codehash;
            if (currentHash != expectedHash) {
                revert CodehashMismatch(sel, expectedHash, currentHash);
            }
        }
    }

    _activate();
    emit Activated(pendingRoot, pendingEpoch);

    // POLISH: Clear activation selectors after successful activation
    delete _activationSelectors;
}
```

## 📋 Pre-Staging Checklist

### Required Actions Before Deployment

- [ ] **Network Configuration**

  - [ ] Set etaGrace for each target network (30-120s)
  - [ ] Lock maxBatchSize to 50 selectors
  - [ ] Test batch splitting for large manifests (>50 selectors)

- [ ] **Alert Integration**

  - [ ] Configure webhook endpoints for ops/security teams
  - [ ] Test alert triggers: late execution, codehash mismatch, unauthorized access
  - [ ] Set up monitoring dashboard with key metrics

- [ ] **Private Relay Setup**

  - [ ] Configure Flashbots relay endpoints
  - [ ] Test MEV protection for apply/activate operations
  - [ ] Set up transaction recording and audit trail

- [ ] **Key Rotation Validation**

  - [ ] Run governance transfer drill
  - [ ] Verify old signer rejection
  - [ ] Confirm new signer acceptance
  - [ ] Test multi-sig integration (if applicable)

- [ ] **Code Polish Verification**
  - [ ] Confirm empty facet removal (swap-and-pop)
  - [ ] Verify RoutesApplied emits even for count=0
  - [ ] Test bounded activation verification
  - [ ] Validate gas usage within targets

### Deployment Order

1. **Testnet Validation** (Sepolia, Goerli alternatives)

   - Deploy with staging configuration
   - Run full test suite including negative cases
   - Validate cross-chain determinism

2. **L2 Staging** (Optimism Goerli, Arbitrum Goerli)

   - Test with 30s grace periods
   - Validate faster finality assumptions
   - Confirm gas optimization targets

3. **Mainnet Preparation**

   - Final security audit review
   - Governance multi-sig setup
   - Production monitoring activation

4. **Production Rollout**
   - L2s first (lower risk, faster iteration)
   - Ethereum mainnet last (highest value)
   - 24-hour monitoring per network

### Success Criteria

- **Gas Efficiency**: All operations within documented limits
- **Security**: Zero successful attacks or unauthorized access
- **Reliability**: >99.9% uptime and successful upgrade rate
- **Observability**: Complete monitoring coverage with sub-minute alerting

---

**Document Version**: 1.0 **Prepared for**: Staging Rollout **Next Review**: Post-staging validation

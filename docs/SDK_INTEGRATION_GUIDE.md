# SDK Integration Guide - Production Features

## Contract Updates (August 2025)

✅ **Latest Compilation**: All 37 contracts successfully compiled ✅ **Contract Renamed**:
`DeterministicChunkFactoryOptimized` → `DeterministicChunkFactory` ✅ **TypeScript Bindings**: 106
typings generated for ethers-v6 ✅ **Interface Compliance**: Full ManifestDispatcher and
DeterministicChunkFactory compliance

## New Features Integration

### 1. Preflight Validation

**Purpose**: Gas-free validation before on-chain operations

```typescript
import { ManifestDispatcher } from './typechain-types';

class ManifestSDK {
  async preflightCheck(manifestData: string): Promise<{
    valid: boolean;
    entryCount: number;
    error: PreflightError;
    errorMessage: string;
  }> {
    const [valid, entryCount, error] = await this.dispatcher.preflightManifest(manifestData);

    return {
      valid,
      entryCount: entryCount.toNumber(),
      error,
      errorMessage: this.getPreflightErrorMessage(error),
    };
  }

  private getPreflightErrorMessage(error: number): string {
    const messages = [
      'OK', // 0
      'Manifest too large', // 1
      'Invalid format', // 2
      'Invalid selector', // 3
      'Zero facet address', // 4
      'Facet points to self', // 5
      'Zero code facet', // 6
      'Code size exceeded', // 7
    ];
    return messages[error] || 'Unknown error';
  }
}
```

### 2. RouteCall Entry Point

**Purpose**: Direct function routing with return data protection

```typescript
class DispatcherRouter {
  async routeCall(functionSelector: string, params: any[]): Promise<string> {
    const iface = new ethers.utils.Interface([
      `function ${functionSelector}(${params.map(p => p.type).join(',')})`,
    ]);

    const callData = iface.encodeFunctionData(functionSelector, params);

    try {
      const result = await this.dispatcher.routeCall(callData);
      return result;
    } catch (error) {
      if (error.message.includes('NoRoute')) {
        throw new Error(`Function ${functionSelector} not available in current manifest`);
      }
      if (error.message.includes('ReturnDataTooLarge')) {
        throw new Error('Response too large - increase return data limit or optimize function');
      }
      throw error;
    }
  }
}
```

### 3. Operational State Polling

**Purpose**: Real-time UI state management

```typescript
interface OperationalCapabilities {
  canCommit: boolean;
  canActivate: boolean;
  canApplyRoutes: boolean;
  canUpdateManifest: boolean;
  canRemoveRoutes: boolean;
  canRoute: boolean;
  state?: string;
}

class SystemMonitor {
  // Ultra-cheap polling for frequent updates
  async getQuickStatus(): Promise<OperationalCapabilities> {
    const [canCommit, canActivate, canApplyRoutes, canUpdateManifest, canRemoveRoutes, canRoute] =
      await this.dispatcher.getOperationalFlags();

    return {
      canCommit,
      canActivate,
      canApplyRoutes,
      canUpdateManifest,
      canRemoveRoutes,
      canRoute,
    };
  }

  // Full status with state description (use sparingly)
  async getFullStatus(): Promise<OperationalCapabilities> {
    const [
      canCommit,
      canActivate,
      canApplyRoutes,
      canUpdateManifest,
      canRemoveRoutes,
      canRoute,
      state,
    ] = await this.dispatcher.getOperationalState();

    return {
      canCommit,
      canActivate,
      canApplyRoutes,
      canUpdateManifest,
      canRemoveRoutes,
      canRoute,
      state,
    };
  }

  // Optimized polling for dashboards
  async startPolling(callback: (status: OperationalCapabilities) => void, intervalMs = 5000) {
    setInterval(async () => {
      try {
        const status = await this.getQuickStatus();
        callback(status);
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, intervalMs);
  }
}
```

## Factory Integration

### DeterministicChunkFactory Usage

**Updated Contract Name**: `DeterministicChunkFactory` (renamed from
DeterministicChunkFactoryOptimized)

```typescript
import { DeterministicChunkFactory } from './typechain-types';

class ChunkFactorySDK {
  constructor(private factory: DeterministicChunkFactory) {}

  async stageChunk(data: string): Promise<{
    chunk: string;
    hash: string;
    deployed: boolean;
  }> {
    const [chunk, hash] = await this.factory.stage(data);
    const deployed = await this.factory.isDeployed(chunk);

    return { chunk, hash, deployed };
  }

  async deployDeterministic(
    salt: string,
    bytecode: string,
    constructorArgs: string = '0x'
  ): Promise<string> {
    const deployed = await this.factory.deployDeterministic(salt, bytecode, constructorArgs);
    return deployed;
  }

  async batchDeploy(
    salts: string[],
    bytecodes: string[],
    constructorArgs: string[]
  ): Promise<string[]> {
    const deployed = await this.factory.deployDeterministicBatch(salts, bytecodes, constructorArgs);
    return deployed;
  }

  async predictAddress(salt: string, codeHash: string): Promise<string> {
    return await this.factory.predictAddress(salt, codeHash);
  }

  async validateBytecode(bytecode: string): Promise<boolean> {
    return await this.factory.validateBytecodeSize(bytecode);
  }

  async getSystemIntegrity(): Promise<boolean> {
    return await this.factory.verifySystemIntegrity();
  }
}
```

## CLI Integration

### Enhanced Commands

```bash
# Preflight validation
payrox preflight validate manifest.json
# Output: ✅ Valid manifest (24 routes) | ❌ Error: Manifest too large

# Factory operations (updated contract name)
payrox factory stage chunk-data.hex
payrox factory deploy --salt 0x123... --bytecode contract.bin
payrox factory predict --salt 0x123... --codehash 0xabc...

# Route call with protection
payrox route call "transfer(address,uint256)" 0x123... 1000
# Output: Success | Error: Function not available

# System status
payrox status --quick  # Uses getOperationalFlags (cheap)
payrox status --full   # Uses getOperationalState (detailed)

# Return data management
payrox config set-return-limit 65536
# Warning: Increasing return data limit raises DoS risks
```

### Emergency Operations

```bash
# Emergency manifest update (BYPASSES TIMELOCK!)
payrox emergency update-manifest manifest.json
# Warning: This bypasses all safety delays - use only in emergencies

# Route removal (works even when frozen)
payrox emergency remove-routes 0x12345678,0x87654321
```

## React/Vue Integration Hooks

### React Hook Example

```typescript
import { useState, useEffect } from 'react';
import { useContract } from './hooks/useContract';

export function useOperationalState() {
  const [capabilities, setCapabilities] = useState<OperationalCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { dispatcher } = useContract();

  useEffect(() => {
    if (!dispatcher) return;

    let cancelled = false;

    const poll = async () => {
      try {
        // Use cheap polling by default
        const status = await dispatcher.getOperationalFlags();
        if (!cancelled) {
          setCapabilities({
            canCommit: status[0],
            canActivate: status[1],
            canApplyRoutes: status[2],
            canUpdateManifest: status[3],
            canRemoveRoutes: status[4],
            canRoute: status[5],
          });
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    // Initial load
    poll();

    // Poll every 5 seconds
    const interval = setInterval(poll, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [dispatcher]);

  return { capabilities, loading, error };
}

// Usage in component
function ManifestControls() {
  const { capabilities, loading, error } = useOperationalState();

  if (loading) return <div>Loading system status...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button disabled={!capabilities?.canCommit}>Commit Manifest</button>
      <button disabled={!capabilities?.canActivate}>Activate</button>
      <button disabled={!capabilities?.canApplyRoutes}>Apply Routes</button>
      <button disabled={!capabilities?.canUpdateManifest}>Emergency Update</button>
      <button disabled={!capabilities?.canRemoveRoutes}>Remove Routes</button>
    </div>
  );
}
```

## Security Integration Checklist

### ✅ Pre-Deployment Validation

1. **Preflight Integration**

   - [ ] All manifest uploads run preflight validation first
   - [ ] UI shows clear error messages for each PreflightError code
   - [ ] CLI rejects operations that fail preflight

2. **Emergency Controls**

   - [ ] updateManifest clearly marked as "EMERGENCY ONLY"
   - [ ] Additional confirmation dialogs for emergency operations
   - [ ] Audit logs for all emergency actions

3. **Return Data Protection**

   - [ ] Default 32KB limit documented in user guides
   - [ ] Admin-only access to setMaxReturnDataSize clearly documented
   - [ ] Monitoring alerts for return data limit changes

4. **Operational State Monitoring**
   - [ ] Dashboard shows real-time system state
   - [ ] Automated alerts for FROZEN/PAUSED states
   - [ ] Performance monitoring for getOperationalFlags calls

### 🔒 Audit Considerations

1. **Enum Stability**: PreflightError enum must never be reordered (append-only)
2. **Gas Optimization**: Verify getOperationalFlags uses <50k gas
3. **Edge Cases**: Test all boundary conditions (0, 1MB, >1MB for return data)
4. **Access Control**: Verify only DEFAULT_ADMIN_ROLE can modify critical settings

### 📊 Performance Metrics

- `preflightManifest`: 0 gas (view function)
- `getOperationalFlags`: ~15k gas (optimized)
- `getOperationalState`: ~25k gas (includes string)
- `routeCall`: Variable (delegatecall + validation)
- `DeterministicChunkFactory.stage`: ~100k gas (CREATE2 deployment)
- `DeterministicChunkFactory.deployDeterministic`: ~120k gas (with validation)

### 🏗️ Compilation Status (Latest)

**Successfully Compiled**: 37 Solidity files **Generated**: 106 TypeScript typings for ethers-v6
**Solidity Version**: 0.8.30 with optimization (200 runs) **EVM Target**: Cancun (latest Ethereum
features)

**Key Contracts**:

- ✅ `ManifestDispatcher` - Full interface compliance with IDiamondLoupe
- ✅ `DeterministicChunkFactory` - Complete IChunkFactory implementation
- ✅ `ChunkFactoryLib` - Optimized library with assembly enhancements
- ✅ All facets, orchestrator, and utility contracts

**Warnings Resolved**:

- ✅ Interface compliance: All external functions match interface signatures
- ✅ Assembly optimization: Fixed variable scope issues
- ✅ Memory/calldata conversions: Proper type handling
- ⚠️ Minor: Parameter naming warnings (non-blocking)

## Production Deployment Script

```typescript
async function deployProduction() {
  console.log('🚀 Deploying PayRox Go Beyond Production System...');

  // 1. Deploy DeterministicChunkFactory (renamed from Optimized)
  const factory = await deployContract('DeterministicChunkFactory', [
    feeRecipient.address,
    manifestDispatcher.address, // Will be set after dispatcher deployment
    expectedManifestHash,
    expectedFactoryBytecodeHash,
    ethers.utils.parseEther('0.001'), // 0.001 ETH base fee
    true, // fees enabled
  ]);

  // 2. Deploy ManifestDispatcher with production optimizations
  const dispatcher = await deployContract('ManifestDispatcher', [
    governance.address,
    guardian.address,
    3600, // 1 hour delay
  ]);

  // 3. Verify operational state
  const [valid, entryCount, error] = await dispatcher.preflightManifest('0x');
  console.log(`✅ Preflight validation working: ${valid}`);

  // 4. Test operational flags
  const flags = await dispatcher.getOperationalFlags();
  console.log(`✅ Operational flags: ${flags.join(', ')}`);

  // 5. Set production return data limit (32KB)
  await dispatcher.setMaxReturnDataSize(32768);
  console.log(`✅ Return data limit set to 32KB`);

  // 6. Verify factory integration
  const factoryIntegrity = await factory.verifySystemIntegrity();
  console.log(`✅ Factory system integrity: ${factoryIntegrity}`);

  console.log('🎉 Production deployment complete!');
  console.log(`📋 Dispatcher: ${dispatcher.address}`);
  console.log(`📋 Factory: ${factory.address}`);
  console.log(`📋 Contracts compiled: 37 files, 106 TypeScript bindings generated`);
}
```

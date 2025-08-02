# PayRox Go Beyond Quick Reference

## Installation

```bash
npm install @payrox/go-beyond-sdk
```

## Basic Usage

### Connect to PayRox

```typescript
import { PayRoxClient } from '@payrox/go-beyond-sdk';

const client = PayRoxClient.fromRpc('http://localhost:8545', privateKey, 'localhost');
```

### Deploy Contract

```typescript
const result = await client.deployContract(
  contractBytecode,
  constructorArgs,
  'token' // category
);
console.log('Deployed to:', result.address);
```

### Calculate Address (Before Deploying)

```typescript
const address = await client.calculateAddress(bytecode, args);
console.log('Will deploy to:', address);
```

## Cross-Chain Deployment

### Generate Universal Salt

```bash
npx hardhat crosschain:generate-salt \
  --content "0x608060405234801561001057600080fd5b50..." \
  --deployer "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
```

### Deploy Across Networks

```bash
npx hardhat crosschain:deploy \
  --networks "ethereum,polygon,arbitrum" \
  --contracts "./crosschain-contracts.json" \
  --verify
```

### Predict Addresses

```bash
npx hardhat crosschain:predict-addresses \
  --networks "ethereum,polygon" \
  --salt "0x1234..." \
  --bytecode "0x608060..."
```

### Health Check

```bash
npx hardhat crosschain:health-check \
  --networks "ethereum,polygon,arbitrum"
```

## Production Testing & Validation

### Complete Production Timelock Test

```bash
npx hardhat run scripts/production-timelock-test.ts --network hardhat
```

**Features Tested:**

- ✅ Queue ETA validation (3600-second timelock)
- ✅ Governance role controls (COMMIT/APPLY/EMERGENCY roles)
- ✅ Emergency pause/unpause functionality
- ✅ Diamond Loupe compatibility patterns
- ✅ Production invariants (EIP-170, codehash integrity, root consumption)
- ✅ Cross-chain determinism validation
- ✅ Gas optimization targets (~212k total workflow)

**Gas Metrics:**

- Commit: ~72k gas
- Apply: ~85k gas (66k per selector)
- Activate: ~54k gas

### Multi-Facet Production Test

```bash
npx hardhat run scripts/comprehensive-multi-facet-production-test.ts --network hardhat
```

### Fixed Routing Baseline Test

```bash
npx hardhat run scripts/fixed-routing-test.ts --network hardhat
```

## Current Deployment

**Network**: Localhost (Hardhat) **Deployment Fee**: 0.0007 ETH **Status**: ✅ Production Ready with
Cross-Chain Support

**Contract Addresses:**

- Factory: `0x59b670e9fA9D0A427751Af201D676719a970857b`
- Dispatcher: `0x68B1D87F95878fE05B998F19b66F4baba5De1aed`
- Orchestrator: `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9`

## Cross-Chain Networks Supported

### Mainnet Networks

- Ethereum Mainnet (Chain ID: 1)
- Polygon (Chain ID: 137)
- Polygon zkEVM (Chain ID: 1101)
- Arbitrum One (Chain ID: 42161)
- Optimism (Chain ID: 10)
- Base (Chain ID: 8453)
- Avalanche C-Chain (Chain ID: 43114)
- Fantom (Chain ID: 250)
- BNB Smart Chain (Chain ID: 56)
- opBNB (Chain ID: 204)
- Sei EVM (Chain ID: 1329)

### Testnet Networks

- Sepolia (Chain ID: 11155111)
- Polygon zkEVM Cardona (Chain ID: 2442)
- Arbitrum Sepolia (Chain ID: 421614)
- Optimism Sepolia (Chain ID: 11155420)
- Base Sepolia (Chain ID: 84532)
- Avalanche Fuji (Chain ID: 43113)
- Fantom Testnet (Chain ID: 4002)
- BNB Testnet (Chain ID: 97)
- opBNB Testnet (Chain ID: 5611)
- Sei Devnet (Chain ID: 713715)

### Local Networks

- Hardhat (Chain ID: 31337)
- Localhost (Chain ID: 31337)

## Examples

### ERC20 Token

```typescript
const token = await client.deployContract(
  tokenBytecode,
  ['MyToken', 'MTK', 18, ethers.parseEther('1000000')],
  'token'
);
```

### Batch Deployment

```typescript
const results = await client.orchestrator.deployBatch([
  { bytecode: token1, constructorArgs: ['Token1', 'TK1'] },
  { bytecode: token2, constructorArgs: ['Token2', 'TK2'] },
]);
```

## CLI Usage

```bash
# Install CLI
npm install -g @payrox/go-beyond-sdk

# Deploy contract
payrox-cli deploy <bytecode> --args arg1,arg2 --network localhost

# Check fee
payrox-cli fee --network localhost
```

## Production Ready

The PayRox SDK is ready for production use! 🚀

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

## Current Deployment

**Network**: Localhost (Hardhat) **Deployment Fee**: 0.0007 ETH **Status**: ✅ Production Ready with
Cross-Chain Support

**Contract Addresses:**

- Factory: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Dispatcher: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- Orchestrator: `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9`

## Cross-Chain Networks Supported

- Ethereum Mainnet (Chain ID: 1)
- Polygon Mainnet (Chain ID: 137)
- Arbitrum One (Chain ID: 42161)
- Goerli Testnet (Chain ID: 5)
- Sepolia Testnet (Chain ID: 11155111)
- Mumbai Testnet (Chain ID: 80001)
- Local Networks (Hardhat/Localhost)

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

**The PayRox SDK is ready for production use! 🚀**

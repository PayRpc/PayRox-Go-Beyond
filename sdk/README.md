# PayRox Go Beyond SDK

Production-ready TypeScript SDK for building deterministic dApps with content-addressed deployment
on the PayRox ecosystem. Now with full cross-chain deployment capabilities across 18+ EVM networks.

## 🚀 Quick Start

### Installation

```bash
npm install @payrox/go-beyond-sdk
# or
yarn add @payrox/go-beyond-sdk
```

### Basic Usage

```typescript
import { PayRoxClient, createClient } from '@payrox/go-beyond-sdk';

// Connect to PayRox network
const client = createClient(
  'http://localhost:8545', // RPC URL
  'your-private-key', // Optional private key
  'localhost' // Network name
);

// Deploy a contract
const result = await client.deployContract(
  contractBytecode,
  constructorArgs,
  'token' // Contract type
);

console.log('Deployed to:', result.address);
console.log('Transaction:', result.transactionHash);
```

### Cross-Chain Usage

```typescript
import { CrossChainClient, createCrossChainClient } from '@payrox/go-beyond-sdk';

// Initialize cross-chain client
const crossChainClient = createCrossChainClient({
  networks: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
  privateKey: 'your-private-key',
});

// Deploy across multiple networks with consistent addresses
const deploymentResults = await crossChainClient.deployContract({
  bytecode: contractBytecode,
  constructorArgs: constructorArgs,
  contractType: 'token',
  verifyConsistency: true,
});

deploymentResults.forEach(result => {
  console.log(`${result.network}: ${result.address}`);
});
```

## 📋 Features

- ✅ **Deterministic Deployment** - CREATE2-based deterministic contract addresses
- ✅ **Cross-Chain Support** - Deploy to 18+ EVM networks with address consistency
- ✅ **Network Management** - Automated network configuration and validation
- ✅ **Content Addressing** - Deploy contracts as addressable chunks
- ✅ **Manifest System** - Organize and version your deployments
- ✅ **Multi-Network Support** - Works on mainnet, testnets, and localhost
- ✅ **TypeScript First** - Full type safety and IntelliSense support
- ✅ **Browser Compatible** - Works in Node.js and browsers
- ✅ **Gas Optimization** - Built-in gas estimation and optimization
- ✅ **Event Monitoring** - Real-time deployment and execution events

## 🏗️ Architecture

The PayRox SDK provides access to the core PayRox contracts:

- **DeterministicChunkFactory** (`0x5FbDB...aa3`) - Deterministic contract deployment
- **ManifestDispatcher** (`0xe7f17...512`) - Function routing and execution
- **Orchestrator** (`0xDc64a...C9`) - Complex deployment workflows
- **Governance** (`0x5FC8d...707`) - System governance and upgrades
- **AuditRegistry** (`0x0165...8F`) - Security and compliance tracking

## 🔧 API Reference

### PayRoxClient

Main client for interacting with PayRox contracts.

```typescript
import { PayRoxClient } from '@payrox/go-beyond-sdk';

// Create client with provider
const client = new PayRoxClient(provider, signer, 'localhost');

// Or create from RPC
const client = PayRoxClient.fromRpc('http://localhost:8545', privateKey);

// Or create from browser wallet
const client = await PayRoxClient.fromBrowser();
```

#### Methods

##### `deployContract(bytecode, constructorArgs?, contractType?, options?)`

Deploy a contract using deterministic deployment.

```typescript
const result = await client.deployContract(
  '0x608060405234801561001057600080fd5b50...', // Contract bytecode
  ['param1', 'param2'], // Constructor arguments
  'token', // Contract type
  {
    gasLimit: 5000000,
    maxFeePerGas: '20000000000',
  }
);

// Returns:
// {
//   address: string,         // Deployed contract address
//   transactionHash: string, // Transaction hash
//   chunkAddress: string,    // Chunk storage address
//   deploymentFee: string    // Fee paid in ETH
// }
```

##### `calculateAddress(bytecode, constructorArgs?)`

Calculate the deterministic address without deploying.

```typescript
const address = await client.calculateAddress(contractBytecode, constructorArgs);
console.log('Will deploy to:', address);
```

##### `isDeployed(bytecode, constructorArgs?)`

Check if a contract is already deployed.

```typescript
const deployed = await client.isDeployed(contractBytecode, constructorArgs);
if (deployed) {
  console.log('Contract already exists!');
}
```

##### `getSystemStatus()`

Get PayRox system information.

```typescript
const status = await client.getSystemStatus();
console.log('Network:', status.network);
console.log('Factory:', status.factoryAddress);
console.log('Deployment fee:', status.deploymentFee);
```

### ChunkFactory

Direct interface to the DeterministicChunkFactory contract.

```typescript
const factory = client.factory;

// Deploy a chunk
const result = await factory.deployChunk(bytecode, constructorArgs);

// Get current deployment fee
const fee = await factory.getCurrentFee();
console.log('Deployment fee:', ethers.formatEther(fee), 'ETH');
```

### Dispatcher

Interface to the ManifestDispatcher for function routing.

```typescript
const dispatcher = client.dispatcher;

// Update routing manifest
await dispatcher.updateManifest(merkleRoot, ipfsHash);

// Call a routed function
const result = await dispatcher.callFunction(
  '0xa9059cbb', // transfer(address,uint256)
  encodedData
);

// Get routing info
const route = await dispatcher.getRoute('0xa9059cbb');
console.log('Routes to facet:', route.facet);
```

### Orchestrator

Interface for complex deployment workflows.

```typescript
const orchestrator = client.orchestrator;

// Deploy multiple contracts in one transaction
const result = await orchestrator.deployBatch([
  { bytecode: contract1Bytecode, constructorArgs: ['arg1'] },
  { bytecode: contract2Bytecode, constructorArgs: ['arg2'] },
]);

console.log('Deployed addresses:', result.addresses);
```

### ManifestBuilder

Build deployment manifests for complex dApps.

```typescript
const manifest = await client.manifest.build([
  {
    name: 'Token',
    bytecode: tokenBytecode,
    constructorArgs: ['TokenName', 'TKN'],
    contractType: 'token',
  },
  {
    name: 'Vault',
    bytecode: vaultBytecode,
    constructorArgs: [tokenAddress],
    contractType: 'defi',
  },
]);

console.log('Manifest root:', manifest.merkleRoot);
```

## 🌐 Network Configuration

### Supported Networks

- **Localhost** (Chain ID: 31337) - Development
- **Mainnet** (Chain ID: 1) - Production (coming soon)
- **Goerli** (Chain ID: 5) - Testnet (coming soon)
- **Sepolia** (Chain ID: 11155111) - Testnet (coming soon)

### Current Deployed Addresses (Localhost)

```typescript
import { NETWORKS } from '@payrox/go-beyond-sdk';

const localhost = NETWORKS.localhost;
console.log('Factory:', localhost.contracts.factory);
console.log('Dispatcher:', localhost.contracts.dispatcher);
console.log('Deployment fee:', localhost.fees.deploymentFee); // 0.0007 ETH
```

## 💰 Fees and Gas

### Deployment Fees

- **Standard deployment fee**: 0.0007 ETH per contract
- **Gas estimation**: Automatic gas estimation with safety margins
- **Fee optimization**: Batch deployments reduce per-contract costs

```typescript
// Get current fee
const feeEth = client.getDeploymentFee(); // "0.0007"

// Estimate gas
const gasEstimate = await client.estimateDeploymentGas(bytecode, args);
console.log('Estimated gas:', gasEstimate.toString());

// Calculate total cost
import { Utils } from '@payrox/go-beyond-sdk';
const cost = Utils.calculateDeploymentCost(deploymentFee, gasUsed, gasPrice);
console.log('Total cost:', cost.total, 'ETH');
```

## 🛠️ Development Tools

### Contract Types

The SDK supports categorizing contracts for better organization:

```typescript
import { CONTRACT_TYPES } from '@payrox/go-beyond-sdk';

// Available types:
CONTRACT_TYPES.FACET; // "facet"
CONTRACT_TYPES.LIBRARY; // "library"
CONTRACT_TYPES.UTILITY; // "utility"
CONTRACT_TYPES.TOKEN; // "token"
CONTRACT_TYPES.DEFI; // "defi"
CONTRACT_TYPES.NFT; // "nft"
CONTRACT_TYPES.GOVERNANCE; // "governance"
```

### Utilities

```typescript
import { Utils } from '@payrox/go-beyond-sdk';

// Function selectors
const selector = Utils.getFunctionSelector('transfer(address,uint256)');
console.log(selector); // "0xa9059cbb"

// Address validation
const isValid = Utils.isValidAddress('0x742d35Cc...');

// CREATE2 calculations
const address = Utils.calculateCreate2Address(factory, salt, initCodeHash);

// Gas price recommendations
const gasPrice = Utils.calculateGasPrice(baseFee, priorityFee);
```

## 📚 Examples

### Deploy an ERC20 Token

```typescript
import { PayRoxClient } from '@payrox/go-beyond-sdk';

const client = PayRoxClient.fromRpc('http://localhost:8545', privateKey);

// ERC20 token bytecode (compile with Solidity)
const tokenBytecode = '0x608060405234801561001057600080fd5b50...';

const result = await client.deployContract(
  tokenBytecode,
  ['MyToken', 'MTK', 18, ethers.parseEther('1000000')], // Constructor args
  'token'
);

console.log('Token deployed to:', result.address);

// Token is now available at the deterministic address
const token = client.getContract(result.address, ERC20_ABI);
const symbol = await token.symbol();
console.log('Token symbol:', symbol);
```

### Deploy a DeFi Vault

```typescript
// Deploy token first
const tokenResult = await client.deployContract(tokenBytecode, tokenArgs, 'token');

// Deploy vault that uses the token
const vaultResult = await client.deployContract(
  vaultBytecode,
  [tokenResult.address], // Vault constructor needs token address
  'defi'
);

console.log('Vault deployed to:', vaultResult.address);
```

### Batch Deployment

```typescript
const batchResult = await client.orchestrator.deployBatch([
  {
    bytecode: tokenBytecode,
    constructorArgs: ['Token1', 'TK1'],
  },
  {
    bytecode: tokenBytecode,
    constructorArgs: ['Token2', 'TK2'],
  },
  {
    bytecode: vaultBytecode,
    constructorArgs: [], // Will be updated after tokens deploy
  },
]);

console.log('All contracts deployed:', batchResult.addresses);
```

### Listen to Events

```typescript
// Listen for deployments
client.factory.getContract().on('ChunkDeployed', (hash, chunk, size) => {
  console.log('New chunk deployed:', chunk);
});

// Listen for manifest updates
client.dispatcher.onManifestUpdated((oldRoot, newRoot, ipfsHash) => {
  console.log('Manifest updated:', newRoot);
});

// Listen for batch deployments
client.orchestrator.onBatchDeploymentCompleted((deploymentId, contracts) => {
  console.log('Batch deployment completed:', contracts);
});
```

## 🔒 Security

### Deterministic Deployment

All contracts are deployed using CREATE2 with content-based addressing:

```typescript
// Same bytecode + constructor args = same address every time
const address1 = await client.calculateAddress(bytecode, args);
const address2 = await client.calculateAddress(bytecode, args);
console.log(address1 === address2); // true

// Deploy to calculated address
const result = await client.deployContract(bytecode, args);
console.log(result.address === address1); // true
```

### Deployment Verification

```typescript
// Verify deployment integrity
const verified = await client.verifyDeployment(deployedAddress, expectedBytecode);

if (verified) {
  console.log('Deployment verified successfully');
} else {
  console.log('Warning: Deployment verification failed');
}
```

## 🚦 Error Handling

```typescript
try {
  const result = await client.deployContract(bytecode, args);
  console.log('Success:', result.address);
} catch (error) {
  if (error.message.includes('insufficient funds')) {
    console.log('Not enough ETH for deployment fee');
  } else if (error.message.includes('already deployed')) {
    console.log('Contract already exists at this address');
  } else {
    console.log('Deployment failed:', error.message);
  }
}
```

## 🧪 Testing

```typescript
// Check if PayRox is available on network
const available = await client.isPayRoxAvailable();
if (!available) {
  throw new Error('PayRox contracts not deployed on this network');
}

// Get system status
const status = await client.getSystemStatus();
console.log('Network ready:', status.available);
```

## 📄 TypeScript Support

The SDK is built with TypeScript and provides full type safety:

```typescript
import type { NetworkConfig, ManifestContract, DeploymentResult } from '@payrox/go-beyond-sdk';

const config: NetworkConfig = {
  name: 'localhost',
  chainId: 31337,
  contracts: {
    /* ... */
  },
  fees: {
    /* ... */
  },
};

const contract: ManifestContract = {
  name: 'MyContract',
  bytecode: '0x...',
  constructorArgs: ['arg1', 'arg2'],
  contractType: 'utility',
};
```

## 🆘 Support

- **Documentation**: [PayRox Docs](https://docs.payrox.dev)
- **GitHub**: [PayRox-Go-Beyond](https://github.com/PayRpc/PayRox-Go-Beyond)
- **Issues**: [GitHub Issues](https://github.com/PayRpc/PayRox-Go-Beyond/issues)
- **Discord**: [PayRox Community](https://discord.gg/payrox)

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

---

Built with ❤️ by the PayRox team

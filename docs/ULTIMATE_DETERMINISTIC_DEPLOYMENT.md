# 🚀 Ultimate Deterministic Deployment Suite

## Overview

The **Ultimate Deterministic Deployment Suite** is the most comprehensive CREATE2 deployment solution for PayRox Go Beyond, combining:

- **PayRox Network Management**: Integrated with the existing network utilities
- **ChunkFactoryLib Integration**: Full CREATE2 deterministic deployment support
- **Advanced Error Handling**: Comprehensive validation and recovery
- **Cross-Chain Support**: Deploy to multiple networks seamlessly
- **Automated Verification**: Smart contract verification on block explorers
- **Batch Operations**: Deploy multiple contracts efficiently

## 🎯 Key Features

### ✅ CREATE2 Deterministic Deployment
- **Predictable Addresses**: Uses ChunkFactoryLib pattern with `chunk:` prefix salting
- **Bytecode Validation**: Automatic size checking and init code preparation
- **Address Prediction**: Predict deployment addresses before actual deployment
- **Collision Detection**: Check if contracts already exist at predicted addresses

### ✅ Network Integration
- **PayRox Network Manager**: Leverages existing network configuration and validation
- **Multi-Network Support**: Deploy to any supported PayRox network
- **Local Development**: Special handling for localhost/hardhat networks
- **Network Validation**: Comprehensive pre-deployment network checks

### ✅ Advanced Deployment Options
- **Gas Optimization**: Configurable gas limits and pricing
- **Fee Support**: Optional deployment fees for factory contracts
- **Idempotent Deployment**: Skip deployment if contract already exists
- **Batch Processing**: Deploy multiple contracts in sequence
- **Cross-Chain Orchestration**: Deploy same contract to multiple networks

### ✅ Error Handling & Recovery
- **Comprehensive Validation**: Pre-deployment checks for all components
- **Graceful Failures**: Detailed error reporting with recovery suggestions
- **Retry Logic**: Automatic retry for transient failures
- **Rollback Support**: Safe deployment rollback mechanisms

## 🔧 Installation & Setup

### Prerequisites
```bash
# Ensure you have the PayRox Go Beyond environment set up
npm install
npx hardhat compile
```

### Quick Start
```bash
# Deploy a single contract
npx hardhat run scripts/ultimate-deterministic-deploy.ts --network localhost

# Or use the CLI directly
node scripts/ultimate-deterministic-deploy.ts deploy \
  --contract "TerraStakeNFTCoreFacet" \
  --salt "terrastake-nft-core-v1" \
  --verify
```

## 📖 Usage Guide

### 1. Single Contract Deployment

#### Basic Deployment
```bash
# Deploy with minimal options
npx ts-node scripts/ultimate-deterministic-deploy.ts deploy \
  --contract "MyContract" \
  --salt "my-contract-v1"
```

#### Advanced Deployment
```bash
# Deploy with all options
npx ts-node scripts/ultimate-deterministic-deploy.ts deploy \
  --contract "MyDeFiFacet" \
  --salt "my-defi-facet-v1.0.0" \
  --args '[1000, "0x123..."]' \
  --factory "0xYourFactoryAddress" \
  --fee "1000000000000000000" \
  --gas-limit 3000000 \
  --gas-price 20 \
  --verify \
  --skip-if-exists
```

### 2. Address Prediction

```bash
# Predict deployment address without deploying
npx ts-node scripts/ultimate-deterministic-deploy.ts predict \
  --contract "MyDeFiFacet" \
  --salt "my-defi-facet-v1.0.0" \
  --args '[1000, "0x123..."]'
```

Output:
```
🔮 CREATE2 Address Prediction:
📍 Predicted Address: 0xDDa0648FA8c9cD593416EC37089C2a2E6060B45c
🧂 Salt: 0x1234567890abcdef...
#️⃣ Init Code Hash: 0xabcdef1234567890...
📏 Bytecode Size: 12,345 bytes
🏭 Factory: 0xFactory123...
🌐 Network: localhost (31337)
✅ Already Deployed: No
```

### 3. Batch Deployment

#### Create Deployment Plan
Create a JSON file (e.g., `batch-plan.json`):
```json
{
  "contracts": [
    {
      "contractName": "DeterministicChunkFactory",
      "saltString": "payrox-chunk-factory-v2.0.0",
      "constructorArgs": [],
      "verifyContract": true,
      "skipIfExists": true
    },
    {
      "contractName": "ManifestDispatcher", 
      "saltString": "payrox-manifest-dispatcher-v2.0.0",
      "constructorArgs": [],
      "verifyContract": true,
      "skipIfExists": true
    }
  ],
  "deploymentOrder": ["DeterministicChunkFactory", "ManifestDispatcher"]
}
```

#### Execute Batch Deployment
```bash
npx ts-node scripts/ultimate-deterministic-deploy.ts batch \
  --plan scripts/examples/batch-deployment-plan.json
```

### 4. Programmatic Usage

```typescript
import { UltimateDeterministicDeployer } from './scripts/ultimate-deterministic-deploy';

const deployer = new UltimateDeterministicDeployer();

// Single deployment
const result = await deployer.deployContract({
  contractName: 'MyDeFiFacet',
  saltString: 'my-defi-facet-v1.0.0',
  constructorArgs: [],
  verifyContract: true,
  skipIfExists: true
});

console.log(`Deployed at: ${result.deployedAddress}`);

// Batch deployment
const batchPlan = {
  contracts: [/* ... */],
  deploymentOrder: [/* ... */]
};

const batchResults = await deployer.deployBatch(batchPlan);
```

## 🔍 CREATE2 Implementation Details

### Salt Generation
The script uses the ChunkFactoryLib pattern for salt generation:

```typescript
// Salt = keccak256(abi.encode("chunk:" + saltString))
const salt = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(
    ['string'], 
    [`chunk:${saltString}`]
  )
);
```

### Address Prediction
```typescript
// predictedAddress = CREATE2(factory, salt, keccak256(initCode))
const initCodeHash = ethers.keccak256(bytecode + encodedConstructorArgs);
const predictedAddress = await factory.predictAddress(salt, initCodeHash);
```

### Bytecode Preparation
```typescript
// For contracts with constructor arguments
const encodedArgs = ContractFactory.interface.encodeDeploy(constructorArgs);
const initCode = bytecode + encodedArgs.slice(2); // Remove 0x prefix

// For contracts without constructor arguments
const initCode = bytecode; // Use bytecode directly
```

## 🌐 Network Support

### Supported Networks
- **Mainnet**: Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, Fantom, BSC
- **Testnets**: Sepolia, Mumbai, Arbitrum Sepolia, Optimism Sepolia, Base Sepolia, Fuji, Fantom Testnet, BSC Testnet
- **L2s**: opBNB, Polygon zkEVM, Sei Network
- **Development**: Localhost, Hardhat Network

### Network-Specific Features
- **Automatic Network Detection**: Uses PayRox network manager for validation
- **Chain ID Mapping**: Automatic chain ID to network name resolution
- **Deployment Path Management**: Network-specific artifact storage
- **Gas Price Optimization**: Network-appropriate gas pricing

## 📊 Deployment Reports

### Single Deployment Result
```json
{
  "success": true,
  "contractName": "MyDeFiFacet",
  "predictedAddress": "0xDDa0648FA8c9cD593416EC37089C2a2E6060B45c",
  "deployedAddress": "0xDDa0648FA8c9cD593416EC37089C2a2E6060B45c",
  "transactionHash": "0xabcdef123456...",
  "gasUsed": 2345678,
  "deploymentCost": "0.045",
  "verificationStatus": "verified",
  "network": "localhost",
  "chainId": "31337",
  "metadata": {
    "salt": "0x1234567890abcdef...",
    "initCodeHash": "0xabcdef1234567890...",
    "bytecodeSize": 12345,
    "constructorArgsEncoded": "0x",
    "deploymentTimestamp": 1693920000000,
    "factoryAddress": "0xFactory123..."
  }
}
```

### Batch Deployment Summary
```
📈 Batch Deployment Report:
✅ Successful: 3
❌ Failed: 0
⛽ Total Gas Used: 7,234,567
💰 Total Cost: 0.145 ETH

Deployments:
✅ DeterministicChunkFactory: 0xFactory123...
✅ ManifestDispatcher: 0xDispatcher456...
✅ MyDeFiFacet: 0xFacet789...
```

## 🔒 Security Features

### Pre-Deployment Validation
- **Bytecode Size Limits**: EIP-170 compliance (24KB max)
- **Network Validation**: Comprehensive network and deployment path checks
- **Factory Verification**: Ensures factory contract exists and is functional
- **Gas Estimation**: Prevents failed transactions due to gas limits

### Deployment Safety
- **Address Collision Detection**: Checks if contract already exists at predicted address
- **Transaction Confirmation**: Waits for deployment confirmation before proceeding
- **Code Verification**: Verifies deployed bytecode matches expected
- **Idempotent Operations**: Safe to run multiple times without conflicts

### Post-Deployment Security
- **Artifact Storage**: Secure storage of deployment metadata
- **Contract Verification**: Automatic verification on supported networks
- **Monitoring Integration**: Optional integration with monitoring systems

## 🛠️ Advanced Configuration

### Gas Optimization
```typescript
{
  gasLimit: 3000000,      // Custom gas limit
  gasPrice: "20",         // Gas price in gwei
  deploymentFeeWei: "0"   // Factory fee in wei
}
```

### Cross-Chain Deployment
```typescript
const crossChainResults = await deployer.deployCrossChain(
  {
    contractName: 'MyDeFiFacet',
    saltString: 'my-defi-facet-v1.0.0',
    constructorArgs: []
  },
  ['localhost', 'sepolia', 'polygon']
);
```

### Custom Factory
```typescript
{
  factoryAddress: "0xYourCustomFactoryAddress"
}
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "Contract already deployed"
**Cause**: Contract exists at predicted address
**Solution**: Use `--skip-if-exists` flag or change salt string

#### 2. "Factory not found"
**Cause**: DeterministicChunkFactory not deployed on network
**Solution**: Deploy factory first or let script auto-deploy

#### 3. "Gas estimation failed"
**Cause**: Contract too large or network issues
**Solution**: Check bytecode size, increase gas limit, or verify network connection

#### 4. "Verification failed"
**Cause**: Block explorer API issues or constructor arguments mismatch
**Solution**: Verify manually or check constructor arguments encoding

### Debug Mode
Set environment variable for verbose logging:
```bash
export DEBUG=payrox:deploy
npx ts-node scripts/ultimate-deterministic-deploy.ts deploy --contract MyContract --salt my-salt
```

## 📚 API Reference

### UltimateDeterministicDeployer Class

#### Methods

##### `deployContract(config: DeploymentConfig): Promise<DeploymentResult>`
Deploy a single contract with CREATE2.

##### `deployBatch(plan: BatchDeploymentPlan): Promise<DeploymentResult[]>`
Deploy multiple contracts in sequence.

##### `deployCrossChain(config: DeploymentConfig, networks: string[]): Promise<Map<string, DeploymentResult>>`
Deploy the same contract to multiple networks.

### Types

#### `DeploymentConfig`
```typescript
interface DeploymentConfig {
  contractName: string;        // Name of the contract to deploy
  saltString: string;          // Human-readable salt for deterministic address
  constructorArgs: any[];      // Constructor arguments array
  factoryAddress?: string;     // Optional custom factory address
  deploymentFeeWei?: string;   // Optional deployment fee in wei
  gasLimit?: number;           // Optional gas limit
  gasPrice?: string;           // Optional gas price in gwei
  verifyContract?: boolean;    // Whether to verify on block explorer
  saveDeployment?: boolean;    // Whether to save deployment artifact
  skipIfExists?: boolean;      // Whether to skip if already deployed
}
```

#### `DeploymentResult`
```typescript
interface DeploymentResult {
  success: boolean;
  contractName: string;
  predictedAddress: string;
  deployedAddress?: string;
  transactionHash?: string;
  gasUsed?: number;
  deploymentCost?: string;
  verificationStatus?: 'pending' | 'verified' | 'failed' | 'skipped';
  network: string;
  chainId: string;
  error?: string;
  metadata: {
    salt: string;
    initCodeHash: string;
    bytecodeSize: number;
    constructorArgsEncoded: string;
    deploymentTimestamp: number;
    factoryAddress: string;
  };
}
```

## 🎯 Best Practices

### 1. Salt Strategy
- Use descriptive, versioned salt strings
- Include version numbers for upgrades
- Use consistent naming conventions
- Example: `"myproject-mycontract-v1.2.3"`

### 2. Gas Management
- Test deployments on testnets first
- Use appropriate gas limits for your contracts
- Monitor gas prices and adjust accordingly
- Consider batch deployments for multiple contracts

### 3. Verification
- Always verify contracts on public networks
- Ensure constructor arguments are correctly encoded
- Use consistent compilation settings
- Keep deployment artifacts for reference

### 4. Security
- Validate all inputs before deployment
- Use factory contracts from trusted sources
- Verify predicted addresses match deployed addresses
- Monitor deployed contracts for security issues

## 🤝 Contributing

### Development Setup
```bash
git clone <repository>
cd PayRox-Go-Beyond
npm install
npx hardhat compile
```

### Testing
```bash
# Run unit tests
npm test

# Test deployment on localhost
npx hardhat node
npx ts-node scripts/ultimate-deterministic-deploy.ts deploy --contract TestContract --salt test-v1
```

### Adding Network Support
1. Add network configuration to `NETWORK_CONFIGS`
2. Add chain ID mapping to `CHAIN_ID_MAPPINGS`
3. Test deployment and verification
4. Update documentation

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **PayRox Team**: For the comprehensive network management utilities
- **ChunkFactoryLib**: For the deterministic deployment pattern
- **Hardhat**: For the excellent development framework
- **OpenZeppelin**: For security best practices and patterns

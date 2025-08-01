# PayRox Go Beyond Command Reference

## 🌐 Cross-Chain Commands

### Universal Salt Generation

Generate deterministic salts for cross-chain deployment with identical addresses.

```bash
npx hardhat crosschain:generate-salt \
  --content "0x608060405234801561001057600080fd5b50..." \
  --deployer "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" \
  --deploy-version "1.0.0" \
  --nonce "1"
```

**Parameters:**

- `--content` - Contract bytecode or content hash
- `--deployer` - Deployer address (must be checksummed)
- `--deploy-version` - Deployment version (optional, default: "1.0.0")
- `--nonce` - Cross-chain nonce (optional, default: "1")

### Multi-Network Deployment

Deploy contracts across multiple EVM networks with address consistency verification.

```bash
npx hardhat crosschain:deploy \
  --networks "ethereum,polygon,arbitrum,optimism" \
  --contracts "./crosschain-contracts.json" \
  --private-key "0x..." \
  --verify
```

**Parameters:**

- `--networks` - Comma-separated list of target networks
- `--contracts` - Path to contracts configuration file
- `--private-key` - Deployer private key (or use PRIVATE_KEY env var)
- `--verify` - Verify address consistency after deployment (optional)

### Address Prediction

Predict CREATE2 addresses across multiple networks before deployment.

```bash
npx hardhat crosschain:predict-addresses \
  --networks "ethereum,polygon,arbitrum" \
  --salt "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" \
  --bytecode "0x608060405234801561001057600080fd5b50..."
```

**Parameters:**

- `--networks` - Comma-separated list of networks
- `--salt` - Deployment salt (66 characters, hex)
- `--bytecode` - Contract bytecode for address calculation

### Network Health Check

Monitor network connectivity and contract availability.

```bash
npx hardhat crosschain:health-check \
  --networks "ethereum,polygon,arbitrum,optimism,base"
```

**Parameters:**

- `--networks` - Comma-separated list of networks to check

### Manifest Synchronization

Synchronize deployment manifests across multiple networks.

```bash
npx hardhat crosschain:sync-manifest \
  --deployment "./crosschain-deployments/deployment-123.json" \
  --private-key "0x..."
```

**Parameters:**

- `--deployment` - Path to cross-chain deployment file
- `--private-key` - Deployer private key (or use PRIVATE_KEY env var)

## 📦 Core PayRox Commands

### Chunk Operations

Stage and predict data chunks with deterministic addressing.

```bash
# Stage a data chunk
npx hardhat payrox:chunk:stage \
  --data "0x608060405234801561001057600080fd5b50..." \
  --network localhost

# Predict chunk address
npx hardhat payrox:chunk:predict \
  --data "0x608060405234801561001057600080fd5b50..." \
  --network localhost
```

### Orchestration

Start and manage deployment orchestration plans.

```bash
npx hardhat payrox:orchestrator:start \
  --network localhost \
  --gas-limit 5000000
```

### Manifest Operations

Verify and manage deployment manifests.

```bash
# Self-check manifest integrity
npx hardhat payrox:manifest:selfcheck \
  --manifest "./manifests/deployment-manifest.json"
```

## 🚀 Production Commands

### Release Management

Generate production-ready release bundles.

```bash
npx hardhat payrox:release:bundle \
  --network mainnet \
  --verify \
  --include-source
```

### Operational Monitoring

Monitor PayRox system for operational issues.

```bash
npx hardhat payrox:ops:watch \
  --network mainnet \
  --interval 30 \
  --alerts
```

### Role-Based Access Control

Bootstrap and manage production access control.

```bash
# Setup RBAC
npx hardhat payrox:roles:bootstrap \
  --network mainnet \
  --admin "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0"

# Check role status
npx hardhat payrox:roles:status \
  --network mainnet \
  --address "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0"
```

## 🔧 Development Commands

### Contract Analysis

Analyze contract sizes and deployment readiness.

```bash
npx hardhat size-contracts
npx hardhat test
npx hardhat coverage
```

### Compilation and Type Generation

Build contracts and generate TypeScript bindings.

```bash
npx hardhat compile
npx hardhat typechain
```

## 🌍 Supported Networks

### Mainnets

- **Ethereum** (`ethereum` / `mainnet`) - Chain ID: 1
- **Polygon** (`polygon`) - Chain ID: 137
- **Arbitrum One** (`arbitrum`) - Chain ID: 42161
- **Optimism** (`optimism`) - Chain ID: 10
- **Base** (`base`) - Chain ID: 8453
- **Avalanche C-Chain** (`avalanche`) - Chain ID: 43114
- **Fantom Opera** (`fantom`) - Chain ID: 250
- **BNB Smart Chain** (`bsc`) - Chain ID: 56

### Testnets

- **Goerli** (`goerli`) - Chain ID: 5
- **Sepolia** (`sepolia`) - Chain ID: 11155111
- **Polygon Mumbai** (`mumbai`) - Chain ID: 80001
- **Arbitrum Sepolia** (`arbitrum-sepolia`) - Chain ID: 421614
- **Optimism Goerli** (`optimism-goerli`) - Chain ID: 420
- **Base Goerli** (`base-goerli`) - Chain ID: 84531
- **Avalanche Fuji** (`fuji`) - Chain ID: 43113
- **Fantom Testnet** (`fantom-testnet`) - Chain ID: 4002
- **BNB Smart Chain Testnet** (`bsc-testnet`) - Chain ID: 97

### Local Development

- **Hardhat** (`hardhat`) - Chain ID: 31337
- **Localhost** (`localhost`) - Chain ID: 31337

## 📄 Configuration Files

### Cross-Chain Contracts Configuration

Create `crosschain-contracts.json` for multi-network deployments:

```json
{
  "contracts": [
    {
      "name": "MyContract",
      "bytecode": "0x608060405234801561001057600080fd5b50...",
      "constructorArgs": ["arg1", "arg2"],
      "gasLimit": 2000000,
      "priority": 1
    }
  ],
  "deployment": {
    "version": "1.0.0",
    "deployer": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "nonce": 1
  }
}
```

### Environment Variables

Set up `.env` file with required configuration:

```bash
# Required for deployments
PRIVATE_KEY=0x...

# Optional RPC URLs (if not using default public endpoints)
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_KEY
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Etherscan API keys for verification
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY
POLYGONSCAN_API_KEY=YOUR_POLYGONSCAN_KEY
ARBISCAN_API_KEY=YOUR_ARBISCAN_KEY
```

## 💡 Usage Examples

### Example 1: Cross-Chain ERC20 Deployment

```bash
# 1. Generate universal salt
SALT=$(npx hardhat crosschain:generate-salt \
  --content "$(cat artifacts/contracts/MyToken.sol/MyToken.json | jq -r .bytecode)" \
  --deployer "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" | grep "Universal Salt:" | cut -d' ' -f3)

# 2. Predict addresses
npx hardhat crosschain:predict-addresses \
  --networks "ethereum,polygon,arbitrum" \
  --salt "$SALT" \
  --bytecode "$(cat artifacts/contracts/MyToken.sol/MyToken.json | jq -r .bytecode)"

# 3. Deploy across networks
npx hardhat crosschain:deploy \
  --networks "ethereum,polygon,arbitrum" \
  --contracts "./erc20-config.json" \
  --verify
```

### Example 2: Production Deployment with Monitoring

```bash
# 1. Health check before deployment
npx hardhat crosschain:health-check \
  --networks "ethereum,polygon,arbitrum"

# 2. Deploy to production
npx hardhat crosschain:deploy \
  --networks "ethereum,polygon,arbitrum" \
  --contracts "./production-contracts.json" \
  --verify

# 3. Start monitoring
npx hardhat payrox:ops:watch \
  --network ethereum \
  --interval 60 \
  --alerts
```

## 🌍 Network Configurations

PayRox Go Beyond supports deployment across 18+ EVM-compatible networks:

### Mainnet Networks

- **ethereum** - Ethereum Mainnet
- **polygon** - Polygon Mainnet
- **arbitrum** - Arbitrum One
- **optimism** - Optimism Mainnet
- **base** - Base Mainnet
- **avalanche** - Avalanche C-Chain
- **fantom** - Fantom Opera
- **bsc** - Binance Smart Chain

### Testnet Networks

- **sepolia** - Ethereum Sepolia Testnet
- **holesky** - Ethereum Holesky Testnet
- **polygon-mumbai** - Polygon Mumbai Testnet
- **polygon-amoy** - Polygon Amoy Testnet
- **arbitrum-sepolia** - Arbitrum Sepolia Testnet
- **optimism-sepolia** - Optimism Sepolia Testnet
- **base-sepolia** - Base Sepolia Testnet
- **avalanche-fuji** - Avalanche Fuji Testnet
- **fantom-testnet** - Fantom Testnet
- **bsc-testnet** - BSC Testnet

### Development Networks

- **localhost** - Local Hardhat Network
- **hardhat** - Hardhat Network

### Network Configuration Examples

```bash
# Single network deployment
npx hardhat crosschain:deploy --networks "ethereum"

# Multi-L2 deployment
npx hardhat crosschain:deploy --networks "polygon,arbitrum,optimism,base"

# Full ecosystem deployment
npx hardhat crosschain:deploy --networks "ethereum,polygon,arbitrum,optimism,base,avalanche,fantom,bsc"

# Testnet validation
npx hardhat crosschain:deploy --networks "sepolia,polygon-mumbai,arbitrum-sepolia"
```

## 🔒 Security Best Practices

1. **Private Key Management**

   - Use environment variables for private keys
   - Never commit private keys to version control
   - Use hardware wallets for production deployments

2. **Network Verification**

   - Always run health checks before deployment
   - Verify network configurations and RPC endpoints
   - Test on testnets before mainnet deployment

3. **Address Consistency**

   - Use `--verify` flag for cross-chain deployments
   - Double-check predicted addresses before deployment
   - Maintain audit trails of all deployments

4. **Gas Management**
   - Monitor gas prices across networks
   - Set appropriate gas limits for complex deployments
   - Consider network congestion during deployment

## 📚 Additional Resources

- **[Cross-Chain Implementation Guide](CROSS_CHAIN_IMPLEMENTATION_COMPLETE.md)**
- **[Testing Results](CROSS_CHAIN_TESTING_RESULTS.md)**
- **[Quick Reference](QUICK_REFERENCE.md)**
- **[System Architecture](docs/SYSTEM_ARCHITECTURE.md)**

---

_This command reference covers all available PayRox Go Beyond commands for cross-chain and
single-network deployments. For additional help, use `npx hardhat help [TASK]` for specific task
documentation._

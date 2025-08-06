# 🚀 PayRox Go Beyond - Deterministic Deployment Guide

## 📋 Overview

The **PayRox Go Beyond Universal Deterministic Deployment System** enables consistent contract addresses across all blockchain networks using CREATE2. This system is designed for **any blockchain protocol**, not limited to specific demos.

## 🎯 Features

✅ **Universal Protocol Support** - Deploy any contract deterministically  
✅ **Cross-Network Consistency** - Same address on every blockchain  
✅ **PayRox Integration** - Automatic ManifestDispatcher registration  
✅ **Idempotent Deployments** - Skip if already deployed  
✅ **Predict-Only Mode** - Calculate addresses without deploying  
✅ **Comprehensive Validation** - Full deployment verification  
✅ **Gas Optimization** - Efficient deployment with fee management  

## 🛠️ Quick Start

### 1. Basic Deployment

Deploy a PayRox facet with default settings:

```bash
npm run deploy:deterministic
```

### 2. Custom Contract Deployment

Deploy any contract with custom configuration:

```bash
# Deploy specific contract
cross-env CONTRACT_NAME="PayRoxCoreFacet" npm run deploy:deterministic

# Deploy with custom salt
cross-env CONTRACT_NAME="PayRoxUtilsFacet" SALT_STRING="my-custom-salt-v1" npm run deploy:deterministic

# Deploy to specific network
npm run deploy:deterministic:sepolia
```

### 3. Predict Address Only

Calculate the deployment address without actually deploying:

```bash
npm run deploy:predict
npm run deploy:predict:sepolia
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CONTRACT_NAME` | `PayRoxCoreFacet` | Contract to deploy |
| `SALT_STRING` | `payrox-facet-v1` | Deterministic salt |
| `DEPLOYMENT_FEE_WEI` | `0` | Fee in Wei (if factory charges) |
| `PREDICT_ONLY` | `false` | Calculate address only |
| `SKIP_VERIFICATION` | `false` | Skip contract verification |
| `REGISTER_IN_MANIFEST` | `true` | Auto-register in ManifestDispatcher |
| `DETERMINISTIC_FACTORY_ADDRESS` | Auto-detect | Factory contract address |
| `MANIFEST_DISPATCHER_ADDRESS` | Auto-detect | Dispatcher contract address |

### Example Configurations

#### Deploy PayRox Core Facet
```bash
cross-env CONTRACT_NAME="PayRoxCoreFacet" \
         SALT_STRING="payrox-core-v1.0.0" \
         npm run deploy:deterministic:mainnet
```

#### Deploy with Custom Fee
```bash
cross-env CONTRACT_NAME="PayRoxUtilsFacet" \
         DEPLOYMENT_FEE_WEI="1000000000000000" \
         npm run deploy:deterministic:sepolia
```

#### Predict Address for Planning
```bash
cross-env CONTRACT_NAME="PayRoxStorageFacet" \
         SALT_STRING="production-storage-v2" \
         PREDICT_ONLY="true" \
         npm run deploy:deterministic:mainnet
```

## 🔧 Advanced Usage

### 1. Cross-Network Deployment

Deploy the same contract to multiple networks:

```bash
# Deploy to all networks
for network in localhost sepolia mainnet; do
  cross-env CONTRACT_NAME="PayRoxCoreFacet" \
           SALT_STRING="universal-core-v1" \
           npm run deploy:deterministic:$network
done
```

### 2. Batch Facet Deployment

Deploy multiple facets with consistent addressing:

```bash
# Deploy complete facet suite
facets=("PayRoxCoreFacet" "PayRoxUtilsFacet" "PayRoxStorageFacet")
for facet in "${facets[@]}"; do
  cross-env CONTRACT_NAME="$facet" \
           SALT_STRING="production-$facet-v1" \
           npm run deploy:deterministic:mainnet
done
```

### 3. Deployment Verification

Verify and register deployments:

```bash
# Deploy with verification
cross-env CONTRACT_NAME="PayRoxCoreFacet" \
         SKIP_VERIFICATION="false" \
         REGISTER_IN_MANIFEST="true" \
         npm run deploy:deterministic:sepolia
```

## 📊 Deployment Results

### Success Output Example

```
🔄 Starting deterministic deployment of PayRoxCoreFacet...

📋 Configuration:
   Contract: PayRoxCoreFacet
   Network: sepolia (Chain ID: 11155111)
   Salt: 0x8b1a944...
   Factory: 0x742d35Cc...

🔍 Contract Discovery:
   ✅ Found: contracts/deployable-modules/diamond-facets/PayRoxCoreFacet.sol

📍 Address Prediction:
   Predicted Address: 0x1234567890abcdef...
   Current Code: 0x (not deployed)

🚀 Deploying via DeterministicChunkFactory...
   Gas Used: 2,345,678
   Transaction: 0xabcd1234...

✅ Deployment Successful!
   Address: 0x1234567890abcdef...
   Bytecode Hash: 0xef567890...

🔗 ManifestDispatcher Registration:
   ✅ Facet registered with 15 selectors
   ✅ Routing updated

🎉 Deployment Complete!
```

### Error Handling

The script provides comprehensive error messages:

- **Contract Not Found**: Lists available contracts and paths
- **Network Issues**: Connection and gas estimation errors  
- **Factory Errors**: Permission and fee-related issues
- **Verification Failures**: Etherscan/block explorer problems

## 🔐 Security Considerations

### Salt Management

```bash
# Use version-specific salts for upgrades
SALT_STRING="payrox-core-v1.0.0"
SALT_STRING="payrox-core-v1.0.1"  # New version

# Use environment-specific salts
SALT_STRING="production-core-v1"
SALT_STRING="staging-core-v1"
```

### Fee Management

```bash
# Check factory fee requirements
cross-env PREDICT_ONLY="true" npm run deploy:predict

# Set appropriate fees
DEPLOYMENT_FEE_WEI="1000000000000000"  # 0.001 ETH
```

## 🚨 Troubleshooting

### Common Issues

1. **Contract Not Found**
   ```
   Error: Contract "MyFacet" not found
   ```
   **Solution**: Check contract exists in one of these paths:
   - `contracts/deployable-modules/diamond-facets/`
   - `contracts/facets/`
   - `contracts/demo/facets/`

2. **Address Already Deployed**
   ```
   ✅ Already deployed at 0x1234...
   ```
   **Solution**: This is normal - deployment is idempotent

3. **Insufficient Fee**
   ```
   Error: Deployment fee required
   ```
   **Solution**: Set `DEPLOYMENT_FEE_WEI` environment variable

4. **Network Connection**
   ```
   Error: Could not connect to network
   ```
   **Solution**: Check `hardhat.config.ts` network configuration

### Debug Mode

Enable verbose logging:

```bash
cross-env DEBUG="true" npm run deploy:deterministic
```

## 📚 Integration with PayRox Ecosystem

### Automatic ManifestDispatcher Registration

When `REGISTER_IN_MANIFEST="true"` (default), the script:

1. Deploys the contract deterministically
2. Calculates all function selectors
3. Registers facet in ManifestDispatcher
4. Updates routing tables
5. Verifies registration

### Diamond Facet Support

The script automatically detects Diamond facets and:

- Supports isolated storage patterns
- Integrates with Diamond cut operations  
- Validates selector compatibility
- Manages upgrade sequences

## 🎯 Next Steps

After deployment, use these PayRox tools:

```bash
# Analyze deployed facets
npm run payrox:diamond:calculate-selectors

# Validate compatibility
npm run payrox:diamond:validate-compatibility

# Manage production upgrades
npm run payrox:production:enhance-all
```

## 📖 Related Documentation

- [PayRox Diamond Architecture](./PayRox-Diamond-Architecture.md)
- [ManifestDispatcher Guide](./ManifestDispatcher-Guide.md)
- [Cross-Chain Deployment](./Cross-Chain-Deployment.md)
- [Production Enhancement Suite](../DIAMOND_FACET_PRODUCTION_ENHANCEMENTS.md)

---

🚀 **PayRox Go Beyond** - Universal Blockchain Protocol Deployment and Orchestration

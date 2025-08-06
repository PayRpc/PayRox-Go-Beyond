# 🚀 PayRox Go Beyond - Deterministic Deployment Script

## Overview

The `deployDeterministic.ts` script provides a production-ready template for deploying PayRox facets or any contract deterministically via CREATE2, with comprehensive integration into the PayRox Go Beyond ecosystem.

## ✨ Features

- 🧬 **Bytecode + Constructor Args**: Handles contracts with complex constructor parameters
- 🔐 **Fee Support**: Supports factory fees if enabled
- 🔁 **Idempotent Mode**: Skip deployment if contract already exists at predicted address
- 🔮 **Predict-Only Mode**: Calculate address without deploying
- 🌍 **Cross-Network Consistency**: Same address on all networks
- 📝 **ManifestDispatcher Integration**: Auto-register deployed facets
- 🔍 **Verification Support**: Automatic Etherscan verification
- 📊 **Comprehensive Logging**: Detailed deployment reporting

## 🛠️ Configuration

### Environment Variables

```bash
# Required
CONTRACT_NAME="TerraStakeNFTCoreFacet"          # Contract to deploy
SALT_STRING="payrox-facet-v1"                   # Deterministic salt

# Optional
DETERMINISTIC_FACTORY_ADDRESS=""                # Auto-detected if empty
DEPLOYMENT_FEE_WEI="0"                         # Fee in Wei (0 = free)
PREDICT_ONLY="false"                           # Set to "true" for address prediction only
SKIP_VERIFICATION="false"                      # Skip Etherscan verification
REGISTER_IN_MANIFEST="true"                    # Register in ManifestDispatcher
MANIFEST_DISPATCHER_ADDRESS=""                 # Auto-detected if empty
```

### Constructor Arguments

Edit the `CONSTRUCTOR_ARGS` array in the script:

```typescript
const CONSTRUCTOR_ARGS: any[] = [
  "0x1234567890123456789012345678901234567890", // address param
  42,                                           // uint256 param
  "PayRox Facet"                               // string param
];
```

## 🎯 Usage Examples

### 1. Basic Facet Deployment

```bash
# Deploy TerraStakeNFTCoreFacet on localhost
npm run deploy:deterministic

# Deploy on Sepolia testnet  
npm run deploy:deterministic:sepolia

# Deploy on mainnet
npm run deploy:deterministic:mainnet
```

### 2. Custom Contract Deployment

```bash
# Deploy custom contract with environment variables
CONTRACT_NAME="MyCustomFacet" \
SALT_STRING="my-custom-v1" \
npm run deploy:deterministic:localhost
```

### 3. Address Prediction Only

```bash
# Predict address without deploying
npm run deploy:predict

# Predict address on Sepolia
npm run deploy:predict:sepolia
```

### 4. Advanced Configuration

```bash
# Deploy with custom factory and fee
DETERMINISTIC_FACTORY_ADDRESS="0x123...abc" \
DEPLOYMENT_FEE_WEI="1000000000000000000" \
SKIP_VERIFICATION="true" \
CONTRACT_NAME="AdvancedFacet" \
npm run deploy:deterministic:sepolia
```

## 📁 Contract Discovery

The script automatically searches for contracts in these locations:

1. `contracts/deployable-modules/diamond-facets/` (PayRox facets)
2. `contracts/demo/facets/` (TerraStake demo facets)  
3. `contracts/facets/` (Generic facets)
4. Root contracts directory (Direct name)

## 🏭 Factory Auto-Detection

The script auto-detects the DeterministicChunkFactory address from:

1. **Environment Variable**: `DETERMINISTIC_FACTORY_ADDRESS`
2. **Deployment Artifacts**: `deployments/{network}/DeterministicChunkFactory.json`
3. **Well-Known Addresses**: Predefined addresses for common networks
4. **Error Fallback**: Clear error message if not found

## 🔧 Integration Features

### ManifestDispatcher Registration

When `REGISTER_IN_MANIFEST=true`:

1. **Auto-Registration**: Deployed facets are automatically registered
2. **Selector Extraction**: Attempts to call `getSelectors()` if available
3. **Routing Updates**: Updates manifest routing tables
4. **Error Handling**: Graceful fallback if registration fails

### Verification Support

Automatic Etherscan verification with:

- **Network Detection**: Skips verification on local networks
- **Constructor Args**: Properly handles constructor parameters
- **Error Handling**: Continues deployment if verification fails
- **Multiple Networks**: Supports all major networks

## 📊 Output Examples

### Successful Deployment

```
🚀 PayRox Go Beyond - Deterministic Deployment
📦 Contract: TerraStakeNFTCoreFacet
🌐 Network: sepolia (Chain ID: 11155111)
🔑 Salt: payrox-facet-v1
👤 Deployer: 0x123...abc
🏭 DeterministicChunkFactory: 0x456...def
🧂 Generated Salt: 0x789...ghi
📦 Bytecode length: 12345 characters
🔧 Constructor args: 0x
📍 Predicted Address: 0xabc...123
🌍 This address will be IDENTICAL on ALL networks!

🚀 Deploying via DeterministicChunkFactory...
💰 Deployment fee: 0.0 ETH
⏳ Transaction submitted: 0xdef...456
✅ Deployed successfully!
📍 Address: 0xabc...123
💨 Gas used: 1234567
🧾 Transaction: 0xdef...456
🔍 Verifying TerraStakeNFTCoreFacet at 0xabc...123...
✅ Contract verified successfully
📝 Registering TerraStakeNFTCoreFacet in ManifestDispatcher...
✅ Would register TerraStakeNFTCoreFacet with 5 selectors in ManifestDispatcher
📁 Deployment info saved to: deployments/sepolia/TerraStakeNFTCoreFacet-deterministic.json

🎉 Deployment completed successfully!
```

### Address Prediction

```
🚀 PayRox Go Beyond - Deterministic Deployment
📦 Contract: TerraStakeNFTCoreFacet
🔮 Predict Only: true
📍 Predicted Address: 0xabc...123
🌍 This address will be IDENTICAL on ALL networks!
🔮 Prediction complete - no deployment performed
```

### Already Deployed

```
📍 Predicted Address: 0xabc...123
✅ Contract already deployed at 0xabc...123
📝 Registering TerraStakeNFTCoreFacet in ManifestDispatcher...
✅ Would register TerraStakeNFTCoreFacet with 5 selectors in ManifestDispatcher
```

## 🔄 Comparison with Template

| Feature | Template | PayRox Enhanced |
|---------|----------|-----------------|
| ✅ Deterministic deployment | ✅ | ✅ |
| ✅ Factory integration | ✅ | ✅ |
| ✅ Constructor args | ✅ | ✅ |
| ✅ Fee support | ✅ | ✅ |
| ✅ Idempotent mode | ✅ | ✅ |
| ✅ Predict-only mode | ✅ | ✅ |
| ❌ Auto-detection | ❌ | ✅ |
| ❌ Multiple contract paths | ❌ | ✅ |
| ❌ ManifestDispatcher integration | ❌ | ✅ |
| ❌ Deployment artifacts | ❌ | ✅ |
| ❌ NPM scripts | ❌ | ✅ |
| ❌ Comprehensive logging | ❌ | ✅ |

## 🚀 Production Enhancements

### PayRox Ecosystem Integration

- **Factory Auto-Detection**: No hardcoded addresses
- **Facet Path Resolution**: Automatic discovery of PayRox facets
- **ManifestDispatcher Registration**: Seamless routing integration
- **Cross-Network Consistency**: Guaranteed identical addresses

### Developer Experience

- **NPM Scripts**: Pre-configured deployment commands
- **Environment Variables**: Flexible configuration
- **Comprehensive Logging**: Detailed progress and error reporting
- **Deployment Artifacts**: Persistent deployment records

### Production Safety

- **Idempotent Mode**: Safe re-deployment
- **Address Prediction**: Pre-deployment verification
- **Error Handling**: Graceful failure management
- **Gas Optimization**: Conservative gas limits

## 🔧 Extending the Script

### Adding New Contract Types

```typescript
// Add to getContractBytecode function
const possiblePaths = [
  contractName,
  `contracts/deployable-modules/diamond-facets/${contractName}.sol:${contractName}`,
  `contracts/demo/facets/${contractName}.sol:${contractName}`,
  `contracts/my-custom-path/${contractName}.sol:${contractName}`, // Add here
];
```

### Custom ManifestDispatcher Integration

```typescript
// Extend registerInManifestDispatcher function
async function registerInManifestDispatcher(
  contractAddress: string,
  contractName: string,
  manifestAddress: string
): Promise<boolean> {
  // Add custom registration logic here
  const customRegistration = await myCustomRegistrationLogic(
    contractAddress,
    contractName
  );
  
  return customRegistration;
}
```

This enhanced script provides a production-ready foundation for deterministic deployments in the PayRox Go Beyond ecosystem while maintaining compatibility with the original template structure.

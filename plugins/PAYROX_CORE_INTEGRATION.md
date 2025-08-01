# PayRox DApp Plugin System - Core Integration Guide

## 🎯 **Your Deployed PayRox Core System**

You already have the complete PayRox Go Beyond system deployed with universal addressing and fee management!

### **Core Contracts (Already Deployed):**

```json
{
  "network": "localhost",
  "contracts": {
    "factory": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "dispatcher": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", 
    "orchestrator": "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  },
  "features": {
    "universalAddressing": true,
    "feeManagement": true,
    "functionRouting": true,
    "deploymentOrchestration": true
  }
}
```

## 🏭 **DeterministicChunkFactory** - Universal Addressing & Fees

**Address:** `0x5FbDB2315678afecb367f032d93F642f64180aa3`

### **Universal Features:**

- **CREATE2 Addressing**: Predictable contract addresses via `keccak256(bytecode + salt)`
- **Content-Addressed Chunks**: Universal hashing with `keccak256(bytecode)`
- **Base Fee**: **0.0007 ETH** (700000000000000 wei) per deployment ⚠️ **DEPLOYED FEE**: 0.001 ETH
- **Fee Management**: Configurable recipient and rates

### **Usage Examples:**
```bash
# Stage a contract chunk with fee
npx hardhat payrox:chunk:stage \
  --factory 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  --file ./contracts/MyContract.sol \
  --value 0.001 \
  --network localhost

# Predict contract address before deployment
npx hardhat payrox:chunk:predict \
  --factory 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  --data 0x608060405234801561001057600080fd5b5... \
  --network localhost
```

## 📡 **ManifestDispatcher** - Universal Function Routing  

**Address:** `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`

### **Universal Features:**
- **Function Selector Routing**: Universal 4-byte selector mapping
- **Manifest System**: Merkle-proof verified upgrades
- **Code Hash Verification**: EXTCODEHASH validation per call
- **Governance Controls**: Timelock and freeze mechanisms

### **Usage Examples:**
```typescript
// Route function calls through dispatcher
const dispatcher = await ethers.getContractAt(
  "ManifestDispatcher", 
  "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
);

// Check current routes
const route = await dispatcher.routes("0x7ab7b94b"); // getFacetInfo selector
console.log("Facet:", route.facet);
console.log("Code hash:", route.codehash);
```

## 🎼 **Orchestrator** - Deployment Coordination

**Address:** `0x5FbDB2315678afecb367f032d93F642f64180aa3`

### **Universal Features:**
- **Multi-Contract Deployments**: Coordinated staging and activation
- **Gas Tracking**: Deployment cost management  
- **Component Noting**: Audit trail for deployed components
- **Integration Addresses**: Links factory and dispatcher

### **Usage Examples:**
```bash
# Start coordinated deployment
npx hardhat payrox:orchestrator:start \
  --id 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef \
  --gas-limit 8000000 \
  --network localhost
```

## 🔧 **Plugin Integration with Core Contracts**

Update your plugin system to use the deployed contracts:

### **1. Update Plugin SDK Configuration:**
```typescript
// plugins/src/config.ts
export const PAYROX_CONFIG = {
  localhost: {
    factory: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    dispatcher: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    orchestrator: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    baseFee: "0.001" // ETH
  }
};
```

### **2. Enhanced DeFi Vault Template with PayRox Integration:**
```typescript
// plugins/src/templates/defi-vault/deploy.ts
import { PAYROX_CONFIG } from '../../config';

export async function deployVault(name: string, network = 'localhost') {
  const config = PAYROX_CONFIG[network];
  
  // Use PayRox factory for deterministic deployment
  const result = await execCommand(`
    npx hardhat payrox:chunk:stage 
      --factory ${config.factory}
      --file ./contracts/VaultToken.sol
      --value ${config.baseFee}
      --network ${network}
  `);
  
  return result;
}
```

### **3. Universal Addressing Integration:**
```typescript
// plugins/src/core/PayRoxIntegration.ts
export class PayRoxIntegration {
  
  async deployContract(bytecode: string, network = 'localhost') {
    const config = PAYROX_CONFIG[network];
    
    // Predict address before deployment
    const predictedAddress = await this.predictAddress(bytecode, config.factory);
    
    // Deploy through PayRox factory
    const deployResult = await this.stageChunk(bytecode, config.factory, config.baseFee);
    
    return { 
      address: deployResult.address,
      predicted: predictedAddress,
      hash: deployResult.hash,
      fee: config.baseFee
    };
  }
  
  async predictAddress(bytecode: string, factoryAddress: string) {
    // Use PayRox prediction
    return execCommand(`
      npx hardhat payrox:chunk:predict 
        --factory ${factoryAddress}
        --data ${bytecode}
        --network localhost
    `);
  }
}
```

## 💰 **Fee Management**

Your factory contract manages deployment fees:

- **Current Base Fee**: 0.001 ETH per deployment
- **Fee Recipient**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (deployer)
- **Payment**: Required for all `stage()` and `stageBatch()` operations

### **Fee Calculation:**
```typescript
// For single deployment
const fee = "0.001"; // ETH

// For batch deployment (5 contracts)
const batchFee = (0.001 * 5).toString(); // "0.005" ETH

// Include in deployment
await stageContract(bytecode, { value: ethers.parseEther(fee) });
```

## 🔍 **Universal Hash System**

All contracts are content-addressed:

```typescript
// Generate universal hash
const hash = ethers.keccak256(bytecode);

// Check if already deployed
const exists = await factory.exists(hash);

// Get deployed address
const address = await factory.chunkOf(hash);
```

## 📚 **Next Steps**

1. **Update Plugin Templates**: Modify templates to use PayRox contracts
2. **Add Fee Handling**: Include fee calculation in deployment workflows
3. **Universal Addressing**: Use CREATE2 for predictable addresses
4. **Orchestration**: Coordinate complex multi-contract deployments
5. **Testing**: Validate integration with existing contracts

Your PayRox system is production-ready with enterprise-grade universal addressing and fee management! 🎉

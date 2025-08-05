# PayRox Go Beyond SDK - Quick Start Example

**5-minute integration guide for calling the ManifestDispatcher**

This example demonstrates how to integrate with PayRox Go Beyond in under 5 minutes.

## Installation

```bash
npm install @payrox/go-beyond-sdk ethers
```

## Quick Integration

### 1. Basic Setup (1 minute)

```typescript
import { PayRoxSDK, ManifestRouter } from '@payrox/go-beyond-sdk';
import { ethers } from 'ethers';

// Initialize provider (use your preferred provider)
const provider = new ethers.JsonRpcProvider('https://your-rpc-url');
const wallet = new ethers.Wallet('your-private-key', provider);

// Initialize PayRox SDK
const sdk = new PayRoxSDK({
  provider,
  signer: wallet,
  network: 'mainnet' // or 'sepolia', 'polygon', etc.
});
```

### 2. Connect to Deployed System (30 seconds)

```typescript
// Connect to existing PayRox deployment
const dispatcher = await sdk.getManifestDispatcher('0xDispatcherAddress');
const factory = await sdk.getChunkFactory('0xFactoryAddress');

// Verify connection
console.log(`Connected to PayRox v${await dispatcher.version()}`);
```

### 3. Call Facet Functions (2 minutes)

```typescript
// Example: Call TerraStake environmental NFT functions
async function mintEnvironmentalNFT() {
  try {
    // Get function selector for minting
    const mintSelector = '0x40c10f19'; // mint(address,uint256)
    
    // Call through dispatcher
    const tx = await dispatcher.callFacet(
      mintSelector,
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256'],
        [wallet.address, 1] // mint token ID 1
      )
    );
    
    await tx.wait();
    console.log(`✅ Environmental NFT minted: ${tx.hash}`);
    return tx.hash;
  } catch (error) {
    console.error('❌ Minting failed:', error);
    throw error;
  }
}
```

### 4. Batch Operations (1 minute)

```typescript
// Example: Batch multiple facet calls efficiently
async function batchOperations() {
  const operations = [
    {
      selector: '0x40c10f19', // mint
      data: ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256'],
        [wallet.address, 1]
      )
    },
    {
      selector: '0xa22cb465', // setApprovalForAll
      data: ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'bool'],
        ['0xSpenderAddress', true]
      )
    }
  ];
  
  const tx = await dispatcher.batchCall(operations);
  await tx.wait();
  console.log(`✅ Batch operations completed: ${tx.hash}`);
}
```

### 5. Advanced: Route Discovery (30 seconds)

```typescript
// Discover available functions automatically
async function discoverRoutes() {
  const routes = await dispatcher.getAllRoutes();
  
  console.log('Available functions:');
  routes.forEach(route => {
    console.log(`  ${route.selector} -> ${route.facet}`);
  });
  
  // Get specific facet functions
  const terraStakeFacet = '0xTerraStakeFacetAddress';
  const selectors = await dispatcher.getFacetFunctionSelectors(terraStakeFacet);
  console.log(`TerraStake functions: ${selectors.length}`);
}
```

## Complete Working Example

```typescript
import { PayRoxSDK } from '@payrox/go-beyond-sdk';
import { ethers } from 'ethers';

async function quickStart() {
  // 1. Setup (30 seconds)
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const sdk = new PayRoxSDK({
    provider,
    signer: wallet,
    network: 'sepolia' // Use Sepolia testnet
  });
  
  // 2. Connect to deployed contracts (30 seconds)
  const dispatcher = await sdk.getManifestDispatcher(
    '0x...' // Your deployed dispatcher address
  );
  
  // 3. Simple function call (1 minute)
  try {
    // Call any facet function through the dispatcher
    const result = await dispatcher.callStatic(
      '0x18160ddd', // totalSupply() selector
      '0x' // no parameters
    );
    
    console.log(`Total supply: ${ethers.toBigInt(result)}`);
    
    // 4. State-changing operation (2 minutes)
    const tx = await dispatcher.callFacet(
      '0x40c10f19', // mint(address,uint256)
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256'],
        [wallet.address, ethers.parseEther('1000')]
      ),
      { gasLimit: 300000 }
    );
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction successful: ${receipt.hash}`);
    
  } catch (error) {
    console.error('❌ Operation failed:', error);
  }
}

// Run the quick start
quickStart()
  .then(() => console.log('🎉 PayRox integration complete!'))
  .catch(console.error);
```

## Configuration Options

```typescript
// Advanced SDK configuration
const sdk = new PayRoxSDK({
  provider,
  signer: wallet,
  network: 'mainnet',
  options: {
    gasLimit: 500000,        // Default gas limit
    gasPrice: 'auto',        // Auto gas price
    confirmations: 2,        // Wait for confirmations
    timeout: 30000,          // 30 second timeout
    retries: 3,              // Retry failed transactions
    debug: true              // Enable debug logging
  }
});
```

## Environment Variables

Create a `.env` file:

```bash
# Required
RPC_URL=https://sepolia.infura.io/v3/your-key
PRIVATE_KEY=0x...

# PayRox Contract Addresses (Sepolia testnet)
PAYROX_DISPATCHER=0x...
PAYROX_FACTORY=0x...

# Optional
ETHERSCAN_API_KEY=your-key
INFURA_API_KEY=your-key
```

## Error Handling

```typescript
import { PayRoxError, PayRoxErrorCode } from '@payrox/go-beyond-sdk';

try {
  await dispatcher.callFacet(selector, data);
} catch (error) {
  if (error instanceof PayRoxError) {
    switch (error.code) {
      case PayRoxErrorCode.INVALID_SELECTOR:
        console.error('Function not found in any facet');
        break;
      case PayRoxErrorCode.EXECUTION_REVERTED:
        console.error('Function execution failed:', error.reason);
        break;
      case PayRoxErrorCode.INSUFFICIENT_GAS:
        console.error('Increase gas limit');
        break;
      default:
        console.error('PayRox error:', error.message);
    }
  } else {
    console.error('Network error:', error);
  }
}
```

## Next Steps

1. **Explore Facets**: Check available facets and their functions
2. **Add Error Handling**: Implement robust error handling for production
3. **Optimize Gas**: Use batch operations for multiple calls
4. **Monitor Events**: Listen to facet events for real-time updates
5. **Test Thoroughly**: Test on testnets before mainnet deployment

## Support

- 📚 [Full Documentation](https://docs.payrox.io)
- 💬 [Discord Community](https://discord.gg/payrox)
- 🐛 [Report Issues](https://github.com/PayRpc/PayRox-Go-Beyond/issues)
- 📧 [Email Support](mailto:support@payrox.io)

---

**Total Integration Time: ~5 minutes** ⚡

The PayRox Go Beyond SDK makes it incredibly easy to interact with the modular smart contract system. Start with this example and expand based on your specific needs!

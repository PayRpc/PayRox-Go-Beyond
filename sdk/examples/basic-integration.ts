import { PayRoxSDK } from '../src';
import { ethers } from 'ethers';

/**
 * Basic PayRox Go Beyond SDK Integration Example
 * Demonstrates 5-minute setup and basic usage
 */

async function basicExample() {
  console.log("🚀 PayRox Go Beyond SDK - Basic Integration Example");
  console.log("=" .repeat(60));

  // 1. Setup Provider and Wallet (30 seconds)
  console.log("\n1️⃣ Setting up provider and wallet...");
  
  const provider = new ethers.JsonRpcProvider(
    process.env.RPC_URL || "http://127.0.0.1:8545"
  );
  
  const wallet = new ethers.Wallet(
    process.env.PRIVATE_KEY || ethers.Wallet.createRandom().privateKey,
    provider
  );
  
  console.log(`✅ Wallet: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await provider.getBalance(wallet.address))} ETH`);

  // 2. Initialize PayRox SDK (30 seconds)
  console.log("\n2️⃣ Initializing PayRox SDK...");
  
  const sdk = new PayRoxSDK({
    provider,
    signer: wallet,
    network: 'localhost'
  });
  
  console.log("✅ PayRox SDK initialized");

  // 3. Connect to deployed contracts (1 minute)
  console.log("\n3️⃣ Connecting to deployed contracts...");
  
  try {
    // Use environment variables or deployed addresses
    const dispatcherAddress = process.env.DISPATCHER_ADDRESS || "0x...";
    const factoryAddress = process.env.FACTORY_ADDRESS || "0x...";
    
    if (dispatcherAddress === "0x..." || factoryAddress === "0x...") {
      console.log("⚠️  Please set DISPATCHER_ADDRESS and FACTORY_ADDRESS environment variables");
      console.log("   This example will simulate the connection...");
      
      // Simulate connection for demo purposes
      console.log("✅ Connected to ManifestDispatcher (simulated)");
      console.log("✅ Connected to ChunkFactory (simulated)");
      
      await demonstrateBasicCalls();
      return;
    }
    
    const dispatcher = await sdk.getManifestDispatcher(dispatcherAddress);
    const factory = await sdk.getChunkFactory(factoryAddress);
    
    console.log(`✅ Connected to ManifestDispatcher: ${dispatcherAddress}`);
    console.log(`✅ Connected to ChunkFactory: ${factoryAddress}`);
    
    // 4. Basic function calls (2 minutes)
    console.log("\n4️⃣ Making basic function calls...");
    
    // Get version information
    const dispatcherVersion = await dispatcher.version();
    const factoryVersion = await factory.version();
    
    console.log(`📦 Dispatcher Version: ${dispatcherVersion}`);
    console.log(`🏭 Factory Version: ${factoryVersion}`);
    
    // Get route information
    console.log("\n🔍 Discovering available routes...");
    const routes = await dispatcher.getAllRoutes();
    console.log(`📊 Found ${routes.length} available routes`);
    
    if (routes.length > 0) {
      console.log("First few routes:");
      routes.slice(0, 3).forEach((route, index) => {
        console.log(`  ${index + 1}. ${route.selector} -> ${route.facet}`);
      });
    }
    
    // 5. Simple state query (30 seconds)
    console.log("\n5️⃣ Querying contract state...");
    
    try {
      // Example: Query total supply if available
      const totalSupplySelector = "0x18160ddd"; // totalSupply()
      
      const hasRoute = routes.some(r => r.selector === totalSupplySelector);
      if (hasRoute) {
        const result = await dispatcher.callStatic(totalSupplySelector, "0x");
        console.log(`📊 Total Supply: ${ethers.toBigInt(result)}`);
      } else {
        console.log("ℹ️  totalSupply() not available in current routes");
      }
      
    } catch (error) {
      console.log("ℹ️  State query example - implement based on your facets");
    }
    
  } catch (error) {
    console.error("❌ Connection failed:", error);
    console.log("\n💡 Make sure you have:");
    console.log("   1. Valid RPC_URL in environment");
    console.log("   2. Valid PRIVATE_KEY in environment");
    console.log("   3. Deployed PayRox contracts");
    console.log("   4. DISPATCHER_ADDRESS and FACTORY_ADDRESS set");
  }

  console.log("\n🎉 Basic integration example completed!");
}

async function demonstrateBasicCalls() {
  console.log("\n4️⃣ Demonstrating SDK API patterns...");
  
  console.log("✅ SDK.getManifestDispatcher() - Connect to dispatcher");
  console.log("✅ SDK.getChunkFactory() - Connect to factory");
  console.log("✅ dispatcher.version() - Get contract version");
  console.log("✅ dispatcher.getAllRoutes() - Discover available functions");
  console.log("✅ dispatcher.callStatic() - Query contract state");
  console.log("✅ dispatcher.callFacet() - Execute transactions");
  
  console.log("\n📝 Common Usage Patterns:");
  console.log(`
  // Query contract state
  const result = await dispatcher.callStatic('0x18160ddd', '0x');
  
  // Execute transaction
  const tx = await dispatcher.callFacet(
    '0x40c10f19', // mint(address,uint256)
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256'],
      [userAddress, amount]
    )
  );
  
  // Batch multiple operations
  const operations = [
    { selector: '0x40c10f19', data: mintData },
    { selector: '0xa22cb465', data: approvalData }
  ];
  const batchTx = await dispatcher.batchCall(operations);
  `);
}

// Environment validation
function validateEnvironment() {
  const required = ['RPC_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.log("⚠️  Missing environment variables:");
    missing.forEach(key => console.log(`   ${key}`));
    console.log("\n💡 Create a .env file with:");
    console.log("   RPC_URL=http://127.0.0.1:8545");
    console.log("   PRIVATE_KEY=0x...");
    console.log("   DISPATCHER_ADDRESS=0x...");
    console.log("   FACTORY_ADDRESS=0x...");
    console.log("\n   (Using defaults for demo purposes)");
  }
}

// Run the example
if (require.main === module) {
  validateEnvironment();
  
  basicExample()
    .then(() => {
      console.log("\n✅ Example completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Example failed:", error);
      process.exit(1);
    });
}

export { basicExample };

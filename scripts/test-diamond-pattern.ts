import { ethers } from "hardhat";

async function main() {
  console.log("💎 Testing Diamond Pattern Communication...");

  const dispatcherAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  
  // Connect to dispatcher as ExampleFacetA (since routes should forward calls)
  const facetAInterface = await ethers.getContractAt("ExampleFacetA", dispatcherAddress);
  const facetBInterface = await ethers.getContractAt("ExampleFacetB", dispatcherAddress);

  console.log("📡 Connected to dispatcher as facet interfaces");

  try {
    // Test calling getFacetInfo through dispatcher (should route to ExampleFacetA)
    console.log("\n🔍 Testing getFacetInfo() via dispatcher...");
    const facetInfo = await facetAInterface.getFacetInfo();
    console.log("✅ getFacetInfo() response:");
    console.log("  Name:", facetInfo.name);
    console.log("  Version:", facetInfo.version);
    console.log("  Selectors count:", facetInfo.selectors.length);

  } catch (error) {
    console.error("❌ getFacetInfo() failed:", error instanceof Error ? error.message : String(error));
  }

  try {
    // Test calling getFacetInfoB through dispatcher (should route to ExampleFacetB)
    console.log("\n🔍 Testing getFacetInfoB() via dispatcher...");
    const facetBInfo = await facetBInterface.getFacetInfoB();
    console.log("✅ getFacetInfoB() response:");
    console.log("  Name:", facetBInfo.name);
    console.log("  Version:", facetBInfo.version);

  } catch (error) {
    console.error("❌ getFacetInfoB() failed:", error instanceof Error ? error.message : String(error));
  }

  try {
    // Test storage interaction through dispatcher
    console.log("\n🔍 Testing storage operations via dispatcher...");
    const testData = "Hello from dispatcher!";
    
    console.log("  Setting data:", testData);
    const setTx = await facetAInterface.setMessage(testData);
    await setTx.wait();
    console.log("  ✅ Data set via dispatcher");

    const retrievedData = await facetAInterface.getMessage();
    console.log("  Retrieved data:", retrievedData);
    console.log("  ✅ Data matches:", retrievedData === testData);

  } catch (error) {
    console.error("❌ Storage operations failed:", error instanceof Error ? error.message : String(error));
  }

  try {
    // Check dispatcher state
    console.log("\n🔍 Checking dispatcher state...");
    const dispatcher = await ethers.getContractAt("ManifestDispatcher", dispatcherAddress);
    
    const activeEpoch = await dispatcher.activeEpoch();
    const activeRoot = await dispatcher.activeRoot();
    
    console.log("  Active epoch:", activeEpoch.toString());
    console.log("  Active root:", activeRoot);
    
    // Test route lookup for known selectors
    const testSelectors = [
      "0x7ab7b94b", // getFacetInfo
      "0x3c7264b2"  // getFacetInfoB  
    ];
    
    console.log("\n🔍 Testing route lookups...");
    for (const selector of testSelectors) {
      try {
        const route = await dispatcher.routes(selector);
        console.log(`  ${selector} → ${route.facet} (${route.codehash.slice(0,10)}...)`);
      } catch (error) {
        console.error(`  ${selector} failed:`, error instanceof Error ? error.message : String(error));
      }
    }

  } catch (error) {
    console.error("❌ Dispatcher state check failed:", error instanceof Error ? error.message : String(error));
  }

  console.log("\n🎉 Diamond pattern communication test complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

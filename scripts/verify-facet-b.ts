import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Verifying ExampleFacetB deployment...");

  // Get the deployed contract address
  const facetBAddress = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
  
  // Connect to the deployed contract
  const ExampleFacetB = await ethers.getContractFactory("ExampleFacetB");
  const facetB = ExampleFacetB.attach(facetBAddress);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);

  try {
    // Try to initialize the contract (skip if already initialized)
    console.log("\n🔧 Checking ExampleFacetB initialization...");
    try {
      const initTx = await facetB.initializeFacetB(deployer.address);
      await initTx.wait();
      console.log("   ✅ Contract initialized with operator:", deployer.address);
    } catch (error: any) {
      if (error.message.includes("AlreadyInitialized")) {
        console.log("   ✅ Contract already initialized, skipping...");
      } else {
        throw error;
      }
    }

    // Test basic functionality
    console.log("\n📋 Testing ExampleFacetB functions:");

    // Test getFacetInfo
    console.log("1. Testing getFacetInfo()...");
    const facetInfo = await facetB.getFacetInfo();
    console.log("   ✅ Facet info:", facetInfo);

    // Test executeB
    console.log("2. Testing executeB()...");
    const tx = await facetB.executeB(1, ethers.AbiCoder.defaultAbiCoder().encode(["string"], ["Hello from FacetB!"]));
    await tx.wait();
    console.log("   ✅ ExecuteB successful, tx:", tx.hash);

    // Test getStateSummary
    console.log("3. Testing getStateSummary()...");
    const summary = await facetB.getStateSummary();
    console.log("   ✅ State summary:", summary);

    // Test complexCalculation
    console.log("4. Testing complexCalculation()...");
    const result = await facetB.complexCalculation([5, 10, 15]);
    console.log("   ✅ Complex calculation ([5, 10, 15]):", result.toString());

    // Check contract code
    console.log("\n🔍 Contract verification:");
    const code = await ethers.provider.getCode(facetBAddress);
    console.log("   ✅ Contract has code:", code.length > 2);
    console.log("   ✅ Code size:", (code.length / 2 - 1), "bytes");

    console.log("\n🎉 ExampleFacetB verification completed successfully!");

  } catch (error) {
    console.error("❌ Verification failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });

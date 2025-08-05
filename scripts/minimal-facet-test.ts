/**
 * 🚀 MINIMAL FACET TEST DEPLOYMENT
 * 
 * Tests deployment of individual facets without dependencies
 */

async function main() {
  const hre = require("hardhat");
  const { ethers } = hre;
  
  console.log(`
🧪 MINIMAL FACET TEST
${'='.repeat(30)}

Testing compilation and deployment of individual facets...
Network: ${hre.network.name}
`);

  // Test just one simple facet first
  const testFacets = [
    "ExampleFacetA"
  ];

  for (const facetName of testFacets) {
    console.log(`\n🔨 Testing ${facetName}...`);
    
    try {
      // Try to get contract factory (this will trigger compilation)
      const Factory = await ethers.getContractFactory(facetName);
      console.log(`   ✅ Compilation successful`);
      
      // Try deployment
      console.log(`   🚀 Deploying...`);
      const contract = await Factory.deploy();
      await contract.waitForDeployment();
      
      const address = await contract.getAddress();
      console.log(`   ✅ Deployed at: ${address}`);
      
      // Generate salt for CREATE2 future use
      const saltInput = `PayRox-${facetName}-v1.0.0-${Date.now()}`;
      const salt = ethers.keccak256(ethers.toUtf8Bytes(saltInput));
      console.log(`   🧂 Salt: ${salt}`);
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }
  
  console.log("\n✅ Minimal test completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });

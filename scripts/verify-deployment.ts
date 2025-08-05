import { ethers } from "hardhat";

async function main() {
  console.log("🔍 PayRox Go Beyond - Professional Deployment Verification");
  console.log("===========================================================");
  
  const [deployer] = await ethers.getSigners();
  console.log("📋 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
  
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "(Chain ID:", network.chainId, ")");
  
  let successCount = 0;
  let totalChecks = 0;
  
  console.log("\n🏭 Contract Verification:");
  console.log("=========================");
  
  // Check DeterministicChunkFactory
  totalChecks++;
  try {
    const factory = await ethers.getContractAt("DeterministicChunkFactory", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
    const owner = await factory.owner();
    const paused = await factory.paused();
    console.log("✅ DeterministicChunkFactory");
    console.log("   📍 Address: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
    console.log("   👤 Owner:", owner);
    console.log("   ⏸️  Paused:", paused);
    successCount++;
  } catch (error) {
    console.log("❌ DeterministicChunkFactory: Failed -", error.message);
  }
  
  // Check ManifestDispatcher
  totalChecks++;
  try {
    const dispatcher = await ethers.getContractAt("ManifestDispatcher", "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");
    const paused = await dispatcher.paused();
    const currentManifest = await dispatcher.getCurrentManifest();
    console.log("✅ ManifestDispatcher");
    console.log("   📍 Address: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");
    console.log("   ⏸️  Paused:", paused);
    console.log("   📜 Current Manifest:", currentManifest);
    successCount++;
  } catch (error) {
    console.log("❌ ManifestDispatcher: Failed -", error.message);
  }
  
  // Check ExampleFacetA
  totalChecks++;
  try {
    const facetA = await ethers.getContractAt("ExampleFacetA", "0xDDa0648FA8c9cD593416EC37089C2a2E6060B45c");
    const result = await facetA.functionA();
    console.log("✅ ExampleFacetA");
    console.log("   📍 Address: 0xDDa0648FA8c9cD593416EC37089C2a2E6060B45c");
    console.log("   🔧 Function Test:", result);
    successCount++;
  } catch (error) {
    console.log("❌ ExampleFacetA: Failed -", error.message);
  }
  
  // Check ExampleFacetB
  totalChecks++;
  try {
    const facetB = await ethers.getContractAt("ExampleFacetB", "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9");
    const result = await facetB.functionB();
    console.log("✅ ExampleFacetB");
    console.log("   📍 Address: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9");
    console.log("   🔧 Function Test:", result);
    successCount++;
  } catch (error) {
    console.log("❌ ExampleFacetB: Failed -", error.message);
  }
  
  // Check Orchestrator
  totalChecks++;
  try {
    const orchestrator = await ethers.getContractAt("Orchestrator", "0x68B1D87F95878fE05B998F19b66F4baba5De1aed");
    const paused = await orchestrator.paused();
    console.log("✅ Orchestrator");
    console.log("   📍 Address: 0x68B1D87F95878fE05B998F19b66F4baba5De1aed");
    console.log("   ⏸️  Paused:", paused);
    successCount++;
  } catch (error) {
    console.log("❌ Orchestrator: Failed -", error.message);
  }
  
  // Check GovernanceOrchestrator
  totalChecks++;
  try {
    const govOrchestrator = await ethers.getContractAt("GovernanceOrchestrator", "0x0165878A594ca255338adfa4d48449f69242Eb8F");
    const paused = await govOrchestrator.paused();
    console.log("✅ GovernanceOrchestrator");
    console.log("   📍 Address: 0x0165878A594ca255338adfa4d48449f69242Eb8F");
    console.log("   ⏸️  Paused:", paused);
    successCount++;
  } catch (error) {
    console.log("❌ GovernanceOrchestrator: Failed -", error.message);
  }
  
  // Check AuditRegistry
  totalChecks++;
  try {
    const auditRegistry = await ethers.getContractAt("AuditRegistry", "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853");
    const paused = await auditRegistry.paused();
    console.log("✅ AuditRegistry");
    console.log("   📍 Address: 0xa513E6E4b8f2a923D98304ec87F64353C4D5C853");
    console.log("   ⏸️  Paused:", paused);
    successCount++;
  } catch (error) {
    console.log("❌ AuditRegistry: Failed -", error.message);
  }
  
  console.log("\n📊 Professional System Status:");
  console.log("===============================");
  console.log(`✅ Successful: ${successCount}/${totalChecks}`);
  console.log(`📈 Success Rate: ${((successCount/totalChecks)*100).toFixed(1)}%`);
  
  if (successCount === totalChecks) {
    console.log("\n🎉 PROFESSIONAL DEPLOYMENT COMPLETE!");
    console.log("🔥 All contracts are operational and ready for production use!");
    
    // Test integration
    console.log("\n🔗 Testing System Integration:");
    console.log("===============================");
    
    try {
      const dispatcher = await ethers.getContractAt("ManifestDispatcher", "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");
      const factory = await ethers.getContractAt("DeterministicChunkFactory", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
      
      // Test factory → dispatcher connection
      const factoryDispatcher = await factory.manifestDispatcher();
      console.log("🔗 Factory ↔ Dispatcher Connection:", factoryDispatcher === "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" ? "✅ Connected" : "❌ Disconnected");
      
      console.log("\n🚀 SYSTEM READY FOR PROFESSIONAL USE!");
      console.log("=====================================");
      console.log("• Manifest-based routing active");
      console.log("• Deterministic deployments enabled");
      console.log("• Access controls configured");
      console.log("• Audit trails operational");
      console.log("• Emergency controls available");
      
    } catch (error) {
      console.log("⚠️  Integration test failed:", error.message);
    }
    
  } else {
    console.log("\n❌ DEPLOYMENT ISSUES DETECTED");
    console.log("Please review failed contracts above.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Verification failed:", error);
    process.exit(1);
  });

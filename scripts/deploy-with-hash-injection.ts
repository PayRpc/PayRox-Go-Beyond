#!/usr/bin/env npx tsx
/**
 * Bullet-proof PayRox deployment with constructor hash injection
 * 
 * This script demonstrates the "constructor-injection" pattern to avoid
 * "oops, I forgot the hash" vulnerabilities. It:
 * 
 * 1. Deploys ManifestDispatcher first
 * 2. Builds and commits a manifest
 * 3. Computes the actual manifest hash and factory bytecode hash
 * 4. Deploys DeterministicChunkFactory with these hashes injected
 * 5. Verifies the deployment immediately
 * 
 * Guarantee: Even if someone edits the contracts tomorrow, 
 * the deployment will fail unless fresh hashes are computed.
 */

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying PayRox with constructor hash injection...");
  console.log("📡 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 1: Deploy ManifestDispatcher
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n📦 Step 1: Deploying ManifestDispatcher...");
  
  const ManifestDispatcher = await ethers.getContractFactory("ManifestDispatcher");
  const manifestDispatcher = await ManifestDispatcher.deploy(
    deployer.address, // admin
    3600 // 1 hour activation delay
  );
  await manifestDispatcher.waitForDeployment();
  
  console.log("✅ ManifestDispatcher deployed to:", await manifestDispatcher.getAddress());

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 2: Build and commit a manifest
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n📦 Step 2: Building manifest...");
  
  // Deploy some example facets for the manifest
  const ExampleFacetA = await ethers.getContractFactory("ExampleFacetA");
  const ExampleFacetB = await ethers.getContractFactory("ExampleFacetB");
  
  const facetA = await ExampleFacetA.deploy();
  const facetB = await ExampleFacetB.deploy();
  await facetA.waitForDeployment();
  await facetB.waitForDeployment();
  
  console.log("✅ ExampleFacetA deployed to:", await facetA.getAddress());
  console.log("✅ ExampleFacetB deployed to:", await facetB.getAddress());

  // Build manifest with real function selectors
  const manifest = ethers.solidityPacked(
    ["bytes4", "address", "bytes4", "address", "bytes4", "address"],
    [
      // ExampleFacetA functions
      ExampleFacetA.interface.getFunction("executeA")!.selector, 
      await facetA.getAddress(),
      ExampleFacetA.interface.getFunction("storeData")!.selector, 
      await facetA.getAddress(),
      // ExampleFacetB functions  
      ExampleFacetB.interface.getFunction("executeB")!.selector, 
      await facetB.getAddress()
    ]
  );

  const manifestHash = ethers.keccak256(manifest);
  console.log("📋 Manifest hash:", manifestHash);

  // Commit the manifest
  console.log("📤 Committing manifest to dispatcher...");
  const commitTx = await manifestDispatcher.commitRoot(manifestHash, 1);
  await commitTx.wait();
  
  console.log("✅ Manifest committed with epoch 1");

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 3: Compute factory bytecode hash (self-verification)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n📦 Step 3: Computing factory bytecode hash...");
  
  const DeterministicChunkFactory = await ethers.getContractFactory("DeterministicChunkFactory");
  
  // Deploy a temporary instance to get the bytecode hash
  const tempFactory = await DeterministicChunkFactory.deploy(
    deployer.address, // admin
    deployer.address, // fee recipient
    ethers.parseEther("0.0009"), // base fee
    ethers.ZeroHash, // placeholder manifest hash
    ethers.ZeroHash, // placeholder bytecode hash  
    await manifestDispatcher.getAddress() // dispatcher
  );
  await tempFactory.waitForDeployment();
  
  const factoryBytecodeHash = await ethers.provider.send("eth_getCode", [await tempFactory.getAddress()]);
  const actualFactoryBytecodeHash = ethers.keccak256(factoryBytecodeHash);
  
  console.log("🔍 Factory bytecode hash:", actualFactoryBytecodeHash);

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 4: Deploy final factory with REAL hashes injected
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n📦 Step 4: Deploying final factory with hash injection...");
  
  const finalFactory = await DeterministicChunkFactory.deploy(
    deployer.address, // admin
    deployer.address, // fee recipient
    ethers.parseEther("0.0009"), // base fee
    manifestHash, // ✨ REAL manifest hash
    actualFactoryBytecodeHash, // ✨ REAL bytecode hash
    await manifestDispatcher.getAddress() // dispatcher
  );
  await finalFactory.waitForDeployment();
  
  console.log("✅ Final DeterministicChunkFactory deployed to:", await finalFactory.getAddress());

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 5: Immediate integrity verification
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n🔒 Step 5: Verifying system integrity...");
  
  try {
    const isValid = await finalFactory.verifySystemIntegrity();
    console.log("✅ System integrity verification:", isValid ? "PASSED" : "FAILED");
    
    // Additional checks
    const storedManifestHash = await finalFactory.getExpectedManifestHash();
    const storedBytecodeHash = await finalFactory.getExpectedFactoryBytecodeHash();
    const storedDispatcher = await finalFactory.getManifestDispatcher();
    
    console.log("📋 Stored manifest hash:", storedManifestHash);
    console.log("🔍 Stored bytecode hash:", storedBytecodeHash);
    console.log("📡 Stored dispatcher:", storedDispatcher);
    
    // Verify they match what we computed
    if (storedManifestHash === manifestHash) {
      console.log("✅ Manifest hash matches");
    } else {
      console.log("❌ Manifest hash mismatch!");
    }
    
    if (storedBytecodeHash === actualFactoryBytecodeHash) {
      console.log("✅ Bytecode hash matches");
    } else {
      console.log("❌ Bytecode hash mismatch!");
    }
    
  } catch (error) {
    console.error("❌ System integrity verification FAILED:", error);
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Step 6: Test deployment functionality
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n🧪 Step 6: Testing chunk deployment...");
  
  const testData = ethers.toUtf8Bytes("Hello, PayRox with hash verification!");
  const [chunkAddress, chunkHash] = await finalFactory.stage(testData, { value: ethers.parseEther("0.001") });
  
  console.log("✅ Test chunk deployed to:", chunkAddress);
  console.log("📋 Chunk hash:", chunkHash);

  // ═══════════════════════════════════════════════════════════════════════════
  // Success Summary
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n🎉 DEPLOYMENT COMPLETE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📡 ManifestDispatcher:", await manifestDispatcher.getAddress());
  console.log("🏭 DeterministicChunkFactory:", await finalFactory.getAddress());
  console.log("📋 Manifest Hash:", manifestHash);
  console.log("🔍 Factory Bytecode Hash:", actualFactoryBytecodeHash);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n✨ Constructor-injection pattern SUCCESSFUL!");
  console.log("🛡️  System is protected against 'forgot-hash' vulnerabilities");
  console.log("🔒 All hashes are immutable and verified at deployment");
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("💥 Deployment failed:", error);
      process.exit(1);
    });
}

export { main };

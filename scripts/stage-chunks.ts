import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Stage contract chunks for deployment
 */
export async function main() {
  console.log("🧩 Staging contract chunks...");
  
  const hre = require("hardhat");
  const { ethers, artifacts } = hre;
  
  // Load manifest
  const manifest = await loadManifest();
  
  // Prepare chunks for deployment
  const stagedChunks = await stageChunks(manifest, artifacts, ethers);
  
  // Validate chunks
  await validateChunks(stagedChunks);
  
  // Save staging information
  await saveStagingInfo(stagedChunks);
  
  console.log("✅ Chunks staged successfully!");
  return stagedChunks;
}

async function loadManifest() {
  const manifestPath = path.join(__dirname, "..", "manifests", "current.manifest.json");
  
  if (!fs.existsSync(manifestPath)) {
    throw new Error("Manifest not found. Run build-manifest first.");
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  console.log(`  ✓ Loaded manifest v${manifest.version}`);
  return manifest;
}

async function stageChunks(manifest: any, artifacts: any, ethers: any) {
  const stagedChunks = [];
  
  for (const facet of manifest.facets) {
    console.log(`  🧩 Staging chunk: ${facet.name}`);
    
    // Get contract artifact
    const artifact = await artifacts.readArtifact(facet.contract);
    
    // Optimize bytecode for deployment
    const optimizedBytecode = await optimizeBytecode(artifact.bytecode);
    
    // Calculate deployment address
    const salt = getDeploymentSalt(facet.name, manifest);
    const predictedAddress = await calculateCreate2Address(optimizedBytecode, salt, ethers);
    
    const stagedChunk = {
      name: facet.name,
      contract: facet.contract,
      bytecode: optimizedBytecode,
      originalBytecode: artifact.bytecode,
      salt: salt,
      predictedAddress: predictedAddress,
      selectors: facet.selectors,
      gasLimit: facet.gasLimit,
      size: optimizedBytecode.length / 2 - 1, // Remove 0x and convert to bytes
      hash: ethers.keccak256(optimizedBytecode),
      abi: artifact.abi,
      metadata: {
        compiler: artifact.metadata?.compiler || "unknown",
        optimization: true,
        stagingTime: new Date().toISOString()
      }
    };
    
    stagedChunks.push(stagedChunk);
    
    console.log(`    ✓ Size: ${stagedChunk.size} bytes`);
    console.log(`    ✓ Predicted address: ${predictedAddress}`);
    console.log(`    ✓ Salt: ${salt}`);
  }
  
  return stagedChunks;
}

async function optimizeBytecode(bytecode: string): Promise<string> {
  // For now, just return the original bytecode
  // In a real implementation, you might apply additional optimizations
  return bytecode;
}

function getDeploymentSalt(chunkName: string, manifest: any): string {
  // Try to get salt from manifest deployment config
  const deploymentConfig = manifest.deployment;
  
  if (deploymentConfig && deploymentConfig[chunkName.toLowerCase()]) {
    return deploymentConfig[chunkName.toLowerCase()].salt;
  }
  
  // Generate deterministic salt based on chunk name and manifest version
  const saltInput = `PayRox-${chunkName}-${manifest.version}`;
  return ethers.keccak256(ethers.toUtf8Bytes(saltInput));
}

async function calculateCreate2Address(bytecode: string, salt: string, ethers: any): Promise<string> {
  // For this example, we'll return a placeholder
  // In a real deployment, you'd calculate this based on the factory address
  const factoryAddress = "0x0000000000000000000000000000000000000000"; // Placeholder
  
  const hash = ethers.keccak256(
    ethers.concat([
      "0xff",
      factoryAddress,
      salt,
      ethers.keccak256(bytecode)
    ])
  );
  
  return ethers.getAddress(ethers.dataSlice(hash, 12));
}

async function validateChunks(stagedChunks: any[]) {
  console.log("🔍 Validating staged chunks...");
  
  // Load security configuration
  const securityPath = path.join(__dirname, "..", "config", "security.json");
  const security = JSON.parse(fs.readFileSync(securityPath, "utf8"));
  
  for (const chunk of stagedChunks) {
    // Validate chunk size
    if (chunk.size > security.security.maxFacetSize) {
      throw new Error(`Chunk ${chunk.name} size (${chunk.size}) exceeds maximum (${security.security.maxFacetSize})`);
    }
    
    // Validate gas limit
    if (chunk.gasLimit > security.invariants.totalGasLimit) {
      throw new Error(`Chunk ${chunk.name} gas limit (${chunk.gasLimit}) exceeds maximum (${security.invariants.totalGasLimit})`);
    }
    
    // Validate selectors
    if (chunk.selectors.length === 0) {
      throw new Error(`Chunk ${chunk.name} has no selectors`);
    }
    
    // Check for forbidden selectors
    const forbiddenSelectors = security.security.forbiddenSelectors || [];
    for (const selector of chunk.selectors) {
      if (forbiddenSelectors.includes(selector)) {
        throw new Error(`Chunk ${chunk.name} contains forbidden selector: ${selector}`);
      }
    }
    
    console.log(`    ✓ ${chunk.name} validation passed`);
  }
  
  // Check for duplicate addresses
  const addresses = stagedChunks.map(chunk => chunk.predictedAddress);
  const uniqueAddresses = new Set(addresses);
  
  if (addresses.length !== uniqueAddresses.size) {
    throw new Error("Duplicate predicted addresses detected");
  }
  
  // Check for duplicate selectors across chunks
  const allSelectors = [];
  const selectorToChunk = new Map();
  
  for (const chunk of stagedChunks) {
    for (const selector of chunk.selectors) {
      if (selectorToChunk.has(selector)) {
        console.error(`❌ Duplicate selector found: ${selector}`);
        console.error(`   Used in: ${selectorToChunk.get(selector)} and ${chunk.name}`);
      }
      selectorToChunk.set(selector, chunk.name);
      allSelectors.push(selector);
    }
  }
  
  const uniqueSelectors = new Set(allSelectors);
  if (allSelectors.length !== uniqueSelectors.size) {
    console.error(`❌ Found ${allSelectors.length - uniqueSelectors.size} duplicate selectors`);
    throw new Error("Duplicate selectors detected across chunks");
  }
  
  console.log(`  ✓ All ${stagedChunks.length} chunks validated`);
  console.log(`  ✓ Total size: ${stagedChunks.reduce((sum, chunk) => sum + chunk.size, 0)} bytes`);
  console.log(`  ✓ Total selectors: ${allSelectors.length}`);
}

async function saveStagingInfo(stagedChunks: any[]) {
  const stagingDir = path.join(__dirname, "..", "manifests");
  
  // Save staging summary
  const stagingSummary = {
    timestamp: new Date().toISOString(),
    totalChunks: stagedChunks.length,
    totalSize: stagedChunks.reduce((sum, chunk) => sum + chunk.size, 0),
    totalSelectors: stagedChunks.reduce((sum, chunk) => sum + chunk.selectors.length, 0),
    chunks: stagedChunks.map(chunk => ({
      name: chunk.name,
      size: chunk.size,
      hash: chunk.hash,
      predictedAddress: chunk.predictedAddress,
      selectorsCount: chunk.selectors.length
    }))
  };
  
  const summaryPath = path.join(stagingDir, "staging-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(stagingSummary, null, 2));
  console.log(`  💾 Staging summary saved: ${summaryPath}`);
  
  // Save detailed staging data
  const detailedPath = path.join(stagingDir, "staged-chunks.json");
  fs.writeFileSync(detailedPath, JSON.stringify(stagedChunks, null, 2));
  console.log(`  💾 Detailed staging data saved: ${detailedPath}`);
  
  // Update chunk mapping with staging information
  const chunkMapPath = path.join(stagingDir, "chunks.map.json");
  const chunkMap = fs.existsSync(chunkMapPath) ? 
    JSON.parse(fs.readFileSync(chunkMapPath, "utf8")) : {};
  
  for (const chunk of stagedChunks) {
    chunkMap[chunk.name] = {
      ...chunkMap[chunk.name],
      staged: true,
      stagingTime: chunk.metadata.stagingTime,
      predictedAddress: chunk.predictedAddress,
      salt: chunk.salt
    };
  }
  
  fs.writeFileSync(chunkMapPath, JSON.stringify(chunkMap, null, 2));
  console.log(`  💾 Chunk mapping updated`);
}

// Export for CLI usage
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

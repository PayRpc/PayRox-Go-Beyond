import { expect } from "chai";
import { ethers } from "hardhat";

describe("Contract Size Check", function () {
  it("Should verify DeterministicChunkFactory is within EIP-170 limit", async function () {
    console.log("🔍 Checking DeterministicChunkFactory size...");
    
    // Get the contract factory and bytecode
    const factory = await ethers.getContractFactory("DeterministicChunkFactory");
    const bytecode = factory.bytecode;
    
    // Calculate init code size (what matters for EIP-170)
    const bytecodeSize = (bytecode.length - 2) / 2; // Remove 0x prefix and convert to bytes
    
    // EIP-170 limit is 24,576 bytes (24 KB)
    const EIP_170_LIMIT = 24576;
    
    console.log(`📊 DeterministicChunkFactory Size Analysis:`);
    console.log(`  • Init Code Size: ${bytecodeSize} bytes (${(bytecodeSize/1024).toFixed(2)} KB)`);
    console.log(`  • EIP-170 Limit: ${EIP_170_LIMIT} bytes (24 KB)`);
    console.log(`  • Utilization: ${((bytecodeSize/EIP_170_LIMIT)*100).toFixed(1)}% of limit`);
    
    if (bytecodeSize > EIP_170_LIMIT) {
      console.log(`❌ CONTRACT TOO LARGE! Exceeds EIP-170 by ${bytecodeSize - EIP_170_LIMIT} bytes`);
      console.log(`🔧 Optimization Required:`);
      console.log(`  • Extract functions to libraries`);
      console.log(`  • Remove unnecessary imports`);
      console.log(`  • Split into multiple contracts`);
      console.log(`  • Use proxy pattern`);
    } else {
      console.log(`✅ Contract size within EIP-170 limits`);
      console.log(`📈 Available space: ${EIP_170_LIMIT - bytecodeSize} bytes`);
    }
    
    // Test should fail if contract is too large
    expect(bytecodeSize).to.be.lessThanOrEqual(EIP_170_LIMIT, 
      `DeterministicChunkFactory exceeds EIP-170 limit by ${bytecodeSize - EIP_170_LIMIT} bytes`);
  });
  
  it("Should analyze all production contracts", async function () {
    const contracts = [
      "DeterministicChunkFactory",
      "ManifestDispatcher", 
      "Orchestrator",
      "GovernanceOrchestrator",
      "AuditRegistry"
    ];
    
    console.log("\n📋 Production Contract Size Summary:");
    console.log("=".repeat(60));
    
    const EIP_170_LIMIT = 24576;
    let totalSize = 0;
    
    for (const contractName of contracts) {
      try {
        const factory = await ethers.getContractFactory(contractName);
        const bytecodeSize = (factory.bytecode.length - 2) / 2;
        totalSize += bytecodeSize;
        
        const status = bytecodeSize > EIP_170_LIMIT ? "❌ TOO LARGE" : "✅ OK";
        const percentage = ((bytecodeSize/EIP_170_LIMIT)*100).toFixed(1);
        
        console.log(`${status} ${contractName}: ${bytecodeSize} bytes (${percentage}%)`);
      } catch (error) {
        console.log(`⚠️  ${contractName}: Could not analyze - ${error}`);
      }
    }
    
    console.log("=".repeat(60));
    console.log(`📊 Total System Size: ${totalSize} bytes (${(totalSize/1024).toFixed(2)} KB)`);
    console.log(`💾 Average per contract: ${Math.round(totalSize/contracts.length)} bytes`);
  });
});

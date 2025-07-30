import { ethers } from "hardhat";

async function main() {
  const txHash = "0xc26de816db12f9f4da52d9fdf29062d17886903dc2e57d0891dcd16d60dc94f7";
  
  console.log("🔍 Analyzing ExampleFacetB deployment transaction:", txHash);
  
  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  if (!receipt) {
    throw new Error("Transaction not found");
  }
  
  console.log("📄 Transaction Receipt:");
  console.log("  Status:", receipt.status);
  console.log("  Gas used:", receipt.gasUsed.toString());
  console.log("  Logs count:", receipt.logs.length);
  
  // Decode logs to find the deployment address
  const factoryAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const factory = await ethers.getContractAt("DeterministicChunkFactory", factoryAddress);
  
  for (let i = 0; i < receipt.logs.length; i++) {
    try {
      const parsed = factory.interface.parseLog(receipt.logs[i]);
      if (parsed && parsed.name && parsed.args) {
        console.log(`📋 Log ${i}:`, parsed.name, parsed.args);
        
        if (parsed.name === "ChunkDeployed") {
          const deployedAddress = parsed.args.chunk;
          console.log(`\n🎯 ExampleFacetB actually deployed to: ${deployedAddress}`);
          
          // Verify it has code
          const code = await ethers.provider.getCode(deployedAddress);
          console.log(`✅ Code size: ${code.length / 2 - 1} bytes`);
          
          return deployedAddress;
        }
      }
    } catch (error) {
      // Log doesn't belong to factory, skip
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

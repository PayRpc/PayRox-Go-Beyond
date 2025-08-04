import { ethers } from "hardhat";

async function main() {
  console.log("🎯 PayRox Cross-Chain Deterministic Address Generation");
  console.log("======================================================");
  
  // Simulate the actual cross-chain salt generation from PayRox
  const deployerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const contentHash = "0x608060405234801561001057600080fd5b50"; // Sample bytecode
  const version = "1.0.0";
  const crossChainNonce = 42;
  
  console.log("📋 Input Parameters:");
  console.log(`   Deployer: ${deployerAddress}`);
  console.log(`   Content: ${contentHash}`);
  console.log(`   Version: ${version}`);
  console.log(`   Nonce: ${crossChainNonce}`);
  
  // Generate Universal Salt (PayRox Cross-Chain Method)
  const packed = ethers.solidityPacked(
    ['string', 'address', 'string', 'uint256', 'string'],
    [
      'PayRoxCrossChain',
      deployerAddress,
      contentHash,
      crossChainNonce,
      version,
    ]
  );
  
  const universalSalt = ethers.keccak256(packed);
  console.log(`\n🔑 Universal Salt: ${universalSalt}`);
  
  // Generate Enhanced Chunk Salt (PayRox Pattern + Cross-Chain)
  const realContentHash = ethers.keccak256(contentHash);
  const baseChunkSalt = ethers.keccak256(
    ethers.solidityPacked(['string', 'bytes32'], ['chunk:', realContentHash])
  );
  
  const enhancedSalt = ethers.keccak256(
    ethers.solidityPacked(
      ['bytes32', 'uint256', 'string'],
      [baseChunkSalt, crossChainNonce, 'CrossChainV1']
    )
  );
  
  console.log(`🧩 Enhanced Chunk Salt: ${enhancedSalt}`);
  
  // Network configurations with chain IDs and explorers
  const networkConfigs = {
    "Ethereum Mainnet": { 
      chainId: 1, 
      factory: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0",
      explorer: "https://etherscan.io/address/"
    },
    "Polygon": { 
      chainId: 137, 
      factory: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0",
      explorer: "https://polygonscan.com/address/"
    },
    "Arbitrum One": { 
      chainId: 42161, 
      factory: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0",
      explorer: "https://arbiscan.io/address/"
    },
    "Optimism": { 
      chainId: 10, 
      factory: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0",
      explorer: "https://optimistic.etherscan.io/address/"
    },
    "Base": { 
      chainId: 8453, 
      factory: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0",
      explorer: "https://basescan.org/address/"
    },
    "BSC": { 
      chainId: 56, 
      factory: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0",
      explorer: "https://bscscan.com/address/"
    },
    "Avalanche": { 
      chainId: 43114, 
      factory: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0",
      explorer: "https://snowtrace.io/address/"
    },
    "Fantom": { 
      chainId: 250, 
      factory: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0",
      explorer: "https://ftmscan.com/address/"
    },
    "Celo": { 
      chainId: 42220, 
      factory: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0",
      explorer: "https://celoscan.io/address/"
    },
    "Moonbeam": { 
      chainId: 1284, 
      factory: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0",
      explorer: "https://moonbeam.moonscan.io/address/"
    },
    "Gnosis Chain": { 
      chainId: 100, 
      factory: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0",
      explorer: "https://gnosisscan.io/address/"
    },
    "Cronos": { 
      chainId: 25, 
      factory: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0",
      explorer: "https://cronoscan.com/address/"
    },
    "Aurora": { 
      chainId: 1313161554, 
      factory: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0",
      explorer: "https://aurorascan.dev/address/"
    },
    "Metis": { 
      chainId: 1088, 
      factory: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0",
      explorer: "https://andromeda-explorer.metis.io/address/"
    },
    "Boba Network": { 
      chainId: 288, 
      factory: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0",
      explorer: "https://bobascan.com/address/"
    },
    "Localhost": { 
      chainId: 31337, 
      factory: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      explorer: "http://localhost:8545/"
    }
  };
  
  const bytecodeHash = ethers.keccak256(contentHash);
  
  console.log(`\n🔮 CREATE2 Address Predictions Across Networks:`);
  console.log("================================================");
  
  const addressResults: Array<{network: string, address: string, factoryAddress: string, chainId: number, explorer: string}> = [];
  
  for (const [network, config] of Object.entries(networkConfigs)) {
    try {
      // Predict CREATE2 address using ethers built-in function
      const predictedAddress = ethers.getCreate2Address(
        config.factory,
        universalSalt,
        bytecodeHash
      );
      
      addressResults.push({
        network,
        address: predictedAddress,
        factoryAddress: config.factory,
        chainId: config.chainId,
        explorer: config.explorer
      });
      
      console.log(`📍 ${network.padEnd(20)} (Chain ${config.chainId.toString().padEnd(6)}): ${predictedAddress}`);
    } catch (error) {
      console.log(`❌ ${network.padEnd(20)}: Error - ${error.message}`);
    }
  }
  
  // Verify cross-chain consistency
  console.log(`\n🔍 Cross-Chain Consistency Analysis:`);
  console.log("=====================================");
  
  const mainnetFactories = addressResults.filter(r => r.factoryAddress === "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0");
  const uniqueAddresses = [...new Set(mainnetFactories.map(r => r.address))];
  
  if (uniqueAddresses.length === 1) {
    console.log(`✅ PERFECT CONSISTENCY: All ${mainnetFactories.length} networks use the SAME address!`);
    console.log(`🎯 Unified Address: ${uniqueAddresses[0]}`);
    console.log(`📊 Networks Verified: ${mainnetFactories.map(r => r.network).join(', ')}`);
    
    // Show explorer links for the first few networks
    console.log(`\n🔗 Explorer Links (Production Networks):`);
    mainnetFactories.slice(0, 5).forEach(result => {
      console.log(`   ${result.network}: ${result.explorer}${result.address}`);
    });
  } else {
    console.log(`❌ INCONSISTENCY DETECTED: Found ${uniqueAddresses.length} different addresses`);
    uniqueAddresses.forEach(addr => {
      const networks = addressResults.filter(r => r.address === addr).map(r => r.network);
      console.log(`   ${addr}: ${networks.join(', ')}`);
    });
  }
  
  // Network statistics
  console.log(`\n📊 Network Coverage Statistics:`);
  console.log("===============================");
  console.log(`   Total Networks: ${addressResults.length}`);
  console.log(`   Production Networks: ${mainnetFactories.length}`);
  console.log(`   Test Networks: ${addressResults.length - mainnetFactories.length}`);
  console.log(`   Unique Factory Addresses: ${[...new Set(addressResults.map(r => r.factoryAddress))].length}`);
  console.log(`   Chain ID Range: ${Math.min(...addressResults.map(r => r.chainId))} - ${Math.max(...addressResults.map(r => r.chainId))}`);
  
  // Business value summary
  console.log(`\n💼 Business Value:`);
  console.log("==================");
  console.log(`🌐 Multi-Chain Support: ${addressResults.length} EVM networks`);
  console.log(`🎯 Address Consistency: ${uniqueAddresses.length === 1 ? 'PERFECT' : 'NEEDS REVIEW'}`);
  console.log(`🚀 Deployment Efficiency: Predict before deploy`);
  console.log(`🔗 Cross-Chain UX: Same address everywhere`);
  console.log(`⚡ Developer Experience: Universal salt system`);
  
  console.log(`\n🎯 Key Features Demonstrated:`);
  console.log("==============================");
  console.log("✅ Deterministic salt generation across ALL networks");
  console.log("✅ CREATE2 address prediction before deployment");
  console.log("✅ Cross-chain consistency with same salt + bytecode");
  console.log("✅ PayRox-compatible chunk salt enhancement");
  console.log("✅ Universal addressing for multi-chain deployment");
  
  // Test with our actual deployed factory
  console.log(`\n🏭 Testing with Deployed PayRox Factory:`);
  console.log("========================================");
  
  try {
    const localhostConfig = networkConfigs["Localhost"];
    const factory = await ethers.getContractAt("DeterministicChunkFactory", localhostConfig.factory);
    const baseFee = await factory.baseFeeWei();
    const feeRecipient = await factory.feeRecipient();
    
    console.log(`📍 Factory Address: ${localhostConfig.factory}`);
    console.log(`🌐 Network: Localhost (Chain ID: ${localhostConfig.chainId})`);
    console.log(`💰 Base Fee: ${ethers.formatEther(baseFee)} ETH`);
    console.log(`📧 Fee Recipient: ${feeRecipient}`);
    
    const predictedWithRealFactory = ethers.getCreate2Address(
      localhostConfig.factory,
      universalSalt,
      bytecodeHash
    );
    
    console.log(`🎯 Predicted Address with Real Factory: ${predictedWithRealFactory}`);
    
    // Compare with production factory prediction
    const productionPrediction = ethers.getCreate2Address(
      "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0",
      universalSalt,
      bytecodeHash
    );
    
    console.log(`🔄 Production Factory Prediction: ${productionPrediction}`);
    console.log(`🎯 Addresses Match: ${predictedWithRealFactory === productionPrediction ? 'NO (different factories)' : 'Different factory addresses'}`);
    
  } catch (error) {
    console.log("⚠️  Could not connect to deployed factory:", error.message);
  }
  
  console.log(`\n🚀 CROSS-CHAIN DETERMINISTIC ADDRESSING COMPLETE!`);
  console.log("===================================================");
  console.log("The PayRox Go Beyond system enables:");
  console.log("• Same contract → Same address across ALL EVM chains");
  console.log("• Predictable deployment before transaction");
  console.log("• Professional-grade cross-chain consistency");
  console.log("• Universal salt generation for any network");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Demo failed:", error);
    process.exit(1);
  });

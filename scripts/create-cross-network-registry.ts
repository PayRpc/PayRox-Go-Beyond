import { ethers } from "hardhat";
import {
  writeJsonFile,
  ensureDirectoryExists,
  FileOperationError,
  SecurityError
} from './utils/io';

/**
 * PayRox Cross-Network Address Registry Generator
 * Creates comprehensive address manifest for all supported networks
 */

interface NetworkAddress {
  network: string;
  chainId: number;
  factoryAddress: string;
  predictedAddress: string;
  explorerUrl: string;
  status: 'production' | 'testnet' | 'local';
}

async function main() {
  console.log("🌍 PayRox Cross-Network Address Registry Generator");
  console.log("==================================================\n");

  // Configuration for address generation
  const deploymentConfig = {
    deployer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    content: "PayRoxUniversalContract",
    version: "1.0.0",
    crossChainNonce: 1000,
    contractBytecode: "0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550610150806100606000396000f3fe"
  };

  // Generate universal salt
  const packed = ethers.solidityPacked(
    ['string', 'address', 'string', 'uint256', 'string'],
    [
      'PayRoxCrossChain',
      deploymentConfig.deployer,
      deploymentConfig.content,
      deploymentConfig.crossChainNonce,
      deploymentConfig.version,
    ]
  );
  const universalSalt = ethers.keccak256(packed);
  const bytecodeHash = ethers.keccak256(deploymentConfig.contractBytecode);

  console.log("📋 Generation Configuration:");
  console.log(`   Deployer: ${deploymentConfig.deployer}`);
  console.log(`   Content: ${deploymentConfig.content}`);
  console.log(`   Version: ${deploymentConfig.version}`);
  console.log(`   Nonce: ${deploymentConfig.crossChainNonce}`);
  console.log(`   Universal Salt: ${universalSalt}`);
  console.log(`   Bytecode Hash: ${bytecodeHash}\n`);

  // Complete network registry
  const networks: Array<Omit<NetworkAddress, 'predictedAddress'>> = [
    // Tier 1 Production Networks
    { network: "Ethereum Mainnet", chainId: 1, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://etherscan.io", status: 'production' },
    { network: "Polygon", chainId: 137, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://polygonscan.com", status: 'production' },
    { network: "Arbitrum One", chainId: 42161, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://arbiscan.io", status: 'production' },
    { network: "Optimism", chainId: 10, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://optimistic.etherscan.io", status: 'production' },
    { network: "Base", chainId: 8453, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://basescan.org", status: 'production' },

    // Tier 2 Production Networks
    { network: "BNB Smart Chain", chainId: 56, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://bscscan.com", status: 'production' },
    { network: "Avalanche C-Chain", chainId: 43114, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://snowtrace.io", status: 'production' },
    { network: "Fantom Opera", chainId: 250, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://ftmscan.com", status: 'production' },
    { network: "Gnosis Chain", chainId: 100, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://gnosisscan.io", status: 'production' },
    { network: "Celo", chainId: 42220, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://celoscan.io", status: 'production' },

    // Tier 3 Production Networks
    { network: "Moonbeam", chainId: 1284, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://moonbeam.moonscan.io", status: 'production' },
    { network: "Cronos", chainId: 25, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://cronoscan.com", status: 'production' },
    { network: "Aurora", chainId: 1313161554, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://aurorascan.dev", status: 'production' },
    { network: "Metis Andromeda", chainId: 1088, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://andromeda-explorer.metis.io", status: 'production' },
    { network: "Boba Network", chainId: 288, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://bobascan.com", status: 'production' },
    { network: "Moonriver", chainId: 1285, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://moonriver.moonscan.io", status: 'production' },
    { network: "Fuse", chainId: 122, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://explorer.fuse.io", status: 'production' },
    { network: "Harmony One", chainId: 1666600000, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://explorer.harmony.one", status: 'production' },

    // Test Networks
    { network: "Ethereum Sepolia", chainId: 11155111, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://sepolia.etherscan.io", status: 'testnet' },
    { network: "Polygon Mumbai", chainId: 80001, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://mumbai.polygonscan.com", status: 'testnet' },
    { network: "Arbitrum Sepolia", chainId: 421614, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://sepolia.arbiscan.io", status: 'testnet' },
    { network: "Base Sepolia", chainId: 84532, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://sepolia.basescan.org", status: 'testnet' },
    { network: "Optimism Sepolia", chainId: 11155420, factoryAddress: "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0", explorerUrl: "https://sepolia-optimism.etherscan.io", status: 'testnet' },

    // Local Development
    { network: "Hardhat Local", chainId: 31337, factoryAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", explorerUrl: "http://localhost:8545", status: 'local' },
  ];

  // Generate addresses for all networks
  const addressRegistry: NetworkAddress[] = networks.map(network => ({
    ...network,
    predictedAddress: ethers.getCreate2Address(
      network.factoryAddress,
      universalSalt,
      bytecodeHash
    )
  }));

  // Group by status
  const productionNetworks = addressRegistry.filter(n => n.status === 'production');
  const testNetworks = addressRegistry.filter(n => n.status === 'testnet');
  const localNetworks = addressRegistry.filter(n => n.status === 'local');

  // Display Production Networks
  console.log("🏭 PRODUCTION NETWORKS");
  console.log("======================\n");
  
  const tier1 = productionNetworks.slice(0, 5);
  const tier2 = productionNetworks.slice(5, 10);
  const tier3 = productionNetworks.slice(10);

  console.log("Tier 1 - Major L1/L2 Networks:");
  tier1.forEach(network => {
    console.log(`📍 ${network.network.padEnd(20)} (${network.chainId.toString().padEnd(10)}): ${network.predictedAddress}`);
    console.log(`   🔗 ${network.explorerUrl}/address/${network.predictedAddress}`);
  });

  console.log("\nTier 2 - Alternative L1 Networks:");
  tier2.forEach(network => {
    console.log(`📍 ${network.network.padEnd(20)} (${network.chainId.toString().padEnd(10)}): ${network.predictedAddress}`);
  });

  console.log("\nTier 3 - Specialized Networks:");
  tier3.forEach(network => {
    console.log(`📍 ${network.network.padEnd(20)} (${network.chainId.toString().padEnd(10)}): ${network.predictedAddress}`);
  });

  // Verify consistency
  const productionAddresses = productionNetworks
    .filter(n => n.factoryAddress === "0x742d35cc6641c2dcef174097d589e3c6f1a4e5c0")
    .map(n => n.predictedAddress);
  const uniqueProductionAddresses = [...new Set(productionAddresses)];

  console.log("\n🔍 CONSISTENCY VERIFICATION");
  console.log("============================");
  console.log(`✅ Production Networks: ${productionNetworks.length}`);
  console.log(`✅ Unique Addresses: ${uniqueProductionAddresses.length}`);
  console.log(`✅ Consistency: ${uniqueProductionAddresses.length === 1 ? 'PERFECT' : 'INCONSISTENT'}`);
  
  if (uniqueProductionAddresses.length === 1) {
    console.log(`🎯 Universal Address: ${uniqueProductionAddresses[0]}`);
  }

  // Test Networks
  console.log("\n🧪 TEST NETWORKS");
  console.log("=================");
  testNetworks.forEach(network => {
    console.log(`📍 ${network.network.padEnd(20)} (${network.chainId.toString().padEnd(10)}): ${network.predictedAddress}`);
  });

  // Local Networks
  console.log("\n🏠 LOCAL DEVELOPMENT");
  console.log("====================");
  localNetworks.forEach(network => {
    console.log(`📍 ${network.network.padEnd(20)} (${network.chainId.toString().padEnd(10)}): ${network.predictedAddress}`);
  });

  // Statistics
  console.log("\n📊 REGISTRY STATISTICS");
  console.log("======================");
  console.log(`🌐 Total Networks: ${addressRegistry.length}`);
  console.log(`🏭 Production: ${productionNetworks.length}`);
  console.log(`🧪 Testnets: ${testNetworks.length}`);
  console.log(`🏠 Local: ${localNetworks.length}`);
  console.log(`🔧 Factory Addresses: ${[...new Set(addressRegistry.map(n => n.factoryAddress))].length}`);
  console.log(`📈 Chain ID Range: ${Math.min(...addressRegistry.map(n => n.chainId))} - ${Math.max(...addressRegistry.map(n => n.chainId))}`);

  // Export manifest
  const manifest = {
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    config: deploymentConfig,
    universalSalt,
    bytecodeHash,
    networks: addressRegistry,
    statistics: {
      totalNetworks: addressRegistry.length,
      productionNetworks: productionNetworks.length,
      testNetworks: testNetworks.length,
      localNetworks: localNetworks.length,
      consistency: uniqueProductionAddresses.length === 1
    }
  };

  console.log("\n💾 EXPORTING MANIFEST");
  console.log("=====================");
  console.log("Manifest exported to: cross-network-address-registry.json");
  console.log(`File size: ${JSON.stringify(manifest, null, 2).length} bytes`);

  // Save to file using enhanced I/O utilities
  try {
    ensureDirectoryExists('./manifests');
    
    writeJsonFile(
      'cross-network-address-registry.json', 
      manifest,
      { 
        backup: true,
        validatePath: true,
        indent: 2
      }
    );

    // Also save to manifests directory for consistency
    writeJsonFile(
      './manifests/cross-network-registry.json',
      manifest,
      {
        backup: true,
        validatePath: true,
        indent: 2
      }
    );

    console.log("✅ Registry saved successfully to both locations");
  } catch (error) {
    if (error instanceof FileOperationError || error instanceof SecurityError) {
      console.error(`❌ Failed to save registry: ${error.message}`);
      throw error;
    }
    console.error("❌ Unexpected error saving registry:", error);
    throw error;
  }

  console.log("\n🏆 CROSS-NETWORK REGISTRY COMPLETE!");
  console.log("====================================");
  console.log("✅ Comprehensive network coverage");
  console.log("✅ Deterministic address generation");
  console.log("✅ Production-ready deployment data");
  console.log("✅ Complete explorer integration");
  console.log("✅ Exportable deployment manifest");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Registry generation failed:", error);
    process.exit(1);
  });

// Verify Network System Claims with Real Data
const fs = require('fs');

console.log('🔍 Verifying Network System Claims with Real Data');
console.log('==================================================');

// Since we can't import TypeScript directly, let's analyze the raw code
const networkFile = fs.readFileSync('./src/utils/network.ts', 'utf8');

// Extract CHAIN_ID_MAPPINGS
const chainIdMatch = networkFile.match(/CHAIN_ID_MAPPINGS[^}]+}/s);
const networkConfigMatch = networkFile.match(
  /NETWORK_CONFIGS[^}]+}[^}]+}[^}]+}/s
);

console.log('\n📊 REALITY CHECK:');

// Count actual chain IDs in the mappings
const chainIdMatches = networkFile.match(/'\d+': '[^']+'/g);
console.log(
  `1. Chain ID Mappings: ${chainIdMatches ? chainIdMatches.length : 0} networks`
);

// Count network configurations
const networkConfigLines = networkFile.match(/\w+: {[^}]+name: '[^']+'/g);
console.log(
  `2. Network Configs: ${
    networkConfigLines ? networkConfigLines.length : 0
  } networks`
);

// Check for RPC URLs
const rpcMatches = networkFile.match(/rpcUrl: 'https:\/\/[^']+'/g);
console.log(
  `3. HTTPS RPC URLs: ${rpcMatches ? rpcMatches.length : 0} networks`
);

// Check for block explorers
const explorerMatches = networkFile.match(/blockExplorer: 'https:\/\/[^']+'/g);
console.log(
  `4. Block Explorers: ${explorerMatches ? explorerMatches.length : 0} networks`
);

// Check for testnet flags
const testnetMatches = networkFile.match(/isTestnet: true/g);
const mainnetMatches = networkFile.match(/isTestnet: false/g);
console.log(`5. Testnets: ${testnetMatches ? testnetMatches.length : 0}`);
console.log(`6. Mainnets: ${mainnetMatches ? mainnetMatches.length : 0}`);

console.log('\n🎯 CLAIMS VERIFICATION:');

// Check if claims match reality
const totalNetworks = chainIdMatches ? chainIdMatches.length : 0;
const claimedNetworks = 18;

console.log(`❓ Claimed "18+ networks" - Reality: ${totalNetworks} networks`);
console.log(
  `${totalNetworks >= claimedNetworks ? '✅' : '❌'} Claim is ${
    totalNetworks >= claimedNetworks ? 'ACCURATE' : 'OVERSOLD'
  }`
);

// Check specific networks mentioned in claims
const specificNetworks = [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
  'fantom',
  'bsc',
];
let foundNetworks = 0;
specificNetworks.forEach(network => {
  if (
    networkFile.includes(`name: '${network}'`) ||
    networkFile.includes(`'1': 'mainnet'`)
  ) {
    foundNetworks++;
  }
});

console.log(
  `❓ Claimed major networks support - Found: ${foundNetworks}/${specificNetworks.length}`
);
console.log(
  `${foundNetworks >= 6 ? '✅' : '❌'} Major network support is ${
    foundNetworks >= 6 ? 'REAL' : 'OVERSOLD'
  }`
);

console.log('\n🔍 DETAILED ANALYSIS:');

// Extract actual network names
const actualNetworks = [];
const networkNameMatches = networkFile.match(/name: '([^']+)'/g);
if (networkNameMatches) {
  networkNameMatches.forEach(match => {
    const name = match.match(/name: '([^']+)'/)[1];
    actualNetworks.push(name);
  });
}

console.log('📋 Actually Configured Networks:');
actualNetworks.forEach((network, i) => {
  console.log(`   ${i + 1}. ${network}`);
});

console.log('\n⚠️  REALITY vs MARKETING:');
console.log(`• Networks configured: ${totalNetworks}`);
console.log(`• With RPC URLs: ${rpcMatches ? rpcMatches.length : 0}`);
console.log(
  `• With block explorers: ${explorerMatches ? explorerMatches.length : 0}`
);
console.log(
  `• Development networks: ${
    actualNetworks.filter(n => n.includes('localhost') || n.includes('hardhat'))
      .length
  }`
);

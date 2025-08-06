import { ethers } from 'hardhat';
import { writeFileSync } from 'fs';

/**
 * PayRox Proxy-Router Migration Script
 * 
 * This script implements the "Proxy-Router" pattern where:
 * 1. Keep your existing proxy address (Transparent/UUPS/Beacon)
 * 2. Upgrade proxy implementation to ManifestDispatcher
 * 3. Configure routes to facets via manifest system
 * 
 * Flow: EOA -> Proxy -> (delegatecall) Dispatcher -> (delegatecall) Facet
 * Benefits: Preserves address, msg.sender, storage safety, defense in depth
 */

interface MigrationConfig {
  proxyType: 'transparent' | 'uups' | 'beacon';
  existingProxyAddress: string;
  proxyAdminAddress?: string; // Required for Transparent proxies
  activationDelay: number; // seconds (24-48h recommended for prod)
  multisigAddress: string; // governance address
  skipRoleSetup?: boolean;
}

async function main() {
  console.log('🔄 PayRox Proxy-Router Migration');
  console.log('==================================');

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Migration configuration - customize for your deployment
  const config: MigrationConfig = {
    proxyType: process.env.PROXY_TYPE as any || 'transparent',
    existingProxyAddress: process.env.EXISTING_PROXY || '', // Set this!
    proxyAdminAddress: process.env.PROXY_ADMIN || '', // For Transparent
    activationDelay: Number(process.env.ACTIVATION_DELAY) || 86400, // 24h default
    multisigAddress: process.env.MULTISIG || deployer.address,
    skipRoleSetup: process.env.SKIP_ROLES === 'true'
  };

  if (!config.existingProxyAddress) {
    throw new Error('❌ EXISTING_PROXY environment variable required');
  }

  console.log(`📋 Configuration:
    Proxy Type: ${config.proxyType}
    Existing Proxy: ${config.existingProxyAddress}
    Proxy Admin: ${config.proxyAdminAddress || 'N/A (UUPS)'}
    Activation Delay: ${config.activationDelay}s
    Governance: ${config.multisigAddress}
  `);

  // Step 1: Deploy ManifestDispatcher
  console.log('\n📡 Step 1: Deploying ManifestDispatcher...');
  
  const DispatcherFactory = await ethers.getContractFactory('ManifestDispatcher');
  const dispatcher = await DispatcherFactory.deploy(
    config.multisigAddress, // admin
    config.activationDelay
  );
  await dispatcher.waitForDeployment();
  
  const dispatcherAddress = await dispatcher.getAddress();
  console.log(`✅ ManifestDispatcher deployed: ${dispatcherAddress}`);

  // Step 2: Configure roles (if not skipped)
  if (!config.skipRoleSetup) {
    console.log('\n🔐 Step 2: Setting up roles...');
    
    const COMMIT_ROLE = await dispatcher.COMMIT_ROLE();
    const APPLY_ROLE = await dispatcher.APPLY_ROLE();
    const EMERGENCY_ROLE = await dispatcher.EMERGENCY_ROLE();
    
    // Grant roles to multisig (governance can redistribute later)
    await dispatcher.grantRole(COMMIT_ROLE, config.multisigAddress);
    await dispatcher.grantRole(APPLY_ROLE, config.multisigAddress);
    await dispatcher.grantRole(EMERGENCY_ROLE, config.multisigAddress);
    
    console.log(`✅ Roles granted to: ${config.multisigAddress}`);
    console.log(`   COMMIT_ROLE: ${COMMIT_ROLE}`);
    console.log(`   APPLY_ROLE: ${APPLY_ROLE}`);
    console.log(`   EMERGENCY_ROLE: ${EMERGENCY_ROLE}`);
  }

  // Step 3: Commit empty root for bootstrap
  console.log('\n🔧 Step 3: Committing empty manifest for bootstrap...');
  
  const emptyRoot = ethers.ZeroHash;
  const currentEpoch = Math.floor(Date.now() / 1000);
  
  await dispatcher.commitRoot(emptyRoot, currentEpoch);
  console.log(`✅ Empty root committed for epoch: ${currentEpoch}`);

  // Step 4: Prepare proxy upgrade instructions
  console.log('\n📋 Step 4: Proxy Upgrade Instructions');
  console.log('=====================================');

  const upgradeInstructions = generateUpgradeInstructions(config, dispatcherAddress);
  console.log(upgradeInstructions);

  // Step 5: Save deployment info
  const deploymentInfo = {
    network: await ethers.provider.getNetwork(),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    config,
    contracts: {
      manifestDispatcher: dispatcherAddress,
      existingProxy: config.existingProxyAddress
    },
    upgradeInstructions,
    nextSteps: [
      '1. Review the upgrade instructions above',
      '2. Execute the proxy upgrade via your ProxyAdmin or upgradeTo()',
      '3. Deploy your facets using scripts/deploy-facets.ts',
      '4. Build and commit your manifest using scripts/build-manifest.ts',
      '5. Apply routes and activate after the delay period'
    ]
  };

  const outputFile = `deployments/proxy-migration-${Date.now()}.json`;
  writeFileSync(outputFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n💾 Migration info saved to: ${outputFile}`);
  console.log('\n🎉 Phase 1 Complete: ManifestDispatcher ready for proxy upgrade!');
  
  return deploymentInfo;
}

function generateUpgradeInstructions(config: MigrationConfig, dispatcherAddress: string): string {
  const { proxyType, existingProxyAddress, proxyAdminAddress } = config;

  switch (proxyType) {
    case 'transparent':
      if (!proxyAdminAddress) {
        throw new Error('ProxyAdmin address required for Transparent proxy');
      }
      return `
🔧 TRANSPARENT PROXY UPGRADE:
===============================

Via ProxyAdmin contract:
========================
ProxyAdmin(${proxyAdminAddress}).upgrade(
    ${existingProxyAddress},  // proxy
    ${dispatcherAddress}      // new implementation
);

Hardhat command:
================
npx hardhat run scripts/upgrade-transparent-proxy.ts --network <your_network>

Environment variables:
======================
PROXY_ADDRESS=${existingProxyAddress}
PROXY_ADMIN=${proxyAdminAddress}
NEW_IMPLEMENTATION=${dispatcherAddress}
`;

    case 'uups':
      return `
🔧 UUPS PROXY UPGRADE:
======================

Direct upgrade call:
====================
IUUPSUpgradeable(${existingProxyAddress}).upgradeTo(${dispatcherAddress});

Hardhat command:
================
npx hardhat run scripts/upgrade-uups-proxy.ts --network <your_network>

Environment variables:
======================
PROXY_ADDRESS=${existingProxyAddress}
NEW_IMPLEMENTATION=${dispatcherAddress}
`;

    case 'beacon':
      return `
🔧 BEACON PROXY UPGRADE:
========================

Via BeaconProxy upgrade:
========================
UpgradeableBeacon(beaconAddress).upgradeTo(${dispatcherAddress});

Note: This will upgrade ALL beacon proxies using this beacon!

Hardhat command:
================
npx hardhat run scripts/upgrade-beacon-proxy.ts --network <your_network>

Environment variables:
======================
BEACON_ADDRESS=<your_beacon_address>
NEW_IMPLEMENTATION=${dispatcherAddress}
`;

    default:
      throw new Error(`Unsupported proxy type: ${proxyType}`);
  }
}

// Handle direct execution
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exitCode = 1;
  });
}

export { main as runProxyMigration, MigrationConfig };

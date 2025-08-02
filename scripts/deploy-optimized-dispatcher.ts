/**
 * Production Deployment Script for OptimizedManifestDispatcher
 *
 * Implements the enhanced patterns:
 * 1. Preflight + Commit gas optimization
 * 2. Safe governance with timelock
 * 3. MEV-resistant execution queue
 * 4. Diamond ecosystem compatibility
 */

import fs from 'fs';
import { ethers } from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import path from 'path';

export async function main(hre: HardhatRuntimeEnvironment) {
  console.log(
    '🚀 Deploying OptimizedManifestDispatcher with enhanced patterns...'
  );

  const { network } = hre;
  const [deployer] = await ethers.getSigners();

  console.log(`📡 Network: ${network.name}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(
    `💰 Balance: ${ethers.formatEther(
      await deployer.provider.getBalance(deployer.address)
    )} ETH`
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  const config = {
    governance: deployer.address, // Replace with Safe address in production
    guardian: deployer.address, // Replace with guardian address in production
    minDelay: 24 * 60 * 60, // 24 hours timelock
  };

  console.log('\n📋 Deployment Configuration:');
  console.log(`   Governance: ${config.governance}`);
  console.log(`   Guardian: ${config.guardian}`);
  console.log(
    `   Min Delay: ${config.minDelay} seconds (${config.minDelay / 3600} hours)`
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPLOY OPTIMIZED DISPATCHER
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n🔧 Deploying OptimizedManifestDispatcher...');

  const OptimizedDispatcher = await ethers.getContractFactory(
    'OptimizedManifestDispatcher'
  );

  const optimizedDispatcher = await OptimizedDispatcher.deploy(
    config.governance,
    config.guardian,
    config.minDelay
  );
  await optimizedDispatcher.waitForDeployment();

  const dispatcherAddress = await optimizedDispatcher.getAddress();
  console.log(
    `✅ OptimizedManifestDispatcher deployed to: ${dispatcherAddress}`
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFY DEPLOYMENT
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n🔍 Verifying deployment...');

  const governance = await optimizedDispatcher.governance();
  const guardian = await optimizedDispatcher.guardian();
  const minDelay = await optimizedDispatcher.minDelay();
  const routeCount = await optimizedDispatcher.getRouteCount();
  const manifestVersion = await optimizedDispatcher.manifestVersion();

  console.log('   Governance:', governance);
  console.log('   Guardian:', guardian);
  console.log('   Min Delay:', minDelay.toString(), 'seconds');
  console.log('   Route Count:', routeCount.toString());
  console.log('   Manifest Version:', manifestVersion.toString());

  // Verify roles
  const DEFAULT_ADMIN_ROLE = await optimizedDispatcher.DEFAULT_ADMIN_ROLE();
  const COMMIT_ROLE = await optimizedDispatcher.COMMIT_ROLE();
  const APPLY_ROLE = await optimizedDispatcher.APPLY_ROLE();
  const EMERGENCY_ROLE = await optimizedDispatcher.EMERGENCY_ROLE();
  const EXECUTOR_ROLE = await optimizedDispatcher.EXECUTOR_ROLE();

  console.log('\n🔐 Role Verification:');
  console.log(
    `   Admin Role (${governance}):`,
    await optimizedDispatcher.hasRole(DEFAULT_ADMIN_ROLE, governance)
  );
  console.log(
    `   Commit Role (${governance}):`,
    await optimizedDispatcher.hasRole(COMMIT_ROLE, governance)
  );
  console.log(
    `   Apply Role (${governance}):`,
    await optimizedDispatcher.hasRole(APPLY_ROLE, governance)
  );
  console.log(
    `   Emergency Role (${guardian}):`,
    await optimizedDispatcher.hasRole(EMERGENCY_ROLE, guardian)
  );
  console.log(
    `   Executor Role (${governance}):`,
    await optimizedDispatcher.hasRole(EXECUTOR_ROLE, governance)
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST DIAMOND LOUPE INTERFACE
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n💎 Testing Diamond Loupe Interface...');

  try {
    const facetAddresses = await optimizedDispatcher.facetAddresses();
    const facets = await optimizedDispatcher.facets();

    console.log(`   Facet Addresses: ${facetAddresses.length}`);
    console.log(`   Facets: ${facets.length}`);

    console.log('✅ Diamond loupe interface working');
  } catch (error) {
    console.log(`❌ Diamond loupe interface error: ${error}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE DEPLOYMENT INFO
  // ═══════════════════════════════════════════════════════════════════════════

  const deploymentInfo = {
    network: network.name,
    contractName: 'OptimizedManifestDispatcher',
    address: dispatcherAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    transactionHash: optimizedDispatcher.deploymentTransaction()?.hash,
    blockNumber: optimizedDispatcher.deploymentTransaction()?.blockNumber,
    constructorArgs: [config.governance, config.guardian, config.minDelay],
    configuration: config,
    roles: {
      DEFAULT_ADMIN_ROLE: DEFAULT_ADMIN_ROLE,
      COMMIT_ROLE: COMMIT_ROLE,
      APPLY_ROLE: APPLY_ROLE,
      EMERGENCY_ROLE: EMERGENCY_ROLE,
      EXECUTOR_ROLE: EXECUTOR_ROLE,
    },
    features: [
      'Gas Optimized Preflight + Commit Pattern',
      'Enhanced Governance with Timelock',
      'MEV-Resistant Execution Queue',
      'Diamond Ecosystem Compatibility',
      'Production Security Hardening',
    ],
  };

  // Save to deployments directory
  const deploymentsDir = path.join(
    __dirname,
    '..',
    'deployments',
    network.name
  );
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, 'optimized-dispatcher.json');
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPLOYMENT SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  console.log('\n🎯 DEPLOYMENT COMPLETE!');
  console.log('='.repeat(60));
  console.log(`📍 Contract Address: ${dispatcherAddress}`);
  console.log(`🌐 Network: ${network.name}`);
  console.log(`⛽ Gas Optimizations: Preflight + Commit Pattern`);
  console.log(`🔒 Security: Timelock + Guardian + Access Control`);
  console.log(`🛡️ MEV Protection: Execution Queue + Nonce Ordering`);
  console.log(`💎 Ecosystem: Diamond Loupe Interface`);
  console.log('='.repeat(60));

  console.log('\n📋 Next Steps:');
  console.log('1. Update governance to Safe/multisig address');
  console.log('2. Set up guardian with hardware wallet');
  console.log('3. Test preflight + commit workflow');
  console.log('4. Configure execution queue for operations');
  console.log('5. Verify diamond tooling compatibility');

  return {
    dispatcher: optimizedDispatcher,
    address: dispatcherAddress,
    config: deploymentInfo,
  };
}

if (require.main === module) {
  main(require('hardhat'))
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

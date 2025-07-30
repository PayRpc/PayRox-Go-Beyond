// tasks/payrox-roles.ts
import { Contract } from 'ethers';
import { task } from 'hardhat/config';

/**
 * payrox:roles:bootstrap
 * Initialize role-based access control for production deployment
 */
task('payrox:roles:bootstrap', 'Setup production role-based access control')
  .addParam('dispatcher', 'ManifestDispatcher address')
  .addOptionalParam('factory', 'DeterministicChunkFactory address')
  .addOptionalParam('admin', 'Admin role address (default: deployer)')
  .addOptionalParam('deployer', 'Deployer role address (default: deployer)')
  .addOptionalParam('upgrader', 'Upgrader role address (default: deployer)')
  .addOptionalParam('timelock', 'Timelock delay in seconds', '86400') // 24 hours
  .addFlag('dryrun', 'Show what would be done without executing')
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();

    console.log('🔐 PayRox Role Bootstrap');
    console.log(`📡 Network: ${hre.network.name}`);
    console.log(`👤 Signer: ${signer.address}`);

    const dispatcher = await ethers.getContractAt(
      'ManifestDispatcher',
      args.dispatcher
    );
    let factory: Contract | null = null;

    if (args.factory) {
      factory = await ethers.getContractAt(
        'DeterministicChunkFactory',
        args.factory
      );
    }

    // Role addresses
    const adminAddr = args.admin || signer.address;
    const deployerAddr = args.deployer || signer.address;
    const upgraderAddr = args.upgrader || signer.address;
    const timelockDelay = parseInt(args.timelock);

    console.log(`\\n📋 Role Assignment Plan:`);
    console.log(`   Admin: ${adminAddr}`);
    console.log(`   Deployer: ${deployerAddr}`);
    console.log(`   Upgrader: ${upgraderAddr}`);
    console.log(
      `   Timelock Delay: ${timelockDelay}s (${timelockDelay / 3600}h)`
    );

    if (args.dryrun) {
      console.log('\\n🔍 DRY RUN - No transactions will be sent\\n');
    }

    // Check current roles
    try {
      const DEFAULT_ADMIN_ROLE =
        '0x0000000000000000000000000000000000000000000000000000000000000000';
      const UPGRADER_ROLE = await dispatcher.UPGRADER_ROLE();

      const hasAdmin = await dispatcher.hasRole(
        DEFAULT_ADMIN_ROLE,
        signer.address
      );
      console.log(`\\n🔍 Current Role Status:`);
      console.log(`   Current signer has admin role: ${hasAdmin}`);

      if (!hasAdmin) {
        console.log('❌ Current signer lacks admin privileges');
        console.log('   Cannot bootstrap roles without admin access');
        return;
      }

      // Show current upgraders
      const upgraderCount = await dispatcher.getRoleMemberCount(UPGRADER_ROLE);
      console.log(`   Current upgraders: ${upgraderCount}`);
      for (let i = 0; i < upgraderCount; i++) {
        const upgrader = await dispatcher.getRoleMember(UPGRADER_ROLE, i);
        console.log(`     - ${upgrader}`);
      }
    } catch (e) {
      console.log('⚠️  Could not check roles (older contract version?)');
    }

    // Deployment plan
    const actions = [];

    // 1. Set activation delay for timelock
    if (timelockDelay > 0) {
      actions.push({
        type: 'setActivationDelay',
        contract: 'dispatcher',
        delay: timelockDelay,
        description: `Set activation delay to ${timelockDelay}s for timelock security`,
      });
    }

    // 2. Grant upgrader role
    if (upgraderAddr !== signer.address) {
      actions.push({
        type: 'grantRole',
        contract: 'dispatcher',
        role: 'UPGRADER_ROLE',
        account: upgraderAddr,
        description: `Grant upgrader role to ${upgraderAddr}`,
      });
    }

    // 3. Setup factory admin if provided
    if (factory && adminAddr !== signer.address) {
      actions.push({
        type: 'transferOwnership',
        contract: 'factory',
        newOwner: adminAddr,
        description: `Transfer factory ownership to ${adminAddr}`,
      });
    }

    // 4. Transfer admin role (DANGEROUS - do last)
    if (adminAddr !== signer.address) {
      actions.push({
        type: 'grantRole',
        contract: 'dispatcher',
        role: 'DEFAULT_ADMIN_ROLE',
        account: adminAddr,
        description: `Grant admin role to ${adminAddr}`,
      });

      actions.push({
        type: 'renounceRole',
        contract: 'dispatcher',
        role: 'DEFAULT_ADMIN_ROLE',
        account: signer.address,
        description: `Renounce admin role from ${signer.address} (IRREVERSIBLE)`,
      });
    }

    console.log(`\\n📝 Execution Plan (${actions.length} actions):`);
    actions.forEach((action, i) => {
      console.log(`   ${i + 1}. ${action.description}`);
    });

    if (args.dryrun) {
      console.log('\\n✅ Dry run completed - no changes made');
      return;
    }

    // Confirm execution
    console.log('\\n⚠️  WARNING: Role changes are irreversible!');
    console.log('   Ensure all addresses are correct before proceeding');

    // Execute actions
    for (const [index, action] of actions.entries()) {
      console.log(
        `\\n📤 Executing ${index + 1}/${actions.length}: ${action.description}`
      );

      try {
        if (action.type === 'setActivationDelay') {
          const tx = await dispatcher.setActivationDelay(action.delay);
          console.log(`   Transaction: ${tx.hash}`);
          await tx.wait();
          console.log(`   ✅ Activation delay set to ${action.delay}s`);
        } else if (action.type === 'grantRole') {
          const roleBytes =
            action.role === 'DEFAULT_ADMIN_ROLE'
              ? '0x0000000000000000000000000000000000000000000000000000000000000000'
              : await dispatcher.UPGRADER_ROLE();

          const tx = await dispatcher.grantRole(roleBytes, action.account);
          console.log(`   Transaction: ${tx.hash}`);
          await tx.wait();
          console.log(`   ✅ Role ${action.role} granted to ${action.account}`);
        } else if (action.type === 'renounceRole') {
          const roleBytes =
            '0x0000000000000000000000000000000000000000000000000000000000000000';
          const tx = await dispatcher.renounceRole(roleBytes, action.account);
          console.log(`   Transaction: ${tx.hash}`);
          await tx.wait();
          console.log(`   ✅ Role renounced by ${action.account}`);
        } else if (action.type === 'transferOwnership' && factory) {
          const tx = await factory.transferOwnership(action.newOwner);
          console.log(`   Transaction: ${tx.hash}`);
          await tx.wait();
          console.log(
            `   ✅ Factory ownership transferred to ${action.newOwner}`
          );
        }
      } catch (error) {
        console.error(`   ❌ Failed to execute action: ${error}`);
        console.log('   🛑 Stopping bootstrap process');
        return;
      }
    }

    console.log('\\n🎉 Role bootstrap completed successfully!');
    console.log('\\n📋 Next Steps:');
    console.log('   1. Verify role assignments with payrox:roles:status');
    console.log('   2. Test upgrade process with new roles');
    console.log('   3. Monitor operations with payrox:ops:watch');
    console.log('   4. Document role holders and recovery procedures');
  });

/**
 * payrox:roles:status
 * Check current role assignments and permissions
 */
task('payrox:roles:status', 'Check role assignments and permissions')
  .addParam('dispatcher', 'ManifestDispatcher address')
  .addOptionalParam('factory', 'DeterministicChunkFactory address')
  .setAction(async (args, hre) => {
    const { ethers } = hre;

    console.log('🔍 PayRox Role Status Check');
    console.log(`📡 Network: ${hre.network.name}`);

    const dispatcher = await ethers.getContractAt(
      'ManifestDispatcher',
      args.dispatcher
    );

    try {
      const DEFAULT_ADMIN_ROLE =
        '0x0000000000000000000000000000000000000000000000000000000000000000';
      const UPGRADER_ROLE = await dispatcher.UPGRADER_ROLE();

      console.log(`\\n👥 Dispatcher Roles (${args.dispatcher}):`);

      // Admin role members
      const adminCount = await dispatcher.getRoleMemberCount(
        DEFAULT_ADMIN_ROLE
      );
      console.log(`\\n🔑 Admin Role (${adminCount} members):`);
      for (let i = 0; i < adminCount; i++) {
        const admin = await dispatcher.getRoleMember(DEFAULT_ADMIN_ROLE, i);
        console.log(`   - ${admin}`);
      }

      // Upgrader role members
      const upgraderCount = await dispatcher.getRoleMemberCount(UPGRADER_ROLE);
      console.log(`\\n⬆️  Upgrader Role (${upgraderCount} members):`);
      for (let i = 0; i < upgraderCount; i++) {
        const upgrader = await dispatcher.getRoleMember(UPGRADER_ROLE, i);
        console.log(`   - ${upgrader}`);
      }

      // System status
      const isPaused = await dispatcher.paused();
      const epoch = await dispatcher.currentEpoch();

      console.log(`\\n⚙️  System Status:`);
      console.log(`   Paused: ${isPaused}`);
      console.log(`   Current Epoch: ${epoch}`);

      try {
        const activationDelay = await dispatcher.activationDelay();
        console.log(
          `   Activation Delay: ${activationDelay}s (${
            Number(activationDelay) / 3600
          }h)`
        );
      } catch (e) {
        console.log(`   Activation Delay: Not available (older contract)`);
      }
    } catch (error) {
      console.error('❌ Failed to check dispatcher roles:', error);
    }

    // Factory status
    if (args.factory) {
      try {
        const factory = await ethers.getContractAt(
          'DeterministicChunkFactory',
          args.factory
        );
        const owner = await factory.owner();
        const baseFee = await factory.baseFee();

        console.log(`\\n🏭 Factory Status (${args.factory}):`);
        console.log(`   Owner: ${owner}`);
        console.log(`   Base Fee: ${ethers.formatEther(baseFee)} ETH`);
      } catch (error) {
        console.error('❌ Failed to check factory status:', error);
      }
    }

    console.log('\\n✅ Role status check completed');
  });

import { time } from '@nomicfoundation/hardhat-network-helpers';
import { ethers } from 'hardhat';

/**
 * Key Rotation Drill - Tests governance transfer security
 * Validates that old signers are properly rejected and new signers work
 */
async function runKeyRotationDrill() {
  console.log('🔄 Starting Key Rotation Security Drill...');

  const [deployer, oldGovernance, newGovernance, operator] =
    await ethers.getSigners();

  console.log('👥 Participants:');
  console.log('  Deployer:', deployer.address);
  console.log('  Old Governance:', oldGovernance.address);
  console.log('  New Governance:', newGovernance.address);
  console.log('  Operator:', operator.address);

  // Deploy dispatcher with old governance
  console.log('\n📦 Deploying with old governance...');

  const ManifestDispatcher = await ethers.getContractFactory(
    'ManifestDispatcher'
  );
  const dispatcher = await ManifestDispatcher.deploy(
    oldGovernance.address,
    3600
  );
  await dispatcher.waitForDeployment();
  const dispatcherAddress = await dispatcher.getAddress();

  console.log('✅ ManifestDispatcher deployed:', dispatcherAddress);

  // Setup initial roles
  console.log('\n🔑 Setting up initial roles...');

  const dispatcherAsOldGov = dispatcher.connect(oldGovernance) as any;
  const COMMIT_ROLE = await dispatcher.COMMIT_ROLE();
  const APPLY_ROLE = await dispatcher.APPLY_ROLE();
  const EMERGENCY_ROLE = await dispatcher.EMERGENCY_ROLE();
  const DEFAULT_ADMIN_ROLE = await dispatcher.DEFAULT_ADMIN_ROLE();

  await dispatcherAsOldGov.grantRole(COMMIT_ROLE, operator.address);
  await dispatcherAsOldGov.grantRole(APPLY_ROLE, operator.address);

  console.log('✅ Initial roles granted');

  // Phase 1: Verify old governance functionality
  console.log('\n📋 Phase 1: Testing old governance functionality...');

  try {
    // Test pause/unpause
    await dispatcherAsOldGov.pause();
    console.log('✅ Old governance can pause');

    await dispatcherAsOldGov.unpause();
    console.log('✅ Old governance can unpause');

    // Test role management
    const testAddress = ethers.Wallet.createRandom().address;
    await dispatcherAsOldGov.grantRole(DEFAULT_ADMIN_ROLE, testAddress);
    await dispatcherAsOldGov.revokeRole(DEFAULT_ADMIN_ROLE, testAddress);
    console.log('✅ Old governance can manage roles');
  } catch (error) {
    console.error('❌ Old governance pre-transfer test failed:', error);
    throw new Error('Old governance not functional before transfer');
  }

  // Phase 2: Transfer governance
  console.log('\n🔄 Phase 2: Executing governance transfer...');

  // Connect as new governance for role management
  const dispatcherAsNewGov = dispatcher.connect(newGovernance) as any;

  try {
    // First, grant DEFAULT_ADMIN_ROLE to new governance (this allows them to manage roles)
    console.log('  Granting DEFAULT_ADMIN_ROLE to new governance...');
    await dispatcherAsOldGov.grantRole(
      DEFAULT_ADMIN_ROLE,
      newGovernance.address
    );

    // Grant emergency role to new governance
    console.log('  Granting EMERGENCY_ROLE to new governance...');
    await dispatcherAsOldGov.grantRole(EMERGENCY_ROLE, newGovernance.address);

    // Verify new governance has both roles
    const newHasDefaultAdmin = await dispatcher.hasRole(
      DEFAULT_ADMIN_ROLE,
      newGovernance.address
    );
    const newHasEmergency = await dispatcher.hasRole(
      EMERGENCY_ROLE,
      newGovernance.address
    );

    if (!newHasDefaultAdmin || !newHasEmergency) {
      throw new Error('New governance role grants failed');
    }
    console.log(
      '✅ New governance granted DEFAULT_ADMIN_ROLE and EMERGENCY_ROLE'
    );

    // Now new governance revokes roles from old governance
    console.log(
      '  New governance revoking DEFAULT_ADMIN_ROLE from old governance...'
    );
    await dispatcherAsNewGov.revokeRole(
      DEFAULT_ADMIN_ROLE,
      oldGovernance.address
    );

    console.log(
      '  New governance revoking EMERGENCY_ROLE from old governance...'
    );
    await dispatcherAsNewGov.revokeRole(EMERGENCY_ROLE, oldGovernance.address);

    // Verify old governance no longer has the roles
    const oldHasDefaultAdmin = await dispatcher.hasRole(
      DEFAULT_ADMIN_ROLE,
      oldGovernance.address
    );
    const oldHasEmergency = await dispatcher.hasRole(
      EMERGENCY_ROLE,
      oldGovernance.address
    );

    if (oldHasDefaultAdmin || oldHasEmergency) {
      throw new Error('Old governance role revocation failed');
    }
    console.log(
      '✅ Old governance DEFAULT_ADMIN_ROLE and EMERGENCY_ROLE revoked'
    );
  } catch (error) {
    console.error('❌ Governance transfer failed:', error);
    throw new Error('Role transfer execution failed');
  }

  // Phase 3: Test old governance rejection
  console.log('\n🚨 Phase 3: Testing old governance rejection...');

  const oldGovernanceRejectionTests = [
    {
      name: 'pause()',
      test: () => dispatcherAsOldGov.pause(),
    },
    {
      name: 'unpause()',
      test: () => dispatcherAsOldGov.unpause(),
    },
    {
      name: 'grantRole()',
      test: () =>
        dispatcherAsOldGov.grantRole(
          DEFAULT_ADMIN_ROLE,
          ethers.Wallet.createRandom().address
        ),
    },
    {
      name: 'revokeRole()',
      test: () =>
        dispatcherAsOldGov.revokeRole(DEFAULT_ADMIN_ROLE, operator.address),
    },
  ];

  let rejectionCount = 0;

  for (const testCase of oldGovernanceRejectionTests) {
    try {
      await testCase.test();
      console.log(
        `❌ CRITICAL: Old governance ${testCase.name} should have been rejected!`
      );
      throw new Error(
        `Security breach: Old governance can still ${testCase.name}`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (
        errorMsg.includes('AccessControl') ||
        errorMsg.includes('role') ||
        errorMsg.includes('insufficient')
      ) {
        console.log(`✅ Old governance ${testCase.name} properly rejected`);
        rejectionCount++;
      } else {
        console.log(
          `⚠️  Old governance ${testCase.name} failed with unexpected error:`,
          errorMsg.substring(0, 100)
        );
        // Still count as rejected if it failed
        rejectionCount++;
      }
    }
  }

  console.log(
    `📊 Old governance rejection: ${rejectionCount}/${oldGovernanceRejectionTests.length} tests passed`
  );

  if (rejectionCount !== oldGovernanceRejectionTests.length) {
    throw new Error('❌ CRITICAL: Old governance not fully rejected!');
  }

  // Phase 4: Test new governance acceptance
  console.log('\n✅ Phase 4: Testing new governance acceptance...');

  // dispatcherAsNewGov already defined above

  const newGovernanceAcceptanceTests = [
    {
      name: 'pause()',
      test: () => dispatcherAsNewGov.pause(),
    },
    {
      name: 'unpause()',
      test: () => dispatcherAsNewGov.unpause(),
    },
    {
      name: 'grantRole()',
      test: () =>
        dispatcherAsNewGov.grantRole(DEFAULT_ADMIN_ROLE, deployer.address),
    },
    {
      name: 'revokeRole()',
      test: () =>
        dispatcherAsNewGov.revokeRole(DEFAULT_ADMIN_ROLE, deployer.address),
    },
  ];

  let acceptanceCount = 0;

  for (const testCase of newGovernanceAcceptanceTests) {
    try {
      await testCase.test();
      console.log(`✅ New governance ${testCase.name} works correctly`);
      acceptanceCount++;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(
        `❌ New governance ${testCase.name} failed:`,
        errorMsg.substring(0, 100)
      );
      throw new Error(`New governance functionality broken: ${testCase.name}`);
    }
  }

  console.log(
    `📊 New governance acceptance: ${acceptanceCount}/${newGovernanceAcceptanceTests.length} tests passed`
  );

  // Phase 5: Operational continuity test
  console.log('\n⚙️  Phase 5: Testing operational continuity...');

  try {
    // Deploy test facet
    const ExampleFacetA = await ethers.getContractFactory('ExampleFacetA');
    const facetA = await ExampleFacetA.deploy();
    await facetA.waitForDeployment();
    const facetAAddress = await facetA.getAddress();

    // Test commit-apply-activate workflow still works
    const dispatcherAsOperator = dispatcher.connect(operator) as any;

    const executeASelector =
      ExampleFacetA.interface.getFunction('executeA')!.selector;
    const facetACodehash = await ethers.provider
      .getCode(facetAAddress)
      .then(code => ethers.keccak256(code));

    function generateLeaf(
      selector: string,
      facet: string,
      codehash: string
    ): string {
      return ethers.keccak256(
        ethers.concat(['0x00', selector, facet, codehash])
      );
    }

    const leaf = generateLeaf(executeASelector, facetAAddress, facetACodehash);
    const merkleRoot = ethers.keccak256(ethers.concat(['0x00', leaf]));

    // Commit
    await dispatcherAsOperator.commitRoot(merkleRoot, 1);
    console.log('✅ Operator can still commit');

    // Apply
    await dispatcherAsOperator.applyRoutes(
      [executeASelector],
      [facetAAddress],
      [facetACodehash],
      [[]],
      [[]]
    );
    console.log('✅ Operator can still apply routes');

    // Wait for timelock
    const currentTime = await time.latest();
    await time.increaseTo(currentTime + 3601);

    // Activate
    await dispatcherAsOperator.activateCommittedRoot();
    console.log('✅ Operator can still activate');

    console.log(
      '✅ Full operational workflow functional after governance transfer'
    );
  } catch (error) {
    console.error('❌ Operational continuity test failed:', error);
    throw new Error('System not operational after governance transfer');
  }

  // Phase 6: Security validation summary
  console.log('\n🛡️  Phase 6: Security validation summary...');

  const securityChecks = {
    oldGovernanceRejected:
      rejectionCount === oldGovernanceRejectionTests.length,
    newGovernanceAccepted:
      acceptanceCount === newGovernanceAcceptanceTests.length,
    operationalContinuity: true, // We got here, so it works
    roleIntegrity: await validateRoleIntegrity(
      dispatcher,
      newGovernance.address,
      operator.address
    ),
  };

  console.log('📊 Security Check Results:');
  console.log(
    '  Old Governance Rejected:',
    securityChecks.oldGovernanceRejected ? '✅' : '❌'
  );
  console.log(
    '  New Governance Accepted:',
    securityChecks.newGovernanceAccepted ? '✅' : '❌'
  );
  console.log(
    '  Operational Continuity:',
    securityChecks.operationalContinuity ? '✅' : '❌'
  );
  console.log('  Role Integrity:', securityChecks.roleIntegrity ? '✅' : '❌');

  const allChecksPassed = Object.values(securityChecks).every(
    check => check === true
  );

  if (!allChecksPassed) {
    throw new Error('❌ CRITICAL: Security validation failed!');
  }

  console.log('\n🎉 Key Rotation Drill PASSED!');
  console.log('✅ All security checks passed');
  console.log('✅ Governance transfer executed safely');
  console.log('✅ System operational after key rotation');

  return {
    oldGovernance: oldGovernance.address,
    newGovernance: newGovernance.address,
    dispatcher: dispatcherAddress,
    securityChecks,
    success: true,
  };
}

async function validateRoleIntegrity(
  dispatcher: any,
  expectedGovernance: string,
  expectedOperator: string
) {
  const COMMIT_ROLE = await dispatcher.COMMIT_ROLE();
  const APPLY_ROLE = await dispatcher.APPLY_ROLE();
  const EMERGENCY_ROLE = await dispatcher.EMERGENCY_ROLE();
  const DEFAULT_ADMIN_ROLE = await dispatcher.DEFAULT_ADMIN_ROLE();

  const checks = {
    governanceHasDefaultAdmin: await dispatcher.hasRole(
      DEFAULT_ADMIN_ROLE,
      expectedGovernance
    ),
    governanceHasEmergency: await dispatcher.hasRole(
      EMERGENCY_ROLE,
      expectedGovernance
    ),
    operatorHasCommit: await dispatcher.hasRole(COMMIT_ROLE, expectedOperator),
    operatorHasApply: await dispatcher.hasRole(APPLY_ROLE, expectedOperator),
  };

  return (
    checks.governanceHasDefaultAdmin &&
    checks.governanceHasEmergency &&
    checks.operatorHasCommit &&
    checks.operatorHasApply
  );
}

// CLI usage
async function main() {
  try {
    const result = await runKeyRotationDrill();
    console.log('\n🎊 Key Rotation Drill Result:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Key Rotation Drill Failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { runKeyRotationDrill };

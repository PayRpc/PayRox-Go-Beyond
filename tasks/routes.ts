import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

/**
 * Enhanced Route Application Tasks
 * Provides convenient task interface for the enhanced route application system
 */

task('routes:apply', 'Apply manifest routes to dispatcher with enhanced features')
  .addFlag('dryRun', 'Preview changes without applying them')
  .addFlag('verboseLog', 'Enable detailed logging')
  .addFlag('force', 'Skip confirmation prompts')
  .addOptionalParam('batchSize', 'Number of routes per batch', '3')
  .addOptionalParam('maxRetries', 'Maximum retry attempts', '3')
  .addOptionalParam('timeout', 'Operation timeout in milliseconds', '300000')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { EnhancedRouteApplicator } = await import('../scripts/apply-all-routes.js');
    
    // Override process.argv to simulate CLI arguments
    const originalArgv = process.argv;
    const args = ['node', 'script'];
    
    if (taskArgs.dryRun) args.push('--dry-run');
    if (taskArgs.verboseLog) args.push('--verbose');
    if (taskArgs.force) args.push('--force');
    if (taskArgs.batchSize !== '3') args.push('--batch-size', taskArgs.batchSize);
    if (taskArgs.maxRetries !== '3') args.push('--max-retries', taskArgs.maxRetries);
    if (taskArgs.timeout !== '300000') args.push('--timeout', taskArgs.timeout);
    
    process.argv = args;
    
    try {
      const applicator = new EnhancedRouteApplicator();
      await applicator.execute();
    } catch (error) {
      console.error('❌ Route application failed:', error);
      process.exit(1);
    } finally {
      process.argv = originalArgv;
    }
  });

task('routes:dry', 'Preview route application without applying changes')
  .addFlag('verboseLog', 'Enable detailed logging')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    await hre.run('routes:apply', { 
      dryRun: true, 
      verboseLog: taskArgs.verboseLog 
    });
  });

task('routes:help', 'Show enhanced route application help')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    console.log(`
🔗 PayRox Enhanced Route Application Tasks

TASKS:
  routes:apply       Apply manifest routes with full configuration options
  routes:dry         Preview changes without applying (dry run)
  routes:help        Show this help message

EXAMPLES:
  npx hardhat routes:apply --dry-run --verbose
  npx hardhat routes:apply --batch-size 5 --max-retries 5
  npx hardhat routes:apply --force --network sepolia
  npx hardhat routes:dry --verbose

OPTIONS:
  --dry-run          Preview changes without applying them
  --verboseLog       Enable detailed logging
  --force            Skip confirmation prompts
  --batch-size <n>   Number of routes per batch (default: 3)
  --max-retries <n>  Maximum retry attempts (default: 3)
  --timeout <ms>     Operation timeout in milliseconds (default: 300000)
  --network <name>   Target network for deployment

WORKFLOW INTEGRATION:
  1. npx hardhat routes:dry --verboseLog     # Preview
  2. npx hardhat routes:apply --verboseLog   # Apply
  3. npx hardhat routes:verify            # Verify (if available)

For detailed documentation, see: docs/ROUTE_APPLICATION_GUIDE.md
`);
  });

// Add to existing payrox namespace
task('payrox:routes:apply', 'Apply routes with PayRox integration')
  .addFlag('dryRun', 'Preview changes without applying them')
  .addFlag('verboseLog', 'Enable detailed logging')
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    console.log('🎯 PayRox Route Application');
    await hre.run('routes:apply', taskArgs);
  });

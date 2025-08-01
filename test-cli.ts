/**
 * Test Cross-Chain CLI
 */

import { createCrossChainCLI } from './cli/src/crosschain-optimized';

async function testCLI() {
  console.log('🧪 Testing Cross-Chain CLI Commands');
  console.log('===================================\n');

  const cli = createCrossChainCLI();

  // Test salt generation command
  process.argv = [
    'node',
    'test-cli.js',
    'generate-salt',
    '--content',
    'test-content-for-cli',
    '--deployer',
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  ];

  try {
    await cli.parseAsync();
    console.log('✅ CLI test completed successfully');
  } catch (error) {
    console.error('❌ CLI test failed:', error);
  }
}

testCLI().catch(console.error);

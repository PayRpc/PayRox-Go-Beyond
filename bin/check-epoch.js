#!/usr/bin/env node

/**
 * CLI wrapper for check-epoch utility
 * Provides direct CLI access without needing hardhat run
 */

const { spawn } = require('child_process');

// Get command line arguments (skip node and script name)
const args = process.argv.slice(2);

// Construct the hardhat command
const hardhatArgs = ['run', 'scripts/check-epoch.ts'];

// Add network if specified
const networkIndex = args.findIndex(arg => arg === '--network');
if (networkIndex !== -1 && networkIndex + 1 < args.length) {
  hardhatArgs.push('--network', args[networkIndex + 1]);
  // Remove network args from args to pass to script
  args.splice(networkIndex, 2);
}

// Add remaining args after --
if (args.length > 0) {
  hardhatArgs.push('--', ...args);
}

// Execute hardhat command
const child = spawn('npx', ['hardhat', ...hardhatArgs], {
  stdio: 'inherit',
  shell: true,
});

child.on('close', code => {
  process.exit(code);
});

child.on('error', error => {
  console.error('Failed to start subprocess:', error);
  process.exit(1);
});

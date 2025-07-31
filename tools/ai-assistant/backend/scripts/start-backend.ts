#!/usr/bin/env tsx

import { spawn } from 'child_process';
import { join } from 'path';

console.log('🚀 Starting PayRox AI Assistant Backend...');

const backendPath = join(__dirname, '..');
const serverProcess = spawn('npm', ['run', 'dev'], {
  cwd: backendPath,
  stdio: 'inherit',
  shell: true,
});

serverProcess.on('error', error => {
  console.error('❌ Failed to start backend:', error.message);
  process.exit(1);
});

serverProcess.on('close', code => {
  console.log(`🛑 Backend process exited with code ${code}`);
  process.exit(code || 0);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down backend...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down backend...');
  serverProcess.kill('SIGTERM');
});

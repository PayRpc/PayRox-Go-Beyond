#!/usr/bin/env npx ts-node

/**
 * PayRox AI Integration Demo
 * 
 * Quick demo to test the enhanced CLI with AI features
 */

import { enhancedCLI } from './src/enhanced-cli-menu';

console.log('🚀 Starting PayRox AI Integration Demo...');
console.log('   This demonstrates the enhanced CLI with AI Assistant features');
console.log('   Use --ai flag to enable AI features in the interactive menu');
console.log();

// Start the enhanced CLI with AI enabled
process.argv = ['node', 'demo', 'start', '--ai', '--network', 'localhost'];

// The enhanced CLI will handle the rest

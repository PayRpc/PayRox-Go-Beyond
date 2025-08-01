#!/usr/bin/env node

// Test CLI interaction for PayRox Go Beyond
// This simulates the CLI menu navigation to test the complete deployment

console.log('🧪 Testing PayRox CLI Complete System Deployment');
console.log('===============================================');

// Simulate user pressing 8 (Utils) then 1 (Deploy complete system) then y (confirm)
const testInputs = ['8', '1', 'y'];
let inputIndex = 0;

// Mock readline to simulate user input
const readline = require('readline');
const originalCreateInterface = readline.createInterface;

readline.createInterface = function(options) {
  const rl = originalCreateInterface(options);
  const originalQuestion = rl.question;
  
  rl.question = function(query, callback) {
    console.log(query);
    
    // Provide automated responses
    const response = testInputs[inputIndex] || '0'; // Default to exit
    inputIndex++;
    
    console.log(`🤖 Automated response: ${response}`);
    callback(response);
  };
  
  return rl;
};

// Run the CLI
require('./src/index.ts');

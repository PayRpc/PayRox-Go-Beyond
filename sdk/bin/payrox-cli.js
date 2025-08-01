#!/usr/bin/env node

/**
 * PayRox SDK CLI Tool
 * 
 * Command-line interface for PayRox SDK operations
 */

const { PayRoxClient } = require('../dist/client');
const { Utils } = require('../dist/utils');
const { NETWORKS } = require('../dist/config');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// CLI Colors
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function showHelp() {
  console.log(`
${colors.bright}PayRox SDK CLI Tool${colors.reset}
${colors.cyan}==================${colors.reset}

Usage: payrox-cli <command> [options]

${colors.bright}Commands:${colors.reset}

  ${colors.green}status${colors.reset} [network]              Check PayRox system status
  ${colors.green}deploy${colors.reset} <bytecode> [args...]   Deploy a contract
  ${colors.green}address${colors.reset} <bytecode> [args...]  Calculate deployment address
  ${colors.green}verify${colors.reset} <address> <bytecode>   Verify deployed contract
  ${colors.green}balance${colors.reset} [address]             Check ETH balance
  ${colors.green}fee${colors.reset}                          Show deployment fee
  ${colors.green}networks${colors.reset}                     List available networks

${colors.bright}Options:${colors.reset}

  --network, -n <name>      Network to use (default: localhost)
  --private-key, -k <key>   Private key for transactions
  --rpc <url>              Custom RPC URL
  --gas-limit <limit>      Gas limit for transactions
  --help, -h               Show this help message

${colors.bright}Examples:${colors.reset}

  payrox-cli status
  payrox-cli deploy 0x608060405... --network localhost
  payrox-cli address 0x608060405... arg1 arg2
  payrox-cli balance 0x742d35Cc6Df32b0F54f4F1A4b3E74e9c5F4f2Cd1
  payrox-cli fee --network mainnet

${colors.bright}Environment Variables:${colors.reset}

  PAYROX_PRIVATE_KEY       Default private key
  PAYROX_RPC_URL          Default RPC URL
  PAYROX_NETWORK          Default network

For more information, visit: ${colors.cyan}https://payrox.dev${colors.reset}
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    network: process.env.PAYROX_NETWORK || 'localhost',
    privateKey: process.env.PAYROX_PRIVATE_KEY,
    rpc: process.env.PAYROX_RPC_URL,
    gasLimit: 5000000
  };

  let command = '';
  const params = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (arg === '--network' || arg === '-n') {
      options.network = args[++i];
    } else if (arg === '--private-key' || arg === '-k') {
      options.privateKey = args[++i];
    } else if (arg === '--rpc') {
      options.rpc = args[++i];
    } else if (arg === '--gas-limit') {
      options.gasLimit = parseInt(args[++i]);
    } else if (!command) {
      command = arg;
    } else {
      params.push(arg);
    }
  }

  return { command, params, options };
}

async function createClient(options) {
  const networkConfig = NETWORKS[options.network];
  if (!networkConfig) {
    throw new Error(`Unknown network: ${options.network}`);
  }

  const rpcUrl = options.rpc || networkConfig.rpcUrl || 'http://localhost:8545';
  
  if (options.privateKey) {
    return PayRoxClient.fromRpc(rpcUrl, options.privateKey, options.network);
  } else {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    return new PayRoxClient(provider, undefined, options.network);
  }
}

async function commandStatus(params, options) {
  logInfo(`Checking PayRox status on ${options.network}...`);
  
  const client = await createClient(options);
  const status = await client.getSystemStatus();

  console.log(`
${colors.bright}PayRox System Status${colors.reset}
${colors.cyan}====================${colors.reset}

${colors.bright}Network:${colors.reset}          ${status.network}
${colors.bright}Chain ID:${colors.reset}         ${status.chainId}
${colors.bright}Factory:${colors.reset}          ${status.factoryAddress}
${colors.bright}Dispatcher:${colors.reset}       ${status.dispatcherAddress}
${colors.bright}Deployment Fee:${colors.reset}   ${status.deploymentFee} ETH
${colors.bright}Available:${colors.reset}        ${status.available ? colors.green + '✅ Yes' + colors.reset : colors.red + '❌ No' + colors.reset}
`);

  if (options.privateKey) {
    const address = await client.getAddress();
    const balance = await client.getBalance();
    
    console.log(`${colors.bright}Your Account:${colors.reset}
${colors.bright}Address:${colors.reset}          ${address}
${colors.bright}Balance:${colors.reset}          ${balance} ETH
`);
  }
}

async function commandDeploy(params, options) {
  if (params.length === 0) {
    logError('Bytecode required for deployment');
    process.exit(1);
  }

  const bytecode = params[0];
  const constructorArgs = params.slice(1);

  if (!options.privateKey) {
    logError('Private key required for deployment');
    process.exit(1);
  }

  logInfo('Preparing deployment...');
  
  const client = await createClient(options);
  
  // Calculate address
  const address = await client.calculateAddress(bytecode, constructorArgs);
  logInfo(`Will deploy to: ${address}`);
  
  // Check if already deployed
  const alreadyDeployed = await client.isDeployed(bytecode, constructorArgs);
  if (alreadyDeployed) {
    logWarning('Contract already deployed at this address');
    return;
  }

  // Estimate gas and cost
  const gasEstimate = await client.estimateDeploymentGas(bytecode, constructorArgs);
  const deploymentFee = client.getDeploymentFee();
  
  logInfo(`Estimated gas: ${gasEstimate.toString()}`);
  logInfo(`Deployment fee: ${deploymentFee} ETH`);

  // Deploy
  logInfo('Deploying contract...');
  
  const result = await client.deployContract(
    bytecode,
    constructorArgs,
    'utility',
    { gasLimit: options.gasLimit }
  );

  logSuccess('Contract deployed successfully!');
  console.log(`
${colors.bright}Deployment Result${colors.reset}
${colors.cyan}=================${colors.reset}

${colors.bright}Address:${colors.reset}          ${result.address}
${colors.bright}Transaction:${colors.reset}      ${result.transactionHash}
${colors.bright}Chunk:${colors.reset}            ${result.chunkAddress}
${colors.bright}Fee Paid:${colors.reset}         ${result.deploymentFee} ETH
`);
}

async function commandAddress(params, options) {
  if (params.length === 0) {
    logError('Bytecode required for address calculation');
    process.exit(1);
  }

  const bytecode = params[0];
  const constructorArgs = params.slice(1);

  const client = await createClient(options);
  const address = await client.calculateAddress(bytecode, constructorArgs);
  
  console.log(`
${colors.bright}Deterministic Address${colors.reset}
${colors.cyan}====================${colors.reset}

${colors.bright}Bytecode:${colors.reset}         ${bytecode.slice(0, 42)}...
${colors.bright}Constructor Args:${colors.reset}  [${constructorArgs.join(', ')}]
${colors.bright}Address:${colors.reset}          ${colors.green}${address}${colors.reset}
`);

  // Check if deployed
  const deployed = await client.isDeployed(bytecode, constructorArgs);
  console.log(`${colors.bright}Status:${colors.reset}           ${deployed ? colors.green + 'Deployed' : colors.yellow + 'Not Deployed'}${colors.reset}`);
}

async function commandVerify(params, options) {
  if (params.length < 2) {
    logError('Address and bytecode required for verification');
    process.exit(1);
  }

  const address = params[0];
  const bytecode = params[1];

  const client = await createClient(options);
  
  logInfo('Verifying contract...');
  
  const verified = await client.verifyDeployment(address, bytecode);
  
  if (verified) {
    logSuccess(`Contract at ${address} is verified`);
  } else {
    logError(`Contract at ${address} verification failed`);
  }
}

async function commandBalance(params, options) {
  const client = await createClient(options);
  
  let address;
  if (params.length > 0) {
    address = params[0];
  } else if (options.privateKey) {
    address = await client.getAddress();
  } else {
    logError('Address required when no private key provided');
    process.exit(1);
  }

  const balance = await client.getBalance(address);
  
  console.log(`
${colors.bright}Balance Information${colors.reset}
${colors.cyan}==================${colors.reset}

${colors.bright}Address:${colors.reset}          ${address}
${colors.bright}Balance:${colors.reset}          ${colors.green}${balance} ETH${colors.reset}
`);
}

async function commandFee(params, options) {
  const client = await createClient(options);
  const fee = client.getDeploymentFee();
  
  console.log(`
${colors.bright}Deployment Fee${colors.reset}
${colors.cyan}=============${colors.reset}

${colors.bright}Network:${colors.reset}          ${options.network}
${colors.bright}Fee:${colors.reset}              ${colors.green}${fee} ETH${colors.reset}
${colors.bright}Fee (Wei):${colors.reset}        ${ethers.parseEther(fee).toString()}
`);
}

function commandNetworks() {
  console.log(`
${colors.bright}Available Networks${colors.reset}
${colors.cyan}=================${colors.reset}
`);

  for (const [name, config] of Object.entries(NETWORKS)) {
    const available = config.contracts.factory !== '0x0000000000000000000000000000000000000000';
    console.log(`${colors.bright}${name}${colors.reset}
  Chain ID: ${config.chainId}
  Factory:  ${config.contracts.factory}
  Fee:      ${ethers.formatEther(config.fees.deploymentFee)} ETH
  Status:   ${available ? colors.green + 'Available' : colors.yellow + 'Pending'}${colors.reset}
`);
  }
}

async function main() {
  const { command, params, options } = parseArgs();

  if (!command) {
    showHelp();
    process.exit(0);
  }

  try {
    switch (command) {
      case 'status':
        await commandStatus(params, options);
        break;
      case 'deploy':
        await commandDeploy(params, options);
        break;
      case 'address':
        await commandAddress(params, options);
        break;
      case 'verify':
        await commandVerify(params, options);
        break;
      case 'balance':
        await commandBalance(params, options);
        break;
      case 'fee':
        await commandFee(params, options);
        break;
      case 'networks':
        commandNetworks();
        break;
      default:
        logError(`Unknown command: ${command}`);
        logInfo('Run "payrox-cli --help" for usage information');
        process.exit(1);
    }
  } catch (error) {
    logError(`Command failed: ${error.message}`);
    process.exit(1);
  }
}

// Run CLI
main();

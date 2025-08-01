/**
 * PayRox SDK Basic Usage Example
 * 
 * This example shows how to:
 * 1. Connect to PayRox network
 * 2. Deploy a simple contract
 * 3. Verify deployment
 * 4. Check system status
 */

import { PayRoxClient, Utils } from '@payrox/go-beyond-sdk';
import { ethers } from 'ethers';

async function basicExample() {
  console.log('🚀 PayRox SDK Basic Example');
  console.log('============================\n');

  // 1. Connect to PayRox network
  console.log('1. Connecting to PayRox network...');
  
  const client = PayRoxClient.fromRpc(
    'http://localhost:8545',           // Local development node
    'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',  // Test private key
    'localhost'                        // Network name
  );

  const address = await client.getAddress();
  const balance = await client.getBalance();
  
  console.log(`✅ Connected as: ${address}`);
  console.log(`💰 Balance: ${balance} ETH`);

  // 2. Check PayRox system status
  console.log('\n2. Checking PayRox system status...');
  
  const status = await client.getSystemStatus();
  console.log(`📡 Network: ${status.network} (Chain ID: ${status.chainId})`);
  console.log(`🏭 Factory: ${status.factoryAddress}`);
  console.log(`🗂️  Dispatcher: ${status.dispatcherAddress}`);
  console.log(`💵 Deployment Fee: ${status.deploymentFee} ETH`);
  console.log(`✅ Available: ${status.available}`);

  if (!status.available) {
    throw new Error('PayRox contracts not available on this network');
  }

  // 3. Prepare a simple contract for deployment
  console.log('\n3. Preparing contract deployment...');
  
  // Simple storage contract bytecode (stores a uint256)
  const contractBytecode = '0x608060405234801561001057600080fd5b506040516101e73803806101e78339818101604052810190610032919061007a565b80600081905550506100a7565b600080fd5b6000819050919050565b61005781610044565b811461006257600080fd5b50565b6000815190506100748161004e565b92915050565b6000602082840312156100905761008f61003f565b5b600061009e84828501610065565b91505092915050565b610131806100b66000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c8063209652551461003b5780636057361d14610059575b600080fd5b610043610075565b60405161005091906100a1565b60405180910390f35b610073600480360381019061006e91906100ed565b61007e565b005b60008054905090565b8060008190555050565b6000819050919050565b61009b81610088565b82525050565b60006020820190506100b66000830184610092565b92915050565b600080fd5b6100ca81610088565b81146100d557600080fd5b50565b6000813590506100e7816100c1565b92915050565b600060208284031215610103576101026100bc565b5b6000610111848285016100d8565b9150509291505056fea2646970667358221220f98bf62e8b4f59b9f0bb2d8e5c4b9f5a71e4f5c8c1e1b8b0a7d8e6c9e8f1f4c89164736f6c63430008110033';
  
  const constructorArgs = [42]; // Initial value for storage
  
  // Calculate deterministic address
  const predictedAddress = await client.calculateAddress(contractBytecode, constructorArgs);
  console.log(`📍 Predicted address: ${predictedAddress}`);
  
  // Check if already deployed
  const alreadyDeployed = await client.isDeployed(contractBytecode, constructorArgs);
  console.log(`🔍 Already deployed: ${alreadyDeployed}`);

  if (alreadyDeployed) {
    console.log('ℹ️  Contract already exists at predicted address');
    return;
  }

  // 4. Estimate deployment cost
  console.log('\n4. Estimating deployment cost...');
  
  const gasEstimate = await client.estimateDeploymentGas(contractBytecode, constructorArgs);
  const deploymentFee = client.getDeploymentFee();
  
  console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
  console.log(`💵 Deployment fee: ${deploymentFee} ETH`);

  // Calculate total cost
  const gasPrice = ethers.parseUnits('20', 'gwei'); // 20 gwei
  const cost = Utils.calculateDeploymentCost(
    ethers.parseEther(deploymentFee).toString(),
    gasEstimate,
    gasPrice
  );
  
  console.log(`💰 Total cost: ${cost.total} ETH`);

  // 5. Deploy the contract
  console.log('\n5. Deploying contract...');
  
  const deploymentResult = await client.deployContract(
    contractBytecode,
    constructorArgs,
    'utility',
    {
      gasLimit: Number(gasEstimate) + 50000, // Add buffer
      maxFeePerGas: (gasPrice * 2n).toString(),
      maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei').toString()
    }
  );

  console.log(`✅ Contract deployed!`);
  console.log(`📍 Address: ${deploymentResult.address}`);
  console.log(`🔗 Transaction: ${deploymentResult.transactionHash}`);
  console.log(`📦 Chunk: ${deploymentResult.chunkAddress}`);
  console.log(`💵 Fee paid: ${deploymentResult.deploymentFee} ETH`);

  // 6. Verify deployment
  console.log('\n6. Verifying deployment...');
  
  const verified = await client.verifyDeployment(
    deploymentResult.address,
    contractBytecode
  );
  
  console.log(`✅ Verification: ${verified ? 'PASSED' : 'FAILED'}`);

  // 7. Interact with deployed contract
  console.log('\n7. Interacting with deployed contract...');
  
  const contractABI = [
    'function get() view returns (uint256)',
    'function set(uint256 _value)'
  ];
  
  const contract = client.getContract(deploymentResult.address, contractABI);
  
  // Read initial value
  const initialValue = await contract.get();
  console.log(`📖 Initial stored value: ${initialValue.toString()}`);
  
  // Update value
  const newValue = 123;
  const setTx = await contract.set(newValue);
  await setTx.wait();
  
  const updatedValue = await contract.get();
  console.log(`📝 Updated stored value: ${updatedValue.toString()}`);

  console.log('\n🎉 Basic example completed successfully!');
}

// Run the example
if (require.main === module) {
  basicExample()
    .then(() => {
      console.log('\n✅ Example finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Example failed:', error.message);
      process.exit(1);
    });
}

export { basicExample };

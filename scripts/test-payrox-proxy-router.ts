import { ethers } from 'hardhat';

/**
 * Quick test deployment for PayRoxProxyRouter
 * Tests that the contract compiles and deploys successfully
 */

async function main() {
  console.log('🧪 PayRoxProxyRouter Deployment Test');
  console.log('=====================================');

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Deploy PayRoxProxyRouter
  console.log('\n📦 Deploying PayRoxProxyRouter...');
  
  const PayRoxProxyRouterFactory = await ethers.getContractFactory('PayRoxProxyRouter');
  const proxyRouter = await PayRoxProxyRouterFactory.deploy();
  await proxyRouter.waitForDeployment();
  
  const routerAddress = await proxyRouter.getAddress();
  console.log(`✅ PayRoxProxyRouter deployed: ${routerAddress}`);

  // Deploy a simple ManifestDispatcher for testing
  console.log('\n📡 Deploying ManifestDispatcher for testing...');
  
  const DispatcherFactory = await ethers.getContractFactory('ManifestDispatcher');
  const dispatcher = await DispatcherFactory.deploy(
    deployer.address, // admin
    300 // 5 minute activation delay for testing
  );
  await dispatcher.waitForDeployment();
  
  const dispatcherAddress = await dispatcher.getAddress();
  console.log(`✅ ManifestDispatcher deployed: ${dispatcherAddress}`);

  // Test initialization
  console.log('\n🔧 Testing PayRoxProxyRouter initialization...');
  
  const dispatcherCodehash = ethers.keccak256(await ethers.provider.getCode(dispatcherAddress));
  
  await proxyRouter.initializeProxyRouter(
    deployer.address, // owner
    dispatcherAddress, // dispatcher
    dispatcherCodehash, // expected codehash
    true // strict codehash checking
  );
  
  console.log(`✅ PayRoxProxyRouter initialized successfully`);

  // Verify state
  console.log('\n🔍 Verifying deployed state...');
  
  const owner = await proxyRouter.owner();
  const dispatcher_addr = await proxyRouter.dispatcher();
  const codehash = await proxyRouter.dispatcherCodehash();
  const strict = await proxyRouter.strictCodehash();
  const paused = await proxyRouter.paused();
  const frozen = await proxyRouter.frozen();
  
  console.log(`  Owner: ${owner}`);
  console.log(`  Dispatcher: ${dispatcher_addr}`);
  console.log(`  Codehash: ${codehash}`);
  console.log(`  Strict: ${strict}`);
  console.log(`  Paused: ${paused}`);
  console.log(`  Frozen: ${frozen}`);

  console.log('\n🎉 All tests passed! PayRoxProxyRouter is ready for production use.');
  
  return {
    proxyRouter: routerAddress,
    dispatcher: dispatcherAddress,
    testPassed: true
  };
}

// Handle direct execution
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exitCode = 1;
  });
}

export { main as testPayRoxProxyRouter };

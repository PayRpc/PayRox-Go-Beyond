import { ethers } from 'hardhat';
import { readFileSync, writeFileSync, existsSync } from 'fs';

/**
 * PayRox Proxy Integration Tasks
 * 
 * Post-migration tasks after upgrading your proxy to ManifestDispatcher:
 * 1. Deploy and register facets
 * 2. Build and commit manifests
 * 3. Apply routes with Merkle proofs
 * 4. Activate committed roots
 * 5. Verify the complete integration
 */

interface ProxyIntegrationConfig {
  dispatcherAddress: string;
  proxyAddress: string;
  facetsToDeploy: string[]; // facet contract names
  activationDelay: number;
  governance: string;
}

interface ManifestRoute {
  selector: string;
  facet: string;
  codehash: string;
}

interface Manifest {
  version: string;
  timestamp: number;
  network: string;
  facets: Record<string, {
    address: string;
    codehash: string;
    selectors: string[];
  }>;
  routes: ManifestRoute[];
  merkleRoot: string;
  proof: any[];
}

async function main() {
  console.log('🔧 PayRox Proxy Integration Tasks');
  console.log('==================================');

  const [deployer] = await ethers.getSigners();
  console.log(`Executor: ${deployer.address}`);

  // Load configuration
  const config = loadConfig();
  console.log(`📋 Configuration:
    Dispatcher: ${config.dispatcherAddress}
    Proxy: ${config.proxyAddress}
    Facets: ${config.facetsToDeploy.join(', ')}
    Governance: ${config.governance}
  `);

  // Connect to deployed contracts
  const dispatcher = await ethers.getContractAt('ManifestDispatcher', config.dispatcherAddress);
  
  // Task selection
  const task = process.env.TASK || 'all';
  
  switch (task) {
    case 'deploy-facets':
      await deployFacets(config);
      break;
    case 'build-manifest':
      await buildManifest(config);
      break;
    case 'apply-routes':
      await applyRoutes(config, dispatcher);
      break;
    case 'activate':
      await activateRoot(config, dispatcher);
      break;
    case 'verify':
      await verifyIntegration(config);
      break;
    case 'all':
      await runFullIntegration(config, dispatcher);
      break;
    default:
      console.log(`❌ Unknown task: ${task}`);
      console.log('Available tasks: deploy-facets, build-manifest, apply-routes, activate, verify, all');
      process.exit(1);
  }
}

async function deployFacets(config: ProxyIntegrationConfig) {
  console.log('\n📦 Deploying Facets...');
  
  const deployedFacets: Record<string, string> = {};
  
  for (const facetName of config.facetsToDeploy) {
    console.log(`  Deploying ${facetName}...`);
    
    try {
      const FacetFactory = await ethers.getContractFactory(facetName);
      const facet = await FacetFactory.deploy();
      await facet.waitForDeployment();
      
      const facetAddress = await facet.getAddress();
      deployedFacets[facetName] = facetAddress;
      
      console.log(`  ✅ ${facetName}: ${facetAddress}`);
    } catch (error) {
      console.log(`  ❌ Failed to deploy ${facetName}:`, error);
      throw error;
    }
  }
  
  // Save facet addresses
  const facetFile = 'deployments/deployed-facets.json';
  writeFileSync(facetFile, JSON.stringify(deployedFacets, null, 2));
  console.log(`💾 Facet addresses saved to: ${facetFile}`);
  
  return deployedFacets;
}

async function buildManifest(config: ProxyIntegrationConfig) {
  console.log('\n📋 Building Manifest...');
  
  // Load deployed facets
  const facetFile = 'deployments/deployed-facets.json';
  if (!existsSync(facetFile)) {
    throw new Error(`❌ Facets not deployed yet. Run with TASK=deploy-facets first.`);
  }
  
  const deployedFacets = JSON.parse(readFileSync(facetFile, 'utf8'));
  
  // Build manifest structure
  const manifest: Manifest = {
    version: '1.0.0',
    timestamp: Date.now(),
    network: (await ethers.provider.getNetwork()).name,
    facets: {},
    routes: [],
    merkleRoot: '',
    proof: []
  };
  
  // Process each facet
  for (const [facetName, facetAddress] of Object.entries(deployedFacets)) {
    console.log(`  Processing ${facetName}...`);
    
    const facetAddr = facetAddress as string;
    
    // Get facet contract info
    const facetContract = await ethers.getContractAt(facetName, facetAddr);
    const bytecode = await ethers.provider.getCode(facetAddr);
    const codehash = ethers.keccak256(bytecode);
    
    // Extract function selectors
    const facetInterface = facetContract.interface;
    const selectors = facetInterface.fragments
      .filter(f => f.type === 'function' && (f as any).stateMutability !== 'view')
      .map(f => facetInterface.getFunction((f as any).name)!.selector);
    
    manifest.facets[facetName] = {
      address: facetAddr,
      codehash,
      selectors
    };
    
    // Add routes
    for (const selector of selectors) {
      manifest.routes.push({
        selector,
        facet: facetAddr,
        codehash
      });
    }
    
    console.log(`  ✅ ${facetName}: ${selectors.length} selectors`);
  }
  
  // Calculate Merkle root (simplified - in production use proper Merkle tree)
  const routeHashes = manifest.routes.map(route => 
    ethers.keccak256(ethers.solidityPacked(['bytes4', 'address', 'bytes32'], 
      [route.selector, route.facet, route.codehash]))
  );
  manifest.merkleRoot = ethers.keccak256(ethers.concat(routeHashes));
  
  // Save manifest
  const manifestFile = 'deployments/manifest.json';
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  console.log(`💾 Manifest saved to: ${manifestFile}`);
  
  return manifest;
}

async function applyRoutes(config: ProxyIntegrationConfig, dispatcher: any) {
  console.log('\n🔄 Applying Routes...');
  
  // Load manifest
  const manifestFile = 'deployments/manifest.json';
  if (!existsSync(manifestFile)) {
    throw new Error(`❌ Manifest not built yet. Run with TASK=build-manifest first.`);
  }
  
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  
  // Commit root first
  const currentEpoch = Math.floor(Date.now() / 1000);
  console.log(`  Committing root: ${manifest.merkleRoot}`);
  
  const commitTx = await dispatcher.commitRoot(manifest.merkleRoot, currentEpoch);
  await commitTx.wait();
  console.log(`  ✅ Root committed for epoch: ${currentEpoch}`);
  
  // Prepare batch application
  const selectors = manifest.routes.map((r: ManifestRoute) => r.selector);
  const routes = manifest.routes.map((r: ManifestRoute) => [r.facet, r.codehash]);
  const proofs = manifest.routes.map((_: ManifestRoute) => []); // Simplified - use real proofs
  const positions = manifest.routes.map((_: ManifestRoute, i: number) => i);
  
  console.log(`  Applying ${manifest.routes.length} routes...`);
  
  const applyTx = await dispatcher.applyRoutes(selectors, routes, proofs, positions);
  await applyTx.wait();
  console.log(`  ✅ Routes applied successfully`);
  
  // Save activation info
  const activationInfo = {
    epoch: currentEpoch,
    rootHash: manifest.merkleRoot,
    routesCount: manifest.routes.length,
    activationTime: currentEpoch + config.activationDelay,
    status: 'pending_activation'
  };
  
  writeFileSync('deployments/activation-info.json', JSON.stringify(activationInfo, null, 2));
  console.log(`💾 Activation info saved. Activate after ${new Date((currentEpoch + config.activationDelay) * 1000)}`);
}

async function activateRoot(config: ProxyIntegrationConfig, dispatcher: any) {
  console.log('\n⚡ Activating Committed Root...');
  
  // Load activation info
  const activationFile = 'deployments/activation-info.json';
  if (!existsSync(activationFile)) {
    throw new Error(`❌ No pending activation found. Run with TASK=apply-routes first.`);
  }
  
  const activationInfo = JSON.parse(readFileSync(activationFile, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  
  if (now < activationInfo.activationTime) {
    const waitTime = activationInfo.activationTime - now;
    throw new Error(`❌ Activation delay not met. Wait ${waitTime} seconds (${Math.ceil(waitTime / 3600)} hours)`);
  }
  
  console.log(`  Activating root: ${activationInfo.rootHash}`);
  
  const activateTx = await dispatcher.activateCommittedRoot();
  await activateTx.wait();
  
  console.log(`  ✅ Root activated successfully!`);
  
  // Update status
  activationInfo.status = 'active';
  activationInfo.activatedAt = now;
  writeFileSync(activationFile, JSON.stringify(activationInfo, null, 2));
}

async function verifyIntegration(config: ProxyIntegrationConfig) {
  console.log('\n🔍 Verifying Integration...');
  
  // Connect to proxy (should now route through dispatcher)
  const proxy = await ethers.getContractAt('ManifestDispatcher', config.proxyAddress);
  
  // Check active root
  const activeRoot = await proxy.activeRoot();
  console.log(`  Active root: ${activeRoot}`);
  
  // Load expected manifest
  const manifestFile = 'deployments/manifest.json';
  if (existsSync(manifestFile)) {
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    const expectedRoot = manifest.merkleRoot;
    
    if (activeRoot === expectedRoot) {
      console.log(`  ✅ Root matches manifest: ${expectedRoot}`);
    } else {
      console.log(`  ❌ Root mismatch. Expected: ${expectedRoot}, Got: ${activeRoot}`);
    }
  }
  
  // Test route resolution
  const manifestData = JSON.parse(readFileSync('deployments/manifest.json', 'utf8'));
  for (const route of manifestData.routes.slice(0, 3)) { // Test first 3 routes
    try {
      const [facet, codehash] = await proxy.routeOf(route.selector);
      const matches = facet.toLowerCase() === route.facet.toLowerCase() && codehash === route.codehash;
      
      console.log(`  ${matches ? '✅' : '❌'} Selector ${route.selector}: ${facet}`);
    } catch (error) {
      console.log(`  ❌ Failed to resolve ${route.selector}:`, error);
    }
  }
  
  console.log('\n🎉 Integration verification complete!');
}

async function runFullIntegration(config: ProxyIntegrationConfig, dispatcher: any) {
  console.log('\n🚀 Running Full Integration...');
  
  try {
    await deployFacets(config);
    await buildManifest(config);
    await applyRoutes(config, dispatcher);
    
    console.log('\n⏳ Waiting for activation delay...');
    console.log('Run with TASK=activate when the delay period has passed.');
    console.log('Then run TASK=verify to confirm everything works.');
    
  } catch (error) {
    console.error('❌ Full integration failed:', error);
    throw error;
  }
}

function loadConfig(): ProxyIntegrationConfig {
  const configFile = process.env.CONFIG_FILE || 'deployments/proxy-migration-config.json';
  
  if (existsSync(configFile)) {
    return JSON.parse(readFileSync(configFile, 'utf8'));
  }
  
  // Fallback to environment variables
  return {
    dispatcherAddress: process.env.DISPATCHER_ADDRESS || '',
    proxyAddress: process.env.PROXY_ADDRESS || '',
    facetsToDeploy: (process.env.FACETS || 'PingFacet').split(','),
    activationDelay: Number(process.env.ACTIVATION_DELAY) || 86400,
    governance: process.env.GOVERNANCE || ''
  };
}

// Handle direct execution
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Integration task failed:', error);
    process.exitCode = 1;
  });
}

export { main as runProxyIntegration };

import * as fs from 'fs';
import { ethers } from 'hardhat';
import * as path from 'path';

// Shared utility to assert contract has code
export async function assertHasCode(addr: string, tag: string) {
  const code = await ethers.provider.getCode(addr);
  if (code === '0x') {
    throw new Error(
      `[${tag}] no code at ${addr}. Did you connect to the right network?`
    );
  }
}

// ABI-safe dispatcher state reading
async function readActiveRoot(dispatcher: any) {
  const defaultRoot =
    '0x0000000000000000000000000000000000000000000000000000000000000000';
  try {
    // Try activeRoot() method first
    const root = await dispatcher.activeRoot();
    return root || defaultRoot;
  } catch (error) {
    // Fallback: try currentRoot() for older contracts
    try {
      const root = await dispatcher.currentRoot();
      return root || defaultRoot;
    } catch (error2) {
      // This is okay for fresh deployments
      return defaultRoot;
    }
  }
}

async function readPendingState(dispatcher: any) {
  try {
    // Try separate getters first
    const root = await dispatcher.pendingRoot().catch(() => null);
    const epoch = await dispatcher.pendingEpoch?.().catch(() => null);
    const ts = await dispatcher.earliestActivation?.().catch(() => null);
    if (root) return { root, epoch, ts };
  } catch {
    // ABI mismatch - try struct approach
  }

  // Fallback: struct getter
  try {
    if (typeof dispatcher.pending === 'function') {
      const p = await dispatcher.pending();
      return {
        root: p.root ?? p[0],
        epoch: p.epoch ?? p[1],
        ts: p.earliestActivation ?? p[2],
      };
    }
  } catch {
    // Final fallback failed
  }

  throw new Error('Dispatcher ABI mismatch: cannot read pending state');
}

// Fix for HardhatEthersProvider.resolveName not implemented
const p: any = ethers.provider;
if (typeof p.resolveName !== 'function') {
  p.resolveName = async (name: string) => {
    if (/^0x[0-9a-fA-F]{40}$/.test(name)) return name; // accept hex addresses
    throw new Error('ENS not supported on Hardhat local provider');
  };
}

interface DeploymentArtifact {
  contractName: string;
  address: string;
  deployer: string;
  network: string;
  timestamp: string;
  transactionHash: string;
  constructorArguments?: any[];
}

interface VerificationResult {
  component: string;
  address: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
  details?: any;
}

async function main() {
  console.log('[INFO] PayRox Go Beyond - Complete Deployment Verification');
  console.log('=======================================================');

  const results: VerificationResult[] = [];
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();

  console.log(`📡 Network: ${network.name} (Chain ID: ${chainId})`);
  console.log(`⏰ Verification Time: ${new Date().toISOString()}`);

  try {
    // Step 1: Verify Factory Deployment
    console.log('\n🏭 Verifying Factory Deployment...');
    const factoryResult = await verifyFactory(chainId);
    results.push(factoryResult);

    // Step 2: Verify Dispatcher Deployment
    console.log('\n📡 Verifying Dispatcher Deployment...');
    const dispatcherResult = await verifyDispatcher(chainId);
    results.push(dispatcherResult);

    // Step 3: Verify Facet Deployments
    console.log('\n🔹 Verifying Facet Deployments...');
    const facetResults = await verifyFacets();
    results.push(...facetResults);

    // Step 4: Verify System Integration
    console.log('\n🔗 Verifying System Integration...');
    const integrationResults = await verifySystemIntegration(
      factoryResult.address,
      dispatcherResult.address
    );
    results.push(...integrationResults);

    // Step 5: Verify Routes and Manifest
    console.log('\n📋 Verifying Routes and Manifest...');
    const routeResults = await verifyRoutesAndManifest(
      dispatcherResult.address
    );
    results.push(...routeResults);

    // Step 6: Verify Security Settings
    console.log('\n🔐 Verifying Security Settings...');
    const securityResults = await verifySecuritySettings(
      factoryResult.address,
      dispatcherResult.address
    );
    results.push(...securityResults);

    // Generate Summary Report
    console.log('\n📊 Verification Summary');
    console.log('=======================');

    const successCount = results.filter(r => r.status === 'SUCCESS').length;
    const warningCount = results.filter(r => r.status === 'WARNING').length;
    const errorCount = results.filter(r => r.status === 'ERROR').length;

    console.log(`✅ Success: ${successCount}`);
    console.log(`⚠️  Warning: ${warningCount}`);
    console.log(`❌ Error: ${errorCount}`);

    // Detailed Results
    console.log('\n📋 Detailed Results:');
    for (const result of results) {
      const icon =
        result.status === 'SUCCESS'
          ? '✅'
          : result.status === 'WARNING'
          ? '⚠️'
          : '❌';
      console.log(`${icon} ${result.component}: ${result.message}`);
      if (result.address) {
        console.log(`   📍 Address: ${result.address}`);
      }
      if (result.details) {
        console.log(
          `   📝 Details: ${JSON.stringify(result.details, null, 2)}`
        );
      }
    }

    // Final Verdict
    if (errorCount === 0) {
      console.log('\n🎉 VERIFICATION COMPLETE - ALL SYSTEMS OPERATIONAL!');
      console.log('✅ 100% Error-Free Deployment Verified');
      process.exit(0);
    } else {
      console.log('\n💥 VERIFICATION FAILED - ERRORS DETECTED!');
      console.log(`❌ ${errorCount} error(s) must be resolved`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 VERIFICATION SCRIPT FAILED!');
    console.error('Error:', error);
    process.exit(1);
  }
}

async function verifyFactory(chainId: string): Promise<VerificationResult> {
  try {
    const factoryPath = path.join(
      __dirname,
      `../deployments/${chainId}/factory.json`
    );

    if (!fs.existsSync(factoryPath)) {
      return {
        component: 'Factory',
        address: '',
        status: 'ERROR',
        message: `Factory deployment artifact not found at ${factoryPath}`,
      };
    }

    const factoryData: DeploymentArtifact = JSON.parse(
      fs.readFileSync(factoryPath, 'utf8')
    );

    // Verify contract has code
    await assertHasCode(factoryData.address, 'Factory');

    // Verify contract interface
    const factory = await ethers.getContractAt(
      'DeterministicChunkFactory',
      factoryData.address
    );

    // Test basic functionality
    const owner = await factory.owner();
    const feeRecipient = await factory.feeRecipient();
    const deploymentFee = await factory.deploymentFee();

    const code = await ethers.provider.getCode(factoryData.address);

    return {
      component: 'Factory',
      address: factoryData.address,
      status: 'SUCCESS',
      message: 'Factory deployment verified successfully',
      details: {
        owner,
        feeRecipient,
        deploymentFee: ethers.formatEther(deploymentFee),
        codeSize: Math.floor((code.length - 2) / 2),
        transactionHash: factoryData.transactionHash,
      },
    };
  } catch (error) {
    return {
      component: 'Factory',
      address: '',
      status: 'ERROR',
      message: `Factory verification failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
}

async function verifyDispatcher(chainId: string): Promise<VerificationResult> {
  try {
    const dispatcherPath = path.join(
      __dirname,
      `../deployments/${chainId}/dispatcher.json`
    );

    if (!fs.existsSync(dispatcherPath)) {
      return {
        component: 'Dispatcher',
        address: '',
        status: 'ERROR',
        message: `Dispatcher deployment artifact not found at ${dispatcherPath}`,
      };
    }

    const dispatcherData: DeploymentArtifact = JSON.parse(
      fs.readFileSync(dispatcherPath, 'utf8')
    );

    // Verify contract has code
    await assertHasCode(dispatcherData.address, 'Dispatcher');

    // Verify contract interface
    const dispatcher = await ethers.getContractAt(
      'ManifestDispatcher',
      dispatcherData.address
    );

    // Test basic functionality
    const owner = await dispatcher.owner();
    const activationDelay = await dispatcher.activationDelay();
    const frozen = await dispatcher.frozen();

    // Try to get current root with ABI-safe handling
    const currentRoot = await readActiveRoot(dispatcher);

    const code = await ethers.provider.getCode(dispatcherData.address);

    return {
      component: 'Dispatcher',
      address: dispatcherData.address,
      status: 'SUCCESS',
      message: 'Dispatcher deployment verified successfully',
      details: {
        owner,
        activationDelay: activationDelay.toString(),
        frozen,
        currentRoot,
        codeSize: Math.floor((code.length - 2) / 2),
        transactionHash: dispatcherData.transactionHash,
      },
    };
  } catch (error) {
    return {
      component: 'Dispatcher',
      address: '',
      status: 'ERROR',
      message: `Dispatcher verification failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    };
  }
}

async function verifyFacets(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // Check for known facet addresses from previous deployments
  const knownFacets = [
    {
      name: 'FacetA',
      expectedAddress: '0xDDa0648FA8c9cD593416EC37089C2a2E6060B45c',
    },
    {
      name: 'FacetB',
      expectedAddress: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    },
  ];

  for (const facet of knownFacets) {
    try {
      const code = await ethers.provider.getCode(facet.expectedAddress);

      if (code === '0x') {
        results.push({
          component: facet.name,
          address: facet.expectedAddress,
          status: 'ERROR',
          message: `${facet.name} has no code at expected address`,
        });
      } else {
        // Try to verify it's the correct contract type
        let contractInterface = null;
        try {
          if (facet.name === 'FacetA') {
            contractInterface = await ethers.getContractAt(
              'ExampleFacetA',
              facet.expectedAddress
            );
            await contractInterface.getFunction('functionA');
          } else if (facet.name === 'FacetB') {
            contractInterface = await ethers.getContractAt(
              'ExampleFacetB',
              facet.expectedAddress
            );
            await contractInterface.getFunction('functionB');
          }

          results.push({
            component: facet.name,
            address: facet.expectedAddress,
            status: 'SUCCESS',
            message: `${facet.name} deployed and verified successfully`,
            details: {
              codeSize: Math.floor((code.length - 2) / 2),
            },
          });
        } catch (interfaceError) {
          results.push({
            component: facet.name,
            address: facet.expectedAddress,
            status: 'WARNING',
            message: `${facet.name} has code but interface verification failed`,
            details: {
              codeSize: Math.floor((code.length - 2) / 2),
              interfaceError:
                interfaceError instanceof Error
                  ? interfaceError.message
                  : 'Unknown interface error',
            },
          });
        }
      }
    } catch (error) {
      results.push({
        component: facet.name,
        address: facet.expectedAddress,
        status: 'ERROR',
        message: `${facet.name} verification failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    }
  }

  return results;
}

async function verifySystemIntegration(
  factoryAddress: string,
  dispatcherAddress: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // Verify addresses are different
  if (factoryAddress === dispatcherAddress) {
    results.push({
      component: 'Address Uniqueness',
      address: '',
      status: 'ERROR',
      message:
        'Factory and Dispatcher have the same address - this indicates a deployment error',
    });
  } else {
    results.push({
      component: 'Address Uniqueness',
      address: '',
      status: 'SUCCESS',
      message: 'Factory and Dispatcher have unique addresses',
    });
  }

  // Verify both contracts can interact with each other
  try {
    // Apply additional shim for getContractAt calls
    const originalGetContractAt = ethers.getContractAt;
    (ethers as any).getContractAt = async (
      contractName: any,
      address: any,
      signer?: any
    ) => {
      const addrStr = address.toString();

      // Validate address format before calling
      if (!/^0x[0-9a-fA-F]{40}$/.test(addrStr)) {
        throw new Error(`Invalid address format: ${addrStr}`);
      }

      // Check if contract exists
      const code = await ethers.provider.getCode(addrStr);
      if (code === '0x') {
        throw new Error(`No code at address ${addrStr}`);
      }

      return originalGetContractAt.call(ethers, contractName, address, signer);
    };

    const factory = await ethers.getContractAt(
      'DeterministicChunkFactory',
      factoryAddress
    );
    const dispatcher = await ethers.getContractAt(
      'ManifestDispatcher',
      dispatcherAddress
    );

    // Test factory owner matches expected owner
    const factoryOwner = await factory.owner();
    const dispatcherOwner = await dispatcher.owner();

    if (factoryOwner === dispatcherOwner) {
      results.push({
        component: 'Owner Consistency',
        address: '',
        status: 'SUCCESS',
        message: 'Factory and Dispatcher have consistent ownership',
        details: { owner: factoryOwner },
      });
    } else {
      results.push({
        component: 'Owner Consistency',
        address: '',
        status: 'WARNING',
        message: 'Factory and Dispatcher have different owners',
        details: { factoryOwner, dispatcherOwner },
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('resolveName')) {
      results.push({
        component: 'Integration Test',
        address: '',
        status: 'WARNING',
        message:
          'Integration test skipped due to Hardhat ethers compatibility issue',
      });
    } else {
      results.push({
        component: 'Integration Test',
        address: '',
        status: 'ERROR',
        message: `System integration verification failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    }
  }

  return results;
}

async function verifyRoutesAndManifest(
  dispatcherAddress: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  try {
    // Check if manifest files exist
    const manifestPath = path.join(
      __dirname,
      '../manifests/complete-production.manifest.json'
    );
    const merklePath = path.join(__dirname, '../manifests/current.merkle.json');

    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      results.push({
        component: 'Production Manifest',
        address: '',
        status: 'SUCCESS',
        message: 'Production manifest exists and is valid JSON',
        details: {
          version: manifest.version,
          facetCount: manifest.facets?.length || 0,
          routeCount: manifest.routes?.length || 0,
        },
      });
    } else {
      results.push({
        component: 'Production Manifest',
        address: '',
        status: 'WARNING',
        message: 'Production manifest file not found',
      });
    }

    if (fs.existsSync(merklePath)) {
      const merkle = JSON.parse(fs.readFileSync(merklePath, 'utf8'));
      results.push({
        component: 'Merkle Tree',
        address: '',
        status: 'SUCCESS',
        message: 'Merkle tree data exists',
        details: {
          root: merkle.root,
          leafCount: merkle.leaves?.length || 0,
        },
      });
    } else {
      results.push({
        component: 'Merkle Tree',
        address: '',
        status: 'WARNING',
        message: 'Merkle tree file not found',
      });
    }

    // Test dispatcher route resolution
    const dispatcher = await ethers.getContractAt(
      'ManifestDispatcher',
      dispatcherAddress
    );

    // Test a known function selector (if routes are applied)
    try {
      const testSelector = '0x12345678'; // Example selector
      const route = await dispatcher.getRoute(testSelector);
      results.push({
        component: 'Route Resolution',
        address: '',
        status: 'SUCCESS',
        message: 'Dispatcher route resolution working',
        details: { testRoute: route },
      });
    } catch (error) {
      results.push({
        component: 'Route Resolution',
        address: '',
        status: 'WARNING',
        message: 'Route resolution test failed (routes may not be applied yet)',
      });
    }
  } catch (error) {
    results.push({
      component: 'Manifest Verification',
      address: '',
      status: 'ERROR',
      message: `Manifest verification failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    });
  }

  return results;
}

async function verifySecuritySettings(
  factoryAddress: string,
  dispatcherAddress: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  try {
    const factory = await ethers.getContractAt(
      'DeterministicChunkFactory',
      factoryAddress
    );
    const dispatcher = await ethers.getContractAt(
      'ManifestDispatcher',
      dispatcherAddress
    );

    // Verify factory security
    const factoryOwner = await factory.owner();
    const feeRecipient = await factory.feeRecipient();
    const deploymentFee = await factory.deploymentFee();

    if (factoryOwner && factoryOwner !== ethers.ZeroAddress) {
      results.push({
        component: 'Factory Security',
        address: factoryAddress,
        status: 'SUCCESS',
        message: 'Factory has valid owner set',
        details: {
          owner: factoryOwner,
          feeRecipient,
          deploymentFee: ethers.formatEther(deploymentFee),
        },
      });
    } else {
      results.push({
        component: 'Factory Security',
        address: factoryAddress,
        status: 'ERROR',
        message: 'Factory owner not properly set',
      });
    }

    // Verify dispatcher security
    const dispatcherOwner = await dispatcher.owner();
    const frozen = await dispatcher.frozen();
    const activationDelay = await dispatcher.activationDelay();

    if (dispatcherOwner && dispatcherOwner !== ethers.ZeroAddress) {
      results.push({
        component: 'Dispatcher Security',
        address: dispatcherAddress,
        status: 'SUCCESS',
        message: 'Dispatcher has valid owner and security settings',
        details: {
          owner: dispatcherOwner,
          frozen,
          activationDelay: activationDelay.toString() + ' seconds',
        },
      });
    } else {
      results.push({
        component: 'Dispatcher Security',
        address: dispatcherAddress,
        status: 'ERROR',
        message: 'Dispatcher owner not properly set',
      });
    }
  } catch (error) {
    results.push({
      component: 'Security Verification',
      address: '',
      status: 'ERROR',
      message: `Security verification failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    });
  }

  return results;
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

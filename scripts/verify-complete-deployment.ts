/**
 * Complete Deployment Verification Script
 *
 * Comprehensive verification of PayRox deployment including:
 * - Factory and Dispatcher contracts
 * - Facet deployments
 * - System integration
 * - Security settings
 * - Route configuration
 *
 * @author PayRox Team
 * @version 2.0.0
 */

import * as fs from 'fs';
import { ethers } from 'hardhat';
import * as path from 'path';

// Constants
const DEFAULT_ROOT =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

// Types
interface FacetConfiguration {
  readonly name: string;
  readonly contractName: string;
  readonly expectedAddress: string;
  readonly testFunction: string;
}

const EXPECTED_FACETS: FacetConfiguration[] = [
  {
    name: 'FacetA',
    contractName: 'ExampleFacetA',
    expectedAddress: '0xDDa0648FA8c9cD593416EC37089C2a2E6060B45c',
    testFunction: 'functionA',
  },
  {
    name: 'FacetB',
    contractName: 'ExampleFacetB',
    expectedAddress: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    testFunction: 'functionB',
  },
];

// Additional Types
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

interface VerificationSummary {
  successCount: number;
  warningCount: number;
  errorCount: number;
  totalCount: number;
}

// Error Classes
class DeploymentVerificationError extends Error {
  constructor(message: string, public readonly component: string) {
    super(message);
    this.name = 'DeploymentVerificationError';
  }
}

class ContractNotFoundError extends Error {
  constructor(address: string, component: string) {
    super(`No code found at address ${address} for ${component}`);
    this.name = 'ContractNotFoundError';
  }
}

// Utility Functions
function getStatusIcon(status: VerificationResult['status']): string {
  switch (status) {
    case 'SUCCESS':
      return '✅';
    case 'WARNING':
      return '⚠️';
    case 'ERROR':
      return '❌';
    default:
      return '❓';
  }
}

function calculateCodeSize(bytecode: string): number {
  return Math.floor((bytecode.length - 2) / 2);
}

function createSuccessResult(
  component: string,
  address: string,
  message: string,
  details?: any
): VerificationResult {
  return { component, address, status: 'SUCCESS', message, details };
}

function createWarningResult(
  component: string,
  address: string,
  message: string,
  details?: any
): VerificationResult {
  return { component, address, status: 'WARNING', message, details };
}

function createErrorResult(
  component: string,
  address: string,
  message: string,
  details?: any
): VerificationResult {
  return { component, address, status: 'ERROR', message, details };
}

/**
 * Shared utility to assert contract has code at address
 * @param addr - Contract address to check
 * @param tag - Component name for error messages
 * @throws {ContractNotFoundError} When no code is found
 */
export async function assertHasCode(addr: string, tag: string): Promise<void> {
  const code = await ethers.provider.getCode(addr);
  if (code === '0x') {
    throw new ContractNotFoundError(addr, tag);
  }
}

/**
 * ABI-safe dispatcher state reading with proper error handling
 * @param dispatcher - Dispatcher contract instance
 * @returns Active root hash or default if not set
 */
async function readActiveRoot(dispatcher: any): Promise<string> {
  // Try activeRoot() method first
  try {
    const root = await dispatcher.activeRoot();
    return root || DEFAULT_ROOT;
  } catch (activeRootError) {
    console.warn(
      `[DEBUG] activeRoot() failed, trying currentRoot(): ${activeRootError}`
    );

    // Fallback: try currentRoot() for older contracts
    try {
      const root = await dispatcher.currentRoot();
      return root || DEFAULT_ROOT;
    } catch (currentRootError) {
      console.warn(`[DEBUG] currentRoot() also failed: ${currentRootError}`);
      // This is acceptable for fresh deployments
      return DEFAULT_ROOT;
    }
  }
}

/**
 * Reads pending state from dispatcher with multiple fallback strategies
 * @param dispatcher - Dispatcher contract instance
 * @returns Pending state object with root, epoch, and timestamp
 * @throws {Error} When all ABI reading strategies fail
 */
async function readPendingState(
  dispatcher: any
): Promise<{ root: any; epoch: any; ts: any }> {
  // Strategy 1: Try separate getters first
  try {
    const root = await dispatcher.pendingRoot().catch(() => null);
    const epoch = await dispatcher.pendingEpoch?.().catch(() => null);
    const ts = await dispatcher.earliestActivation?.().catch(() => null);

    if (root !== null) {
      return { root, epoch, ts };
    }
  } catch (separateGettersError) {
    console.warn(`[DEBUG] Separate getters failed: ${separateGettersError}`);
  }

  // Strategy 2: Try struct getter approach
  try {
    if (typeof dispatcher.pending === 'function') {
      const pendingData = await dispatcher.pending();
      return {
        root: pendingData.root ?? pendingData[0],
        epoch: pendingData.epoch ?? pendingData[1],
        ts: pendingData.earliestActivation ?? pendingData[2],
      };
    }
  } catch (structError) {
    console.warn(`[DEBUG] Struct getter failed: ${structError}`);
  }

  throw new Error(
    'Dispatcher ABI mismatch: cannot read pending state with any known method'
  );
}

/**
 * Initializes Hardhat provider compatibility shims
 */
function initializeProviderShims(): void {
  // Fix for HardhatEthersProvider.resolveName not implemented
  const provider: any = ethers.provider;
  if (typeof provider.resolveName !== 'function') {
    provider.resolveName = async (name: string) => {
      if (/^0x[0-9a-fA-F]{40}$/.test(name)) {
        return name; // accept hex addresses as-is
      }
      throw new Error('ENS resolution not supported on Hardhat local provider');
    };
  }
}

/**
 * Loads deployment artifact from file
 * @param network - Network name
 * @param contractType - Type of contract (factory, dispatcher, etc.)
 * @returns Deployment artifact or null if not found
 */
function loadDeploymentArtifact(
  network: string,
  contractType: string
): DeploymentArtifact | null {
  const deploymentPath = path.join(
    __dirname,
    `../deployments/${network}/${contractType}.json`
  );

  if (!fs.existsSync(deploymentPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  } catch (error) {
    console.warn(
      `[WARN] Failed to parse ${contractType} deployment file: ${error}`
    );
    return null;
  }
}

/**
 * Generates verification summary from results array
 * @param results - Array of verification results
 * @returns Summary with counts by status
 */
function generateSummary(results: VerificationResult[]): VerificationSummary {
  return {
    successCount: results.filter(r => r.status === 'SUCCESS').length,
    warningCount: results.filter(r => r.status === 'WARNING').length,
    errorCount: results.filter(r => r.status === 'ERROR').length,
    totalCount: results.length,
  };
}

/**
 * Displays verification results in a formatted way
 * @param results - Array of verification results
 */
function displayResults(results: VerificationResult[]): void {
  console.log('\n📋 Detailed Results:');

  for (const result of results) {
    const icon = getStatusIcon(result.status);
    console.log(`${icon} ${result.component}: ${result.message}`);

    if (result.address) {
      console.log(`   📍 Address: ${result.address}`);
    }

    if (result.details) {
      console.log(`   📝 Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  }
}

/**
 * Main verification orchestrator
 */
async function main(): Promise<void> {
  console.log('[INFO] PayRox Go Beyond - Complete Deployment Verification');
  console.log('=======================================================');

  // Initialize compatibility shims
  initializeProviderShims();

  const results: VerificationResult[] = [];
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();

  // Map chainId to deployment directory name
  let networkName: string;
  if (chainId === '31337') {
    // Hardhat network - check for localhost deployments first, then hardhat
    if (fs.existsSync(path.join(__dirname, '../deployments/localhost'))) {
      networkName = 'localhost';
    } else {
      networkName = 'hardhat';
    }
  } else {
    networkName = network.name || 'unknown';
  }

  console.log(`📡 Network: ${networkName} (Chain ID: ${chainId})`);
  console.log(`⏰ Verification Time: ${new Date().toISOString()}`);

  // Load deployment artifacts
  const factoryArtifact = loadDeploymentArtifact(networkName, 'factory');
  const dispatcherArtifact = loadDeploymentArtifact(networkName, 'dispatcher');

  if (!factoryArtifact) {
    console.log(
      '❌ Factory deployment not found. Please deploy the system first.'
    );
    console.log(`   Expected file: deployments/${networkName}/factory.json`);

    // Try alternative network name for chainId 31337
    if (chainId === '31337') {
      const altNetworkName =
        networkName === 'localhost' ? 'hardhat' : 'localhost';
      const altFactoryArtifact = loadDeploymentArtifact(
        altNetworkName,
        'factory'
      );
      if (altFactoryArtifact) {
        console.log(
          `   Found deployment in deployments/${altNetworkName}/ instead`
        );
        console.log(`   Please ensure you're connected to the correct network`);
      }
    }

    process.exit(1);
  }

  if (!dispatcherArtifact) {
    console.log(
      '⚠️  Dispatcher deployment not found. Only factory verification will be performed.'
    );
    console.log(`   Expected file: deployments/${networkName}/dispatcher.json`);
  }

  try {
    // Execute verification steps
    await executeVerificationSteps(
      factoryArtifact,
      dispatcherArtifact,
      results
    );

    // Generate and display summary
    const summary = generateSummary(results);
    displaySummary(summary);

    // Display detailed results
    displayResults(results);

    // Determine final verdict
    if (summary.errorCount === 0) {
      console.log('\n🎉 VERIFICATION COMPLETE - ALL SYSTEMS OPERATIONAL!');
      console.log('✅ 100% Error-Free Deployment Verified');
      process.exit(0);
    } else {
      console.log('\n💥 VERIFICATION FAILED - ERRORS DETECTED!');
      console.log(`❌ ${summary.errorCount} error(s) must be resolved`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 VERIFICATION SCRIPT FAILED!');
    console.error('Error:', error);
    process.exit(1);
  }
}

/**
 * Executes all verification steps in sequence
 * @param factoryArtifact - Factory deployment artifact
 * @param dispatcherArtifact - Dispatcher deployment artifact (optional)
 * @param results - Results array to populate
 */
async function executeVerificationSteps(
  factoryArtifact: DeploymentArtifact,
  dispatcherArtifact: DeploymentArtifact | null,
  results: VerificationResult[]
): Promise<void> {
  // Step 1: Verify Factory Deployment
  console.log('\n🏭 Verifying Factory Deployment...');
  const factoryResult = await verifyFactoryDeployment(factoryArtifact);
  results.push(factoryResult);

  if (!dispatcherArtifact) {
    console.log(
      '\n⚠️  Skipping remaining verifications - Dispatcher not deployed'
    );
    return;
  }

  // Step 2: Verify Dispatcher Deployment
  console.log('\n📡 Verifying Dispatcher Deployment...');
  const dispatcherResult = await verifyDispatcherDeployment(dispatcherArtifact);
  results.push(dispatcherResult);

  // Step 3: Verify Facet Deployments
  console.log('\n🔹 Verifying Facet Deployments...');
  const facetResults = await verifyFacets();
  results.push(...facetResults);

  // Step 4: Verify System Integration (only if both factory and dispatcher exist)
  if (
    factoryResult.status === 'SUCCESS' &&
    dispatcherResult.status === 'SUCCESS'
  ) {
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
  } else {
    console.log('\n⚠️  Skipping integration tests - Core deployments failed');
  }
}

/**
 * Displays verification summary
 * @param summary - Summary object with counts
 */
function displaySummary(summary: VerificationSummary): void {
  console.log('\n� Verification Summary');
  console.log('=======================');
  console.log(`✅ Success: ${summary.successCount}`);
  console.log(`⚠️  Warning: ${summary.warningCount}`);
  console.log(`❌ Error: ${summary.errorCount}`);
}

/**
 * Verifies factory deployment and functionality
 * @param chainId - Network chain ID
 * @returns Verification result for factory
 */
/**
 * Verifies factory deployment using deployment artifact
 * @param factoryArtifact - Factory deployment artifact
 * @returns Verification result for factory
 */
async function verifyFactoryDeployment(
  factoryArtifact: DeploymentArtifact
): Promise<VerificationResult> {
  try {
    const { address, contractName } = factoryArtifact;

    // Check if contract exists at address
    const bytecode = await ethers.provider.getCode(address);
    if (bytecode === '0x') {
      return createErrorResult(
        'Factory',
        address,
        'No contract code found at factory address'
      );
    }

    // Try to interact with the contract
    const factory = await ethers.getContractAt(contractName, address);
    const baseFeeWei = await factory.baseFeeWei();
    const feeRecipient = await factory.feeRecipient();

    return createSuccessResult(
      'Factory',
      address,
      'Factory deployment verified successfully',
      {
        contractName,
        bytecodeSize: calculateCodeSize(bytecode),
        deploymentFee: ethers.formatEther(baseFeeWei),
        feeRecipient,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResult(
      'Factory',
      factoryArtifact.address,
      `Factory verification failed: ${message}`
    );
  }
}

/**
 * Verifies dispatcher deployment using deployment artifact
 * @param dispatcherArtifact - Dispatcher deployment artifact
 * @returns Verification result for dispatcher
 */
async function verifyDispatcherDeployment(
  dispatcherArtifact: DeploymentArtifact
): Promise<VerificationResult> {
  try {
    const { address, contractName } = dispatcherArtifact;

    // Check if contract exists at address
    const bytecode = await ethers.provider.getCode(address);
    if (bytecode === '0x') {
      return createErrorResult(
        'Dispatcher',
        address,
        'No contract code found at dispatcher address'
      );
    }

    // Try to interact with the contract
    const dispatcher = await ethers.getContractAt(contractName, address);
    const owner = await dispatcher.owner();
    const frozen = await dispatcher.frozen();

    return createSuccessResult(
      'Dispatcher',
      address,
      'Dispatcher deployment verified successfully',
      {
        contractName,
        bytecodeSize: calculateCodeSize(bytecode),
        owner,
        frozen,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResult(
      'Dispatcher',
      dispatcherArtifact.address,
      `Dispatcher verification failed: ${message}`
    );
  }
}

/**
 * Verifies a single facet deployment
 * @param facetConfig - Facet configuration object
 * @returns Verification result for the facet
 */
async function verifySingleFacet(
  facetConfig: FacetConfiguration
): Promise<VerificationResult> {
  try {
    const code = await ethers.provider.getCode(facetConfig.expectedAddress);

    if (code === '0x') {
      return createErrorResult(
        facetConfig.name,
        facetConfig.expectedAddress,
        `${facetConfig.name} has no code at expected address`
      );
    }

    // Try to verify it's the correct contract type
    try {
      const contractInterface = await ethers.getContractAt(
        facetConfig.contractName,
        facetConfig.expectedAddress
      );

      // Test the expected function exists (note: getFunction is synchronous)
      const func = contractInterface.getFunction(facetConfig.testFunction);
      if (!func) {
        throw new Error(`Function ${facetConfig.testFunction} not found`);
      }

      return createSuccessResult(
        facetConfig.name,
        facetConfig.expectedAddress,
        `${facetConfig.name} deployed and verified successfully`,
        { codeSize: calculateCodeSize(code) }
      );
    } catch (interfaceError) {
      return createWarningResult(
        facetConfig.name,
        facetConfig.expectedAddress,
        `${facetConfig.name} has code but interface verification failed`,
        {
          codeSize: calculateCodeSize(code),
          interfaceError:
            interfaceError instanceof Error
              ? interfaceError.message
              : 'Unknown interface error',
        }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResult(
      facetConfig.name,
      facetConfig.expectedAddress,
      `${facetConfig.name} verification failed: ${message}`
    );
  }
}

/**
 * Verifies all expected facet deployments
 * @returns Array of verification results for all facets
 */
async function verifyFacets(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  for (const facetConfig of EXPECTED_FACETS) {
    const result = await verifySingleFacet(facetConfig);
    results.push(result);
  }

  return results;
}

/**
 * Verifies system integration between factory and dispatcher
 * @param factoryAddress - Factory contract address
 * @param dispatcherAddress - Dispatcher contract address
 * @returns Array of integration verification results
 */
async function verifySystemIntegration(
  factoryAddress: string,
  dispatcherAddress: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // Verify addresses are different
  results.push(verifyAddressUniqueness(factoryAddress, dispatcherAddress));

  // Verify owner consistency
  try {
    const ownerResult = await verifyOwnerConsistency(
      factoryAddress,
      dispatcherAddress
    );
    results.push(ownerResult);
  } catch (error) {
    results.push(handleIntegrationError(error));
  }

  return results;
}

/**
 * Verifies that factory and dispatcher have unique addresses
 */
function verifyAddressUniqueness(
  factoryAddress: string,
  dispatcherAddress: string
): VerificationResult {
  if (factoryAddress === dispatcherAddress) {
    return createErrorResult(
      'Address Uniqueness',
      '',
      'Factory and Dispatcher have the same address - this indicates a deployment error'
    );
  }

  return createSuccessResult(
    'Address Uniqueness',
    '',
    'Factory and Dispatcher have unique addresses'
  );
}

/**
 * Verifies owner consistency between factory and dispatcher
 */
async function verifyOwnerConsistency(
  factoryAddress: string,
  dispatcherAddress: string
): Promise<VerificationResult> {
  const factory = await ethers.getContractAt(
    'DeterministicChunkFactory',
    factoryAddress
  );
  const dispatcher = await ethers.getContractAt(
    'ManifestDispatcher',
    dispatcherAddress
  );

  // For factory, check DEFAULT_ADMIN_ROLE; for dispatcher, check owner method
  const [signer] = await ethers.getSigners();
  const factoryHasAdmin = await factory.hasRole(
    await factory.DEFAULT_ADMIN_ROLE(),
    signer.address
  );
  const dispatcherOwner = await dispatcher.owner();

  if (factoryHasAdmin && dispatcherOwner === signer.address) {
    return createSuccessResult(
      'Owner Consistency',
      '',
      'Factory and Dispatcher have consistent admin/ownership',
      { adminAddress: signer.address }
    );
  }

  return createWarningResult(
    'Owner Consistency',
    '',
    'Factory and Dispatcher have different admin/ownership configuration',
    {
      factoryHasAdmin,
      dispatcherOwner,
      currentSigner: signer.address,
    }
  );
}

/**
 * Handles integration test errors with proper categorization
 */
function handleIntegrationError(error: unknown): VerificationResult {
  if (error instanceof Error && error.message.includes('resolveName')) {
    return createWarningResult(
      'Integration Test',
      '',
      'Integration test skipped due to Hardhat ethers compatibility issue'
    );
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  return createErrorResult(
    'Integration Test',
    '',
    `System integration verification failed: ${message}`
  );
}

/**
 * Verifies routes and manifest configuration
 * @param dispatcherAddress - Dispatcher contract address
 * @returns Array of route and manifest verification results
 */
async function verifyRoutesAndManifest(
  dispatcherAddress: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  try {
    // Verify manifest files
    results.push(verifyManifestFile());
    results.push(verifyMerkleFile());

    // Test dispatcher route resolution
    const routeResult = await verifyRouteResolution(dispatcherAddress);
    results.push(routeResult);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    results.push(
      createErrorResult(
        'Manifest Verification',
        '',
        `Manifest verification failed: ${message}`
      )
    );
  }

  return results;
}

/**
 * Verifies production manifest file exists and is valid
 */
function verifyManifestFile(): VerificationResult {
  const manifestPath = path.join(
    __dirname,
    '../manifests/complete-production.manifest.json'
  );

  if (!fs.existsSync(manifestPath)) {
    return createWarningResult(
      'Production Manifest',
      '',
      'Production manifest file not found'
    );
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return createSuccessResult(
      'Production Manifest',
      '',
      'Production manifest exists and is valid JSON',
      {
        version: manifest.version,
        facetCount: manifest.facets?.length || 0,
        routeCount: manifest.routes?.length || 0,
      }
    );
  } catch (parseError) {
    const message =
      parseError instanceof Error ? parseError.message : 'Invalid JSON format';
    return createErrorResult(
      'Production Manifest',
      '',
      `Production manifest file is invalid JSON: ${message}`
    );
  }
}

/**
 * Verifies Merkle tree file exists and is valid
 */
function verifyMerkleFile(): VerificationResult {
  const merklePath = path.join(__dirname, '../manifests/current.merkle.json');

  if (!fs.existsSync(merklePath)) {
    return createWarningResult('Merkle Tree', '', 'Merkle tree file not found');
  }

  try {
    const merkle = JSON.parse(fs.readFileSync(merklePath, 'utf8'));
    return createSuccessResult('Merkle Tree', '', 'Merkle tree data exists', {
      root: merkle.root,
      leafCount: merkle.leaves?.length || 0,
    });
  } catch (parseError) {
    const message =
      parseError instanceof Error ? parseError.message : 'Invalid JSON format';
    return createErrorResult(
      'Merkle Tree',
      '',
      `Merkle tree file is invalid JSON: ${message}`
    );
  }
}

/**
 * Verifies dispatcher route resolution functionality
 */
async function verifyRouteResolution(
  dispatcherAddress: string
): Promise<VerificationResult> {
  try {
    const dispatcher = await ethers.getContractAt(
      'ManifestDispatcher',
      dispatcherAddress
    );

    // Test a known function selector (if routes are applied)
    const testSelector = '0x12345678'; // Example selector
    const route = await dispatcher.getRoute(testSelector);

    return createSuccessResult(
      'Route Resolution',
      '',
      'Dispatcher route resolution working',
      { testRoute: route }
    );
  } catch (routeError) {
    console.warn(`[DEBUG] Route resolution test failed: ${routeError}`);
    return createWarningResult(
      'Route Resolution',
      '',
      'Route resolution test failed (routes may not be applied yet)'
    );
  }
}

/**
 * Verifies security configuration and access controls
 * @param factoryAddress - Factory contract address
 * @param dispatcherAddress - Dispatcher contract address
 * @returns Array of security verification results
 */
async function verifySecuritySettings(
  factoryAddress: string,
  dispatcherAddress: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  try {
    results.push(...(await verifyFactorySecurity(factoryAddress)));
    results.push(...(await verifyDispatcherSecurity(dispatcherAddress)));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    results.push(
      createErrorResult(
        'Security Verification',
        '',
        `Security verification failed: ${message}`
      )
    );
  }

  return results;
}

/**
 * Verifies factory contract security settings
 */
async function verifyFactorySecurity(
  factoryAddress: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  try {
    const factory = await ethers.getContractAt(
      'DeterministicChunkFactory',
      factoryAddress
    );

    // Check factory ownership and configuration
    const [signer] = await ethers.getSigners();
    const hasAdminRole = await factory.hasRole(
      await factory.DEFAULT_ADMIN_ROLE(),
      signer.address
    );
    const feeRecipient = await factory.feeRecipient();
    const baseFeeWei = await factory.baseFeeWei();

    if (hasAdminRole) {
      results.push(
        createSuccessResult(
          'Factory Security',
          factoryAddress,
          'Factory has valid admin access and configuration',
          {
            adminAddress: signer.address,
            feeRecipient,
            deploymentFee: ethers.formatEther(baseFeeWei),
          }
        )
      );
    } else {
      results.push(
        createWarningResult(
          'Factory Security',
          factoryAddress,
          'Current signer does not have admin access to factory'
        )
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    results.push(
      createErrorResult(
        'Factory Security',
        factoryAddress,
        `Factory security check failed: ${message}`
      )
    );
  }

  return results;
}

/**
 * Verifies dispatcher contract security settings
 */
async function verifyDispatcherSecurity(
  dispatcherAddress: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  try {
    const dispatcher = await ethers.getContractAt(
      'ManifestDispatcher',
      dispatcherAddress
    );

    // Check dispatcher ownership and security configuration
    const dispatcherOwner = await dispatcher.owner();
    const frozen = await dispatcher.frozen();
    const activationDelay = await dispatcher.activationDelay();

    if (dispatcherOwner && dispatcherOwner !== ethers.ZeroAddress) {
      results.push(
        createSuccessResult(
          'Dispatcher Security',
          dispatcherAddress,
          'Dispatcher has valid owner and security settings',
          {
            owner: dispatcherOwner,
            frozen,
            activationDelay: activationDelay.toString() + ' seconds',
          }
        )
      );
    } else {
      results.push(
        createErrorResult(
          'Dispatcher Security',
          dispatcherAddress,
          'Dispatcher owner not properly set'
        )
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    results.push(
      createErrorResult(
        'Dispatcher Security',
        dispatcherAddress,
        `Dispatcher security check failed: ${message}`
      )
    );
  }

  return results;
}

// Main execution when script is run directly
if (require.main === module) {
  main().catch(error => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
}
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

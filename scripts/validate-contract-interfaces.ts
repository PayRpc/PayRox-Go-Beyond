import { ethers } from 'hardhat';
import { logInfo, logSuccess, logWarning, wrapMain } from '../src/utils/errors';
import { getNetworkManager } from '../src/utils/network';
import {
  fileExists,
  getPathManager,
  readFileContent,
  safeParseJSON,
} from '../src/utils/paths';

interface ContractValidation {
  name: string;
  address: string;
  hasCode: boolean;
  interfaceValid: boolean;
  methods: string[];
  errors: string[];
}

async function validateContractInterface(
  contractName: string,
  address: string,
  expectedInterface: string[]
): Promise<ContractValidation> {
  const validation: ContractValidation = {
    name: contractName,
    address,
    hasCode: false,
    interfaceValid: false,
    methods: [],
    errors: [],
  };

  try {
    // Check if contract exists
    const code = await ethers.provider.getCode(address);
    if (code === '0x') {
      validation.errors.push('No contract code found at address');
      return validation;
    }
    validation.hasCode = true;

    // Try to connect to contract
    let contract;
    try {
      contract = await ethers.getContractAt(contractName, address);
    } catch (error) {
      validation.errors.push(`Failed to connect to contract: ${error}`);
      return validation;
    }

    // Validate expected methods exist
    const missingMethods: string[] = [];
    const availableMethods: string[] = [];

    for (const method of expectedInterface) {
      try {
        if (typeof contract[method] === 'function') {
          availableMethods.push(method);
        } else {
          missingMethods.push(method);
        }
      } catch {
        missingMethods.push(method);
      }
    }

    validation.methods = availableMethods;

    if (missingMethods.length > 0) {
      validation.errors.push(`Missing methods: ${missingMethods.join(', ')}`);
    } else {
      validation.interfaceValid = true;
    }
  } catch (error) {
    validation.errors.push(`Validation error: ${error}`);
  }

  return validation;
}

async function main(): Promise<void> {
  logInfo('Starting comprehensive contract interface validation...');

  const pathManager = getPathManager();
  const networkManager = getNetworkManager();

  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId.toString();
  const networkDetection = networkManager.determineNetworkName(chainId);
  const networkName = networkDetection.networkName;

  logInfo(`Network: ${networkName} (Chain ID: ${chainId})`);

  const validations: ContractValidation[] = [];

  // Validate Factory
  const factoryPath = pathManager.getDeploymentPath(
    networkName,
    'factory.json'
  );
  if (fileExists(factoryPath)) {
    const factoryData = safeParseJSON(readFileContent(factoryPath));
    const factoryValidation = await validateContractInterface(
      'DeterministicChunkFactory',
      factoryData.address,
      ['baseFeeWei', 'feesEnabled', 'feeRecipient', 'predict', 'stage']
    );
    validations.push(factoryValidation);
  } else {
    logWarning('Factory deployment artifact not found');
  }

  // Validate Dispatcher
  const dispatcherPath = pathManager.getDeploymentPath(
    networkName,
    'dispatcher.json'
  );
  if (fileExists(dispatcherPath)) {
    const dispatcherData = safeParseJSON(readFileContent(dispatcherPath));
    const dispatcherValidation = await validateContractInterface(
      'ManifestDispatcher',
      dispatcherData.address,
      [
        'activeEpoch',
        'pendingEpoch',
        'activeRoot',
        'pendingRoot',
        'commitRoot',
        'activateCommittedRoot',
      ]
    );
    validations.push(dispatcherValidation);
  } else {
    logWarning('Dispatcher deployment artifact not found');
  }

  // Validate Facets
  const facetFiles = [
    'ExampleFacetA.json',
    'ExampleFacetB.json',
    'facet-a.json',
    'facet-b.json',
  ];

  for (const facetFile of facetFiles) {
    const facetPath = pathManager.getDeploymentPath(networkName, facetFile);
    if (fileExists(facetPath)) {
      const facetData = safeParseJSON(readFileContent(facetPath));
      const contractName =
        facetFile.includes('FacetA') || facetFile.includes('facet-a')
          ? 'ExampleFacetA'
          : 'ExampleFacetB';

      const expectedMethods =
        contractName === 'ExampleFacetA'
          ? [
              'executeA',
              'storeData',
              'getData',
              'getUserCount',
              'totalExecutions',
              'lastCaller',
            ]
          : [
              'executeB',
              'batchExecuteB',
              'getOperation',
              'getUserOperations',
              'getStateSummary',
              'setPaused',
            ];

      const facetValidation = await validateContractInterface(
        contractName,
        facetData.address,
        expectedMethods
      );
      validations.push(facetValidation);
    }
  }

  // Report Results
  console.log('\n📊 Contract Interface Validation Results');
  console.log('========================================');

  let allValid = true;
  for (const validation of validations) {
    const status = validation.interfaceValid ? '✅ VALID' : '❌ INVALID';
    const codeStatus = validation.hasCode ? 'Has Code' : 'No Code';

    console.log(`\n📋 ${validation.name}:`);
    console.log(`   Address: ${validation.address}`);
    console.log(`   Status: ${status} (${codeStatus})`);
    console.log(`   Methods: ${validation.methods.length} available`);

    if (validation.errors.length > 0) {
      allValid = false;
      console.log(`   Errors:`);
      validation.errors.forEach(error => console.log(`     - ${error}`));
    }
  }

  console.log('\n🎯 Summary:');
  const validCount = validations.filter(v => v.interfaceValid).length;
  console.log(`   Valid contracts: ${validCount}/${validations.length}`);

  if (allValid) {
    logSuccess('All contract interfaces validated successfully!');
  } else {
    logWarning('Some contract interfaces have issues');
  }
}

wrapMain(
  main,
  'Contract interface validation completed',
  'Interface Validation'
);

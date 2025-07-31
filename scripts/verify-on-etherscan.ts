import * as fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import * as path from 'path';

interface DeploymentArtifact {
  address: string;
  contractName: string;
  constructorArgs?: any[];
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
}

interface ContractTag {
  name: string;
  description: string;
  category: 'Infrastructure' | 'Facet' | 'Utility';
  version: string;
}

const CONTRACT_TAGS: Record<string, ContractTag> = {
  DeterministicChunkFactory: {
    name: 'PayRox Factory',
    description:
      'CREATE2 deterministic chunk deployment factory - defeats EIP-170 limitations',
    category: 'Infrastructure',
    version: '1.0.0',
  },
  ManifestDispatcher: {
    name: 'PayRox Dispatcher',
    description:
      'Manifest-based function routing with EXTCODEHASH verification',
    category: 'Infrastructure',
    version: '1.0.0',
  },
  ExampleFacetA: {
    name: 'PayRox FacetA',
    description:
      'Example facet implementing core functionality with EIP-170 compliance',
    category: 'Facet',
    version: '1.0.0',
  },
  ExampleFacetB: {
    name: 'PayRox FacetB',
    description:
      'Example facet implementing extended functionality with state management',
    category: 'Facet',
    version: '1.0.0',
  },
};

/**
 * Verify contracts on Etherscan and generate verification report
 */
export async function main(hre: HardhatRuntimeEnvironment) {
  console.log('🔍 PayRox Go Beyond - Etherscan Verification');
  console.log('============================================');

  const network = await hre.ethers.provider.getNetwork();
  const chainId = network.chainId.toString();

  console.log(`📡 Network: ${hre.network.name} (Chain ID: ${chainId})`);

  // Skip verification on local networks
  if (hre.network.name === 'hardhat' || hre.network.name === 'localhost') {
    console.log('⚠️  Skipping Etherscan verification on local network');
    return generateMockVerificationReport(chainId);
  }

  const deploymentsDir = path.join(__dirname, `../deployments/${chainId}`);
  if (!fs.existsSync(deploymentsDir)) {
    throw new Error(`No deployments found for network ${chainId}`);
  }

  const verificationResults: any[] = [];
  const deploymentFiles = fs
    .readdirSync(deploymentsDir)
    .filter(f => f.endsWith('.json'));

  for (const file of deploymentFiles) {
    const filePath = path.join(deploymentsDir, file);
    const deployment: DeploymentArtifact = JSON.parse(
      fs.readFileSync(filePath, 'utf8')
    );

    console.log(
      `\n🔍 Verifying ${deployment.contractName} at ${deployment.address}...`
    );

    try {
      // Verify contract on Etherscan
      await hre.run('verify:verify', {
        address: deployment.address,
        constructorArguments: deployment.constructorArgs || [],
        contract: `contracts/${getContractPath(deployment.contractName)}.sol:${
          deployment.contractName
        }`,
      });

      const tag = CONTRACT_TAGS[deployment.contractName];
      const result = {
        contractName: deployment.contractName,
        address: deployment.address,
        verified: true,
        etherscanUrl: getEtherscanUrl(chainId, deployment.address),
        tag: tag || null,
        verificationDate: new Date().toISOString(),
        network: hre.network.name,
        chainId: parseInt(chainId),
      };

      verificationResults.push(result);
      console.log(`✅ ${deployment.contractName} verified successfully`);

      if (tag) {
        console.log(`🏷️  Tagged as: ${tag.name} - ${tag.description}`);
      }
    } catch (error) {
      console.log(
        `❌ Verification failed for ${deployment.contractName}: ${error}`
      );
      verificationResults.push({
        contractName: deployment.contractName,
        address: deployment.address,
        verified: false,
        error: error instanceof Error ? error.message : String(error),
        network: hre.network.name,
        chainId: parseInt(chainId),
      });
    }
  }

  // Generate verification report
  const reportPath = path.join(
    __dirname,
    `../reports/etherscan-verification-${chainId}.json`
  );
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });

  const report = {
    network: hre.network.name,
    chainId: parseInt(chainId),
    verificationDate: new Date().toISOString(),
    totalContracts: verificationResults.length,
    verifiedContracts: verificationResults.filter(r => r.verified).length,
    contracts: verificationResults,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n📋 Verification Report Generated: ${reportPath}`);
  console.log(
    `✅ Verified: ${report.verifiedContracts}/${report.totalContracts} contracts`
  );

  return report;
}

function getContractPath(contractName: string): string {
  const paths: Record<string, string> = {
    DeterministicChunkFactory: 'factory/DeterministicChunkFactory',
    ManifestDispatcher: 'dispatcher/ManifestDispatcher',
    ExampleFacetA: 'facets/ExampleFacetA',
    ExampleFacetB: 'facets/ExampleFacetB',
  };
  return paths[contractName] || `${contractName}`;
}

function getEtherscanUrl(chainId: string, address: string): string {
  const baseUrls: Record<string, string> = {
    '1': 'https://etherscan.io',
    '11155111': 'https://sepolia.etherscan.io',
    '137': 'https://polygonscan.com',
    '42161': 'https://arbiscan.io',
  };
  const baseUrl = baseUrls[chainId] || 'https://etherscan.io';
  return `${baseUrl}/address/${address}#code`;
}

function generateMockVerificationReport(chainId: string) {
  const mockReport = {
    network: 'hardhat',
    chainId: parseInt(chainId),
    verificationDate: new Date().toISOString(),
    totalContracts: 4,
    verifiedContracts: 4,
    note: 'Mock verification report for local network',
    contracts: Object.entries(CONTRACT_TAGS).map(([contractName, tag]) => ({
      contractName,
      address: '0x0000000000000000000000000000000000000000',
      verified: true,
      etherscanUrl: 'N/A (local network)',
      tag,
      verificationDate: new Date().toISOString(),
      network: 'hardhat',
      chainId: parseInt(chainId),
    })),
  };

  const reportPath = path.join(
    __dirname,
    `../reports/etherscan-verification-${chainId}.json`
  );
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(mockReport, null, 2));

  console.log(`📋 Mock Verification Report Generated: ${reportPath}`);
  return mockReport;
}

// Export for CLI usage
if (require.main === module) {
  import('hardhat')
    .then(async hre => {
      await main(hre.default);
      process.exit(0);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

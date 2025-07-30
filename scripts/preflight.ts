import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as fs from "fs";
import * as path from "path";

/**
 * Preflight checks before deployment
 */
export async function main(hre: HardhatRuntimeEnvironment) {
  console.log("🔍 Running preflight checks...");
  
  const { ethers, network } = hre;
  const [deployer] = await ethers.getSigners();
  
  // Check 1: Network configuration
  console.log("📡 Checking network configuration...");
  const networkConfig = await checkNetworkConfig(network.name);
  
  // Check 2: Deployer balance
  console.log("💰 Checking deployer balance...");
  await checkDeployerBalance(deployer, ethers);
  
  // Check 3: Contract compilation
  console.log("🔨 Checking contract compilation...");
  await checkContractCompilation(hre);
  
  // Check 4: Configuration files
  console.log("⚙️ Checking configuration files...");
  await checkConfigurationFiles();
  
  // Check 5: Directory structure
  console.log("📁 Checking directory structure...");
  await checkDirectoryStructure();
  
  // Check 6: Security policies
  console.log("🔐 Checking security policies...");
  await checkSecurityPolicies();
  
  console.log("✅ All preflight checks passed!");
  return true;
}

async function checkNetworkConfig(networkName: string) {
  const networksPath = path.join(__dirname, "..", "config", "networks.json");
  
  if (!fs.existsSync(networksPath)) {
    throw new Error("Networks configuration file not found");
  }
  
  const networks = JSON.parse(fs.readFileSync(networksPath, "utf8"));
  
  if (!networks[networkName] && networkName !== "hardhat" && networkName !== "localhost") {
    throw new Error(`Network configuration not found for: ${networkName}`);
  }
  
  console.log(`  ✓ Network ${networkName} configuration found`);
  return networks[networkName];
}

async function checkDeployerBalance(deployer: any, ethers: any) {
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceInEth = ethers.formatEther(balance);
  
  console.log(`  ✓ Deployer: ${deployer.address}`);
  console.log(`  ✓ Balance: ${balanceInEth} ETH`);
  
  // Minimum balance check (0.1 ETH for mainnet, 0.01 ETH for testnets)
  const minBalance = ethers.parseEther("0.01");
  
  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Minimum required: ${ethers.formatEther(minBalance)} ETH`);
  }
}

async function checkContractCompilation(hre: HardhatRuntimeEnvironment) {
  try {
    // Check if artifacts exist
    const artifactsPath = path.join(__dirname, "..", "artifacts");
    
    if (!fs.existsSync(artifactsPath)) {
      console.log("  🔨 Compiling contracts...");
      await hre.run("compile");
    }
    
    // Check specific contracts
    const requiredContracts = [
      "DeterministicChunkFactory",
      "ManifestDispatcher",
      "Orchestrator",
      "ExampleFacetA",
      "ExampleFacetB"
    ];
    
    for (const contractName of requiredContracts) {
      const artifact = await hre.artifacts.readArtifact(contractName);
      if (!artifact) {
        throw new Error(`Contract artifact not found: ${contractName}`);
      }
      console.log(`  ✓ ${contractName} compiled`);
    }
    
  } catch (error) {
    throw new Error(`Contract compilation failed: ${error}`);
  }
}

async function checkConfigurationFiles() {
  const configFiles = [
    "config/networks.json",
    "config/app.release.yaml",
    "config/security.json"
  ];
  
  for (const configFile of configFiles) {
    const filePath = path.join(__dirname, "..", configFile);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Configuration file not found: ${configFile}`);
    }
    
    // Validate JSON files
    if (configFile.endsWith(".json")) {
      try {
        JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (error) {
        throw new Error(`Invalid JSON in ${configFile}: ${error}`);
      }
    }
    
    console.log(`  ✓ ${configFile} exists and valid`);
  }
}

async function checkDirectoryStructure() {
  const requiredDirs = [
    "contracts/factory",
    "contracts/dispatcher",
    "contracts/orchestrator",
    "contracts/manifest",
    "contracts/facets",
    "scripts",
    "tasks",
    "config",
    "test"
  ];
  
  for (const dir of requiredDirs) {
    const dirPath = path.join(__dirname, "..", dir);
    
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`  📁 Created directory: ${dir}`);
    } else {
      console.log(`  ✓ Directory exists: ${dir}`);
    }
  }
  
  // Create output directories
  const outputDirs = [
    "manifests",
    "releases",
    "deployments"
  ];
  
  for (const dir of outputDirs) {
    const dirPath = path.join(__dirname, "..", dir);
    
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`  📁 Created output directory: ${dir}`);
    }
  }
}

async function checkSecurityPolicies() {
  const securityPath = path.join(__dirname, "..", "config", "security.json");
  
  if (!fs.existsSync(securityPath)) {
    throw new Error("Security configuration not found");
  }
  
  const security = JSON.parse(fs.readFileSync(securityPath, "utf8"));
  
  // Validate security policies
  const requiredPolicies = [
    "security.maxFacetSize",
    "security.maxFacetCount",
    "invariants.totalGasLimit",
    "policy.allowUpgrades"
  ];
  
  for (const policy of requiredPolicies) {
    const keys = policy.split(".");
    let current = security;
    
    for (const key of keys) {
      if (!(key in current)) {
        throw new Error(`Missing security policy: ${policy}`);
      }
      current = current[key];
    }
    
    console.log(`  ✓ Security policy ${policy}: ${current}`);
  }
  
  // Check facet size limits
  if (security.security.maxFacetSize > 24576) {
    console.warn(`  ⚠️  Warning: Max facet size (${security.security.maxFacetSize}) exceeds Ethereum limit (24KB)`);
  }
  
  // Check gas limits
  if (security.invariants.totalGasLimit > 30000000) {
    console.warn(`  ⚠️  Warning: Total gas limit (${security.invariants.totalGasLimit}) exceeds block limit`);
  }
}

// Export for CLI usage
if (require.main === module) {
  main({} as HardhatRuntimeEnvironment)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

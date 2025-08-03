"use strict";
/**
 * Cross-Chain Utilities for PayRox Go Beyond
 * Enables deterministic deployment and manifest synchronization across EVM networks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossChainNetworkManager = exports.CrossChainManifestSync = exports.CrossChainOrchestrator = exports.CrossChainSaltGenerator = void 0;
const ethers_1 = require("ethers");
/* ═══════════════════════════════════════════════════════════════════════════
   CROSS-CHAIN SALT GENERATION
   ═══════════════════════════════════════════════════════════════════════════ */
class CrossChainSaltGenerator {
    /**
     * Generate a deterministic salt that works consistently across all EVM networks
     * This enhances the existing PayRox salt system with cross-chain compatibility
     */
    static generateUniversalSalt(config) {
        // Combine all deterministic factors for cross-chain consistency
        const packed = ethers_1.ethers.solidityPacked(['string', 'address', 'string', 'uint256', 'string'], [
            'PayRoxCrossChain',
            config.deployer,
            config.baseContent,
            config.crossChainNonce,
            config.version,
        ]);
        return ethers_1.ethers.keccak256(packed);
    }
    /**
     * Enhance existing PayRox chunk salt with cross-chain factors
     * Maintains compatibility with existing CREATE2 predictions
     */
    static enhanceChunkSalt(contentHash, crossChainNonce) {
        // Build on existing PayRox pattern: keccak256("chunk:" || keccak256(data))
        const baseChunkSalt = ethers_1.ethers.keccak256(ethers_1.ethers.solidityPacked(['string', 'bytes32'], ['chunk:', contentHash]));
        // Add cross-chain consistency factor
        return ethers_1.ethers.keccak256(ethers_1.ethers.solidityPacked(['bytes32', 'uint256', 'string'], [baseChunkSalt, crossChainNonce, 'CrossChainV1']));
    }
    /**
     * Predict CREATE2 address for any EVM network
     */
    static predictCrossChainAddress(factoryAddress, salt, bytecodeHash) {
        return ethers_1.ethers.getCreate2Address(factoryAddress, salt, bytecodeHash);
    }
}
exports.CrossChainSaltGenerator = CrossChainSaltGenerator;
/* ═══════════════════════════════════════════════════════════════════════════
   CROSS-CHAIN ORCHESTRATOR
   ═══════════════════════════════════════════════════════════════════════════ */
class CrossChainOrchestrator {
    constructor(networks) {
        this.networks = new Map();
        this.providers = new Map();
        for (const network of networks) {
            this.networks.set(network.name, network);
            // Initialize provider for each network
            if (network.rpcUrl) {
                this.providers.set(network.name, new ethers_1.ethers.JsonRpcProvider(network.rpcUrl));
            }
        }
    }
    /**
     * Deploy contracts across multiple networks with address consistency
     */
    async deployAcrossChains(targetNetworks, contracts, deployerPrivateKey) {
        const deploymentId = ethers_1.ethers.id(`crosschain-${Date.now()}`);
        const deployment = {
            deploymentId,
            networks: targetNetworks,
            contracts: [],
            manifestHash: '',
            timestamp: new Date().toISOString(),
            status: 'pending',
        };
        // Phase 1: Prepare deployment metadata
        await this.prepareDeploymentContracts(deployment, contracts, deployerPrivateKey);
        // Phase 2: Execute network deployments
        const successCount = await this.executeNetworkDeployments(deployment, targetNetworks, deployerPrivateKey);
        // Phase 3: Update deployment status
        deployment.status = this.determineDeploymentStatus(successCount, targetNetworks.length);
        return deployment;
    }
    async prepareDeploymentContracts(deployment, contracts, _deployerPrivateKey) {
        const crossChainNonce = Math.floor(Date.now() / 1000);
        for (const contract of contracts) {
            const contentHash = ethers_1.ethers.keccak256(contract.bytecode);
            const salt = CrossChainSaltGenerator.enhanceChunkSalt(contentHash, crossChainNonce);
            // Predict consistent address (using first network's factory as reference)
            const firstNetwork = this.networks.get(deployment.networks[0]);
            let predictedAddress = '';
            if (firstNetwork?.factoryAddress) {
                predictedAddress = CrossChainSaltGenerator.predictCrossChainAddress(firstNetwork.factoryAddress, salt, ethers_1.ethers.keccak256(contract.bytecode));
            }
            deployment.contracts.push({
                name: contract.name,
                bytecode: contract.bytecode,
                salt,
                predictedAddress,
                actualAddresses: {},
            });
        }
    }
    async executeNetworkDeployments(deployment, targetNetworks, deployerPrivateKey) {
        let successCount = 0;
        for (const networkName of targetNetworks) {
            try {
                const networkSuccess = await this.deployToNetwork(deployment, networkName, deployerPrivateKey);
                if (networkSuccess) {
                    successCount++;
                }
            }
            catch (error) {
                console.error(`Network deployment failed for ${networkName}:`, error);
            }
        }
        return successCount;
    }
    async deployToNetwork(deployment, networkName, deployerPrivateKey) {
        const provider = this.providers.get(networkName);
        const network = this.networks.get(networkName);
        if (!provider || !network || !network.factoryAddress) {
            console.warn(`Skipping deployment on ${networkName}: provider/config not available`);
            return false;
        }
        const wallet = new ethers_1.ethers.Wallet(deployerPrivateKey, provider);
        // Get factory contract
        const factoryAbi = [
            'function stage(bytes calldata data) external payable returns (address chunk, bytes32 hash)',
            'function baseFeeWei() external view returns (uint256)',
        ];
        const factory = new ethers_1.ethers.Contract(network.factoryAddress, factoryAbi, wallet);
        // Deploy each contract on this network
        for (const contract of deployment.contracts) {
            try {
                const baseFee = await factory.baseFeeWei();
                const tx = await factory.stage(contract.bytecode, { value: baseFee });
                const receipt = await tx.wait();
                // Extract deployed address from events
                const deployedAddress = this.extractDeployedAddress(factory, receipt);
                contract.actualAddresses[networkName] = deployedAddress || 'FAILED';
            }
            catch (error) {
                console.error(`Failed to deploy ${contract.name} on ${networkName}:`, error);
                contract.actualAddresses[networkName] = 'FAILED';
            }
        }
        return true;
    }
    extractDeployedAddress(factory, receipt) {
        const stageEvent = receipt?.logs.find((log) => {
            try {
                const parsed = factory.interface.parseLog(log);
                return parsed?.name === 'ChunkDeployed';
            }
            catch {
                return false;
            }
        });
        if (stageEvent) {
            const parsed = factory.interface.parseLog(stageEvent);
            return parsed?.args?.chunk || null;
        }
        return null;
    }
    determineDeploymentStatus(successCount, totalNetworks) {
        if (successCount === 0) {
            return 'failed';
        }
        else if (successCount === totalNetworks) {
            return 'complete';
        }
        else {
            return 'partial';
        }
    }
    /**
     * Verify address consistency across deployed networks
     */
    async verifyAddressConsistency(deployment) {
        const report = {
            deploymentId: deployment.deploymentId,
            consistent: true,
            networks: deployment.networks,
            expectedAddresses: {},
            actualAddresses: {},
            discrepancies: [],
        };
        for (const contract of deployment.contracts) {
            report.expectedAddresses[contract.name] = contract.predictedAddress;
            report.actualAddresses[contract.name] = contract.actualAddresses;
            // Check consistency across networks
            for (const [network, actualAddress] of Object.entries(contract.actualAddresses)) {
                if (actualAddress &&
                    actualAddress !== 'FAILED' &&
                    actualAddress !== contract.predictedAddress) {
                    report.consistent = false;
                    report.discrepancies.push({
                        network,
                        contract: contract.name,
                        expected: contract.predictedAddress,
                        actual: actualAddress,
                    });
                }
            }
        }
        return report;
    }
}
exports.CrossChainOrchestrator = CrossChainOrchestrator;
/* ═══════════════════════════════════════════════════════════════════════════
   MANIFEST SYNCHRONIZATION
   ═══════════════════════════════════════════════════════════════════════════ */
class CrossChainManifestSync {
    constructor(networks) {
        this.networks = new Map();
        this.providers = new Map();
        for (const network of networks) {
            this.networks.set(network.name, network);
            if (network.rpcUrl) {
                this.providers.set(network.name, new ethers_1.ethers.JsonRpcProvider(network.rpcUrl));
            }
        }
    }
    /**
     * Create a cross-chain manifest from individual network manifests
     */
    async createCrossChainManifest(sourceNetwork, targetNetworks, deployment) {
        const crossChainId = ethers_1.ethers.id(`manifest-${deployment.deploymentId}`);
        const manifest = {
            version: '1.0.0',
            crossChainId,
            networks: {},
            contracts: [],
            routes: [],
            syncStatus: {},
        };
        // Build network configurations
        for (const networkName of [sourceNetwork, ...targetNetworks]) {
            const network = this.networks.get(networkName);
            if (network) {
                manifest.networks[networkName] = {
                    chainId: network.chainId,
                    factoryAddress: network.factoryAddress || '',
                    dispatcherAddress: network.dispatcherAddress || '',
                    manifestHash: '', // To be populated
                    timestamp: new Date().toISOString(),
                };
                manifest.syncStatus[networkName] = 'pending';
            }
        }
        // Build contract mappings
        for (const contract of deployment.contracts) {
            manifest.contracts.push({
                name: contract.name,
                salt: contract.salt,
                addresses: contract.actualAddresses,
            });
        }
        return manifest;
    }
    /**
     * Synchronize manifest across networks using batch operations
     */
    async synchronizeManifest(manifest, deployerPrivateKey) {
        const updatedManifest = { ...manifest };
        const syncPromises = Object.entries(manifest.networks).map(([networkName, networkConfig]) => this.syncNetworkManifest(networkName, networkConfig, manifest, deployerPrivateKey, updatedManifest));
        await Promise.allSettled(syncPromises);
        return updatedManifest;
    }
    async syncNetworkManifest(networkName, networkConfig, manifest, deployerPrivateKey, updatedManifest) {
        try {
            const provider = this.providers.get(networkName);
            if (!provider) {
                console.warn(`No provider available for ${networkName}`);
                updatedManifest.syncStatus[networkName] = 'failed';
                return;
            }
            const wallet = new ethers_1.ethers.Wallet(deployerPrivateKey, provider);
            // Get dispatcher contract
            const dispatcherAbi = [
                'function commitRoot(bytes32 newRoot, uint64 newEpoch) external',
                'function activateCommittedRoot() external',
                'function activeRoot() external view returns (bytes32)',
                'function activeEpoch() external view returns (uint64)',
            ];
            const dispatcher = new ethers_1.ethers.Contract(networkConfig.dispatcherAddress, dispatcherAbi, wallet);
            // Generate network-specific manifest hash
            const networkManifestData = {
                crossChainId: manifest.crossChainId,
                network: networkName,
                contracts: manifest.contracts,
                routes: manifest.routes,
                timestamp: networkConfig.timestamp,
            };
            const manifestHash = ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes(JSON.stringify(networkManifestData)));
            // Commit and activate manifest
            const currentEpoch = await dispatcher.activeEpoch();
            const nextEpoch = currentEpoch + 1n;
            const commitTx = await dispatcher.commitRoot(manifestHash, nextEpoch);
            await commitTx.wait();
            const activateTx = await dispatcher.activateCommittedRoot();
            await activateTx.wait();
            // Update manifest with successful sync
            updatedManifest.networks[networkName].manifestHash = manifestHash;
            updatedManifest.syncStatus[networkName] = 'synced';
        }
        catch (error) {
            console.error(`Failed to sync manifest on ${networkName}:`, error);
            updatedManifest.syncStatus[networkName] = 'failed';
        }
    }
    /**
     * Verify manifest consistency across networks
     */
    async verifyManifestSync(manifest) {
        const syncedNetworks = [];
        const failedNetworks = [];
        const details = {};
        for (const [networkName, status] of Object.entries(manifest.syncStatus)) {
            if (status === 'synced') {
                syncedNetworks.push(networkName);
            }
            else {
                failedNetworks.push(networkName);
            }
            details[networkName] = {
                status,
                manifestHash: manifest.networks[networkName]?.manifestHash || '',
                timestamp: manifest.networks[networkName]?.timestamp || '',
            };
        }
        return {
            consistent: failedNetworks.length === 0,
            syncedNetworks,
            failedNetworks,
            details,
        };
    }
}
exports.CrossChainManifestSync = CrossChainManifestSync;
/* ═══════════════════════════════════════════════════════════════════════════
   NETWORK UTILITIES
   ═══════════════════════════════════════════════════════════════════════════ */
class CrossChainNetworkManager {
    /**
     * Validate network configuration for cross-chain deployment
     */
    static validateNetworkConfig(networks) {
        const errors = [];
        const warnings = [];
        for (const network of networks) {
            if (!network.factoryAddress) {
                errors.push(`Missing factory address for network: ${network.name}`);
            }
            if (!network.dispatcherAddress) {
                errors.push(`Missing dispatcher address for network: ${network.name}`);
            }
            if (!network.rpcUrl) {
                warnings.push(`No RPC URL configured for network: ${network.name}`);
            }
            if (!network.chainId) {
                errors.push(`Missing chain ID for network: ${network.name}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    /**
     * Check network connectivity and contract availability
     */
    static async healthCheck(networks) {
        const results = {};
        for (const network of networks) {
            try {
                if (!network.rpcUrl) {
                    results[network.name] = {
                        connected: false,
                        factoryAvailable: false,
                        dispatcherAvailable: false,
                        error: 'No RPC URL configured',
                    };
                    continue;
                }
                const provider = new ethers_1.ethers.JsonRpcProvider(network.rpcUrl);
                const blockNumber = await provider.getBlockNumber();
                // Check factory contract
                let factoryAvailable = false;
                if (network.factoryAddress) {
                    const factoryCode = await provider.getCode(network.factoryAddress);
                    factoryAvailable = factoryCode !== '0x';
                }
                // Check dispatcher contract
                let dispatcherAvailable = false;
                if (network.dispatcherAddress) {
                    const dispatcherCode = await provider.getCode(network.dispatcherAddress);
                    dispatcherAvailable = dispatcherCode !== '0x';
                }
                results[network.name] = {
                    connected: true,
                    factoryAvailable,
                    dispatcherAvailable,
                    blockNumber,
                };
            }
            catch (error) {
                results[network.name] = {
                    connected: false,
                    factoryAvailable: false,
                    dispatcherAvailable: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        }
        return results;
    }
}
exports.CrossChainNetworkManager = CrossChainNetworkManager;

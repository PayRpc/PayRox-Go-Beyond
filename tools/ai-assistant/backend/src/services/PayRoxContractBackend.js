"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.payRoxBackend = exports.PayRoxContractBackend = void 0;
const ethers_1 = require("ethers");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Backend service for PayRox contract integration
 * Provides server-side access to deployed contracts
 */
class PayRoxContractBackend {
    constructor(rpcUrl = 'http://localhost:8545') {
        this.configPath = path.join(__dirname, '../../../config/deployed-contracts.json');
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        this.contracts = this.loadContracts();
        this.network = this.loadNetworkConfig();
    }
    /**
     * Load deployed contracts configuration
     */
    loadContracts() {
        try {
            const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            return {
                core: {
                    factory: {
                        name: configData.contracts.core.factory.name,
                        address: configData.contracts.core.factory.address,
                        abi: this.loadABI('factory/DeterministicChunkFactory.sol/DeterministicChunkFactory.json'),
                        deploymentFile: configData.contracts.core.factory.deploymentFile,
                    },
                    dispatcher: {
                        name: configData.contracts.core.dispatcher.name,
                        address: configData.contracts.core.dispatcher.address,
                        abi: this.loadABI('dispatcher/ManifestDispatcher.sol/ManifestDispatcher.json'),
                        deploymentFile: configData.contracts.core.dispatcher.deploymentFile,
                    },
                },
                orchestrators: {
                    main: {
                        name: configData.contracts.orchestrators.main.name,
                        address: configData.contracts.orchestrators.main.address,
                        abi: this.loadABI('orchestrator/Orchestrator.sol/Orchestrator.json'),
                        deploymentFile: configData.contracts.orchestrators.main.deploymentFile,
                    },
                    governance: {
                        name: configData.contracts.orchestrators.governance.name,
                        address: configData.contracts.orchestrators.governance.address,
                        abi: this.loadABI('orchestrator/GovernanceOrchestrator.sol/GovernanceOrchestrator.json'),
                        deploymentFile: configData.contracts.orchestrators.governance.deploymentFile,
                    },
                    auditRegistry: {
                        name: configData.contracts.orchestrators.auditRegistry.name,
                        address: configData.contracts.orchestrators.auditRegistry.address,
                        abi: this.loadABI('orchestrator/AuditRegistry.sol/AuditRegistry.json'),
                        deploymentFile: configData.contracts.orchestrators.auditRegistry.deploymentFile,
                    },
                },
                facets: {
                    ping: {
                        name: configData.contracts.facets.ping.name,
                        address: configData.contracts.facets.ping.address,
                        abi: this.loadABI('facets/PingFacet.sol/PingFacet.json'),
                        deploymentFile: configData.contracts.facets.ping.deploymentFile,
                    },
                },
            };
        }
        catch (error) {
            console.error('Failed to load contracts configuration:', error);
            throw new Error('Contract configuration not found. Run deployment first.');
        }
    }
    /**
     * Load ABI from artifacts
     */
    loadABI(contractPath) {
        try {
            const abiPath = path.join(__dirname, '../../../artifacts/contracts', contractPath);
            const artifactData = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
            return artifactData.abi;
        }
        catch (error) {
            console.error(`Failed to load ABI for ${contractPath}:`, error);
            return [];
        }
    }
    /**
     * Load network configuration
     */
    loadNetworkConfig() {
        try {
            const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            return configData.network;
        }
        catch (error) {
            return {
                name: 'localhost',
                chainId: '31337',
                rpcUrl: 'http://localhost:8545',
            };
        }
    }
    /**
     * Get all deployed contracts
     */
    getContracts() {
        return this.contracts;
    }
    /**
     * Get specific contract configuration
     */
    getContract(category, name) {
        const categoryContracts = this.contracts[category];
        return categoryContracts[name] || null;
    }
    /**
     * Create contract instance
     */
    getContractInstance(category, name) {
        const contract = this.getContract(category, name);
        if (!contract)
            return null;
        return new ethers_1.ethers.Contract(contract.address, contract.abi, this.provider);
    }
    /**
     * Get factory contract instance
     */
    getFactory() {
        const factory = this.getContractInstance('core', 'factory');
        if (!factory)
            throw new Error('Factory contract not available');
        return factory;
    }
    /**
     * Get dispatcher contract instance
     */
    getDispatcher() {
        const dispatcher = this.getContractInstance('core', 'dispatcher');
        if (!dispatcher)
            throw new Error('Dispatcher contract not available');
        return dispatcher;
    }
    /**
     * Get orchestrator contract instance
     */
    getOrchestrator() {
        const orchestrator = this.getContractInstance('orchestrators', 'main');
        if (!orchestrator)
            throw new Error('Orchestrator contract not available');
        return orchestrator;
    }
    /**
     * Health check for all contracts
     */
    async healthCheck() {
        const results = {};
        try {
            // Check network connectivity
            const networkInfo = await this.provider.getNetwork();
            const networkStatus = {
                connected: true,
                chainId: networkInfo.chainId.toString(),
            };
            // Test core contracts
            try {
                const factory = this.getFactory();
                await factory.baseFeeWei();
                results.factory = { status: true };
            }
            catch (error) {
                results.factory = { status: false, error: error.message };
            }
            try {
                const dispatcher = this.getDispatcher();
                await dispatcher.activeRoot();
                results.dispatcher = { status: true };
            }
            catch (error) {
                results.dispatcher = { status: false, error: error.message };
            }
            try {
                const orchestrator = this.getOrchestrator();
                await orchestrator.factory();
                results.orchestrator = { status: true };
            }
            catch (error) {
                results.orchestrator = { status: false, error: error.message };
            }
            // Test ping facet
            try {
                const pingFacet = this.getContractInstance('facets', 'ping');
                if (pingFacet) {
                    await pingFacet.ping();
                    results.pingFacet = { status: true };
                }
                else {
                    results.pingFacet = { status: false, error: 'Contract not found' };
                }
            }
            catch (error) {
                results.pingFacet = { status: false, error: error.message };
            }
            const healthyCount = Object.values(results).filter(r => r.status).length;
            const totalCount = Object.values(results).length;
            let status;
            if (healthyCount === totalCount) {
                status = 'healthy';
            }
            else if (healthyCount > totalCount / 2) {
                status = 'degraded';
            }
            else {
                status = 'unhealthy';
            }
            return { status, contracts: results, network: networkStatus };
        }
        catch (networkError) {
            return {
                status: 'unhealthy',
                contracts: results,
                network: { connected: false },
            };
        }
    }
    /**
     * Get deployment information for analytics
     */
    async getDeploymentInfo() {
        try {
            const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            // Count deployed contracts
            let contractCount = 0;
            contractCount += Object.keys(configData.contracts.core).length;
            contractCount += Object.keys(configData.contracts.orchestrators).length;
            contractCount += Object.keys(configData.contracts.facets).filter(key => configData.contracts.facets[key].address).length;
            return {
                network: this.network,
                deployer: configData.deployer.address,
                deploymentTimestamp: configData.timestamp,
                contractCount,
            };
        }
        catch (error) {
            throw new Error('Failed to get deployment information');
        }
    }
    /**
     * Analyze contract interactions
     */
    async analyzeContract(address) {
        // Check if this is a known deployed contract
        const allContracts = [
            ...Object.values(this.contracts.core),
            ...Object.values(this.contracts.orchestrators),
            ...Object.values(this.contracts.facets).filter(f => f?.address),
        ];
        const knownContract = allContracts.find(contract => contract.address.toLowerCase() === address.toLowerCase());
        if (knownContract) {
            const functions = knownContract.abi
                .filter((item) => item.type === 'function')
                .map((func) => func.name);
            const events = knownContract.abi
                .filter((item) => item.type === 'event')
                .map((event) => event.name);
            // Determine category
            let category = 'unknown';
            if (Object.values(this.contracts.core).some(c => c.address === address)) {
                category = 'core';
            }
            else if (Object.values(this.contracts.orchestrators).some(c => c.address === address)) {
                category = 'orchestrators';
            }
            else if (Object.values(this.contracts.facets).some(c => c?.address === address)) {
                category = 'facets';
            }
            return {
                contractName: knownContract.name,
                isKnownContract: true,
                category,
                functions,
                events,
            };
        }
        return {
            isKnownContract: false,
            functions: [],
            events: [],
        };
    }
    /**
     * Get network information
     */
    getNetworkInfo() {
        try {
            const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            return {
                network: configData.network,
                deployer: configData.deployer,
                security: configData.security,
                fees: configData.fees,
                features: configData.features,
            };
        }
        catch (error) {
            return null;
        }
    }
}
exports.PayRoxContractBackend = PayRoxContractBackend;
// Export singleton instance
exports.payRoxBackend = new PayRoxContractBackend();

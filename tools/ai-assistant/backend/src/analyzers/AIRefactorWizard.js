"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIRefactorWizard = void 0;
const node_path_1 = require("node:path");
const node_crypto_1 = require("node:crypto");
const SolidityAnalyzer_1 = require("./SolidityAnalyzer");
const FacetSimulator_1 = require("./FacetSimulator");
// PayRox Go Beyond protocol limits - keep in sync with constants/limits.ts
const MAX_FUNCTIONS_PER_FACET = 20; // Updated to match constants/limits.ts
/**
 * AI-Powered Refactoring Wizard for PayRox Go Beyond
 *
 * Analyzes monolithic smart contracts and provides intelligent suggestions
 * for converting them into modular facet-based architectures compatible
 * with the PayRox manifest system and CREATE2 deterministic deployment.
 *
 * Features:
 * - Intelligent function grouping based on access patterns
 * - Gas optimization through facet separation
 * - Security-aware categorization (Admin, View, Core facets)
 * - PayRox manifest generation for deterministic deployment
 * - EXTCODEHASH verification support
 */
class AIRefactorWizard {
    constructor() {
        this.analyzer = new SolidityAnalyzer_1.SolidityAnalyzer();
        this.simulator = new FacetSimulator_1.FacetSimulator(this.analyzer);
    }
    /**
     * Analyze a contract and generate intelligent facet recommendations
     *
     * @param sourceCode - Solidity contract source code
     * @param contractName - Optional contract name for analysis
     * @returns RefactorPlan with facet suggestions and deployment strategy
     */
    async analyzeContractForRefactoring(sourceCode, contractName) {
        try {
            console.log('🔍 Analyzing contract for PayRox facet refactoring...');
            // Parse the contract using SolidityAnalyzer
            const parsedContract = await this.analyzer.parseContract(sourceCode, contractName);
            console.log(`📊 Found ${parsedContract.functions.length} functions, ${parsedContract.variables.length} variables`);
            // Generate facet suggestions based on function analysis
            const facetSuggestions = await this.generateFacetSuggestions(parsedContract);
            console.log(`🎯 Generated ${facetSuggestions.length} facet suggestions`);
            // Calculate gas optimization potential
            const gasOptimization = this.estimateGasOptimization(parsedContract, facetSuggestions);
            return {
                facets: facetSuggestions,
                sharedComponents: this.identifySharedComponents(parsedContract),
                deploymentStrategy: this.determineDeploymentStrategy(facetSuggestions),
                estimatedGasSavings: gasOptimization,
                warnings: this.generateWarnings(parsedContract, facetSuggestions),
            };
        }
        catch (error) {
            console.error('❌ Refactoring analysis failed:', error);
            throw new Error(`Refactoring analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Generate intelligent facet suggestions based on function analysis
     * Uses PayRox Go Beyond best practices for facet separation
     */
    async generateFacetSuggestions(contract) {
        const suggestions = [];
        // 1. Administrative functions facet (Critical security)
        const adminFunctions = contract.functions.filter(func => this.isAdministrativeFunction(func));
        if (adminFunctions.length > 0) {
            suggestions.push({
                name: 'AdminFacet',
                description: 'Administrative and ownership functions for secure access control',
                functions: adminFunctions.map(f => f.name),
                estimatedSize: this.estimateFacetGas(adminFunctions),
                gasOptimization: 'High',
                securityRating: 'Critical',
                dependencies: [],
                reasoning: 'Isolated administrative functions for enhanced security, emergency controls, and governance. Critical for PayRox system integrity.',
            });
        }
        // 2. View/Pure functions facet (Gas optimization)
        const viewFunctions = contract.functions.filter(func => func.stateMutability === 'view' || func.stateMutability === 'pure');
        if (viewFunctions.length > 0) {
            suggestions.push({
                name: 'ViewFacet',
                description: 'Read-only functions optimized for gas-efficient queries',
                functions: viewFunctions.map(f => f.name),
                estimatedSize: this.estimateFacetGas(viewFunctions),
                gasOptimization: 'High',
                securityRating: 'Low',
                dependencies: [],
                reasoning: 'Grouped view functions reduce gas costs for read operations and enable efficient caching strategies.',
            });
        }
        // 3. Core business logic facet(s)
        const coreFunctions = contract.functions.filter(func => !this.isAdministrativeFunction(func) &&
            func.stateMutability !== 'view' &&
            func.stateMutability !== 'pure');
        if (coreFunctions.length > 0) {
            // Group by functional similarity for optimal facet size
            const facetGroups = this.groupFunctionsByLogic(coreFunctions);
            facetGroups.forEach((group, index) => {
                const facetName = facetGroups.length > 1 ? `CoreFacet${index + 1}` : 'CoreFacet';
                suggestions.push({
                    name: facetName,
                    description: `Core business logic ${facetGroups.length > 1 ? `(Part ${index + 1})` : ''} - Primary contract functionality`,
                    functions: group.map(f => f.name),
                    estimatedSize: this.estimateFacetGas(group),
                    gasOptimization: 'Medium',
                    securityRating: 'High',
                    dependencies: this.analyzeFacetDependencies(group),
                    reasoning: `Core business logic separated for modularity, maintainability, and efficient PayRox routing. ${facetGroups.length > 1
                        ? 'Split into multiple facets to stay within deployment limits.'
                        : ''}`,
                });
            });
        }
        // 4. Storage management facet (if complex storage detected)
        const storageIntensiveFunctions = contract.functions.filter(func => this.isStorageIntensive(func));
        if (storageIntensiveFunctions.length > 3) {
            suggestions.push({
                name: 'StorageFacet',
                description: 'Storage-intensive operations for data management',
                functions: storageIntensiveFunctions.map(f => f.name),
                estimatedSize: this.estimateFacetGas(storageIntensiveFunctions),
                gasOptimization: 'Medium',
                securityRating: 'Medium',
                dependencies: ['AdminFacet'],
                reasoning: 'Isolated storage operations prevent conflicts and enable specialized optimization for data-heavy functions.',
            });
        }
        return suggestions;
    }
    /**
     * Check if a function is administrative/ownership related
     */
    isAdministrativeFunction(func) {
        const adminKeywords = [
            'admin',
            'owner',
            'onlyowner',
            'onlyadmin',
            'authorize',
            'permission',
            'pause',
            'unpause',
            'emergency',
            'upgrade',
            'initialize',
            'setup',
            'governance',
            'vote',
            'proposal',
            'timelock',
            'multisig',
        ];
        const funcNameLower = func.name.toLowerCase();
        const hasAdminName = adminKeywords.some(keyword => funcNameLower.includes(keyword));
        const hasAdminModifier = func.modifiers.some(mod => adminKeywords.some(keyword => mod.toLowerCase().includes(keyword)));
        return hasAdminName || hasAdminModifier;
    }
    /**
     * Check if a function is storage-intensive
     */
    isStorageIntensive(func) {
        const storageKeywords = [
            'store',
            'save',
            'update',
            'delete',
            'batch',
            'bulk',
            'mass',
        ];
        const funcNameLower = func.name.toLowerCase();
        // Check if function name suggests storage operations
        const hasStorageName = storageKeywords.some(keyword => funcNameLower.includes(keyword));
        // Check if function has many parameters (suggests data operations)
        const hasManyParams = func.parameters.length > 3;
        // Check if function is not a view/pure function (can modify state)
        const canModifyState = func.stateMutability !== 'view' && func.stateMutability !== 'pure';
        return (hasStorageName || hasManyParams) && canModifyState;
    }
    /**
     * Group functions by logical similarity for optimal facet distribution
     */
    groupFunctionsByLogic(functions) {
        if (functions.length <= MAX_FUNCTIONS_PER_FACET) {
            return [functions];
        }
        // Advanced grouping strategy based on function patterns
        const groups = [];
        const remainingFunctions = [...functions];
        while (remainingFunctions.length > 0) {
            const currentGroup = [];
            const seedFunction = remainingFunctions.shift();
            if (!seedFunction) {
                break;
            }
            currentGroup.push(seedFunction);
            // Group similar functions together
            for (let i = remainingFunctions.length - 1; i >= 0; i--) {
                if (currentGroup.length >= MAX_FUNCTIONS_PER_FACET) {
                    break;
                }
                const candidate = remainingFunctions[i];
                if (candidate && this.functionsAreSimilar(seedFunction, candidate)) {
                    currentGroup.push(candidate);
                    remainingFunctions.splice(i, 1);
                }
            }
            // Fill remaining slots in group
            while (currentGroup.length < MAX_FUNCTIONS_PER_FACET &&
                remainingFunctions.length > 0) {
                const nextFunction = remainingFunctions.shift();
                if (nextFunction) {
                    currentGroup.push(nextFunction);
                }
            }
            groups.push(currentGroup);
        }
        return groups;
    }
    /**
     * Check if two functions are logically similar
     */
    functionsAreSimilar(func1, func2) {
        // Same state mutability
        if (func1.stateMutability === func2.stateMutability) {
            return true;
        }
        // Similar naming patterns
        const name1 = func1.name.toLowerCase();
        const name2 = func2.name.toLowerCase();
        const commonPrefixes = [
            'get',
            'set',
            'add',
            'remove',
            'update',
            'delete',
            'create',
            'transfer',
        ];
        for (const prefix of commonPrefixes) {
            if (name1.startsWith(prefix) && name2.startsWith(prefix)) {
                return true;
            }
        }
        // Similar modifiers
        const sharedModifiers = func1.modifiers.filter(mod => func2.modifiers.includes(mod));
        if (sharedModifiers.length > 0) {
            return true;
        }
        return false;
    }
    /**
     * Determine optimal deployment strategy based on facet characteristics
     */
    determineDeploymentStrategy(facets) {
        const criticalFacets = facets.filter(f => f.securityRating === 'Critical');
        const totalFacets = facets.length;
        // Sequential for critical-heavy deployments
        if (criticalFacets.length > totalFacets / 2) {
            return 'sequential';
        }
        // Parallel for simple deployments
        if (totalFacets <= 3 && criticalFacets.length <= 1) {
            return 'parallel';
        }
        // Mixed for complex deployments
        return 'mixed';
    }
    /**
     * Estimate gas optimization potential from facet separation
     */
    estimateGasOptimization(contract, facets) {
        const originalEstimate = contract.functions.reduce((total, func) => total + this.estimateFunctionGas(func), 0);
        const facetizedEstimate = facets.reduce((total, facet) => total + facet.estimatedSize, 0);
        // PayRox-specific optimizations
        const create2DeploymentBonus = facets.length * 5000; // CREATE2 efficiency
        const routingOverhead = contract.functions.length * 300; // Manifest routing cost
        const facetIsolationBonus = facets.length * 2000; // Storage isolation benefits
        const adjustedFacetEstimate = facetizedEstimate +
            routingOverhead -
            create2DeploymentBonus -
            facetIsolationBonus;
        const potentialSavings = Math.max(0, originalEstimate - adjustedFacetEstimate);
        return potentialSavings;
    }
    /**
     * Identify shared components across facets
     */
    identifySharedComponents(contract) {
        const components = [];
        // Shared storage layout analysis
        if (contract.variables.length > 0) {
            components.push('Shared storage layout coordination');
            components.push('Storage layout verification (EXTCODEHASH)');
        }
        // Event definitions that span facets
        if (contract.events.length > 0) {
            components.push('Cross-facet event definitions');
        }
        // Access control modifiers
        const modifierCount = contract.functions.reduce((count, func) => count + func.modifiers.length, 0);
        if (modifierCount > 0) {
            components.push('Shared access control modifiers');
        }
        // PayRox-specific components
        components.push('PayRox manifest coordination');
        components.push('CREATE2 deterministic deployment');
        components.push('ManifestDispatcher integration');
        return components;
    }
    /**
     * Generate warnings for the refactor plan
     */
    generateWarnings(contract, facets) {
        const warnings = [];
        // Complexity warnings
        if (facets.length > 6) {
            warnings.push('⚠️ Large number of facets may increase deployment and management complexity');
        }
        if (contract.variables.length > 15) {
            warnings.push('⚠️ Complex storage layout requires careful coordination between facets');
        }
        // Security warnings
        const criticalFacets = facets.filter(f => f.securityRating === 'Critical');
        if (criticalFacets.length > 1) {
            warnings.push('⚠️ Multiple critical facets detected - consider consolidating admin functions');
        }
        // Gas warnings
        const totalEstimatedSize = facets.reduce((total, facet) => total + facet.estimatedSize, 0);
        if (totalEstimatedSize > 500000) {
            warnings.push('⚠️ High total gas estimate - consider further optimization');
        }
        // PayRox-specific warnings
        if (facets.some(f => f.dependencies.length > 2)) {
            warnings.push('⚠️ Complex inter-facet dependencies may affect PayRox routing efficiency');
        }
        return warnings;
    }
    /**
     * Estimate gas usage for a function
     */
    estimateFunctionGas(func) {
        let baseGas = 21000; // Transaction base cost
        // Parameter processing cost
        if (func.parameters && func.parameters.length > 0) {
            baseGas += func.parameters.length * 800;
        }
        // State mutability adjustments
        switch (func.stateMutability) {
            case 'view':
            case 'pure':
                baseGas = 2000; // Much cheaper for view functions
                break;
            case 'payable':
                baseGas += 7000; // Additional cost for payable functions
                break;
            default:
                baseGas += 3000; // Standard state-changing function
        }
        // Complexity based on function body size
        const bodyLength = func.body?.length || 50;
        const complexityFactor = Math.min(bodyLength / 20, 10000); // Cap complexity impact
        baseGas += Math.floor(complexityFactor);
        // Modifier overhead
        baseGas += func.modifiers.length * 500;
        return baseGas;
    }
    /**
     * Estimate total gas for a facet
     */
    estimateFacetGas(functions) {
        const totalGas = functions.reduce((total, func) => total + this.estimateFunctionGas(func), 0);
        // Add facet deployment overhead
        const deploymentOverhead = 30000;
        return totalGas + deploymentOverhead;
    }
    /**
     * Analyze dependencies between facets
     */
    analyzeFacetDependencies(functions) {
        const dependencies = [];
        // Check for admin function calls
        functions.forEach(func => {
            if (func.body?.includes('onlyOwner') ||
                func.body?.includes('onlyAdmin') ||
                func.modifiers.some(mod => mod.toLowerCase().includes('admin') ||
                    mod.toLowerCase().includes('owner'))) {
                dependencies.push('AdminFacet');
            }
        });
        return Array.from(new Set(dependencies)); // Remove duplicates
    }
    /**
     * Apply refactoring plan to generate actual facet contracts
     */
    async applyRefactoring(sourceCode, contractName, refactorPlan) {
        try {
            console.log('🔧 Applying PayRox refactoring plan...');
            const facets = [];
            // Generate facet contracts
            for (const suggestion of refactorPlan.facets) {
                console.log(`📝 Generating ${suggestion.name} contract...`);
                const facetContract = this.generateFacetContract(suggestion);
                facets.push({
                    name: suggestion.name,
                    sourceCode: facetContract,
                    functions: [], // Will be populated with actual FunctionInfo during implementation
                    selector: this.generateSelector(suggestion.name),
                    dependencies: suggestion.dependencies,
                    estimatedGas: suggestion.estimatedSize,
                    securityLevel: suggestion.securityRating,
                });
            }
            // Generate PayRox manifest
            const manifest = this.generatePayRoxManifest(facets, contractName, refactorPlan);
            // Generate deployment instructions
            const deploymentInstructions = this.generateDeploymentInstructions(facets);
            console.log('✅ Refactoring plan applied successfully!');
            return {
                facets,
                manifest,
                deploymentInstructions,
            };
        }
        catch (error) {
            console.error('❌ Refactoring application failed:', error);
            throw new Error(`Refactoring application failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Generate a deterministic selector for a facet
     */
    generateSelector(facetName) {
        // Use real SHA-256 for collision-free deterministic selector generation
        const hash = node_crypto_1.default.createHash("sha256").update(facetName).digest("hex");
        return `0x${hash.slice(0, 8)}`;
    }
    /**
     * Generate PayRox Go Beyond manifest
     */
    generatePayRoxManifest(facets, contractName, plan) {
        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            metadata: {
                generator: 'PayRox AI Refactor Wizard',
                originalContract: contractName,
                refactoringStrategy: plan.deploymentStrategy,
                estimatedGasSavings: plan.estimatedGasSavings,
            },
            chunks: facets.map(facet => ({
                name: facet.name,
                selector: facet.selector,
                securityLevel: facet.securityLevel,
                estimatedGas: facet.estimatedGas,
                dependencies: facet.dependencies,
                functions: plan.facets.find(f => f.name === facet.name)?.functions || [],
            })),
            deployment: {
                strategy: plan.deploymentStrategy,
                requiresFactory: true,
                requiresDispatcher: true,
                verificationMethod: 'EXTCODEHASH',
            },
            security: {
                criticalFacets: facets
                    .filter(f => f.securityLevel === 'Critical')
                    .map(f => f.name),
                accessControl: 'role-based',
                emergencyControls: true,
            },
        };
    }
    /**
     * Generate deployment instructions specific to PayRox Go Beyond
     */
    generateDeploymentInstructions(facets) {
        const instructions = [
            '🏗️ PayRox Go Beyond Deployment Instructions',
            '',
            '1. Pre-deployment Setup:',
            '   • Ensure DeterministicChunkFactory is deployed',
            '   • Verify ManifestDispatcher is available',
            '   • Prepare deployment salt for CREATE2',
            '',
            '2. Facet Compilation:',
            '   • Compile all facet contracts with solc 0.8.20+',
            '   • Verify compilation artifacts',
            '   • Calculate bytecode sizes',
            '',
            '3. CREATE2 Address Calculation:',
            '   • Calculate deterministic addresses for all facets',
            '   • Verify no address collisions',
            '   • Update manifest with predicted addresses',
            '',
            '4. Staged Deployment:',
        ];
        // Add facet-specific deployment steps
        const criticalFacets = facets.filter(f => f.securityLevel === 'Critical');
        const regularFacets = facets.filter(f => f.securityLevel !== 'Critical');
        if (criticalFacets.length > 0) {
            instructions.push('   • Deploy critical facets first (sequential):');
            criticalFacets.forEach(facet => {
                instructions.push(`     - Deploy ${facet.name}`);
                instructions.push(`     - Verify deployment with EXTCODEHASH`);
            });
        }
        if (regularFacets.length > 0) {
            instructions.push('   • Deploy regular facets:');
            regularFacets.forEach(facet => {
                instructions.push(`     - Deploy ${facet.name}`);
            });
        }
        instructions.push('', '5. Manifest Updates:', '   • Update manifest with actual deployment addresses', '   • Calculate and store runtime codehashes', '   • Generate merkle proofs for verification', '', '6. Dispatcher Configuration:', '   • Update ManifestDispatcher with new routes', '   • Test routing for all functions', '   • Verify access controls', '', '7. Integration Testing:', '   • Test inter-facet communications', '   • Verify storage layout compatibility', '   • Test emergency controls', '', '8. Production Readiness:', '   • Update monitoring and alerts', '   • Document facet architecture', '   • Prepare upgrade procedures', '', '⚠️ Important: Always test on testnets before mainnet deployment!');
        return instructions;
    }
    /**
     * Generate Solidity contract code for a facet
     */
    generateFacetContract(suggestion) {
        const contractName = suggestion.name;
        return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ${contractName} - Generated by PayRox AI Refactor Wizard
 *
 * ${suggestion.description}
 * Security Rating: ${suggestion.securityRating}
 * Gas Optimization: ${suggestion.gasOptimization}
 * Estimated Size: ${suggestion.estimatedSize}
 *
 * Reasoning: ${suggestion.reasoning}
 */
contract ${contractName} {

    // Events for PayRox integration
    event FacetInitialized(address indexed facet, uint256 timestamp);
    event FacetUpgraded(address indexed oldImplementation, address indexed newImplementation);

    // Custom errors for gas efficiency
    error Unauthorized(address caller);
    error InvalidParameter(string param, bytes32 value);
    error FacetNotInitialized();
    error InvalidSelector(bytes4 selector);

    // State variables
    address public owner;
    bool public initialized;
    mapping(bytes4 => bool) public supportedSelectors;

    // Access control
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized(msg.sender);
        _;
    }

    modifier onlyInitialized() {
        if (!initialized) revert FacetNotInitialized();
        _;
    }

    constructor() {
        owner = msg.sender;
        initialized = true;
        emit FacetInitialized(address(this), block.timestamp);
    }

    /**
     * PayRox compatibility function
     * Returns the codehash for EXTCODEHASH verification
     */
    function getCodehash() external view returns (bytes32) {
        return address(this).codehash; // EIP-1052
    }

    /**
     * Get facet metadata for PayRox manifest
     */
    function getFacetInfo() external view returns (
        string memory name,
        string memory description,
        string memory securityRating,
        uint256 estimatedGas
    ) {
        return (
            "${contractName}",
            "${suggestion.description}",
            "${suggestion.securityRating}",
            ${suggestion.estimatedSize}
        );
    }

${this.generateFacetFunctions(suggestion)}
}`;
    }
    /**
     * Generate function stubs for the facet
     */
    generateFacetFunctions(suggestion) {
        let functions = '';
        suggestion.functions.forEach(funcName => {
            // Guard against Solidity keywords that could cause compilation issues
            const safeFuncName = /^(delete|type|switch|address|uint|int|bool|string|bytes|mapping|struct|enum|modifier|constructor|fallback|receive)$/.test(funcName)
                ? `${funcName}_`
                : funcName;

            const isAdminFunction = suggestion.securityRating === 'Critical';
            const modifiers = isAdminFunction
                ? ' onlyOwner onlyInitialized'
                : ' onlyInitialized';
            functions += `
    /**
     * ${safeFuncName} - Migrated from original contract
     * Auto-generated stub - implement actual logic
     */
    function ${safeFuncName}() external${modifiers} {
        // TODO: Implement function logic from original contract
        // Consider:
        // - Parameter validation
        // - State changes
        // - Event emissions
        // - Return values

        // Placeholder implementation
    }
`;
        });
        return functions;
    }
}
exports.AIRefactorWizard = AIRefactorWizard;

/**
 * CLI wrapper for direct execution
 * Usage: node AIRefactorWizard.js <contract-file.sol>
 */
if (require.main === module) {
    const fs = require('fs').promises;

    async function runCLI() {
        try {
            if (process.argv.length < 3) {
                console.log('Usage: node AIRefactorWizard.js <contract-file.sol>');
                process.exit(1);
            }

            const contractFile = process.argv[2];
            const sourceCode = await fs.readFile(contractFile, 'utf8');
            const contractName = node_path_1.default.basename(contractFile, '.sol');

            console.log(`🔍 Analyzing ${contractFile}...`);

            const wizard = new AIRefactorWizard();
            const plan = await wizard.analyzeContractForRefactoring(sourceCode, contractName);

            console.log('\n📋 Refactoring Plan:');
            console.log(JSON.stringify(plan, null, 2));

        } catch (error) {
            console.error('❌ CLI execution failed:', error.message);
            process.exit(1);
        }
    }

    runCLI();
}

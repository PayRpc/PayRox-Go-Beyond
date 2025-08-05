import { RefactorPlan, FacetDefinition } from '../types/index';
interface PayRoxManifest {
    version: string;
    timestamp: string;
    metadata: {
        generator: string;
        originalContract: string;
        refactoringStrategy: string;
        estimatedGasSavings: number;
    };
    chunks: Array<{
        name: string;
        selector: string;
        securityLevel: string;
        estimatedGas: number;
        dependencies: string[];
        functions: string[];
    }>;
    deployment: {
        strategy: string;
        requiresFactory: boolean;
        requiresDispatcher: boolean;
        verificationMethod: string;
    };
    security: {
        criticalFacets: string[];
        accessControl: string;
        emergencyControls: boolean;
    };
}
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
export declare class AIRefactorWizard {
    private analyzer;
    private simulator;
    constructor();
    /**
     * Analyze a contract and generate intelligent facet recommendations
     *
     * @param sourceCode - Solidity contract source code
     * @param contractName - Optional contract name for analysis
     * @returns RefactorPlan with facet suggestions and deployment strategy
     */
    analyzeContractForRefactoring(sourceCode: string, contractName?: string): Promise<RefactorPlan>;
    /**
     * Generate intelligent facet suggestions based on function analysis
     * Uses PayRox Go Beyond best practices for facet separation
     */
    private generateFacetSuggestions;
    /**
     * Check if a function is administrative/ownership related
     */
    private isAdministrativeFunction;
    /**
     * Check if a function is storage-intensive
     */
    private isStorageIntensive;
    /**
     * Group functions by logical similarity for optimal facet distribution
     */
    private groupFunctionsByLogic;
    /**
     * Check if two functions are logically similar
     */
    private functionsAreSimilar;
    /**
     * Determine optimal deployment strategy based on facet characteristics
     */
    private determineDeploymentStrategy;
    /**
     * Estimate gas optimization potential from facet separation
     */
    private estimateGasOptimization;
    /**
     * Identify shared components across facets
     */
    private identifySharedComponents;
    /**
     * Generate warnings for the refactor plan
     */
    private generateWarnings;
    /**
     * Estimate gas usage for a function
     */
    private estimateFunctionGas;
    /**
     * Estimate total gas for a facet
     */
    private estimateFacetGas;
    /**
     * Analyze dependencies between facets
     */
    private analyzeFacetDependencies;
    /**
     * Apply refactoring plan to generate actual facet contracts
     */
    applyRefactoring(sourceCode: string, contractName: string, refactorPlan: RefactorPlan): Promise<{
        facets: FacetDefinition[];
        manifest: PayRoxManifest;
        deploymentInstructions: string[];
    }>;
    /**
     * Generate a deterministic selector for a facet
     */
    private generateSelector;
    /**
     * Generate PayRox Go Beyond manifest
     */
    private generatePayRoxManifest;
    /**
     * Generate deployment instructions specific to PayRox Go Beyond
     */
    private generateDeploymentInstructions;
    /**
     * Generate Solidity contract code for a facet
     */
    private generateFacetContract;
    /**
     * Generate function stubs for the facet
     */
    private generateFacetFunctions;
}
export default AIRefactorWizard;

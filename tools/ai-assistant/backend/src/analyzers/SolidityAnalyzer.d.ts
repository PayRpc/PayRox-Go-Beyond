import { ParsedContract, FacetCandidate } from '../types/index';
export declare class SolidityAnalyzer {
    constructor();
    /**
     * Parse and analyze a Solidity contract
     */
    parseContract(sourceCode: string, contractName?: string): Promise<ParsedContract>;
    /**
     * Compile Solidity source code
     */
    private compileContract;
    /**
     * Find the main contract node in AST
     */
    private findContractNode;
    /**
     * Extract function information
     */
    private extractFunctions;
    /**
     * Extract state variables
     */
    private extractVariables;
    /**
     * Extract events
     */
    private extractEvents;
    /**
     * Extract modifiers
     */
    private extractModifiers;
    /**
     * Extract import statements
     */
    private extractImports;
    /**
     * Extract inheritance information
     */
    private extractInheritance;
    /**
     * Extract storage layout from compilation output
     */
    private extractStorageLayout;
    /**
     * Calculate function selector (4-byte hash)
     */
    private calculateSelector;
    /**
     * Build function signature string
     */
    private buildFunctionSignature;
    /**
     * Build event signature string
     */
    private buildEventSignature;
    /**
     * Extract parameters from parameter list
     */
    private extractParameters;
    /**
     * Extract function modifiers
     */
    private extractFunctionModifiers;
    /**
     * Convert type node to string representation
     */
    private typeToString;
    /**
     * Estimate contract bytecode size
     */
    private estimateContractSize;
    /**
     * Estimate function gas usage
     */
    private estimateFunctionGas;
    /**
     * Estimate function code size in bytes
     */
    private estimateFunctionSize;
    /**
     * Find function dependencies (other functions called)
     */
    private findFunctionDependencies;
    /**
     * Find variable dependencies
     */
    private findVariableDependencies;
    /**
     * Calculate variable storage size in bytes
     */
    private calculateVariableSize;
    /**
     * Calculate type size from storage layout
     */
    private calculateTypeSize;
    /**
     * Estimate gas usage for a code block
     */
    private estimateBlockGas;
    /**
     * Get source location information
     */
    private getSourceLocation;
    /**
     * Generic AST node visitor
     */
    private visitNode;
    /**
     * Identify facet candidates based on function grouping strategies
     */
    private identifyFacetCandidates;
    /**
     * Check if function is an admin function
     */
    private isAdminFunction;
    /**
     * Check if function is a governance function
     */
    private isGovernanceFunction;
    /**
     * Check if function is a core business logic function
     */
    private isCoreFunction;
    /**
     * Generate manifest routes for PayRox Go Beyond deployment
     */
    private generateManifestRoutes;
    /**
     * Assess security level of a function
     */
    private assessSecurityLevel;
    /**
     * Calculate runtime codehash for bytecode integrity verification
     */
    private calculateRuntimeCodehash;
    /**
     * Determine if contract requires chunking for DeterministicChunkFactory
     */
    private requiresChunking;
    /**
     * Detect storage layout collisions for facet isolation
     */
    private detectStorageCollisions;
    /**
     * Check if storage layout follows diamond storage patterns
     */
    private isDiamondStorageCompliant;
    /**
     * Determine optimal deployment strategy based on contract characteristics
     */
    private determineDeploymentStrategy;
    /**
     * Generate PayRox Go Beyond deployment manifest entry
     */
    generateManifestEntries(contract: ParsedContract): Record<string, unknown>[];
    /**
     * Generate facet-specific analysis report
     */
    generateFacetAnalysisReport(contract: ParsedContract): {
        facetRecommendations: FacetCandidate[];
        deploymentStrategy: string;
        gasOptimizations: string[];
        securityConsiderations: string[];
        chunkingStrategy?: string;
    };
    /**
     * Categorize facet by name
     */
    private categorizeFacet;
    /**
     * Analyze facet dependencies
     */
    private analyzeFacetDependencies;
    /**
     * Analyze facet storage requirements
     */
    private analyzeFacetStorage;
    /**
     * Generate gas optimization suggestions
     */
    private generateGasOptimizations;
    /**
     * Generate security considerations
     */
    private generateSecurityConsiderations;
}
export default SolidityAnalyzer;

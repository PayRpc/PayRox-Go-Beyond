import { SolidityAnalyzer } from './SolidityAnalyzer';
import { FacetDefinition, SimulationResult, ManifestRoute } from '../types/index';
/**
 * PayRox Go Beyond Facet Simulator
 *
 * Simulates facet interactions, manifest-based routing, and deployment scenarios
 * for the PayRox Go Beyond modular architecture system.
 */
export interface PayRoxSimulationConfig {
    network: 'hardhat' | 'localhost' | 'sepolia' | 'mainnet';
    factoryAddress?: string;
    dispatcherAddress?: string;
    gasLimit: number;
    manifestValidation: boolean;
    codehashVerification: boolean;
}
export interface FacetInteractionTest {
    name: string;
    description: string;
    facetA: string;
    facetB: string;
    functionCall: string;
    parameters: unknown[];
    expectedGas: number;
    expectedResult: 'success' | 'revert' | 'delegatecall';
    manifestProofRequired: boolean;
}
export interface ManifestSimulation {
    routes: ManifestRoute[];
    merkleRoot: string;
    epoch: number;
    activationDelay: number;
    pendingChanges: ManifestRoute[];
    securityChecks: string[];
}
export interface DeploymentSimulation {
    phase: 'factory' | 'dispatcher' | 'facets' | 'routes' | 'activation';
    estimatedGas: number;
    dependencies: string[];
    criticalPath: boolean;
    rollbackPlan: string[];
}
export declare class FacetSimulator {
    private _analyzer;
    constructor(_analyzer: SolidityAnalyzer);
    /**
     * Simulate PayRox Go Beyond facet interactions and routing
     */
    simulatePayRoxSystem(facets: FacetDefinition[], config: PayRoxSimulationConfig, customTests?: FacetInteractionTest[]): Promise<SimulationResult[]>;
    /**
     * Simulate CREATE2 deterministic deployment pattern
     */
    private simulateCreateDeployment;
    /**
     * Simulate manifest-based function routing
     */
    private simulateManifestRouting;
    /**
     * Simulate facet storage isolation
     */
    private simulateFacetIsolation;
    /**
     * Simulate EXTCODEHASH runtime verification
     */
    private simulateCodeIntegrity;
    /**
     * Run custom facet interaction tests
     */
    private runCustomInteractionTests;
    /**
     * Simulate emergency scenarios (pause, freeze, route removal)
     */
    private simulateEmergencyScenarios;
    /**
     * Helper methods for PayRox Go Beyond simulation
     */
    private estimateDeploymentGas;
    private simulatePredictAddress;
    private generateManifestRoutes;
    private calculateSimulatedMerkleRoot;
    private analyzeStorageIsolation;
    private generateSimulatedCodehash;
    private calculateGasEfficiency;
    private generateDeploymentRecommendations;
    private chunkArray;
    private simpleHash;
    /**
     * Generate comprehensive PayRox Go Beyond deployment simulation
     */
    simulateFullDeployment(facets: FacetDefinition[], _config: PayRoxSimulationConfig): Promise<{
        phases: DeploymentSimulation[];
        totalGas: number;
        estimatedTime: number;
        recommendations: string[];
    }>;
}

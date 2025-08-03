/**
 * Consolidated Path Management Utilities
 *
 * Based on patterns from check-actual-factory-fee.ts and other scripts
 * Provides standardized path handling across the PayRox Go Beyond system
 */
import { ValidationResult } from './errors';
export declare const BASE_PATHS: {
    readonly contracts: "contracts";
    readonly scripts: "scripts";
    readonly test: "test";
    readonly deployments: "deployments";
    readonly config: "config";
    readonly docs: "docs";
    readonly sdk: "sdk";
    readonly cli: "cli";
    readonly manifests: "manifests";
    readonly releases: "releases";
    readonly tools: "tools";
    readonly artifacts: "artifacts";
    readonly src: "src";
};
export type BasePath = keyof typeof BASE_PATHS;
export declare class PathManager {
    private readonly rootPath;
    constructor(rootPath?: string);
    /**
     * Get standardized path for any component
     * Based on the pattern from check-actual-factory-fee.ts
     */
    getPath(component: BasePath, ...subPaths: string[]): string;
    /**
     * Get deployment path for a specific network
     * Consolidates the pattern: path.join(__dirname, `../deployments/${networkName}/...`)
     */
    getDeploymentPath(networkName: string, fileName?: string): string;
    /**
     * Get factory deployment artifact path
     * Based on check-actual-factory-fee.ts pattern
     */
    getFactoryPath(networkName: string): string;
    /**
     * Get contract artifacts path
     */
    getArtifactPath(contractName: string): string;
    /**
     * Get manifest path
     */
    getManifestPath(manifestName: string): string;
    /**
     * Get script path
     */
    getScriptPath(scriptName: string): string;
    /**
     * Get release path
     */
    getReleasePath(releaseId: string, fileName?: string): string;
    /**
     * Validate path existence and accessibility
     * Consolidates validation logic found across multiple scripts
     */
    validatePath(targetPath: string): ValidationResult;
    /**
     * Ensure directory exists, create if not
     * Consolidates mkdir patterns found in multiple scripts
     */
    ensureDirectory(dirPath: string): ValidationResult;
    /**
     * Get relative path from root
     */
    getRelativePath(absolutePath: string): string;
    /**
     * Get absolute path from relative
     */
    getAbsolutePath(relativePath: string): string;
    /**
     * Check if path is within project root (security check)
     */
    isWithinProject(targetPath: string): boolean;
}
/**
 * Safe file reading with error handling
 * Consolidates the pattern from check-actual-factory-fee.ts and other scripts
 */
export declare function safeReadFile(filePath: string): string;
/**
 * Safe JSON parsing with error handling
 * Consolidates JSON parsing patterns found across scripts
 */
export declare function safeParseJSON<T = any>(content: string, filePath?: string): T;
/**
 * Safe file existence check
 */
export declare function fileExists(filePath: string): boolean;
/**
 * Get file extension
 */
export declare function getFileExtension(filePath: string): string;
/**
 * Check if file has specific extension
 */
export declare function hasExtension(filePath: string, extensions: string | string[]): boolean;
export declare function getPathManager(rootPath?: string): PathManager;
/**
 * Read file content
 */
export declare function readFileContent(filePath: string): string;
/**
 * Write file content
 */
export declare function writeFileContent(filePath: string, content: string): void;

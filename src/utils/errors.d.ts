/**
 * Consolidated Error Handling Utilities
 *
 * Based on patterns found in check-actual-factory-fee.ts and other scripts
 * Provides standardized error handling across the PayRox Go Beyond system
 */
export declare abstract class PayRoxError extends Error {
    readonly code: string;
    readonly category: string;
    constructor(message: string, code: string, category: string);
}
export declare class ValidationError extends PayRoxError {
    constructor(message: string, code: string);
}
export declare class NetworkError extends PayRoxError {
    constructor(message: string, code: string);
}
export declare class ContractError extends PayRoxError {
    constructor(message: string, code: string);
}
export declare class FileSystemError extends PayRoxError {
    constructor(message: string, code: string);
}
export declare class ConfigurationError extends PayRoxError {
    constructor(message: string, code: string);
}
/**
 * Standardized error handler for async operations
 */
export declare function handleAsyncOperation<T>(operation: () => Promise<T>, errorContext: string): Promise<T>;
/**
 * Standardized error handler for file operations
 */
export declare function handleFileOperation<T>(operation: () => T, filePath: string, operationType: string): T;
/**
 * Standardized error handler with recommendations
 */
export interface ErrorWithRecommendations {
    error: PayRoxError;
    recommendations: string[];
}
export declare function createErrorWithRecommendations(error: PayRoxError, recommendations: string[]): ErrorWithRecommendations;
export interface ValidationResult {
    isValid: boolean;
    message: string;
    code?: string;
    recommendations?: string[];
}
/**
 * Create a successful validation result
 */
export declare function createValidResult(message: string, code?: string): ValidationResult;
/**
 * Create a failed validation result
 */
export declare function createInvalidResult(message: string, code: string, recommendations?: string[]): ValidationResult;
/**
 * Validate multiple conditions and return combined result
 */
export declare function validateMultiple(validations: ValidationResult[]): ValidationResult;
/**
 * Standardized error logging
 */
export declare function logError(error: unknown, context?: string): void;
/**
 * Standardized success logging
 */
export declare function logSuccess(message: string, context?: string): void;
/**
 * Standardized info logging
 */
export declare function logInfo(message: string, context?: string): void;
/**
 * Standardized warning logging
 */
export declare function logWarning(message: string, context?: string): void;
/**
 * Standardized process exit for success
 */
export declare function exitSuccess(message?: string): never;
/**
 * Standardized process exit for failure
 */
export declare function exitFailure(error: unknown, context?: string): never;
/**
 * Wrap main function with standardized error handling
 */
export declare function wrapMain(mainFunction: () => Promise<void>, successMessage?: string, errorContext?: string): void;

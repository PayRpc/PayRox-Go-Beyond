"use strict";
/**
 * Consolidated Error Handling Utilities
 *
 * Based on patterns found in check-actual-factory-fee.ts and other scripts
 * Provides standardized error handling across the PayRox Go Beyond system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationError = exports.FileSystemError = exports.ContractError = exports.NetworkError = exports.ValidationError = exports.PayRoxError = void 0;
exports.handleAsyncOperation = handleAsyncOperation;
exports.handleFileOperation = handleFileOperation;
exports.createErrorWithRecommendations = createErrorWithRecommendations;
exports.createValidResult = createValidResult;
exports.createInvalidResult = createInvalidResult;
exports.validateMultiple = validateMultiple;
exports.logError = logError;
exports.logSuccess = logSuccess;
exports.logInfo = logInfo;
exports.logWarning = logWarning;
exports.exitSuccess = exitSuccess;
exports.exitFailure = exitFailure;
exports.wrapMain = wrapMain;
/* ═══════════════════════════════════════════════════════════════════════════
   ERROR CLASS HIERARCHY
   ═══════════════════════════════════════════════════════════════════════════ */
class PayRoxError extends Error {
    constructor(message, code, category) {
        super(message);
        this.code = code;
        this.category = category;
        this.name = `PayRox${category}Error`;
    }
}
exports.PayRoxError = PayRoxError;
class ValidationError extends PayRoxError {
    constructor(message, code) {
        super(message, code, 'Validation');
    }
}
exports.ValidationError = ValidationError;
class NetworkError extends PayRoxError {
    constructor(message, code) {
        super(message, code, 'Network');
    }
}
exports.NetworkError = NetworkError;
class ContractError extends PayRoxError {
    constructor(message, code) {
        super(message, code, 'Contract');
    }
}
exports.ContractError = ContractError;
class FileSystemError extends PayRoxError {
    constructor(message, code) {
        super(message, code, 'FileSystem');
    }
}
exports.FileSystemError = FileSystemError;
class ConfigurationError extends PayRoxError {
    constructor(message, code) {
        super(message, code, 'Configuration');
    }
}
exports.ConfigurationError = ConfigurationError;
/* ═══════════════════════════════════════════════════════════════════════════
   ERROR HANDLERS
   ═══════════════════════════════════════════════════════════════════════════ */
/**
 * Standardized error handler for async operations
 */
async function handleAsyncOperation(operation, errorContext) {
    try {
        return await operation();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new ValidationError(`${errorContext}: ${errorMessage}`, 'ASYNC_OPERATION_FAILED');
    }
}
/**
 * Standardized error handler for file operations
 */
function handleFileOperation(operation, filePath, operationType) {
    try {
        return operation();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new FileSystemError(`Failed to ${operationType} file ${filePath}: ${errorMessage}`, `FILE_${operationType.toUpperCase()}_ERROR`);
    }
}
function createErrorWithRecommendations(error, recommendations) {
    return { error, recommendations };
}
/**
 * Create a successful validation result
 */
function createValidResult(message, code) {
    return {
        isValid: true,
        message,
        code,
    };
}
/**
 * Create a failed validation result
 */
function createInvalidResult(message, code, recommendations) {
    return {
        isValid: false,
        message,
        code,
        recommendations,
    };
}
/**
 * Validate multiple conditions and return combined result
 */
function validateMultiple(validations) {
    const failedValidations = validations.filter(v => !v.isValid);
    if (failedValidations.length === 0) {
        return createValidResult('All validations passed');
    }
    const messages = failedValidations.map(v => v.message).join('; ');
    const codes = failedValidations
        .map(v => v.code)
        .filter(Boolean)
        .join(',');
    const allRecommendations = failedValidations
        .flatMap(v => v.recommendations || [])
        .filter((rec, index, arr) => arr.indexOf(rec) === index); // Remove duplicates
    return createInvalidResult(`Multiple validation failures: ${messages}`, codes || 'MULTIPLE_VALIDATION_FAILURES', allRecommendations);
}
/* ═══════════════════════════════════════════════════════════════════════════
   CONSOLE OUTPUT FORMATTING
   ═══════════════════════════════════════════════════════════════════════════ */
/**
 * Standardized error logging
 */
function logError(error, context) {
    const prefix = context ? `[ERROR] ${context}:` : '[ERROR]';
    if (error instanceof PayRoxError) {
        console.error(`${prefix} ${error.message} (Code: ${error.code})`);
    }
    else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`${prefix} ${errorMessage}`);
    }
}
/**
 * Standardized success logging
 */
function logSuccess(message, context) {
    const prefix = context ? `[OK] ${context}:` : '[OK]';
    console.log(`${prefix} ${message}`);
}
/**
 * Standardized info logging
 */
function logInfo(message, context) {
    const prefix = context ? `[INFO] ${context}:` : '[INFO]';
    console.log(`${prefix} ${message}`);
}
/**
 * Standardized warning logging
 */
function logWarning(message, context) {
    const prefix = context ? `[WARN] ${context}:` : '[WARN]';
    console.warn(`${prefix} ${message}`);
}
/* ═══════════════════════════════════════════════════════════════════════════
   PROCESS EXIT HANDLING
   ═══════════════════════════════════════════════════════════════════════════ */
/**
 * Standardized process exit for success
 */
function exitSuccess(message) {
    if (message) {
        logSuccess(message);
    }
    process.exit(0);
}
/**
 * Standardized process exit for failure
 */
function exitFailure(error, context) {
    logError(error, context);
    process.exit(1);
}
/**
 * Wrap main function with standardized error handling
 */
function wrapMain(mainFunction, successMessage, errorContext) {
    mainFunction()
        .then(() => {
        if (successMessage) {
            exitSuccess(successMessage);
        }
        else {
            process.exit(0);
        }
    })
        .catch((error) => {
        exitFailure(error, errorContext);
    });
}

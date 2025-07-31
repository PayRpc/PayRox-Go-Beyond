/**
 * Consolidated Error Handling Utilities
 *
 * Based on patterns found in check-actual-factory-fee.ts and other scripts
 * Provides standardized error handling across the PayRox Go Beyond system
 */

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR CLASS HIERARCHY
   ═══════════════════════════════════════════════════════════════════════════ */

export abstract class PayRoxError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly category: string
  ) {
    super(message);
    this.name = `PayRox${category}Error`;
  }
}

export class ValidationError extends PayRoxError {
  constructor(message: string, code: string) {
    super(message, code, 'Validation');
  }
}

export class NetworkError extends PayRoxError {
  constructor(message: string, code: string) {
    super(message, code, 'Network');
  }
}

export class ContractError extends PayRoxError {
  constructor(message: string, code: string) {
    super(message, code, 'Contract');
  }
}

export class FileSystemError extends PayRoxError {
  constructor(message: string, code: string) {
    super(message, code, 'FileSystem');
  }
}

export class ConfigurationError extends PayRoxError {
  constructor(message: string, code: string) {
    super(message, code, 'Configuration');
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR HANDLERS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Standardized error handler for async operations
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  errorContext: string
): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ValidationError(
      `${errorContext}: ${errorMessage}`,
      'ASYNC_OPERATION_FAILED'
    );
  }
}

/**
 * Standardized error handler for file operations
 */
export function handleFileOperation<T>(
  operation: () => T,
  filePath: string,
  operationType: string
): T {
  try {
    return operation();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FileSystemError(
      `Failed to ${operationType} file ${filePath}: ${errorMessage}`,
      `FILE_${operationType.toUpperCase()}_ERROR`
    );
  }
}

/**
 * Standardized error handler with recommendations
 */
export interface ErrorWithRecommendations {
  error: PayRoxError;
  recommendations: string[];
}

export function createErrorWithRecommendations(
  error: PayRoxError,
  recommendations: string[]
): ErrorWithRecommendations {
  return { error, recommendations };
}

/* ═══════════════════════════════════════════════════════════════════════════
   VALIDATION PATTERNS
   ═══════════════════════════════════════════════════════════════════════════ */

export interface ValidationResult {
  isValid: boolean;
  message: string;
  code?: string;
  recommendations?: string[];
}

/**
 * Create a successful validation result
 */
export function createValidResult(
  message: string,
  code?: string
): ValidationResult {
  return {
    isValid: true,
    message,
    code,
  };
}

/**
 * Create a failed validation result
 */
export function createInvalidResult(
  message: string,
  code: string,
  recommendations?: string[]
): ValidationResult {
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
export function validateMultiple(
  validations: ValidationResult[]
): ValidationResult {
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

  return createInvalidResult(
    `Multiple validation failures: ${messages}`,
    codes || 'MULTIPLE_VALIDATION_FAILURES',
    allRecommendations
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSOLE OUTPUT FORMATTING
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Standardized error logging
 */
export function logError(error: unknown, context?: string): void {
  const prefix = context ? `[ERROR] ${context}:` : '[ERROR]';

  if (error instanceof PayRoxError) {
    console.error(`${prefix} ${error.message} (Code: ${error.code})`);
  } else {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${prefix} ${errorMessage}`);
  }
}

/**
 * Standardized success logging
 */
export function logSuccess(message: string, context?: string): void {
  const prefix = context ? `[OK] ${context}:` : '[OK]';
  console.log(`${prefix} ${message}`);
}

/**
 * Standardized info logging
 */
export function logInfo(message: string, context?: string): void {
  const prefix = context ? `[INFO] ${context}:` : '[INFO]';
  console.log(`${prefix} ${message}`);
}

/**
 * Standardized warning logging
 */
export function logWarning(message: string, context?: string): void {
  const prefix = context ? `[WARN] ${context}:` : '[WARN]';
  console.warn(`${prefix} ${message}`);
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROCESS EXIT HANDLING
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Standardized process exit for success
 */
export function exitSuccess(message?: string): never {
  if (message) {
    logSuccess(message);
  }
  process.exit(0);
}

/**
 * Standardized process exit for failure
 */
export function exitFailure(error: unknown, context?: string): never {
  logError(error, context);
  process.exit(1);
}

/**
 * Wrap main function with standardized error handling
 */
export function wrapMain(
  mainFunction: () => Promise<void>,
  successMessage?: string,
  errorContext?: string
): void {
  mainFunction()
    .then(() => {
      if (successMessage) {
        exitSuccess(successMessage);
      } else {
        process.exit(0);
      }
    })
    .catch((error: unknown) => {
      exitFailure(error, errorContext);
    });
}

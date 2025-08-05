"use strict";
// Core contract analysis types
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisError = exports.CompilationError = exports.ValidationError = exports.AIAssistantError = void 0;
// Error types
class AIAssistantError extends Error {
    constructor(message, _code, _statusCode = 500, _details) {
        super(message);
        this._code = _code;
        this._statusCode = _statusCode;
        this._details = _details;
        this.name = 'AIAssistantError';
    }
}
exports.AIAssistantError = AIAssistantError;
class ValidationError extends AIAssistantError {
    constructor(message, _details) {
        super(message, 'VALIDATION_ERROR', 400, _details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class CompilationError extends AIAssistantError {
    constructor(message, _details) {
        super(message, 'COMPILATION_ERROR', 422, _details);
        this.name = 'CompilationError';
    }
}
exports.CompilationError = CompilationError;
class AnalysisError extends AIAssistantError {
    constructor(message, _details) {
        super(message, 'ANALYSIS_ERROR', 500, _details);
        this.name = 'AnalysisError';
    }
}
exports.AnalysisError = AnalysisError;

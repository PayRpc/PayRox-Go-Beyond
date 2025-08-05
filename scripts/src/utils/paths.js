"use strict";
/**
 * Consolidated Path Management Utilities
 *
 * Based on patterns from check-actual-factory-fee.ts and other scripts
 * Provides standardized path handling across the PayRox Go Beyond system
 */
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
exports.PathManager = exports.BASE_PATHS = void 0;
exports.safeReadFile = safeReadFile;
exports.safeParseJSON = safeParseJSON;
exports.fileExists = fileExists;
exports.getFileExtension = getFileExtension;
exports.hasExtension = hasExtension;
exports.getPathManager = getPathManager;
exports.readFileContent = readFileContent;
exports.writeFileContent = writeFileContent;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const errors_1 = require("./errors");
/* ═══════════════════════════════════════════════════════════════════════════
   PATH CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */
exports.BASE_PATHS = {
    contracts: 'contracts',
    scripts: 'scripts',
    test: 'test',
    deployments: 'deployments',
    config: 'config',
    docs: 'docs',
    sdk: 'sdk',
    cli: 'cli',
    manifests: 'manifests',
    releases: 'releases',
    tools: 'tools',
    artifacts: 'artifacts',
    src: 'src',
};
/* ═══════════════════════════════════════════════════════════════════════════
   PATH MANAGER CLASS
   ═══════════════════════════════════════════════════════════════════════════ */
class PathManager {
    constructor(rootPath = process.cwd()) {
        this.rootPath = path.resolve(rootPath);
    }
    /**
     * Get standardized path for any component
     * Based on the pattern from check-actual-factory-fee.ts
     */
    getPath(component, ...subPaths) {
        return path.join(this.rootPath, exports.BASE_PATHS[component], ...subPaths);
    }
    /**
     * Get deployment path for a specific network
     * Consolidates the pattern: path.join(__dirname, `../deployments/${networkName}/...`)
     */
    getDeploymentPath(networkName, fileName) {
        const deploymentPath = this.getPath('deployments', networkName);
        return fileName ? path.join(deploymentPath, fileName) : deploymentPath;
    }
    /**
     * Get factory deployment artifact path
     * Based on check-actual-factory-fee.ts pattern
     */
    getFactoryPath(networkName) {
        return this.getDeploymentPath(networkName, 'factory.json');
    }
    /**
     * Get contract artifacts path
     */
    getArtifactPath(contractName) {
        return this.getPath('artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
    }
    /**
     * Get manifest path
     */
    getManifestPath(manifestName) {
        return this.getPath('manifests', manifestName);
    }
    /**
     * Get script path
     */
    getScriptPath(scriptName) {
        return this.getPath('scripts', scriptName);
    }
    /**
     * Get release path
     */
    getReleasePath(releaseId, fileName) {
        const releasePath = this.getPath('releases', releaseId);
        return fileName ? path.join(releasePath, fileName) : releasePath;
    }
    /**
     * Validate path existence and accessibility
     * Consolidates validation logic found across multiple scripts
     */
    validatePath(targetPath) {
        try {
            if (!fs.existsSync(targetPath)) {
                return (0, errors_1.createInvalidResult)(`Path does not exist: ${targetPath}`, 'PATH_NOT_FOUND', [
                    'Verify the path is correct',
                    'Check if the directory/file has been created',
                    'Ensure proper permissions',
                ]);
            }
            // Check if we can access the path
            fs.accessSync(targetPath, fs.constants.R_OK);
            const stats = fs.statSync(targetPath);
            return (0, errors_1.createValidResult)(`Path valid: ${stats.isDirectory() ? 'directory' : 'file'}`, 'PATH_VALID');
        }
        catch (error) {
            return (0, errors_1.createInvalidResult)(`Path access error: ${error instanceof Error ? error.message : String(error)}`, 'PATH_ACCESS_ERROR', [
                'Check file/directory permissions',
                'Verify the path is not corrupted',
                'Ensure the parent directory exists',
            ]);
        }
    }
    /**
     * Ensure directory exists, create if not
     * Consolidates mkdir patterns found in multiple scripts
     */
    ensureDirectory(dirPath) {
        try {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                return (0, errors_1.createValidResult)(`Directory created: ${dirPath}`, 'DIRECTORY_CREATED');
            }
            const stats = fs.statSync(dirPath);
            if (!stats.isDirectory()) {
                return (0, errors_1.createInvalidResult)(`Path exists but is not a directory: ${dirPath}`, 'NOT_A_DIRECTORY');
            }
            return (0, errors_1.createValidResult)(`Directory already exists: ${dirPath}`, 'DIRECTORY_EXISTS');
        }
        catch (error) {
            return (0, errors_1.createInvalidResult)(`Failed to ensure directory: ${error instanceof Error ? error.message : String(error)}`, 'DIRECTORY_CREATION_FAILED');
        }
    }
    /**
     * Get relative path from root
     */
    getRelativePath(absolutePath) {
        return path.relative(this.rootPath, absolutePath);
    }
    /**
     * Get absolute path from relative
     */
    getAbsolutePath(relativePath) {
        if (path.isAbsolute(relativePath)) {
            return relativePath;
        }
        return path.join(this.rootPath, relativePath);
    }
    /**
     * Check if path is within project root (security check)
     */
    isWithinProject(targetPath) {
        const absoluteTarget = this.getAbsolutePath(targetPath);
        const relativePath = path.relative(this.rootPath, absoluteTarget);
        return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    }
}
exports.PathManager = PathManager;
/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════ */
/**
 * Safe file reading with error handling
 * Consolidates the pattern from check-actual-factory-fee.ts and other scripts
 */
function safeReadFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    }
    catch (error) {
        throw new errors_1.FileSystemError(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`, 'FILE_READ_ERROR');
    }
}
/**
 * Safe JSON parsing with error handling
 * Consolidates JSON parsing patterns found across scripts
 */
function safeParseJSON(content, filePath) {
    try {
        return JSON.parse(content);
    }
    catch (error) {
        const context = filePath ? ` from ${filePath}` : '';
        throw new errors_1.FileSystemError(`Failed to parse JSON${context}: ${error instanceof Error ? error.message : String(error)}`, 'JSON_PARSE_ERROR');
    }
}
/**
 * Safe file existence check
 */
function fileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    }
    catch {
        return false;
    }
}
/**
 * Get file extension
 */
function getFileExtension(filePath) {
    return path.extname(filePath).toLowerCase();
}
/**
 * Check if file has specific extension
 */
function hasExtension(filePath, extensions) {
    const fileExt = getFileExtension(filePath);
    const validExtensions = Array.isArray(extensions) ? extensions : [extensions];
    return validExtensions.some(ext => ext.startsWith('.') ? fileExt === ext : fileExt === `.${ext}`);
}
/**
 * Create a singleton PathManager instance
 */
let globalPathManager = null;
function getPathManager(rootPath) {
    if (!globalPathManager || rootPath) {
        globalPathManager = new PathManager(rootPath);
    }
    return globalPathManager;
}
/**
 * Read file content
 */
function readFileContent(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    }
    catch {
        throw new errors_1.FileSystemError(`Failed to read file: ${filePath}`, 'FILE_READ_ERROR');
    }
}
/**
 * Write file content
 */
function writeFileContent(filePath, content) {
    try {
        fs.writeFileSync(filePath, content, 'utf8');
    }
    catch {
        throw new errors_1.FileSystemError(`Failed to write file: ${filePath}`, 'FILE_WRITE_ERROR');
    }
}

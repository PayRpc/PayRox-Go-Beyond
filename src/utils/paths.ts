/**
 * Consolidated Path Management Utilities
 *
 * Based on patterns from check-actual-factory-fee.ts and other scripts
 * Provides standardized path handling across the PayRox Go Beyond system
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  createInvalidResult,
  createValidResult,
  FileSystemError,
  ValidationResult,
} from './errors';

/* ═══════════════════════════════════════════════════════════════════════════
   PATH CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

export const BASE_PATHS = {
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
} as const;

export type BasePath = keyof typeof BASE_PATHS;

/* ═══════════════════════════════════════════════════════════════════════════
   PATH MANAGER CLASS
   ═══════════════════════════════════════════════════════════════════════════ */

export class PathManager {
  private readonly rootPath: string;

  constructor(rootPath: string = process.cwd()) {
    this.rootPath = path.resolve(rootPath);
  }

  /**
   * Get standardized path for any component
   * Based on the pattern from check-actual-factory-fee.ts
   */
  getPath(component: BasePath, ...subPaths: string[]): string {
    return path.join(this.rootPath, BASE_PATHS[component], ...subPaths);
  }

  /**
   * Get deployment path for a specific network
   * Consolidates the pattern: path.join(__dirname, `../deployments/${networkName}/...`)
   */
  getDeploymentPath(networkName: string, fileName?: string): string {
    const deploymentPath = this.getPath('deployments', networkName);
    return fileName ? path.join(deploymentPath, fileName) : deploymentPath;
  }

  /**
   * Get factory deployment artifact path
   * Based on check-actual-factory-fee.ts pattern
   */
  getFactoryPath(networkName: string): string {
    return this.getDeploymentPath(networkName, 'factory.json');
  }

  /**
   * Get contract artifacts path
   */
  getArtifactPath(contractName: string): string {
    return this.getPath(
      'artifacts',
      'contracts',
      `${contractName}.sol`,
      `${contractName}.json`
    );
  }

  /**
   * Get manifest path
   */
  getManifestPath(manifestName: string): string {
    return this.getPath('manifests', manifestName);
  }

  /**
   * Get script path
   */
  getScriptPath(scriptName: string): string {
    return this.getPath('scripts', scriptName);
  }

  /**
   * Get release path
   */
  getReleasePath(releaseId: string, fileName?: string): string {
    const releasePath = this.getPath('releases', releaseId);
    return fileName ? path.join(releasePath, fileName) : releasePath;
  }

  /**
   * Validate path existence and accessibility
   * Consolidates validation logic found across multiple scripts
   */
  validatePath(targetPath: string): ValidationResult {
    try {
      if (!fs.existsSync(targetPath)) {
        return createInvalidResult(
          `Path does not exist: ${targetPath}`,
          'PATH_NOT_FOUND',
          [
            'Verify the path is correct',
            'Check if the directory/file has been created',
            'Ensure proper permissions',
          ]
        );
      }

      // Check if we can access the path
      fs.accessSync(targetPath, fs.constants.R_OK);

      const stats = fs.statSync(targetPath);
      return createValidResult(
        `Path valid: ${stats.isDirectory() ? 'directory' : 'file'}`,
        'PATH_VALID'
      );
    } catch (error) {
      return createInvalidResult(
        `Path access error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'PATH_ACCESS_ERROR',
        [
          'Check file/directory permissions',
          'Verify the path is not corrupted',
          'Ensure the parent directory exists',
        ]
      );
    }
  }

  /**
   * Ensure directory exists, create if not
   * Consolidates mkdir patterns found in multiple scripts
   */
  ensureDirectory(dirPath: string): ValidationResult {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        return createValidResult(
          `Directory created: ${dirPath}`,
          'DIRECTORY_CREATED'
        );
      }

      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        return createInvalidResult(
          `Path exists but is not a directory: ${dirPath}`,
          'NOT_A_DIRECTORY'
        );
      }

      return createValidResult(
        `Directory already exists: ${dirPath}`,
        'DIRECTORY_EXISTS'
      );
    } catch (error) {
      return createInvalidResult(
        `Failed to ensure directory: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'DIRECTORY_CREATION_FAILED'
      );
    }
  }

  /**
   * Get relative path from root
   */
  getRelativePath(absolutePath: string): string {
    return path.relative(this.rootPath, absolutePath);
  }

  /**
   * Get absolute path from relative
   */
  getAbsolutePath(relativePath: string): string {
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }
    return path.join(this.rootPath, relativePath);
  }

  /**
   * Check if path is within project root (security check)
   */
  isWithinProject(targetPath: string): boolean {
    const absoluteTarget = this.getAbsolutePath(targetPath);
    const relativePath = path.relative(this.rootPath, absoluteTarget);
    return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Safe file reading with error handling
 * Consolidates the pattern from check-actual-factory-fee.ts and other scripts
 */
export function safeReadFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new FileSystemError(
      `Failed to read file ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'FILE_READ_ERROR'
    );
  }
}

/**
 * Safe JSON parsing with error handling
 * Consolidates JSON parsing patterns found across scripts
 */
export function safeParseJSON<T = any>(content: string, filePath?: string): T {
  try {
    return JSON.parse(content);
  } catch (error) {
    const context = filePath ? ` from ${filePath}` : '';
    throw new FileSystemError(
      `Failed to parse JSON${context}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'JSON_PARSE_ERROR'
    );
  }
}

/**
 * Safe file existence check
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Get file extension
 */
export function getFileExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

/**
 * Check if file has specific extension
 */
export function hasExtension(
  filePath: string,
  extensions: string | string[]
): boolean {
  const fileExt = getFileExtension(filePath);
  const validExtensions = Array.isArray(extensions) ? extensions : [extensions];
  return validExtensions.some(ext =>
    ext.startsWith('.') ? fileExt === ext : fileExt === `.${ext}`
  );
}

/**
 * Create a singleton PathManager instance
 */
let globalPathManager: PathManager | null = null;

export function getPathManager(rootPath?: string): PathManager {
  if (!globalPathManager || rootPath) {
    globalPathManager = new PathManager(rootPath);
  }
  return globalPathManager;
}

/**
 * Read file content
 */
export function readFileContent(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    throw new FileSystemError(
      `Failed to read file: ${filePath}`,
      'FILE_READ_ERROR'
    );
  }
}

/**
 * Write file content
 */
export function writeFileContent(filePath: string, content: string): void {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
  } catch {
    throw new FileSystemError(
      `Failed to write file: ${filePath}`,
      'FILE_WRITE_ERROR'
    );
  }
}

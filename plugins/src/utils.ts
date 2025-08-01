import * as fs from 'fs';
import * as path from 'path';

/**
 * @title Plugin System Utilities
 * @notice Helper functions for the PayRox plugin system
 */

/**
 * @notice Check if a directory exists and is readable
 */
export function isValidDirectory(dirPath: string): boolean {
  try {
    const stat = fs.statSync(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * @notice Check if a file exists and is readable
 */
export function isValidFile(filePath: string): boolean {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/**
 * @notice Ensure directory exists, create if not
 */
export function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * @notice Safe JSON parsing with error handling
 */
export function safeJsonParse<T>(content: string, defaultValue: T): T {
  try {
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * @notice Read JSON file safely
 */
export function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return safeJsonParse(content, defaultValue);
  } catch {
    return defaultValue;
  }
}

/**
 * @notice Write JSON file safely
 */
export function writeJsonFile(filePath: string, data: any): void {
  const dir = path.dirname(filePath);
  ensureDirectory(dir);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * @notice Get project root directory
 */
export function getProjectRoot(): string {
  let current = process.cwd();
  
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'package.json'))) {
      return current;
    }
    current = path.dirname(current);
  }
  
  return process.cwd();
}

/**
 * @notice Check if current directory is a PayRox project
 */
export function isPayRoxProject(): boolean {
  const packagePath = path.join(getProjectRoot(), 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    return false;
  }

  interface PackageJson {
    name?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }

  const packageJson = readJsonFile<PackageJson>(packagePath, {});
  return !!(packageJson.dependencies?.['@payrox/go-beyond'] ||
         packageJson.devDependencies?.['@payrox/go-beyond'] ||
         packageJson.name?.includes('payrox'));
}

/**
 * @notice Validate plugin name format
 */
export function isValidPluginName(name: string): boolean {
  // Plugin names should be lowercase, alphanumeric with hyphens
  const pattern = /^[a-z0-9-]+$/;
  return pattern.test(name) && name.length >= 3 && name.length <= 50;
}

/**
 * @notice Generate unique identifier
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * @notice Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * @notice Get file extension
 */
export function getFileExtension(filename: string): string {
  return path.extname(filename).toLowerCase();
}

/**
 * @notice Check if file is a smart contract
 */
export function isContractFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ext === '.sol' || ext === '.vy';
}

/**
 * @notice Check if file is a TypeScript/JavaScript file
 */
export function isScriptFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ext === '.ts' || ext === '.js';
}

/**
 * @notice Slugify a string for use in file/directory names
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * @notice Capitalize first letter of each word
 */
export function titleCase(text: string): string {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * @notice Convert camelCase to kebab-case
 */
export function camelToKebab(text: string): string {
  return text.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * @notice Convert kebab-case to camelCase
 */
export function kebabToCamel(text: string): string {
  return text.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * @notice Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * @notice Simple template variable replacement
 */
export function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(pattern, value);
  }
  
  return result;
}

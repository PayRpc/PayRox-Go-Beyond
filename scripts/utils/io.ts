import * as fs from "fs";
import * as path from "path";

/**
 * Utility functions for file I/O operations
 */

export interface FileMetadata {
  path: string;
  size: number;
  created: Date;
  modified: Date;
  checksum: string;
}

/**
 * Read JSON file with error handling
 * @param filePath Path to the JSON file
 * @returns Parsed JSON object
 */
export function readJsonFile(filePath: string): any {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read JSON file ${filePath}: ${error}`);
  }
}

/**
 * Write JSON file with formatting
 * @param filePath Path to write the file
 * @param data Data to write
 * @param indent Number of spaces for indentation
 */
export function writeJsonFile(filePath: string, data: any, indent: number = 2): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const content = JSON.stringify(data, null, indent);
    fs.writeFileSync(filePath, content, "utf8");
  } catch (error) {
    throw new Error(`Failed to write JSON file ${filePath}: ${error}`);
  }
}

/**
 * Read text file with encoding handling
 * @param filePath Path to the text file
 * @param encoding File encoding (default: utf8)
 * @returns File content as string
 */
export function readTextFile(filePath: string, encoding: "utf8" | "ascii" | "utf16le" = "utf8"): string {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    return fs.readFileSync(filePath, encoding);
  } catch (error) {
    throw new Error(`Failed to read text file ${filePath}: ${error}`);
  }
}

/**
 * Write text file with encoding
 * @param filePath Path to write the file
 * @param content Content to write
 * @param encoding File encoding (default: utf8)
 */
export function writeTextFile(
  filePath: string, 
  content: string, 
  encoding: "utf8" | "ascii" | "utf16le" = "utf8"
): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content, encoding);
  } catch (error) {
    throw new Error(`Failed to write text file ${filePath}: ${error}`);
  }
}

/**
 * Ensure directory exists, create if not
 * @param dirPath Directory path
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get file metadata
 * @param filePath Path to the file
 * @returns File metadata object
 */
export function getFileMetadata(filePath: string): FileMetadata {
  try {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath);
    const crypto = require("crypto");
    const checksum = crypto.createHash("sha256").update(content).digest("hex");
    
    return {
      path: filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      checksum: checksum
    };
  } catch (error) {
    throw new Error(`Failed to get file metadata for ${filePath}: ${error}`);
  }
}

/**
 * List files in directory with filter
 * @param dirPath Directory path
 * @param extension File extension filter (optional)
 * @param recursive Whether to search recursively
 * @returns Array of file paths
 */
export function listFiles(
  dirPath: string, 
  extension?: string, 
  recursive: boolean = false
): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dirPath)) {
    return files;
  }
  
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory() && recursive) {
      files.push(...listFiles(fullPath, extension, recursive));
    } else if (stats.isFile()) {
      if (!extension || path.extname(item) === extension) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

/**
 * Copy file with metadata preservation
 * @param sourcePath Source file path
 * @param destinationPath Destination file path
 * @param preserveTimestamps Whether to preserve timestamps
 */
export function copyFile(
  sourcePath: string, 
  destinationPath: string, 
  preserveTimestamps: boolean = true
): void {
  try {
    const destDir = path.dirname(destinationPath);
    ensureDirectoryExists(destDir);
    
    fs.copyFileSync(sourcePath, destinationPath);
    
    if (preserveTimestamps) {
      const stats = fs.statSync(sourcePath);
      fs.utimesSync(destinationPath, stats.atime, stats.mtime);
    }
  } catch (error) {
    throw new Error(`Failed to copy file from ${sourcePath} to ${destinationPath}: ${error}`);
  }
}

/**
 * Move file
 * @param sourcePath Source file path
 * @param destinationPath Destination file path
 */
export function moveFile(sourcePath: string, destinationPath: string): void {
  try {
    const destDir = path.dirname(destinationPath);
    ensureDirectoryExists(destDir);
    
    fs.renameSync(sourcePath, destinationPath);
  } catch (error) {
    throw new Error(`Failed to move file from ${sourcePath} to ${destinationPath}: ${error}`);
  }
}

/**
 * Delete file safely
 * @param filePath File path to delete
 * @param force Whether to force deletion
 */
export function deleteFile(filePath: string, force: boolean = false): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else if (!force) {
      throw new Error(`File does not exist: ${filePath}`);
    }
  } catch (error) {
    throw new Error(`Failed to delete file ${filePath}: ${error}`);
  }
}

/**
 * Archive directory to tar.gz
 * @param dirPath Directory to archive
 * @param archivePath Output archive path
 */
export function archiveDirectory(dirPath: string, archivePath: string): void {
  const tar = require("tar");
  
  try {
    tar.create(
      {
        gzip: true,
        file: archivePath,
        cwd: path.dirname(dirPath)
      },
      [path.basename(dirPath)]
    );
  } catch (error) {
    throw new Error(`Failed to archive directory ${dirPath}: ${error}`);
  }
}

/**
 * Extract archive
 * @param archivePath Archive file path
 * @param extractPath Extraction destination
 */
export function extractArchive(archivePath: string, extractPath: string): void {
  const tar = require("tar");
  
  try {
    ensureDirectoryExists(extractPath);
    
    tar.extract({
      file: archivePath,
      cwd: extractPath
    });
  } catch (error) {
    throw new Error(`Failed to extract archive ${archivePath}: ${error}`);
  }
}

/**
 * Calculate directory size
 * @param dirPath Directory path
 * @returns Size in bytes
 */
export function getDirectorySize(dirPath: string): number {
  let totalSize = 0;
  
  if (!fs.existsSync(dirPath)) {
    return 0;
  }
  
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      totalSize += getDirectorySize(fullPath);
    } else {
      totalSize += stats.size;
    }
  }
  
  return totalSize;
}

/**
 * Clean directory (remove all contents)
 * @param dirPath Directory path
 * @param preserveDir Whether to preserve the directory itself
 */
export function cleanDirectory(dirPath: string, preserveDir: boolean = true): void {
  try {
    if (!fs.existsSync(dirPath)) {
      return;
    }
    
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(fullPath);
      }
    }
    
    if (!preserveDir) {
      fs.rmdirSync(dirPath);
    }
  } catch (error) {
    throw new Error(`Failed to clean directory ${dirPath}: ${error}`);
  }
}

/**
 * Format file size for human reading
 * @param bytes Size in bytes
 * @returns Formatted size string
 */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

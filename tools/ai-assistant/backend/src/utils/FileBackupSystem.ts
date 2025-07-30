import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);

// Helper function to check if file exists
const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * File Backup and Recovery System for PayRox AI Assistant
 * 
 * Prevents file loss during crashes by:
 * - Creating automatic backups before modifications
 * - Versioned backup system with timestamps
 * - Recovery mechanisms for corrupted files
 * - Atomic file operations to prevent partial writes
 */
export class FileBackupSystem {
  private backupDir: string;
  private maxBackups: number;

  constructor(baseDir: string, maxBackups: number = 10) {
    this.backupDir = path.join(baseDir, '.backups');
    this.maxBackups = maxBackups;
    this.ensureBackupDirectory();
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      if (!await fileExists(this.backupDir)) {
        await mkdir(this.backupDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create backup directory:', error);
    }
  }

  /**
   * Create a backup of a file before modification
   */
  async backupFile(filePath: string): Promise<string | null> {
    try {
      if (!await fileExists(filePath)) {
        console.log(`File does not exist, skipping backup: ${filePath}`);
        return null;
      }

      const content = await readFile(filePath, 'utf8');
      const fileName = path.basename(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${fileName}.${timestamp}.backup`;
      const backupPath = path.join(this.backupDir, backupFileName);

      await writeFile(backupPath, content, 'utf8');
      
      // Clean up old backups
      await this.cleanupOldBackups(fileName);
      
      console.log(`✅ Backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error(`❌ Failed to backup file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Safely write a file with atomic operations
   */
  async safeWriteFile(filePath: string, content: string): Promise<boolean> {
    try {
      // Create backup first
      await this.backupFile(filePath);

      // Write to temporary file first
      const tempPath = `${filePath}.tmp`;
      await writeFile(tempPath, content, 'utf8');

      // Atomic move to final location
      fs.renameSync(tempPath, filePath);
      
      console.log(`✅ File safely written: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to safely write file ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Restore a file from backup
   */
  async restoreFromBackup(filePath: string, backupIndex: number = 0): Promise<boolean> {
    try {
      const fileName = path.basename(filePath);
      const backups = await this.getBackups(fileName);
      
      if (backups.length === 0) {
        console.log(`No backups found for ${fileName}`);
        return false;
      }

      if (backupIndex >= backups.length) {
        console.log(`Backup index ${backupIndex} out of range for ${fileName}`);
        return false;
      }

      const backupPath = backups[backupIndex];
      if (!backupPath) {
        console.log(`Invalid backup path for index ${backupIndex}`);
        return false;
      }
      const backupContent = await readFile(backupPath, 'utf8');
      
      await this.safeWriteFile(filePath, backupContent);
      
      console.log(`✅ File restored from backup: ${filePath} <- ${backupPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to restore file ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Get list of backups for a file (newest first)
   */
  async getBackups(fileName: string): Promise<string[]> {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups = files
        .filter(file => file.startsWith(fileName) && file.endsWith('.backup'))
        .map(file => path.join(this.backupDir, file))
        .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime());
      
      return backups;
    } catch (error) {
      console.error('Failed to get backups:', error);
      return [];
    }
  }

  /**
   * Clean up old backups, keeping only the most recent ones
   */
  private async cleanupOldBackups(fileName: string): Promise<void> {
    try {
      const backups = await this.getBackups(fileName);
      
      if (backups.length > this.maxBackups) {
        const toDelete = backups.slice(this.maxBackups);
        
        for (const backup of toDelete) {
          fs.unlinkSync(backup);
          console.log(`🗑️ Cleaned up old backup: ${backup}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Check if a file is empty or corrupted
   */
  async isFileCorrupted(filePath: string): Promise<boolean> {
    try {
      if (!await fileExists(filePath)) {
        return true; // File doesn't exist
      }

      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        return true; // File is empty
      }

      const content = await readFile(filePath, 'utf8');
      
      // Check for basic corruption indicators
      if (content.trim().length === 0) {
        return true; // Only whitespace
      }

      // For TypeScript files, check for basic syntax
      if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
        // Very basic check - ensure it has some kind of structure
        if (!content.includes('export') && !content.includes('import') && !content.includes('function') && !content.includes('class')) {
          return true; // Likely corrupted TypeScript/JavaScript
        }
      }

      return false;
    } catch (error) {
      console.error(`Error checking file corruption ${filePath}:`, error);
      return true; // Assume corrupted if we can't read it
    }
  }

  /**
   * Auto-recover corrupted files from backups
   */
  async autoRecover(filePath: string): Promise<boolean> {
    try {
      if (!await this.isFileCorrupted(filePath)) {
        return false; // File is not corrupted
      }

      console.log(`🔄 Attempting auto-recovery for corrupted file: ${filePath}`);
      
      const fileName = path.basename(filePath);
      const backups = await this.getBackups(fileName);
      
      // Try each backup until we find a good one
      for (let i = 0; i < backups.length; i++) {
        const backupPath = backups[i];
        if (!backupPath) {
          continue;
        }
        
        try {
          const backupContent = await readFile(backupPath, 'utf8');
          
          // Quick validation of backup content
          if (backupContent.trim().length > 0) {
            await writeFile(filePath, backupContent, 'utf8');
            console.log(`✅ Auto-recovery successful: ${filePath} <- ${backupPath}`);
            return true;
          }
        } catch {
          console.log(`Backup ${backupPath} is also corrupted, trying next...`);
          continue;
        }
      }
      
      console.log(`❌ No valid backups found for ${filePath}`);
      return false;
    } catch (error) {
      console.error(`❌ Auto-recovery failed for ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Monitor and protect critical files
   */
  async protectCriticalFiles(filePaths: string[]): Promise<void> {
    console.log('🛡️ Starting critical file protection...');
    
    for (const filePath of filePaths) {
      try {
        // Check if file is corrupted and auto-recover if needed
        if (await this.isFileCorrupted(filePath)) {
          console.log(`⚠️ Corrupted file detected: ${filePath}`);
          const recovered = await this.autoRecover(filePath);
          
          if (!recovered) {
            console.log(`❌ Could not recover ${filePath}, consider manual intervention`);
          }
        } else {
          // Create preventive backup of healthy files
          await this.backupFile(filePath);
        }
      } catch (error) {
        console.error(`Error protecting file ${filePath}:`, error);
      }
    }
  }

  /**
   * List all available backups
   */
  async listAllBackups(): Promise<Record<string, string[]>> {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backupsByFile: Record<string, string[]> = {};
      
      for (const file of files) {
        if (file.endsWith('.backup')) {
          const originalName = file.split('.')[0] + '.' + file.split('.')[1]; // Get original filename
          
          if (!backupsByFile[originalName]) {
            backupsByFile[originalName] = [];
          }
          
          backupsByFile[originalName].push(path.join(this.backupDir, file));
        }
      }
      
      // Sort each file's backups by date (newest first)
      for (const fileName in backupsByFile) {
        const backupList = backupsByFile[fileName];
        if (backupList) {
          backupList.sort((a, b) => 
            fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime()
          );
        }
      }
      
      return backupsByFile;
    } catch (error) {
      console.error('Failed to list backups:', error);
      return {};
    }
  }
}

export default FileBackupSystem;

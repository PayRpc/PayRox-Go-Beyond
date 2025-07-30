import { FileBackupSystem } from './FileBackupSystem';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { setInterval, clearInterval } from 'timers';

const readFile = promisify(fs.readFile);

/**
 * Crash Protection Manager for PayRox AI Assistant
 * 
 * Provides comprehensive protection against file loss during crashes:
 * - Automatic backup creation before any file modification
 * - Real-time monitoring of critical files
 * - Automatic recovery from corruption
 * - Safe file operations with rollback capability
 * - Periodic health checks and preventive backups
 */
export class CrashProtectionManager {
  private backupSystem: FileBackupSystem;
  private criticalFiles: Set<string>;
  private monitoringInterval: ReturnType<typeof setInterval> | null = null;
  private isMonitoring: boolean = false;

  // Critical files that should never be lost
  private static readonly DEFAULT_CRITICAL_FILES = [
    'tools/ai-assistant/backend/src/analyzers/AIRefactorWizard.ts',
    'tools/ai-assistant/backend/tsconfig.json',
    'tools/ai-assistant/frontend/tsconfig.json',
    'hardhat.config.ts',
    'package.json',
    'contracts/factory/DeterministicChunkFactory.sol',
    'contracts/dispatcher/ManifestDispatcher.sol',
    'contracts/orchestrator/Orchestrator.sol'
  ];

  constructor(workspaceRoot: string, maxBackups: number = 10) {
    this.backupSystem = new FileBackupSystem(workspaceRoot, maxBackups);
    this.criticalFiles = new Set();
    
    // Add default critical files with workspace root prefix
    CrashProtectionManager.DEFAULT_CRITICAL_FILES.forEach(file => {
      this.criticalFiles.add(path.resolve(workspaceRoot, file));
    });
  }

  /**
   * Add a file to the critical files list for protection
   */
  addCriticalFile(filePath: string): void {
    this.criticalFiles.add(path.resolve(filePath));
    console.log(`🛡️ Added critical file: ${filePath}`);
  }

  /**
   * Remove a file from critical files protection
   */
  removeCriticalFile(filePath: string): void {
    this.criticalFiles.delete(path.resolve(filePath));
    console.log(`🔓 Removed critical file protection: ${filePath}`);
  }

  /**
   * Safely modify a file with automatic backup and recovery
   */
  async safeModifyFile(filePath: string, modifier: (_content: string) => string): Promise<boolean> {
    try {
      console.log(`🔄 Safe modification starting for: ${filePath}`);
      
      // Create backup before modification
      const backupPath = await this.backupSystem.backupFile(filePath);
      if (!backupPath) {
        console.warn(`⚠️ Could not create backup for ${filePath}, proceeding with caution`);
      }

      // Read current content
      let originalContent = '';
      try {
        originalContent = await readFile(filePath, 'utf8');
      } catch {
        console.log(`File ${filePath} doesn't exist, will create new file`);
      }

      // Apply modification
      const modifiedContent = modifier(originalContent);

      // Validate modification result
      if (!this.validateContent(filePath, modifiedContent)) {
        console.error(`❌ Modification validation failed for ${filePath}`);
        return false;
      }

      // Write safely
      const success = await this.backupSystem.safeWriteFile(filePath, modifiedContent);
      
      if (success) {
        console.log(`✅ Safe modification completed for: ${filePath}`);
        
        // Verify the written file is not corrupted
        if (await this.backupSystem.isFileCorrupted(filePath)) {
          console.error(`❌ File became corrupted after write, attempting recovery`);
          await this.backupSystem.autoRecover(filePath);
          return false;
        }
        
        return true;
      } else {
        console.error(`❌ Failed to write modified content to ${filePath}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Safe modification failed for ${filePath}:`, error);
      
      // Attempt to recover from backup if modification failed
      try {
        await this.backupSystem.autoRecover(filePath);
      } catch (recoveryError) {
        console.error(`❌ Recovery also failed:`, recoveryError);
      }
      
      return false;
    }
  }

  /**
   * Validate content before writing (basic checks)
   */
  private validateContent(filePath: string, content: string): boolean {
    try {
      // Basic validation: content should not be empty (unless intentionally so)
      if (content.trim().length === 0) {
        console.warn(`⚠️ Content is empty for ${filePath}`);
        return false;
      }

      // TypeScript/JavaScript specific validation
      if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
        // Check for balanced braces (very basic syntax check)
        const openBraces = (content.match(/{/g) || []).length;
        const closeBraces = (content.match(/}/g) || []).length;
        
        if (openBraces !== closeBraces) {
          console.warn(`⚠️ Unbalanced braces detected in ${filePath}`);
          return false;
        }
      }

      // JSON specific validation
      if (filePath.endsWith('.json')) {
        try {
          JSON.parse(content);
        } catch {
          console.warn(`⚠️ Invalid JSON detected in ${filePath}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`Error validating content for ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Start monitoring critical files for corruption
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      console.log('🔍 Monitoring is already active');
      return;
    }

    console.log(`🔍 Starting file monitoring (interval: ${intervalMs}ms)`);
    this.isMonitoring = true;

    this.monitoringInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, intervalMs);

    // Perform initial health check
    this.performHealthCheck();
  }

  /**
   * Stop monitoring critical files
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 File monitoring stopped');
  }

  /**
   * Perform a health check on all critical files
   */
  async performHealthCheck(): Promise<void> {
    console.log('🏥 Performing health check on critical files...');
    
    let corruptedCount = 0;
    let recoveredCount = 0;
    let healthyCount = 0;

    for (const filePath of this.criticalFiles) {
      try {
        if (await this.backupSystem.isFileCorrupted(filePath)) {
          console.warn(`⚠️ Corrupted file detected: ${filePath}`);
          corruptedCount++;
          
          const recovered = await this.backupSystem.autoRecover(filePath);
          if (recovered) {
            recoveredCount++;
            console.log(`✅ Successfully recovered: ${filePath}`);
          } else {
            console.error(`❌ Could not recover: ${filePath}`);
          }
        } else {
          healthyCount++;
          
          // Create preventive backup for healthy files
          await this.backupSystem.backupFile(filePath);
        }
      } catch (error) {
        console.error(`Error checking file ${filePath}:`, error);
        corruptedCount++;
      }
    }

    console.log(`🏥 Health check complete: ${healthyCount} healthy, ${corruptedCount} corrupted, ${recoveredCount} recovered`);
  }

  /**
   * Create emergency backups of all critical files
   */
  async createEmergencyBackups(): Promise<void> {
    console.log('🚨 Creating emergency backups...');
    
    for (const filePath of this.criticalFiles) {
      try {
        await this.backupSystem.backupFile(filePath);
      } catch (error) {
        console.error(`Failed to backup ${filePath}:`, error);
      }
    }
    
    console.log('🚨 Emergency backups completed');
  }

  /**
   * Get status report of all critical files
   */
  async getStatusReport(): Promise<{
    totalFiles: number;
    healthyFiles: number;
    corruptedFiles: number;
    backupCount: Record<string, number>;
    lastHealthCheck: Date;
  }> {
    const report = {
      totalFiles: this.criticalFiles.size,
      healthyFiles: 0,
      corruptedFiles: 0,
      backupCount: {} as Record<string, number>,
      lastHealthCheck: new Date()
    };

    for (const filePath of this.criticalFiles) {
      try {
        if (await this.backupSystem.isFileCorrupted(filePath)) {
          report.corruptedFiles++;
        } else {
          report.healthyFiles++;
        }

        // Count backups for this file
        const fileName = path.basename(filePath);
        const backups = await this.backupSystem.getBackups(fileName);
        report.backupCount[fileName] = backups.length;
      } catch (error) {
        console.error(`Error checking status of ${filePath}:`, error);
        report.corruptedFiles++;
      }
    }

    return report;
  }

  /**
   * Recover all corrupted critical files
   */
  async recoverAllCorrupted(): Promise<number> {
    console.log('🔄 Attempting to recover all corrupted files...');
    
    let recoveredCount = 0;

    for (const filePath of this.criticalFiles) {
      try {
        if (await this.backupSystem.isFileCorrupted(filePath)) {
          const recovered = await this.backupSystem.autoRecover(filePath);
          if (recovered) {
            recoveredCount++;
          }
        }
      } catch (error) {
        console.error(`Error recovering ${filePath}:`, error);
      }
    }

    console.log(`🔄 Recovery complete: ${recoveredCount} files recovered`);
    return recoveredCount;
  }

  /**
   * List all available backups for critical files
   */
  async listCriticalFileBackups(): Promise<Record<string, string[]>> {
    const allBackups = await this.backupSystem.listAllBackups();
    const criticalBackups: Record<string, string[]> = {};

    for (const filePath of this.criticalFiles) {
      const fileName = path.basename(filePath);
      if (allBackups[fileName]) {
        criticalBackups[fileName] = allBackups[fileName];
      }
    }

    return criticalBackups;
  }

  /**
   * Cleanup - stop monitoring and clean resources
   */
  cleanup(): void {
    this.stopMonitoring();
    console.log('🧹 Crash protection manager cleaned up');
  }
}

export default CrashProtectionManager;

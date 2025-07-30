/**
 * Simple crash protection test and file recovery system
 * TypeScript version for PayRox Go Beyond
 */

import * as fs from 'fs';
import * as path from 'path';

// Get workspace root
const WORKSPACE_ROOT = process.cwd();
console.log(`🛡️ PayRox Crash Protection - Workspace: ${WORKSPACE_ROOT}`);

// Create immediate backups of critical files that exist
const criticalFiles: string[] = [
  'tools/ai-assistant/backend/src/analyzers/AIRefactorWizard.ts',
  'tools/ai-assistant/backend/tsconfig.json',
  'tools/ai-assistant/frontend/tsconfig.json',
  'package.json',
  'hardhat.config.ts',
  'tools/ai-assistant/backend/src/utils/FileBackupSystem.ts',
  'tools/ai-assistant/backend/src/utils/CrashProtectionManager.ts',
  'demo/facet-simulator-demo.ts',
  'src/analyzers/FacetSimulator.ts',
  'src/analyzers/SolidityAnalyzer.ts',
  'src/analyzers/StorageLayoutChecker.ts'
];

const backupDir = path.join(WORKSPACE_ROOT, '.crash-backups');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`📁 Created backup directory: ${backupDir}`);
}

// Create immediate backups
console.log('🚨 Creating immediate protective backups...');

criticalFiles.forEach((relativePath: string) => {
  const fullPath = path.join(WORKSPACE_ROOT, relativePath);
  
  if (fs.existsSync(fullPath)) {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const fileName = path.basename(fullPath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${fileName}.${timestamp}.protective-backup`;
      const backupPath = path.join(backupDir, backupFileName);
      
      fs.writeFileSync(backupPath, content, 'utf8');
      console.log(`✅ Protected: ${relativePath} -> ${backupFileName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to backup ${relativePath}:`, errorMessage);
    }
  } else {
    console.log(`⚠️ File not found: ${relativePath}`);
  }
});

console.log(`\n🛡️ Crash protection backups completed!`);
console.log(`📁 Backups stored in: ${backupDir}`);
console.log(`\n🔍 To list all backups, run:`);
console.log(`   dir "${backupDir}"`);
console.log(`\n🔄 To restore a file, copy from backup directory back to original location.`);

// List current backups
console.log('\n📋 Current protective backups:');
try {
  const backupFiles = fs.readdirSync(backupDir);
  backupFiles.forEach((file: string) => {
    const stats = fs.statSync(path.join(backupDir, file));
    console.log(`   ${file} (${Math.round(stats.size / 1024)}KB, ${stats.mtime.toLocaleString()})`);
  });
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('Could not list backup files:', errorMessage);
}

/**
 * Recovery function to restore a specific file from backup
 */
export const restoreFileFromBackup = (originalPath: string, backupFileName?: string): boolean => {
  try {
    const fullBackupDir = path.join(WORKSPACE_ROOT, '.crash-backups');
    const fileName = path.basename(originalPath);
    
    if (backupFileName) {
      // Restore from specific backup
      const backupPath = path.join(fullBackupDir, backupFileName);
      if (fs.existsSync(backupPath)) {
        const content = fs.readFileSync(backupPath, 'utf8');
        fs.writeFileSync(originalPath, content, 'utf8');
        console.log(`✅ Restored ${originalPath} from ${backupFileName}`);
        return true;
      } else {
        console.error(`❌ Backup file not found: ${backupFileName}`);
        return false;
      }
    } else {
      // Restore from most recent backup
      const backupFiles = fs.readdirSync(fullBackupDir)
        .filter(file => file.startsWith(fileName) && file.endsWith('.protective-backup'))
        .sort((a, b) => {
          const statA = fs.statSync(path.join(fullBackupDir, a));
          const statB = fs.statSync(path.join(fullBackupDir, b));
          return statB.mtime.getTime() - statA.mtime.getTime();
        });
      
      if (backupFiles.length > 0) {
        const latestBackup = backupFiles[0];
        const backupPath = path.join(fullBackupDir, latestBackup);
        const content = fs.readFileSync(backupPath, 'utf8');
        fs.writeFileSync(originalPath, content, 'utf8');
        console.log(`✅ Restored ${originalPath} from latest backup: ${latestBackup}`);
        return true;
      } else {
        console.error(`❌ No backups found for file: ${fileName}`);
        return false;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to restore ${originalPath}:`, errorMessage);
    return false;
  }
};

/**
 * Function to validate file integrity
 */
export const validateFileIntegrity = (filePath: string): boolean => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ File does not exist: ${filePath}`);
      return false;
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      console.log(`⚠️ File is empty: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic content validation
    if (content.trim().length === 0) {
      console.log(`⚠️ File contains only whitespace: ${filePath}`);
      return false;
    }

    // TypeScript/JavaScript file validation
    if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
      const openBraces = (content.match(/{/g) || []).length;
      const closeBraces = (content.match(/}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        console.log(`⚠️ Unbalanced braces in: ${filePath}`);
        return false;
      }
    }

    // JSON file validation
    if (filePath.endsWith('.json')) {
      try {
        JSON.parse(content);
      } catch {
        console.log(`⚠️ Invalid JSON in: ${filePath}`);
        return false;
      }
    }

    console.log(`✅ File integrity OK: ${filePath}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error validating ${filePath}:`, errorMessage);
    return false;
  }
};

// If this script is run directly, execute the backup creation
if (require.main === module) {
  console.log('\n🔍 Validating file integrity...');
  
  // Validate critical files
  criticalFiles.forEach((relativePath: string) => {
    const fullPath = path.join(WORKSPACE_ROOT, relativePath);
    if (fs.existsSync(fullPath)) {
      validateFileIntegrity(fullPath);
    }
  });
}

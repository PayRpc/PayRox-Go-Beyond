#!/usr/bin/env node

/**
 * PayRox AI Assistant Crash Protection Initializer
 * 
 * This script initializes comprehensive crash protection for the PayRox AI Assistant
 * by setting up file monitoring, backup systems, and recovery mechanisms.
 */

import { CrashProtectionManager } from '../src/utils/CrashProtectionManager';
import * as path from 'path';
import * as process from 'process';
import { setInterval } from 'timers';

// Get workspace root (current working directory should be the workspace root)
const WORKSPACE_ROOT = process.cwd();

async function initializeCrashProtection(): Promise<void> {
  console.log('🛡️ Initializing PayRox AI Assistant Crash Protection...');
  console.log(`📁 Workspace: ${WORKSPACE_ROOT}`);

  try {
    // Create crash protection manager
    const protectionManager = new CrashProtectionManager(WORKSPACE_ROOT, 15);

    // Add additional critical files specific to current development
    const additionalCriticalFiles = [
      'tools/ai-assistant/backend/src/utils/FileBackupSystem.ts',
      'tools/ai-assistant/backend/src/utils/CrashProtectionManager.ts',
      'tools/ai-assistant/backend/src/app.ts',
      'tools/ai-assistant/backend/package.json',
      'tools/ai-assistant/frontend/package.json',
      'scripts/build-manifest.ts',
      'scripts/deploy-dispatcher.ts',
      'scripts/deploy-factory.ts'
    ];

    additionalCriticalFiles.forEach(file => {
      protectionManager.addCriticalFile(path.resolve(WORKSPACE_ROOT, file));
    });

    // Perform initial health check and recovery
    console.log('🏥 Performing initial health check...');
    await protectionManager.performHealthCheck();

    // Create emergency backups
    console.log('🚨 Creating initial emergency backups...');
    await protectionManager.createEmergencyBackups();

    // Get initial status report
    const statusReport = await protectionManager.getStatusReport();
    console.log('📊 Initial Status Report:');
    console.log(`   Total Files: ${statusReport.totalFiles}`);
    console.log(`   Healthy Files: ${statusReport.healthyFiles}`);
    console.log(`   Corrupted Files: ${statusReport.corruptedFiles}`);
    console.log(`   Backup Counts:`, statusReport.backupCount);

    // Start monitoring if not in CI environment
    if (!process.env.CI && !process.env.NODE_ENV?.includes('test')) {
      console.log('🔍 Starting continuous file monitoring...');
      protectionManager.startMonitoring(30000); // Check every 30 seconds

      // Handle graceful shutdown
      const cleanup = () => {
        console.log('\n🛑 Shutting down crash protection...');
        protectionManager.cleanup();
        process.exit(0);
      };

      // Set up signal handlers without trying to modify process properties
      try {
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
      } catch (error) {
        console.warn('Could not set up signal handlers:', error);
      }

      // Keep the process running
      console.log('✅ Crash protection is now active!');
      console.log('   Press Ctrl+C to stop monitoring');
      
      // Periodic status reports
      setInterval(async () => {
        try {
          const report = await protectionManager.getStatusReport();
          if (report.corruptedFiles > 0) {
            console.log(`⚠️ Status Alert: ${report.corruptedFiles} corrupted files detected`);
            await protectionManager.recoverAllCorrupted();
          }
        } catch (error) {
          console.error('Error generating status report:', error);
        }
      }, 300000); // Every 5 minutes
      
    } else {
      console.log('🔧 CI/Test environment detected, skipping continuous monitoring');
      protectionManager.cleanup();
    }

  } catch (error) {
    console.error('❌ Failed to initialize crash protection:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions safely
try {
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    console.log('🚨 Attempting emergency backup before crash...');
    
    // Try to create emergency backups before exiting
    const protectionManager = new CrashProtectionManager(WORKSPACE_ROOT, 15);
    protectionManager.createEmergencyBackups()
      .then(() => {
        console.log('✅ Emergency backups completed');
        process.exit(1);
      })
      .catch((backupError) => {
        console.error('❌ Emergency backup failed:', backupError);
        process.exit(1);
      });
  });
} catch (error) {
  console.warn('Could not set up uncaught exception handler:', error);
}

// Handle unhandled promise rejections safely
try {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    console.log('🚨 Attempting emergency backup before crash...');
    
    const protectionManager = new CrashProtectionManager(WORKSPACE_ROOT, 15);
    protectionManager.createEmergencyBackups()
      .then(() => {
        console.log('✅ Emergency backups completed');
        process.exit(1);
      })
      .catch((backupError) => {
        console.error('❌ Emergency backup failed:', backupError);
        process.exit(1);
      });
  });
} catch (error) {
  console.warn('Could not set up unhandled rejection handler:', error);
}

// Start initialization
if (require.main === module) {
  initializeCrashProtection().catch((error) => {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  });
}

export { initializeCrashProtection };

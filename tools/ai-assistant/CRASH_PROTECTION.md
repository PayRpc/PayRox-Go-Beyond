# PayRox AI Assistant Crash Protection System

## Overview

The PayRox AI Assistant Crash Protection System provides comprehensive protection against file loss and corruption during development, especially when working with AI-powered code generation and modification tools.

## Features

### 🛡️ Automatic File Protection
- **Automatic Backups**: Creates timestamped backups before any file modification
- **Real-time Monitoring**: Continuously monitors critical files for corruption
- **Auto-recovery**: Automatically restores corrupted files from the most recent valid backup
- **Atomic Operations**: Uses atomic file operations to prevent partial writes during crashes

### 📁 Backup Management
- **Versioned Backups**: Maintains multiple versions of each file with timestamps
- **Smart Cleanup**: Automatically removes old backups while preserving recent ones
- **Emergency Backups**: Creates immediate backups during system crashes
- **Backup Validation**: Verifies backup integrity before using for recovery

### 🔍 Health Monitoring
- **Corruption Detection**: Identifies empty, malformed, or corrupted files
- **Periodic Health Checks**: Regular validation of critical files
- **Status Reporting**: Detailed reports on file health and backup status
- **Proactive Recovery**: Attempts to fix issues before they become critical

## Quick Start

### 1. Initialize Crash Protection

```bash
# From the ai-assistant/backend directory
npm run crash-protection
```

This will:
- Set up backup systems for critical files
- Perform initial health checks
- Start continuous monitoring
- Create emergency backups

### 2. Manual Operations

```typescript
import { CrashProtectionManager } from './src/utils/CrashProtectionManager';

const protection = new CrashProtectionManager('/workspace/root', 10);

// Add custom critical files
protection.addCriticalFile('/path/to/important/file.ts');

// Safe file modification
await protection.safeModifyFile('/path/to/file.ts', (content) => {
  return content.replace('old', 'new');
});

// Manual health check
await protection.performHealthCheck();

// Get status report
const status = await protection.getStatusReport();
console.log(status);
```

## Architecture

### Core Components

#### FileBackupSystem
- Handles backup creation and management
- Provides atomic file operations
- Manages backup cleanup and versioning
- Validates file integrity

#### CrashProtectionManager
- Orchestrates overall protection strategy
- Manages critical file lists
- Coordinates monitoring and recovery
- Provides high-level API for safe operations

### Protected Files

The system automatically protects these critical files:

**Core PayRox Files:**
- `contracts/factory/DeterministicChunkFactory.sol`
- `contracts/dispatcher/ManifestDispatcher.sol`
- `contracts/orchestrator/Orchestrator.sol`
- `hardhat.config.ts`
- `package.json`

**AI Assistant Files:**
- `tools/ai-assistant/backend/src/analyzers/AIRefactorWizard.ts`
- `tools/ai-assistant/backend/tsconfig.json`
- `tools/ai-assistant/frontend/tsconfig.json`
- `tools/ai-assistant/backend/src/app.ts`

**Build and Deploy Scripts:**
- `scripts/build-manifest.ts`
- `scripts/deploy-dispatcher.ts`
- `scripts/deploy-factory.ts`

## Configuration

### Environment Variables

```bash
# Disable monitoring in CI/test environments
NODE_ENV=test

# Enable crash protection logging
DEBUG=crash-protection
```

### TypeScript Configuration

The system enhances `tsconfig.json` with crash protection features:

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  },
  "watchOptions": {
    "useFsEvents": false,
    "synchronousWatchDirectory": true
  },
  "ts-node": {
    "compilerOptions": {
      "preserveWatchOutput": true
    }
  }
}
```

## Usage Patterns

### Safe File Modifications

```typescript
// Instead of direct file writes
fs.writeFileSync('file.ts', newContent);

// Use safe modification
await protection.safeModifyFile('file.ts', (content) => {
  // Your modification logic
  return modifiedContent;
});
```

### Emergency Recovery

```typescript
// Recover all corrupted files
const recoveredCount = await protection.recoverAllCorrupted();

// Recover specific file from backup
const success = await protection.backupSystem.restoreFromBackup('file.ts', 0);
```

### Health Monitoring

```typescript
// Manual health check
await protection.performHealthCheck();

// Continuous monitoring
protection.startMonitoring(30000); // Check every 30 seconds

// Get detailed status
const status = await protection.getStatusReport();
console.log(`Healthy: ${status.healthyFiles}, Corrupted: ${status.corruptedFiles}`);
```

## Recovery Procedures

### Automatic Recovery
1. **Detection**: System detects file corruption during monitoring
2. **Backup Selection**: Identifies most recent valid backup
3. **Validation**: Verifies backup integrity
4. **Restoration**: Atomically restores file from backup
5. **Verification**: Confirms successful recovery

### Manual Recovery
```bash
# Start crash protection to perform auto-recovery
npm run crash-protection

# Or use the FileBackupSystem directly
node -e "
const { FileBackupSystem } = require('./dist/src/utils/FileBackupSystem');
const backup = new FileBackupSystem('.');
backup.autoRecover('path/to/corrupted/file.ts');
"
```

### Emergency Procedures

If the system itself becomes corrupted:

1. **Stop all running processes**
2. **Check backup directory**: `.backups/`
3. **Manually restore from most recent backup**
4. **Restart crash protection system**

## Best Practices

### For Developers
- Always use `safeModifyFile()` for programmatic file changes
- Run crash protection during development sessions
- Regularly check status reports for early warning signs
- Keep backup directories in version control ignore lists

### For AI Assistants
- Initialize crash protection before making any file modifications
- Use atomic operations for all file writes
- Validate file content before and after modifications
- Create backups before major refactoring operations

### For CI/CD
- Skip continuous monitoring in CI environments
- Run one-time health checks and backups
- Include backup validation in test suites
- Store critical backups as CI artifacts

## Troubleshooting

### Common Issues

**Empty Files After Crash**
```bash
# Auto-recover all corrupted files
npm run crash-protection
```

**Missing Backups**
```bash
# Create emergency backups immediately
node -e "
const { CrashProtectionManager } = require('./dist/src/utils/CrashProtectionManager');
const protection = new CrashProtectionManager('.');
protection.createEmergencyBackups();
"
```

**High Backup Disk Usage**
- Adjust `maxBackups` parameter in CrashProtectionManager constructor
- Run manual cleanup of old backups
- Check backup directory permissions

### Debug Information

Enable detailed logging:
```bash
DEBUG=crash-protection npm run crash-protection
```

Check system status:
```bash
node -e "
const { CrashProtectionManager } = require('./dist/src/utils/CrashProtectionManager');
const protection = new CrashProtectionManager('.');
protection.getStatusReport().then(console.log);
"
```

## Integration with PayRox

The crash protection system is designed specifically for PayRox Go Beyond development:

- **Manifest Protection**: Backs up deployment manifests and chunk configurations
- **Contract Safety**: Protects Solidity contracts from corruption during AI refactoring
- **Build Integrity**: Ensures TypeScript and configuration files remain consistent
- **Deployment Safety**: Creates checkpoints before deployment script execution

## Security Considerations

- Backup files contain sensitive code and should be treated accordingly
- Ensure backup directories have appropriate permissions
- Consider encryption for backups in production environments
- Regularly audit backup contents for sensitive information

## Performance Impact

- **Minimal Runtime Overhead**: Backups are created asynchronously
- **Storage Usage**: ~10-15 backup versions per file (configurable)
- **Monitoring Frequency**: Default 30-second intervals (configurable)
- **Recovery Time**: Typically <1 second for small to medium files

## Support and Maintenance

### Regular Maintenance
- Monitor backup disk usage
- Review crash protection logs
- Test recovery procedures periodically
- Update critical file lists as project evolves

### Getting Help
- Check system logs for error details
- Review backup directory structure
- Verify file permissions and access rights
- Test with minimal reproduction cases

---

## API Reference

See inline documentation in:
- `src/utils/FileBackupSystem.ts`
- `src/utils/CrashProtectionManager.ts`
- `scripts/crash-protection-init.ts`

import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import {
  cleanDirectory,
  copyFile,
  deleteFile,
  ensureDirectoryExists,
  ensureDirectoryExistsAsync,
  FILE_LIMITS,
  FileOperationError,
  formatFileSize,
  getDirectorySize,
  getFileExtension,
  getFileMetadata,
  getFileMetadataAsync,
  isFileReadable,
  isPathSafe,
  listFiles,
  moveFile,
  readDeploymentArtifact,
  readJsonFile,
  readJsonFileAsync,
  readManifestFile,
  readTextFile,
  saveDeploymentArtifact,
  SecurityError,
  validateFileSize,
  validatePath,
  writeJsonFile,
  writeJsonFileAsync,
  writeTextFile,
} from '../../scripts/utils/io';

describe('Enhanced I/O Utilities', () => {
  const testDir = path.join(__dirname, 'temp-io-test');
  const testFile = path.join(testDir, 'test.json');
  const testTextFile = path.join(testDir, 'test.txt');

  beforeEach(async () => {
    // Clean up any existing test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    ensureDirectoryExists(testDir);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECURITY & VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Security & Validation', () => {
    describe('validatePath', () => {
      it('should validate normal paths', () => {
        expect(() => validatePath('/valid/path/file.txt')).to.not.throw();
        expect(() => validatePath('relative/path/file.txt')).to.not.throw();
      });

      it('should reject path traversal attempts', () => {
        expect(() => validatePath('../../../etc/passwd')).to.throw(
          SecurityError
        );
        expect(() => validatePath('valid/../../../etc/passwd')).to.throw(
          SecurityError
        );
        expect(() => validatePath('~/sensitive/file')).to.throw(SecurityError);
      });

      it('should validate against base directory', () => {
        const baseDir = '/safe/directory';
        expect(() =>
          validatePath('/safe/directory/file.txt', baseDir)
        ).to.not.throw();
        expect(() =>
          validatePath('/unsafe/directory/file.txt', baseDir)
        ).to.throw(SecurityError);
      });

      it('should reject invalid inputs', () => {
        expect(() => validatePath('')).to.throw(SecurityError);
        expect(() => validatePath(null as any)).to.throw(SecurityError);
      });
    });

    describe('validateFileSize', () => {
      it('should accept files within limits', () => {
        expect(() => validateFileSize(1000)).to.not.throw();
        expect(() => validateFileSize(1000, 2000)).to.not.throw();
      });

      it('should reject files exceeding limits', () => {
        expect(() => validateFileSize(FILE_LIMITS.MAX_FILE_SIZE + 1)).to.throw(
          FileOperationError
        );
        expect(() => validateFileSize(1000, 500)).to.throw(FileOperationError);
      });

      it('should apply type-specific limits', () => {
        expect(() =>
          validateFileSize(FILE_LIMITS.MAX_JSON_SIZE + 1, undefined, 'json')
        ).to.throw(FileOperationError);
        expect(() =>
          validateFileSize(FILE_LIMITS.MAX_TEXT_SIZE + 1, undefined, 'text')
        ).to.throw(FileOperationError);
      });
    });

    describe('isPathSafe', () => {
      it('should return true for safe paths', () => {
        expect(isPathSafe('/safe/path/file.txt')).to.be.true;
        expect(isPathSafe('relative/file.txt')).to.be.true;
      });

      it('should return false for unsafe paths', () => {
        expect(isPathSafe('../../../etc/passwd')).to.be.false;
        expect(isPathSafe('~/sensitive')).to.be.false;
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // JSON OPERATIONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('JSON Operations', () => {
    describe('readJsonFile', () => {
      it('should read valid JSON files', () => {
        const testData = { test: 'data', number: 42 };
        fs.writeFileSync(testFile, JSON.stringify(testData));

        const result = readJsonFile(testFile);
        expect(result).to.deep.equal(testData);
      });

      it('should throw FileOperationError for non-existent files', () => {
        expect(() => readJsonFile(path.join(testDir, 'nonexistent.json')))
          .to.throw(FileOperationError)
          .with.property('operation', 'read_json');
      });

      it('should throw FileOperationError for invalid JSON', () => {
        fs.writeFileSync(testFile, 'invalid json content');
        expect(() => readJsonFile(testFile)).to.throw(FileOperationError);
      });

      it('should respect size limits', () => {
        const largeData = { data: 'x'.repeat(1000) };
        fs.writeFileSync(testFile, JSON.stringify(largeData));

        expect(() => readJsonFile(testFile, { maxSize: 100 })).to.throw(
          FileOperationError
        );
      });

      it('should support typed returns', () => {
        interface TestInterface {
          name: string;
          value: number;
        }

        const testData: TestInterface = { name: 'test', value: 123 };
        fs.writeFileSync(testFile, JSON.stringify(testData));

        const result = readJsonFile<TestInterface>(testFile);
        expect(result.name).to.equal('test');
        expect(result.value).to.equal(123);
      });
    });

    describe('readJsonFileAsync', () => {
      it('should read JSON files asynchronously', async () => {
        const testData = { async: true, value: 42 };
        fs.writeFileSync(testFile, JSON.stringify(testData));

        const result = await readJsonFileAsync(testFile);
        expect(result).to.deep.equal(testData);
      });

      it('should handle async errors properly', async () => {
        try {
          await readJsonFileAsync(path.join(testDir, 'nonexistent.json'));
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(error).to.be.instanceOf(FileOperationError);
          expect((error as FileOperationError).operation).to.equal(
            'read_json_async'
          );
        }
      });
    });

    describe('writeJsonFile', () => {
      it('should write JSON files with proper formatting', () => {
        const testData = { formatted: true, array: [1, 2, 3] };
        writeJsonFile(testFile, testData);

        expect(fs.existsSync(testFile)).to.be.true;
        const content = fs.readFileSync(testFile, 'utf8');
        expect(JSON.parse(content)).to.deep.equal(testData);
        expect(content).to.include('\n'); // Should be formatted
      });

      it("should create directories if they don't exist", () => {
        const nestedFile = path.join(testDir, 'nested', 'deep', 'test.json');
        writeJsonFile(nestedFile, { nested: true });

        expect(fs.existsSync(nestedFile)).to.be.true;
      });

      it('should support custom indentation', () => {
        const testData = { indented: true };
        writeJsonFile(testFile, testData, { indent: 4 });

        const content = fs.readFileSync(testFile, 'utf8');
        expect(content).to.include('    '); // 4-space indentation
      });

      it('should create backups when requested', () => {
        // Create initial file
        writeJsonFile(testFile, { version: 1 });

        // Overwrite with backup option
        writeJsonFile(testFile, { version: 2 }, { backup: true });

        // Check that backup was created
        const backupFiles = fs
          .readdirSync(testDir)
          .filter(f => f.includes('.backup.'));
        expect(backupFiles).to.have.length(1);
      });
    });

    describe('writeJsonFileAsync', () => {
      it('should write JSON files asynchronously', async () => {
        const testData = { async: true, write: 'success' };
        await writeJsonFileAsync(testFile, testData);

        expect(fs.existsSync(testFile)).to.be.true;
        const content = JSON.parse(fs.readFileSync(testFile, 'utf8'));
        expect(content).to.deep.equal(testData);
      });

      it('should handle async backup creation', async () => {
        // Create initial file
        await writeJsonFileAsync(testFile, { version: 1 });

        // Overwrite with backup
        await writeJsonFileAsync(testFile, { version: 2 }, { backup: true });

        const backupFiles = fs
          .readdirSync(testDir)
          .filter(f => f.includes('.backup.'));
        expect(backupFiles).to.have.length(1);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT FILE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Text File Operations', () => {
    describe('readTextFile', () => {
      it('should read text files with different encodings', () => {
        const testContent = 'Hello, PayRox! 🚀';
        fs.writeFileSync(testTextFile, testContent, 'utf8');

        const result = readTextFile(testTextFile);
        expect(result).to.equal(testContent);
      });

      it('should respect size limits for text files', () => {
        const largeContent = 'x'.repeat(1000);
        fs.writeFileSync(testTextFile, largeContent);

        expect(() => readTextFile(testTextFile, { maxSize: 100 })).to.throw(
          FileOperationError
        );
      });

      it('should validate file existence', () => {
        expect(() => readTextFile(path.join(testDir, 'nonexistent.txt')))
          .to.throw(FileOperationError)
          .with.property('operation', 'read_text');
      });
    });

    describe('writeTextFile', () => {
      it('should write text files with proper encoding', () => {
        const testContent = 'PayRox deployment script\nLine 2';
        writeTextFile(testTextFile, testContent);

        expect(fs.existsSync(testTextFile)).to.be.true;
        const content = fs.readFileSync(testTextFile, 'utf8');
        expect(content).to.equal(testContent);
      });

      it('should create directories for text files', () => {
        const nestedFile = path.join(testDir, 'scripts', 'test.txt');
        writeTextFile(nestedFile, 'nested content');

        expect(fs.existsSync(nestedFile)).to.be.true;
      });

      it('should validate content size', () => {
        const largeContent = 'x'.repeat(1000);
        expect(() =>
          writeTextFile(testTextFile, largeContent, { maxSize: 100 })
        ).to.throw(FileOperationError);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // METADATA OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Metadata Operations', () => {
    describe('getFileMetadata', () => {
      it('should return comprehensive file metadata', () => {
        const testContent = 'test content for metadata';
        fs.writeFileSync(testFile, testContent);

        const metadata = getFileMetadata(testFile);

        expect(metadata).to.have.property('path', testFile);
        expect(metadata).to.have.property('size');
        expect(metadata.size).to.be.greaterThan(0);
        expect(metadata).to.have.property('created');
        expect(metadata).to.have.property('modified');
        expect(metadata).to.have.property('checksum');
        expect(metadata).to.have.property('isDirectory', false);
        expect(metadata).to.have.property('permissions');
        expect(metadata.checksum).to.be.a('string').with.length(64); // SHA256
      });

      it('should handle directory metadata', () => {
        const metadata = getFileMetadata(testDir);
        expect(metadata.isDirectory).to.be.true;
      });

      it('should skip checksum when requested', () => {
        fs.writeFileSync(testFile, 'test');
        const metadata = getFileMetadata(testFile, { includeChecksum: false });
        expect(metadata.checksum).to.equal('');
      });
    });

    describe('getFileMetadataAsync', () => {
      it('should return metadata asynchronously', async () => {
        fs.writeFileSync(testFile, 'async test content');

        const metadata = await getFileMetadataAsync(testFile);
        expect(metadata).to.have.property('path', testFile);
        expect(metadata.size).to.be.greaterThan(0);
        expect(metadata.checksum).to.be.a('string');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYROX-SPECIFIC OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PayRox-Specific Operations', () => {
    describe('readManifestFile', () => {
      it('should read valid PayRox manifest files', () => {
        const manifest = {
          version: '1.0.0',
          network: { name: 'localhost', chainId: 31337 },
          routes: [
            {
              selector: '0x12345678',
              facet: '0xAbC123...',
              codehash: '0xdef456...',
            },
          ],
        };
        fs.writeFileSync(testFile, JSON.stringify(manifest));

        const result = readManifestFile(testFile);
        expect(result).to.deep.equal(manifest);
      });

      it('should validate manifest structure', () => {
        const invalidManifest = { version: '1.0.0' }; // Missing required fields
        fs.writeFileSync(testFile, JSON.stringify(invalidManifest));

        expect(() => readManifestFile(testFile))
          .to.throw(FileOperationError)
          .with.property('operation', 'read_manifest');
      });
    });

    describe('readDeploymentArtifact', () => {
      it('should read valid deployment artifacts', () => {
        const artifact = {
          address: '0x1234567890123456789012345678901234567890',
          transactionHash:
            '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          blockNumber: 12345,
          gasUsed: '500000',
          deployer: '0x9876543210987654321098765432109876543210',
        };
        fs.writeFileSync(testFile, JSON.stringify(artifact));

        const result = readDeploymentArtifact(testFile);
        expect(result).to.deep.equal(artifact);
      });

      it('should validate artifact structure', () => {
        const invalidArtifact = { address: '0x123...' }; // Missing transactionHash
        fs.writeFileSync(testFile, JSON.stringify(invalidArtifact));

        expect(() => readDeploymentArtifact(testFile))
          .to.throw(FileOperationError)
          .with.property('operation', 'read_deployment');
      });
    });

    describe('saveDeploymentArtifact', () => {
      it('should save deployment artifacts with enhanced metadata', () => {
        const artifact = {
          address: '0x1234567890123456789012345678901234567890',
          transactionHash:
            '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          blockNumber: 12345,
        };

        saveDeploymentArtifact(testFile, artifact);

        expect(fs.existsSync(testFile)).to.be.true;
        const saved = JSON.parse(fs.readFileSync(testFile, 'utf8'));
        expect(saved).to.have.property('address', artifact.address);
        expect(saved).to.have.property('timestamp');
        expect(saved).to.have.property('savedAt');
        expect(saved).to.have.property('version', '1.0.0');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DIRECTORY & FILE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Directory & File Operations', () => {
    describe('ensureDirectoryExists', () => {
      it('should create directories recursively', () => {
        const nestedDir = path.join(testDir, 'level1', 'level2', 'level3');
        ensureDirectoryExists(nestedDir);

        expect(fs.existsSync(nestedDir)).to.be.true;
        expect(fs.statSync(nestedDir).isDirectory()).to.be.true;
      });

      it('should not throw if directory already exists', () => {
        expect(() => ensureDirectoryExists(testDir)).to.not.throw();
      });
    });

    describe('ensureDirectoryExistsAsync', () => {
      it('should create directories asynchronously', async () => {
        const nestedDir = path.join(testDir, 'async', 'nested');
        await ensureDirectoryExistsAsync(nestedDir);

        expect(fs.existsSync(nestedDir)).to.be.true;
      });
    });

    describe('listFiles', () => {
      beforeEach(() => {
        // Create test file structure
        fs.writeFileSync(path.join(testDir, 'file1.txt'), 'content1');
        fs.writeFileSync(path.join(testDir, 'file2.json'), '{"data": "test"}');
        fs.mkdirSync(path.join(testDir, 'subdir'));
        fs.writeFileSync(path.join(testDir, 'subdir', 'file3.txt'), 'content3');
      });

      it('should list files in directory', () => {
        const files = listFiles(testDir) as string[];
        expect(files).to.have.length(2); // Non-recursive by default
        expect(files.some(f => f.includes('file1.txt'))).to.be.true;
        expect(files.some(f => f.includes('file2.json'))).to.be.true;
      });

      it('should list files recursively', () => {
        const files = listFiles(testDir, { recursive: true }) as string[];
        expect(files).to.have.length(3); // Should include subdirectory file
        expect(files.some(f => f.includes('file3.txt'))).to.be.true;
      });

      it('should filter by extension', () => {
        const txtFiles = listFiles(testDir, { extension: '.txt' }) as string[];
        expect(txtFiles).to.have.length(1);
        expect(txtFiles[0]).to.include('file1.txt');
      });

      it('should filter by pattern', () => {
        const pattern = /file[12]/;
        const files = listFiles(testDir, { pattern }) as string[];
        expect(files).to.have.length(2);
      });

      it('should return metadata when requested', () => {
        const files = listFiles(testDir, { includeMetadata: true });
        expect(files[0]).to.have.property('path');
        expect(files[0]).to.have.property('size');
        expect(files[0]).to.have.property('checksum');
      });
    });

    describe('copyFile', () => {
      it('should copy files with metadata preservation', () => {
        const sourceContent = 'source file content';
        fs.writeFileSync(testFile, sourceContent);
        const destFile = path.join(testDir, 'copied.json');

        copyFile(testFile, destFile);

        expect(fs.existsSync(destFile)).to.be.true;
        expect(fs.readFileSync(destFile, 'utf8')).to.equal(sourceContent);
      });

      it('should create backup when requested', () => {
        fs.writeFileSync(testFile, 'original');
        const destFile = path.join(testDir, 'destination.json');
        fs.writeFileSync(destFile, 'existing');

        copyFile(testFile, destFile, { backup: true });

        const backupFiles = fs
          .readdirSync(testDir)
          .filter(f => f.includes('.backup.'));
        expect(backupFiles).to.have.length(1);
      });
    });

    describe('moveFile', () => {
      it('should move files successfully', () => {
        const content = 'file to move';
        fs.writeFileSync(testFile, content);
        const destFile = path.join(testDir, 'moved.json');

        moveFile(testFile, destFile);

        expect(fs.existsSync(testFile)).to.be.false;
        expect(fs.existsSync(destFile)).to.be.true;
        expect(fs.readFileSync(destFile, 'utf8')).to.equal(content);
      });
    });

    describe('deleteFile', () => {
      it('should delete files safely', () => {
        fs.writeFileSync(testFile, 'to be deleted');

        deleteFile(testFile);

        expect(fs.existsSync(testFile)).to.be.false;
      });

      it('should create backup when requested', () => {
        fs.writeFileSync(testFile, 'to be deleted with backup');

        deleteFile(testFile, { backup: true });

        expect(fs.existsSync(testFile)).to.be.false;
        const backupFiles = fs
          .readdirSync(testDir)
          .filter(f => f.includes('.deleted.'));
        expect(backupFiles).to.have.length(1);
      });

      it('should handle non-existent files gracefully with force option', () => {
        expect(() =>
          deleteFile(path.join(testDir, 'nonexistent.txt'), { force: true })
        ).to.not.throw();
      });

      it('should throw error for non-existent files without force', () => {
        expect(() =>
          deleteFile(path.join(testDir, 'nonexistent.txt'))
        ).to.throw(FileOperationError);
      });
    });

    describe('getDirectorySize', () => {
      it('should calculate directory size correctly', () => {
        fs.writeFileSync(path.join(testDir, 'file1.txt'), 'a'.repeat(100));
        fs.writeFileSync(path.join(testDir, 'file2.txt'), 'b'.repeat(200));

        const size = getDirectorySize(testDir);
        expect(size).to.equal(300);
      });

      it('should handle empty directories', () => {
        const emptyDir = path.join(testDir, 'empty');
        fs.mkdirSync(emptyDir);

        const size = getDirectorySize(emptyDir);
        expect(size).to.equal(0);
      });
    });

    describe('cleanDirectory', () => {
      it('should clean directory contents while preserving directory', () => {
        fs.writeFileSync(path.join(testDir, 'file1.txt'), 'content');
        fs.writeFileSync(path.join(testDir, 'file2.txt'), 'content');

        cleanDirectory(testDir, { preserveDir: true });

        expect(fs.existsSync(testDir)).to.be.true;
        expect(fs.readdirSync(testDir)).to.have.length(0);
      });

      it('should remove directory when preserveDir is false', () => {
        const subDir = path.join(testDir, 'toRemove');
        fs.mkdirSync(subDir);
        fs.writeFileSync(path.join(subDir, 'file.txt'), 'content');

        cleanDirectory(subDir, { preserveDir: false });

        expect(fs.existsSync(subDir)).to.be.false;
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Utility Functions', () => {
    describe('formatFileSize', () => {
      it('should format file sizes correctly', () => {
        expect(formatFileSize(0)).to.equal('0 B');
        expect(formatFileSize(1024)).to.equal('1.00 KB');
        expect(formatFileSize(1048576)).to.equal('1.00 MB');
        expect(formatFileSize(1073741824)).to.equal('1.00 GB');
      });

      it('should handle decimal places', () => {
        expect(formatFileSize(1536, 1)).to.equal('1.5 KB');
        expect(formatFileSize(1536, 0)).to.equal('2 KB');
      });
    });

    describe('getFileExtension', () => {
      it('should return correct file extensions', () => {
        expect(getFileExtension('file.txt')).to.equal('.txt');
        expect(getFileExtension('file.json')).to.equal('.json');
        expect(getFileExtension('file.tar.gz')).to.equal('.gz');
        expect(getFileExtension('file')).to.equal('');
      });

      it('should handle invalid inputs', () => {
        expect(getFileExtension('')).to.equal('');
        expect(getFileExtension(null as any)).to.equal('');
      });
    });

    describe('isFileReadable', () => {
      it('should return true for readable files', () => {
        fs.writeFileSync(testFile, 'readable content');
        expect(isFileReadable(testFile)).to.be.true;
      });

      it('should return false for non-existent files', () => {
        expect(isFileReadable(path.join(testDir, 'nonexistent.txt'))).to.be
          .false;
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Error Handling', () => {
    describe('FileOperationError', () => {
      it('should create proper error instances', () => {
        const error = new FileOperationError(
          'Test error',
          'test_op',
          '/test/path'
        );
        expect(error).to.be.instanceOf(Error);
        expect(error).to.be.instanceOf(FileOperationError);
        expect(error.name).to.equal('FileOperationError');
        expect(error.operation).to.equal('test_op');
        expect(error.filePath).to.equal('/test/path');
      });
    });

    describe('SecurityError', () => {
      it('should create proper security error instances', () => {
        const error = new SecurityError(
          'Security violation',
          '/dangerous/path'
        );
        expect(error).to.be.instanceOf(Error);
        expect(error).to.be.instanceOf(SecurityError);
        expect(error.name).to.equal('SecurityError');
        expect(error.filePath).to.equal('/dangerous/path');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTEGRATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Integration Tests', () => {
    it('should handle complete workflow: create, read, backup, clean', () => {
      // Create a manifest-like structure
      const manifest = {
        version: '1.0.0',
        network: { name: 'localhost', chainId: 31337 },
        routes: [
          {
            selector: '0x12345678',
            facet: '0xFactoryAddress',
            codehash: '0xCodeHash1',
          },
        ],
      };

      // Write manifest
      writeJsonFile(testFile, manifest, { backup: false });

      // Read and validate
      const readManifest = readManifestFile(testFile);
      expect(readManifest).to.deep.equal(manifest);

      // Get metadata
      const metadata = getFileMetadata(testFile);
      expect(metadata.size).to.be.greaterThan(0);

      // Update with backup
      const updatedManifest = { ...manifest, version: '1.1.0' };
      writeJsonFile(testFile, updatedManifest, { backup: true });

      // Verify backup was created
      const files = fs.readdirSync(testDir);
      const backupFiles = files.filter(f => f.includes('.backup.'));
      expect(backupFiles).to.have.length(1);

      // Clean up
      cleanDirectory(testDir, { preserveDir: true });
      const remainingFiles = fs.readdirSync(testDir);
      expect(remainingFiles).to.have.length(0);
    });

    it('should handle async operations workflow', async () => {
      const testData = { async: true, workflow: 'complete' };

      // Async write
      await writeJsonFileAsync(testFile, testData);

      // Async read
      const result = await readJsonFileAsync(testFile);
      expect(result).to.deep.equal(testData);

      // Async metadata
      const metadata = await getFileMetadataAsync(testFile);
      expect(metadata.path).to.equal(testFile);
      expect(metadata.size).to.be.greaterThan(0);
    });
  });
});

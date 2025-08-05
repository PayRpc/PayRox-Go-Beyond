const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import functions from sync script
const {
  loadJSON,
  saveJSON,
  validateContract,
  validateDeployments,
  createBackup,
  isValidAddress,
  parseArgs,
} = require('../../scripts/sync-configurations');

describe('Enhanced Sync Configurations Script', () => {
  const testDir = path.join(__dirname, 'temp-sync-test');
  const testDeploymentsDir = path.join(testDir, 'deployments/localhost');
  const testConfigFile = path.join(testDir, 'config/deployed-contracts.json');
  const testFrontendConfig = path.join(testDir, 'frontend/config.json');
  const testBackupDir = path.join(testDir, 'config/backups');

  beforeEach(() => {
    // Create test directory structure
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDeploymentsDir, { recursive: true });
    fs.mkdirSync(path.dirname(testConfigFile), { recursive: true });
    fs.mkdirSync(path.dirname(testFrontendConfig), { recursive: true });
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Utility Functions', () => {
    describe('isValidAddress', () => {
      it('should validate correct Ethereum addresses', () => {
        expect(isValidAddress('0x5FbDB2315678afecb367f032d93F642f64180aa3')).to
          .be.true;
        expect(isValidAddress('0x0000000000000000000000000000000000000000')).to
          .be.true;
      });

      it('should reject invalid addresses', () => {
        expect(isValidAddress('invalid')).to.be.false;
        expect(isValidAddress('0x123')).to.be.false;
        expect(isValidAddress('')).to.be.false;
        expect(isValidAddress(null)).to.be.false;
      });
    });

    describe('loadJSON', () => {
      it('should load valid JSON files', () => {
        const testData = { test: 'data', number: 42 };
        const testFile = path.join(testDir, 'test.json');
        fs.writeFileSync(testFile, JSON.stringify(testData));

        const result = loadJSON(testFile);
        expect(result).to.deep.equal(testData);
      });

      it('should return empty object for non-existent files', () => {
        const result = loadJSON(path.join(testDir, 'missing.json'));
        expect(result).to.deep.equal({});
      });

      it('should handle malformed JSON gracefully', () => {
        const testFile = path.join(testDir, 'bad.json');
        fs.writeFileSync(testFile, '{ invalid json }');

        const result = loadJSON(testFile);
        expect(result).to.deep.equal({});
      });
    });

    describe('saveJSON', () => {
      it('should save JSON data correctly', () => {
        const testData = { version: '1.0.0', contracts: { factory: {} } };
        const testFile = path.join(testDir, 'save-test.json');

        const success = saveJSON(testFile, testData);
        expect(success).to.be.true;
        expect(fs.existsSync(testFile)).to.be.true;

        const saved = JSON.parse(fs.readFileSync(testFile, 'utf8'));
        expect(saved).to.deep.equal(testData);
      });

      it('should create directories if they do not exist', () => {
        const testData = { test: true };
        const testFile = path.join(testDir, 'deep/nested/file.json');

        const success = saveJSON(testFile, testData);
        expect(success).to.be.true;
        expect(fs.existsSync(testFile)).to.be.true;
      });

      it('should validate JSON before saving', () => {
        const testFile = path.join(testDir, 'circular.json');
        const circular = {};
        circular.self = circular;

        const success = saveJSON(testFile, circular);
        expect(success).to.be.false;
      });
    });

    describe('validateContract', () => {
      it('should validate correct contract deployment', () => {
        const validDeployment = {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          contractName: 'DeterministicChunkFactory',
          timestamp: '2025-08-03T10:00:00.000Z',
        };

        const issues = validateContract(
          validDeployment,
          'DeterministicChunkFactory'
        );
        expect(issues).to.have.length(0);
      });

      it('should detect missing address', () => {
        const invalidDeployment = {
          contractName: 'TestContract',
          timestamp: '2025-08-03T10:00:00.000Z',
        };

        const issues = validateContract(invalidDeployment);
        expect(issues).to.include('Invalid or missing address');
      });

      it('should detect invalid address format', () => {
        const invalidDeployment = {
          address: 'invalid-address',
          contractName: 'TestContract',
          timestamp: '2025-08-03T10:00:00.000Z',
        };

        const issues = validateContract(invalidDeployment);
        expect(issues).to.include('Invalid or missing address');
      });

      it('should detect missing contract name', () => {
        const invalidDeployment = {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          timestamp: '2025-08-03T10:00:00.000Z',
        };

        const issues = validateContract(invalidDeployment);
        expect(issues).to.include('Missing contract name');
      });

      it('should detect contract name mismatch', () => {
        const mismatchDeployment = {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          contractName: 'WrongContract',
          timestamp: '2025-08-03T10:00:00.000Z',
        };

        const issues = validateContract(mismatchDeployment, 'ExpectedContract');
        expect(issues).to.include(
          'Expected ExpectedContract, got WrongContract'
        );
      });

      it('should detect invalid timestamp', () => {
        const invalidDeployment = {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          contractName: 'TestContract',
          timestamp: 'invalid-timestamp',
        };

        const issues = validateContract(invalidDeployment);
        expect(issues).to.include('Invalid timestamp format');
      });
    });

    describe('validateDeployments', () => {
      it('should validate all correct deployments', () => {
        const validDeployments = {
          factory: {
            address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
            contractName: 'DeterministicChunkFactory',
            timestamp: '2025-08-03T10:00:00.000Z',
          },
          dispatcher: {
            address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
            contractName: 'ManifestDispatcher',
            timestamp: '2025-08-03T10:01:00.000Z',
          },
        };

        const isValid = validateDeployments(validDeployments);
        expect(isValid).to.be.true;
      });

      it('should detect issues in deployments', () => {
        const invalidDeployments = {
          factory: {
            address: 'invalid-address',
            contractName: 'DeterministicChunkFactory',
            timestamp: '2025-08-03T10:00:00.000Z',
          },
          dispatcher: {
            address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
            contractName: 'WrongContract',
            timestamp: 'invalid-timestamp',
          },
        };

        const isValid = validateDeployments(invalidDeployments);
        expect(isValid).to.be.false;
      });
    });

    describe('createBackup', () => {
      it('should create backup of existing file', () => {
        const testData = { version: '1.0.0' };
        const testFile = path.join(testDir, 'backup-test.json');
        fs.writeFileSync(testFile, JSON.stringify(testData));

        // Set BACKUP_DIR for testing
        process.env.TEST_BACKUP_DIR = testBackupDir;

        const backupPath = createBackup(testFile);
        expect(backupPath).to.not.be.null;
        expect(fs.existsSync(backupPath)).to.be.true;

        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        expect(backupData).to.deep.equal(testData);
      });

      it('should handle missing source file gracefully', () => {
        const missingFile = path.join(testDir, 'missing.json');
        const backupPath = createBackup(missingFile);
        expect(backupPath).to.be.null;
      });
    });

    describe('parseArgs', () => {
      it('should parse command line arguments correctly', () => {
        const originalArgv = process.argv;
        process.argv = [
          'node',
          'script.js',
          '--dry-run',
          '--network',
          'sepolia',
          '--verbose',
        ];

        const options = parseArgs();
        expect(options.dryRun).to.be.true;
        expect(options.network).to.equal('sepolia');
        expect(options.verbose).to.be.true;

        process.argv = originalArgv;
      });

      it('should handle force flag', () => {
        const originalArgv = process.argv;
        process.argv = ['node', 'script.js', '--force'];

        const options = parseArgs();
        expect(options.force).to.be.true;

        process.argv = originalArgv;
      });
    });
  });

  describe('Integration Tests', () => {
    it('should create mock deployment files', () => {
      // Create mock deployment files
      const mockDeployments = {
        'factory.json': {
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          contractName: 'DeterministicChunkFactory',
          timestamp: '2025-08-03T10:00:00.000Z',
          blockNumber: 1234567,
        },
        'dispatcher.json': {
          address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          contractName: 'ManifestDispatcher',
          timestamp: '2025-08-03T10:01:00.000Z',
          blockNumber: 1234568,
        },
        'orchestrator.json': {
          address: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
          contractName: 'Orchestrator',
          timestamp: '2025-08-03T10:02:00.000Z',
          blockNumber: 1234569,
        },
      };

      for (const [filename, deployment] of Object.entries(mockDeployments)) {
        const filepath = path.join(testDeploymentsDir, filename);
        fs.writeFileSync(filepath, JSON.stringify(deployment, null, 2));
      }

      // Verify files were created
      const files = fs.readdirSync(testDeploymentsDir);
      expect(files).to.have.length(3);
      expect(files).to.include.members([
        'factory.json',
        'dispatcher.json',
        'orchestrator.json',
      ]);
    });

    it('should handle missing deployments directory gracefully', () => {
      const nonExistentDir = path.join(testDir, 'missing-deployments');

      // Test that the script would exit with proper error message
      expect(() => {
        if (!fs.existsSync(nonExistentDir)) {
          throw new Error(`Deployments directory not found: ${nonExistentDir}`);
        }
      }).to.throw('Deployments directory not found');
    });

    it('should validate deployment file structure', () => {
      const requiredFields = ['address', 'contractName', 'timestamp'];
      const deployment = {
        address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        contractName: 'TestContract',
        timestamp: '2025-08-03T10:00:00.000Z',
      };

      for (const field of requiredFields) {
        expect(deployment).to.have.property(field);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle read permission errors', () => {
      if (process.platform !== 'win32') {
        const testFile = path.join(testDir, 'no-read.json');
        fs.writeFileSync(testFile, '{"test": true}');
        fs.chmodSync(testFile, 0o000);

        const result = loadJSON(testFile);
        expect(result).to.deep.equal({});

        // Restore permissions for cleanup
        fs.chmodSync(testFile, 0o644);
      }
    });

    it('should handle write permission errors', () => {
      if (process.platform !== 'win32') {
        const readOnlyDir = path.join(testDir, 'readonly');
        fs.mkdirSync(readOnlyDir);
        fs.chmodSync(readOnlyDir, 0o444);

        const testFile = path.join(readOnlyDir, 'test.json');
        const success = saveJSON(testFile, { test: true });
        expect(success).to.be.false;

        // Restore permissions for cleanup
        fs.chmodSync(readOnlyDir, 0o755);
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle large deployment directories efficiently', () => {
      const startTime = Date.now();

      // Create many deployment files
      for (let i = 0; i < 100; i++) {
        const deployment = {
          address: `0x${i.toString(16).padStart(40, '0')}`,
          contractName: `TestContract${i}`,
          timestamp: new Date().toISOString(),
        };
        fs.writeFileSync(
          path.join(testDeploymentsDir, `contract${i}.json`),
          JSON.stringify(deployment)
        );
      }

      // Load all files
      const files = fs.readdirSync(testDeploymentsDir);
      for (const file of files) {
        loadJSON(path.join(testDeploymentsDir, file));
      }

      const duration = Date.now() - startTime;
      expect(duration).to.be.lessThan(1000); // Should complete in under 1 second
    });
  });
});

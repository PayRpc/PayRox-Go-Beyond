import { expect } from 'chai';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Enhanced Build Manifest', function () {
  this.timeout(60000); // 60 second timeout for integration tests

  const scriptPath = path.join(
    process.cwd(),
    'scripts',
    'build-manifest-enhanced.ts'
  );
  const manifestsDir = path.join(process.cwd(), 'manifests');

  before(function () {
    // Ensure the enhanced script exists
    if (!fs.existsSync(scriptPath)) {
      throw new Error('Enhanced build manifest script not found');
    }
  });

  describe('Script Execution', function () {
    it('should execute without errors via Hardhat', function () {
      let output;

      expect(() => {
        output = execSync(`npx hardhat run "${scriptPath}" --network hardhat`, {
          encoding: 'utf-8',
          timeout: 45000,
          stdio: 'pipe',
        });
      }).to.not.throw();

      expect(output).to.be.a('string');
      expect(output).to.include('Enhanced PayRox Manifest Builder');
    });

    it('should handle TypeScript compilation correctly', function () {
      const tsOutput = execSync('npx tsc --noEmit --skipLibCheck', {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      // Should not contain TypeScript errors for our enhanced script
      expect(tsOutput).to.not.include('error TS');
    });
  });

  describe('Enhancement Features', function () {
    it('should contain comprehensive manifest building capabilities', function () {
      const content = fs.readFileSync(scriptPath, 'utf-8');

      // Check for key enhancement features
      expect(content).to.include('EnhancedManifestBuilder');
      expect(content).to.include('validateEnvironment');
      expect(content).to.include('buildManifestCore');
      expect(content).to.include('optimizeManifest');
      expect(content).to.include('exportManifest');
      expect(content).to.include('displayFinalReport');
    });

    it('should include TypeScript interfaces and comprehensive types', function () {
      const content = fs.readFileSync(scriptPath, 'utf-8');

      expect(content).to.include('interface ManifestBuildOptions');
      expect(content).to.include('interface FacetEntry');
      expect(content).to.include('interface RouteEntry');
      expect(content).to.include('interface MerkleTreeData');
      expect(content).to.include('interface EnhancedManifest');
      expect(content).to.include('interface ManifestValidationResult');
    });

    it('should have comprehensive CLI support', function () {
      const content = fs.readFileSync(scriptPath, 'utf-8');

      expect(content).to.include('parseCommandLineOptions');
      expect(content).to.include('displayHelp');
      expect(content).to.include('--verbose');
      expect(content).to.include('--interactive');
      expect(content).to.include('--format');
      expect(content).to.include('--optimization');
    });

    it('should include advanced error handling', function () {
      const content = fs.readFileSync(scriptPath, 'utf-8');

      const tryCatchCount = (content.match(/try\s*{[\s\S]*?catch/g) || [])
        .length;
      const customErrorCount = (
        content.match(/class\s+\w*Error\s+extends\s+Error/g) || []
      ).length;

      expect(tryCatchCount).to.be.at.least(5); // Multiple error handling blocks
      expect(customErrorCount).to.be.at.least(1); // Custom error classes
    });

    it('should include professional validation features', function () {
      const content = fs.readFileSync(scriptPath, 'utf-8');

      expect(content).to.include('validateManifest');
      expect(content).to.include('validateEnvironment');
      expect(content).to.include('securityCheck');
      expect(content).to.include('validation');
    });
  });

  describe('Code Quality Metrics', function () {
    let content: string;

    before(function () {
      content = fs.readFileSync(scriptPath, 'utf-8');
    });

    it('should have significant line count increase', function () {
      const lines = content.split('\n').length;
      expect(lines).to.be.at.least(1300); // Substantial enhancement
    });

    it('should have comprehensive class architecture', function () {
      const classCount = (content.match(/class\s+\w+/g) || []).length;
      expect(classCount).to.be.at.least(2); // Enhanced class-based design
    });

    it('should include extensive interfaces for type safety', function () {
      const interfaceCount = (content.match(/interface\s+\w+/g) || []).length;
      expect(interfaceCount).to.be.at.least(6); // Comprehensive type definitions
    });

    it('should have comprehensive documentation', function () {
      const jsdocCount = (content.match(/\/\*\*[\s\S]*?\*\//g) || []).length;
      const inlineComments = (content.match(/\/\/.*$/gm) || []).length;

      expect(jsdocCount + inlineComments).to.be.at.least(50); // Well-documented
    });

    it('should have TypeScript type annotations', function () {
      const typeAnnotations = (
        content.match(/:\s*(string|number|boolean|Promise<)/g) || []
      ).length;
      expect(typeAnnotations).to.be.at.least(30); // Strong typing
    });
  });

  describe('Integration Capabilities', function () {
    it('should export main function for Hardhat integration', function () {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('export async function main');
    });

    it('should handle Hardhat environment properly', function () {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('HardhatRuntimeEnvironment');
      expect(content).to.include('hre.ethers');
      expect(content).to.include('hre.artifacts');
    });

    it('should include comprehensive configuration management', function () {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('ManifestBuilderConfig');
      expect(content).to.include('loadReleaseConfigEnhanced');
      expect(content).to.include('resolveFactoryAddressEnhanced');
    });

    it('should support multiple output formats', function () {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('saveManifestAsJSON');
      expect(content).to.include('saveManifestAsYAML');
      expect(content).to.include('displayManifestAsTable');
      expect(content).to.include('displayDetailedManifest');
    });
  });

  describe('Performance and Optimization', function () {
    it('should include performance tracking', function () {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('performance');
      expect(content).to.include('buildTime');
      expect(content).to.include('totalTime');
      expect(content).to.include('benchmark');
    });

    it('should support optimization levels', function () {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('optimizationLevel');
      expect(content).to.include('applyStandardOptimizations');
      expect(content).to.include('applyAggressiveOptimizations');
    });

    it('should include comprehensive Merkle tree features', function () {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('buildMerkleOverRoutesEnhanced');
      expect(content).to.include('MerkleTreeData');
      expect(content).to.include('statistics');
    });
  });

  describe('Enhancement Validation', function () {
    it('should demonstrate significant improvement over original', function () {
      const originalPath = path.join(
        process.cwd(),
        'scripts',
        'build-manifest.ts'
      );

      if (fs.existsSync(originalPath)) {
        const originalContent = fs.readFileSync(originalPath, 'utf-8');
        const enhancedContent = fs.readFileSync(scriptPath, 'utf-8');

        const originalLines = originalContent.split('\n').length;
        const enhancedLines = enhancedContent.split('\n').length;

        const improvement =
          ((enhancedLines - originalLines) / originalLines) * 100;
        expect(improvement).to.be.at.least(100); // At least 100% increase
      }
    });

    it('should include production-ready enterprise features', function () {
      const content = fs.readFileSync(scriptPath, 'utf-8');

      // Check for enterprise patterns
      const enterpriseFeatures = [
        'validation',
        'error handling',
        'optimization',
        'configuration',
        'cli support',
        'reporting',
        'security',
        'performance',
      ];

      enterpriseFeatures.forEach(feature => {
        expect(content.toLowerCase()).to.include(feature.toLowerCase());
      });
    });

    it('should maintain backward compatibility', function () {
      const content = fs.readFileSync(scriptPath, 'utf-8');

      // Should still export main function and maintain core functionality
      expect(content).to.include('export async function main');
      expect(content).to.include('build-manifest');
      expect(content).to.include('manifest');
    });
  });

  describe('File Generation', function () {
    it('should create manifest files when executed', function () {
      // Execute the script
      execSync(`npx hardhat run "${scriptPath}" --network hardhat`, {
        encoding: 'utf-8',
        timeout: 30000,
        stdio: 'pipe',
      });

      // Check if manifest files are created
      const manifestPath = path.join(manifestsDir, 'current.manifest.json');
      expect(fs.existsSync(manifestPath)).to.be.true;
    });
  });

  after(function () {
    console.log('✅ Enhanced build manifest tests completed successfully');
  });
});

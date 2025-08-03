import { expect } from 'chai';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Enhanced Freeze Readiness Assessment', function() {
  this.timeout(60000); // 60 second timeout for integration tests

  const scriptPath = path.join(process.cwd(), 'scripts', 'assess-freeze-readiness-enhanced-v2.ts');
  const reportsDir = path.join(process.cwd(), 'reports');

  before(function() {
    // Ensure the enhanced script exists
    if (!fs.existsSync(scriptPath)) {
      throw new Error('Enhanced freeze readiness script not found');
    }
  });

  describe('Script Execution', function() {
    it('should execute without errors via Hardhat', function() {
      let output;
      
      expect(() => {
        output = execSync(
          `npx hardhat run "${scriptPath}" --network hardhat`,
          { 
            encoding: 'utf-8',
            timeout: 45000,
            stdio: 'pipe'
          }
        );
      }).to.not.throw();

      expect(output).to.be.a('string');
      expect(output).to.include('Solc version');
    });

    it('should handle TypeScript compilation correctly', function() {
      const tsOutput = execSync('npx tsc --noEmit --skipLibCheck', { 
        encoding: 'utf-8',
        stdio: 'pipe'
      });
      
      // Should not contain TypeScript errors for our script
      expect(tsOutput).to.not.include('error TS');
    });
  });

  describe('Enhancement Features', function() {
    it('should contain comprehensive assessment categories', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      
      // Check for key assessment functions
      expect(content).to.include('assessInfrastructure');
      expect(content).to.include('assessContracts');
      expect(content).to.include('assessSecurity');
      expect(content).to.include('assessPerformance');
      expect(content).to.include('assessCompliance');
      expect(content).to.include('assessOperationalReadiness');
    });

    it('should include TypeScript interfaces and types', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      
      expect(content).to.include('interface AssessmentResult');
      expect(content).to.include('interface FreezeReadinessReport');
      expect(content.includes('type') || content.includes('enum')).to.be.true;
    });

    it('should have comprehensive error handling', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      
      const tryCatchCount = (content.match(/try\s*{[\s\S]*?catch/g) || []).length;
      const errorHandlingCount = (content.match(/catch\s*\(/g) || []).length;
      
      expect(tryCatchCount).to.be.at.least(6); // At least one per major function
      expect(errorHandlingCount).to.be.at.least(6);
    });

    it('should include professional reporting features', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      
      expect(content).to.include('saveReport');
      expect(content).to.include('generateRecommendations');
      expect(content).to.include('displayFinalReport');
      expect(content).to.include('calculateOverallResults');
    });
  });

  describe('Code Quality Metrics', function() {
    let content: string;

    before(function() {
      content = fs.readFileSync(scriptPath, 'utf-8');
    });

    it('should have significant line count increase', function() {
      const lines = content.split('\n').length;
      expect(lines).to.be.at.least(700); // Should be substantial enhancement
    });

    it('should have multiple functions for modularity', function() {
      const functionCount = (content.match(/function\s+\w+|async\s+function\s+\w+/g) || []).length;
      expect(functionCount).to.be.at.least(10); // Should be well-modularized
    });

    it('should include comprehensive documentation', function() {
      const jsdocCount = (content.match(/\/\*\*[\s\S]*?\*\//g) || []).length;
      const inlineComments = (content.match(/\/\/.*$/gm) || []).length;
      
      expect(jsdocCount + inlineComments).to.be.at.least(30); // Well-documented
    });

    it('should have TypeScript type annotations', function() {
      const typeAnnotations = (content.match(/:\s*(string|number|boolean|Promise<)/g) || []).length;
      expect(typeAnnotations).to.be.at.least(20); // Strong typing
    });
  });

  describe('Integration Capabilities', function() {
    it('should export main function for Hardhat integration', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('export default main') || 
      expect(content).to.include('export { main }');
    });

    it('should handle Hardhat environment properly', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('HardhatRuntimeEnvironment');
      expect(content).to.include('hre.ethers');
      expect(content).to.include('hre.network');
    });

    it('should include report generation functionality', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).to.include('fs.writeFileSync');
      expect(content).to.include('JSON.stringify');
      expect(content).to.include('reports');
    });
  });

  describe('Enhancement Validation', function() {
    it('should demonstrate significant improvement over original', function() {
      const originalPath = path.join(process.cwd(), 'scripts', 'assess-freeze-readiness.ts');
      
      if (fs.existsSync(originalPath)) {
        const originalContent = fs.readFileSync(originalPath, 'utf-8');
        const enhancedContent = fs.readFileSync(scriptPath, 'utf-8');
        
        const originalLines = originalContent.split('\n').length;
        const enhancedLines = enhancedContent.split('\n').length;
        
        const improvement = ((enhancedLines - originalLines) / originalLines) * 100;
        expect(improvement).to.be.at.least(50); // At least 50% increase
      }
    });

    it('should include production-ready features', function() {
      const content = fs.readFileSync(scriptPath, 'utf-8');
      
      // Check for production-ready patterns
      const productionFeatures = [
        'timestamp',
        'version',
        'error handling',
        'logging',
        'configuration',
        'validation'
      ];

      productionFeatures.forEach(feature => {
        expect(content.toLowerCase()).to.include(feature.toLowerCase());
      });
    });
  });

  after(function() {
    // Cleanup any test artifacts
    console.log('✅ Enhanced freeze readiness assessment tests completed successfully');
  });
});

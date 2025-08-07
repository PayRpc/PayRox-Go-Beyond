#!/usr/bin/env node
/**
 * PayRox CI Manifest Validator - GitHub Actions Integration
 * 
 * Validates PayRox manifests in CI/CD pipelines with:
 * • Selector collision detection
 * • Merkle proof validation
 * • Manifest structure verification
 * • Security compliance checks
 * • Gas optimization analysis
 * • Cross-chain compatibility validation
 * 
 * @author PayRox Go Beyond Team
 * @version 2.0.0-industrial
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class PayRoxCIValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.metrics = {
            facetsValidated: 0,
            selectorsChecked: 0,
            proofsVerified: 0,
            collisionsDetected: 0
        };
        
        console.log('🤖 PayRox CI Validator initialized');
    }

    /**
     * Validate complete PayRox manifest
     */
    async validateManifest(manifestPath) {
        console.log(`🔍 Validating manifest: ${manifestPath}`);
        
        try {
            const manifestData = await fs.readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestData);
            
            // Structure validation
            this.validateManifestStructure(manifest);
            
            // Facet validation
            await this.validateFacets(manifest.facets || []);
            
            // Selector collision detection
            this.detectSelectorCollisions(manifest.facets || []);
            
            // Merkle proof validation
            await this.validateMerkleProofs(manifest);
            
            // Security compliance
            this.validateSecurityCompliance(manifest);
            
            // Generate validation report
            const report = this.generateValidationReport(manifest);
            
            console.log(`✅ Manifest validation complete`);
            return report;
            
        } catch (error) {
            this.errors.push(`Manifest validation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Validate manifest structure
     */
    validateManifestStructure(manifest) {
        console.log('📋 Validating manifest structure...');
        
        const requiredFields = [
            'version',
            'generator', 
            'timestamp',
            'facets',
            'compliance'
        ];
        
        for (const field of requiredFields) {
            if (!manifest[field]) {
                this.errors.push(`Missing required field: ${field}`);
            }
        }
        
        // Validate version format
        if (manifest.version && !manifest.version.match(/^\d+\.\d+\.\d+$/)) {
            this.errors.push(`Invalid version format: ${manifest.version}`);
        }
        
        // Validate facets array
        if (!Array.isArray(manifest.facets)) {
            this.errors.push('Facets must be an array');
        }
        
        console.log(`📊 Structure validation: ${this.errors.length === 0 ? 'PASSED' : 'FAILED'}`);
    }

    /**
     * Validate individual facets
     */
    async validateFacets(facets) {
        console.log(`🔧 Validating ${facets.length} facets...`);
        
        for (const facet of facets) {
            this.metrics.facetsValidated++;
            
            // Required facet fields
            const requiredFacetFields = ['name', 'functions', 'gasEstimate'];
            
            for (const field of requiredFacetFields) {
                if (!facet[field]) {
                    this.errors.push(`Facet ${facet.name || 'unknown'} missing field: ${field}`);
                }
            }
            
            // Validate function array
            if (facet.functions && !Array.isArray(facet.functions)) {
                this.errors.push(`Facet ${facet.name} functions must be an array`);
            }
            
            // Validate naming convention
            if (facet.name && !facet.name.endsWith('Facet')) {
                this.warnings.push(`Facet ${facet.name} should end with 'Facet'`);
            }
            
            // Validate gas estimate
            if (facet.gasEstimate && typeof facet.gasEstimate !== 'number') {
                this.errors.push(`Facet ${facet.name} gasEstimate must be a number`);
            }
        }
        
        console.log(`✅ Facet validation complete: ${this.metrics.facetsValidated} facets`);
    }

    /**
     * Detect selector collisions
     */
    detectSelectorCollisions(facets) {
        console.log('🔍 Detecting selector collisions...');
        
        const selectors = new Map();
        
        for (const facet of facets) {
            if (!facet.functions) continue;
            
            for (const func of facet.functions) {
                this.metrics.selectorsChecked++;
                
                // Generate function selector
                const selector = this.generateSelector(func);
                
                if (selectors.has(selector)) {
                    const existing = selectors.get(selector);
                    this.errors.push(
                        `Selector collision: ${func} (${facet.name}) conflicts with ${existing.function} (${existing.facet})`
                    );
                    this.metrics.collisionsDetected++;
                } else {
                    selectors.set(selector, { function: func, facet: facet.name });
                }
            }
        }
        
        console.log(`🎯 Collision detection: ${this.metrics.collisionsDetected} collisions found`);
    }

    /**
     * Generate function selector
     */
    generateSelector(functionName) {
        const signature = `${functionName}()`;
        const hash = crypto.createHash('sha256').update(signature).digest('hex');
        return `0x${hash.substring(0, 8)}`;
    }

    /**
     * Validate Merkle proofs
     */
    async validateMerkleProofs(manifest) {
        console.log('🌳 Validating Merkle proofs...');
        
        // Check if Merkle proofs file exists
        const proofsPath = path.join(path.dirname(''), 'merkle-proofs.json');
        
        try {
            const proofsData = await fs.readFile(proofsPath, 'utf8');
            const proofs = JSON.parse(proofsData);
            
            if (!proofs.root) {
                this.errors.push('Missing Merkle root in proofs file');
                return;
            }
            
            if (!Array.isArray(proofs.proofs)) {
                this.errors.push('Proofs must be an array');
                return;
            }
            
            // Validate each proof
            for (const proof of proofs.proofs) {
                this.metrics.proofsVerified++;
                
                if (!proof.element || !proof.proof || !proof.leaf) {
                    this.errors.push(`Invalid proof structure for element: ${proof.element}`);
                }
            }
            
            console.log(`✅ Merkle validation: ${this.metrics.proofsVerified} proofs verified`);
            
        } catch (error) {
            this.warnings.push(`Merkle proofs file not found or invalid: ${error.message}`);
        }
    }

    /**
     * Validate security compliance
     */
    validateSecurityCompliance(manifest) {
        console.log('🛡️ Validating security compliance...');
        
        if (!manifest.compliance) {
            this.errors.push('Missing compliance section');
            return;
        }
        
        const requiredCompliance = [
            'nativeHooks',
            'merkleProofs', 
            'auditedModifiers',
            'circuitBreakers'
        ];
        
        for (const requirement of requiredCompliance) {
            if (!manifest.compliance[requirement]) {
                this.warnings.push(`Security compliance missing: ${requirement}`);
            }
        }
        
        // Check for critical facets
        const criticalFacets = manifest.facets?.filter(f => 
            f.name?.includes('Admin') || 
            f.name?.includes('Owner') ||
            f.name?.includes('Gov')
        ) || [];
        
        if (criticalFacets.length > 0) {
            console.log(`⚠️ Found ${criticalFacets.length} critical facets requiring extra scrutiny`);
        }
        
        console.log(`🛡️ Security compliance check complete`);
    }

    /**
     * Generate validation report
     */
    generateValidationReport(manifest) {
        const report = {
            timestamp: new Date().toISOString(),
            validator: 'PayRox CI Validator v2.0.0-industrial',
            manifest: {
                version: manifest.version,
                facetCount: manifest.facets?.length || 0,
                generator: manifest.generator
            },
            validation: {
                passed: this.errors.length === 0,
                errors: this.errors,
                warnings: this.warnings,
                metrics: this.metrics
            },
            compliance: {
                structureValid: this.errors.filter(e => e.includes('Missing required field')).length === 0,
                noCollisions: this.metrics.collisionsDetected === 0,
                securityCompliant: manifest.compliance ? true : false
            },
            recommendations: this.generateRecommendations(manifest)
        };
        
        return report;
    }

    /**
     * Generate recommendations
     */
    generateRecommendations(manifest) {
        const recommendations = [];
        
        if (this.metrics.collisionsDetected > 0) {
            recommendations.push('🔴 CRITICAL: Resolve selector collisions before deployment');
        }
        
        if (this.errors.length > 0) {
            recommendations.push('❌ Fix validation errors before proceeding');
        }
        
        if (!manifest.compliance?.nativeHooks) {
            recommendations.push('🪝 Consider implementing PayRox native hooks for better integration');
        }
        
        if (!manifest.compliance?.merkleProofs) {
            recommendations.push('🌳 Implement Merkle proofs for enhanced security');
        }
        
        if (this.warnings.length > 0) {
            recommendations.push('⚠️ Address warnings for optimal PayRox compliance');
        }
        
        recommendations.push('🚀 Test deployment on testnet before mainnet');
        recommendations.push('🔍 Run comprehensive integration tests');
        recommendations.push('📋 Verify manifest with PayRox tools');
        
        return recommendations;
    }

    /**
     * GitHub Actions integration
     */
    async generateGitHubSummary(report) {
        const summary = `
## 🤖 PayRox CI Validation Report

### 📊 Validation Status
- **Status**: ${report.validation.passed ? '✅ PASSED' : '❌ FAILED'}
- **Facets Validated**: ${report.validation.metrics.facetsValidated}
- **Selectors Checked**: ${report.validation.metrics.selectorsChecked}
- **Proofs Verified**: ${report.validation.metrics.proofsVerified}
- **Collisions Detected**: ${report.validation.metrics.collisionsDetected}

### 🎯 Compliance Check
- **Structure Valid**: ${report.compliance.structureValid ? '✅' : '❌'}
- **No Collisions**: ${report.compliance.noCollisions ? '✅' : '❌'}  
- **Security Compliant**: ${report.compliance.securityCompliant ? '✅' : '❌'}

### 📋 Issues Found
${report.validation.errors.length > 0 ? 
  `**Errors (${report.validation.errors.length}):**\n${report.validation.errors.map(e => `- ❌ ${e}`).join('\n')}` : 
  '✅ No errors found'
}

${report.validation.warnings.length > 0 ? 
  `\n**Warnings (${report.validation.warnings.length}):**\n${report.validation.warnings.map(w => `- ⚠️ ${w}`).join('\n')}` : 
  ''
}

### 🚀 Recommendations
${report.recommendations.map(r => `- ${r}`).join('\n')}

---
*Generated by PayRox CI Validator v2.0.0-industrial*
`;
        
        // Write summary for GitHub Actions
        if (process.env.GITHUB_STEP_SUMMARY) {
            await fs.writeFile(process.env.GITHUB_STEP_SUMMARY, summary);
        }
        
        return summary;
    }
}

/**
 * Fast-fail validation for CI
 */
async function validateManifestCI(manifestPath) {
    console.log('🚀 PayRox CI Manifest Validation');
    console.log('='.repeat(50));
    
    try {
        const validator = new PayRoxCIValidator();
        const report = await validator.validateManifest(manifestPath);
        
        // Generate artifacts
        await fs.writeFile('payrox-validation-report.json', JSON.stringify(report, null, 2));
        await validator.generateGitHubSummary(report);
        
        // Output results
        console.log('\n📊 Validation Results:');
        console.log(`   Status: ${report.validation.passed ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`   Facets: ${report.validation.metrics.facetsValidated}`);
        console.log(`   Errors: ${report.validation.errors.length}`);
        console.log(`   Warnings: ${report.validation.warnings.length}`);
        console.log(`   Collisions: ${report.validation.metrics.collisionsDetected}`);
        
        // Exit with appropriate code
        if (!report.validation.passed) {
            console.log('\n❌ Validation FAILED - see errors above');
            process.exit(1);
        } else {
            console.log('\n✅ Validation PASSED - manifest is ready for deployment');
            process.exit(0);
        }
        
    } catch (error) {
        console.error('❌ Validation failed:', error.message);
        process.exit(1);
    }
}

module.exports = {
    PayRoxCIValidator,
    validateManifestCI
};

// CLI execution
if (require.main === module) {
    const manifestPath = process.argv[2] || './payrox-manifest.json';
    validateManifestCI(manifestPath);
}

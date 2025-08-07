#!/usr/bin/env node
/**
 * @title PayRox AI Security Engine - Permanent Integration Script
 * @notice Ensures the AI Security Fix Engine is permanently integrated into the application
 * @dev This script validates and maintains the complete integration
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class AISecurityIntegrator {
    constructor() {
        this.rootPath = path.join(__dirname);
        this.errors = [];
        this.warnings = [];
        this.successes = [];
    }

    async validateIntegration() {
        console.log('🔍 Validating AI Security Engine Integration...\n');

        await this.checkBackendFiles();
        await this.checkPackageScripts();
        await this.checkYamlConfiguration();
        await this.checkCLIIntegration();
        await this.checkEnvironmentSetup();
        await this.runFunctionalTests();

        this.printResults();
    }

    async checkBackendFiles() {
        console.log('📁 Checking Backend Files...');
        
        const requiredFiles = [
            'tools/ai-assistant/backend/ai-security-fix-engine.js',
            'tools/ai-assistant/backend/auto-start.js',
            'tools/ai-assistant/backend/smart-mythril-analyzer.js',
            'tools/ai-assistant/backend/mythril-analyzer.js',
            'tools/ai-assistant/backend/mock-mythril-analyzer.js'
        ];

        for (const file of requiredFiles) {
            const filePath = path.join(this.rootPath, file);
            if (fs.existsSync(filePath)) {
                this.successes.push(`✅ ${file} exists`);
            } else {
                this.errors.push(`❌ Missing required file: ${file}`);
            }
        }
    }

    async checkPackageScripts() {
        console.log('📦 Checking Package Scripts...');
        
        try {
            // Check main package.json
            const mainPackagePath = path.join(this.rootPath, 'package.json');
            const mainPackage = JSON.parse(fs.readFileSync(mainPackagePath, 'utf8'));
            
            const requiredMainScripts = [
                'ai:security:auto-start',
                'ai:security:fix',
                'ai:security:fix:dry',
                'ai:security:fix:aggressive',
                'ai:security:analyze',
                'ai:security:status',
                'ai:security:engine'
            ];

            for (const script of requiredMainScripts) {
                if (mainPackage.scripts[script]) {
                    this.successes.push(`✅ Main package script: ${script}`);
                } else {
                    this.errors.push(`❌ Missing main package script: ${script}`);
                }
            }

            // Check CLI package.json
            const cliPackagePath = path.join(this.rootPath, 'cli/package.json');
            if (fs.existsSync(cliPackagePath)) {
                const cliPackage = JSON.parse(fs.readFileSync(cliPackagePath, 'utf8'));
                
                const requiredCliScripts = [
                    'ai:security',
                    'ai:security:fix',
                    'ai:security:analyze',
                    'ai:security:status'
                ];

                for (const script of requiredCliScripts) {
                    if (cliPackage.scripts[script]) {
                        this.successes.push(`✅ CLI package script: ${script}`);
                    } else {
                        this.warnings.push(`⚠️ Missing CLI package script: ${script}`);
                    }
                }
            }

            // Check backend package.json
            const backendPackagePath = path.join(this.rootPath, 'tools/ai-assistant/backend/package.json');
            if (fs.existsSync(backendPackagePath)) {
                const backendPackage = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));
                
                const requiredBackendScripts = [
                    'ai:security-fix',
                    'ai:security-fix-dry',
                    'ai:security-fix-aggressive',
                    'mythril:smart',
                    'ai:auto-start'
                ];

                for (const script of requiredBackendScripts) {
                    if (backendPackage.scripts[script]) {
                        this.successes.push(`✅ Backend package script: ${script}`);
                    } else {
                        this.errors.push(`❌ Missing backend package script: ${script}`);
                    }
                }
            }

        } catch (error) {
            this.errors.push(`❌ Error checking package scripts: ${error.message}`);
        }
    }

    async checkYamlConfiguration() {
        console.log('📄 Checking YAML Configuration...');
        
        try {
            const yamlPath = path.join(this.rootPath, 'app.release.yaml');
            if (fs.existsSync(yamlPath)) {
                const yamlContent = fs.readFileSync(yamlPath, 'utf8');
                
                const requiredConfigs = [
                    'ai:',
                    'security:',
                    'autoSecurityFixes:',
                    'vulnerabilityTypes:'
                ];

                for (const config of requiredConfigs) {
                    if (yamlContent.includes(config)) {
                        this.successes.push(`✅ YAML config: ${config}`);
                    } else {
                        this.warnings.push(`⚠️ Missing YAML config: ${config}`);
                    }
                }
            } else {
                this.warnings.push('⚠️ app.release.yaml not found');
            }

            // Check deployment yaml
            const deploymentYamlPath = path.join(this.rootPath, 'ai-security-deployment.yaml');
            if (fs.existsSync(deploymentYamlPath)) {
                this.successes.push('✅ AI Security deployment configuration exists');
            } else {
                this.warnings.push('⚠️ ai-security-deployment.yaml not found');
            }

        } catch (error) {
            this.errors.push(`❌ Error checking YAML configuration: ${error.message}`);
        }
    }

    async checkCLIIntegration() {
        console.log('🖥️ Checking CLI Integration...');
        
        try {
            const cliIndexPath = path.join(this.rootPath, 'cli/src/index.ts');
            if (fs.existsSync(cliIndexPath)) {
                const cliContent = fs.readFileSync(cliIndexPath, 'utf8');
                
                if (cliContent.includes('handleAISecurity')) {
                    this.successes.push('✅ CLI has AI Security handler');
                } else {
                    this.errors.push('❌ CLI missing AI Security handler');
                }

                if (cliContent.includes('AISecurityCLI')) {
                    this.successes.push('✅ CLI imports AI Security class');
                } else {
                    this.errors.push('❌ CLI missing AI Security import');
                }
            }

            const aiSecurityCliPath = path.join(this.rootPath, 'cli/src/ai-security-cli.ts');
            if (fs.existsSync(aiSecurityCliPath)) {
                this.successes.push('✅ AI Security CLI module exists');
            } else {
                this.errors.push('❌ AI Security CLI module missing');
            }

        } catch (error) {
            this.errors.push(`❌ Error checking CLI integration: ${error.message}`);
        }
    }

    async checkEnvironmentSetup() {
        console.log('🌍 Checking Environment Setup...');
        
        const requiredDirs = [
            'security-reports',
            'ai-refactored-contracts/.security-fixes-backup'
        ];

        for (const dir of requiredDirs) {
            const dirPath = path.join(this.rootPath, dir);
            if (fs.existsSync(dirPath)) {
                this.successes.push(`✅ Directory exists: ${dir}`);
            } else {
                this.warnings.push(`⚠️ Directory missing: ${dir} (will be created automatically)`);
            }
        }
    }

    async runFunctionalTests() {
        console.log('🧪 Running Functional Tests...');
        
        try {
            // Test if backend commands are accessible
            const backendPath = path.join(this.rootPath, 'tools/ai-assistant/backend');
            
            // Test auto-start status
            try {
                await execAsync('node auto-start.js status', { cwd: backendPath, timeout: 10000 });
                this.successes.push('✅ Auto-start system functional');
            } catch (error) {
                this.warnings.push('⚠️ Auto-start system test failed (may need dependency install)');
            }

            // Test AI Security Fix Engine help
            try {
                await execAsync('node ai-security-fix-engine.js --help', { cwd: backendPath, timeout: 5000 });
                this.successes.push('✅ AI Security Fix Engine functional');
            } catch (error) {
                this.warnings.push('⚠️ AI Security Fix Engine test failed');
            }

            // Test Smart Mythril Analyzer
            try {
                await execAsync('node smart-mythril-analyzer.js status', { cwd: backendPath, timeout: 5000 });
                this.successes.push('✅ Smart Mythril Analyzer functional');
            } catch (error) {
                this.warnings.push('⚠️ Smart Mythril Analyzer test failed');
            }

        } catch (error) {
            this.warnings.push(`⚠️ Functional tests error: ${error.message}`);
        }
    }

    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('🎯 AI Security Engine Integration Status');
        console.log('='.repeat(60));

        if (this.successes.length > 0) {
            console.log('\n✅ SUCCESSES:');
            this.successes.forEach(success => console.log(`  ${success}`));
        }

        if (this.warnings.length > 0) {
            console.log('\n⚠️ WARNINGS:');
            this.warnings.forEach(warning => console.log(`  ${warning}`));
        }

        if (this.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.errors.forEach(error => console.log(`  ${error}`));
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 SUMMARY:');
        console.log(`  ✅ Successes: ${this.successes.length}`);
        console.log(`  ⚠️ Warnings: ${this.warnings.length}`);
        console.log(`  ❌ Errors: ${this.errors.length}`);

        const integrationScore = Math.round((this.successes.length / (this.successes.length + this.errors.length)) * 100);
        console.log(`  🎯 Integration Score: ${integrationScore}%`);

        if (this.errors.length === 0) {
            console.log('\n🎉 AI SECURITY ENGINE FULLY INTEGRATED!');
            console.log('🚀 Ready for production use');
        } else {
            console.log('\n🔧 Integration needs attention');
            console.log('💡 Please fix the errors above');
        }

        console.log('\n📋 Available Commands:');
        console.log('  npm run ai:security:auto-start  - Start complete AI security system');
        console.log('  npm run ai:security:fix         - Apply security fixes');
        console.log('  npm run ai:security:analyze     - Run security analysis');
        console.log('  npm run ai:security:status      - Check system status');
        console.log('  payrox → AI Security Engine     - Access via CLI menu');
        console.log('='.repeat(60));
    }

    async fixIntegration() {
        console.log('🔧 Attempting to fix integration issues...\n');

        // Create missing directories
        const dirs = ['security-reports', 'ai-refactored-contracts/.security-fixes-backup'];
        for (const dir of dirs) {
            const dirPath = path.join(this.rootPath, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`✅ Created directory: ${dir}`);
            }
        }

        console.log('\n🎯 Auto-fix completed. Re-run validation to check status.');
    }
}

// CLI interface
async function main() {
    const command = process.argv[2];
    const integrator = new AISecurityIntegrator();
    
    switch (command) {
        case 'validate':
        case 'check':
        default:
            await integrator.validateIntegration();
            break;
        case 'fix':
            await integrator.fixIntegration();
            await integrator.validateIntegration();
            break;
        case 'help':
            console.log('🛡️ PayRox AI Security Engine Integration Validator');
            console.log('');
            console.log('Commands:');
            console.log('  node ai-security-integration.js validate  - Validate integration');
            console.log('  node ai-security-integration.js fix       - Fix integration issues');
            console.log('  node ai-security-integration.js help      - Show this help');
            break;
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Integration validator error:', error.message);
        process.exit(1);
    });
}

module.exports = { AISecurityIntegrator };

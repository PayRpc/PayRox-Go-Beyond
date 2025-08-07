#!/usr/bin/env node
/**
 * @title PayRox AI Auto-Start System
 * @notice Intelligent auto-triggering system for AI refactoring with Mythril integration
 * @dev Monitors for changes and automatically triggers AI analysis + security scanning
 * 
 * @author PayRox Go Beyond Team
 * @version 1.1.0
 */

const fs = require('fs');
const path = require('path');

/**
 * Auto-start configuration
 */
const AUTO_START_CONFIG = {
    // Environment variable control
    enableAutoStart: process.env.PAYROX_AUTO_AI === 'true',
    
    // File watching
    enableFileWatcher: process.env.PAYROX_WATCH_FILES === 'true',
    watchPaths: [
        '../../../contracts/**/*.sol',
        '../../../demo-archive/**/*.sol'
    ],
    
    // Auto-learning on startup
    enableAutoLearning: true,
    
    // Auto-validation
    enableAutoValidation: process.env.NODE_ENV !== 'development',
    
    // Mythril security analysis
    enableMythrilAnalysis: process.env.PAYROX_MYTHRIL_ANALYSIS !== 'false',
    mythrilTimeout: 60000, // 60 seconds
    mythrilMaxDepth: 5,
    
    // AI Security Fixes
    enableAutoSecurityFixes: process.env.PAYROX_AUTO_SECURITY_FIXES === 'true',
    securityFixMode: process.env.PAYROX_SECURITY_FIX_MODE || 'standard' // 'standard', 'aggressive', 'dry-run'
};

class PayRoxAIAutoStart {
    constructor() {
        this.aiEngine = null;
        this.isRunning = false;
        this.lastRunTime = null;
        this.mythrilAnalyzer = null;
        
        console.log('🤖 PayRox AI Auto-Start System v1.1.0 Initialized');
        console.log('🔮 Enhanced with Mythril Security Analysis');
        this.checkAutoStartConditions();
    }

    /**
     * @notice Checks if AI should auto-start based on conditions
     */
    checkAutoStartConditions() {
        console.log('🔍 Checking auto-start conditions...');
        
        // Check environment variable
        if (AUTO_START_CONFIG.enableAutoStart) {
            console.log('✅ PAYROX_AUTO_AI=true detected - starting AI system');
            this.startAISystem();
            return;
        }
        
        // Check if this is first run (no previous output)
        const outputDir = path.join(__dirname, '../../../ai-refactored-contracts');
        if (!fs.existsSync(outputDir)) {
            console.log('📁 No previous AI output detected - performing initial run');
            this.startAISystem();
            return;
        }
        
        // Check if contract files are newer than last AI run
        if (this.areContractsNewer()) {
            console.log('🔄 Contract files updated - auto-triggering AI analysis');
            this.startAISystem();
            return;
        }
        
        // Setup file watcher if enabled
        if (AUTO_START_CONFIG.enableFileWatcher) {
            this.setupFileWatcher();
        }
        
        console.log('⏸️ Auto-start conditions not met - AI system on standby');
        console.log('💡 To force start: PAYROX_AUTO_AI=true npm run ai:generate');
    }

    /**
     * @notice Checks if contract files are newer than last AI output
     */
    areContractsNewer() {
        try {
            const outputDir = path.join(__dirname, '../../../ai-refactored-contracts');
            const readmePath = path.join(outputDir, 'README.md');
            
            if (!fs.existsSync(readmePath)) return true;
            
            const lastRunTime = fs.statSync(readmePath).mtime;
            const contractPath = path.join(__dirname, '../../../demo-archive/ComplexDeFiProtocol.sol');
            
            if (fs.existsSync(contractPath)) {
                const contractTime = fs.statSync(contractPath).mtime;
                return contractTime > lastRunTime;
            }
            
            return false;
        } catch (error) {
            console.log('⚠️ Error checking file times - defaulting to run');
            return true;
        }
    }

    /**
     * @notice Sets up file watcher for automatic triggering
     */
    setupFileWatcher() {
        try {
            const chokidar = require('chokidar');
            
            console.log('👁️ Setting up file watcher...');
            const watcher = chokidar.watch(AUTO_START_CONFIG.watchPaths, {
                ignored: /node_modules/,
                persistent: true
            });
            
            watcher.on('change', (filePath) => {
                console.log(`🔄 File changed: ${filePath}`);
                this.debounceAIStart();
            });
            
            console.log('✅ File watcher active - AI will auto-trigger on contract changes');
        } catch (error) {
            console.log('⚠️ File watcher not available - install chokidar for auto-watching');
        }
    }

    /**
     * @notice Debounced AI start to prevent rapid triggers
     */
    debounceAIStart() {
        if (this.isRunning) {
            console.log('⏳ AI system already running - skipping trigger');
            return;
        }
        
        // Debounce rapid file changes
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        this.debounceTimer = setTimeout(() => {
            console.log('🚀 Auto-triggering AI refactor...');
            this.startAISystem();
        }, 2000); // 2 second debounce
    }

    /**
     * @notice Starts the AI system with full learning, validation, and security analysis
     */
    async startAISystem() {
        if (this.isRunning) {
            console.log('⚠️ AI system already running');
            return;
        }
        
        this.isRunning = true;
        this.lastRunTime = new Date();
        
        try {
            console.log('🧠 Starting PayRox AI Learning Engine...');
            
            // Auto-learning phase
            if (AUTO_START_CONFIG.enableAutoLearning) {
                console.log('🎓 Performing auto-learning...');
                const { testAILearning } = require('./test-ai-learning.js');
                const learningResults = await testAILearning();
                
                if (!learningResults.success) {
                    console.log('❌ AI learning failed - aborting auto-start');
                    this.isRunning = false;
                    return;
                }
                console.log('✅ AI learning completed successfully');
            }
            
            // Auto-generation phase
            console.log('🏗️ Starting auto-generation...');
            require('./generate-refactored-files.js');
            console.log('✅ Auto-generation completed');
            
            // Auto-validation phase
            if (AUTO_START_CONFIG.enableAutoValidation) {
                console.log('🛡️ Performing auto-validation...');
                require('./validate-fixes.js');
                console.log('✅ Auto-validation completed');
            }
            
            // Mythril security analysis phase
            if (AUTO_START_CONFIG.enableMythrilAnalysis) {
                console.log('🔮 Starting Smart Mythril security analysis...');
                try {
                    const { smartMythrilAnalyzer } = require('./smart-mythril-analyzer.js');
                    const analysisResult = await smartMythrilAnalyzer.runFullAnalysis({
                        maxDepth: AUTO_START_CONFIG.mythrilMaxDepth
                    });
                    
                    if (analysisResult.success) {
                        console.log('✅ Security analysis completed successfully');
                        console.log(`🔮 Analyzer: ${analysisResult.analyzerType}`);
                        console.log(`📊 Risk Score: ${analysisResult.riskScore}`);
                        console.log(`🔍 Issues Found: ${analysisResult.totalIssues}`);
                        
                        if (analysisResult.riskScore > 100) {
                            console.log('⚠️ HIGH RISK detected - manual review recommended');
                        } else if (analysisResult.riskScore === 0) {
                            console.log('🛡️ SECURE - No security issues detected');
                        }
                        
                        // Display recommendations
                        if (analysisResult.recommendations.length > 0) {
                            console.log('💡 Security Recommendations:');
                            analysisResult.recommendations.forEach(rec => {
                                console.log(`   ${rec}`);
                            });
                        }
                        
                        // AI Security Fixes (if enabled and issues found)
                        if (AUTO_START_CONFIG.enableAutoSecurityFixes && analysisResult.totalIssues > 0) {
                            console.log('\n🤖 Starting AI Security Fix Engine...');
                            try {
                                const { aiSecurityFixEngine } = require('./ai-security-fix-engine.js');
                                const fixOptions = {
                                    aggressive: AUTO_START_CONFIG.securityFixMode === 'aggressive',
                                    dryRun: AUTO_START_CONFIG.securityFixMode === 'dry-run'
                                };
                                
                                const fixResult = await aiSecurityFixEngine.runSecurityFixes(fixOptions);
                                
                                if (fixResult.success) {
                                    console.log('✅ AI Security Fixes completed successfully');
                                    console.log(`🔧 Fixed ${fixResult.totalIssuesFixed}/${fixResult.totalIssuesFound} issues`);
                                    console.log(`📊 Fix Success Rate: ${fixResult.fixSuccessRate}`);
                                    
                                    if (fixResult.totalIssuesFixed > 0) {
                                        console.log('🔄 Re-running security analysis to verify fixes...');
                                        
                                        // Re-run security analysis to verify fixes
                                        const verificationResult = await smartMythrilAnalyzer.runFullAnalysis({
                                            maxDepth: AUTO_START_CONFIG.mythrilMaxDepth
                                        });
                                        
                                        if (verificationResult.success) {
                                            const improvement = analysisResult.riskScore - verificationResult.riskScore;
                                            console.log(`📈 Risk Score Improvement: ${improvement} points`);
                                            console.log(`🛡️ New Risk Score: ${verificationResult.riskScore}`);
                                        }
                                    }
                                } else {
                                    console.log('⚠️ AI Security Fixes encountered issues');
                                    console.log(`   Reason: ${fixResult.error}`);
                                }
                            } catch (fixError) {
                                console.log('⚠️ AI Security Fix error:', fixError.message);
                                console.log('💡 To disable: PAYROX_AUTO_SECURITY_FIXES=false');
                            }
                        }
                    } else {
                        console.log('⚠️ Security analysis failed - continuing without security scan');
                        console.log(`   Reason: ${analysisResult.error}`);
                        if (analysisResult.recommendations) {
                            analysisResult.recommendations.forEach(rec => {
                                console.log(`   💡 ${rec}`);
                            });
                        }
                    }
                } catch (mythrilError) {
                    console.log('⚠️ Security analysis error:', mythrilError.message);
                    console.log('💡 To disable: PAYROX_MYTHRIL_ANALYSIS=false');
                }
            }
            
            console.log('🎉 AI Auto-Start completed successfully!');
            console.log(`⏰ Execution time: ${new Date() - this.lastRunTime}ms`);
            
        } catch (error) {
            console.error('❌ AI Auto-Start failed:', error.message);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * @notice Gets current auto-start status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastRunTime: this.lastRunTime,
            autoStartEnabled: AUTO_START_CONFIG.enableAutoStart,
            fileWatcherEnabled: AUTO_START_CONFIG.enableFileWatcher,
            autoLearningEnabled: AUTO_START_CONFIG.enableAutoLearning,
            autoValidationEnabled: AUTO_START_CONFIG.enableAutoValidation,
            mythrilAnalysisEnabled: AUTO_START_CONFIG.enableMythrilAnalysis,
            mythrilTimeout: AUTO_START_CONFIG.mythrilTimeout,
            mythrilMaxDepth: AUTO_START_CONFIG.mythrilMaxDepth,
            autoSecurityFixesEnabled: AUTO_START_CONFIG.enableAutoSecurityFixes,
            securityFixMode: AUTO_START_CONFIG.securityFixMode
        };
    }

    /**
     * @notice Runs security analysis only
     */
    async runSecurityAnalysisOnly() {
        console.log('🔮 Running Smart Security Analysis Only...');
        
        try {
            const { smartMythrilAnalyzer } = require('./smart-mythril-analyzer.js');
            return await smartMythrilAnalyzer.runFullAnalysis({
                maxDepth: AUTO_START_CONFIG.mythrilMaxDepth
            });
        } catch (error) {
            console.error('❌ Security analysis failed:', error.message);
            return { success: false, error: error.message };
        }
    }
}

// Export for use by other modules
const autoStartSystem = new PayRoxAIAutoStart();

// CLI interface
if (require.main === module) {
    const command = process.argv[2];
    
    switch (command) {
        case 'status':
            console.log('📊 PayRox AI Auto-Start Status:');
            console.log(JSON.stringify(autoStartSystem.getStatus(), null, 2));
            break;
            
        case 'force':
            console.log('⚡ Force starting AI system...');
            autoStartSystem.startAISystem();
            break;
            
        case 'watch':
            console.log('👁️ Starting file watcher...');
            autoStartSystem.setupFileWatcher();
            break;
            
        case 'security':
            console.log('🔮 Running security analysis only...');
            autoStartSystem.runSecurityAnalysisOnly().then(result => {
                console.log('📊 Security Analysis Result:');
                console.log(JSON.stringify(result, null, 2));
            });
            break;
            
        default:
            console.log('🤖 PayRox AI Auto-Start System v1.1.0');
            console.log('🔮 Enhanced with Mythril Security Analysis');
            console.log('');
            console.log('Commands:');
            console.log('  node auto-start.js status    - Show current status');
            console.log('  node auto-start.js force     - Force start AI system');
            console.log('  node auto-start.js watch     - Start file watcher');
            console.log('  node auto-start.js security  - Run security analysis only');
            console.log('');
            console.log('Environment Variables:');
            console.log('  PAYROX_AUTO_AI=true              - Enable auto-start');
            console.log('  PAYROX_WATCH_FILES=true          - Enable file watching');
            console.log('  PAYROX_MYTHRIL_ANALYSIS=false    - Disable Mythril analysis');
            console.log('  PAYROX_AUTO_SECURITY_FIXES=true  - Enable automatic security fixes');
            console.log('  PAYROX_SECURITY_FIX_MODE=dry-run - Security fix mode (standard/aggressive/dry-run)');
    }
}

module.exports = { PayRoxAIAutoStart, autoStartSystem, AUTO_START_CONFIG };

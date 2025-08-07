#!/usr/bin/env node
/**
 * @title Smart Mythril Security Analyzer with Fallback
 * @notice Automatically detects Mythril availability and falls back to mock analyzer
 * @dev Provides seamless security analysis experience regardless of Mythril installation
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class SmartMythrilAnalyzer {
    constructor() {
        this.mythrilInstalled = null;
        this.realAnalyzer = null;
        this.mockAnalyzer = null;
        this.currentAnalyzer = null;
        
        console.log('🧠 Smart Mythril Security Analyzer initialized');
    }

    /**
     * @notice Detects which analyzer to use and initializes it
     */
    async initializeAnalyzer() {
        if (this.currentAnalyzer) {
            return this.currentAnalyzer;
        }

        try {
            // Check if Mythril is installed
            await execAsync('myth version');
            this.mythrilInstalled = true;
            
            console.log('✅ Mythril detected - using real analyzer');
            const { mythrilAnalyzer } = require('./mythril-analyzer.js');
            this.currentAnalyzer = mythrilAnalyzer;
            
        } catch (error) {
            this.mythrilInstalled = false;
            
            console.log('⚠️ Mythril not found - using mock analyzer (Demo Mode)');
            const { mockMythrilAnalyzer } = require('./mock-mythril-analyzer.js');
            this.currentAnalyzer = mockMythrilAnalyzer;
        }

        return this.currentAnalyzer;
    }

    /**
     * @notice Runs security analysis with automatic fallback
     */
    async runFullAnalysis(options = {}) {
        const analyzer = await this.initializeAnalyzer();
        
        console.log(`🔮 Running ${this.mythrilInstalled ? 'Real' : 'Mock'} Mythril Analysis...`);
        
        const result = await analyzer.runFullAnalysis(options);
        
        // Add metadata about analyzer type
        if (result.success) {
            result.analyzerType = this.mythrilInstalled ? 'REAL_MYTHRIL' : 'DEMO_MODE';
            result.mythrilInstalled = this.mythrilInstalled;
        }
        
        return result;
    }

    /**
     * @notice Checks installation status
     */
    async checkInstallation() {
        await this.initializeAnalyzer();
        return {
            mythrilInstalled: this.mythrilInstalled,
            analyzerType: this.mythrilInstalled ? 'REAL_MYTHRIL' : 'DEMO_MODE',
            recommendation: this.mythrilInstalled ? 
                'Mythril is installed and ready' : 
                'Install Mythril for real security analysis: pip install mythril'
        };
    }

    /**
     * @notice Gets latest analysis results
     */
    async getLatestAnalysis() {
        const analyzer = await this.initializeAnalyzer();
        return analyzer.getLatestAnalysis();
    }

    /**
     * @notice Gets analyzer status and capabilities
     */
    async getStatus() {
        const installStatus = await this.checkInstallation();
        const latestAnalysis = await this.getLatestAnalysis();
        
        return {
            ...installStatus,
            hasRecentAnalysis: latestAnalysis !== null,
            lastAnalysisTime: latestAnalysis?.metadata?.analysisTime || null,
            lastAnalysisContracts: latestAnalysis?.metadata?.totalContracts || 0,
            lastRiskScore: latestAnalysis?.summary?.riskScore || null
        };
    }
}

// Create singleton instance
const smartMythrilAnalyzer = new SmartMythrilAnalyzer();

// CLI interface
async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'analyze': {
            const options = {
                maxDepth: parseInt(process.argv[3]) || 5
            };
            
            const result = await smartMythrilAnalyzer.runFullAnalysis(options);
            console.log('\n📊 Smart Analysis Summary:');
            console.log(JSON.stringify(result, null, 2));
            break;
        }
            
        case 'check': {
            const status = await smartMythrilAnalyzer.checkInstallation();
            console.log('🔍 Installation Status:');
            console.log(JSON.stringify(status, null, 2));
            process.exit(status.mythrilInstalled ? 0 : 1);
            break;
        }
            
        case 'status': {
            const status = await smartMythrilAnalyzer.getStatus();
            console.log('📊 Smart Mythril Analyzer Status:');
            console.log(JSON.stringify(status, null, 2));
            break;
        }
            
        default:
            console.log('🧠 PayRox Smart Mythril Security Analyzer');
            console.log('🔄 Automatically detects Mythril installation and provides fallback');
            console.log('');
            console.log('Commands:');
            console.log('  node smart-mythril-analyzer.js analyze [depth]  - Run smart analysis');
            console.log('  node smart-mythril-analyzer.js check            - Check installation');
            console.log('  node smart-mythril-analyzer.js status           - Show status');
            console.log('');
            console.log('Features:');
            console.log('  ✅ Real Mythril analysis when installed');
            console.log('  🔮 Mock analysis when Mythril not available');
            console.log('  🧠 Automatic detection and fallback');
            console.log('  📊 Consistent reporting interface');
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
}

module.exports = { SmartMythrilAnalyzer, smartMythrilAnalyzer };

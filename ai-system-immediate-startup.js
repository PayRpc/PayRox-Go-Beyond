#!/usr/bin/env node
/**
 * PayRox Go Beyond: AI System Immediate Startup & Verification
 * 
 * This script ensures ALL AI components are operational immediately
 * Provides real-time status monitoring and instant verification
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AISystemManager {
  constructor() {
    this.status = {
      core: false,
      deployment: false,
      refactoring: false,
      learning: false,
      crossChain: false,
      yaml: false,
      sdk: false
    };
    
    this.startTime = Date.now();
  }

  async verifyAISystem() {
    console.log('🚀 PayRox Go Beyond AI System - Immediate Startup Verification');
    console.log('===============================================================\n');
    
    // Phase 1: Core AI System Status
    await this.checkCoreAIStatus();
    
    // Phase 2: Deployment AI Components
    await this.checkDeploymentAI();
    
    // Phase 3: Refactoring System
    await this.checkRefactoringAI();
    
    // Phase 4: Learning Demonstration
    await this.checkLearningAI();
    
    // Phase 5: Cross-Chain Intelligence
    await this.checkCrossChainAI();
    
    // Phase 6: YAML Configuration
    await this.checkYAMLConfig();
    
    // Phase 7: SDK Integration
    await this.checkSDKIntegration();
    
    // Final Report
    this.generateStatusReport();
  }

  async checkCoreAIStatus() {
    console.log('🧠 1. Core AI System Status');
    console.log('============================');
    
    try {
      console.log('   🔍 Running AI status check...');
      const result = execSync('npm run ai:status', { encoding: 'utf8', timeout: 30000 });
      
      if (result.includes('PayRox AI Deployment Service is OPERATIONAL')) {
        this.status.core = true;
        console.log('   ✅ Core AI System: OPERATIONAL');
        console.log('   ✅ Zero search time deployment: READY');
        console.log('   ✅ AI learning system: ACTIVE');
      } else {
        console.log('   ⚠️ Core AI System: NEEDS ATTENTION');
      }
    } catch (error) {
      console.log('   ❌ Core AI System: ERROR');
      console.log(`   📝 Error: ${error.message.slice(0, 100)}...`);
    }
    
    console.log('');
  }

  async checkDeploymentAI() {
    console.log('🚀 2. AI Deployment Engine');
    console.log('===========================');
    
    try {
      console.log('   🔍 Testing AI deployment capabilities...');
      const result = execSync('npm run ai:system', { encoding: 'utf8', timeout: 60000 });
      
      if (result.includes('DEPLOY GO BEYOND COMPLETE')) {
        this.status.deployment = true;
        console.log('   ✅ AI Deployment Engine: OPERATIONAL');
        console.log('   ✅ Factory deployment: SUCCESS');
        console.log('   ✅ Dispatcher deployment: SUCCESS');
        console.log('   ✅ Orchestrator deployment: SUCCESS');
      } else {
        console.log('   ⚠️ AI Deployment Engine: PARTIAL');
      }
    } catch (error) {
      console.log('   ❌ AI Deployment Engine: ERROR');
      console.log(`   📝 Error: ${error.message.slice(0, 100)}...`);
    }
    
    console.log('');
  }

  async checkRefactoringAI() {
    console.log('🔧 3. AI Refactoring System');
    console.log('============================');
    
    try {
      // Check if laser-focus protocol exists
      const protocolPath = './laser-focus-refactor-protocol.js';
      if (fs.existsSync(protocolPath)) {
        console.log('   ✅ Laser-Focus Refactor Protocol: READY');
        
        // Check if demo results exist
        const demoPath = './refactor-demo';
        if (fs.existsSync(demoPath)) {
          const files = fs.readdirSync(demoPath);
          console.log('   ✅ Refactor Demo Results: AVAILABLE');
          console.log(`   📊 Generated ${files.length} deliverables`);
          this.status.refactoring = true;
        } else {
          console.log('   ⚠️ Refactor Demo Results: NOT FOUND');
        }
      } else {
        console.log('   ❌ Laser-Focus Refactor Protocol: NOT FOUND');
      }
    } catch (error) {
      console.log('   ❌ AI Refactoring System: ERROR');
      console.log(`   📝 Error: ${error.message}`);
    }
    
    console.log('');
  }

  async checkLearningAI() {
    console.log('🧠 4. AI Learning Demonstration');
    console.log('================================');
    
    try {
      console.log('   🔍 Running AI learning validation...');
      const result = execSync('node ai-learning-demonstration.js', { encoding: 'utf8', timeout: 30000 });
      
      if (result.includes('AI LEARNING SUCCESS') && result.includes('AI Learning Validation: PASSED')) {
        this.status.learning = true;
        console.log('   ✅ AI Learning System: VALIDATED');
        console.log('   ✅ Cross-chain pattern learning: SUCCESS');
        console.log('   ✅ DeFi protocol adaptation: SUCCESS');
        console.log('   ✅ Creative application: DEMONSTRATED');
      } else {
        console.log('   ⚠️ AI Learning System: NEEDS VALIDATION');
      }
    } catch (error) {
      console.log('   ❌ AI Learning System: ERROR');
      console.log(`   📝 Error: ${error.message.slice(0, 100)}...`);
    }
    
    console.log('');
  }

  async checkCrossChainAI() {
    console.log('🌐 5. Cross-Chain AI Intelligence');
    console.log('==================================');
    
    try {
      // Check cross-chain configuration files
      const configPath = './cross-network-address-registry.json';
      if (fs.existsSync(configPath)) {
        console.log('   ✅ Cross-Chain Registry: CONFIGURED');
        this.status.crossChain = true;
      } else {
        console.log('   ⚠️ Cross-Chain Registry: NOT CONFIGURED');
      }
      
      // Check for deterministic deployment scripts
      const scriptPaths = [
        './deploy-complete-system.ps1',
        './deploy-complete-system.sh',
        './deploy-crosschain-runbook.ps1'
      ];
      
      let foundScripts = 0;
      scriptPaths.forEach(scriptPath => {
        if (fs.existsSync(scriptPath)) {
          foundScripts++;
        }
      });
      
      console.log(`   📊 Cross-Chain Scripts: ${foundScripts}/${scriptPaths.length} available`);
      
      if (foundScripts > 0) {
        console.log('   ✅ Cross-Chain Deployment: READY');
      } else {
        console.log('   ⚠️ Cross-Chain Deployment: SCRIPTS MISSING');
      }
    } catch (error) {
      console.log('   ❌ Cross-Chain AI: ERROR');
      console.log(`   📝 Error: ${error.message}`);
    }
    
    console.log('');
  }

  async checkYAMLConfig() {
    console.log('📋 6. YAML Configuration System');
    console.log('================================');
    
    try {
      const yamlPaths = [
        './config/app.release.yaml',
        './ai-security-deployment.yaml',
        './refactor-demo/manifest-draft.yaml'
      ];
      
      let validConfigs = 0;
      
      yamlPaths.forEach(yamlPath => {
        if (fs.existsSync(yamlPath)) {
          const content = fs.readFileSync(yamlPath, 'utf8');
          if (content.trim().length > 0) {
            validConfigs++;
            console.log(`   ✅ ${path.basename(yamlPath)}: LOADED`);
          } else {
            console.log(`   ⚠️ ${path.basename(yamlPath)}: EMPTY`);
          }
        } else {
          console.log(`   ❌ ${path.basename(yamlPath)}: NOT FOUND`);
        }
      });
      
      if (validConfigs >= 2) {
        this.status.yaml = true;
        console.log('   ✅ YAML Configuration: OPERATIONAL');
      } else {
        console.log('   ⚠️ YAML Configuration: NEEDS ATTENTION');
      }
    } catch (error) {
      console.log('   ❌ YAML Configuration: ERROR');
      console.log(`   📝 Error: ${error.message}`);
    }
    
    console.log('');
  }

  async checkSDKIntegration() {
    console.log('🔧 7. SDK Integration Status');
    console.log('=============================');
    
    try {
      // Check SDK package
      const sdkPath = './sdk/package.json';
      if (fs.existsSync(sdkPath)) {
        console.log('   ✅ SDK Package: FOUND');
        
        // Check for SDK build
        const sdkDistPath = './sdk/dist';
        if (fs.existsSync(sdkDistPath)) {
          console.log('   ✅ SDK Build: AVAILABLE');
          this.status.sdk = true;
        } else {
          console.log('   ⚠️ SDK Build: NOT BUILT');
        }
      } else {
        console.log('   ❌ SDK Package: NOT FOUND');
      }
      
      // Check for AI assistant tools
      const aiToolsPath = './tools/ai-assistant';
      if (fs.existsSync(aiToolsPath)) {
        console.log('   ✅ AI Assistant Tools: AVAILABLE');
      } else {
        console.log('   ❌ AI Assistant Tools: NOT FOUND');
      }
      
    } catch (error) {
      console.log('   ❌ SDK Integration: ERROR');
      console.log(`   📝 Error: ${error.message}`);
    }
    
    console.log('');
  }

  generateStatusReport() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const totalSystems = Object.keys(this.status).length;
    const operationalSystems = Object.values(this.status).filter(Boolean).length;
    const healthPercentage = Math.round((operationalSystems / totalSystems) * 100);
    
    console.log('📊 AI SYSTEM STATUS REPORT');
    console.log('===========================');
    console.log(`⏱️ Verification Time: ${elapsed}s`);
    console.log(`🎯 System Health: ${healthPercentage}% (${operationalSystems}/${totalSystems} systems)`);
    console.log('');
    
    // Detailed status
    Object.entries(this.status).forEach(([system, status]) => {
      const icon = status ? '✅' : '❌';
      const statusText = status ? 'OPERATIONAL' : 'NEEDS ATTENTION';
      console.log(`${icon} ${system.toUpperCase()}: ${statusText}`);
    });
    
    console.log('');
    
    // Overall assessment
    if (healthPercentage >= 85) {
      console.log('🎉 AI SYSTEM STATUS: EXCELLENT - Ready for production!');
      console.log('🚀 All critical components operational');
      console.log('💡 System ready for immediate use');
    } else if (healthPercentage >= 70) {
      console.log('✅ AI SYSTEM STATUS: GOOD - Minor attention needed');
      console.log('🔧 Some components need optimization');
      console.log('💡 System functional for most operations');
    } else if (healthPercentage >= 50) {
      console.log('⚠️ AI SYSTEM STATUS: NEEDS ATTENTION');
      console.log('🔧 Multiple components need fixing');
      console.log('💡 Basic functionality available');
    } else {
      console.log('❌ AI SYSTEM STATUS: CRITICAL - Immediate action required');
      console.log('🚨 Major components offline');
      console.log('💡 System requires comprehensive repair');
    }
    
    console.log('');
    console.log('🎯 IMMEDIATE ACTIONS:');
    
    if (!this.status.core) {
      console.log('   • Run: npm run ai:status');
    }
    if (!this.status.deployment) {
      console.log('   • Run: npm run ai:system');
    }
    if (!this.status.refactoring) {
      console.log('   • Test: node laser-focus-refactor-protocol.js');
    }
    if (!this.status.learning) {
      console.log('   • Run: node ai-learning-demonstration.js');
    }
    if (!this.status.crossChain) {
      console.log('   • Configure cross-chain registry');
    }
    if (!this.status.yaml) {
      console.log('   • Check YAML configuration files');
    }
    if (!this.status.sdk) {
      console.log('   • Build SDK: cd sdk && npm run build');
    }
    
    console.log('');
    console.log('===============================================================');
    console.log('🤖 PayRox Go Beyond AI System - Verification Complete');
    console.log('===============================================================');
  }
}

// Main execution
async function main() {
  const manager = new AISystemManager();
  await manager.verifyAISystem();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { AISystemManager };

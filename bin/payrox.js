#!/usr/bin/env node

/**
 * 🚀 PayRox Go Beyond - A+ Master Entry Point
 * 
 * Single command interface that orchestrates the entire PayRox ecosystem
 * using the app.release.yaml configuration as the source of truth.
 * 
 * Usage Examples:
 *   payrox deploy --ai                    # AI-enhanced deployment
 *   payrox deploy --adaptive              # Adaptive learning deployment
 *   payrox predict --contract MyFacet     # Address prediction
 *   payrox status --full                  # Complete system status
 *   payrox learn --from-history           # AI learning from history
 *   payrox validate --cross-chain         # Cross-chain validation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 📋 LOAD A+ CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════════

function loadConfig() {
  try {
    const configPath = path.join(process.cwd(), 'config', 'app.release.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');
    return yaml.load(configContent);
  } catch (error) {
    console.error('❌ Failed to load app.release.yaml configuration:', error.message);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 🎯 COMMAND EXECUTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════════════════

class PayRoxMasterController {
  constructor() {
    this.config = loadConfig();
    this.displayWelcome();
  }

  displayWelcome() {
    console.log(`
🚀 PayRox Go Beyond - A+ Master Controller
═══════════════════════════════════════════════════════════════════
Version: ${this.config.version} (${this.config.codename})
Tier: ${this.config.classification.tier}
AI Integration: ${this.config.classification.aiIntegration}
Universal Support: ${this.config.classification.universalSupport ? '✅' : '❌'}
Cross-Chain Ready: ${this.config.classification.crossChainReady ? '✅' : '❌'}
═══════════════════════════════════════════════════════════════════
    `);
  }

  async executeCommand(action, options = {}) {
    console.log(`🎯 Executing A+ Action: ${action}`);
    
    switch (action) {
      case 'deploy':
        return this.handleDeployment(options);
      case 'predict':
        return this.handlePrediction(options);
      case 'status':
        return this.handleStatus(options);
      case 'learn':
        return this.handleLearning(options);
      case 'validate':
        return this.handleValidation(options);
      case 'info':
        return this.displaySystemInfo();
      default:
        return this.displayHelp();
    }
  }

  handleDeployment(options) {
    console.log(`🚀 Initiating deployment with A+ configuration...`);
    
    let command;
    if (options.adaptive) {
      command = this.config.entryPoints.deployment.adaptive;
    } else if (options.ai) {
      command = this.config.entryPoints.deployment.ai;
    } else {
      command = this.config.entryPoints.deployment.standard;
    }
    
    console.log(`   📋 Using workflow: ${command}`);
    console.log(`   🤖 AI Enabled: ${this.config.deployment.ai.enabled}`);
    console.log(`   🎓 Learning Enabled: ${this.config.deployment.ai.learningEnabled}`);
    console.log(`   🌐 Cross-Chain Support: ${this.config.deployment.addressing.crossChainConsistency}`);
    
    if (options.dryRun) {
      console.log(`   🔮 Dry run completed - command would execute: ${command}`);
      return;
    }
    
    try {
      execSync(command, { stdio: 'inherit' });
      console.log(`✅ Deployment completed successfully!`);
    } catch (error) {
      console.error(`❌ Deployment failed:`, error.message);
      process.exit(1);
    }
  }

  handlePrediction(options) {
    console.log(`🔮 Running address prediction with A+ intelligence...`);
    
    const command = this.config.entryPoints.deployment.prediction;
    
    // Set environment variables based on options
    if (options.contract) {
      process.env.CONTRACT_NAME = options.contract;
    }
    if (options.salt) {
      process.env.SALT_STRING = options.salt;
    }
    if (options.network) {
      // Add network flag to command
    }
    
    console.log(`   📋 Prediction command: ${command}`);
    console.log(`   📦 Contract: ${options.contract || 'MockFacetCoreFacet'}`);
    console.log(`   🧂 Salt: ${options.salt || 'adaptive-ai-v1'}`);
    
    try {
      execSync(command, { stdio: 'inherit' });
      console.log(`✅ Prediction completed successfully!`);
    } catch (error) {
      console.error(`❌ Prediction failed:`, error.message);
      process.exit(1);
    }
  }

  handleStatus(options) {
    console.log(`📊 Checking A+ system status...`);
    
    if (options.full) {
      this.displayFullStatus();
    } else {
      this.displayQuickStatus();
    }
  }

  displayFullStatus() {
    console.log(`
📊 PayRox Go Beyond - Complete A+ Status Report
═══════════════════════════════════════════════════════════════════

🔧 Configuration Status:
   Version: ${this.config.version}
   Classification: ${this.config.classification.tier}
   AI Integration: ${this.config.classification.aiIntegration}
   
🤖 AI System Status:
   AI Enabled: ${this.config.deployment.ai.enabled ? '✅' : '❌'}
   Learning Enabled: ${this.config.deployment.ai.learningEnabled ? '✅' : '❌'}
   Adaptation Level: ${this.config.deployment.ai.adaptationLevel}
   Risk Tolerance: ${this.config.deployment.ai.riskTolerance}
   
🌐 Network Support:
   Networks Configured: ${Object.keys(this.config.networks).length}
   Cross-Chain Ready: ${this.config.deployment.addressing.crossChainConsistency ? '✅' : '❌'}
   
💎 Facet Configuration:
   Total Facets: ${this.config.facets.length}
   AI-Optimized: ${this.config.facets.filter(f => f.aiOptimized).length}
   Universal Support: ${this.config.facets.filter(f => f.universalSupport).length}
   
📈 Quality Metrics:
   Target Success Rate: ${this.config.metrics.deployment.targetSuccessRate}%
   AI Prediction Accuracy: ${this.config.metrics.aiPerformance.predictionAccuracy}%
   Gas Efficiency Target: ${this.config.metrics.deployment.gasEfficiencyTarget}%
   
🎯 Available Workflows:
   Quick Start: ${Object.keys(this.config.workflows.quickStart).length} workflows
   Development: ${Object.keys(this.config.workflows.development).length} workflows  
   Production: ${Object.keys(this.config.workflows.production).length} workflows
   Cross-Chain: ${Object.keys(this.config.workflows.crossChain).length} workflows

🎉 A+ Certification:
   Development: ${this.config.certification.readiness.development}
   Testing: ${this.config.certification.readiness.testing}
   Production: ${this.config.certification.readiness.production}
   Enterprise: ${this.config.certification.readiness.enterprise}
   
═══════════════════════════════════════════════════════════════════
    `);
  }

  displayQuickStatus() {
    console.log(`
📊 Quick Status:
   🚀 System: ${this.config.classification.tier} Ready
   🤖 AI: ${this.config.deployment.ai.enabled ? 'Active' : 'Inactive'}
   🌐 Networks: ${Object.keys(this.config.networks).length} configured
   💎 Facets: ${this.config.facets.length} available
    `);
  }

  handleLearning(options) {
    console.log(`🎓 Initiating AI learning process...`);
    
    const command = this.config.entryPoints.ai.learning;
    
    console.log(`   📋 Learning command: ${command}`);
    console.log(`   🧠 Learning enabled: ${this.config.deployment.ai.learningEnabled}`);
    console.log(`   📊 Adaptation level: ${this.config.deployment.ai.adaptationLevel}`);
    
    try {
      execSync(command, { stdio: 'inherit' });
      console.log(`✅ AI learning completed successfully!`);
    } catch (error) {
      console.error(`❌ AI learning failed:`, error.message);
      process.exit(1);
    }
  }

  handleValidation(options) {
    console.log(`✅ Running A+ system validation...`);
    
    let command;
    if (options.crossChain) {
      command = this.config.workflows.crossChain.validate;
    } else {
      command = this.config.workflows.development.validate;
    }
    
    console.log(`   📋 Validation command: ${command}`);
    console.log(`   🔒 Security checks: ${this.config.security.aiSecurityChecks ? 'Enabled' : 'Disabled'}`);
    console.log(`   🌐 Cross-chain validation: ${options.crossChain ? 'Enabled' : 'Standard'}`);
    
    try {
      execSync(command, { stdio: 'inherit' });
      console.log(`✅ Validation completed successfully!`);
    } catch (error) {
      console.error(`❌ Validation failed:`, error.message);
      process.exit(1);
    }
  }

  displaySystemInfo() {
    console.log(`
ℹ️ PayRox Go Beyond - A+ System Information
═══════════════════════════════════════════════════════════════════

📋 Release Information:
   Version: ${this.config.version}
   Release Date: ${this.config.releaseDate}
   Codename: ${this.config.codename}
   Description: ${this.config.description}

🏆 A+ Features:
${this.config.certification.features.map(feature => `   ✅ ${feature}`).join('\\n')}

📊 Compliance Standards:
${this.config.certification.compliance.map(standard => `   ✅ ${standard}`).join('\\n')}

🎯 Quick Commands:
   payrox deploy --ai                    # AI-enhanced deployment
   payrox deploy --adaptive              # Adaptive learning deployment  
   payrox predict --contract MyFacet     # Address prediction
   payrox status --full                  # Complete system status
   payrox learn                          # AI learning from history
   payrox validate --cross-chain         # Cross-chain validation
   payrox info                           # This information

═══════════════════════════════════════════════════════════════════
    `);
  }

  displayHelp() {
    this.displaySystemInfo();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 🎯 COMMAND LINE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const controller = new PayRoxMasterController();
  
  if (args.length === 0) {
    controller.displayHelp();
    return;
  }
  
  const action = args[0];
  const options = {};
  
  // Parse command line options
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        options[key] = args[i + 1];
        i++; // Skip next arg as it's the value
      } else {
        options[key] = true;
      }
    }
  }
  
  await controller.executeCommand(action, options);
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Master controller failed:', error);
    process.exit(1);
  });
}

module.exports = { PayRoxMasterController, loadConfig };

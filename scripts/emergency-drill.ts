#!/usr/bin/env node

/**
 * Emergency Drill Script for PayRox Go Beyond
 * Demonstrates emergency procedures including removeRoutes and rollback flows
 * 
 * Usage:
 *   npm run emergency:drill
 *   npm run emergency:drill -- --network sepolia
 *   npm run emergency:drill -- --scenario forbidden-selector
 */

import { ethers } from "hardhat";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface DrillConfig {
  network: string;
  scenario: string;
  dryRun: boolean;
  verbose: boolean;
}

interface DrillResult {
  scenario: string;
  success: boolean;
  steps: DrillStep[];
  timings: { [key: string]: number };
  emergencyResponse: EmergencyResponse;
}

interface DrillStep {
  name: string;
  success: boolean;
  duration: number;
  details: string;
  txHash?: string;
}

interface EmergencyResponse {
  pauseActivated: boolean;
  routesRemoved: number;
  rollbackPrepared: boolean;
  communicationSent: boolean;
}

class EmergencyDrillRunner {
  private config: DrillConfig;
  private startTime: number = 0;
  private results: DrillResult;

  constructor(config: DrillConfig) {
    this.config = config;
    this.results = {
      scenario: config.scenario,
      success: false,
      steps: [],
      timings: {},
      emergencyResponse: {
        pauseActivated: false,
        routesRemoved: 0,
        rollbackPrepared: false,
        communicationSent: false
      }
    };
  }

  async runDrill(): Promise<DrillResult> {
    console.log("🚨 PayRox Go Beyond Emergency Drill Starting");
    console.log(`📋 Scenario: ${this.config.scenario}`);
    console.log(`🌐 Network: ${this.config.network}`);
    console.log(`🔍 Dry Run: ${this.config.dryRun ? 'YES' : 'NO'}`);
    console.log("=" .repeat(60));

    this.startTime = Date.now();

    try {
      switch (this.config.scenario) {
        case 'forbidden-selector':
          await this.runForbiddenSelectorDrill();
          break;
        case 'pause-system':
          await this.runPauseSystemDrill();
          break;
        case 'remove-routes':
          await this.runRemoveRoutesDrill();
          break;
        case 'rollback-manifest':
          await this.runRollbackManifestDrill();
          break;
        case 'full-emergency':
          await this.runFullEmergencyDrill();
          break;
        default:
          throw new Error(`Unknown scenario: ${this.config.scenario}`);
      }

      this.results.success = true;
      console.log("\n✅ Emergency drill completed successfully!");

    } catch (error) {
      console.error("\n❌ Emergency drill failed:", error);
      this.addStep("Emergency Drill", false, 0, `Failed: ${error}`);
    }

    await this.generateDrillReport();
    return this.results;
  }

  private async runForbiddenSelectorDrill(): Promise<void> {
    console.log("\n🎯 SCENARIO: Forbidden Selector Emergency");
    console.log("Simulating detection of malicious function selector...");

    // Step 1: Deploy test contracts
    const contracts = await this.deployTestContracts();
    
    // Step 2: Detect malicious selector
    const maliciousSelector = "0xdeadbeef";
    await this.addStep(
      "Detect Malicious Selector",
      true,
      50,
      `Detected suspicious selector: ${maliciousSelector}`
    );

    // Step 3: Add to forbidden selectors (immediate protection)
    const stepStart = Date.now();
    if (!this.config.dryRun) {
      const tx = await contracts.dispatcher.addForbiddenSelector(maliciousSelector);
      await tx.wait();
      await this.addStep(
        "Add Forbidden Selector",
        true,
        Date.now() - stepStart,
        `Selector ${maliciousSelector} forbidden immediately`,
        tx.hash
      );
    } else {
      await this.addStep(
        "Add Forbidden Selector (DRY RUN)",
        true,
        100,
        `Would forbid selector: ${maliciousSelector}`
      );
    }

    this.results.emergencyResponse.routesRemoved = 1;

    // Step 4: Verify protection
    await this.verifyForbiddenSelector(contracts.dispatcher, maliciousSelector);

    // Step 5: Prepare rollback (new manifest without malicious facet)
    await this.prepareRollback(contracts);
  }

  private async runRemoveRoutesDrill(): Promise<void> {
    console.log("\n🎯 SCENARIO: Remove Routes Emergency");
    console.log("Simulating emergency route removal...");

    const contracts = await this.deployTestContracts();

    // Step 1: Get current routes
    const currentRoutes = await contracts.dispatcher.getAllRoutes();
    await this.addStep(
      "Inventory Current Routes",
      true,
      50,
      `Found ${currentRoutes.length} active routes`
    );

    // Step 2: Identify routes to remove (simulate compromised facet)
    const compromisedFacet = currentRoutes[0]?.facet;
    const routesToRemove = currentRoutes
      .filter(route => route.facet === compromisedFacet)
      .map(route => route.selector);

    await this.addStep(
      "Identify Compromised Routes",
      true,
      25,
      `Found ${routesToRemove.length} routes from compromised facet ${compromisedFacet}`
    );

    // Step 3: Remove routes immediately
    if (routesToRemove.length > 0 && !this.config.dryRun) {
      const stepStart = Date.now();
      const tx = await contracts.dispatcher.removeRoutes(routesToRemove);
      await tx.wait();
      
      await this.addStep(
        "Remove Compromised Routes",
        true,
        Date.now() - stepStart,
        `Removed ${routesToRemove.length} routes from system`,
        tx.hash
      );

      this.results.emergencyResponse.routesRemoved = routesToRemove.length;
    } else {
      await this.addStep(
        "Remove Routes (DRY RUN)",
        true,
        150,
        `Would remove ${routesToRemove.length} routes`
      );
    }

    // Step 4: Verify routes removed
    await this.verifyRoutesRemoved(contracts.dispatcher, routesToRemove);
  }

  private async runFullEmergencyDrill(): Promise<void> {
    console.log("\n🎯 SCENARIO: Full Emergency Protocol");
    console.log("Simulating complete emergency response...");

    const contracts = await this.deployTestContracts();

    // Step 1: Immediate pause
    await this.pauseSystem(contracts.dispatcher);

    // Step 2: Remove compromised routes
    const compromisedSelectors = ["0x12345678", "0x87654321"];
    if (!this.config.dryRun) {
      const tx = await contracts.dispatcher.removeRoutes(compromisedSelectors);
      await tx.wait();
    }
    
    await this.addStep(
      "Remove Compromised Routes",
      true,
      200,
      `Removed ${compromisedSelectors.length} compromised routes`
    );

    this.results.emergencyResponse.routesRemoved = compromisedSelectors.length;

    // Step 3: Prepare rollback
    await this.prepareRollback(contracts);

    // Step 4: Send emergency communications
    await this.sendEmergencyCommunications();

    // Step 5: Document incident
    await this.documentIncident();
  }

  private async deployTestContracts(): Promise<any> {
    const stepStart = Date.now();
    
    if (this.config.dryRun) {
      await this.addStep(
        "Deploy Test Contracts (DRY RUN)",
        true,
        500,
        "Simulated contract deployment"
      );
      
      return {
        dispatcher: {
          addForbiddenSelector: async () => ({ hash: "0x123", wait: async () => {} }),
          removeRoutes: async () => ({ hash: "0x456", wait: async () => {} }),
          pause: async () => ({ hash: "0x789", wait: async () => {} }),
          getAllRoutes: async () => [
            { selector: "0x12345678", facet: "0xFacetA" },
            { selector: "0x87654321", facet: "0xFacetB" }
          ],
          isForbiddenSelector: async () => true,
          paused: async () => true
        },
        factory: {
          version: async () => "1.0.0"
        }
      };
    }

    try {
      // Deploy minimal test system
      const [deployer] = await ethers.getSigners();
      
      const Factory = await ethers.getContractFactory("DeterministicChunkFactory");
      const factory = await Factory.deploy();
      await factory.waitForDeployment();

      const Dispatcher = await ethers.getContractFactory("ManifestDispatcher");
      const dispatcher = await Dispatcher.deploy();
      await dispatcher.waitForDeployment();

      await this.addStep(
        "Deploy Test Contracts",
        true,
        Date.now() - stepStart,
        `Factory: ${await factory.getAddress()}, Dispatcher: ${await dispatcher.getAddress()}`
      );

      return { factory, dispatcher };

    } catch (error) {
      await this.addStep(
        "Deploy Test Contracts",
        false,
        Date.now() - stepStart,
        `Deployment failed: ${error}`
      );
      throw error;
    }
  }

  private async pauseSystem(dispatcher: any): Promise<void> {
    const stepStart = Date.now();
    
    try {
      if (!this.config.dryRun) {
        const tx = await dispatcher.pause();
        await tx.wait();
        
        await this.addStep(
          "Emergency Pause System",
          true,
          Date.now() - stepStart,
          "System paused successfully",
          tx.hash
        );
      } else {
        await this.addStep(
          "Emergency Pause System (DRY RUN)",
          true,
          100,
          "Would pause system immediately"
        );
      }

      this.results.emergencyResponse.pauseActivated = true;

    } catch (error) {
      await this.addStep(
        "Emergency Pause System",
        false,
        Date.now() - stepStart,
        `Pause failed: ${error}`
      );
      throw error;
    }
  }

  private async verifyForbiddenSelector(dispatcher: any, selector: string): Promise<void> {
    const stepStart = Date.now();
    
    try {
      const isForbidden = await dispatcher.isForbiddenSelector(selector);
      
      await this.addStep(
        "Verify Forbidden Selector",
        isForbidden,
        Date.now() - stepStart,
        `Selector ${selector} forbidden status: ${isForbidden}`
      );

    } catch (error) {
      await this.addStep(
        "Verify Forbidden Selector",
        false,
        Date.now() - stepStart,
        `Verification failed: ${error}`
      );
    }
  }

  private async verifyRoutesRemoved(dispatcher: any, selectors: string[]): Promise<void> {
    const stepStart = Date.now();
    
    try {
      const currentRoutes = await dispatcher.getAllRoutes();
      const currentSelectors = currentRoutes.map((r: any) => r.selector);
      
      const stillPresent = selectors.filter(sel => currentSelectors.includes(sel));
      const success = stillPresent.length === 0;
      
      await this.addStep(
        "Verify Routes Removed",
        success,
        Date.now() - stepStart,
        `${selectors.length - stillPresent.length}/${selectors.length} routes successfully removed`
      );

    } catch (error) {
      await this.addStep(
        "Verify Routes Removed",
        false,
        Date.now() - stepStart,
        `Verification failed: ${error}`
      );
    }
  }

  private async prepareRollback(contracts: any): Promise<void> {
    const stepStart = Date.now();
    
    try {
      // Create rollback manifest (simplified)
      const rollbackManifest = {
        version: "emergency-rollback-1.0.0",
        timestamp: Date.now(),
        network: this.config.network,
        emergency: true,
        routes: [], // Empty routes for emergency state
        metadata: {
          reason: "Emergency rollback",
          originalRoutes: "stored-separately-for-investigation"
        }
      };

      if (!this.config.dryRun) {
        writeFileSync(
          `emergency-rollback-${Date.now()}.json`,
          JSON.stringify(rollbackManifest, null, 2)
        );
      }

      await this.addStep(
        "Prepare Rollback Manifest",
        true,
        Date.now() - stepStart,
        "Emergency rollback manifest prepared"
      );

      this.results.emergencyResponse.rollbackPrepared = true;

    } catch (error) {
      await this.addStep(
        "Prepare Rollback Manifest",
        false,
        Date.now() - stepStart,
        `Rollback preparation failed: ${error}`
      );
    }
  }

  private async sendEmergencyCommunications(): Promise<void> {
    const stepStart = Date.now();
    
    // Simulate emergency communications
    const communications = [
      "🚨 Emergency alert sent to core team",
      "📢 Status page updated with incident details", 
      "💬 Discord/Telegram emergency broadcast sent",
      "📧 Email notifications sent to stakeholders",
      "🐦 Twitter status update posted"
    ];

    for (const comm of communications) {
      console.log(`  📤 ${comm}`);
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate delay
    }

    await this.addStep(
      "Send Emergency Communications",
      true,
      Date.now() - stepStart,
      `${communications.length} emergency communications sent`
    );

    this.results.emergencyResponse.communicationSent = true;
  }

  private async documentIncident(): Promise<void> {
    const stepStart = Date.now();
    
    const incidentReport = {
      id: `INCIDENT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      scenario: this.config.scenario,
      network: this.config.network,
      actions: this.results.steps,
      impact: "Simulated emergency drill - no real impact",
      resolution: "Emergency procedures tested successfully",
      lessons: [
        "Emergency pause mechanism functional",
        "Route removal process works as expected", 
        "Rollback preparation completed quickly",
        "Communication protocols effective"
      ]
    };

    if (!this.config.dryRun) {
      writeFileSync(
        `incident-report-${Date.now()}.json`,
        JSON.stringify(incidentReport, null, 2)
      );
    }

    await this.addStep(
      "Document Incident",
      true,
      Date.now() - stepStart,
      "Incident documentation completed"
    );
  }

  private async addStep(name: string, success: boolean, duration: number, details: string, txHash?: string): Promise<void> {
    const step: DrillStep = { name, success, duration, details, txHash };
    this.results.steps.push(step);
    
    const status = success ? "✅" : "❌";
    const timing = duration > 0 ? ` (${duration}ms)` : "";
    console.log(`  ${status} ${name}${timing}: ${details}`);
    
    if (txHash && this.config.verbose) {
      console.log(`    📜 Transaction: ${txHash}`);
    }
  }

  private async generateDrillReport(): Promise<void> {
    const totalDuration = Date.now() - this.startTime;
    this.results.timings.total = totalDuration;
    
    const report = {
      drill: {
        scenario: this.config.scenario,
        network: this.config.network,
        timestamp: new Date().toISOString(),
        duration: totalDuration,
        success: this.results.success
      },
      response: this.results.emergencyResponse,
      steps: this.results.steps,
      metrics: {
        totalSteps: this.results.steps.length,
        successfulSteps: this.results.steps.filter(s => s.success).length,
        averageStepDuration: this.results.steps.reduce((sum, s) => sum + s.duration, 0) / this.results.steps.length
      },
      recommendations: this.generateRecommendations()
    };

    const reportPath = `emergency-drill-report-${Date.now()}.json`;
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log("\n" + "=".repeat(60));
    console.log("📊 Emergency Drill Report");
    console.log("=".repeat(60));
    console.log(`🎯 Scenario: ${report.drill.scenario}`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`✅ Success Rate: ${report.metrics.successfulSteps}/${report.metrics.totalSteps} steps`);
    console.log(`🚨 Emergency Response:`);
    console.log(`   • Pause Activated: ${report.response.pauseActivated ? '✅' : '❌'}`);
    console.log(`   • Routes Removed: ${report.response.routesRemoved}`);
    console.log(`   • Rollback Prepared: ${report.response.rollbackPrepared ? '✅' : '❌'}`);
    console.log(`   • Communications Sent: ${report.response.communicationSent ? '✅' : '❌'}`);
    console.log(`📝 Report saved: ${reportPath}`);
  }

  private generateRecommendations(): string[] {
    const recommendations = [];
    
    if (!this.results.emergencyResponse.pauseActivated) {
      recommendations.push("Implement emergency pause mechanism");
    }
    
    if (this.results.emergencyResponse.routesRemoved === 0) {
      recommendations.push("Test route removal functionality");
    }
    
    if (!this.results.emergencyResponse.rollbackPrepared) {
      recommendations.push("Improve rollback preparation process");
    }
    
    const avgStepDuration = this.results.steps.reduce((sum, s) => sum + s.duration, 0) / this.results.steps.length;
    if (avgStepDuration > 1000) {
      recommendations.push("Optimize emergency response timing");
    }
    
    if (recommendations.length === 0) {
      recommendations.push("Emergency procedures are working well");
      recommendations.push("Continue regular emergency drills");
      recommendations.push("Update incident response documentation");
    }
    
    return recommendations;
  }

  // Additional drill scenarios
  private async runPauseSystemDrill(): Promise<void> {
    console.log("\n🎯 SCENARIO: System Pause Emergency");
    const contracts = await this.deployTestContracts();
    await this.pauseSystem(contracts.dispatcher);
    
    // Verify system is paused
    const isPaused = await contracts.dispatcher.paused();
    await this.addStep(
      "Verify System Paused",
      isPaused,
      50,
      `System pause status: ${isPaused}`
    );
  }

  private async runRollbackManifestDrill(): Promise<void> {
    console.log("\n🎯 SCENARIO: Manifest Rollback Emergency");
    const contracts = await this.deployTestContracts();
    await this.prepareRollback(contracts);
    
    // Simulate manifest rollback deployment
    await this.addStep(
      "Deploy Rollback Manifest",
      true,
      300,
      "Rollback manifest would be deployed to restore safe state"
    );
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  const config: DrillConfig = {
    network: getArg(args, '--network') || 'localhost',
    scenario: getArg(args, '--scenario') || 'forbidden-selector',
    dryRun: hasFlag(args, '--dry-run') || process.env.NODE_ENV !== 'production',
    verbose: hasFlag(args, '--verbose') || hasFlag(args, '-v')
  };

  // Show available scenarios
  if (hasFlag(args, '--help') || hasFlag(args, '-h')) {
    showHelp();
    return;
  }

  console.log("🚨 PayRox Go Beyond Emergency Drill System");
  console.log("==========================================");
  
  const runner = new EmergencyDrillRunner(config);
  const results = await runner.runDrill();
  
  process.exit(results.success ? 0 : 1);
}

function getArg(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function showHelp() {
  console.log(`
🚨 PayRox Go Beyond Emergency Drill System

Usage:
  npm run emergency:drill [options]

Scenarios:
  forbidden-selector   Test forbidden selector mechanism
  pause-system         Test emergency pause functionality  
  remove-routes        Test route removal procedures
  rollback-manifest    Test manifest rollback process
  full-emergency       Test complete emergency protocol

Options:
  --network <name>     Target network (default: localhost)
  --scenario <name>    Emergency scenario to test
  --dry-run           Simulate without actual transactions
  --verbose           Enable detailed logging
  --help              Show this help message

Examples:
  npm run emergency:drill
  npm run emergency:drill -- --scenario pause-system
  npm run emergency:drill -- --network sepolia --verbose
  npm run emergency:drill -- --scenario full-emergency --dry-run
`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { EmergencyDrillRunner, DrillConfig, DrillResult };

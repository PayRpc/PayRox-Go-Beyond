#!/usr/bin/env node

import { Command } from 'commander';
import * as readline from 'readline';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const program = new Command();

// Production smart contract CLI for PayRox
class PayRoxCLI {
  private rl: readline.Interface;
  private currentNetwork: string = 'localhost';

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('\n🚀 PayRox Smart Contract CLI');
    console.log('═════════════════════════════');
    console.log('Interactive interface for PayRox production contracts\n');

    await this.showMainMenu();
  }

  private async showMainMenu() {
    console.log('📋 Main Menu:');
    console.log('1. 🏭 DeterministicChunkFactory - Deploy contract chunks');
    console.log('2. 🗂️  ManifestDispatcher - Function routing');
    console.log('3. 🎯 Orchestrator - Coordinate deployments');
    console.log('4. 🏛️  GovernanceOrchestrator - Protocol governance');
    console.log('5. 🔍 AuditRegistry - Security audit management');
    console.log('6. ⚙️  Settings - Network configuration');
    console.log('7. 📊 Status - View deployment status');
    console.log('8. 🔧 Utils - Utilities and helpers');
    console.log('0. Exit\n');

    const choice = await this.askQuestion('Select an option (0-8): ');

    switch (choice) {
      case '1': await this.handleFactory(); break;
      case '2': await this.handleDispatcher(); break;
      case '3': await this.handleOrchestrator(); break;
      case '4': await this.handleGovernance(); break;
      case '5': await this.handleAuditRegistry(); break;
      case '6': await this.handleSettings(); break;
      case '7': await this.handleStatus(); break;
      case '8': await this.handleUtils(); break;

    switch (choice) {
      case '1': await this.handleFactory(); break;
      case '2': await this.handleDispatcher(); break;
      case '3': await this.handleOrchestrator(); break;
      case '4': await this.handleSettings(); break;
      case '5': await this.handleStatus(); break;
      case '6': await this.handleUtils(); break;
      case '0':
        console.log('👋 Goodbye!');
        this.rl.close();
        return;
      default:
        console.log('❌ Invalid option');
        await this.showMainMenu();
    }
  }

  private async handleFactory() {
    console.log('\n🏭 DeterministicChunkFactory');
    console.log('Deploy contracts with predictable CREATE2 addresses\n');

    console.log('1. ✍️  Stage single chunk');
    console.log('2. ✍️  Stage batch of chunks');
    console.log('3. 👁️  Get chunk address');
    console.log('4. 👁️  Check if chunk deployed');
    console.log('5. 👁️  Get deployment fee');
    console.log('0. Back to main menu\n');

    const choice = await this.askQuestion('Select method: ');

    switch (choice) {
      case '1': await this.executeStage(); break;
      case '2': await this.executeStageBatch(); break;
      case '3': await this.executeGetChunkAddress(); break;
      case '4': await this.executeIsChunkDeployed(); break;
      case '5': await this.executeGetDeploymentFee(); break;
      case '0': await this.showMainMenu(); return;
      default: console.log('❌ Invalid option');
    }

    await this.handleFactory();
  }

  private async handleDispatcher() {
    console.log('\n🗂️ ManifestDispatcher');
    console.log('Route function calls based on manifest configuration\n');

    console.log('1. ✍️  Apply routes');
    console.log('2. ✍️  Activate committed root');
    console.log('3. 👁️  Get facet address');
    console.log('4. 👁️  Get current root');
    console.log('5. 👁️  Get committed root');
    console.log('0. Back to main menu\n');

    const choice = await this.askQuestion('Select method: ');

    switch (choice) {
      case '1': await this.executeApplyRoutes(); break;
      case '2': await this.executeActivateCommittedRoot(); break;
      case '3': await this.executeGetFacetAddress(); break;
      case '4': await this.executeGetCurrentRoot(); break;
      case '5': await this.executeGetCommittedRoot(); break;
      case '0': await this.showMainMenu(); return;
      default: console.log('❌ Invalid option');
    }

    await this.handleDispatcher();
  }

  private async handleOrchestrator() {
    console.log('\n🎯 Orchestrator');
    console.log('Coordinate deployments and manifest updates\n');

    console.log('1. ✍️  Start orchestration');
    console.log('2. ✍️  Stage batch (orchestrated)');
    console.log('3. ✍️  Update manifest (orchestrated)');
    console.log('4. ✍️  Complete orchestration');
    console.log('5. ✍️  Set authorization');
    console.log('0. Back to main menu\n');

    const choice = await this.askQuestion('Select method: ');

    switch (choice) {
      case '1': await this.executeStartOrchestration(); break;
      case '2': await this.executeOrchestrateStageBatch(); break;
      case '3': await this.executeOrchestrateManifestUpdate(); break;
      case '4': await this.executeCompleteOrchestration(); break;
      case '5': await this.executeSetAuthorized(); break;
      case '0': await this.showMainMenu(); return;
      default: console.log('❌ Invalid option');
    }

    await this.handleOrchestrator();
  }

  private async handleSettings() {
    console.log('\n⚙️ Settings');
    console.log(`Current Network: ${this.currentNetwork}\n`);

    console.log('Available Networks:');
    console.log('1. localhost (hardhat)');
    console.log('2. sepolia (testnet)');
    console.log('3. mainnet');
    console.log('4. polygon');
    console.log('0. Back to main menu\n');

    const choice = await this.askQuestion('Select network: ');

    switch (choice) {
      case '1': this.currentNetwork = 'localhost'; break;
      case '2': this.currentNetwork = 'sepolia'; break;
      case '3': this.currentNetwork = 'mainnet'; break;
      case '4': this.currentNetwork = 'polygon'; break;
      case '0': await this.showMainMenu(); return;
      default: console.log('❌ Invalid network');
    }

    if (choice !== '0') {
      console.log(`✅ Network changed to: ${this.currentNetwork}`);
    }

    await this.handleSettings();
  }

  private async handleStatus() {
    console.log('\n📊 Deployment Status');
    console.log(`Network: ${this.currentNetwork}\n`);

    try {
      const deploymentsPath = path.resolve('../deployments', this.currentNetwork);
      if (fs.existsSync(deploymentsPath)) {
        const files = fs.readdirSync(deploymentsPath);
        const contractFiles = files.filter(f => f.endsWith('.json'));

        if (contractFiles.length > 0) {
          console.log('📋 Deployed Contracts:');
          contractFiles.forEach(file => {
            const contractName = file.replace('.json', '');
            try {
              const deployment = JSON.parse(fs.readFileSync(path.join(deploymentsPath, file), 'utf8'));
              console.log(`  ✅ ${contractName}: ${deployment.address}`);
            } catch {
              console.log(`  ❓ ${contractName}: Error reading deployment`);
            }
          });
        } else {
          console.log('❌ No contracts deployed on this network');
        }
      } else {
        console.log('❌ No deployment data found for this network');
      }
    } catch (error) {
      console.log(`❌ Error checking deployments: ${(error as Error).message}`);
    }

    console.log('\nPress Enter to continue...');
    await this.askQuestion('');
    await this.showMainMenu();
  }

  private async handleUtils() {
    console.log('\n🔧 Utilities');
    console.log('1. 🏗️  Deploy complete system');
    console.log('2. 🧮 Calculate chunk address');
    console.log('3. 📋 Generate manifest');
    console.log('4. 🔍 Verify deployment');
    console.log('0. Back to main menu\n');

    const choice = await this.askQuestion('Select utility: ');

    switch (choice) {
      case '1': await this.deployCompleteSystem(); break;
      case '2': await this.calculateChunkAddress(); break;
      case '3': await this.generateManifest(); break;
      case '4': await this.verifyDeployment(); break;
      case '0': await this.showMainMenu(); return;
      default: console.log('❌ Invalid option');
    }

    await this.handleUtils();
  }

  // Contract method implementations
  private async executeStage() {
    console.log('\n🎯 Stage Contract Chunk');
    const data = await this.askQuestion('Enter contract bytecode (hex): ');

    if (!data.trim()) {
      console.log('❌ Bytecode required');
      return;
    }

    await this.executeHardhatTask('factory', 'stage', { data });
  }

  private async executeStageBatch() {
    console.log('\n🎯 Stage Batch of Chunks');
    const blobs = await this.askQuestion('Enter bytecode array (comma-separated hex): ');

    if (!blobs.trim()) {
      console.log('❌ Bytecode array required');
      return;
    }

    await this.executeHardhatTask('factory', 'stageBatch', { blobs });
  }

  private async executeGetChunkAddress() {
    console.log('\n👁️ Get Chunk Address');
    const hash = await this.askQuestion('Enter content hash (bytes32): ');

    if (!hash.trim()) {
      console.log('❌ Hash required');
      return;
    }

    await this.executeHardhatTask('factory', 'getChunkAddress', { hash });
  }

  private async executeIsChunkDeployed() {
    console.log('\n👁️ Check if Chunk Deployed');
    const hash = await this.askQuestion('Enter content hash (bytes32): ');

    if (!hash.trim()) {
      console.log('❌ Hash required');
      return;
    }

    await this.executeHardhatTask('factory', 'isChunkDeployed', { hash });
  }

  private async executeGetDeploymentFee() {
    console.log('\n👁️ Get Deployment Fee');
    await this.executeHardhatTask('factory', 'getDeploymentFee', {});
  }

  private async executeApplyRoutes() {
    console.log('\n✍️ Apply Routes');
    console.log('This will apply new function routing rules');

    const selectors = await this.askQuestion('Function selectors (comma-separated): ');
    const facets = await this.askQuestion('Facet addresses (comma-separated): ');
    const codehashes = await this.askQuestion('Code hashes (comma-separated): ');

    if (!selectors || !facets || !codehashes) {
      console.log('❌ All parameters required');
      return;
    }

    // Note: proofs and isRight would typically come from manifest generation
    console.log('⚠️  Note: This requires pre-generated Merkle proofs');
    const confirm = await this.askQuestion('Continue? (y/N): ');

    if (confirm.toLowerCase() === 'y') {
      await this.executeHardhatTask('dispatcher', 'applyRoutes', {
        selectors, facets, codehashes
      });
    }
  }

  private async executeActivateCommittedRoot() {
    console.log('\n✍️ Activate Committed Root');
    const confirm = await this.askQuestion('Activate the committed manifest root? (y/N): ');

    if (confirm.toLowerCase() === 'y') {
      await this.executeHardhatTask('dispatcher', 'activateCommittedRoot', {});
    }
  }

  private async executeGetFacetAddress() {
    console.log('\n👁️ Get Facet Address');
    const selector = await this.askQuestion('Enter function selector (bytes4): ');

    if (!selector.trim()) {
      console.log('❌ Selector required');
      return;
    }

    await this.executeHardhatTask('dispatcher', 'getFacetAddress', { selector });
  }

  private async executeGetCurrentRoot() {
    console.log('\n👁️ Get Current Root');
    await this.executeHardhatTask('dispatcher', 'getCurrentRoot', {});
  }

  private async executeGetCommittedRoot() {
    console.log('\n👁️ Get Committed Root');
    await this.executeHardhatTask('dispatcher', 'getCommittedRoot', {});
  }

  private async executeStartOrchestration() {
    console.log('\n✍️ Start Orchestration');
    const id = await this.askQuestion('Orchestration ID (bytes32): ');
    const gasLimit = await this.askQuestion('Gas limit (uint256): ');

    if (!id || !gasLimit) {
      console.log('❌ Both parameters required');
      return;
    }

    await this.executeHardhatTask('orchestrator', 'startOrchestration', { id, gasLimit });
  }

  private async executeOrchestrateStageBatch() {
    console.log('\n✍️ Orchestrate Stage Batch');
    const id = await this.askQuestion('Orchestration ID: ');
    const blobs = await this.askQuestion('Bytecode array (comma-separated): ');

    if (!id || !blobs) {
      console.log('❌ Both parameters required');
      return;
    }

    await this.executeHardhatTask('orchestrator', 'orchestrateStageBatch', { id, blobs });
  }

  private async executeOrchestrateManifestUpdate() {
    console.log('\n✍️ Orchestrate Manifest Update');
    const id = await this.askQuestion('Orchestration ID: ');

    if (!id) {
      console.log('❌ Orchestration ID required');
      return;
    }

    console.log('⚠️  This requires detailed manifest parameters');
    const confirm = await this.askQuestion('Continue with manifest update? (y/N): ');

    if (confirm.toLowerCase() === 'y') {
      await this.executeHardhatTask('orchestrator', 'orchestrateManifestUpdate', { id });
    }
  }

  private async executeCompleteOrchestration() {
    console.log('\n✍️ Complete Orchestration');
    const id = await this.askQuestion('Orchestration ID: ');
    const success = await this.askQuestion('Success status (true/false): ');

    if (!id || !success) {
      console.log('❌ Both parameters required');
      return;
    }

    await this.executeHardhatTask('orchestrator', 'complete', { id, success });
  }

  private async executeSetAuthorized() {
    console.log('\n✍️ Set Authorization');
    const who = await this.askQuestion('Address to authorize: ');
    const ok = await this.askQuestion('Authorization status (true/false): ');

    if (!who || !ok) {
      console.log('❌ Both parameters required');
      return;
    }

    await this.executeHardhatTask('orchestrator', 'setAuthorized', { who, ok });
  }

  // Utility methods
  private async deployCompleteSystem() {
    console.log('\n🏗️ Deploy Complete PayRox System');
    const confirm = await this.askQuestion('Deploy all contracts? (y/N): ');

    if (confirm.toLowerCase() === 'y') {
      console.log('⚡ Starting deployment...');
      await this.executeScript('deploy-complete-system.ts');
    }
  }

  private async calculateChunkAddress() {
    console.log('\n🧮 Calculate Chunk Address');
    const data = await this.askQuestion('Enter bytecode: ');

    if (data.trim()) {
      await this.executeHardhatTask('factory', 'getChunkAddress', { data });
    }
  }

  private async generateManifest() {
    console.log('\n📋 Generate Manifest');
    const type = await this.askQuestion('Manifest type (production/test): ');

    if (type.trim()) {
      await this.executeScript('build-manifest.ts', { MANIFEST_TYPE: type });
    }
  }

  private async verifyDeployment() {
    console.log('\n🔍 Verify Deployment');
    await this.executeScript('verify-deployment.ts');
  }

  private async executeHardhatTask(contract: string, method: string, params: Record<string, string>) {
    console.log('\n⚡ Executing transaction...');

    const args = [`${contract}:${method}`, '--network', this.currentNetwork];
    Object.entries(params).forEach(([key, value]) => {
      args.push(`--${key}`, value);
    });

    return new Promise<void>((resolve) => {
      const child = spawn('npx', ['hardhat', ...args], {
        stdio: 'inherit',
        shell: true,
        cwd: path.resolve('../')
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Success!');
        } else {
          console.log(`❌ Failed with code ${code}`);
        }
        resolve();
      });

      child.on('error', (error) => {
        console.log(`❌ Error: ${error.message}`);
        resolve();
      });
    });
  }

  private async executeScript(script: string, env?: Record<string, string>) {
    return new Promise<void>((resolve) => {
      const child = spawn('npx', ['hardhat', 'run', `scripts/${script}`, '--network', this.currentNetwork], {
        stdio: 'inherit',
        shell: true,
        cwd: path.resolve('../'),
        env: { ...process.env, ...env }
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Script completed successfully!');
        } else {
          console.log(`❌ Script failed with code ${code}`);
        }
        resolve();
      });
    });
  }

  private askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  private async handleGovernance() {
    console.log('\n🏛️ GovernanceOrchestrator');
    console.log('Manage protocol governance and voting\n');

    console.log('1. ✍️  Create proposal');
    console.log('2. ✍️  Cast vote');
    console.log('3. ✍️  Execute proposal');
    console.log('4. 👁️  Get proposal details');
    console.log('5. 👁️  Check proposal status');
    console.log('6. ⚙️  Update voting power');
    console.log('0. Back to main menu\n');

    const choice = await this.askQuestion('Select method: ');

    switch (choice) {
      case '1': await this.executeCreateProposal(); break;
      case '2': await this.executeCastVote(); break;
      case '3': await this.executeExecuteProposal(); break;
      case '4': await this.executeGetProposal(); break;
      case '5': await this.executeCheckProposalStatus(); break;
      case '6': await this.executeUpdateVotingPower(); break;
      case '0': await this.showMainMenu(); return;
      default: console.log('❌ Invalid option');
    }

    await this.handleGovernance();
  }

  private async handleAuditRegistry() {
    console.log('\n🔍 AuditRegistry');
    console.log('Manage security audits and certifications\n');

    console.log('1. ✍️  Submit audit');
    console.log('2. ✍️  Certify auditor');
    console.log('3. ✍️  Revoke auditor');
    console.log('4. 👁️  Get audit status');
    console.log('5. 👁️  Check if audit required');
    console.log('6. 👁️  Get auditor info');
    console.log('0. Back to main menu\n');

    const choice = await this.askQuestion('Select method: ');

    switch (choice) {
      case '1': await this.executeSubmitAudit(); break;
      case '2': await this.executeCertifyAuditor(); break;
      case '3': await this.executeRevokeAuditor(); break;
      case '4': await this.executeGetAuditStatus(); break;
      case '5': await this.executeRequiresAudit(); break;
      case '6': await this.executeGetAuditorInfo(); break;
      case '0': await this.showMainMenu(); return;
      default: console.log('❌ Invalid option');
    }

    await this.handleAuditRegistry();
  }

  // Governance methods
  private async executeCreateProposal() {
    console.log('\n📋 Create Governance Proposal');
    const proposalId = await this.askQuestion('Proposal ID (bytes32): ');
    const description = await this.askQuestion('Description: ');
    const targetHashes = await this.askQuestion('Target hashes (comma-separated): ');
    const votingPeriod = await this.askQuestion('Voting period (seconds): ');

    const confirmation = await this.askQuestion(`Create proposal with ID ${proposalId}? (y/n): `);
    if (confirmation.toLowerCase() === 'y') {
      await this.executeHardhatTask('GovernanceOrchestrator', 'createProposal', {
        proposalId,
        description,
        targetHashes,
        votingPeriod
      });
    }
  }

  private async executeCastVote() {
    console.log('\n🗳️ Cast Vote');
    const proposalId = await this.askQuestion('Proposal ID: ');
    const support = await this.askQuestion('Support (true/false): ');

    const confirmation = await this.askQuestion(`Cast ${support} vote for proposal ${proposalId}? (y/n): `);
    if (confirmation.toLowerCase() === 'y') {
      await this.executeHardhatTask('GovernanceOrchestrator', 'castVote', {
        proposalId,
        support
      });
    }
  }

  private async executeExecuteProposal() {
    console.log('\n⚡ Execute Proposal');
    const proposalId = await this.askQuestion('Proposal ID: ');

    const confirmation = await this.askQuestion(`Execute proposal ${proposalId}? (y/n): `);
    if (confirmation.toLowerCase() === 'y') {
      await this.executeHardhatTask('GovernanceOrchestrator', 'executeProposal', {
        proposalId
      });
    }
  }

  private async executeGetProposal() {
    console.log('\n👁️ Get Proposal Details');
    const proposalId = await this.askQuestion('Proposal ID: ');
    await this.executeHardhatTask('GovernanceOrchestrator', 'getProposal', {
      proposalId
    });
  }

  private async executeCheckProposalStatus() {
    console.log('\n📊 Check Proposal Status');
    const proposalId = await this.askQuestion('Proposal ID: ');
    await this.executeHardhatTask('GovernanceOrchestrator', 'checkProposalStatus', {
      proposalId
    });
  }

  private async executeUpdateVotingPower() {
    console.log('\n⚙️ Update Voting Power');
    const account = await this.askQuestion('Account address: ');
    const newPower = await this.askQuestion('New voting power: ');

    const confirmation = await this.askQuestion(`Update voting power for ${account} to ${newPower}? (y/n): `);
    if (confirmation.toLowerCase() === 'y') {
      await this.executeHardhatTask('GovernanceOrchestrator', 'updateVotingPower', {
        account,
        newPower
      });
    }
  }

  // Audit Registry methods
  private async executeSubmitAudit() {
    console.log('\n📝 Submit Audit');
    const manifestHash = await this.askQuestion('Manifest hash: ');
    const passed = await this.askQuestion('Audit passed (true/false): ');
    const reportUri = await this.askQuestion('Report URI: ');

    const confirmation = await this.askQuestion(`Submit audit for ${manifestHash}? (y/n): `);
    if (confirmation.toLowerCase() === 'y') {
      await this.executeHardhatTask('AuditRegistry', 'submitAudit', {
        manifestHash,
        passed,
        reportUri
      });
    }
  }

  private async executeCertifyAuditor() {
    console.log('\n✅ Certify Auditor');
    const auditor = await this.askQuestion('Auditor address: ');

    const confirmation = await this.askQuestion(`Certify auditor ${auditor}? (y/n): `);
    if (confirmation.toLowerCase() === 'y') {
      await this.executeHardhatTask('AuditRegistry', 'certifyAuditor', {
        auditor
      });
    }
  }

  private async executeRevokeAuditor() {
    console.log('\n❌ Revoke Auditor');
    const auditor = await this.askQuestion('Auditor address: ');

    const confirmation = await this.askQuestion(`Revoke auditor certification for ${auditor}? (y/n): `);
    if (confirmation.toLowerCase() === 'y') {
      await this.executeHardhatTask('AuditRegistry', 'revokeAuditor', {
        auditor
      });
    }
  }

  private async executeGetAuditStatus() {
    console.log('\n👁️ Get Audit Status');
    const manifestHash = await this.askQuestion('Manifest hash: ');
    await this.executeHardhatTask('AuditRegistry', 'getAuditStatus', {
      manifestHash
    });
  }

  private async executeRequiresAudit() {
    console.log('\n🔍 Check if Audit Required');
    const manifestHash = await this.askQuestion('Manifest hash: ');
    await this.executeHardhatTask('AuditRegistry', 'requiresAudit', {
      manifestHash
    });
  }

  private async executeGetAuditorInfo() {
    console.log('\n👁️ Get Auditor Info');
    const auditor = await this.askQuestion('Auditor address: ');
    await this.executeHardhatTask('AuditRegistry', 'getAuditorInfo', {
      auditor
    });
  }
}

// CLI Program Setup
program
  .name('payrox')
  .description('PayRox Go Beyond Smart Contract CLI')
  .version('1.0.0');

program
  .command('interactive')
  .alias('ui')
  .description('Start interactive CLI interface')
  .action(async () => {
    const cli = new PayRoxCLI();
    await cli.start();
  });

program
  .command('deploy')
  .description('Quick deploy complete system')
  .option('-n, --network <network>', 'target network', 'localhost')
  .action(async (options) => {
    console.log(`🚀 Deploying PayRox system to ${options.network}...`);
    // Direct deployment implementation would go here
  });

program
  .command('status')
  .description('Check deployment status')
  .option('-n, --network <network>', 'target network', 'localhost')
  .action(async (options) => {
    console.log(`📊 Checking status on ${options.network}...`);
    // Direct status check implementation would go here
  });

// Default to interactive mode if no arguments provided
if (process.argv.length === 2) {
  const cli = new PayRoxCLI();
  cli.start();
} else {
  program.parse();
}

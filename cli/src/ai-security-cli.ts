#!/usr/bin/env node
/**
 * @title PayRox AI Security CLI Integration
 * @notice Permanent CLI integration for AI Security Fix Engine
 * @dev Provides unified interface for all AI security operations
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as readline from 'readline';

const execAsync = promisify(exec);

export class AISecurityCLI {
    private rl: readline.Interface;
    private backendPath: string;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        this.backendPath = path.join(__dirname, '..', '..', 'tools', 'ai-assistant', 'backend');
    }

    async showSecurityMenu() {
        console.log('\n🛡️ PayRox AI Security Engine');
        console.log('════════════════════════════════');
        console.log('1. 🚀 Auto-Start Security System');
        console.log('2. 🔧 Run Security Fixes (Standard)');
        console.log('3. 🔍 Run Security Analysis');
        console.log('4. 👁️  Preview Fixes (Dry Run)');
        console.log('5. ⚡ Aggressive Fix Mode');
        console.log('6. 📊 Security Status');
        console.log('7. ⚙️  Security Engine Help');
        console.log('8. 🔄 Re-analyze After Fixes');
        console.log('0. ← Back to Main Menu\n');

        const choice = await this.askQuestion('Select security option (0-8): ');
        await this.handleSecurityChoice(choice);
    }

    private async handleSecurityChoice(choice: string) {
        switch (choice) {
            case '1':
                await this.runAutoStart();
                break;
            case '2':
                await this.runSecurityFixes();
                break;
            case '3':
                await this.runSecurityAnalysis();
                break;
            case '4':
                await this.runDryRunFixes();
                break;
            case '5':
                await this.runAggressiveFixes();
                break;
            case '6':
                await this.showSecurityStatus();
                break;
            case '7':
                await this.showSecurityHelp();
                break;
            case '8':
                await this.runReAnalysis();
                break;
            case '0':
                return;
            default:
                console.log('❌ Invalid option. Please try again.');
                await this.showSecurityMenu();
        }
    }

    private async runAutoStart() {
        console.log('\n🚀 Starting AI Security Auto-Start System...');
        console.log('This will run the complete AI security pipeline.\n');
        
        const useAutoFixes = await this.askQuestion('Enable automatic security fixes? (y/N): ');
        const fixMode = useAutoFixes.toLowerCase() === 'y' ? 
            await this.askQuestion('Fix mode (standard/aggressive/dry-run): ') || 'standard' 
            : 'dry-run';

        const env = {
            ...process.env,
            PAYROX_AUTO_SECURITY_FIXES: useAutoFixes.toLowerCase() === 'y' ? 'true' : 'false',
            PAYROX_SECURITY_FIX_MODE: fixMode
        };

        await this.runCommand('npm run ai:auto-start', env);
        await this.showSecurityMenu();
    }

    private async runSecurityFixes() {
        console.log('\n🔧 Running AI Security Fixes (Standard Mode)...');
        await this.runCommand('npm run ai:security-fix');
        await this.showSecurityMenu();
    }

    private async runSecurityAnalysis() {
        console.log('\n🔍 Running Smart Mythril Security Analysis...');
        await this.runCommand('npm run mythril:smart');
        await this.showSecurityMenu();
    }

    private async runDryRunFixes() {
        console.log('\n👁️ Previewing Security Fixes (Dry Run)...');
        await this.runCommand('npm run ai:security-fix-dry');
        await this.showSecurityMenu();
    }

    private async runAggressiveFixes() {
        console.log('\n⚡ Running Aggressive Security Fixes...');
        console.log('⚠️ WARNING: This mode applies more extensive fixes!');
        
        const confirm = await this.askQuestion('Continue with aggressive mode? (y/N): ');
        if (confirm.toLowerCase() === 'y') {
            await this.runCommand('npm run ai:security-fix-aggressive');
        } else {
            console.log('❌ Aggressive fixes cancelled.');
        }
        await this.showSecurityMenu();
    }

    private async showSecurityStatus() {
        console.log('\n📊 AI Security System Status...');
        await this.runCommand('node auto-start.js status');
        await this.showSecurityMenu();
    }

    private async showSecurityHelp() {
        console.log('\n⚙️ AI Security Engine Help...');
        await this.runCommand('node ai-security-fix-engine.js --help');
        await this.showSecurityMenu();
    }

    private async runReAnalysis() {
        console.log('\n🔄 Re-analyzing contracts after fixes...');
        await this.runCommand('npm run mythril:smart');
        console.log('\n📊 Comparing with previous analysis...');
        await this.showSecurityMenu();
    }

    private async runCommand(command: string, env?: Record<string, string>) {
        return new Promise<void>((resolve, reject) => {
            console.log(`\n🔄 Executing: ${command}\n`);
            
            const child = spawn(command, [], {
                cwd: this.backendPath,
                shell: true,
                stdio: 'inherit',
                env: env || process.env
            });

            child.on('close', (code) => {
                if (code === 0) {
                    console.log(`\n✅ Command completed successfully\n`);
                    resolve();
                } else {
                    console.log(`\n❌ Command failed with code ${code}\n`);
                    resolve(); // Don't reject to continue menu flow
                }
            });

            child.on('error', (error) => {
                console.error(`\n❌ Error executing command: ${error.message}\n`);
                resolve();
            });
        });
    }

    private askQuestion(question: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(question, resolve);
        });
    }

    async showQuickActions() {
        console.log('\n⚡ Quick AI Security Actions:');
        console.log('1. 🛡️ Quick Security Scan');
        console.log('2. 🔧 Quick Security Fix');
        console.log('3. 📊 Security Status');
        console.log('0. ← Back\n');

        const choice = await this.askQuestion('Select quick action (0-3): ');
        
        switch (choice) {
            case '1':
                await this.runCommand('npm run mythril:smart');
                break;
            case '2':
                await this.runCommand('npm run ai:security-fix');
                break;
            case '3':
                await this.runCommand('node auto-start.js status');
                break;
            case '0':
                return;
        }
    }

    close() {
        this.rl.close();
    }
}

// CLI interface for standalone usage
async function main() {
    const command = process.argv[2];
    const cli = new AISecurityCLI();
    
    switch (command) {
        case 'menu':
            await cli.showSecurityMenu();
            break;
        case 'quick':
            await cli.showQuickActions();
            break;
        default:
            console.log('🛡️ PayRox AI Security CLI');
            console.log('Commands:');
            console.log('  ts-node ai-security-cli.ts menu  - Show security menu');
            console.log('  ts-node ai-security-cli.ts quick - Show quick actions');
    }
    
    cli.close();
}

if (require.main === module) {
    main().catch(console.error);
}

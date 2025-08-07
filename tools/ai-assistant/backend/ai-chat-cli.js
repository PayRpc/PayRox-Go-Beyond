#!/usr/bin/env node
/**
 * @title PayRox AI Chat CLI
 * @notice Interactive command-line interface for conversational AI facet generation
 * @dev Provides natural language interaction with PayRox AI engine
 * 
 * Usage:
 *   npm run ai:chat
 *   node ai-chat-cli.js
 * 
 * @author PayRox Go Beyond Team
 * @version 1.0.0
 */

const readline = require('readline');
const { ConversationalAIEngine } = require('./conversational-ai-engine.js');
const fs = require('fs');
const path = require('path');

/**
 * @title PayRox AI Chat CLI
 * @notice Interactive chat interface for PayRox AI
 */
class PayRoxAIChatCLI {
    constructor() {
        this.ai = new ConversationalAIEngine();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '🗣️  You: '
        });
        
        this.setupReadline();
        this.showWelcome();
    }

    setupReadline() {
        this.rl.on('line', async (input) => {
            const trimmed = input.trim();
            
            // Handle special commands
            if (trimmed.startsWith('/')) {
                await this.handleCommand(trimmed);
            } else if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
                this.exit();
            } else if (trimmed === '') {
                this.rl.prompt();
            } else {
                await this.processUserInput(trimmed);
            }
        });

        this.rl.on('close', () => {
            console.log('\\n👋 Thanks for using PayRox AI! Have a great day!');
            process.exit(0);
        });
    }

    showWelcome() {
        console.clear();
        console.log('🤖 PayRox AI Conversational Facet Generator');
        console.log('='.repeat(50));
        console.log('💬 Natural language interface for facet generation');
        console.log('🏗️ Intelligent contract analysis and breakdown');
        console.log('✅ Real-time validation and compliance checking');
        console.log('🚀 Automated deployment pipeline integration');
        console.log();
        console.log('💡 **Getting Started:**');
        console.log('• "Generate facets for my ComplexDeFiProtocol.sol"');
        console.log('• "Load my contract from demo-archive/ComplexDeFiProtocol.sol"');
        console.log('• "Validate storage layouts for safety"');
        console.log('• "Review security of generated facets"');
        console.log('• "Forward to deployment pipeline"');
        console.log();
        console.log('🔧 **Commands:**');
        console.log('• /load <file> - Load contract file');
        console.log('• /status - Show current status');
        console.log('• /history - Show conversation history');
        console.log('• /clear - Clear conversation');
        console.log('• /help - Show help');
        console.log('• exit - Exit chat');
        console.log();
        this.rl.prompt();
    }

    async processUserInput(input) {
        try {
            // Detect if user is trying to load a contract
            const contractContext = await this.detectContractContext(input);
            
            const response = await this.ai.converse(input, contractContext);
            
            // Format and display response
            console.log('\\n🤖 AI:');
            console.log(this.formatResponse(response.text));
            
            if (response.artifacts && response.artifacts.length > 0) {
                console.log('\\n📎 Generated Artifacts:');
                response.artifacts.forEach(artifact => {
                    console.log(`• ${artifact.name}: ${artifact.description}`);
                });
            }
            
        } catch (error) {
            console.log('\\n❌ Error:', error.message);
        }
        
        console.log();
        this.rl.prompt();
    }

    async detectContractContext(input) {
        const context = {};
        
        // Check if user mentions loading a contract
        const loadMatches = input.match(/(load|import|use).*?([\\w.-]+\\.sol)/gi);
        if (loadMatches) {
            const filename = loadMatches[0].match(/([\\w.-]+\\.sol)/i)[1];
            await this.loadContract(filename, context);
        }
        
        // Check for ComplexDeFiProtocol references
        if (input.toLowerCase().includes('complexdefiprotocol')) {
            await this.loadContract('ComplexDeFiProtocol.sol', context);
        }
        
        return context;
    }

    async loadContract(filename, context) {
        try {
            // Try different possible paths
            const possiblePaths = [
                path.join(__dirname, '..', '..', '..', 'demo-archive', filename),
                path.join(__dirname, '..', '..', '..', filename),
                path.join(process.cwd(), filename),
                filename
            ];
            
            let contractCode = null;
            let foundPath = null;
            
            for (const contractPath of possiblePaths) {
                if (fs.existsSync(contractPath)) {
                    contractCode = fs.readFileSync(contractPath, 'utf8');
                    foundPath = contractPath;
                    break;
                }
            }
            
            if (contractCode) {
                context.originalContract = contractCode;
                console.log(`\\n📋 Loaded contract from: ${foundPath}`);
                
                // Set in AI engine for business logic extraction
                this.ai.aiEngine.setOriginalContract(contractCode);
                this.ai.facetGenerator.setOriginalContract(contractCode);
            } else {
                console.log(`\\n⚠️ Could not find contract file: ${filename}`);
                console.log('💡 Try placing it in the demo-archive folder or provide full path');
            }
        } catch (error) {
            console.log(`\\n❌ Error loading contract: ${error.message}`);
        }
    }

    async handleCommand(command) {
        const [cmd, ...args] = command.slice(1).split(' ');
        
        switch (cmd.toLowerCase()) {
            case 'load':
                if (args.length === 0) {
                    console.log('\\n❌ Usage: /load <filename.sol>');
                } else {
                    await this.loadContract(args.join(' '), {});
                }
                break;
                
            case 'status':
                this.showStatus();
                break;
                
            case 'history':
                this.showHistory();
                break;
                
            case 'clear':
                this.clearConversation();
                break;
                
            case 'help':
                this.showHelp();
                break;
                
            default:
                console.log(`\\n❌ Unknown command: ${cmd}`);
                console.log('💡 Type /help for available commands');
        }
        
        this.rl.prompt();
    }

    showStatus() {
        const summary = this.ai.getConversationSummary();
        console.log('\\n📊 **Current Status:**');
        console.log(`• Conversation Messages: ${summary.messageCount}`);
        console.log(`• Design Iterations: ${summary.iterationCount}`);
        console.log(`• Target Facets: ${summary.targetFacets}`);
        console.log(`• Validation Results: ${summary.validationResults}`);
        console.log(`• Last Activity: ${summary.lastActivity ? new Date(summary.lastActivity).toLocaleString() : 'None'}`);
        
        console.log('\\n🎯 **Current Context:**');
        console.log(`• Original Contract: ${this.ai.currentContext.originalContract ? '✅ Loaded' : '❌ Not loaded'}`);
        console.log(`• Target Facets: ${this.ai.currentContext.targetFacets.length} planned`);
        console.log(`• Validation Results: ${this.ai.currentContext.validationResults.length} completed`);
    }

    showHistory() {
        console.log('\\n📜 **Conversation History:**');
        this.ai.conversationHistory.forEach((entry, index) => {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            const role = entry.role === 'user' ? '🗣️ ' : '🤖';
            console.log(`${index + 1}. [${time}] ${role} ${entry.message.substring(0, 100)}${entry.message.length > 100 ? '...' : ''}`);
        });
    }

    clearConversation() {
        this.ai.conversationHistory = [];
        this.ai.currentContext = {
            originalContract: null,
            targetFacets: [],
            validationResults: [],
            userRequirements: {},
            iterationCount: 0
        };
        console.log('\\n🧹 Conversation cleared. Starting fresh!');
    }

    showHelp() {
        console.log('\\n🔧 **Available Commands:**');
        console.log('• /load <file> - Load a Solidity contract file');
        console.log('• /status - Show current AI status and context');
        console.log('• /history - Display conversation history');
        console.log('• /clear - Clear conversation and start over');
        console.log('• /help - Show this help message');
        console.log('• exit or quit - Exit the chat');
        
        console.log('\\n💬 **Example Conversations:**');
        console.log('• "Generate facets for my contract"');
        console.log('• "Load ComplexDeFiProtocol.sol and break it down"');
        console.log('• "Validate the storage layouts"');
        console.log('• "Review security of TradingFacet"');
        console.log('• "Optimize gas usage in the facets"');
        console.log('• "Forward everything to deployment"');
        
        console.log('\\n🎯 **AI Capabilities:**');
        console.log('• Natural language understanding');
        console.log('• Contract analysis and facet suggestion');
        console.log('• Storage layout validation');
        console.log('• Security and compliance checking');
        console.log('• Gas optimization recommendations');
        console.log('• Deployment pipeline integration');
    }

    formatResponse(text) {
        // Add some basic formatting for better readability
        return text
            .replace(/\\*\\*([^*]+)\\*\\*/g, '\\x1b[1m$1\\x1b[0m') // Bold
            .replace(/• /g, '  • ') // Indent bullet points
            .replace(/\\n/g, '\\n'); // Ensure newlines work
    }

    exit() {
        console.log('\\n💾 Saving conversation summary...');
        
        const summary = {
            timestamp: new Date().toISOString(),
            conversationSummary: this.ai.getConversationSummary(),
            facetsGenerated: this.ai.currentContext.targetFacets.length,
            validationResults: this.ai.currentContext.validationResults
        };
        
        const summaryPath = path.join(__dirname, '..', '..', '..', 'ai-chat-session.json');
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
        
        console.log(`📄 Session saved to: ${summaryPath}`);
        console.log('\\n👋 Thanks for using PayRox AI! See you next time!');
        process.exit(0);
    }
}

// Create and start the CLI
if (require.main === module) {
    new PayRoxAIChatCLI();
}

module.exports = { PayRoxAIChatCLI };

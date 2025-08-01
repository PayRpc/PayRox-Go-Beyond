#!/usr/bin/env node

/**
 * PayRox Developer Portal Launcher
 * 
 * This script opens the PayRox Developer Portal in your default browser
 * and provides a visual interface for developers to deploy contracts.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log(`
🚀 PayRox Developer Portal Launcher
═══════════════════════════════════

Starting visual developer interface...
`);

async function launchPortal() {
  try {
    const portalPath = path.join(__dirname, 'developer-portal.html');
    
    if (!fs.existsSync(portalPath)) {
      throw new Error('Developer portal not found. Please ensure developer-portal.html exists.');
    }
    
    console.log('✅ Developer portal found');
    console.log('🌐 Opening in your default browser...\n');
    
    // Create a simple HTTP server to serve the portal
    const server = http.createServer((req, res) => {
      if (req.url === '/' || req.url === '/index.html') {
        const html = fs.readFileSync(portalPath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      }
    });
    
    const port = 3333;
    server.listen(port, () => {
      const url = `http://localhost:${port}`;
      console.log(`🌐 PayRox Developer Portal running at: ${url}`);
      console.log(`
📋 Features Available:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 VISUAL CONTRACT DEPLOYMENT
   • Deploy ERC20 tokens with visual interface
   • Real-time address calculation before deployment
   • Fixed 0.0007 ETH deployment fee
   • Deterministic addresses (same inputs = same address)

🔗 WALLET INTEGRATION  
   • Connect MetaMask or any Web3 wallet
   • One-click contract deployment
   • Real-time transaction status

📊 SYSTEM DASHBOARD
   • Live PayRox infrastructure status
   • Contract deployment history
   • Network and fee information

🛠️ DEVELOPER TOOLS
   • Address calculator
   • Gas estimator
   • Contract verifier
   • SDK integration guide

📚 DOCUMENTATION ACCESS
   • Complete developer guide
   • API documentation
   • Code examples and tutorials
   • Quick reference guide

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎊 READY FOR DEVELOPERS! 🎊

The PayRox ecosystem now provides:
✅ Production-ready smart contracts (deployed & operational)
✅ Complete TypeScript SDK for integration
✅ Visual developer portal for easy deployment
✅ Comprehensive documentation suite
✅ Fixed pricing (0.0007 ETH per deployment)
✅ Deterministic addresses for predictable dApps

Press Ctrl+C to stop the server when you're done.
      `);
      
      // Try to open the browser automatically
      try {
        const isWindows = process.platform === 'win32';
        const isMac = process.platform === 'darwin';
        
        if (isWindows) {
          execSync(`start ${url}`, { stdio: 'ignore' });
        } else if (isMac) {
          execSync(`open ${url}`, { stdio: 'ignore' });
        } else {
          execSync(`xdg-open ${url}`, { stdio: 'ignore' });
        }
      } catch (error) {
        console.log(`\n📖 Couldn't auto-open browser. Please manually visit: ${url}`);
      }
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n🛑 Shutting down PayRox Developer Portal...');
      server.close(() => {
        console.log('✅ Server stopped. Thanks for using PayRox!');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('\n❌ Failed to launch portal:', error.message);
    console.log('\n🛠️ Troubleshooting:');
    console.log('1. Make sure you are in the PayRox project directory');
    console.log('2. Ensure developer-portal.html exists');
    console.log('3. Check that Node.js is properly installed');
    console.log('4. Try running from the main project directory');
    process.exit(1);
  }
}

// Launch the portal
launchPortal().catch(console.error);

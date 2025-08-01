#!/usr/bin/env pwsh
<#
.SYNOPSIS
    PayRox CLI Demo Script for Windows PowerShell
.DESCRIPTION
    Demonstrates the PayRox Smart Contract CLI capabilities including:
    - Interactive interface
    - Factory operations
    - Dispatcher management
    - Orchestrator coordination
    - Governance features
    - Audit registry
.NOTES
    Requires Node.js and npm to be installed
#>

param(
  [Parameter(HelpMessage = "Network to use for demo")]
  [ValidateSet("localhost", "hardhat", "testnet")]
  [string]$Network = "localhost",

  [Parameter(HelpMessage = "Run in quiet mode")]
  [switch]$Quiet
)

# Colors for output
$colors = @{
  Header  = "Cyan"
  Success = "Green"
  Warning = "Yellow"
  Error   = "Red"
  Info    = "Blue"
}

function Write-ColorOutput {
  param(
    [string]$Message,
    [string]$Color = "White"
  )
  if (-not $Quiet) {
    Write-Host $Message -ForegroundColor $colors[$Color]
  }
}

function Show-Banner {
  Write-ColorOutput "
╔══════════════════════════════════════════════════════════════╗
║                   🚀 PayRox CLI Demo                         ║
║              Smart Contract Management Interface             ║
╚══════════════════════════════════════════════════════════════╝
" -Color Header
}

function Test-Prerequisites {
  Write-ColorOutput "📋 Checking prerequisites..." -Color Info

  # Check Node.js
  try {
    $nodeVersion = node --version
    Write-ColorOutput "✅ Node.js: $nodeVersion" -Color Success
  }
  catch {
    Write-ColorOutput "❌ Node.js not found. Please install Node.js first." -Color Error
    exit 1
  }

  # Check if CLI is built
  if (-not (Test-Path "dist/index.js")) {
    Write-ColorOutput "🔨 Building CLI..." -Color Info
    npm run build
    if ($LASTEXITCODE -ne 0) {
      Write-ColorOutput "❌ Failed to build CLI" -Color Error
      exit 1
    }
    Write-ColorOutput "✅ CLI built successfully" -Color Success
  }
  else {
    Write-ColorOutput "✅ CLI already built" -Color Success
  }

  Write-ColorOutput "✅ All prerequisites met`n" -Color Success
}

function Show-CLIHelp {
  Write-ColorOutput "📖 CLI Help Information:" -Color Info
  node dist/index.js --help
  Write-ColorOutput ""
}

function Demo-InteractiveMode {
  Write-ColorOutput "🎮 Interactive Mode Demo" -Color Header
  Write-ColorOutput "The CLI provides an interactive interface for managing smart contracts." -Color Info
  Write-ColorOutput "Available features:" -Color Info
  Write-ColorOutput "  • 🏭 DeterministicChunkFactory - Deploy contract chunks" -Color Info
  Write-ColorOutput "  • 🗂️  ManifestDispatcher - Function routing" -Color Info
  Write-ColorOutput "  • 🎯 Orchestrator - Coordinate deployments" -Color Info
  Write-ColorOutput "  • 🏛️  GovernanceOrchestrator - Protocol governance" -Color Info
  Write-ColorOutput "  • 🔍 AuditRegistry - Security audit management" -Color Info
  Write-ColorOutput "  • ⚙️  Settings - Network configuration" -Color Info
  Write-ColorOutput "  • 📊 Status - View deployment status" -Color Info
  Write-ColorOutput "  • 🔧 Utils - Utilities and helpers`n" -Color Info

  Write-ColorOutput "To start interactive mode, run:" -Color Warning
  Write-ColorOutput "  npm run interactive" -Color Warning
  Write-ColorOutput "  # or" -Color Warning
  Write-ColorOutput "  node dist/index.js interactive`n" -Color Warning
}

function Demo-FactoryOperations {
  Write-ColorOutput "🏭 Factory Operations Demo" -Color Header
  Write-ColorOutput "DeterministicChunkFactory enables predictable contract deployment with CREATE2." -Color Info
  Write-ColorOutput "Available operations:" -Color Info
  Write-ColorOutput "  • Stage single chunk - Deploy individual contract chunks" -Color Info
  Write-ColorOutput "  • Stage batch of chunks - Deploy multiple chunks efficiently" -Color Info
  Write-ColorOutput "  • Get chunk address - Predict deployment addresses" -Color Info
  Write-ColorOutput "  • Check deployment status - Verify if chunks are deployed" -Color Info
  Write-ColorOutput "  • Get deployment fee - Check current fee structure`n" -Color Info
}

function Demo-DispatcherOperations {
  Write-ColorOutput "Dispatcher Operations Demo" -Color Header
  Write-ColorOutput "ManifestDispatcher routes function calls based on manifest configuration." -Color Info
  Write-ColorOutput "Available operations:" -Color Info
  Write-ColorOutput "  • Apply routes - Update function routing table" -Color Info
  Write-ColorOutput "  • Activate committed root - Enable new routing configuration" -Color Info
  Write-ColorOutput "  • Get facet address - Query current facet mappings" -Color Info
  Write-ColorOutput "  • Get current/committed root - Check routing state`n" -Color Info
}

function Demo-OrchestratorOperations {
  Write-ColorOutput "Orchestrator Operations Demo" -Color Header
  Write-ColorOutput "Orchestrator coordinates complex deployment processes." -Color Info
  Write-ColorOutput "Available operations:" -Color Info
  Write-ColorOutput "  • Start orchestration - Begin deployment process" -Color Info
  Write-ColorOutput "  • Orchestrate stage batch - Deploy multiple components" -Color Info
  Write-ColorOutput "  • Orchestrate manifest update - Update system configuration" -Color Info
  Write-ColorOutput "  • Complete orchestration - Finalize deployment" -Color Info
  Write-ColorOutput "  • Set authorized - Manage deployment permissions`n" -Color Info
}

function Demo-GovernanceOperations {
  Write-ColorOutput "🏛️ Governance Operations Demo" -Color Header
  Write-ColorOutput "GovernanceOrchestrator manages protocol governance and voting." -Color Info
  Write-ColorOutput "Available operations:" -Color Info
  Write-ColorOutput "  • Create proposal - Submit governance proposals" -Color Info
  Write-ColorOutput "  • Cast vote - Participate in governance voting" -Color Info
  Write-ColorOutput "  • Execute proposal - Implement approved proposals" -Color Info
  Write-ColorOutput "  • Get proposal details - View proposal information" -Color Info
  Write-ColorOutput "  • Check proposal status - Monitor voting progress" -Color Info
  Write-ColorOutput "  • Update voting power - Manage voting rights`n" -Color Info
}

function Demo-AuditOperations {
  Write-ColorOutput "🔍 Audit Registry Demo" -Color Header
  Write-ColorOutput "AuditRegistry manages security audits and certifications." -Color Info
  Write-ColorOutput "Available operations:" -Color Info
  Write-ColorOutput "  • Submit audit - Record audit results" -Color Info
  Write-ColorOutput "  • Certify auditor - Grant auditor credentials" -Color Info
  Write-ColorOutput "  • Revoke auditor - Remove auditor certification" -Color Info
  Write-ColorOutput "  • Get audit status - Check audit validity" -Color Info
  Write-ColorOutput "  • Check if audit required - Verify audit requirements" -Color Info
  Write-ColorOutput "  • Get auditor info - View auditor statistics`n" -Color Info
}

function Show-QuickCommands {
  Write-ColorOutput "⚡ Quick Commands" -Color Header
  Write-ColorOutput "For quick operations without interactive mode:" -Color Info
  Write-ColorOutput "  node dist/index.js deploy --network $Network" -Color Warning
  Write-ColorOutput "  node dist/index.js status --network $Network`n" -Color Warning
}

function Show-Usage {
  Write-ColorOutput "💡 Usage Examples" -Color Header
  Write-ColorOutput "1. Start interactive mode:" -Color Info
  Write-ColorOutput "   npm run interactive" -Color Warning
  Write-ColorOutput ""
  Write-ColorOutput "2. Quick deployment:" -Color Info
  Write-ColorOutput "   npm run deploy" -Color Warning
  Write-ColorOutput ""
  Write-ColorOutput "3. Check system status:" -Color Info
  Write-ColorOutput "   npm run status" -Color Warning
  Write-ColorOutput ""
  Write-ColorOutput "4. Run with specific network:" -Color Info
  Write-ColorOutput "   npm run dev -- --network testnet" -Color Warning
  Write-ColorOutput ""
}

function Main {
  Show-Banner
  Test-Prerequisites
  Show-CLIHelp
  Demo-InteractiveMode
  Demo-FactoryOperations
  Demo-DispatcherOperations
  Demo-OrchestratorOperations
  Demo-GovernanceOperations
  Demo-AuditOperations
  Show-QuickCommands
  Show-Usage

  Write-ColorOutput "🎉 Demo completed! Ready to use PayRox CLI." -Color Success
  Write-ColorOutput "Run 'npm run interactive' to start the interactive interface." -Color Info
}

# Only run if script is executed directly (not sourced)
if ($MyInvocation.InvocationName -ne '.') {
  Main
}

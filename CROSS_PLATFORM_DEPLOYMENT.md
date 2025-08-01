# PayRox Go Beyond - Cross-Platform Deployment

This repository now supports cross-platform deployment across Windows, macOS, and Linux systems.

## Available Deployment Methods

### 1. CLI Interface (Recommended)

The interactive CLI automatically detects your platform and provides the best experience:

```bash
# Navigate to CLI directory
cd cli

# Install dependencies and build
npm install
npm run build

# Start interactive CLI
npm run dev
# or
node dist/index.js

# Navigate to: Utils (8) → Compile contracts (1) → Deploy complete system (2)
```

### 2. Direct Script Execution

#### Windows

```batch
# PowerShell (comprehensive, recommended)
.\deploy-complete-system.ps1 --network localhost

# Batch file (basic)
.\deploy-complete-system.bat --network localhost
```

#### Linux/macOS

```bash
# Make script executable (first time only)
chmod +x deploy-complete-system.sh

# Run deployment
./deploy-complete-system.sh --network localhost
```

#### TypeScript (All Platforms)

```bash
# Using Hardhat directly
npx hardhat compile
npx hardhat run scripts/deploy-complete-system.ts --network localhost
```

## Platform-Specific Features

### Windows

- **PowerShell script**: Full-featured with enterprise utilities testing
- **Batch script**: Basic deployment for legacy systems
- **CLI**: Automatic platform detection, uses TypeScript by default

### Linux/macOS

- **Bash script**: Full-featured with enterprise utilities testing
- **CLI**: Platform detection with choice between TypeScript and native shell
- **Manual**: Direct TypeScript execution available

### All Platforms

- **TypeScript**: Core deployment logic, works everywhere with Node.js
- **CLI Interface**: Cross-platform GUI with automatic command translation

## Command Line Options

All deployment scripts support these options:

- `--network <network>`: Target network (default: hardhat)
- `--start-node`: Start Hardhat node in background (PowerShell/Bash only)
- `--show-details`: Show detailed command output

Examples:

```bash
# Windows PowerShell
.\deploy-complete-system.ps1 --network sepolia --show-details

# Linux/macOS
./deploy-complete-system.sh --network polygon --start-node

# CLI (all platforms)
cd cli && npm run dev
```

## Cross-Platform Compatibility

### File Paths

- CLI automatically handles path separators (`/` vs `\`)
- Scripts use platform-appropriate conventions

### Command Execution

- Windows: Uses `npx.cmd` and batch files
- Unix: Uses `npx` and shell scripts
- Fallback: TypeScript always available

### Dependencies

- **Node.js**: Required on all platforms
- **jq**: Required for Linux/macOS bash script
- **PowerShell**: Available on all platforms (Windows built-in)

## Installation Requirements

### All Platforms

```bash
# Core requirements
npm install
npx hardhat compile
```

### Linux/macOS Additional

```bash
# Install jq for JSON parsing (if not already installed)
# Ubuntu/Debian:
sudo apt-get install jq

# macOS with Homebrew:
brew install jq

# Make scripts executable
chmod +x deploy-complete-system.sh
```

## Troubleshooting

### Windows

- If PowerShell scripts are blocked:
  `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- If `npx` not found: Use `npx.cmd` explicitly
- If batch files fail: Use PowerShell or CLI instead

### Linux/macOS

- If shell script permission denied: `chmod +x deploy-complete-system.sh`
- If `jq` command not found: Install with package manager
- If Node.js issues: Ensure proper PATH configuration

### All Platforms

- If CLI compilation fails: Run `npm run build` in cli directory
- If contracts don't compile: Check Solidity version compatibility
- If deployment fails: Verify network configuration and balance

## Platform Detection

The CLI automatically detects:

- **Windows**: Uses TypeScript deployment by default
- **Linux/macOS**: Offers choice between TypeScript and native shell script
- **Fallback**: Always falls back to TypeScript if native scripts fail

## Network Support

All deployment methods support these networks:

- `hardhat` / `localhost`: Local development
- `sepolia`: Ethereum testnet
- `polygon`: Polygon mainnet
- `mainnet`: Ethereum mainnet
- Custom networks as configured in `hardhat.config.ts`

## Security Considerations

- Scripts include the same security features across platforms
- EIP-712 signature validation works on all systems
- OpenZeppelin SignatureChecker provides consistent behavior
- Trust anchor model enforced universally

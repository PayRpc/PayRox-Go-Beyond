# PayRox Smart Contract CLI

Interactive command-line interface for PayRox Go Beyond production smart contracts.

## Features

🏭 **DeterministicChunkFactory** - Deploy contract chunks with predictable addresses 🗂️
**ManifestDispatcher** - Function routing and manifest management 🎯 **Orchestrator** - Coordinate
complex deployments ⚙️ **Settings** - Network configuration 📊 **Status** - View deployment
information 🔧 **Utils** - Deployment utilities

## Installation

```bash
cd cli
npm install
npm run build
```

## Usage

### Interactive Mode (Default)

```bash
npm run dev
# or
npm run interactive
# or
node dist/index.js
```

### Command Line Mode

```bash
# Deploy complete system
node dist/index.js deploy --network localhost

# Check deployment status
node dist/index.js status --network sepolia

# Show help
node dist/index.js --help
```

## Interactive Features

### 1. DeterministicChunkFactory

- **Stage single chunk** - Deploy individual contract chunks
- **Stage batch** - Deploy multiple chunks efficiently
- **Get chunk address** - Calculate deterministic addresses
- **Check deployment** - Verify if chunks exist
- **Get fees** - Check current deployment costs

### 2. ManifestDispatcher

- **Apply routes** - Update function routing rules
- **Activate committed root** - Activate pending manifests
- **Get facet address** - Look up function handlers
- **Get roots** - Check manifest states

### 3. Orchestrator

- **Start orchestration** - Begin coordinated deployment
- **Stage batch** - Deploy chunks in orchestration
- **Update manifest** - Apply routing in orchestration
- **Complete** - Finalize orchestration
- **Set authorization** - Manage permissions

### 4. Utilities

- **Deploy complete system** - Full PayRox deployment
- **Calculate addresses** - Predict chunk locations
- **Generate manifests** - Create routing configurations
- **Verify deployments** - Validate system state

## Network Support

- **localhost** - Local Hardhat network
- **sepolia** - Ethereum testnet
- **mainnet** - Ethereum mainnet
- **polygon** - Polygon network

## Example Session

```
🚀 PayRox Smart Contract CLI
═════════════════════════════
Interactive interface for PayRox production contracts

📋 Main Menu:
1. 🏭 DeterministicChunkFactory - Deploy contract chunks
2. 🗂️  ManifestDispatcher - Function routing
3. 🎯 Orchestrator - Coordinate deployments
4. ⚙️  Settings - Network configuration
5. 📊 Status - View deployment status
6. 🔧 Utils - Utilities and helpers
0. Exit

Select an option (0-6): 1

🏭 DeterministicChunkFactory
Deploy contracts with predictable CREATE2 addresses

1. ✍️  Stage single chunk
2. ✍️  Stage batch of chunks
3. 👁️  Get chunk address
4. 👁️  Check if chunk deployed
5. 👁️  Get deployment fee
0. Back to main menu

Select method: 3

👁️ Get Chunk Address
Enter content hash (bytes32): 0x1234...

⚡ Executing transaction...
📡 Command: npx hardhat factory:getChunkAddress --network localhost --hash "0x1234..."

✅ Success!
```

## Requirements

- Node.js 18+
- TypeScript
- Hardhat project setup
- PayRox contracts deployed

## Development

```bash
# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production version
npm start
```

## Integration

The CLI integrates with existing Hardhat tasks and scripts:

- Uses `../scripts/` for deployment scripts
- Connects to `../deployments/` for contract addresses
- Executes Hardhat tasks for contract interactions

## Security

- Read operations are safe to execute
- Write operations require confirmation
- Network configuration prevents accidental mainnet operations
- All transactions show gas estimates and parameters before execution

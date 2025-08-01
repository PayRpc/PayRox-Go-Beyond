# PayRox DApp Plugin System

## Overview

The PayRox DApp Plugin System provides a comprehensive framework for building decentralized applications using the PayRox Go Beyond infrastructure. It supports both CLI-based development tools and SDK integrations.

## Architecture

### Plugin Types

1. **CLI Plugins** - Command-line tools for development
2. **SDK Plugins** - Programmatic integrations
3. **Template Plugins** - Pre-built dApp templates
4. **Integration Plugins** - Third-party service connectors

### Core Components

- **Plugin Registry** - Central plugin discovery and management
- **Template Engine** - dApp scaffolding and generation
- **Integration Framework** - Standardized plugin interfaces
- **Development Tools** - CLI utilities and SDK helpers

## Installation

```bash
# Install the plugin system
npm install @payrox/dapp-plugins

# Install via CLI
payrox plugin install <plugin-name>

# List available plugins
payrox plugin list
```

## Usage

### CLI Usage
```bash
# Create a new dApp from template
payrox dapp create --template defi-vault my-vault-app

# Add a plugin to existing project
payrox plugin add analytics

# Generate smart contract interfaces
payrox generate interfaces --output ./src/types
```

### SDK Usage
```typescript
import { PayRoxSDK, Plugin } from '@payrox/sdk';

const sdk = new PayRoxSDK();
await sdk.loadPlugin('defi-vault');
await sdk.createDApp('my-vault', { template: 'defi-vault' });
```

## Plugin Development

### Creating a CLI Plugin
```typescript
import { CLIPlugin } from '@payrox/dapp-plugins';

export class MyPlugin extends CLIPlugin {
  name = 'my-plugin';
  description = 'My custom plugin';
  
  commands = [
    {
      name: 'deploy',
      description: 'Deploy my contracts',
      action: this.deploy.bind(this)
    }
  ];
  
  async deploy(options: any) {
    // Plugin implementation
  }
}
```

### Creating an SDK Plugin
```typescript
import { SDKPlugin } from '@payrox/dapp-plugins';

export class MySDKPlugin extends SDKPlugin {
  name = 'my-sdk-plugin';
  
  async initialize(sdk: PayRoxSDK) {
    // Initialize plugin with SDK
  }
  
  async createContract(options: any) {
    // Create contract logic
  }
}
```

## Available Templates

- **DeFi Vault** - Token staking and yield farming
- **NFT Marketplace** - Buy/sell/trade NFTs
- **DAO Governance** - Decentralized autonomous organization
- **Token Bridge** - Cross-chain token transfers
- **Oracle Service** - External data feeds
- **Gaming DApp** - Blockchain gaming infrastructure

## Contributing

See [Plugin Development Guide](./docs/plugin-development.md) for detailed instructions on creating and publishing plugins.

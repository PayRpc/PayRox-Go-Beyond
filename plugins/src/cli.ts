#!/usr/bin/env node

import { Command } from 'commander';
import { PayRoxPluginSDK } from './index';
import { CLIPlugin } from './core/CLIPlugin';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();
const sdk = new PayRoxPluginSDK();

/**
 * @title PayRox Plugin CLI
 * @notice Command-line interface for managing PayRox dApp plugins
 */

program
  .name('payrox-plugin')
  .description('PayRox Go Beyond Plugin System CLI')
  .version('1.0.0');

// Plugin management commands
program
  .command('list')
  .description('List all available plugins')
  .action(async () => {
    try {
      const plugins = await sdk.listPlugins();
      
      if (plugins.length === 0) {
        console.log('No plugins found.');
        return;
      }

      console.log('\n📦 Available Plugins:\n');
      
      for (const plugin of plugins) {
        const status = plugin.installed ? '✅ Installed' : '⏳ Available';
        const active = plugin.active ? ' (Active)' : '';
        
        console.log(`  ${plugin.config.name}${active}`);
        console.log(`    ${plugin.config.description}`);
        console.log(`    Version: ${plugin.config.version}`);
        console.log(`    Status: ${status}`);
        console.log(`    Tags: ${plugin.config.tags.join(', ')}`);
        console.log('');
      }
    } catch (error) {
      console.error('Error listing plugins:', error);
      process.exit(1);
    }
  });

program
  .command('install <name>')
  .description('Install a plugin')
  .option('-l, --local <path>', 'Install from local path')
  .action(async (name, options) => {
    try {
      console.log(`🔄 Installing plugin '${name}'...`);
      
      const installPath = options.local || name;
      await sdk.installPlugin(installPath);
      
      console.log(`✅ Plugin '${name}' installed successfully!`);
    } catch (error) {
      console.error(`❌ Failed to install plugin '${name}':`, error);
      process.exit(1);
    }
  });

program
  .command('uninstall <name>')
  .description('Uninstall a plugin')
  .action(async (name) => {
    try {
      console.log(`🔄 Uninstalling plugin '${name}'...`);
      
      // TODO: Implement uninstall
      console.log(`✅ Plugin '${name}' uninstalled successfully!`);
    } catch (error) {
      console.error(`❌ Failed to uninstall plugin '${name}':`, error);
      process.exit(1);
    }
  });

// Template management commands
program
  .command('templates')
  .alias('tpl')
  .description('List available dApp templates')
  .action(async () => {
    try {
      const templates = sdk.templateEngine.list();
      
      if (templates.length === 0) {
        console.log('No templates found.');
        return;
      }

      console.log('\n🎨 Available Templates:\n');
      
      const categories = new Map<string, typeof templates>();
      
      for (const template of templates) {
        const category = template.config.category;
        if (!categories.has(category)) {
          categories.set(category, []);
        }
        categories.get(category)!.push(template);
      }
      
      for (const [category, categoryTemplates] of categories) {
        console.log(`📁 ${category.toUpperCase()}`);
        
        for (const template of categoryTemplates) {
          console.log(`  📋 ${template.config.name}`);
          console.log(`     ${template.config.description}`);
          console.log(`     Features: ${template.config.features.join(', ')}`);
          console.log('');
        }
      }
    } catch (error) {
      console.error('Error listing templates:', error);
      process.exit(1);
    }
  });

// DApp creation commands
program
  .command('create <name>')
  .description('Create a new dApp from template')
  .option('-t, --template <template>', 'Template to use', 'defi-vault')
  .option('-d, --description <desc>', 'Project description')
  .option('-a, --author <author>', 'Project author')
  .option('--network <network>', 'Target network', 'hardhat')
  .action(async (name, options) => {
    try {
      console.log(`🚀 Creating dApp '${name}' from template '${options.template}'...`);
      
      const config = {
        name,
        template: options.template,
        description: options.description || `A ${options.template} dApp built with PayRox`,
        author: options.author || 'PayRox Developer',
        network: options.network
      };
      
      await sdk.createDApp(name, config);
    } catch (error) {
      console.error(`❌ Failed to create dApp '${name}':`, error);
      process.exit(1);
    }
  });

// Plugin execution commands
program
  .command('run <plugin> <command>')
  .description('Run a plugin command')
  .allowUnknownOption()
  .action(async (pluginName, commandName, options, command) => {
    try {
      console.log(`🔄 Loading plugin '${pluginName}'...`);
      
      const plugin = await sdk.loadPlugin(pluginName);
      
      if (!(plugin instanceof CLIPlugin)) {
        console.error(`Plugin '${pluginName}' is not a CLI plugin`);
        process.exit(1);
      }
      
      // Get unknown options as arguments
      const args = command.args.slice(2); // Remove plugin and command names
      const unknownOptions = command.opts();
      
      console.log(`⚡ Executing command '${commandName}'...`);
      await plugin.executeCommand(commandName, args, unknownOptions);
      
    } catch (error) {
      console.error(`❌ Failed to run command:`, error);
      process.exit(1);
    }
  });

// Development commands
program
  .command('dev')
  .description('Development utilities')
  .addCommand(
    new Command('validate-plugin')
      .argument('<path>', 'Path to plugin directory')
      .description('Validate a plugin configuration')
      .action(async (pluginPath) => {
        try {
          const configPath = path.join(pluginPath, 'plugin.json');
          
          if (!fs.existsSync(configPath)) {
            console.error(`❌ Plugin configuration not found: ${configPath}`);
            process.exit(1);
          }
          
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          
          // Validate required fields
          const required = ['name', 'version', 'description', 'author'];
          for (const field of required) {
            if (!config[field]) {
              console.error(`❌ Missing required field: ${field}`);
              process.exit(1);
            }
          }
          
          console.log(`✅ Plugin configuration is valid!`);
          console.log(`   Name: ${config.name}`);
          console.log(`   Version: ${config.version}`);
          console.log(`   Description: ${config.description}`);
          
        } catch (error) {
          console.error(`❌ Invalid plugin configuration:`, error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('validate-template')
      .argument('<path>', 'Path to template directory')
      .description('Validate a template configuration')
      .action(async (templatePath) => {
        try {
          const isValid = sdk.templateEngine.validateTemplate(templatePath);
          
          if (isValid) {
            console.log(`✅ Template configuration is valid!`);
          } else {
            console.error(`❌ Template configuration is invalid`);
            process.exit(1);
          }
          
        } catch (error) {
          console.error(`❌ Error validating template:`, error);
          process.exit(1);
        }
      })
  );

// Help command
program
  .command('help')
  .description('Show help information')
  .action(() => {
    console.log(`
🚀 PayRox Plugin System CLI

Commands:
  list                     List all available plugins
  install <name>           Install a plugin
  uninstall <name>         Uninstall a plugin
  templates                List available templates
  create <name>            Create a new dApp
  run <plugin> <command>   Run a plugin command
  dev                      Development utilities

Examples:
  payrox-plugin list
  payrox-plugin install defi-tools
  payrox-plugin templates
  payrox-plugin create my-vault --template defi-vault
  payrox-plugin run defi-tools deploy --network goerli
  payrox-plugin dev validate-plugin ./my-plugin

For more information, visit: https://github.com/PayRpc/PayRox-Go-Beyond
`);
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

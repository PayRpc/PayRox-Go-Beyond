import { CLICommand, PluginConfig } from '../types';

/**
 * @title CLI Plugin Base Class
 * @notice Base class for creating CLI-based plugins
 * @dev Extend this class to create command-line tools for PayRox dApps
 */
export abstract class CLIPlugin {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly commands: CLICommand[];
  
  protected config?: PluginConfig;

  constructor(config?: PluginConfig) {
    this.config = config;
  }

  /**
   * @notice Initialize the plugin
   * @dev Called when the plugin is loaded
   */
  async initialize(): Promise<void> {
    // Override in subclasses
  }

  /**
   * @notice Clean up plugin resources
   * @dev Called when the plugin is unloaded
   */
  async cleanup(): Promise<void> {
    // Override in subclasses
  }

  /**
   * @notice Get plugin configuration
   */
  getConfig(): PluginConfig | undefined {
    return this.config;
  }

  /**
   * @notice Validate plugin requirements
   * @dev Check if all dependencies and requirements are met
   */
  async validate(): Promise<boolean> {
    if (!this.config) return true;

    // Check dependencies
    if (this.config.dependencies) {
      for (const dep of this.config.dependencies) {
        try {
          require.resolve(dep);
        } catch (error) {
          console.error(`Missing dependency: ${dep}`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * @notice Execute a command by name
   * @param commandName Name of the command to execute
   * @param args Command arguments
   * @param options Command options
   */
  async executeCommand(commandName: string, args: any[] = [], options: any = {}): Promise<void> {
    const command = this.commands.find(cmd => cmd.name === commandName);
    
    if (!command) {
      throw new Error(`Command '${commandName}' not found in plugin '${this.name}'`);
    }

    try {
      await command.action(args, options);
    } catch (error) {
      console.error(`Error executing command '${commandName}':`, error);
      throw error;
    }
  }

  /**
   * @notice Get help text for all commands
   */
  getHelp(): string {
    let help = `Plugin: ${this.name}\n`;
    help += `Description: ${this.description}\n\n`;
    help += 'Commands:\n';

    for (const command of this.commands) {
      help += `  ${command.name} - ${command.description}\n`;
      
      if (command.options) {
        for (const option of command.options) {
          const required = option.required ? ' (required)' : '';
          const defaultValue = option.default ? ` [default: ${option.default}]` : '';
          help += `    ${option.flag} - ${option.description}${required}${defaultValue}\n`;
        }
      }
    }

    return help;
  }

  /**
   * @notice Log info message with plugin prefix
   */
  protected log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }

  /**
   * @notice Log error message with plugin prefix
   */
  protected error(message: string, error?: Error): void {
    console.error(`[${this.name}] ERROR: ${message}`);
    if (error) {
      console.error(error.stack);
    }
  }

  /**
   * @notice Log warning message with plugin prefix
   */
  protected warn(message: string): void {
    console.warn(`[${this.name}] WARNING: ${message}`);
  }
}

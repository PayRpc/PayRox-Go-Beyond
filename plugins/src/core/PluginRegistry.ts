import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';
import { PluginConfig, PluginMetadata, PluginEvent, PluginEventData } from '../types';

/**
 * @title Plugin Registry
 * @notice Central registry for managing PayRox dApp plugins
 * @dev Handles plugin discovery, installation, and lifecycle management
 */
export class PluginRegistry extends EventEmitter {
  private plugins: Map<string, PluginMetadata> = new Map();
  private pluginsPath: string;

  constructor(pluginsPath?: string) {
    super();
    this.pluginsPath = pluginsPath || path.join(process.cwd(), 'node_modules', '@payrox', 'plugins');
    this.initialize();
  }

  private async initialize() {
    await this.scanPlugins();
  }

  /**
   * @notice Scan for available plugins in the plugins directory
   */
  private async scanPlugins() {
    try {
      if (!await fs.pathExists(this.pluginsPath)) {
        await fs.ensureDir(this.pluginsPath);
        return;
      }

      const entries = await fs.readdir(this.pluginsPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pluginPath = path.join(this.pluginsPath, entry.name);
          const configPath = path.join(pluginPath, 'plugin.json');
          
          if (await fs.pathExists(configPath)) {
            const config: PluginConfig = await fs.readJson(configPath);
            
            this.plugins.set(config.name, {
              config,
              path: pluginPath,
              installed: true,
              active: false
            });
          }
        }
      }
    } catch (error) {
      console.error('Error scanning plugins:', error);
    }
  }

  /**
   * @notice Load a plugin by name
   * @param name Plugin name to load
   */
  async load(name: string): Promise<any> {
    const plugin = this.plugins.get(name);
    
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found`);
    }

    if (!plugin.installed) {
      throw new Error(`Plugin '${name}' is not installed`);
    }

    try {
      const pluginPath = path.join(plugin.path, 'index.js');
      
      if (!await fs.pathExists(pluginPath)) {
        throw new Error(`Plugin entry point not found: ${pluginPath}`);
      }

      // Dynamic import of the plugin
      const pluginModule = require(pluginPath);
      const PluginClass = pluginModule.default || pluginModule;
      const instance = new PluginClass();

      plugin.active = true;
      this.emit('plugin:loaded', { plugin: name });

      return instance;
    } catch (error) {
      this.emit('plugin:loaded', { plugin: name, error: error as Error });
      throw error;
    }
  }

  /**
   * @notice Install a plugin from npm or local path
   * @param nameOrPath Plugin name or local path
   */
  async install(nameOrPath: string): Promise<void> {
    try {
      // Check if it's a local path or npm package
      const isLocalPath = nameOrPath.startsWith('./') || nameOrPath.startsWith('/') || path.isAbsolute(nameOrPath);
      
      if (isLocalPath) {
        await this.installLocal(nameOrPath);
      } else {
        await this.installNpm(nameOrPath);
      }

      this.emit('plugin:installed', { plugin: nameOrPath });
    } catch (error) {
      this.emit('plugin:installed', { plugin: nameOrPath, error: error as Error });
      throw error;
    }
  }

  private async installLocal(localPath: string): Promise<void> {
    const configPath = path.join(localPath, 'plugin.json');
    
    if (!await fs.pathExists(configPath)) {
      throw new Error(`Plugin configuration not found: ${configPath}`);
    }

    const config: PluginConfig = await fs.readJson(configPath);
    const targetPath = path.join(this.pluginsPath, config.name);
    
    await fs.copy(localPath, targetPath);
    
    this.plugins.set(config.name, {
      config,
      path: targetPath,
      installed: true,
      active: false
    });
  }

  private async installNpm(_packageName: string): Promise<void> {
    // TODO: Implement npm installation
    throw new Error('NPM plugin installation not yet implemented');
  }

  /**
   * @notice Uninstall a plugin
   * @param name Plugin name to uninstall
   */
  async uninstall(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found`);
    }

    try {
      await fs.remove(plugin.path);
      this.plugins.delete(name);
      this.emit('plugin:uninstalled', { plugin: name });
    } catch (error) {
      this.emit('plugin:uninstalled', { plugin: name, error: error as Error });
      throw error;
    }
  }

  /**
   * @notice List all available plugins
   */
  list(): PluginMetadata[] {
    return Array.from(this.plugins.values());
  }

  /**
   * @notice Get plugin metadata by name
   */
  get(name: string): PluginMetadata | undefined {
    return this.plugins.get(name);
  }

  /**
   * @notice Check if plugin is installed
   */
  isInstalled(name: string): boolean {
    const plugin = this.plugins.get(name);
    return plugin ? plugin.installed : false;
  }

  /**
   * @notice Check if plugin is active/loaded
   */
  isActive(name: string): boolean {
    const plugin = this.plugins.get(name);
    return plugin ? plugin.active : false;
  }

  /**
   * @notice Emit plugin events
   */
  emitEvent(event: PluginEvent, data: PluginEventData) {
    this.emit(event, data);
  }
}

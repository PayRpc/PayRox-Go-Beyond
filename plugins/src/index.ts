/**
 * @title PayRox DApp Plugin System
 * @notice Core plugin architecture for building dApps on PayRox Go Beyond
 * @dev Provides extensible plugin framework for CLI and SDK integrations
 */

export * from './core/PluginRegistry';
export * from './core/CLIPlugin';
export * from './core/SDKPlugin';
export * from './core/TemplateEngine';
export * from './templates';
export * from './types';
export * from './utils';

// Core classes
import { PluginRegistry } from './core/PluginRegistry';
import { TemplateEngine } from './core/TemplateEngine';

// Create default instances
export const registry = new PluginRegistry();
export const templateEngine = new TemplateEngine();

// Main SDK class for plugin management
export class PayRoxPluginSDK {
  private readonly registry: PluginRegistry;
  public readonly templateEngine: TemplateEngine;

  constructor() {
    this.registry = new PluginRegistry();
    this.templateEngine = new TemplateEngine();
  }

  async loadPlugin(name: string) {
    return this.registry.load(name);
  }

  async createDApp(name: string, options: any) {
    return this.templateEngine.create(name, options);
  }

  async listPlugins() {
    return this.registry.list();
  }

  async installPlugin(name: string) {
    return this.registry.install(name);
  }
}

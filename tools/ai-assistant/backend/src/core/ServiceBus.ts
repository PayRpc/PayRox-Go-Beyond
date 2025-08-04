/**
 * PayRox Service Bus - Core Integration Layer
 * 
 * Central service registry and event bus for AI Assistant integration
 * Connects CLI, AI services, and deployment infrastructure
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';

export interface ServiceDefinition {
  name: string;
  version: string;
  description: string;
  dependencies: string[];
  healthCheck: () => Promise<boolean>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export interface ServiceEvent {
  type: string;
  source: string;
  data: any;
  timestamp: number;
}

export class PayRoxServiceBus {
  private services: Map<string, any> = new Map();
  private serviceDefinitions: Map<string, ServiceDefinition> = new Map();
  private eventBus: EventEmitter = new EventEmitter();
  private logger: Logger;
  private isInitialized: boolean = false;

  constructor() {
    this.logger = new Logger('ServiceBus');
    this.setupEventHandlers();
  }

  /**
   * Initialize the service bus
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.logger.info('🚀 Initializing PayRox Service Bus...');
    
    try {
      // Start core services in dependency order
      await this.startCoreServices();
      
      this.isInitialized = true;
      this.emit('serviceBus:initialized', {});
      this.logger.success('✅ Service Bus initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Service Bus:', error);
      throw error;
    }
  }

  /**
   * Register a service with the bus
   */
  register<T>(definition: ServiceDefinition, instance: T): void {
    const { name } = definition;
    
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }

    // Validate dependencies
    for (const dep of definition.dependencies) {
      if (!this.services.has(dep)) {
        throw new Error(`Dependency '${dep}' not found for service '${name}'`);
      }
    }

    this.serviceDefinitions.set(name, definition);
    this.services.set(name, instance);
    
    this.logger.info(`📦 Registered service: ${name} v${definition.version}`);
    this.emit('service:registered', { name, version: definition.version });
  }

  /**
   * Get a service instance
   */
  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found`);
    }
    return service;
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Start a specific service
   */
  async startService(name: string): Promise<void> {
    const definition = this.serviceDefinitions.get(name);
    if (!definition) {
      throw new Error(`Service definition '${name}' not found`);
    }

    this.logger.info(`🚀 Starting service: ${name}`);
    
    try {
      await definition.start();
      this.emit('service:started', { name });
      this.logger.success(`✅ Service started: ${name}`);
    } catch (error) {
      this.logger.error(`❌ Failed to start service '${name}':`, error);
      throw error;
    }
  }

  /**
   * Stop a specific service
   */
  async stopService(name: string): Promise<void> {
    const definition = this.serviceDefinitions.get(name);
    if (!definition) {
      throw new Error(`Service definition '${name}' not found`);
    }

    this.logger.info(`🛑 Stopping service: ${name}`);
    
    try {
      await definition.stop();
      this.emit('service:stopped', { name });
      this.logger.info(`✅ Service stopped: ${name}`);
    } catch (error) {
      this.logger.error(`❌ Failed to stop service '${name}':`, error);
      throw error;
    }
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [name, definition] of this.serviceDefinitions) {
      try {
        results[name] = await definition.healthCheck();
      } catch (error) {
        this.logger.error(`Health check failed for ${name}:`, error);
        results[name] = false;
      }
    }
    
    return results;
  }

  /**
   * Emit an event on the service bus
   */
  emit(type: string, data: any, source: string = 'ServiceBus'): void {
    const event: ServiceEvent = {
      type,
      source,
      data,
      timestamp: Date.now()
    };
    
    this.eventBus.emit(type, event);
    this.eventBus.emit('*', event); // Global event handler
  }

  /**
   * Listen for events on the service bus
   */
  on(type: string, handler: (_event: ServiceEvent) => void): void {
    this.eventBus.on(type, handler);
  }

  /**
   * Listen for all events (global handler)
   */
  onAll(handler: (_event: ServiceEvent) => void): void {
    this.eventBus.on('*', handler);
  }

  /**
   * Remove event listener
   */
  off(type: string, handler: (_event: ServiceEvent) => void): void {
    this.eventBus.off(type, handler);
  }

  /**
   * Get list of registered services
   */
  getServices(): Array<{ name: string; version: string; description: string }> {
    return Array.from(this.serviceDefinitions.values()).map(def => ({
      name: def.name,
      version: def.version,
      description: def.description
    }));
  }

  /**
   * Shutdown the service bus
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down Service Bus...');
    
    // Stop all services in reverse dependency order
    const services = Array.from(this.serviceDefinitions.keys()).reverse();
    
    for (const serviceName of services) {
      try {
        await this.stopService(serviceName);
      } catch (error) {
        this.logger.error(`Error stopping service ${serviceName}:`, error);
      }
    }
    
    this.eventBus.removeAllListeners();
    this.isInitialized = false;
    
    this.logger.info('✅ Service Bus shutdown complete');
  }

  private setupEventHandlers(): void {
    // Log all events for debugging
    this.onAll((event) => {
      this.logger.debug(`Event: ${event.type} from ${event.source}`, event.data);
    });

    // Handle service health monitoring
    setInterval(async () => {
      if (this.isInitialized) {
        const health = await this.healthCheck();
        const unhealthyServices = Object.entries(health)
          .filter(([, healthy]) => !healthy)
          .map(([name]) => name);
        
        if (unhealthyServices.length > 0) {
          this.emit('services:unhealthy', { services: unhealthyServices });
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private async startCoreServices(): Promise<void> {
    // Core services will be started here
    // This is where we'll initialize AI services, deployment services, etc.
    this.logger.info('🔧 Starting core services...');
  }
}

// Global service bus instance
export const serviceBus = new PayRoxServiceBus();

/**
 * PayRox Service Bus - Core Integration Layer
 *
 * Central service registry and event bus for AI Assistant integration
 * Connects CLI, AI services, and deployment infrastructure
 */
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
export declare class PayRoxServiceBus {
    private services;
    private serviceDefinitions;
    private eventBus;
    private logger;
    private isInitialized;
    constructor();
    /**
     * Initialize the service bus
     */
    initialize(): Promise<void>;
    /**
     * Register a service with the bus
     */
    register<T>(definition: ServiceDefinition, instance: T): void;
    /**
     * Get a service instance
     */
    get<T>(name: string): T;
    /**
     * Check if a service is registered
     */
    has(name: string): boolean;
    /**
     * Start a specific service
     */
    startService(name: string): Promise<void>;
    /**
     * Stop a specific service
     */
    stopService(name: string): Promise<void>;
    /**
     * Health check for all services
     */
    healthCheck(): Promise<Record<string, boolean>>;
    /**
     * Emit an event on the service bus
     */
    emit(type: string, data: any, source?: string): void;
    /**
     * Listen for events on the service bus
     */
    on(type: string, handler: (_event: ServiceEvent) => void): void;
    /**
     * Listen for all events (global handler)
     */
    onAll(handler: (_event: ServiceEvent) => void): void;
    /**
     * Remove event listener
     */
    off(type: string, handler: (_event: ServiceEvent) => void): void;
    /**
     * Get list of registered services
     */
    getServices(): Array<{
        name: string;
        version: string;
        description: string;
    }>;
    /**
     * Shutdown the service bus
     */
    shutdown(): Promise<void>;
    private setupEventHandlers;
    private startCoreServices;
}
export declare const serviceBus: PayRoxServiceBus;

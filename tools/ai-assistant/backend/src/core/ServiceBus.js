"use strict";
/**
 * PayRox Service Bus - Core Integration Layer
 *
 * Central service registry and event bus for AI Assistant integration
 * Connects CLI, AI services, and deployment infrastructure
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceBus = exports.PayRoxServiceBus = void 0;
const events_1 = require("events");
const Logger_1 = require("../utils/Logger");
class PayRoxServiceBus {
    constructor() {
        this.services = new Map();
        this.serviceDefinitions = new Map();
        this.eventBus = new events_1.EventEmitter();
        this.isInitialized = false;
        this.logger = new Logger_1.Logger('ServiceBus');
        this.setupEventHandlers();
    }
    /**
     * Initialize the service bus
     */
    async initialize() {
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
        }
        catch (error) {
            this.logger.error('❌ Failed to initialize Service Bus:', error);
            throw error;
        }
    }
    /**
     * Register a service with the bus
     */
    register(definition, instance) {
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
    get(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service '${name}' not found`);
        }
        return service;
    }
    /**
     * Check if a service is registered
     */
    has(name) {
        return this.services.has(name);
    }
    /**
     * Start a specific service
     */
    async startService(name) {
        const definition = this.serviceDefinitions.get(name);
        if (!definition) {
            throw new Error(`Service definition '${name}' not found`);
        }
        this.logger.info(`🚀 Starting service: ${name}`);
        try {
            await definition.start();
            this.emit('service:started', { name });
            this.logger.success(`✅ Service started: ${name}`);
        }
        catch (error) {
            this.logger.error(`❌ Failed to start service '${name}':`, error);
            throw error;
        }
    }
    /**
     * Stop a specific service
     */
    async stopService(name) {
        const definition = this.serviceDefinitions.get(name);
        if (!definition) {
            throw new Error(`Service definition '${name}' not found`);
        }
        this.logger.info(`🛑 Stopping service: ${name}`);
        try {
            await definition.stop();
            this.emit('service:stopped', { name });
            this.logger.info(`✅ Service stopped: ${name}`);
        }
        catch (error) {
            this.logger.error(`❌ Failed to stop service '${name}':`, error);
            throw error;
        }
    }
    /**
     * Health check for all services
     */
    async healthCheck() {
        const results = {};
        for (const [name, definition] of this.serviceDefinitions) {
            try {
                results[name] = await definition.healthCheck();
            }
            catch (error) {
                this.logger.error(`Health check failed for ${name}:`, error);
                results[name] = false;
            }
        }
        return results;
    }
    /**
     * Emit an event on the service bus
     */
    emit(type, data, source = 'ServiceBus') {
        const event = {
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
    on(type, handler) {
        this.eventBus.on(type, handler);
    }
    /**
     * Listen for all events (global handler)
     */
    onAll(handler) {
        this.eventBus.on('*', handler);
    }
    /**
     * Remove event listener
     */
    off(type, handler) {
        this.eventBus.off(type, handler);
    }
    /**
     * Get list of registered services
     */
    getServices() {
        return Array.from(this.serviceDefinitions.values()).map(def => ({
            name: def.name,
            version: def.version,
            description: def.description
        }));
    }
    /**
     * Shutdown the service bus
     */
    async shutdown() {
        this.logger.info('🛑 Shutting down Service Bus...');
        // Stop all services in reverse dependency order
        const services = Array.from(this.serviceDefinitions.keys()).reverse();
        for (const serviceName of services) {
            try {
                await this.stopService(serviceName);
            }
            catch (error) {
                this.logger.error(`Error stopping service ${serviceName}:`, error);
            }
        }
        this.eventBus.removeAllListeners();
        this.isInitialized = false;
        this.logger.info('✅ Service Bus shutdown complete');
    }
    setupEventHandlers() {
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
    async startCoreServices() {
        this.logger.info('🔧 Starting core AI services...');
        // Register and start AI Refactor Wizard (Intelligence: 9.2/10)
        const { AIRefactorWizard } = await Promise.resolve().then(() => __importStar(require('../analyzers/AIRefactorWizard')));
        const refactorWizard = new AIRefactorWizard();
        this.register({
            name: 'AIRefactorWizard',
            version: '2.0.0',
            description: 'AI-powered intelligent contract splitting (killer feature)',
            dependencies: [],
            healthCheck: () => Promise.resolve(true),
            start: () => Promise.resolve(),
            stop: () => Promise.resolve()
        }, refactorWizard);
        // Register PayRox Contract Backend Integration
        const { payRoxBackend } = await Promise.resolve().then(() => __importStar(require('../services/PayRoxContractBackend')));
        this.register({
            name: 'PayRoxBackend',
            version: '1.0.0',
            description: 'Production contract integration and health monitoring',
            dependencies: [],
            healthCheck: () => payRoxBackend.healthCheck().then(r => r.status === 'healthy'),
            start: () => Promise.resolve(),
            stop: () => Promise.resolve()
        }, payRoxBackend);
        this.logger.success('✅ All core AI services registered and ready');
    }
}
exports.PayRoxServiceBus = PayRoxServiceBus;
// Global service bus instance
exports.serviceBus = new PayRoxServiceBus();

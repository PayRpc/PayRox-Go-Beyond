/**
 * Logger utility for PayRox Go Beyond
 * Provides structured logging with different levels and formatting
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SUCCESS = 4
}
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    component: string;
    message: string;
    data?: any;
}
export declare class Logger {
    private component;
    private logLevel;
    constructor(component: string, logLevel?: LogLevel);
    /**
     * Debug level logging
     */
    debug(message: string, data?: any): void;
    /**
     * Info level logging
     */
    info(message: string, data?: any): void;
    /**
     * Warning level logging
     */
    warn(message: string, data?: any): void;
    /**
     * Error level logging
     */
    error(message: string, data?: any): void;
    /**
     * Success level logging
     */
    success(message: string, data?: any): void;
    /**
     * Core logging method
     */
    private log;
    /**
     * Format log message for console output
     */
    private formatMessage;
    /**
     * Get icon for log level
     */
    private getLevelIcon;
    /**
     * Set log level
     */
    setLogLevel(level: LogLevel): void;
    /**
     * Get current log level
     */
    getLogLevel(): LogLevel;
}

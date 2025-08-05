"use strict";
/**
 * Logger utility for PayRox Go Beyond
 * Provides structured logging with different levels and formatting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["SUCCESS"] = 4] = "SUCCESS";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor(component, logLevel = LogLevel.INFO) {
        this.component = component;
        this.logLevel = logLevel;
    }
    /**
     * Debug level logging
     */
    debug(message, data) {
        this.log(LogLevel.DEBUG, message, data);
    }
    /**
     * Info level logging
     */
    info(message, data) {
        this.log(LogLevel.INFO, message, data);
    }
    /**
     * Warning level logging
     */
    warn(message, data) {
        this.log(LogLevel.WARN, message, data);
    }
    /**
     * Error level logging
     */
    error(message, data) {
        this.log(LogLevel.ERROR, message, data);
    }
    /**
     * Success level logging
     */
    success(message, data) {
        this.log(LogLevel.SUCCESS, message, data);
    }
    /**
     * Core logging method
     */
    log(level, message, data) {
        if (level < this.logLevel) {
            return;
        }
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            component: this.component,
            message,
            data
        };
        const formattedMessage = this.formatMessage(logEntry);
        switch (level) {
            case LogLevel.DEBUG:
                console.debug(formattedMessage);
                break;
            case LogLevel.INFO:
                console.info(formattedMessage);
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage);
                break;
            case LogLevel.ERROR:
                console.error(formattedMessage);
                break;
            case LogLevel.SUCCESS:
                console.log(formattedMessage);
                break;
        }
    }
    /**
     * Format log message for console output
     */
    formatMessage(entry) {
        const levelIcon = this.getLevelIcon(entry.level);
        const timestamp = entry.timestamp.substring(11, 19); // HH:MM:SS
        let formatted = `${levelIcon} [${timestamp}] ${entry.component}: ${entry.message}`;
        if (entry.data) {
            formatted += `\n${JSON.stringify(entry.data, null, 2)}`;
        }
        return formatted;
    }
    /**
     * Get icon for log level
     */
    getLevelIcon(level) {
        switch (level) {
            case LogLevel.DEBUG:
                return '🔍';
            case LogLevel.INFO:
                return 'ℹ️';
            case LogLevel.WARN:
                return '⚠️';
            case LogLevel.ERROR:
                return '❌';
            case LogLevel.SUCCESS:
                return '✅';
            default:
                return '📝';
        }
    }
    /**
     * Set log level
     */
    setLogLevel(level) {
        this.logLevel = level;
    }
    /**
     * Get current log level
     */
    getLogLevel() {
        return this.logLevel;
    }
}
exports.Logger = Logger;

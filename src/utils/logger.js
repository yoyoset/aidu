import { StorageHelper, StorageKeys } from './storage.js';

/**
 * Logger - 统一日志记录系统
 */
class Logger {
    constructor() {
        this.enabled = false;
        this.maxLogs = 1000; // Increased for better debugging
        this.queue = Promise.resolve();
        this.initPromise = this.loadSettings();
    }

    async loadSettings() {
        try {
            const settings = await StorageHelper.get(StorageKeys.LOGGER_SETTINGS);
            this.enabled = settings?.enabled || false;
            return this.enabled;
        } catch (e) {
            console.error('Logger: Failed to load settings', e);
            return false;
        }
    }

    /**
     * @param {string} level - 'info'|'warn'|'error'|'debug'|'critical'
     * @param {string} message 
     * @param {any} detail 
     * @param {boolean} force - If true, log even if disabled
     */
    async log(level, message, detail = null, force = false) {
        // Safety: If chrome.runtime is not available (e.g. extension reloaded/SW dead)
        if (!chrome.runtime || !chrome.runtime.sendMessage) {
            console.warn(`Logger: SW unavailable, dropping ${level} log: ${message}`);
            return;
        }

        // Force errors and criticals to always log
        const shouldLog = force || this.enabled || level === 'error' || level === 'critical';
        if (!shouldLog) return;

        // Security: Mask sensitive info (API Keys etc)
        const mask = (str) => {
            if (typeof str !== 'string') return str;
            return str.replace(/(sk-[a-zA-Z0-9]{15,})|([a-zA-Z0-9]{25,}\.[a-zA-Z0-9]{6,}\.[a-zA-Z0-9-_]{6,})/g, '***MASKED***');
        };

        const safeMessage = mask(message);
        let safeDetail = detail;
        if (detail) {
            try {
                const str = typeof detail === 'object' ? JSON.stringify(detail) : String(detail);
                safeDetail = mask(str);
            } catch (e) {
                safeDetail = '[Circular/Error]';
            }
        }

        // Serialized queue to prevent write races
        this.queue = this.queue.then(async () => {
            const logEntry = {
                id: Date.now() + Math.random().toString(36).substr(2, 5),
                timestamp: new Date().toISOString(),
                level,
                message: safeMessage,
                detail: safeDetail
            };

            try {
                const logs = await StorageHelper.get(StorageKeys.LOGS) || [];
                logs.unshift(logEntry);
                if (logs.length > this.maxLogs) logs.length = this.maxLogs;
                await StorageHelper.set(StorageKeys.LOGS, logs);
            } catch (e) {
                console.error('Failed to save log', e);
            }
        });

        return this.queue;
    }

    info(msg, detail, force = false) { this.log('info', msg, detail, force); }
    warn(msg, detail, force = false) { this.log('warn', msg, detail, force); }
    error(msg, detail, force = true) { this.log('error', msg, detail, force); }
    debug(msg, detail, force = false) { this.log('debug', msg, detail, force); }
    critical(msg, detail, force = true) { this.log('critical', msg, detail, force); }

    async setEnabled(enabled) {
        this.enabled = enabled;
        await StorageHelper.set(StorageKeys.LOGGER_SETTINGS, { enabled });
    }

    async clear() {
        await StorageHelper.remove(StorageKeys.LOGS);
    }

    async getAll() {
        return await StorageHelper.get(StorageKeys.LOGS) || [];
    }
}

export const logger = new Logger();

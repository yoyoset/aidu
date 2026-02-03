import { StorageHelper, StorageKeys } from './storage.js';

/**
 * Logger - 统一日志记录系统
 */
class Logger {
    constructor() {
        this.enabled = false;
        this.maxLogs = 500; // 调优：减少日志常驻内存压力
        this.initPromise = this.loadSettings();
        this.queue = Promise.resolve(); // 串行队列
    }

    async loadSettings() {
        const settings = await StorageHelper.get(StorageKeys.LOGGER_SETTINGS) || { enabled: false };
        this.enabled = settings.enabled;
    }

    async log(level, message, detail = null) {
        // 快速退出
        if (!this.enabled && level !== 'error') return;

        // Security: Mask sensitive info (API Keys etc)
        const mask = (str) => {
            if (typeof str !== 'string') return str;
            return str.replace(/(sk-[a-zA-Z0-9]{20,})|([a-zA-Z0-9]{30,}\.[a-zA-Z0-9]{6,}\.[a-zA-Z0-9-_]{6,})/g, '***MASKED***');
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

        // 将任务推入队列，确保写入顺序
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

                if (logs.length > this.maxLogs) {
                    logs.length = this.maxLogs;
                }

                await StorageHelper.set(StorageKeys.LOGS, logs);
            } catch (e) {
                console.error('Failed to save log', e);
            }
        });

        return this.queue;
    }

    info(msg, detail) { this.log('info', msg, detail); }
    warn(msg, detail) { this.log('warn', msg, detail); }
    error(msg, detail) { this.log('error', msg, detail); }
    debug(msg, detail) { this.log('debug', msg, detail); }

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

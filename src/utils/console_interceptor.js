import { StorageHelper, StorageKeys } from './storage.js';

/**
 * ConsoleInterceptor - 全局控制台拦截器
 * 自动捕获所有 console.error/warn/log 调用并持久化到日志系统
 */
class ConsoleInterceptor {
    constructor() {
        this.enabled = true;
        this.maxLogs = 1000;
        this.queue = Promise.resolve();
        this.originalConsole = {
            log: console.log.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console)
        };
    }

    /**
     * 启用拦截器 - 重写 console 方法
     */
    enable() {
        const self = this;

        console.log = (...args) => {
            self.originalConsole.log(...args);
            // 只记录带标签的重要日志 (如 [SW], [API] 等)
            const msg = args[0];
            if (typeof msg === 'string' && msg.startsWith('[')) {
                self.capture('info', args);
            }
        };

        console.warn = (...args) => {
            self.originalConsole.warn(...args);
            self.capture('warn', args);
        };

        console.error = (...args) => {
            self.originalConsole.error(...args);
            self.capture('error', args);
        };

        // 捕获未处理的 Promise 拒绝
        if (typeof window !== 'undefined') {
            window.addEventListener('unhandledrejection', (event) => {
                self.capture('critical', ['Unhandled Promise:', event.reason]);
            });
            window.addEventListener('error', (event) => {
                self.capture('critical', ['Uncaught Error:', event.message, event.filename, event.lineno]);
            });
        }

        this.enabled = true;
    }

    /**
     * 禁用拦截器 - 恢复原始 console 方法
     */
    disable() {
        console.log = this.originalConsole.log;
        console.warn = this.originalConsole.warn;
        console.error = this.originalConsole.error;
        this.enabled = false;
    }

    /**
     * 捕获并持久化日志
     */
    capture(level, args) {
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 0).substring(0, 500);
                } catch {
                    return '[Circular]';
                }
            }
            return String(arg);
        }).join(' ');

        // 敏感信息脱敏
        const safeMessage = this.mask(message);

        this.queue = this.queue.then(async () => {
            try {
                const logs = await StorageHelper.get(StorageKeys.LOGS) || [];
                logs.unshift({
                    id: Date.now() + Math.random().toString(36).substr(2, 5),
                    timestamp: new Date().toISOString(),
                    level,
                    message: safeMessage.substring(0, 1000) // 限制单条长度
                });
                if (logs.length > this.maxLogs) logs.length = this.maxLogs;
                await StorageHelper.set(StorageKeys.LOGS, logs);
            } catch (e) {
                this.originalConsole.error('ConsoleInterceptor: Failed to save log', e);
            }
        });
    }

    mask(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/(sk-[a-zA-Z0-9]{15,})|([a-zA-Z0-9]{25,}\.[a-zA-Z0-9]{6,}\.[a-zA-Z0-9-_]{6,})/g, '***MASKED***');
    }
}

export const consoleInterceptor = new ConsoleInterceptor();

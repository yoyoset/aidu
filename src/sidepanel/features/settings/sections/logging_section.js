import { t } from '../../../../locales/index.js';
import styles from '../settings_shared.module.css';
import { logger } from '../../../../utils/logger.js';
import { notificationService } from '../../../../utils/notification_service.js';

export class LoggingSection {
    constructor(parent) {
        this.parent = parent;
    }

    render() {
        return `
            <!-- Logging Section -->
            <div class="${styles.formSection}">
                <label class="${styles.sectionTitle}">调试与日志</label>
                <div class="${styles.formGroup}" style="display:flex; align-items:center; justify-content:space-between;">
                    <label class="${styles.label}" for="log-enabled">开启日志记录</label>
                    <input type="checkbox" id="log-enabled" ${logger.enabled ? 'checked' : ''} style="width:20px; height:20px;">
                </div>
                <div class="${styles.formGroup}" style="display:flex; align-items:center; justify-content:space-between; margin-top:8px;">
                    <label class="${styles.label}" for="debug-mode">开启开发调试模式 (阅读器显式源码)</label>
                    <input type="checkbox" id="debug-mode" ${this.parent.settings.debugMode ? 'checked' : ''} style="width:20px; height:20px;">
                </div>
                <div style="display:flex; gap:10px; margin-top:8px;">
                    <button id="view-logs-btn" class="${styles.btnSecondary}" style="flex:1;">
                        查看日志
                    </button>
                    <button id="clear-logs-btn" class="${styles.btnSecondary}" style="flex:1; color:#ef4444;">
                        清理日志
                    </button>
                </div>
            </div>
        `;
    }

    bind(content) {
        const logEnabled = content.querySelector('#log-enabled');
        const viewLogsBtn = content.querySelector('#view-logs-btn');
        const clearLogsBtn = content.querySelector('#clear-logs-btn');

        logEnabled.onchange = (e) => {
            logger.setEnabled(e.target.checked);
            notificationService.toast(`日志已${e.target.checked ? '开启' : '关闭'}`);
        };

        const debugMode = content.querySelector('#debug-mode');
        debugMode.onchange = (e) => {
            this.parent.settings.debugMode = e.target.checked;
            notificationService.toast(`调试模式已${e.target.checked ? '开启' : '关闭'}`);
        };

        viewLogsBtn.onclick = async () => {
            const logs = await logger.getAll();
            if (logs.length === 0) {
                notificationService.toast('暂无日志记录');
                return;
            }
            const logStr = logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
            const blob = new Blob([logStr], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            window.open(url);
        };

        clearLogsBtn.onclick = async () => {
            const ok = await notificationService.confirm(
                t('settings.logger.clearConfirm'),
                t('settings.logger.clearTitle')
            );
            if (ok) {
                await logger.clear();
                notificationService.toast('日志已清空');
            }
        };
    }

    collectData(content) {
        return {
            debugMode: content.querySelector('#debug-mode').checked
        };
    }
}

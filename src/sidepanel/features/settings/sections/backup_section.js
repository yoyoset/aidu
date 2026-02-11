import { t } from '../../../../locales/index.js';
import styles from '../settings.module.css';
import { DataService } from '../../../../services/data_service.js';
import { notificationService } from '../../../../utils/notification_service.js';

export class BackupSection {
    constructor(parent) {
        this.parent = parent;
    }

    render() {
        return `
            <!-- Backup & Restore Section -->
            <div class="${styles.formSection}">
                <label class="${styles.sectionTitle}">${t('settings.backup')}</label>
                <div style="display:flex; gap:10px; margin-top:8px;">
                    <button id="backup-btn" class="${styles.btnSecondary}" style="flex:1;">
                        ${t('settings.backup.export')}
                    </button>
                    <button id="restore-btn" class="${styles.btnSecondary}" style="flex:1;">
                        ${t('settings.backup.import')}
                    </button>
                    <input type="file" id="restore-file-input" style="display:none;" accept=".json">
                </div>
                <p style="font-size:0.8em; color:#666; margin-top:6px;">
                    ${t('settings.backup.hint')}
                </p>
            </div>
        `;
    }

    bind(content) {
        const backupBtn = content.querySelector('#backup-btn');
        const restoreBtn = content.querySelector('#restore-btn');
        const restoreInput = content.querySelector('#restore-file-input');

        if (backupBtn) {
            backupBtn.onclick = async () => {
                backupBtn.innerHTML = t('settings.backup.exporting');
                try {
                    const data = await DataService.exportAll();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `aidu_backup_${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    backupBtn.innerHTML = t('settings.backup.done');
                    setTimeout(() => backupBtn.innerHTML = t('settings.backup.export'), 2000);
                } catch (e) {
                    console.error(e);
                    backupBtn.innerHTML = t('settings.sync.error');
                    notificationService.alert(t('settings.backup.exportFailed'));
                }
            };
        }

        if (restoreBtn && restoreInput) {
            restoreBtn.onclick = () => restoreInput.click();
            restoreInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = async (ev) => {
                    try {
                        const json = JSON.parse(ev.target.result);
                        const ok = await notificationService.confirm(t('settings.backup.restoreConfirm', { filename: file.name }));
                        if (ok) {
                            restoreBtn.innerHTML = t('settings.backup.restoring');
                            await DataService.importAll(json);
                            notificationService.alert(t('settings.backup.restoreSuccess'));
                            window.location.reload();
                        }
                    } catch (err) {
                        console.error(err);
                        notificationService.alert(t('settings.backup.restoreFailed'));
                    } finally {
                        restoreInput.value = '';
                        restoreBtn.innerHTML = t('settings.backup.import');
                    }
                };
                reader.readAsText(file);
            };
        }
    }

    collectData(content) {
        return {};
    }
}

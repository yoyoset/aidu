import { t } from '../../../../locales/index.js';
import styles from '../settings.module.css';
import { SyncService } from '../../../../services/sync_service.js';

export class SyncSection {
    constructor(parent) {
        this.parent = parent;
    }

    render() {
        const { settings } = this.parent;
        return `
            <div class="${styles.formSection}">
                <label class="${styles.sectionTitle}">${t('settings.sync')}</label>
                <div id="sync-custom-settings">
                    <div class="${styles.formGroup}">
                        <label class="${styles.label}">${t('settings.sync.workerUrl')}</label>
                        <input type="text" id="custom-url" class="${styles.input}" 
                            placeholder="${t('settings.sync.workerUrl.placeholder')}" value="${settings.sync?.customUrl || ''}">
                    </div>
                    <div class="${styles.formGroup}">
                        <label class="${styles.label}">${t('settings.sync.token')}</label>
                        <input type="password" id="custom-token" class="${styles.input}" 
                            placeholder="${t('settings.sync.token.placeholder')}" value="${settings.sync?.customToken || ''}">
                    </div>
                    <button id="export-mobile-link" class="${styles.btnSecondary}" style="width:100%; margin: 8px 0; font-size:0.9em;">
                        ${t('settings.sync.magicLink')}
                    </button>
                </div>

                <div style="display:flex; gap:10px; margin-top:8px;">
                    <button id="sync-setup-btn" class="${styles.btnSecondary}" style="flex:1;">
                        ${t('settings.sync.connect')}
                    </button>
                    <button id="sync-now-btn" class="${styles.btnPrimary}" style="flex:1;">
                        ${t('settings.sync.now')}
                    </button>
                </div>
            </div>
        `;
    }

    bind(content) {
        const syncSetupBtn = content.querySelector('#sync-setup-btn');
        const syncNowBtn = content.querySelector('#sync-now-btn');
        const exportMobileBtn = content.querySelector('#export-mobile-link');

        const getSyncConfig = () => ({
            provider: 'custom',
            customUrl: content.querySelector('#custom-url').value.trim(),
            customToken: content.querySelector('#custom-token').value.trim()
        });

        const showToast = (msg, type) => this.parent.showToast(msg, type);

        if (syncSetupBtn) {
            syncSetupBtn.onclick = async () => {
                const config = getSyncConfig();
                if (!config.customUrl || !config.customToken) {
                    return showToast(t('settings.sync.urlTokenRequired'), 'error');
                }
                syncSetupBtn.innerHTML = t('settings.sync.connecting');
                try {
                    await SyncService.saveConfig(config);
                    await SyncService.pull();
                    showToast(t('settings.sync.verified'), 'success');
                    syncSetupBtn.innerHTML = t('settings.sync.connected');
                } catch (e) {
                    showToast(t('settings.sync.failed', { error: e.message }), 'error');
                    syncSetupBtn.innerHTML = t('settings.sync.connect');
                }
            };
        }

        if (syncNowBtn) {
            syncNowBtn.onclick = async () => {
                const config = getSyncConfig();
                if (!config.customUrl || !config.customToken) {
                    return showToast(t('settings.sync.configFirst'), 'error');
                }
                syncNowBtn.innerHTML = t('settings.sync.syncing');
                try {
                    await SyncService.saveConfig(config);
                    await SyncService.pull();
                    await SyncService.push();
                    showToast(t('settings.sync.completed'), 'success');
                    syncNowBtn.innerHTML = t('settings.sync.synced');
                    setTimeout(() => syncNowBtn.innerHTML = t('settings.sync.now'), 2000);
                } catch (e) {
                    showToast(t('settings.sync.failed', { error: e.message }), 'error');
                    syncNowBtn.innerHTML = t('settings.sync.error');
                }
            };
        }

        if (exportMobileBtn) {
            exportMobileBtn.onclick = () => {
                const url = content.querySelector('#custom-url').value.trim();
                const token = content.querySelector('#custom-token').value.trim();
                const profile = this.parent.settings.activeProfileId || 'default';
                if (!url || !token) {
                    return showToast(t('settings.sync.urlTokenRequired'), 'error');
                }
                try {
                    const payload = JSON.stringify({ u: url, t: token, p: profile });
                    const b64 = btoa(payload);
                    const link = `https://aidu-mobile.pages.dev/?conf=${b64}`;
                    navigator.clipboard.writeText(link).then(() => {
                        showToast(t('settings.sync.linkCopied'), 'success');
                    }).catch(() => showToast(t('settings.sync.copyFailed'), 'error'));
                } catch (e) {
                    showToast('Encoding Error', 'error');
                }
            };
        }
    }

    collectData(content) {
        return {
            sync: {
                customUrl: content.querySelector('#custom-url').value.trim(),
                customToken: content.querySelector('#custom-token').value.trim(),
                provider: 'custom'
            }
        };
    }
}

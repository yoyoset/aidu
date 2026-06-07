import { t } from '../../../../locales/index.js';
import styles from '../settings_shared.module.css';
import { dictionaryService } from '../../../../services/dictionary_service.js';
import { notificationService } from '../../../../utils/notification_service.js';
import { ExpertPromptsModal } from '../expert_prompts_modal.js';

export class MaintenanceSection {
    constructor(parent) {
        this.parent = parent;
        this.stats = { count: 0, size: '0 KB' };
    }

    async loadStats() {
        this.stats = await dictionaryService.getCacheStats();
    }

    render() {
        return `
            <!-- Maintenance Section -->
            <div class="${styles.formSection}">
                <label class="${styles.sectionTitle}">${t('settings.maintenance.title')}</label>
                
                <div class="${styles.formGroup}">
                    <label class="${styles.label}">${t('settings.maintenance.dictCache')}</label>
                    <div style="display:flex; align-items:center; justify-content:space-between; background:var(--md-sys-color-surface-container-low); padding:12px; border-radius:8px; border:1px solid var(--md-sys-color-outline-variant);">
                        <div>
                            <div style="font-weight:600; font-size:0.9rem;" id="cache-count">${t('settings.maintenance.words', { count: this.stats.count })}</div>
                            <div style="font-size:0.75rem; color:var(--md-sys-color-on-surface-variant);" id="cache-size">${this.stats.size}</div>
                        </div>
                        <button id="clear-cache-btn" class="${styles.btnSecondary}" style="color:var(--md-sys-color-error); border-color:var(--md-sys-color-error); font-size:0.8rem; padding:6px 12px; min-width:auto;">
                            ${t('settings.maintenance.clear')}
                        </button>
                    </div>
                    <p style="font-size:0.75rem; color:var(--md-sys-color-on-surface-variant); margin-top:8px;">
                        ${t('settings.maintenance.hint')}
                    </p>
                </div>

                <div class="${styles.formGroup}" style="margin-top:20px; border-top:1px dashed var(--md-sys-color-outline-variant); padding-top:20px;">
                    <label class="${styles.label}">${t('settings.maintenance.expert') || '提示词实验室'}</label>
                    <div style="display:flex; align-items:center; justify-content:space-between; background:var(--md-sys-color-surface-container-low); padding:12px; border-radius:8px; border:1px solid var(--md-sys-color-outline-variant);">
                        <div style="flex:1; margin-right:12px;">
                            <div style="font-weight:600; font-size:0.9rem;">${t('settings.maintenance.expert') || 'Prompt Laboratory'}</div>
                            <div style="font-size:0.75rem; color:var(--md-sys-color-on-surface-variant); line-height:1.3; margin-top:4px;">
                                ${t('settings.maintenance.expert.desc') || '微调 AI 释义、例句与深度分析 Prompt，适配不同模型，或诊断对齐数据'}
                            </div>
                        </div>
                        <button id="open-expert-btn" class="${styles.btnPrimary}" style="font-size:0.8rem; padding:6px 12px; min-width:auto; white-space:nowrap; background:var(--md-sys-color-primary); color:var(--md-sys-color-on-primary);">
                            <i class="ri-flask-line" style="margin-right:4px;"></i>${t('settings.maintenance.expert.btn') || '进入实验室'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    async bind(content) {
        const clearBtn = content.querySelector('#clear-cache-btn');
        const countEl = content.querySelector('#cache-count');
        const sizeEl = content.querySelector('#cache-size');
        const openExpertBtn = content.querySelector('#open-expert-btn');

        // 1. Synchronously bind event handlers immediately so they are responsive
        if (openExpertBtn) {
            openExpertBtn.onclick = async () => {
                try {
                    // Update profileManager with unsaved UI inputs first!
                    if (this.parent && typeof this.parent.updateSettingsFromDOM === 'function') {
                        await this.parent.updateSettingsFromDOM();
                    }

                    const modal = new ExpertPromptsModal();
                    modal.open().catch(err => {
                        console.error('[MaintenanceSection] Failed to open ExpertPromptsModal:', err);
                        notificationService.alert('无法打开提示词实验室，请重试或重置配置。');
                    });
                } catch (err) {
                    console.error('[MaintenanceSection] Exception instantiating ExpertPromptsModal:', err);
                    notificationService.alert('启动提示词实验室失败：' + err.message);
                }
            };
        }

        if (clearBtn) {
            clearBtn.onclick = async () => {
                try {
                    const ok = await notificationService.confirm(
                        t('settings.maintenance.clearConfirm'),
                        t('settings.maintenance.clearTitle')
                    );
                    
                    if (ok) {
                        await dictionaryService.clearCache();
                        await this.loadStats().catch(err => console.error(err));
                        if (countEl) countEl.textContent = t('settings.maintenance.words', { count: 0 });
                        if (sizeEl) sizeEl.textContent = '0 KB';
                        notificationService.toast(t('settings.maintenance.cleared'));
                    }
                } catch (err) {
                    console.error('[MaintenanceSection] Error clearing cache:', err);
                }
            };
        }

        // 2. Load stats asynchronously to avoid blocking UI thread
        try {
            await this.loadStats();
            if (countEl) countEl.textContent = t('settings.maintenance.words', { count: this.stats.count });
            if (sizeEl) sizeEl.textContent = this.stats.size;
        } catch (err) {
            console.error('[MaintenanceSection] Failed to load cache stats:', err);
            if (countEl) countEl.textContent = t('settings.maintenance.words', { count: 0 });
            if (sizeEl) sizeEl.textContent = '0 KB';
        }
    }

    collectData() {
        return {}; // No settings to save here
    }
}

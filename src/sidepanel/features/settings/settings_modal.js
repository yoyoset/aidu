import { Component } from '../../components/component.js';
import { StorageHelper, StorageKeys } from '../../../utils/storage.js';
import { DataService } from '../../../services/data_service.js';
import { SyncService } from '../../../services/sync_service.js';
import { vocabService } from '../../../services/vocab_service.js';
import { PERSONA_OPTIONS } from '../../../background/llm/persona.js';
import styles from './settings.module.css';
import { t, getCurrentLocale, getSupportedLocales, setLocale } from '../../../locales/index.js';
import { logger } from '../../../utils/logger.js';
import { notificationService } from '../../../utils/notification_service.js';

export class SettingsModal extends Component {
    constructor(element) {
        super(element);
        this.settings = null;
        this.activeProfile = null;
    }

    async show() {
        // Load existing settings
        const rawSettings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};

        // Initialize Default Schema if completely empty
        if (!rawSettings.profiles) {
            this.settings = {
                activeProfileId: 'default',
                profiles: {
                    'default': {
                        name: 'General Profile',
                        provider: 'glm-free',
                        baseUrl: '',
                        model: 'glm-4-flash',
                        apiKey: '',
                        realtimeMode: '2',
                        builderMode: '3'
                    }
                }
            };
        } else {
            this.settings = rawSettings;
        }

        this.activeProfile = this.settings.profiles[this.settings.activeProfileId];

        // Migration: Ensure providerConfig exists
        if (!this.activeProfile.providerConfig) {
            this.activeProfile.providerConfig = {};
            // Migrate existing flat config to current provider
            if (this.activeProfile.apiKey) {
                this.activeProfile.providerConfig[this.activeProfile.provider] = {
                    apiKey: this.activeProfile.apiKey,
                    model: this.activeProfile.model,
                    baseUrl: this.activeProfile.baseUrl
                };
            }
        }

        this.render();
    }

    render() {
        if (this.overlay) this.overlay.remove();

        const overlay = document.createElement('div');
        overlay.className = styles.modalOverlay;

        overlay.onclick = (e) => {
            if (e.target === overlay) this.close();
        };

        const content = document.createElement('div');
        content.className = styles.modalContent;

        content.innerHTML = `
            <div class="${styles.modalHeader}">
                <div class="${styles.headerLeft}">
                    <h3 class="${styles.modalTitle}">${t('settings.title')}</h3>
                    <div class="${styles.profileSelectWrapper}">
                        <select id="profile-select" class="${styles.profileSelect}">
                            ${this.renderProfileOptions()}
                            <option value="__create_new__">${t('settings.createProfile')}</option>
                        </select>
                    </div>
                </div>
                <button class="${styles.closeBtn}">&times;</button>
            </div>
            
            <div class="${styles.scrollArea}">
                <!-- Profile Meta -->
                <div class="${styles.formSection}">
                    <label class="${styles.sectionTitle}">${t('settings.general')}</label>
                    <div class="${styles.formGroup}">
                        <label class="${styles.label}" for="profile-name">${t('settings.displayName')}</label>
                        <input type="text" id="profile-name" class="${styles.input}" 
                            value="${this.activeProfile.name || t('settings.newProfile')}" placeholder="${t('settings.displayName.placeholder')}">
                    </div>
                </div>

                <!-- Provider Section -->
                <div class="${styles.formSection}">
                   <label class="${styles.sectionTitle}">${t('settings.provider')}</label>
                    <div class="${styles.formGroup}">
                        <label class="${styles.label}" for="provider-select">${t('settings.provider.label')}</label>
                        <select id="provider-select" class="${styles.select}">
                            <option value="glm-free" ${this.activeProfile.provider === 'glm-free' ? 'selected' : ''}>🆓 智谱AI (GLM-4-Flash 免费)</option>
                            <option value="deepseek" ${this.activeProfile.provider === 'deepseek' ? 'selected' : ''}>DeepSeek</option>
                            <option value="gemini" ${this.activeProfile.provider === 'gemini' ? 'selected' : ''}>Google Gemini</option>
                            <option value="glm" ${this.activeProfile.provider === 'glm' ? 'selected' : ''}>Zhipu AI (GLM)</option>
                            <option value="openai" ${this.activeProfile.provider === 'openai' ? 'selected' : ''}>OpenAI Compatible</option>
                            <option value="custom" ${this.activeProfile.provider === 'custom' ? 'selected' : ''}>Custom Endpoint</option>
                        </select>
                    </div>


                    <div class="${styles.formGroup}" id="base-url-group">
                        <label class="${styles.label}" for="base-url-input">${t('settings.baseUrl')}</label>
                        <input type="text" id="base-url-input" class="${styles.input}" 
                            value="${this.activeProfile.baseUrl || ''}" placeholder="${t('settings.baseUrl.placeholder')}">
                    </div>

                    <div class="${styles.formGroup}" id="model-group">
                        <label class="${styles.label}" for="model-input">${t('settings.model')}</label>
                        <input type="text" id="model-input" class="${styles.input}" 
                            value="${this.activeProfile.model}" placeholder="${t('settings.model.placeholder')}">
                    </div>

                    <div class="${styles.formGroup}" id="api-key-group">
                        <label class="${styles.label}" for="api-key-input">${t('settings.apiKey')}</label>
                        <input type="password" id="api-key-input" class="${styles.input}" 
                            value="${this.activeProfile.apiKey}" placeholder="${t('settings.apiKey.placeholder')}">
                    </div>
                </div>

                <!-- Analysis Mode Section -->
                <div class="${styles.formSection}">
                    <label class="${styles.sectionTitle}">${t('settings.analysis')}</label>
                    
                    <div class="${styles.modeContainer}">
                        <div class="${styles.modeColumn}">
                            <label class="${styles.label}">${t('settings.realtime')}</label>
                            <div class="${styles.radioGroup}">
                                ${this.renderRadioOption('realtimeMode', '1', t('settings.mode.translation'), t('settings.mode.translation.sub'), this.activeProfile.realtimeMode)}
                                ${this.renderRadioOption('realtimeMode', '2', t('settings.mode.standard'), t('settings.mode.standard.sub'), this.activeProfile.realtimeMode)}
                                ${this.renderRadioOption('realtimeMode', '3', t('settings.mode.deep'), t('settings.mode.deep.sub'), this.activeProfile.realtimeMode)}
                            </div>
                        </div>
                        
                        <div class="${styles.modeColumn}">
                            <label class="${styles.label}">${t('settings.builder')}</label>
                            <div class="${styles.radioGroup}">
                                ${this.renderRadioOption('builderMode', '2', t('settings.mode.standard'), t('settings.mode.core'), this.activeProfile.builderMode)}
                                ${this.renderRadioOption('builderMode', '3', t('settings.mode.deep'), t('settings.mode.detailed'), this.activeProfile.builderMode)}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Teaching Persona Section -->
                <div class="${styles.formSection}">
                    <label class="${styles.sectionTitle}">${t('settings.persona')}</label>
                    <div class="${styles.formGroup}">
                        <label class="${styles.label}" for="teaching-style">${t('settings.persona.label')}</label>
                        <select id="teaching-style" class="${styles.select}">
                            ${PERSONA_OPTIONS.map(p => `<option value="${p.id}">${p.label}</option>`).join('')}
                        </select>
                        <p id="style-desc" style="font-size:0.85em; color:#666; margin-top:4px; font-style:italic;"></p>
                    </div>
                </div>

                <!-- Interface Language Section -->
                <div class="${styles.formSection}">
                    <label class="${styles.sectionTitle}">${t('settings.language')}</label>
                    <div class="${styles.formGroup}">
                        <label class="${styles.label}">${t('settings.language.label')}</label>
                        <select id="language-select" class="${styles.select}">
                            ${getSupportedLocales().map(l =>
            `<option value="${l.code}" ${getCurrentLocale() === l.code ? 'selected' : ''}>${l.name}</option>`
        ).join('')}
                        </select>
                    </div>
                </div>

                <div class="${styles.formSection}">
                    <label class="${styles.sectionTitle}">${t('settings.sync')}</label>
                    
                    <!-- Only Custom Worker Supported -->
                    <div id="sync-custom-settings">
                        <div class="${styles.formGroup}">
                            <label class="${styles.label}">${t('settings.sync.workerUrl')}</label>
                            <input type="text" id="custom-url" class="${styles.input}" 
                                placeholder="${t('settings.sync.workerUrl.placeholder')}" value="${this.settings.sync?.customUrl || ''}">
                        </div>
                        <div class="${styles.formGroup}">
                            <label class="${styles.label}">${t('settings.sync.token')}</label>
                            <input type="password" id="custom-token" class="${styles.input}" 
                                placeholder="${t('settings.sync.token.placeholder')}" value="${this.settings.sync?.customToken || ''}">
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

                <!-- Logging Section -->
                <div class="${styles.formSection}">
                    <label class="${styles.sectionTitle}">调试与日志</label>
                    <div class="${styles.formGroup}" style="display:flex; align-items:center; justify-content:space-between;">
                        <label class="${styles.label}" for="log-enabled">开启日志记录</label>
                        <input type="checkbox" id="log-enabled" ${logger.enabled ? 'checked' : ''} style="width:20px; height:20px;">
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
                
                 <!-- Delete Action -->
                 ${this.settings.activeProfileId !== 'default' ? `
                    <div class="${styles.deleteSection}">
                        <button id="delete-btn" class="${styles.btnDestructive}">${t('settings.deleteProfile')}</button>
                    </div>
                 ` : ''}

                 <!-- Copyright Footer -->
                 <div style="text-align: center; margin: 30px 0 10px; padding-top: 20px; color: #999; font-size: 0.75em; border-top: 1px solid #f0f0f0;">
                    <p>AIDU v${chrome.runtime.getManifest().version}</p>
                    <p style="margin-top:4px;">&copy; ${new Date().getFullYear()} SquareUncle 方砖叔 | <a href="https://squareuncle.com" target="_blank" style="color: #666; text-decoration: none;">squareuncle.com</a></p>
                 </div>
            </div>

            <div class="${styles.modalFooter}">
                <button id="cancel-btn" class="${styles.btnSecondary}">${t('settings.cancel')}</button>
                <button id="save-btn" class="${styles.btnPrimary}">${t('settings.save')}</button>
            </div>
        `;

        overlay.appendChild(content);
        this.element.appendChild(overlay);
        this.overlay = overlay;

        // Bind Events
        this.bindEvents(content);
    }

    toggleProviderFields(provider) {
        const apiKeyGroup = document.getElementById('api-key-group');
        const baseUrlGroup = document.getElementById('base-url-group');

        if (provider === 'glm-free') {
            if (apiKeyGroup) apiKeyGroup.style.display = 'none';
            if (baseUrlGroup) baseUrlGroup.style.display = 'none';
        } else {
            if (apiKeyGroup) apiKeyGroup.style.display = 'block';
            if (baseUrlGroup) baseUrlGroup.style.display = 'block';
        }
    }

    renderProfileOptions() {
        return Object.entries(this.settings.profiles).map(([id, profile]) => {
            const isSelected = id === this.settings.activeProfileId;
            return `<option value="${id}" ${isSelected ? 'selected' : ''}>${profile.name || id}</option>`;
        }).join('');
    }

    renderRadioOption(name, value, label, sub, currentVal) {
        // Fallback for missing values in new profiles
        const actualVal = currentVal || '2';
        return `
            <label class="${styles.radioLabel}">
                <input type="radio" name="${name}" value="${value}" 
                    ${actualVal === value ? 'checked' : ''}>
                <span class="${styles.radioText}">
                    <span class="${styles.radioMain}">${label}</span>
                    <span class="${styles.radioSub}">${sub}</span>
                </span>
            </label>
        `;
    }

    bindEvents(content) {
        content.querySelector(`.${styles.closeBtn}`).onclick = () => this.close();
        content.querySelector('#cancel-btn').onclick = () => this.close();
        content.querySelector('#save-btn').onclick = () => this.save();

        // Profile Switcher
        const profileSelect = content.querySelector('#profile-select');
        profileSelect.onchange = (e) => {
            const val = e.target.value;
            if (val === '__create_new__') {
                this.createNewProfile();
            } else {
                this.switchProfile(val);
            }
        };

        // Provider Auto-fill
        const providerSelect = content.querySelector('#provider-select');
        const modelInput = content.querySelector('#model-input');
        const baseUrlInput = content.querySelector('#base-url-input');

        providerSelect.onchange = (e) => {
            const newProvider = e.target.value;
            const oldProvider = this.activeProfile.provider;

            // 1. Save state of OLD provider to providerConfig
            this.activeProfile.providerConfig = this.activeProfile.providerConfig || {};
            this.activeProfile.providerConfig[oldProvider] = {
                apiKey: document.getElementById('api-key-input').value.trim(),
                baseUrl: document.getElementById('base-url-input').value.trim(),
                model: document.getElementById('model-input').value.trim()
            };

            // 2. Update active provider pointer
            this.activeProfile.provider = newProvider;

            // 3. Load state of NEW provider (or defaults)
            const defaults = {
                'glm-free': { model: 'glm-4-flash', url: '' },
                deepseek: { model: 'deepseek-chat', url: 'https://api.deepseek.com/v1' },
                gemini: { model: 'gemini-1.5-flash', url: 'https://generativelanguage.googleapis.com/v1beta' },
                glm: { model: 'glm-4-flash', url: 'https://open.bigmodel.cn/api/paas/v4/' },
                openai: { model: 'gpt-4o-mini', url: 'https://api.openai.com/v1' },
                custom: { model: '', url: '' }
            };

            const savedConfig = this.activeProfile.providerConfig[newProvider];

            if (savedConfig) {
                modelInput.value = savedConfig.model || '';
                baseUrlInput.value = savedConfig.baseUrl || '';
                document.getElementById('api-key-input').value = savedConfig.apiKey || '';
            } else {
                // Load Defaults from the centralized defaults object defined above
                const preset = defaults[newProvider];
                if (preset) {
                    modelInput.value = preset.model;
                    baseUrlInput.value = preset.url;
                    document.getElementById('api-key-input').value = '';
                }
            }

            // Consistency Check: Toggle visibility
            this.toggleProviderFields(newProvider);
        };

        // Initialize visibility state
        this.toggleProviderFields(this.activeProfile.provider);

        // Real-time Profile Name Sync (UX: Make it obvious they are linked)
        const nameInput = content.querySelector('#profile-name');
        nameInput.oninput = (e) => {
            const newName = e.target.value;
            // Update local state temporarily for display
            this.activeProfile.name = newName;
            // Update Dropdown Option Text
            const option = profileSelect.querySelector(`option[value="${this.settings.activeProfileId}"]`);
            if (option) option.textContent = newName || this.settings.activeProfileId;
        };

        const deleteBtn = content.querySelector('#delete-btn');
        if (deleteBtn) {
            deleteBtn.onclick = () => this.deleteProfile();
        }

        // Backup & Restore
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
                // ... (existing code)
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
                        restoreInput.value = ''; // Reset
                        restoreBtn.innerHTML = t('settings.backup.import');
                    }
                };
                reader.readAsText(file);
            };
        }

        // Cloud Sync Events (Custom Worker Only)
        const customSection = content.querySelector('#sync-custom-settings');
        const syncSetupBtn = content.querySelector('#sync-setup-btn');
        const syncNowBtn = content.querySelector('#sync-now-btn');

        const getSyncConfig = () => {
            return {
                provider: 'custom', // Only custom supported now
                customUrl: content.querySelector('#custom-url').value.trim(),
                customToken: content.querySelector('#custom-token').value.trim()
            };
        };

        // Toast Helper
        const showToast = (msg, type = 'info') => {
            const toast = document.createElement('div');
            toast.textContent = msg;
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.padding = '10px 20px';
            toast.style.borderRadius = '8px';
            toast.style.color = '#fff';
            toast.style.zIndex = '10001';
            toast.style.fontSize = '0.9rem';
            toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            toast.style.animation = 'fadeIn 0.3s ease-out';

            if (type === 'error') {
                toast.style.background = '#EF4444';
            } else if (type === 'success') {
                toast.style.background = '#10B981';
            } else {
                toast.style.background = '#3B82F6';
            }

            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        };

        if (syncSetupBtn) {
            syncSetupBtn.onclick = async () => {
                const config = getSyncConfig();

                if (!config.customUrl || !config.customToken) {
                    return showToast(t('settings.sync.urlTokenRequired'), 'error');
                }

                syncSetupBtn.innerHTML = t('settings.sync.connecting');
                try {
                    // Save Config
                    await SyncService.saveConfig(config);
                    // Verify by trying to pull
                    await SyncService.pull();
                    showToast(t('settings.sync.verified'), 'success');
                    syncSetupBtn.innerHTML = t('settings.sync.connected');
                } catch (e) {
                    console.error(e);
                    showToast(t('settings.sync.failed', { error: e.message }), 'error');
                    syncSetupBtn.innerHTML = t('settings.sync.connect');
                }
            };
        }

        if (syncNowBtn) {
            syncNowBtn.onclick = async () => {
                const config = getSyncConfig();
                // Basic validation
                if (!config.customUrl || !config.customToken) {
                    return showToast(t('settings.sync.configFirst'), 'error');
                }

                syncNowBtn.innerHTML = t('settings.sync.syncing');
                try {
                    // Temporarily save config in case they didn't hit Test
                    await SyncService.saveConfig(config);

                    await SyncService.pull();
                    await SyncService.push();

                    showToast(t('settings.sync.completed'), 'success');
                    syncNowBtn.innerHTML = t('settings.sync.synced');
                    setTimeout(() => syncNowBtn.innerHTML = t('settings.sync.now'), 2000);
                } catch (e) {
                    console.error(e);
                    showToast(t('settings.sync.failed', { error: e.message }), 'error');
                    syncNowBtn.innerHTML = t('settings.sync.error');
                }
            };
        }

        const exportMobileBtn = content.querySelector('#export-mobile-link');
        if (exportMobileBtn) {
            exportMobileBtn.onclick = () => {
                const url = content.querySelector('#custom-url').value.trim();
                const token = content.querySelector('#custom-token').value.trim();
                const profile = this.settings.activeProfileId || 'default';

                if (!url || !token) {
                    showToast(t('settings.sync.urlTokenRequired'), 'error');
                    return;
                }

                try {
                    const payload = JSON.stringify({ u: url, t: token, p: profile });
                    const b64 = btoa(payload);
                    const link = `https://aidu-mobile.pages.dev/?conf=${b64}`;

                    navigator.clipboard.writeText(link).then(() => {
                        showToast(t('settings.sync.linkCopied'), 'success');
                    }).catch(err => {
                        console.error(err);
                        showToast(t('settings.sync.copyFailed'), 'error');
                    });
                } catch (e) {
                    showToast('Encoding Error', 'error');
                }
            };
        }

        // Teaching Persona Logic
        const styleSelect = content.querySelector('#teaching-style');
        const styleDesc = content.querySelector('#style-desc');

        // Init Value
        if (this.settings.teachingStyle) {
            styleSelect.value = this.settings.teachingStyle;
        } else {
            styleSelect.value = 'casual'; // Default
        }

        const updateDesc = () => {
            const opt = PERSONA_OPTIONS.find(p => p.id === styleSelect.value);
            styleDesc.textContent = opt?.desc || '';
        };
        updateDesc();

        styleSelect.onchange = () => {
            this.settings.teachingStyle = styleSelect.value;
            updateDesc();
        };

        // Logging Events
        const logEnabled = content.querySelector('#log-enabled');
        logEnabled.onchange = (e) => {
            logger.setEnabled(e.target.checked);
            notificationService.toast(`日志已${e.target.checked ? '开启' : '关闭'}`);
        };

        const viewLogsBtn = content.querySelector('#view-logs-btn');
        viewLogsBtn.onclick = async () => {
            const logs = await logger.getAll();
            if (logs.length === 0) {
                notificationService.toast('暂无日志记录');
                return;
            }

            // 简单弹窗展示日志 (实际项目中可能会有专门的 LogView)
            const logStr = logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
            const blob = new Blob([logStr], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            window.open(url); // 在新页面查看日志
        };

        const clearLogsBtn = content.querySelector('#clear-logs-btn');
        clearLogsBtn.onclick = async () => {
            const ok = await notificationService.confirm('确定要清空所有日志记录吗？');
            if (ok) {
                await logger.clear();
                notificationService.toast('日志已清空');
            }
        };

        // Theme Logic
        const applyTheme = (key, value) => {
            document.documentElement.style.setProperty(key, value);
        };

        const themeMap = {
            '#color-highlight-bg': '--user-color-highlight-bg',
            '#color-highlight-text': '--user-color-highlight-text',
            '#color-hover-bg': '--user-color-hover-bg',
            '#color-hover-text': '--user-color-hover-text',
            '#color-saved-bg': '--user-color-saved-bg',
            '#color-saved-underline': '--user-color-saved-underline'
        };

        Object.keys(themeMap).forEach(selector => {
            const input = content.querySelector(selector);
            if (input) {
                input.oninput = (e) => {
                    applyTheme(themeMap[selector], e.target.value);
                };
            }
        });

        const resetThemeBtn = content.querySelector('#reset-theme-btn');
        if (resetThemeBtn) {
            resetThemeBtn.onclick = async () => {
                const ok = await notificationService.confirm('确定要恢复默认颜色吗？');
                if (ok) {
                    // Defaults
                    const defaults = {
                        '--user-color-highlight-bg': '#fff9c4',
                        '--user-color-highlight-text': 'inherit',
                        '--user-color-hover-bg': '#dcfce7',
                        '--user-color-hover-text': '#14532d',
                        '--user-color-saved-bg': '#e8f5e9', // Approximate rgba to hex
                        '--user-color-saved-underline': '#a5d6a7'
                    };
                    Object.entries(defaults).forEach(([k, v]) => applyTheme(k, v));

                    // Update Inputs
                    content.querySelector('#color-highlight-bg').value = '#fff9c4';
                    content.querySelector('#color-highlight-text').value = '#000000'; // Fallback for inherit in picker
                    content.querySelector('#color-hover-bg').value = '#dcfce7';
                    content.querySelector('#color-hover-text').value = '#14532d';
                    content.querySelector('#color-saved-bg').value = '#e8f5e9';
                    content.querySelector('#color-saved-underline').value = '#a5d6a7';
                }
            };
        }
    }

    async createNewProfile() {
        const newId = 'profile_' + Date.now();
        this.settings.profiles[newId] = {
            name: t('settings.newProfile'),
            provider: 'deepseek',
            baseUrl: 'https://api.deepseek.com/v1',
            model: 'deepseek-chat',
            apiKey: '',
            realtimeMode: '2',
            builderMode: '3'
        };
        this.settings.activeProfileId = newId;

        // We persist immediately to avoid complex state management
        await StorageHelper.set(StorageKeys.USER_SETTINGS, this.settings);

        // Switch Vocab Context
        vocabService.setProfile(newId);

        // Re-render
        this.activeProfile = this.settings.profiles[newId];
        this.render();
    }

    async switchProfile(profileId) {
        // Capture current state before switching, so edits aren't lost
        this.updateSettingsFromDOM();

        this.settings.activeProfileId = profileId;
        this.activeProfile = this.settings.profiles[profileId];

        // Switch Vocab Context
        vocabService.setProfile(profileId);

        this.render();
    }

    async deleteProfile() {
        const ok = await notificationService.confirm(t('settings.deleteProfile.confirm'));
        if (ok) {
            const idToDelete = this.settings.activeProfileId;

            // Clean up associated vocab data to prevent storage leaks
            const vocabKey = `vocab_${idToDelete}`;
            await StorageHelper.remove(vocabKey);
            console.log(`Deleted vocab data for profile: ${idToDelete}`);

            delete this.settings.profiles[idToDelete];
            this.settings.activeProfileId = 'default';

            await StorageHelper.set(StorageKeys.USER_SETTINGS, this.settings);

            // Switch back to default
            this.activeProfile = this.settings.profiles['default'];
            vocabService.setProfile('default');

            this.render();
        }
    }

    updateSettingsFromDOM() {
        if (!this.overlay) return;

        // 1. Profile Data
        const name = this.overlay.querySelector('#profile-name').value.trim();
        const provider = this.overlay.querySelector('#provider-select').value;
        const baseUrl = this.overlay.querySelector('#base-url-input').value.trim();
        const model = this.overlay.querySelector('#model-input').value.trim();
        const apiKey = this.overlay.querySelector('#api-key-input').value.trim();

        let realtimeMode = '2';
        const rtRadio = this.overlay.querySelector('input[name="realtimeMode"]:checked');
        if (rtRadio) realtimeMode = rtRadio.value;

        let builderMode = '3';
        const buRadio = this.overlay.querySelector('input[name="builderMode"]:checked');
        if (buRadio) builderMode = buRadio.value;

        // Save to current profile config
        const currentProviderConfig = this.activeProfile.providerConfig || {};
        currentProviderConfig[provider] = { apiKey, baseUrl, model };

        this.settings.profiles[this.settings.activeProfileId] = {
            ...this.activeProfile,
            name,
            provider,
            baseUrl,
            model,
            apiKey,
            providerConfig: currentProviderConfig,
            realtimeMode,
            builderMode,
            updatedAt: Date.now()
        };

        // 2. Global Data
        const teachingStyle = this.overlay.querySelector('#teaching-style').value;
        this.settings.teachingStyle = teachingStyle;

        // 3. Sync Data
        const customUrl = this.overlay.querySelector('#custom-url').value.trim();
        const customToken = this.overlay.querySelector('#custom-token').value.trim();

        this.settings.sync = {
            ...this.settings.sync,
            customUrl,
            customToken,
            provider: 'custom'
        };

        // Theme Data has been moved to ThemeModal, do not overwrite it here.
    }

    async save() {
        // Collect Data from Form
        this.updateSettingsFromDOM();

        const language = this.overlay.querySelector('#language-select').value;

        // Handle Language Change
        if (language && language !== getCurrentLocale()) {
            await setLocale(language);
        }

        // Persist everything
        await StorageHelper.set(StorageKeys.USER_SETTINGS, this.settings);
        console.log('Settings Profile Saved:', this.settings.activeProfileId);

        // Ensure VocabService is in sync
        vocabService.setProfile(this.settings.activeProfileId);

        this.close();

        // Reload page to apply changes everywhere (Simple & Robust)
        window.location.reload();
    }

    close() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}

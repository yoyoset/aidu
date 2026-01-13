import { Component } from '../../components/component.js';
import { StorageHelper, StorageKeys } from '../../../utils/storage.js';
import { DataService } from '../../../services/data_service.js';
import { SyncService } from '../../../services/sync_service.js';
import { vocabService } from '../../../services/vocab_service.js';
import styles from './settings.module.css';

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
                        provider: 'deepseek',
                        baseUrl: 'https://api.deepseek.com/v1',
                        model: 'deepseek-chat',
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
                    <h3 class="${styles.modalTitle}">Configuration</h3>
                    <div class="${styles.profileSelectWrapper}">
                        <select id="profile-select" class="${styles.profileSelect}">
                            ${this.renderProfileOptions()}
                            <option value="__create_new__">+ Create New Profile...</option>
                        </select>
                    </div>
                </div>
                <button class="${styles.closeBtn}">&times;</button>
            </div>
            
            <div class="${styles.scrollArea}">
                <!-- Profile Meta -->
                <div class="${styles.formSection}">
                    <label class="${styles.sectionTitle}">General Settings</label>
                    <div class="${styles.formGroup}">
                        <label class="${styles.label}" for="profile-name">Display Name ✏️</label>
                        <input type="text" id="profile-name" class="${styles.input}" 
                            value="${this.activeProfile.name || 'New Profile'}" placeholder="Enter Profile Name">
                    </div>
                </div>

                <!-- Provider Section -->
                <div class="${styles.formSection}">
                   <label class="${styles.sectionTitle}">AI Provider</label>
                    <div class="${styles.formGroup}">
                        <label class="${styles.label}" for="provider-select">Provider</label>
                        <select id="provider-select" class="${styles.select}">
                            <option value="deepseek" ${this.activeProfile.provider === 'deepseek' ? 'selected' : ''}>DeepSeek</option>
                            <option value="gemini" ${this.activeProfile.provider === 'gemini' ? 'selected' : ''}>Google Gemini</option>
                            <option value="openai" ${this.activeProfile.provider === 'openai' ? 'selected' : ''}>OpenAI Compatible</option>
                            <option value="custom" ${this.activeProfile.provider === 'custom' ? 'selected' : ''}>Custom Endpoint</option>
                        </select>
                    </div>

                    <div class="${styles.formGroup}">
                        <label class="${styles.label}" for="base-url-input">Base URL</label>
                        <input type="text" id="base-url-input" class="${styles.input}" 
                            value="${this.activeProfile.baseUrl || ''}" placeholder="API Endpoint URL">
                    </div>

                    <div class="${styles.formGroup}">
                        <label class="${styles.label}" for="model-input">Model Name</label>
                        <input type="text" id="model-input" class="${styles.input}" 
                            value="${this.activeProfile.model}" placeholder="e.g., deepseek-chat">
                    </div>

                    <div class="${styles.formGroup}">
                        <label class="${styles.label}" for="api-key-input">API Key</label>
                        <input type="password" id="api-key-input" class="${styles.input}" 
                            value="${this.activeProfile.apiKey}" placeholder="sk-...">
                    </div>
                </div>

                <!-- Analysis Mode Section -->
                <div class="${styles.formSection}">
                    <label class="${styles.sectionTitle}">Analysis Strategy</label>
                    
                    <div class="${styles.modeContainer}">
                        <div class="${styles.modeColumn}">
                            <label class="${styles.label}">Real-time (Selection)</label>
                            <div class="${styles.radioGroup}">
                                ${this.renderRadioOption('realtimeMode', '1', 'Translation', 'Fast', this.activeProfile.realtimeMode)}
                                ${this.renderRadioOption('realtimeMode', '2', 'Standard', 'Lemma+POS', this.activeProfile.realtimeMode)}
                                ${this.renderRadioOption('realtimeMode', '3', 'Deep', 'Full Context', this.activeProfile.realtimeMode)}
                            </div>
                        </div>
                        
                        <div class="${styles.modeColumn}">
                            <label class="${styles.label}">Background / Manual AI</label>
                            <div class="${styles.radioGroup}">
                                ${this.renderRadioOption('builderMode', '1', 'Translation', 'Fast', this.activeProfile.builderMode)}
                                ${this.renderRadioOption('builderMode', '2', 'Standard', 'Lemma+POS', this.activeProfile.builderMode)}
                                ${this.renderRadioOption('builderMode', '3', 'Deep', 'Full Context', this.activeProfile.builderMode)}
                        </div>
                    </div>
                </div>
                </div>

                <!-- Cloud Sync Section -->
                <div class="${styles.formSection}">
                    <label class="${styles.sectionTitle}">Cloud Sync ☁️</label>
                    
                    <div class="${styles.formGroup}">
                        <label class="${styles.label}">Sync Provider</label>
                        <select id="sync-provider-select" class="${styles.select}">
                            <option value="gist">GitHub Gist (Free & Private)</option>
                            <option value="custom">Custom / Cloudflare Worker (Self-Hosted)</option>
                        </select>
                    </div>

                    <!-- Gist Settings -->
                    <div id="sync-gist-settings">
                        <div class="${styles.formGroup}">
                            <label class="${styles.label}">GitHub Token</label>
                            <input type="password" id="github-token" class="${styles.input}" 
                                placeholder="ghp_..." value="${this.settings.sync?.githubToken || ''}">
                        </div>
                        <div class="${styles.formGroup}">
                            <label class="${styles.label}">Gist ID</label>
                            <input type="text" id="gist-id" class="${styles.input}" 
                                placeholder="Auto-created if empty" value="${this.settings.sync?.gistId || ''}">
                        </div>
                    </div>

                    <!-- Custom Settings -->
                    <div id="sync-custom-settings" style="display:none;">
                        <div class="${styles.formGroup}">
                            <label class="${styles.label}">Worker Endpoint URL</label>
                            <input type="text" id="custom-url" class="${styles.input}" 
                                placeholder="https://..." value="${this.settings.sync?.customUrl || ''}">
                        </div>
                        <div class="${styles.formGroup}">
                            <label class="${styles.label}">Access Token (Secret)</label>
                            <input type="password" id="custom-token" class="${styles.input}" 
                                placeholder="Your AUTH_TOKEN" value="${this.settings.sync?.customToken || ''}">
                        </div>
                    </div>

                    <div style="display:flex; gap:10px; margin-top:8px;">
                        <button id="sync-setup-btn" class="${styles.btnSecondary}" style="flex:1;">
                            🔌 Connect / Test
                        </button>
                        <button id="sync-now-btn" class="${styles.btnPrimary}" style="flex:1;">
                            🔄 Sync Now
                        </button>
                    </div>
                </div>

                <!-- Backup & Restore Section -->
                <div class="${styles.formSection}">
                    <label class="${styles.sectionTitle}">Data & Preservation (Backup)</label>
                    <div style="display:flex; gap:10px; margin-top:8px;">
                        <button id="backup-btn" class="${styles.btnSecondary}" style="flex:1;">
                            📤 Backup All Data (JSON)
                        </button>
                        <button id="restore-btn" class="${styles.btnSecondary}" style="flex:1;">
                            📥 Restore Data
                        </button>
                        <input type="file" id="restore-file-input" style="display:none;" accept=".json">
                    </div>
                    <p style="font-size:0.8em; color:#666; margin-top:6px;">
                        Export all vocabulary, articles, and settings to transfer to another computer.
                    </p>
                </div>
                
                 <!-- Delete Action -->
                 ${this.settings.activeProfileId !== 'default' ? `
                    <div class="${styles.deleteSection}">
                        <button id="delete-btn" class="${styles.btnDestructive}">Delete Profile</button>
                    </div>
                 ` : ''}
            </div>

            <div class="${styles.modalFooter}">
                <button id="cancel-btn" class="${styles.btnSecondary}">Cancel</button>
                <button id="save-btn" class="${styles.btnPrimary}">Save & Apply</button>
            </div>
        `;

        overlay.appendChild(content);
        this.element.appendChild(overlay);
        this.overlay = overlay;

        // Bind Events
        this.bindEvents(content);
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
                    <strong>${label}</strong>
                    <small>${sub}</small>
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
            if (e.target.value === '__create_new__') {
                this.createNewProfile();
            } else {
                this.switchProfile(e.target.value);
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
            const savedConfig = this.activeProfile.providerConfig[newProvider];

            if (savedConfig) {
                modelInput.value = savedConfig.model || '';
                baseUrlInput.value = savedConfig.baseUrl || '';
                document.getElementById('api-key-input').value = savedConfig.apiKey || '';
            } else {
                // Load Defaults
                const defaults = {
                    deepseek: { model: 'deepseek-chat', url: 'https://api.deepseek.com/v1' },
                    gemini: { model: 'gemini-1.5-flash', url: 'https://generativelanguage.googleapis.com/v1beta' },
                    openai: { model: 'gpt-4o-mini', url: 'https://api.openai.com/v1' },
                    custom: { model: '', url: '' }
                };
                const preset = defaults[newProvider];
                if (preset) {
                    modelInput.value = preset.model;
                    baseUrlInput.value = preset.url;
                    document.getElementById('api-key-input').value = '';
                }
            }
        };

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
                backupBtn.innerHTML = '⏳ Exporting...';
                try {
                    const data = await DataService.exportAll();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `aidu_backup_${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    backupBtn.innerHTML = '✅ Done';
                    setTimeout(() => backupBtn.innerHTML = '📤 Backup All Data (JSON)', 2000);
                } catch (e) {
                    console.error(e);
                    backupBtn.innerHTML = '❌ Error';
                    alert('Export failed. Check console.');
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
                        if (confirm(`Restore data from "${file.name}"?\n⚠️ This will OVERWRITE current vocabulary, drafts, and settings!`)) {
                            restoreBtn.innerHTML = '⏳ Restoring...';
                            await DataService.importAll(json);
                            alert('✅ Data restored successfully! The page will reload.');
                            window.location.reload();
                        }
                    } catch (err) {
                        console.error(err);
                        alert('❌ Restore failed: Invalid JSON file.');
                    } finally {
                        restoreInput.value = ''; // Reset
                        restoreBtn.innerHTML = '📥 Restore Data';
                    }
                };
                reader.readAsText(file);
            };
        }

        // Cloud Sync Events
        const syncProviderSelect = content.querySelector('#sync-provider-select');
        const gistSection = content.querySelector('#sync-gist-settings');
        const customSection = content.querySelector('#sync-custom-settings');
        const syncSetupBtn = content.querySelector('#sync-setup-btn');
        const syncNowBtn = content.querySelector('#sync-now-btn');

        // Init visibility logic
        const updateSyncVisibility = () => {
            const val = syncProviderSelect.value;
            console.log('Sync Provider Changed:', val);
            if (val === 'gist') {
                gistSection.style.display = 'block';
                customSection.style.display = 'none';
            } else {
                gistSection.style.display = 'none';
                customSection.style.display = 'block';
            }
        };

        // Set initial value
        const currentProvider = this.settings.sync?.provider || 'gist';
        syncProviderSelect.value = currentProvider;

        // Force initial state
        updateSyncVisibility();

        // Bind Change
        syncProviderSelect.onchange = updateSyncVisibility;

        const getSyncConfig = () => {
            const provider = syncProviderSelect.value;
            return {
                provider,
                githubToken: content.querySelector('#github-token').value.trim(),
                gistId: content.querySelector('#gist-id').value.trim(),
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

                if (config.provider === 'gist' && !config.githubToken) return showToast('GitHub Token required', 'error');
                if (config.provider === 'custom' && (!config.customUrl || !config.customToken)) return showToast('URL and Token required', 'error');

                syncSetupBtn.innerHTML = '⏳ Connecting...';
                try {
                    // Save Config
                    await SyncService.saveConfig(config);

                    if (config.provider === 'gist' && !config.gistId) {
                        syncSetupBtn.innerHTML = '⏳ Creating Gist...';
                        const id = await SyncService.createGist(config.githubToken);
                        content.querySelector('#gist-id').value = id;
                        await SyncService.saveConfig({ ...config, gistId: id });
                        showToast('✅ Gist Created!', 'success');
                    } else {
                        // Verify by trying to pull
                        await SyncService.pull();
                        showToast('✅ Connection Verified!', 'success');
                    }
                    syncSetupBtn.innerHTML = '✅ Connected';
                } catch (e) {
                    console.error(e);
                    showToast(`❌ Failed: ${e.message}`, 'error');
                    syncSetupBtn.innerHTML = '🔌 Connect / Test';
                }
            };
        }

        if (syncNowBtn) {
            syncNowBtn.onclick = async () => {
                const config = getSyncConfig();
                // Basic validation
                if (!config.provider) return showToast('Configure provider first', 'error');

                syncNowBtn.innerHTML = '⏳ Syncing...';
                try {
                    // Temporarily save config in case they didn't hit Test
                    await SyncService.saveConfig(config);

                    await SyncService.pull();
                    await SyncService.push();

                    showToast('✅ Sync Completed Successfully', 'success');
                    syncNowBtn.innerHTML = '✅ Synced';
                    setTimeout(() => syncNowBtn.innerHTML = '🔄 Sync Now', 2000);
                } catch (e) {
                    console.error(e);
                    showToast(`❌ Sync Failed: ${e.message}`, 'error');
                    syncNowBtn.innerHTML = '❌ Error';
                }
            };
        }
    }

    async createNewProfile() {
        const newId = 'profile_' + Date.now();
        this.settings.profiles[newId] = {
            name: 'New Profile',
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
        this.settings.activeProfileId = profileId;
        this.activeProfile = this.settings.profiles[profileId];

        // Switch Vocab Context
        vocabService.setProfile(profileId);

        this.render();
    }

    async deleteProfile() {
        if (confirm('Are you sure you want to delete this profile?')) {
            const idToDelete = this.settings.activeProfileId;
            delete this.settings.profiles[idToDelete];
            this.settings.activeProfileId = 'default';

            await StorageHelper.set(StorageKeys.USER_SETTINGS, this.settings);

            // Switch back to default
            this.activeProfile = this.settings.profiles['default'];
            vocabService.setProfile('default');

            this.render();
        }
    }

    async save() {
        // Collect Data from Form
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

        // Update the CURRENTLY ACTIVE profile in the settings object

        // Ensure current form values are saved to the current provider config
        const currentConfig = {
            apiKey, baseUrl, model
        };
        const currentProviderConfig = this.activeProfile.providerConfig || {};
        currentProviderConfig[provider] = currentConfig;

        this.settings.profiles[this.settings.activeProfileId] = {
            ...this.activeProfile,
            name,
            provider,
            baseUrl, // Keep flat for backward compatibility access
            model,   // Keep flat for backward compatibility access
            apiKey,  // Keep flat for backward compatibility access
            providerConfig: currentProviderConfig, // New Source of Truth
            realtimeMode,
            builderMode,
            updatedAt: Date.now()
        };

        // Persist everything
        await StorageHelper.set(StorageKeys.USER_SETTINGS, this.settings);
        console.log('Settings Profile Saved:', this.settings.activeProfileId);

        // Ensure VocabService is in sync (should be already, but safety first)
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

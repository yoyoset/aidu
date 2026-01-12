import { Component } from '../../components/component.js';
import { StorageHelper, StorageKeys } from '../../../utils/storage.js';
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

        // Delete Button
        const deleteBtn = content.querySelector('#delete-btn');
        if (deleteBtn) {
            deleteBtn.onclick = () => this.deleteProfile();
        }
    }

    async createNewProfile() {
        // 1. Temporarily save current form state to memory so we don't lose it? 
        // Or simpler: Save current profile first? No, that might be unexpected.
        // Let's just create a new profile ID and switch to it.

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

        // Re-render
        this.activeProfile = this.settings.profiles[newId];
        this.render();
    }

    async switchProfile(profileId) {
        this.settings.activeProfileId = profileId;
        this.activeProfile = this.settings.profiles[profileId];

        // Persist switch? Often users expect switching to be temporary until they hit save.
        // But for "Editor" like modal, switching usually implies loading that data.
        // I will NOT save the 'activeProfileId' to storage yet, only when Save is clicked.
        // BUT I must reload the view from the 'settings' object in memory.

        this.render();
    }

    async deleteProfile() {
        if (confirm('Are you sure you want to delete this profile?')) {
            const idToDelete = this.settings.activeProfileId;
            delete this.settings.profiles[idToDelete];
            this.settings.activeProfileId = 'default';

            await StorageHelper.set(StorageKeys.USER_SETTINGS, this.settings);

            this.activeProfile = this.settings.profiles['default'];
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
        const realtimeMode = this.overlay.querySelector('input[name="realtimeMode"]:checked').value;
        const builderMode = this.overlay.querySelector('input[name="builderMode"]:checked').value;

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

        this.close();
        // Optional: Notify app to reload config? PipelineManager reads on demand, so it's fine.
    }

    close() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}

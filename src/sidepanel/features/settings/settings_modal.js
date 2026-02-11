import { Component } from '../../components/component.js';
import { StorageHelper, StorageKeys } from '../../../utils/storage.js';
import { profileManager } from '../../../core/profile_manager.js';
import { t, getCurrentLocale, setLocale } from '../../../locales/index.js';
import { notificationService } from '../../../utils/notification_service.js';
import styles from './settings.module.css';

// Sections
import { ProfileSection } from './sections/profile_section.js';
import { ProviderSection } from './sections/provider_section.js';
import { SyncSection } from './sections/sync_section.js';
import { AppearanceSection } from './sections/appearance_section.js';
import { ExpertSection } from './sections/expert_section.js';
import { LoggingSection } from './sections/logging_section.js';
import { BackupSection } from './sections/backup_section.js';

export class SettingsModal extends Component {
    constructor(element) {
        super(element);
        this.settings = null;
        this.activeProfile = null;
        this.expertPrompts = {};

        // Initialize Sections
        this.sections = [
            new ProfileSection(this),
            new ProviderSection(this),
            new SyncSection(this),
            new AppearanceSection(this),
            new BackupSection(this),
            new LoggingSection(this)
        ];
    }

    async show() {
        // Load data via domain service
        this.settings = await profileManager.load();
        this.activeProfile = profileManager.getActiveProfile();

        // Load Expert UI defaults
        this.expertPrompts = await StorageHelper.get(StorageKeys.EXPERT_PROMPTS) || {};

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
                ${this.sections.map(section => section.render()).join('')}

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
        document.body.appendChild(overlay);
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

        // Delegate Bindings to Sections
        this.sections.forEach(section => section.bind(content));
    }

    async createNewProfile() {
        const newId = await profileManager.createProfile(t('settings.newProfile'));
        this.activeProfile = profileManager.getActiveProfile();
        this.render();
    }

    async switchProfile(profileId) {
        // Capture current state before switching
        this.updateSettingsFromDOM();

        await profileManager.switchProfile(profileId);
        this.activeProfile = profileManager.getActiveProfile();
        this.render();
    }

    async deleteProfile() {
        const ok = await notificationService.confirm(t('settings.deleteProfile.confirm'));
        if (ok) {
            await profileManager.deleteProfile(this.settings.activeProfileId);
            this.activeProfile = profileManager.getActiveProfile();
            this.render();
        }
    }

    updateSettingsFromDOM() {
        if (!this.overlay) return;

        // 1. Collect Data via Sections
        const allData = this.sections.reduce((acc, section) => {
            return { ...acc, ...section.collectData(this.overlay) };
        }, {});

        // 2. Map to Profile Data
        const profileUpdates = {
            name: allData.name,
            provider: allData.provider,
            baseUrl: allData.baseUrl,
            model: allData.model,
            apiKey: allData.apiKey,
            realtimeMode: allData.realtimeMode,
            builderMode: allData.builderMode
        };

        // 3. Map to Global Data
        const globalSettings = {
            teachingStyle: allData.teachingStyle,
            sync: allData.sync
        };

        // Delegate to Domain Service
        profileManager.updateActiveProfile(profileUpdates);
        profileManager.updateGlobalSettings(globalSettings);

        // 4. Expert Prompts (UI-specific storage)
        if (allData.expertPrompts) {
            this.expertPrompts = allData.expertPrompts;
        }
    }

    async save() {
        this.updateSettingsFromDOM();

        // Persist Expert Prompts
        await StorageHelper.set(StorageKeys.EXPERT_PROMPTS, this.expertPrompts);

        // Domain Save
        await profileManager.save();

        this.close();
        window.location.reload();
    }

    close() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    /**
     * Helper for showing toast notifications within the modal context
     * Used by sections like SyncSection
     */
    showToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.textContent = msg;
        Object.assign(toast.style, {
            position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
            padding: '10px 20px', borderRadius: '8px', color: '#fff', zIndex: '10001',
            fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', animation: 'fadeIn 0.3s ease-out'
        });
        toast.style.background = type === 'error' ? '#EF4444' : (type === 'success' ? '#10B981' : '#3B82F6');
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

import { t } from '../../../../locales/index.js';
import styles from '../settings.module.css';

export class ProfileSection {
    constructor(parent) {
        this.parent = parent;
    }

    render() {
        const { activeProfile } = this.parent;
        return `
            <div class="${styles.formSection}">
                <label class="${styles.sectionTitle}">${t('settings.general')}</label>
                <div class="${styles.formGroup}">
                    <label class="${styles.label}" for="profile-name">${t('settings.displayName')}</label>
                    <input type="text" id="profile-name" class="${styles.input}" 
                        value="${activeProfile.name || t('settings.newProfile')}" 
                        placeholder="${t('settings.displayName.placeholder')}">
                </div>
            </div>

            ${this.parent.settings.activeProfileId !== 'default' ? `
                <div class="${styles.deleteSection}">
                    <button id="delete-btn" class="${styles.btnDestructive}">${t('settings.deleteProfile')}</button>
                </div>
            ` : ''}
        `;
    }

    bind(content) {
        const nameInput = content.querySelector('#profile-name');
        const deleteBtn = content.querySelector('#delete-btn');

        nameInput.oninput = (e) => {
            const newName = e.target.value;
            this.parent.activeProfile.name = newName;

            // Sync with header dropdown
            const profileSelect = document.querySelector('#profile-select');
            if (profileSelect) {
                const option = profileSelect.querySelector(`option[value="${this.parent.settings.activeProfileId}"]`);
                if (option) option.textContent = newName || this.parent.settings.activeProfileId;
            }
        };

        if (deleteBtn) {
            deleteBtn.onclick = () => this.parent.deleteProfile();
        }
    }

    collectData(content) {
        return {
            name: content.querySelector('#profile-name').value.trim()
        };
    }
}

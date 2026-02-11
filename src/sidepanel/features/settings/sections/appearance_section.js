import { t, getSupportedLocales, getCurrentLocale, setLocale } from '../../../../locales/index.js';
import styles from '../settings.module.css';
import { PERSONA_OPTIONS } from '../../../../background/llm/persona.js';
import { notificationService } from '../../../../utils/notification_service.js';

export class AppearanceSection {
    constructor(parent) {
        this.parent = parent;
    }

    render() {
        return `
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
        `;
    }

    bind(content) {
        // Persona logic
        const styleSelect = content.querySelector('#teaching-style');
        const styleDesc = content.querySelector('#style-desc');
        if (this.parent.settings.teachingStyle) {
            styleSelect.value = this.parent.settings.teachingStyle;
        }
        const updateDesc = () => {
            const opt = PERSONA_OPTIONS.find(p => p.id === styleSelect.value);
            styleDesc.textContent = opt?.desc || '';
        };
        updateDesc();
        styleSelect.onchange = () => {
            this.parent.settings.teachingStyle = styleSelect.value;
            updateDesc();
        };
    }

    async collectData(content) {
        const language = content.querySelector('#language-select').value;
        if (language && language !== getCurrentLocale()) {
            await setLocale(language);
        }
        return {
            teachingStyle: content.querySelector('#teaching-style').value
        };
    }
}

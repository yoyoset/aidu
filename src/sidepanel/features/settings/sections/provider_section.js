import { t } from '../../../../locales/index.js';
import styles from '../settings.module.css';

export class ProviderSection {
    constructor(parent) {
        this.parent = parent;
    }

    render() {
        const { activeProfile } = this.parent;
        return `
            <div class="${styles.formSection}">
                <label class="${styles.sectionTitle}">${t('settings.provider')}</label>
                <div class="${styles.formGroup}">
                    <label class="${styles.label}" for="provider-select">${t('settings.provider.label')}</label>
                    <select id="provider-select" class="${styles.select}">
                        <option value="gemini" ${activeProfile.provider === 'gemini' ? 'selected' : ''}>Google Gemini</option>
                        <option value="deepseek" ${activeProfile.provider === 'deepseek' ? 'selected' : ''}>DeepSeek</option>
                        <option value="glm" ${activeProfile.provider === 'glm' ? 'selected' : ''}>Zhipu AI (GLM)</option>
                        <option value="openai" ${activeProfile.provider === 'openai' ? 'selected' : ''}>OpenAI Compatible</option>
                        <option value="custom" ${activeProfile.provider === 'custom' ? 'selected' : ''}>Custom Endpoint</option>
                    </select>
                </div>

                <div class="${styles.formGroup}" id="base-url-group">
                    <label class="${styles.label}" for="base-url-input">${t('settings.baseUrl')}</label>
                    <input type="text" id="base-url-input" class="${styles.input}" 
                        value="${activeProfile.baseUrl || ''}" placeholder="${t('settings.baseUrl.placeholder')}">
                </div>

                <div class="${styles.formGroup}" id="model-group">
                    <label class="${styles.label}" for="model-input">${t('settings.model')}</label>
                    <input type="text" id="model-input" class="${styles.input}" 
                        value="${activeProfile.model || ''}" placeholder="${t('settings.model.placeholder')}">
                </div>

                <div class="${styles.formGroup}" id="api-key-group">
                    <label class="${styles.label}" for="api-key-input">${t('settings.apiKey')}</label>
                    <input type="password" id="api-key-input" class="${styles.input}" 
                        value="${activeProfile.apiKey || ''}" placeholder="${t('settings.apiKey.placeholder')}">
                </div>
            </div>

            <div class="${styles.formSection}">
                <label class="${styles.sectionTitle}">${t('settings.analysis')}</label>
                <div class="${styles.modeContainer}">
                    <div class="${styles.modeColumn}">
                        <label class="${styles.label}">${t('settings.realtime')}</label>
                        <div class="${styles.radioGroup}">
                            ${this.renderRadioOption('realtimeMode', '1', t('settings.mode.translation'), t('settings.mode.translation.sub'), activeProfile.realtimeMode)}
                            ${this.renderRadioOption('realtimeMode', '2', t('settings.mode.standard'), t('settings.mode.standard.sub'), activeProfile.realtimeMode)}
                            ${this.renderRadioOption('realtimeMode', '3', t('settings.mode.deep'), t('settings.mode.deep.sub'), activeProfile.realtimeMode)}
                        </div>
                    </div>
                    <div class="${styles.modeColumn}">
                        <label class="${styles.label}">${t('settings.builder')}</label>
                        <div class="${styles.radioGroup}">
                            ${this.renderRadioOption('builderMode', '2', t('settings.mode.standard'), t('settings.mode.core'), activeProfile.builderMode)}
                            ${this.renderRadioOption('builderMode', '3', t('settings.mode.deep'), t('settings.mode.detailed'), activeProfile.builderMode)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderRadioOption(name, value, label, sub, currentVal) {
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

    bind(content) {
        const providerSelect = content.querySelector('#provider-select');
        const modelInput = content.querySelector('#model-input');
        const baseUrlInput = content.querySelector('#base-url-input');
        const apiKeyInput = content.querySelector('#api-key-input');

        const toggleFields = (provider) => {
            const apiKeyGroup = content.querySelector('#api-key-group');
            const baseUrlGroup = content.querySelector('#base-url-group');
            if (apiKeyGroup) apiKeyGroup.style.display = 'block';
            if (baseUrlGroup) baseUrlGroup.style.display = 'block';
        };

        providerSelect.onchange = (e) => {
            const newProvider = e.target.value;
            const { activeProfile } = this.parent;
            const oldProvider = activeProfile.provider;

            // 1. Save state of OLD provider
            activeProfile.providerConfig = activeProfile.providerConfig || {};
            activeProfile.providerConfig[oldProvider] = {
                apiKey: apiKeyInput.value.trim(),
                baseUrl: baseUrlInput.value.trim(),
                model: modelInput.value.trim()
            };

            // 2. Update pointer
            activeProfile.provider = newProvider;

            // 3. Load or Default
            const defaults = {
                deepseek: { model: 'deepseek-chat', url: 'https://api.deepseek.com/v1' },
                gemini: { model: 'gemini-2.0-flash', url: 'https://generativelanguage.googleapis.com/v1beta' },
                glm: { model: 'glm-4-flash', url: 'https://open.bigmodel.cn/api/paas/v4/' },
                openai: { model: 'gpt-4o-mini', url: 'https://api.openai.com/v1' },
                custom: { model: '', url: '' }
            };

            const savedConfig = activeProfile.providerConfig[newProvider];
            if (savedConfig) {
                modelInput.value = savedConfig.model || '';
                baseUrlInput.value = savedConfig.baseUrl || '';
                apiKeyInput.value = savedConfig.apiKey || '';
            } else {
                const preset = defaults[newProvider];
                if (preset) {
                    modelInput.value = preset.model;
                    baseUrlInput.value = preset.url;
                    apiKeyInput.value = '';
                }
            }
            toggleFields(newProvider);
        };

        // Init visibility
        toggleFields(this.parent.activeProfile.provider);
    }

    collectData(content) {
        return {
            provider: content.querySelector('#provider-select').value,
            baseUrl: content.querySelector('#base-url-input').value.trim(),
            model: content.querySelector('#model-input').value.trim(),
            apiKey: content.querySelector('#api-key-input').value.trim(),
            realtimeMode: content.querySelector('input[name="realtimeMode"]:checked')?.value || '2',
            builderMode: content.querySelector('input[name="builderMode"]:checked')?.value || '3'
        };
    }
}

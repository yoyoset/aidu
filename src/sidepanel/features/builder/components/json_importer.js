import { t } from '../../../../locales/index.js';
import styles from '../creator.module.css';
import navStyles from '../styles/dashboard_nav.module.css';
import { StorageHelper, StorageKeys } from '../../../../utils/storage.js';
import { notificationService } from '../../../../utils/notification_service.js';

export class JsonImporter {
    constructor(parent) {
        this.parent = parent;
    }

    render() {
        const container = document.createDocumentFragment();

        // Helper Section
        const helper = document.createElement('div');
        helper.className = styles['helper-section'];
        const textDiv = document.createElement('div');
        textDiv.className = styles['helper-text'];
        textDiv.innerHTML = `<strong>${t('creator.manualAi.title')}</strong><br><small>${t('creator.manualAi.steps')}</small>`;

        const copyBtn = document.createElement('button');
        copyBtn.id = 'copy-prompt-btn';
        copyBtn.className = navStyles['btn-primary'];
        copyBtn.style.minWidth = '120px'; // Overriding default pill min-width for small context
        copyBtn.textContent = t('creator.manualAi.copy');
        copyBtn.onclick = () => this.copySystemPrompt();

        helper.appendChild(textDiv);
        helper.appendChild(copyBtn);
        container.appendChild(helper);

        // Textarea
        const wrapper = document.createElement('div');
        wrapper.className = styles['textarea-wrapper'];
        const textarea = document.createElement('textarea');
        textarea.id = 'json-content';
        textarea.className = `${styles.textarea} ${styles['code-area']}`;
        textarea.placeholder = t('creator.manualAi.placeholder');
        wrapper.appendChild(textarea);
        container.appendChild(wrapper);

        // Footer
        const footer = document.createElement('div');
        footer.className = styles.footer;
        const importBtn = document.createElement('button');
        importBtn.id = 'import-btn';
        importBtn.className = navStyles['btn-primary'];
        importBtn.textContent = t('creator.manualAi.import');
        importBtn.onclick = () => this.handleAction();
        footer.appendChild(importBtn);
        container.appendChild(footer);

        return container;
    }

    async handleAction() {
        const jsonStr = this.parent.overlay.querySelector('#json-content').value.trim();
        if (!jsonStr) return notificationService.alert(t('creator.error.noJson'));
        try {
            const data = JSON.parse(jsonStr);
            if (!data.sentences) throw new Error(t('creator.error.missingSentences'));

            const title = "Imported " + new Date().toLocaleTimeString();
            const draft = {
                id: null,
                title,
                text: "",
                status: 'ready',
                data: data
            };
            this.parent.callbacks.onDraftCreated(draft, false);
            this.parent.close();
        } catch (e) {
            notificationService.alert(t('creator.error.invalidSchema', { error: e.message }));
        }
    }

    async copySystemPrompt() {
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS);
        const activeProfile = settings?.profiles?.[settings?.activeProfileId] || {};
        const mode = activeProfile.builderMode || '2';

        const schema = `{
  "sentences": [
    {
      "original_text": "text",
      "translation": "translation",
      "explanation": "concise explanation (Mode 3 Only)",
      "segments": [ ["word", "pos", "lemma"] ]
    }
  ]
}`;

        let systemInstruction = "";
        switch (mode) {
            case '1':
                systemInstruction = "Role: Translator. Output strictly valid JSON. Fields: original_text, translation. NO segments, NO explanation.";
                break;
            case '3':
                systemInstruction = "Role: Deep Analysis Specialist. Provide technical linguistic data (SG) and an insightful pedagogical explanation (EX) for a deep learner.";
                break;
            case '2':
            default:
                systemInstruction = "Role: Analysis Specialist. Provide technical linguistic data (SG). The explanation (EX) field should be concise or empty.";
                break;
        }

        let content = this.parent.overlay.querySelector('#draft-content')?.value.trim();
        if (!content && this.parent.initialData?.rawText) content = this.parent.initialData.rawText;

        let prompt = `${systemInstruction}\n\nSchema:\n${schema}`;
        if (content) {
            prompt += `\n\nInput Text:\n${content}\n\nOutput JSON:`;
        } else {
            prompt += `\n\n(Paste your text here)`;
        }

        navigator.clipboard.writeText(prompt);
        const btn = this.parent.overlay.querySelector('#copy-prompt-btn');
        const originalText = btn.textContent;
        const modeLabels = { '1': t('settings.mode.translation'), '2': t('settings.mode.standard'), '3': t('settings.mode.deep') };
        btn.textContent = t('creator.manualAi.copied', { mode: modeLabels[mode] });
        setTimeout(() => btn.textContent = originalText, 2000);
    }
}

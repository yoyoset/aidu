import { Component } from '../../components/component.js';
import { StorageHelper, StorageKeys } from '../../../utils/storage.js';
import styles from './creator.module.css';
import { t } from '../../../locales/index.js';
import { notificationService } from '../../../utils/notification_service.js';

export class CreatorModal extends Component {
    constructor(element, callbacks) {
        super(element);
        this.callbacks = callbacks || {}; // { onDraftCreated: (draft, autoStart) => {} }
        this.activeTab = 'text'; // 'text' or 'json'

        // Context Data (Pre-fill)
        this.initialData = null;
    }

    show(data = null) {
        this.initialData = data; // Keep as null if undefined
        this.activeTab = (this.initialData && this.initialData.mode === 'manual_ai') ? 'manual_ai' : 'text';
        this.render();
    }

    render() {
        if (this.overlay) this.overlay.remove();

        const overlay = document.createElement('div');
        overlay.className = styles.modalOverlay;
        overlay.onclick = (e) => { if (e.target === overlay) this.close(); };

        const content = document.createElement('div');
        content.className = styles.modalContent;
        // Store for later access
        this.modalContent = content;

        // 1. Header
        const header = document.createElement('div');
        header.className = styles.modalHeader;

        const headerLeft = document.createElement('div');
        headerLeft.className = styles.headerLeft;
        const title = document.createElement('h3');
        title.className = styles.modalTitle;
        // Logic: If initialData exists and has ID -> Edit. Else -> Create.
        title.textContent = (this.initialData && this.initialData.id) ? t('creator.edit') : t('creator.create');
        headerLeft.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.className = styles.closeBtn;
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => this.close();

        header.appendChild(headerLeft);
        header.appendChild(closeBtn);
        content.appendChild(header);

        // 2. Tabs
        const tabs = document.createElement('div');
        tabs.className = styles.tabs;
        ['text', 'manual_ai'].forEach(mode => {
            const btn = document.createElement('button');
            btn.className = `${styles.tab} ${this.activeTab === mode ? styles.active : ''}`;
            btn.dataset.tab = mode;
            btn.textContent = mode === 'text' ? t('creator.tab.content') : t('creator.tab.manualAi');
            btn.onclick = () => {
                // Save state before switching logic
                if (this.activeTab === 'text') {
                    const titleInput = this.overlay.querySelector('#draft-title');
                    const contentInput = this.overlay.querySelector('#draft-content');
                    if (titleInput && contentInput) {
                        const valTitle = titleInput.value;
                        const valText = contentInput.value;
                        // Ensure initialData object exists
                        if (!this.initialData) this.initialData = {};
                        this.initialData.title = valTitle;
                        this.initialData.rawText = valText;
                    }
                }

                this.activeTab = mode;
                this.render();
            };
            tabs.appendChild(btn);
        });
        content.appendChild(tabs);

        // 3. Tab Content
        const tabContent = document.createElement('div');
        tabContent.className = styles.tabContent;
        if (this.activeTab === 'text') {
            tabContent.appendChild(this.createSafeTextTab());
        } else {
            tabContent.appendChild(this.createSafeManualAiTab());
        }
        content.appendChild(tabContent);

        overlay.appendChild(content);
        this.element.appendChild(overlay);
        this.overlay = overlay;
    }

    createSafeTextTab() {
        const container = document.createDocumentFragment();

        // Title Input
        const group1 = document.createElement('div');
        group1.className = styles.formGroup;
        const label1 = document.createElement('label');
        label1.className = styles.label;
        label1.textContent = t('creator.title');
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'draft-title';
        input.className = styles.input;
        input.placeholder = t('creator.title.placeholder');
        input.value = this.initialData?.title || '';
        group1.appendChild(label1);
        group1.appendChild(input);
        container.appendChild(group1);

        // Content Textarea
        const group2 = document.createElement('div');
        group2.className = `${styles.formGroup} ${styles.flexGrow}`;
        const label2 = document.createElement('label');
        label2.className = styles.label;
        label2.textContent = t('creator.content');
        const textarea = document.createElement('textarea');
        textarea.id = 'draft-content';
        textarea.className = styles.textarea;
        textarea.placeholder = t('creator.content.placeholder');
        textarea.value = this.initialData?.rawText || '';
        group2.appendChild(label2);
        group2.appendChild(textarea);
        container.appendChild(group2);

        // Footer
        const footer = document.createElement('div');
        footer.className = `${styles.footer} ${styles.triActionFooter}`; // Updated class for 3 buttons

        // Check ID to confirm Edit Mode
        const isEdit = !!(this.initialData && this.initialData.id);

        // 1. Save (Left)
        const queueBtn = document.createElement('button');
        queueBtn.id = 'queue-btn';
        queueBtn.className = `${styles.btnSecondary} ${styles.btnLeft}`;
        queueBtn.innerHTML = `<i class="ri-save-line" style="margin-right:6px;"></i> ${t('creator.save')}`;
        queueBtn.onclick = () => this.handleTextAction(false);

        // 2. Simple Analysis (Middle)
        const simpleBtn = document.createElement('button');
        simpleBtn.id = 'simple-analyze-btn';
        simpleBtn.className = `${styles.btnPrimary} ${styles.btnMiddle}`;
        simpleBtn.innerHTML = `<i class="ri-flashlight-line" style="margin-right:6px;"></i> ${t('creator.analyze.simple')}`;
        simpleBtn.onclick = () => {
            // Force Mode 2 for Simple
            this.handleTextActionWithMode(true, 'realtime', '2');
        };

        // 3. Deep Analysis (Right)
        const deepBtn = document.createElement('button');
        deepBtn.id = 'deep-analyze-btn';
        deepBtn.className = `${styles.btnPrimary} ${styles.btnRight}`;
        deepBtn.innerHTML = `<i class="ri-magic-line" style="margin-right:6px;"></i> ${t('creator.analyze.deep')}`;
        deepBtn.onclick = () => {
            // Force Mode 3 for Deep
            this.handleTextActionWithMode(true, 'realtime', '3');
        };

        footer.appendChild(queueBtn);
        footer.appendChild(simpleBtn);
        footer.appendChild(deepBtn);
        container.appendChild(footer);

        return container;
    }

    createSafeManualAiTab() {
        const container = document.createDocumentFragment();

        // Helper Section
        const helper = document.createElement('div');
        helper.className = styles.helperSection;
        const textDiv = document.createElement('div');
        textDiv.className = styles.helperText;
        textDiv.innerHTML = `<strong>${t('creator.manualAi.title')}</strong><br><small>${t('creator.manualAi.steps')}</small>`;

        const copyBtn = document.createElement('button');
        copyBtn.id = 'copy-prompt-btn';
        copyBtn.className = styles.btnPrimary; // Prominent
        copyBtn.textContent = t('creator.manualAi.copy');
        copyBtn.onclick = () => this.copySystemPrompt();

        helper.appendChild(textDiv);
        helper.appendChild(copyBtn);
        container.appendChild(helper);

        // Textarea
        const wrapper = document.createElement('div');
        wrapper.className = styles.textareaWrapper;
        const textarea = document.createElement('textarea');
        textarea.id = 'json-content';
        textarea.className = `${styles.textarea} ${styles.codeArea}`;
        textarea.placeholder = t('creator.manualAi.placeholder');
        wrapper.appendChild(textarea);
        container.appendChild(wrapper);

        // Footer
        const footer = document.createElement('div');
        footer.className = styles.footer;
        const importBtn = document.createElement('button');
        importBtn.id = 'import-btn';
        importBtn.className = styles.btnPrimary;
        importBtn.textContent = t('creator.manualAi.import');
        importBtn.onclick = () => this.handleJsonAction();
        footer.appendChild(importBtn);
        container.appendChild(footer);

        return container;
    }

    async handleTextAction(autoStart, mode = 'realtime') {
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS);
        const activeProfile = settings?.profiles?.[settings?.activeProfileId] || {};
        const defaultMode = activeProfile.builderMode || '3';
        return this.handleTextActionWithMode(autoStart, mode, defaultMode);
    }

    async handleTextActionWithMode(autoStart, mode, analysisMode) {
        const titleInput = this.overlay.querySelector('#draft-title');
        const contentInput = this.overlay.querySelector('#draft-content');

        const title = titleInput?.value.trim() || t('dashboard.draft.untitled');
        const text = contentInput?.value.trim();

        if (!text) return notificationService.alert(t('creator.error.noContent'));

        const status = autoStart ? 'processing' : 'draft';
        const draft = await this.createDraftObject(title, text, status);
        draft.analysisMode = analysisMode; // Use specific mode

        this.callbacks.onDraftCreated(draft, autoStart, mode);
        this.close();
    }

    async handleJsonAction() {
        // Implementation for JSON Import
        const jsonStr = this.overlay.querySelector('#json-content').value.trim();
        if (!jsonStr) return notificationService.alert(t('creator.error.noJson'));
        try {
            const data = JSON.parse(jsonStr);
            // Basic Schema Check based on D.2
            if (!data.sentences) throw new Error(t('creator.error.missingSentences'));

            const title = "Imported " + new Date().toLocaleTimeString();
            const draft = await this.createDraftObject(title, "", 'ready');
            draft.data = data; // Bypass API
            this.callbacks.onDraftCreated(draft, false);
            this.close();
        } catch (e) {
            notificationService.alert(t('creator.error.invalidSchema', { error: e.message }));
        }
    }

    async createDraftObject(title, text, status, forceNewId = false) {
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS);
        const activeProfile = settings?.profiles?.[settings?.activeProfileId] || {};

        const id = (forceNewId || !this.initialData?.id) ? crypto.randomUUID() : this.initialData.id;
        const createdAt = (forceNewId || !this.initialData?.createdAt) ? Date.now() : this.initialData.createdAt;

        return {
            id: id,
            title: title,
            rawText: text,
            status: status,
            analysisMode: activeProfile.builderMode || '3',
            createdAt: createdAt,
            updatedAt: Date.now(),
            data: null, // Cooked Meat
            progress: { current: 0, total: 0 }
        };
    }

    async copySystemPrompt() {
        // 1. Get Settings for Builder Mode
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS);
        const activeProfile = settings?.profiles?.[settings?.activeProfileId] || {};
        const mode = activeProfile.builderMode || '2'; // Default to Standard

        // 2. Define Prompts (Synced with Data Standard D.2)
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
            case '1': // Translation
                systemInstruction = "Role: Translator. Output strictly valid JSON. Fields: original_text, translation. NO segments, NO explanation.";
                break;
            case '3': // Deep
                systemInstruction = "Role: Literature Professor. Analyze text with depth. Required: translation, segments (pos, lemma), and explanation (cultural/rhetoric context). Mark Stop Words (be, is) as 'STOP' in pos.";
                break;
            case '2': // Standard
            default:
                systemInstruction = "Role: Linguist. Analyze text. Required: translation, segments (pos, lemma). NO explanation.";
                break;
        }

        // Smart Copy: Validation Schema + Content
        let content = this.overlay.querySelector('#draft-content')?.value.trim();
        // Guard against null initialData
        if (!content && this.initialData?.rawText) content = this.initialData.rawText;

        let prompt = `${systemInstruction}\n\nSchema:\n${schema}`;

        if (content) {
            prompt += `\n\nInput Text:\n${content}\n\nOutput JSON:`;
        } else {
            prompt += `\n\n(Paste your text here)`;
        }

        navigator.clipboard.writeText(prompt);
        const btn = this.overlay.querySelector('#copy-prompt-btn');
        const originalText = btn.textContent;
        // Mode Name defined in Settings (1=Trans, 2=Std, 3=Deep)
        const modeLabels = { '1': t('settings.mode.translation'), '2': t('settings.mode.standard'), '3': t('settings.mode.deep') };
        btn.textContent = t('creator.manualAi.copied', { mode: modeLabels[mode] });
        setTimeout(() => btn.textContent = originalText, 2000);
    }

    showRealtimeOverlay(draftId, onComplete) {
        let overlay = document.querySelector('.aidu-realtime-overlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.className = 'aidu-realtime-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: var(--md-sys-color-surface); display: flex;
            flex-direction: column; align-items: center; justify-content: center;
            z-index: 99999; backdrop-filter: blur(10px);
        `;

        overlay.innerHTML = `
            <div style="font-size: 2.5rem; color: var(--md-sys-color-primary); margin-bottom: 20px;">
                <i class="ri-loader-4-line ri-spin"></i>
            </div>
            <h2 style="margin: 0; color: var(--md-sys-color-on-surface); font-weight: 600;">处理中...</h2>
            
            <div style="width: 300px; height: 6px; background: var(--md-sys-color-surface-variant); border-radius: 3px; margin-top: 30px; overflow: hidden;">
                <div class="progress-bar-fill" style="width: 5%; height: 100%; background: var(--md-sys-color-primary); transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);"></div>
            </div>
            
            <button id="cancel-overlay-btn" style="margin-top: 40px; border: 1px solid var(--md-sys-color-outline-variant); background: transparent; color: var(--md-sys-color-on-surface-variant); padding: 8px 24px; border-radius: 20px; cursor: pointer;">
                ${t('common.close')}
            </button>
        `;

        overlay.querySelector('#cancel-overlay-btn').onclick = () => {
            overlay.remove();
            notificationService.toast(t('creator.bgProcess.toast'));
        };

        const target = this.modalContent || document.body;
        target.appendChild(overlay);

        const onProgress = (changes, area) => {
            if (area === 'local' && changes[StorageKeys.BUILDER_DRAFTS]) {
                StorageHelper.get(StorageKeys.BUILDER_DRAFTS).then(drafts => {
                    const draftList = Object.values(drafts || {});
                    const draft = draftList.find(d => d.id === draftId);
                    if (draft && draft.progress) {
                        const pct = draft.progress.percentage || 0;
                        const fill = overlay.querySelector('.progress-bar-fill');
                        if (fill) fill.style.width = `${pct}%`;

                        if (draft.status === 'ready' || draft.status === 'error') {
                            chrome.storage.onChanged.removeListener(onProgress);
                            if (draft.status === 'ready' && onComplete) {
                                setTimeout(() => { overlay.remove(); onComplete(); }, 500);
                            } else {
                                overlay.remove();
                                if (draft.status === 'error') notificationService.alert(t('creator.error.general'));
                            }
                        }
                    }
                });
            }
        };
        chrome.storage.onChanged.addListener(onProgress);
    }

    close() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}

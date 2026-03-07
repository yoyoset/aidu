import { t } from '../../../../locales/index.js';
import styles from '../creator.module.css';
import navStyles from '../styles/dashboard_nav.module.css';
import { StorageHelper, StorageKeys } from '../../../../utils/storage.js';
import { notificationService } from '../../../../utils/notification_service.js';

export class TextImporter {
    constructor(parent) {
        this.parent = parent;
    }

    render() {
        const container = document.createDocumentFragment();

        // Title Input
        const group1 = document.createElement('div');
        group1.className = styles['form-group'];
        const label1 = document.createElement('label');
        label1.className = styles.label;
        label1.textContent = t('creator.title');
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'draft-title';
        input.className = styles.input;
        input.placeholder = t('creator.title.placeholder');
        input.value = this.parent.initialData?.title || '';
        group1.appendChild(label1);
        group1.appendChild(input);
        container.appendChild(group1);

        // Content Textarea Wrapper
        const group2 = document.createElement('div');
        group2.className = `${styles['form-group']} ${styles['flex-grow']}`;
        const label2 = document.createElement('label');
        label2.className = styles.label;
        label2.textContent = t('creator.content');

        const wrapper = document.createElement('div');
        wrapper.className = styles['textarea-wrapper'];

        const textarea = document.createElement('textarea');
        textarea.id = 'draft-content';
        textarea.className = styles.textarea;
        textarea.placeholder = t('creator.content.placeholder');
        textarea.value = this.parent.initialData?.rawText || '';

        const counter = document.createElement('div');
        counter.className = styles['word-count'];

        const updateCount = () => {
            const text = textarea.value.trim();
            const chars = text.length;
            const words = text ? (text.match(/[\u4e00-\u9fa5]|\b\w+\b/g) || []).length : 0;
            counter.textContent = `${words} words | ${chars} chars`;
        };

        textarea.oninput = updateCount;
        updateCount(); // Initial count

        wrapper.appendChild(textarea);
        wrapper.appendChild(counter);

        group2.appendChild(label2);
        group2.appendChild(wrapper);
        container.appendChild(group2);

        // Footer with Save and Cancel only
        const footer = document.createElement('div');
        footer.className = styles.footer;

        const cancelBtn = document.createElement('button');
        cancelBtn.className = navStyles['btn-secondary'];
        cancelBtn.textContent = t('common.cancel');
        cancelBtn.onclick = () => this.parent.close();

        const saveBtn = document.createElement('button');
        saveBtn.className = navStyles['btn-primary'];
        saveBtn.innerHTML = `<i class="ri-save-line" style="margin-right:6px;"></i> ${t('common.save')}`;
        saveBtn.onclick = () => this.handleAction(false);

        const simpleBtn = document.createElement('button');
        simpleBtn.className = navStyles['btn-secondary'];
        simpleBtn.style.marginLeft = 'auto'; // Push analysis buttons right
        simpleBtn.innerHTML = `<i class="ri-play-line"></i> ${t('creator.analyze.simple')}`;
        simpleBtn.onclick = () => this.handleAction(true, 'simple');

        const deepBtn = document.createElement('button');
        deepBtn.className = navStyles['btn-primary'];
        deepBtn.innerHTML = `<i class="ri-sparkling-fill"></i> ${t('creator.analyze.deep')}`;
        deepBtn.onclick = () => this.handleAction(true, 'deep');

        footer.appendChild(cancelBtn);
        footer.appendChild(saveBtn);
        footer.appendChild(simpleBtn);
        footer.appendChild(deepBtn);
        container.appendChild(footer);

        return container;
    }

    async handleAction(autoStart, mode = 'simple') {
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS);
        const activeProfile = settings?.profiles?.[settings?.activeProfileId] || {};

        // Mode mapping:
        // simple -> realtimeMode
        // deep -> builderMode
        let analysisMode = 2;
        if (mode === 'deep') {
            analysisMode = parseInt(activeProfile.builderMode || '3');
        } else {
            analysisMode = parseInt(activeProfile.realtimeMode || '2');
        }

        return this.handleActionWithMode(autoStart, mode, analysisMode);
    }

    async handleActionWithMode(autoStart, mode, analysisMode) {
        const titleInput = this.parent.overlay.querySelector('#draft-title');
        const contentInput = this.parent.overlay.querySelector('#draft-content');

        const title = titleInput?.value.trim() || t('dashboard.draft.untitled');
        const text = contentInput?.value.trim();

        if (!text) return notificationService.alert(t('creator.error.noContent'));

        const data = {
            id: this.parent.initialData?.id || null,
            title,
            text,
            analysisMode
        };

        if (autoStart) {
            this.parent.animateShrink(() => {
                this.parent.callbacks.onDraftCreated(data, autoStart, mode);
                this.parent.close();
            });
        } else {
            this.parent.callbacks.onDraftCreated(data, autoStart, mode);
            this.parent.close();
        }
    }
}

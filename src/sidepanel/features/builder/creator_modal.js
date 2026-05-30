import { Component } from '../../components/component.js';
import { StorageHelper, StorageKeys } from '../../../utils/storage.js';
import styles from './creator.module.css';
import navStyles from './styles/dashboard_nav.module.css';
import { t } from '../../../locales/index.js';
import { notificationService } from '../../../utils/notification_service.js';
import { logger } from '../../../utils/logger.js';

// Components
import { TextImporter } from './components/text_importer.js';
import { JsonImporter } from './components/json_importer.js';
import { AnalysisOverlay } from './components/analysis_overlay.js';

export class CreatorModal extends Component {
    constructor(element, callbacks) {
        super(element);
        this.callbacks = callbacks || {}; // { onDraftCreated: (draft, autoStart) => {} }
        this.activeTab = 'text'; // 'text' or 'json'

        // Context Data (Pre-fill)
        this.initialData = null;

        // Sub-modules
        this.textImporter = new TextImporter(this);
        this.jsonImporter = new JsonImporter(this);
        this.analysisOverlay = new AnalysisOverlay(this);
        this.isManualAction = false;
    }

    show(data = null) {
        this.initialData = data; // Keep as null if undefined
        this.activeTab = (this.initialData && this.initialData.mode === 'manual_ai') ? 'manual_ai' : 'text';
        this.isManualAction = false; // Reset on show
        this.render();
    }

    render() {
        // 1. Structural Skeleton (Only once)
        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.className = styles['modal-overlay'];
            this.overlay.onclick = (e) => { if (e.target === this.overlay) this.close(); };

            const content = document.createElement('div');
            content.className = styles['modal-content'];
            this.modalContent = content;

            // Header
            const header = document.createElement('div');
            header.className = styles['modal-header'];
            const headerLeft = document.createElement('div');
            headerLeft.className = styles['header-left'];
            this.titleEl = document.createElement('h3');
            this.titleEl.className = styles['modal-title'];
            headerLeft.appendChild(this.titleEl);

            const closeBtn = document.createElement('button');
            closeBtn.className = styles['close-btn'];
            closeBtn.innerHTML = '&times;';
            closeBtn.onclick = () => this.close();

            header.appendChild(headerLeft);
            header.appendChild(closeBtn);
            content.appendChild(header);

            // Tab Bar
            this.tabBar = document.createElement('div');
            this.tabBar.className = navStyles['filter-tabs'];
            this.tabBar.style.padding = '0 24px';
            this.tabBar.style.margin = '0';
            content.appendChild(this.tabBar);

            // Scrollable Content area
            this.tabContentEl = document.createElement('div');
            this.tabContentEl.className = styles['tab-content'];
            content.appendChild(this.tabContentEl);

            this.overlay.appendChild(content);
            this.element.appendChild(this.overlay);
        }

        // 2. Update Header Title
        this.titleEl.textContent = (this.initialData && this.initialData.id) ? t('creator.edit') : t('creator.create');

        // 3. Update Tabs
        this.tabBar.innerHTML = '';
        ['text', 'manual_ai'].forEach(mode => {
            const btn = document.createElement('button');
            btn.className = `${navStyles['filter-tab']} ${this.activeTab === mode ? navStyles.active : ''}`;
            btn.textContent = mode === 'text' ? t('creator.tab.content') : t('creator.tab.manualAi');
            btn.onclick = () => {
                if (this.activeTab === 'text') {
                    const titleInput = this.overlay.querySelector('#draft-title');
                    const contentInput = this.overlay.querySelector('#draft-content');
                    if (titleInput && contentInput) {
                        if (!this.initialData) this.initialData = {};
                        this.initialData.title = titleInput.value;
                        this.initialData.rawText = contentInput.value;
                    }
                }
                this.activeTab = mode;
                this.render();
            };
            this.tabBar.appendChild(btn);
        });

        // 4. Update Tab Content
        this.tabContentEl.innerHTML = '';
        if (this.activeTab === 'text') {
            this.tabContentEl.appendChild(this.textImporter.render());
        } else {
            this.tabContentEl.appendChild(this.jsonImporter.render());
        }
    }

    animateShrink(callback) {
        if (this.modalContent) {
            this.modalContent.classList.add(styles['shrink-out']);
            setTimeout(callback, 400);
        } else {
            callback();
        }
    }

    // Simplified! Redundant methods removed. Logic moved to components.

    showRealtimeOverlay(draftId, onComplete) {
        this.analysisOverlay.show(draftId, onComplete);
    }

    close() {
        if (!this.isManualAction && this.activeTab === 'text') {
            const titleInput = this.overlay.querySelector('#draft-title');
            const contentInput = this.overlay.querySelector('#draft-content');
            const text = contentInput?.value.trim();
            
            // Only auto-save if there's actual content
            if (text && text.length > 5) {
                console.log('CreatorModal: Auto-saving draft before close...');
                const data = {
                    id: this.initialData?.id || null,
                    title: titleInput?.value.trim() || t('dashboard.draft.untitled'),
                    text: text
                };
                if (this.callbacks.onDraftCreated) {
                    this.callbacks.onDraftCreated(data, false);
                }
            }
        }

        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}

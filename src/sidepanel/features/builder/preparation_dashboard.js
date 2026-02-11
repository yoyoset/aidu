import { Component } from '../../components/component.js';
import { ThemeModal } from '../settings/theme_modal.js';
import { StorageHelper, StorageKeys } from '../../../utils/storage.js';
import layoutStyles from './styles/dashboard_layout.module.css';
import itemStyles from './styles/dashboard_items.module.css';
import { SettingsModal } from '../settings/settings_modal.js';
import { MessageRouter, MessageTypes } from '../../../utils/message_router.js';
import { CreatorModal } from './creator_modal.js';
import { ReaderView } from '../reader/reader_view.js';
import { ConfirmationModal } from '../../components/confirmation_modal.js';
import { VocabView } from '../vocab/vocab_view.js';
import { vocabService } from '../../../services/vocab_service.js';
import { SyncService } from '../../../services/sync_service.js';
import { t } from '../../../locales/index.js';
import { notificationService } from '../../../utils/notification_service.js';

// Sub-Modules
import { DraftListRenderer } from './components/draft_list_renderer.js';
import { ReviewSessionManager } from './components/review_session_manager.js';
import { DashboardHandlers } from './components/dashboard_handlers.js';
import { DashboardHeader } from './components/dashboard_header.js';

export class PreparationDashboard extends Component {
    constructor(element, messageRouter) {
        super(element);
        this.drafts = [];
        this.activeTab = 'library';
        this.currentFilter = 'draft';
        this.selectedDrafts = new Set();

        // Persistent UI Elements
        this.container = null;
        this.header = null;
        this.headerAlignmentWrapper = null;
        this.bodyContainer = null;
        this.contentArea = null;

        // Specialized Managers
        this.reviewManager = new ReviewSessionManager();
        this.handlers = new DashboardHandlers(this);
        this.headerComponent = null;
        this.messageRouter = messageRouter;

        this.init();
    }

    async init() {
        const modalContainer = document.querySelector('body');

        try {
            const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
            this.themeModal = new ThemeModal(modalContainer);
            this.themeModal.initTheme();

            if (settings.activeProfileId) {
                const profileExists = settings.profiles?.[settings.activeProfileId];
                if (!profileExists && settings.activeProfileId !== 'default') {
                    settings.activeProfileId = 'default';
                    await StorageHelper.set(StorageKeys.USER_SETTINGS, settings);
                }
                vocabService.setProfile(settings.activeProfileId);
            }
        } catch (e) {
            console.error('Failed to load profile settings', e);
        }

        this.settingsModal = new SettingsModal(modalContainer);
        this.creatorModal = new CreatorModal(modalContainer, {
            onDraftCreated: (draft, autoStart) => this.handlers.handleNewDraft(draft, autoStart)
        });
        this.confirmationModal = new ConfirmationModal(modalContainer);

        const readerRoot = document.getElementById('reader-root');
        this.readerView = new ReaderView(readerRoot, {
            onExit: async () => {
                this.readerView.hide();
                this.element.style.display = 'block';
                readerRoot.style.display = 'none';
                this.render();
                this.checkSyncStatus();
            }
        });

        await this.loadDrafts();
        this.setupStorageListener();
        this.setupMessageListener();
        this.updateSyncBadge();
    }

    setupMessageListener() {

        if (!this.messageRouter) return;

        this.messageRouter.on(MessageTypes.OPEN_CREATOR_MODAL, (payload) => {
            console.log('Sidepanel: Received request to open creator modal');
            const { text, title } = payload;
            this.creatorModal.show({
                title: title || '',
                rawText: text,
                mode: 'new'
            });
            return { success: true };
        });

    }

    async checkSyncStatus() {
        const status = await SyncService.getSyncStatus();
        const lastSync = status.lastSyncAt || 0;
        const hoursSince = (Date.now() - lastSync) / 3600000;

        if (hoursSince > 1) {
            notificationService.info(t('dashboard.sync.recommend'));
        }
    }

    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local') {
                if (changes[StorageKeys.BUILDER_DRAFTS]) {
                    this.loadDrafts();
                }
                if (changes[StorageKeys.USER_SETTINGS]) {
                    this.updateSyncBadge();
                }
            }
        });
    }

    async updateSyncBadge() {
        const btn = document.getElementById('sync-status-btn');
        const badge = document.getElementById('sync-badge');
        if (!btn || !badge) return;

        const status = await SyncService.getSyncStatus();
        badge.style.display = 'none';
        badge.classList.remove('pending', 'error');

        if (status.lastSyncResult === 'error') {
            badge.style.display = 'block';
            badge.classList.add('error');
            btn.title = `Sync Error: ${status.lastError}`;
        } else {
            const hours = status.lastSyncAt ? (Date.now() - status.lastSyncAt) / 3600000 : 999;
            if (hours > 24) {
                badge.style.display = 'block';
                badge.classList.add('pending');
                btn.title = t('dashboard.sync.notRecent');
            } else {
                btn.title = t('dashboard.sync.lastSync', { time: new Date(status.lastSyncAt).toLocaleString() });
            }
        }
    }

    async loadDrafts() {
        const stored = await StorageHelper.get(StorageKeys.BUILDER_DRAFTS);
        if (stored && !Array.isArray(stored)) {
            this.drafts = Object.values(stored).filter(d => d !== null);
        } else {
            this.drafts = (stored || []).filter(d => d !== null);
        }
        this.render();
    }

    async render() {
        // 1. Structural Skeleton (Only Once)
        if (!this.container) {
            this.clear();
            this.container = document.createElement('div');
            this.container.className = layoutStyles['dashboard-container'];

            this.header = document.createElement('header');
            this.header.className = layoutStyles['dashboard-header'];

            // Unified Alignment Wrapper for Header
            this.headerAlignmentWrapper = document.createElement('div');
            this.headerAlignmentWrapper.className = `${layoutStyles['header-inner']} ${layoutStyles['content-inner']}`;
            this.header.appendChild(this.headerAlignmentWrapper);
            this.container.appendChild(this.header);

            // Unified Alignment Wrapper for Body
            this.bodyContainer = document.createElement('div');
            this.bodyContainer.className = `${layoutStyles['dashboard-body']} ${layoutStyles['content-inner']}`;
            this.container.appendChild(this.bodyContainer);

            this.contentArea = document.createElement('div');
            this.bodyContainer.appendChild(this.contentArea);

            this.element.appendChild(this.container);

            // Initialize Header Component
            this.headerComponent = new DashboardHeader(this, this.headerAlignmentWrapper);
        }

        // 2. Refresh Header UI
        this.headerComponent.render();

        // 3. Refresh Content Area
        this.contentArea.innerHTML = '';

        if (this.activeTab === 'library') {
            const listContainer = document.createElement('div');
            this.contentArea.appendChild(listContainer);

            this.listRenderer = new DraftListRenderer(listContainer);
            const filteredDrafts = this.getFilteredDrafts();
            const sortedDrafts = filteredDrafts.sort((a, b) => b.updatedAt - a.updatedAt);

            this.listRenderer.render(sortedDrafts, {
                onEdit: (d) => this.handlers.handleEdit(d),
                onDelete: (d) => this.handlers.handleDelete(d),
                onAction: (d, mode, analysisMode) => this.handlers.handleAction(d, mode, analysisMode),
                onManualAi: (d) => this.creatorModal.show({
                    title: d.title || '',
                    rawText: d.rawText,
                    mode: 'manual_ai',
                    id: d.id,
                    createdAt: d.createdAt
                }),
                onReset: (d) => this.handlers.handleReset(d),
                onToggleSelection: (id, checked) => {
                    if (checked) this.selectedDrafts.add(id);
                    else this.selectedDrafts.delete(id);
                    this.render();
                },
                isSelected: (id) => this.selectedDrafts.has(id),
                onFilterChange: (filter) => {
                    this.currentFilter = filter;
                    this.selectedDrafts.clear();
                    this.render();
                }
            }, this.currentFilter);
        } else {
            const vocabContainer = document.createElement('div');
            this.contentArea.appendChild(vocabContainer);
            this.vocabView = new VocabView(vocabContainer);
            await this.vocabView.render();
        }
    }

    getFilteredDrafts() {
        const GRACE_PERIOD_MS = 120000; // 2 minutes
        const now = Date.now();

        return this.drafts.filter(d => {
            if (!d) return false;
            if (this.currentFilter === 'all') return true;
            if (this.currentFilter === 'draft') {
                return d.status === 'draft' || d.status === 'processing';
            }
            if (this.currentFilter === 'error') return d.status === 'error';
            return d.status === this.currentFilter;
        });
    }
}

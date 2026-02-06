import { Component } from '../../components/component.js';
import { ThemeModal } from '../settings/theme_modal.js';
import { StorageHelper, StorageKeys } from '../../../utils/storage.js';
import styles from './dashboard.module.css';
import { SettingsModal } from '../settings/settings_modal.js';
import { MessageRouter, MessageTypes } from '../../../utils/message_router.js';
import { CreatorModal } from './creator_modal.js';
import { ReaderView } from '../reader/reader_view.js';
import { ConfirmationModal } from '../../components/confirmation_modal.js';
import { VocabView } from '../vocab/vocab_view.js';
import { vocabService } from '../../../services/vocab_service.js';
import { SyncService } from '../../../services/sync_service.js';
import { Toast } from '../../components/toast.js';
import { showDonateModal } from '../../components/donate_modal.js';
import { t } from '../../../locales/index.js';
import { notificationService } from '../../../utils/notification_service.js';
import { logger } from '../../../utils/logger.js';

export class PreparationDashboard extends Component {
    constructor(element) {
        super(element);
        this.drafts = [];
        this.activeTab = 'library';
        this.settingsModal = null;
        this.creatorModal = null;
        this.confirmationModal = null;
        this.readerView = null;
        this.vocabView = null;

        this.currentFilter = 'draft';
        this.selectedDrafts = new Set();
        this.init();
    }

    async init() {
        const modalContainer = document.querySelector('body');

        // Load User Settings for Profile Context
        try {
            const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};

            // Apply Theme
            this.themeModal = new ThemeModal(modalContainer);
            this.themeModal.initTheme();

            // If no profile, it defaults to 'default' inside service
            if (settings.activeProfileId) {
                // Verify profile exists
                const profileExists = settings.profiles?.[settings.activeProfileId];
                if (!profileExists && settings.activeProfileId !== 'default') {
                    console.warn(`Dashboard: Profile '${settings.activeProfileId}' not found, fallback to default`);
                    settings.activeProfileId = 'default';
                    await StorageHelper.set(StorageKeys.USER_SETTINGS, settings);
                }

                console.log(`Dashboard: Initializing Vocab for profile '${settings.activeProfileId}'`);
                vocabService.setProfile(settings.activeProfileId);
            }
        } catch (e) {
            console.error('Failed to load profile settings', e);
        }

        this.settingsModal = new SettingsModal(modalContainer);
        this.creatorModal = new CreatorModal(modalContainer, {
            onDraftCreated: (draft, autoStart) => this.handleNewDraft(draft, autoStart)
        });
        this.confirmationModal = new ConfirmationModal(modalContainer);

        const readerRoot = document.getElementById('reader-root');
        this.readerView = new ReaderView(readerRoot, {
            onExit: async () => {
                this.readerView.hide();
                this.element.style.display = 'block';
                readerRoot.style.display = 'none';
                this.render();

                // Smart Sync Prompt: Check if we haven't synced in a while
                const status = await SyncService.getSyncStatus();
                // If never synced, or last sync > 1 hour ago
                const lastSync = status.lastSyncAt || 0;
                const hoursSince = (Date.now() - lastSync) / 3600000;

                if (hoursSince > 1) {
                    Toast.info(t('dashboard.sync.recommend'), {
                        action: {
                            label: t('dashboard.sync.now'),
                            onClick: async () => {
                                Toast.info(t('settings.sync.syncing'));
                                try {
                                    await SyncService.pull();
                                    await SyncService.push();
                                    Toast.success(t('dashboard.sync.success'));
                                    this.updateSyncBadge(); // Update global badge if visible
                                } catch (e) {
                                    Toast.error(t('dashboard.sync.failed', { error: e.message }));
                                }
                            }
                        },
                        duration: 5000
                    });
                }
            }
        });

        await this.loadDrafts();
        this.setupStorageListener();
        this.updateSyncBadge(); // Initial Check
    }

    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local') {
                if (changes[StorageKeys.BUILDER_DRAFTS]) {
                    this.loadDrafts();
                }
                if (changes[StorageKeys.USER_SETTINGS]) {
                    this.updateSyncBadge(); // Update badge on settings change (syncStatus)
                }
            }
        });
    }

    async updateSyncBadge() {
        const btn = document.getElementById('sync-status-btn');
        const badge = document.getElementById('sync-badge');
        if (!btn || !badge) return;

        const status = await SyncService.getSyncStatus();

        // Reset classes
        badge.style.display = 'none';
        badge.classList.remove('pending', 'error');

        // Logic: 
        // If error -> Red
        // If pending changes (TODO: detect pending) -> Yellow
        // For now, let's show Error if last result was error

        if (status.lastSyncResult === 'error') {
            badge.style.display = 'block';
            badge.classList.add('error');
            btn.title = `Sync Error: ${status.lastError}`;
        } else {
            // Optional: Show yellow if not synced for > 24h
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
            this.drafts = Object.values(stored);
        } else {
            this.drafts = stored || [];
        }
        this.render();
    }

    async render() {
        this.clear();
        const container = document.createElement('div');
        container.className = styles.dashboardContainer;

        this.renderHeader(container);

        if (this.activeTab === 'library') {
            this.renderDraftList(container);
        } else {
            const vocabContainer = document.createElement('div');
            container.appendChild(vocabContainer);
            this.vocabView = new VocabView(vocabContainer);
            await this.vocabView.render();
        }

        this.element.appendChild(container);
    }

    renderHeader(container) {
        const header = document.createElement('header');
        header.className = styles.dashboardHeader;
        header.style.display = 'flex';
        header.style.flexDirection = 'row'; // Force row layout
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.height = '60px';
        header.style.padding = '0 20px';

        const navDiv = document.createElement('div');
        navDiv.style.display = 'flex';
        navDiv.style.gap = '24px';
        navDiv.style.alignItems = 'center';

        const makeTab = (id, label) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.padding = '8px 0';
            btn.style.background = 'none';
            btn.style.border = 'none';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '1.05em';
            btn.style.borderBottom = this.activeTab === id ? '2px solid var(--md-sys-color-primary)' : '2px solid transparent';
            btn.style.color = this.activeTab === id ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-on-surface-variant)';
            btn.style.fontWeight = this.activeTab === id ? 'bold' : '500';
            btn.style.transition = 'all 0.2s';

            btn.onclick = () => {
                this.activeTab = id;
                this.render();
            };
            return btn;
        };

        navDiv.appendChild(makeTab('library', t('nav.library')));
        navDiv.appendChild(makeTab('vocab', t('nav.vocabulary')));
        header.appendChild(navDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.alignItems = 'center';
        actionsDiv.style.gap = '12px';

        const mergeBtn = document.createElement('button');
        mergeBtn.className = styles.iconBtn;
        mergeBtn.id = 'merge-btn';
        mergeBtn.title = t('dashboard.mergeSelected');
        mergeBtn.innerHTML = t('dashboard.merge');
        mergeBtn.style.display = 'none';
        mergeBtn.style.fontSize = '0.9em';
        mergeBtn.style.fontWeight = 'bold';
        mergeBtn.style.color = 'var(--md-sys-color-primary)';
        mergeBtn.style.background = 'var(--md-sys-color-primary-container)';
        mergeBtn.style.padding = '6px 12px';
        mergeBtn.style.borderRadius = 'var(--md-sys-radius-pill)';
        mergeBtn.style.width = 'auto';
        mergeBtn.onclick = () => this.handleMerge();
        actionsDiv.appendChild(mergeBtn);

        if (this.activeTab === 'library' && this.currentFilter === 'draft' && this.selectedDrafts.size > 1) {
            mergeBtn.style.display = 'inline-block';
            mergeBtn.textContent = `${t('dashboard.merge')} (${this.selectedDrafts.size})`;
        }

        if (this.activeTab === 'library') {
            const addBtn = document.createElement('button');
            addBtn.className = styles.iconBtn;
            addBtn.innerHTML = t('dashboard.new');
            addBtn.title = t('dashboard.addArticle');
            addBtn.style.background = '#2e7d32';
            addBtn.style.color = 'white';
            addBtn.style.fontWeight = 'bold';
            addBtn.style.fontSize = '0.9em';
            addBtn.style.padding = '6px 16px';
            addBtn.style.borderRadius = '20px';
            addBtn.style.width = 'auto';
            addBtn.onclick = () => this.creatorModal.show();
            actionsDiv.appendChild(addBtn);
        }

        // Palette Button
        const paletteBtn = document.createElement('button');
        paletteBtn.className = styles.iconBtn;
        paletteBtn.innerHTML = '<i class="ri-palette-line"></i>';
        paletteBtn.title = t('settings.appearance') || '调色盘';
        paletteBtn.onclick = () => {
            if (this.themeModal) this.themeModal.show();
        };
        actionsDiv.appendChild(paletteBtn);

        // Sync Button
        const syncBtn = document.createElement('button');
        syncBtn.className = styles.iconBtn;
        syncBtn.id = 'sync-status-btn';
        syncBtn.innerHTML = `
            <span class="sync-icon"><i class="ri-loop-right-line"></i></span>
            <span class="sync-badge" id="sync-badge"></span>
        `;
        syncBtn.title = t('dashboard.cloudSync');
        syncBtn.onclick = async () => {
            const btn = document.getElementById('sync-status-btn');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="ri-loader-2-line ri-spin"></i>'; // Loading state
            try {
                await SyncService.pull();
                await SyncService.push();
                Toast.success(t('dashboard.sync.success'));
                this.updateSyncBadge();
            } catch (e) {
                console.error(e);
                Toast.error(t('dashboard.sync.failed', { error: e.message }));
                this.updateSyncBadge();
            } finally {
                btn.innerHTML = originalHtml;
            }
        };
        actionsDiv.appendChild(syncBtn);

        // Donate Button
        const donateBtn = document.createElement('button');
        donateBtn.className = `${styles.iconBtn} ${styles.donateBtn}`;
        donateBtn.id = 'donate-btn';
        donateBtn.innerHTML = '<i class="ri-heart-3-fill"></i>';
        donateBtn.title = t('donate.title');
        donateBtn.onclick = () => showDonateModal();
        actionsDiv.appendChild(donateBtn);

        const settingsBtn = document.createElement('button');
        settingsBtn.className = styles.iconBtn;
        settingsBtn.id = 'settings-btn';
        settingsBtn.innerHTML = '<i class="ri-settings-4-line"></i>';
        settingsBtn.title = t('dashboard.settings');
        settingsBtn.onclick = () => this.settingsModal.show();
        actionsDiv.appendChild(settingsBtn);

        header.appendChild(actionsDiv);
        container.appendChild(header);
    }

    renderDraftList(container) {
        const filterDiv = document.createElement('div');
        filterDiv.className = styles.filterTabs;
        filterDiv.innerHTML = `
            <button class="${styles.filterTab} ${this.currentFilter === 'draft' ? styles.active : ''}" data-filter="draft">${t('dashboard.filter.library')}</button>
            <button class="${styles.filterTab} ${this.currentFilter === 'processing' ? styles.active : ''}" data-filter="processing">${t('dashboard.filter.processing')}</button>
            <button class="${styles.filterTab} ${this.currentFilter === 'ready' ? styles.active : ''}" data-filter="ready">${t('dashboard.filter.completed')}</button>
        `;
        container.appendChild(filterDiv);

        filterDiv.querySelectorAll(`.${styles.filterTab}`).forEach(btn => {
            btn.onclick = () => {
                this.currentFilter = btn.dataset.filter;
                this.selectedDrafts.clear();
                this.render();
            };
        });

        const list = document.createElement('div');
        list.className = styles.draftList;

        const filteredDrafts = this.drafts.filter(d => {
            if (this.currentFilter === 'draft') return d.status === 'draft' || d.status === 'error';
            return d.status === this.currentFilter;
        });

        const sortedDrafts = filteredDrafts.sort((a, b) => b.updatedAt - a.updatedAt);

        if (sortedDrafts.length === 0) {
            list.innerHTML = `<div class="${styles.emptyState}"><h3>${t('dashboard.empty')}</h3></div>`;
        } else {
            sortedDrafts.forEach(draft => {
                const item = this.createDraftItem(draft);
                list.appendChild(item);
            });
        }
        container.appendChild(list);
    }

    createDraftItem(draft) {
        const item = document.createElement('div');
        const statusClass = styles[`status${draft.status.charAt(0).toUpperCase() + draft.status.slice(1)}`] || '';
        item.className = `${styles.draftItem} ${statusClass}`;
        item.dataset.id = draft.id;

        if (draft.status === 'draft') {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = styles.draftCheckbox;
            checkbox.checked = this.selectedDrafts.has(draft.id);
            checkbox.onclick = (e) => {
                e.stopPropagation();
                if (checkbox.checked) this.selectedDrafts.add(draft.id);
                else this.selectedDrafts.delete(draft.id);
                this.render();
            };
            item.appendChild(checkbox);
        }

        const contentCol = document.createElement('div');
        contentCol.className = styles.draftContent;

        const header = document.createElement('div');
        header.className = styles.draftHeader;

        const titleDiv = document.createElement('div');
        titleDiv.className = styles.draftTitle;
        titleDiv.textContent = draft.title || t('dashboard.draft.untitled');
        header.appendChild(titleDiv);
        contentCol.appendChild(header);
        const actionsCol = document.createElement('div');
        actionsCol.className = styles.draftActions;

        // Edit Button: Available for all states (including Ready for renaming)
        if (draft.status === 'draft' || draft.status === 'error' || draft.status === 'processing' || draft.status === 'ready') {
            actionsCol.appendChild(this.createIconBtn('<i class="ri-edit-line"></i>', t('dashboard.draft.edit'), (e) => { e.stopPropagation(); this.handleEdit(draft); }));
        }

        // Processing Actions: Only for non-ready states
        if (draft.status === 'draft' || draft.status === 'error' || draft.status === 'processing') {
            actionsCol.appendChild(this.createIconBtn('<i class="ri-robot-line"></i>', t('dashboard.draft.manualAi'), (e) => {
                e.stopPropagation();
                this.creatorModal.show({
                    title: draft.title || '',
                    rawText: draft.rawText,
                    mode: 'manual_ai',
                    id: draft.id,
                    createdAt: draft.createdAt
                });
            }));
            actionsCol.appendChild(this.createIconBtn('<i class="ri-hourglass-2-line"></i>', t('dashboard.draft.bgProcess'), (e) => {
                e.stopPropagation();
                this.handleAction(draft, 'background');
            }));
        }
        actionsCol.appendChild(this.createIconBtn('<i class="ri-delete-bin-line"></i>', t('dashboard.draft.delete'), (e) => { e.stopPropagation(); this.handleDelete(draft); }));

        const preview = document.createElement('div');
        preview.className = styles.draftPreview;
        const raw = draft.rawText || '';
        preview.textContent = raw.substring(0, 120) + (raw.length > 120 ? '...' : '');
        contentCol.appendChild(preview);

        // Chunk Visualization (Parallel Progress)
        if (draft.data?.chunks && Array.isArray(draft.data.chunks) && typeof draft.data.chunks[0] === 'object') {
            const chunkGrid = document.createElement('div');
            chunkGrid.className = styles.chunkGrid;

            draft.data.chunks.forEach(chunk => {
                const block = document.createElement('div');
                const statusKey = `chunk${chunk.status.charAt(0).toUpperCase() + chunk.status.slice(1)}`;
                block.className = `${styles.chunkBlock} ${styles[statusKey] || styles.chunkPending}`;
                block.title = t('dashboard.draft.chunk', { index: chunk.index + 1, status: chunk.status.toUpperCase() });
                chunkGrid.appendChild(block);
            });
            contentCol.appendChild(chunkGrid);
        }

        const meta = document.createElement('div');
        meta.className = styles.draftMeta;
        const badge = document.createElement('span');
        badge.className = styles.badge;
        badge.textContent = draft.status.toUpperCase();
        meta.appendChild(badge);

        if (draft.createdAt) {
            const dateSpan = document.createElement('span');
            dateSpan.className = styles.dateText;
            dateSpan.textContent = new Date(draft.createdAt).toLocaleDateString();
            meta.appendChild(dateSpan);
        }
        if (draft.status === 'processing') {
            const progress = document.createElement('span');
            progress.className = styles.processingIndicator; // New Class
            // Add dots animation
            progress.innerHTML = `${draft.progress?.percentage || 0}% <span class="loading-dots"><i class="ri-more-line"></i></span>`;
            progress.style.cursor = 'pointer';
            progress.title = t('dashboard.draft.viewProgress');
            progress.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Re-open Overlay
                this.creatorModal.showRealtimeOverlay(draft.id, async () => {
                    await this.loadDrafts();
                    const updated = this.drafts.find(d => d.id === draft.id);
                    if (updated && updated.status === 'ready') {
                        this.handleAction(updated, 'read_partial');
                    }
                });
            };
            meta.appendChild(progress);
        }

        // Reading Time Tracker
        if (draft.status === 'ready') {
            const seconds = draft.readingTime || 0;
            const minutes = Math.floor(seconds / 60);
            const percentage = Math.min(100, (seconds / 3600) * 100);
            const isCapped = seconds >= 3600;

            const timeContainer = document.createElement('div');
            timeContainer.className = styles.readingTimeContainer;
            timeContainer.title = t('dashboard.draft.readingTime', { minutes }) || `已阅读 ${minutes} 分钟`;

            // Progress Bar
            const bar = document.createElement('div');
            bar.className = styles.readingProgressBar;

            const fill = document.createElement('div');
            fill.className = styles.readingProgressFill;
            fill.style.width = `${percentage}%`;

            if (isCapped) {
                fill.style.backgroundColor = '#F59E0B'; // Amber
            }

            bar.appendChild(fill);

            const text = document.createElement('span');
            text.className = styles.readingTimeText;
            text.textContent = ``;
            text.innerHTML = `<i class="ri-time-line" style="margin-right:4px;"></i>${minutes}m`;

            timeContainer.appendChild(bar);
            timeContainer.appendChild(text);
            meta.appendChild(timeContainer);
        }

        const actionArea = document.createElement('div');
        actionArea.className = styles.actionArea;
        const hasData = draft.data?.sentences?.length > 0;
        const isCorrupt = draft.status === 'ready' && !hasData;

        if (draft.status === 'ready' && !isCorrupt) {
            const btn = document.createElement('button');
            btn.className = styles.btnPrimary;
            btn.textContent = t('dashboard.draft.readNow');
            btn.onclick = () => this.handleAction(draft);
            actionArea.appendChild(btn);
        } else if (draft.status === 'draft') {
            const btn = document.createElement('button');
            btn.className = styles.btnPrimary;
            btn.innerHTML = t('dashboard.draft.startAnalysis');
            btn.onclick = () => this.handleAction(draft);
            actionArea.appendChild(btn);
        } else if (draft.status === 'error') {
            const retryBtn = document.createElement('button');
            retryBtn.className = styles.btnDestructive;
            retryBtn.innerHTML = t('dashboard.draft.resume');
            retryBtn.onclick = () => this.handleAction(draft, 'retry');
            actionArea.appendChild(retryBtn);

            if (hasData) {
                const readBtn = document.createElement('button');
                readBtn.className = styles.btnSecondary;
                readBtn.innerHTML = t('dashboard.draft.readPartial');
                readBtn.onclick = () => this.handleAction(draft, 'read_partial');
                actionArea.appendChild(readBtn);
            }
        } else if (draft.status === 'processing') {
            // 1. View Progress (Primary Action for Processing)
            const viewBtn = document.createElement('button');
            viewBtn.className = styles.btnGhost; // New style
            viewBtn.innerHTML = `<span><i class="ri-eye-line"></i></span> ${t('dashboard.draft.viewProgress') || '查看进度'}`;
            viewBtn.onclick = (e) => {
                this.creatorModal.showRealtimeOverlay(draft.id, async () => {
                    await this.loadDrafts();
                    const updated = this.drafts.find(d => d.id === draft.id);
                    if (updated && updated.status === 'ready') {
                        this.handleAction(updated, 'read_partial');
                    }
                });
            };
            actionArea.appendChild(viewBtn);

            // 2. Read Partial (If data exists)
            if (hasData) {
                const readBtn = document.createElement('button');
                readBtn.className = styles.btnGhost;
                readBtn.innerHTML = `<span><i class="ri-book-open-line"></i></span> ${t('dashboard.draft.readLive')}`;
                readBtn.onclick = () => this.handleAction(draft, 'read_partial');
                actionArea.appendChild(readBtn);
            }

            // 3. Reset (Destructive)
            const resetBtn = document.createElement('button');
            resetBtn.className = styles.btnGhostDestructive; // New style
            resetBtn.innerHTML = `<span><i class="ri-restart-line"></i></span> ${t('dashboard.draft.resetStuck')}`;
            resetBtn.onclick = async () => {
                this.confirmationModal.show({
                    title: t('dashboard.reset.title') || '重置状态',
                    message: t('dashboard.reset.message') || '如果任务卡住，重置将将其设为错误状态以便重试。',
                    confirmText: t('common.confirm'),
                    onConfirm: async () => {
                        draft.status = 'error';
                        await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, this.drafts);
                        this.render();
                    }
                });
            };
            actionArea.appendChild(resetBtn);
        }

        if (actionArea.children.length > 0) {
            // Move buttons to meta area for extreme compactness
            actionArea.style.marginLeft = 'auto';
            meta.appendChild(actionArea);
        }
        contentCol.appendChild(meta);
        item.appendChild(contentCol);
        item.appendChild(actionsCol);

        return item;
    }

    async handleDelete(draft) {
        this.confirmationModal.show({
            title: t('dashboard.delete.title'),
            message: t('dashboard.delete.message', { title: draft.title || t('dashboard.draft.untitled') }),
            confirmText: t('dashboard.delete.confirm'),
            isDestructive: true,
            onConfirm: async () => {
                this.drafts = this.drafts.filter(d => d.id !== draft.id);
                await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, this.drafts);
                this.render();
            }
        });
    }

    handleEdit(draft) {
        this.creatorModal.show({
            title: draft.title || '',
            rawText: draft.rawText,
            mode: 'edit',
            id: draft.id,
            createdAt: draft.createdAt
        });
    }

    async handleNewDraft(draft, autoStart, mode) {
        const index = this.drafts.findIndex(d => d.id === draft.id);
        if (index !== -1) {
            const existing = this.drafts[index];
            // Smart Merge: If text hasn't changed and we aren't forcing re-analysis, preserve data.
            if (!autoStart && existing.rawText === draft.rawText) {
                draft.data = existing.data;
                draft.status = existing.status;
                draft.progress = existing.progress;
            }
            this.drafts[index] = draft;
        } else {
            this.drafts.unshift(draft);
        }
        await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, this.drafts);
        this.render();

        if (autoStart) {
            const hasKey = await this.checkApiKey();
            if (!hasKey) {
                draft.status = 'draft';
                await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, this.drafts);
                this.render();
                return;
            }

            // User Note: "Background" and "Realtime" share UI logic.
            // We show the overlay for both. User can minimize if desired.
            this.creatorModal.showRealtimeOverlay(draft.id, async () => {
                // On Complete -> Transitions directly to Reader
                await this.loadDrafts(); // Refresh state
                const updated = this.drafts.find(d => d.id === draft.id);
                if (updated && updated.status === 'ready') {
                    this.handleAction(updated, 'read_partial');
                }
            });
            MessageRouter.sendMessage(MessageTypes.REQUEST_ANALYSIS, { draftId: draft.id });
        }
    }

    async handleMerge() {
        const selectedIds = Array.from(this.selectedDrafts);
        if (selectedIds.length < 2) return;

        const targets = this.drafts.filter(d => selectedIds.includes(d.id));
        targets.sort((a, b) => a.createdAt - b.createdAt);

        const newTitle = t('vocab.merge.title', { title: targets[0].title });
        const combinedText = targets.map(d => d.rawText).join('\n\n');

        const newDraft = {
            id: crypto.randomUUID(),
            title: newTitle,
            status: 'draft',
            rawText: combinedText,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            data: { sentences: [] },
            progress: { current: 0, total: 0, percentage: 0 }
        };

        await this.handleNewDraft(newDraft, false);
        this.selectedDrafts.clear();
        this.render();
    }

    async handleAction(draft, mode = 'realtime') {
        if (mode === 'read_partial' || (draft.status === 'ready' && mode !== 'retry')) {
            if (this.readerView) {
                this.element.style.display = 'none';
                document.getElementById('reader-root').style.display = 'block';
                this.readerView.show(draft);
            }
            return;
        }

        if (draft.status === 'draft' || draft.status === 'error' || mode === 'retry') {
            const valid = await this.checkApiKey();
            if (!valid) return;

            if (mode === 'background' || mode === 'retry') {
                draft.status = 'processing';
                if (mode !== 'retry') {
                    draft.progress = { current: 0, total: 0, percentage: 0 };
                }
                this.handleNewDraft(draft, true, 'background');
            } else {
                this.creatorModal.show({
                    title: draft.title || '',
                    rawText: draft.rawText,
                    mode: 'edit', // Hack: Show modal so overlay has a place to live, or use standalone?
                    // Actually CreatorModal expects to be OPEN for showRealtimeOverlay to append.
                    // If we are calling handleAction from Dashboard list, the modal is CLOSED.
                    // We need to OPEN it or use a global overlay.
                    // Looking at `showRealtimeOverlay`: "if (this.modalContent) this.modalContent.appendChild(overlay);"
                    // So we must open the modal first?
                    // No, `handleAction` (Retry or Draft) might not open modal.
                    // Let's check if CreatorModal supports standalone overlay.
                    // It uses `this.element` which is body. But it appends to `this.modalContent` which is created in `render`.
                    // So yes, we need to show the modal or change where overlay appends.
                    // BUT, `handleAction` logic in `preparation_dashboard.js` line 628 just calls `showRealtimeOverlay`.
                    // If modal isn't open, content is null.
                    // Fix: We'll modify CreatorModal to append to `this.element` (body) if modalContent is missing?
                    // Or just ensure we pass the callback. The existing code assumes it works.
                });
                // Wait, the original code had:
                // this.creatorModal.showRealtimeOverlay(draft.id);
                // If this worked before, it means the modal state was handled or I missed something.
                // Ah, line 628 is inside `handleAction`.
                // If I click "Start Analysis" from the list... the modal IS NOT open.
                // So `this.modalContent` would be null.
                // Does `showRealtimeOverlay` handle this? It checks `if (this.modalContent)`.
                // If null, it does nothing? That seems like a bug in existing code or my understanding.
                // Let's look at `creator_modal.js` again.
                // `if (this.modalContent) this.modalContent.appendChild(overlay);`
                // Yes, if modal is closed, it shows NOTHING.
                // So "Start Analysis" from list might be broken visually or relies on something else?
                // The user complained about "Window popping up and disappearing".
                // This implies it DOES show up.
                // Maybe `handleAction` opens it? No.
                // Wait, maybe `viewer` opens it?
                // Actually, if I look at `handleNewDraft`, it calls `showRealtimeOverlay` AFTER `handleNewDraft` which follows `creatorModal.show` and `close`.
                // If `close` is called, `overlay` is removed.

                // Let's fix the logic to be safe: Append to `document.body` if modal is closed.
                // I will apply the fix in `creator_modal.js` instead.

                this.creatorModal.showRealtimeOverlay(draft.id, async () => {
                    await this.loadDrafts();
                    const updated = this.drafts.find(d => d.id === draft.id);
                    if (updated && updated.status === 'ready') {
                        this.handleAction(updated, 'read_partial');
                    }
                });
                MessageRouter.sendMessage(MessageTypes.REQUEST_ANALYSIS, { draftId: draft.id });
            }
        }
    }

    async checkApiKey() {
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
        const activeProfileId = settings.activeProfileId;
        const profile = settings.profiles?.[activeProfileId];
        const providerName = profile?.provider || 'gemini';

        // GLM-Free uses a built-in key, skip check
        if (providerName === 'glm-free') return true;

        const providerConfig = profile?.providerConfig?.[providerName];
        const hasKey = providerConfig?.apiKey || profile?.apiKey;

        if (!hasKey) {
            notificationService.alert(t('dashboard.apiKey.missing', { provider: providerName }));
            this.settingsModal.show();
            return false;
        }
        return true;
    }

    createIconBtn(icon, title, onClick) {
        const btn = document.createElement('button');
        btn.className = styles.iconBtn;
        btn.innerHTML = icon;
        btn.title = title;
        btn.onclick = onClick;
        return btn;
    }
}

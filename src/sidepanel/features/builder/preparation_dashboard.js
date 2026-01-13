import { Component } from '../../components/component.js';
import { StorageHelper, StorageKeys } from '../../../utils/storage.js';
import styles from './dashboard.module.css';
import { SettingsModal } from '../settings/settings_modal.js';
import { MessageRouter, MessageTypes } from '../../../utils/message_router.js';
import { CreatorModal } from './creator_modal.js';
import { ReaderView } from '../reader/reader_view.js';
import { ConfirmationModal } from '../../components/confirmation_modal.js';
import { VocabView } from '../vocab/vocab_view.js';
import { vocabService } from '../../../services/vocab_service.js';

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
            // If no profile, it defaults to 'default' inside service
            if (settings.activeProfileId) {
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
            onExit: () => {
                this.readerView.hide();
                this.element.style.display = 'block';
                readerRoot.style.display = 'none';
                this.render();
            }
        });

        await this.loadDrafts();
        this.setupStorageListener();
    }

    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes[StorageKeys.BUILDER_DRAFTS]) {
                this.loadDrafts();
            }
        });
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
            btn.style.borderBottom = this.activeTab === id ? '2px solid #2e7d32' : '2px solid transparent';
            btn.style.color = this.activeTab === id ? '#2e7d32' : '#666';
            btn.style.fontWeight = this.activeTab === id ? 'bold' : '500';
            btn.style.transition = 'all 0.2s';

            btn.onclick = () => {
                this.activeTab = id;
                this.render();
            };
            return btn;
        };

        navDiv.appendChild(makeTab('library', 'My Library'));
        navDiv.appendChild(makeTab('vocab', 'Vocabulary'));
        header.appendChild(navDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.alignItems = 'center';
        actionsDiv.style.gap = '12px';

        const mergeBtn = document.createElement('button');
        mergeBtn.className = styles.iconBtn;
        mergeBtn.id = 'merge-btn';
        mergeBtn.title = "Merge Selected";
        mergeBtn.innerHTML = '🔗 Merge';
        mergeBtn.style.display = 'none';
        mergeBtn.style.fontSize = '0.9em';
        mergeBtn.style.fontWeight = 'bold';
        mergeBtn.style.color = '#2e7d32';
        mergeBtn.style.background = '#e8f5e9';
        mergeBtn.style.padding = '6px 12px';
        mergeBtn.style.borderRadius = '20px';
        mergeBtn.style.width = 'auto';
        mergeBtn.onclick = () => this.handleMerge();
        actionsDiv.appendChild(mergeBtn);

        if (this.activeTab === 'library' && this.currentFilter === 'draft' && this.selectedDrafts.size > 1) {
            mergeBtn.style.display = 'inline-block';
        }

        if (this.activeTab === 'library') {
            const addBtn = document.createElement('button');
            addBtn.className = styles.iconBtn;
            addBtn.innerHTML = '+ New';
            addBtn.title = "Add Article";
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

        const settingsBtn = document.createElement('button');
        settingsBtn.className = styles.iconBtn;
        settingsBtn.id = 'settings-btn';
        settingsBtn.innerHTML = '⚙️';
        settingsBtn.title = "Settings";
        settingsBtn.onclick = () => this.settingsModal.show();
        actionsDiv.appendChild(settingsBtn);

        header.appendChild(actionsDiv);
        container.appendChild(header);
    }

    renderDraftList(container) {
        const filterDiv = document.createElement('div');
        filterDiv.className = styles.filterTabs;
        filterDiv.innerHTML = `
            <button class="${styles.filterTab} ${this.currentFilter === 'draft' ? styles.active : ''}" data-filter="draft">Library</button>
            <button class="${styles.filterTab} ${this.currentFilter === 'processing' ? styles.active : ''}" data-filter="processing">Processing</button>
            <button class="${styles.filterTab} ${this.currentFilter === 'ready' ? styles.active : ''}" data-filter="ready">Completed</button>
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
            list.innerHTML = `<div class="${styles.emptyState}"><h3>No items found.</h3></div>`;
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
        titleDiv.textContent = draft.title || '(Untitled Draft)';
        header.appendChild(titleDiv);

        const controls = document.createElement('div');
        controls.className = styles.draftControls;

        // Edit Button: Available for all states (including Ready for renaming)
        if (draft.status === 'draft' || draft.status === 'error' || draft.status === 'processing' || draft.status === 'ready') {
            controls.appendChild(this.createIconBtn('✏️', 'Edit', (e) => { e.stopPropagation(); this.handleEdit(draft); }));
        }

        // Processing Actions: Only for non-ready states
        if (draft.status === 'draft' || draft.status === 'error' || draft.status === 'processing') {
            controls.appendChild(this.createIconBtn('🤖', 'Manual AI', (e) => {
                e.stopPropagation();
                this.creatorModal.show({
                    title: draft.title || '',
                    rawText: draft.rawText,
                    mode: 'manual_ai',
                    id: draft.id,
                    createdAt: draft.createdAt
                });
            }));
            controls.appendChild(this.createIconBtn('⏳', 'BG Process', (e) => {
                e.stopPropagation();
                this.handleAction(draft, 'background');
            }));
        }
        controls.appendChild(this.createIconBtn('🗑️', 'Delete', (e) => { e.stopPropagation(); this.handleDelete(draft); }));
        header.appendChild(controls);
        contentCol.appendChild(header);

        const preview = document.createElement('div');
        preview.className = styles.draftPreview;
        const raw = draft.rawText || '';
        preview.textContent = raw.substring(0, 150) + (raw.length > 150 ? '...' : '');
        contentCol.appendChild(preview);

        // Chunk Visualization (Parallel Progress)
        if (draft.data?.chunks && Array.isArray(draft.data.chunks) && typeof draft.data.chunks[0] === 'object') {
            const chunkGrid = document.createElement('div');
            chunkGrid.className = styles.chunkGrid;

            draft.data.chunks.forEach(chunk => {
                const block = document.createElement('div');
                const statusKey = `chunk${chunk.status.charAt(0).toUpperCase() + chunk.status.slice(1)}`;
                block.className = `${styles.chunkBlock} ${styles[statusKey] || styles.chunkPending}`;
                block.title = `Chunk ${chunk.index + 1}: ${chunk.status.toUpperCase()}`;
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
            progress.textContent = `${draft.progress?.percentage || 0}%`;
            meta.appendChild(progress);
        }
        contentCol.appendChild(meta);

        const actionArea = document.createElement('div');
        actionArea.className = styles.actionArea;
        const hasData = draft.data?.sentences?.length > 0;
        const isCorrupt = draft.status === 'ready' && !hasData;

        if (draft.status === 'ready' && !isCorrupt) {
            const btn = document.createElement('button');
            btn.className = styles.btnPrimary;
            btn.innerHTML = 'Read Now &rarr;';
            btn.onclick = () => this.handleAction(draft);
            actionArea.appendChild(btn);
        } else if (draft.status === 'draft') {
            const btn = document.createElement('button');
            btn.className = styles.btnPrimary;
            btn.innerHTML = 'Start Analysis';
            btn.onclick = () => this.handleAction(draft);
            actionArea.appendChild(btn);
        } else if (draft.status === 'error') {
            const retryBtn = document.createElement('button');
            retryBtn.className = styles.btnDestructive;
            retryBtn.innerHTML = '↻ Resume';
            retryBtn.onclick = () => this.handleAction(draft, 'retry');
            actionArea.appendChild(retryBtn);

            if (hasData) {
                const readBtn = document.createElement('button');
                readBtn.className = styles.btnSecondary;
                readBtn.innerHTML = 'Read (Partial)';
                readBtn.onclick = () => this.handleAction(draft, 'read_partial');
                actionArea.appendChild(readBtn);
            }
        } else if (draft.status === 'processing' && hasData) {
            const readBtn = document.createElement('button');
            readBtn.className = styles.btnSecondary;
            readBtn.style.fontSize = '0.8em';
            readBtn.innerHTML = 'Read (Live)';
            readBtn.onclick = () => this.handleAction(draft, 'read_partial');
            actionArea.appendChild(readBtn);

            // Emergency Reset for Stuck Processing
            const resetBtn = document.createElement('button');
            resetBtn.className = styles.btnDestructive;
            resetBtn.style.fontSize = '0.8em';
            resetBtn.style.marginLeft = '8px';
            resetBtn.innerHTML = '⚠️ Reset Stuck';
            resetBtn.title = "Force reset status if stuck at 0%";
            resetBtn.onclick = async () => {
                draft.status = 'error'; // Force to error state
                await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, this.drafts);
                this.render();
            };
            actionArea.appendChild(resetBtn);
        } else if (draft.status === 'processing' && !hasData) {
            // Stuck at 0% case
            const resetBtn = document.createElement('button');
            resetBtn.className = styles.btnDestructive;
            resetBtn.innerHTML = '⚠️ Reset Stuck';
            resetBtn.onclick = async () => {
                // Reset logic
                draft.status = 'error';
                await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, this.drafts);
                this.render();
            };
            actionArea.appendChild(resetBtn);
        }


        if (actionArea.children.length > 0) contentCol.appendChild(actionArea);
        item.appendChild(contentCol);

        return item;
    }

    async handleDelete(draft) {
        this.confirmationModal.show({
            title: 'Delete Article?',
            message: `Are you sure you want to delete "${draft.title || 'Untitled Draft'}"? This cannot be undone.`,
            confirmText: 'Delete',
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

            if (mode === 'realtime') {
                this.creatorModal.showRealtimeOverlay(draft.id);
                MessageRouter.sendMessage(MessageTypes.REQUEST_ANALYSIS, { draftId: draft.id });
            } else {
                MessageRouter.sendMessage(MessageTypes.REQUEST_ANALYSIS, { draftId: draft.id });
            }
        }
    }

    async handleMerge() {
        const selectedIds = Array.from(this.selectedDrafts);
        if (selectedIds.length < 2) return;

        const targets = this.drafts.filter(d => selectedIds.includes(d.id));
        targets.sort((a, b) => a.createdAt - b.createdAt);

        const newTitle = "Merged: " + targets[0].title;
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
                this.creatorModal.showRealtimeOverlay(draft.id);
                MessageRouter.sendMessage(MessageTypes.REQUEST_ANALYSIS, { draftId: draft.id });
            }
        }
    }

    async checkApiKey() {
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
        const activeProfileId = settings.activeProfileId;
        const profile = settings.profiles?.[activeProfileId];
        const providerName = profile?.provider || 'gemini';
        const providerConfig = profile?.providerConfig?.[providerName];
        const hasKey = providerConfig?.apiKey || profile?.apiKey;

        if (!hasKey) {
            alert(`❌ Missing API Key for ${providerName}.\nPlease configure in Settings.`);
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

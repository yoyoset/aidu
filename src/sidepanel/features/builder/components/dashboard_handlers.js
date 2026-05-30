import { StorageHelper, StorageKeys } from '../../../../utils/storage.js';
import { MessageRouter, MessageTypes } from '../../../../utils/message_router.js';
import { notificationService } from '../../../../utils/notification_service.js';
import { SyncService } from '../../../../services/sync_service.js';
import { t } from '../../../../locales/index.js';

/**
 * DashboardHandlers
 * Encapsulates business logic for draft management, sync, and analysis.
 */
export class DashboardHandlers {
    constructor(dashboard) {
        this.dashboard = dashboard;
    }

    async handleDelete(draft) {
        this.dashboard.confirmationModal.show({
            title: t('dashboard.delete.title'),
            message: t('dashboard.delete.message', { title: draft.title || t('dashboard.draft.untitled') }),
            confirmText: t('dashboard.delete.confirm'),
            isDestructive: true,
            onConfirm: async () => {
                chrome.runtime.sendMessage({
                    type: MessageTypes.DELETE_DRAFT,
                    payload: { draftId: draft.id }
                });
                this.dashboard.drafts = this.dashboard.drafts.filter(d => d && d.id !== draft.id);
                this.dashboard.render();
                notificationService.toast(t('dashboard.delete.success'));
            }
        });
    }

    handleEdit(draft) {
        this.dashboard.creatorModal.show({
            title: draft.title || '',
            rawText: draft.rawText,
            mode: 'edit',
            id: draft.id,
            createdAt: draft.createdAt
        });
    }

    handleReset(draft) {
        this.dashboard.confirmationModal.show({
            title: t('dashboard.reset.title') || '重置状态',
            message: t('dashboard.reset.message') || '如果任务卡住，重置将将其设为错误状态以便重试。',
            confirmText: t('common.confirm'),
            onConfirm: async () => {
                chrome.runtime.sendMessage({
                    type: MessageTypes.UPDATE_DRAFT,
                    payload: { draftId: draft.id, updates: { status: 'error' } }
                });
                draft.status = 'error';
                this.dashboard.render();
                notificationService.info(t('dashboard.reset.success'));
            }
        });
    }

    async handleMerge() {
        const selectedIds = Array.from(this.dashboard.selectedDrafts);
        if (selectedIds.length < 2) return;

        const targets = this.dashboard.drafts.filter(d => d && selectedIds.includes(d.id));
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
        this.dashboard.selectedDrafts.clear();
        this.dashboard.render();
    }

    async handleNewDraft(data, autoStart, mode) {
        let draft = null;

        if (!data.id) {
            // New Draft Creation Flow
            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({
                    type: MessageTypes.CREATE_DRAFT,
                    payload: { 
                        text: data.text, 
                        title: data.title,
                        data: data.data,
                        status: data.status 
                    }
                }, resolve);
            });

            if (response && response.draft) {
                draft = response.draft;
                // Sync analysis mode from UI if provided
                if (data.analysisMode) {
                    draft.analysisMode = data.analysisMode;
                }
                // [Race Condition Fix] SW already saved to storage. 
                // We should check if storage listener already updated this.dashboard.drafts
                const exists = this.dashboard.drafts.some(d => d.id === draft.id);
                if (!exists) {
                    this.dashboard.drafts.unshift(draft);
                }
                notificationService.toast(t('creator.saveSuccess.toast'));
            } else {
                throw new Error('Failed to create draft');
            }
        } else {
            // Check if it's an existing draft or a pre-assigned ID new draft
            const index = this.dashboard.drafts.findIndex(d => d && d.id === data.id);
            if (index !== -1) {
                // Edit Existing Flow
                draft = { ...this.dashboard.drafts[index] }; // Clone
                const contentChanged = draft.rawText !== data.text || draft.title !== data.title;
                draft.title = data.title;
                draft.rawText = data.text;
                draft.updatedAt = Date.now();

                if (contentChanged) {
                    draft.status = 'draft';
                    draft.data = { sentences: [], chunks: {} };
                    draft.progress = { current: 0, total: 0, percentage: 0 };
                }
                this.dashboard.drafts[index] = draft;
                await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, this.dashboard.drafts);
            } else {
                // Pre-assigned ID New Draft (e.g. Merge Flow)
                console.log('DashboardHandlers: Creating new draft with pre-assigned ID');
                draft = {
                    ...data,
                    id: data.id,
                    status: data.status || 'draft',
                    updatedAt: Date.now(),
                    createdAt: data.createdAt || Date.now()
                };
                this.dashboard.drafts.unshift(draft);
                await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, this.dashboard.drafts);
                notificationService.toast(t('creator.saveSuccess.toast'));
            }
        }

        if (draft && autoStart) {
            // Optimization: If the draft is already ready (e.g. Manual AI Import), open reader immediately
            if (draft.status === 'ready') {
                this.handleAction(draft);
                return;
            }

            // Persist analysis mode change for new draft if it was set
            if (draft.analysisMode) {
                const draftIdx = this.dashboard.drafts.findIndex(d => d.id === draft.id);
                if (draftIdx !== -1) {
                    this.dashboard.drafts[draftIdx] = draft;
                    await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, this.dashboard.drafts);
                }
            }

            // Analysis Request
            MessageRouter.sendMessage(MessageTypes.REQUEST_ANALYSIS, { draftId: draft.id });
            notificationService.toast(t('creator.bgProcess.toast'));
        }

        // Final UI Refresh from Storage Truth
        await this.dashboard.loadDrafts();
    }

    async handleAction(draft, mode = 'simple', analysisMode = null) {
        if (!draft || !draft.status) {
            console.error('DashboardHandlers: Attempted action on null/invalid draft');
            return;
        }
        if (mode === 'review') return;
        if (mode === 'reset') return;

        if (draft.status === 'ready' && mode !== 'retry') {
            if (this.dashboard.readerView) {
                this.dashboard.element.style.display = 'none';
                document.getElementById('reader-root').style.display = 'block';
                this.dashboard.readerView.show(draft);
            }
            return;
        }

        if (draft.status === 'draft' || draft.status === 'error' || mode === 'retry') {
            const valid = await this.checkApiKey();
            if (!valid) return;

            // Determine Analysis Mode based on Settings if not explicitly provided
            if (!analysisMode) {
                const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
                const profile = settings.profiles?.[settings.activeProfileId] || {};

                if (mode === 'simple') {
                    analysisMode = parseInt(profile.realtimeMode || '2');
                } else if (mode === 'deep') {
                    analysisMode = parseInt(profile.builderMode || '3');
                } else if (mode === 'retry') {
                    analysisMode = draft.analysisMode || parseInt(profile.builderMode || '2');
                }
            }

            if (analysisMode) {
                draft.analysisMode = analysisMode;
                await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, this.dashboard.drafts);
            }

            // Common processing state setup
            draft.status = 'processing';
            draft.progress = { current: 0, total: 0, percentage: 1 };
            draft.updatedAt = Date.now();

            if (!draft.data) draft.data = {};
            const charCount = (draft.rawText || '').length;
            const estimatedChunks = Math.max(1, Math.ceil(charCount / 2000));
            draft.data.chunks = Array.from({ length: estimatedChunks }, (_, i) => ({
                index: i, status: i === 0 ? 'processing' : 'pending'
            }));

            const idx = this.dashboard.drafts.findIndex(d => d.id === draft.id);
            if (idx !== -1) this.dashboard.drafts[idx] = draft;
            await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, this.dashboard.drafts);

            notificationService.toast(t('creator.bgProcess.toast'));
            MessageRouter.sendMessage(MessageTypes.REQUEST_ANALYSIS, { draftId: draft.id });
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
            notificationService.alert(t('dashboard.apiKey.missing', { provider: providerName }));
            this.dashboard.settingsModal.show();
            return false;
        }
        return true;
    }

    async triggerSync() {
        const btn = document.getElementById('sync-status-btn');
        const originalHtml = btn ? btn.innerHTML : '';
        if (btn) btn.innerHTML = '<i class="ri-loader-2-line ri-spin"></i>';

        notificationService.info(t('settings.sync.syncing'));
        try {
            await SyncService.pull();
            await SyncService.push();
            notificationService.success(t('dashboard.sync.success'));
            this.dashboard.updateSyncBadge();
        } catch (e) {
            notificationService.error(t('dashboard.sync.failed', { error: e.message }));
        } finally {
            if (btn) btn.innerHTML = originalHtml;
        }
    }
}

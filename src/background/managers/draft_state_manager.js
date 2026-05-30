import { StorageHelper, StorageKeys } from '../../utils/storage.js';
import { DraftProcessor } from '../llm/draft_processor.js';
import { logger } from '../../utils/logger.js';

class DraftStateManager {
    constructor() {
        this._saveQueue = Promise.resolve();
    }

    /**
     * Creates a new draft and saves it to storage.
     * Enforces the 50-draft limit.
     */
    async createDraft(text, title, url, chunkCount, data = null, status = null) {
        return this._saveQueue = this._saveQueue.then(async () => {
            // 1. Init State
            const draft = DraftProcessor.createInitialState(text, title, url, chunkCount);
            if (data) draft.data = data;
            if (status) draft.status = status;

            // 2. Persistent Storage & Truncation
            let stored = await StorageHelper.get(StorageKeys.BUILDER_DRAFTS);
            let drafts = Array.isArray(stored) ? stored : (stored ? Object.values(stored) : []);

            drafts.unshift(draft);
            drafts = DraftProcessor.truncate(drafts, 50);

            await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, drafts);
            return draft;
        });
    }

    /**
     * Gets a draft by ID from storage.
     */
    async getDraft(draftId) {
        let stored = await StorageHelper.get(StorageKeys.BUILDER_DRAFTS);
        let drafts = Array.isArray(stored) ? stored : (stored ? Object.values(stored) : []);
        return drafts.find(d => String(d.id) === String(draftId));
    }

    /**
     * Updates specific fields of a draft.
     */
    async updateDraftStatus(draftId, status, extraData = {}) {
        return this._saveQueue = this._saveQueue.then(async () => {
            const stored = await StorageHelper.get(StorageKeys.BUILDER_DRAFTS);
            let drafts = Array.isArray(stored) ? stored : (stored ? Object.values(stored) : []);

            const index = drafts.findIndex(d => String(d.id) === String(draftId));
            if (index !== -1) {
                drafts[index].status = status;
                Object.assign(drafts[index], extraData);
                drafts[index].updatedAt = Date.now();
                await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, drafts);
            }
        });
    }

    /**
     * Deletes a draft.
     */
    async deleteDraft(draftId) {
        this._saveQueue = this._saveQueue.then(async () => {
            const id = String(draftId);
            logger.info(`DraftStateManager: Deleting draft ${id}...`);

            let stored = await StorageHelper.get(StorageKeys.BUILDER_DRAFTS);
            let drafts = Array.isArray(stored) ? stored : (stored ? Object.values(stored) : []);

            const initialCount = drafts.length;

            drafts = drafts.filter(d => String(d.id) !== id);

            if (drafts.length === initialCount) {
                logger.warn(`DraftStateManager: No draft found with ID ${id} to delete.`);
            } else {
                await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, drafts);
                logger.info(`DraftStateManager: Successfully deleted ${id}. Remaining: ${drafts.length}`);
            }
        }).catch(err => {
            console.error('DraftStateManager: Delete error:', err);
            logger.error(`DraftStateManager: Failed to delete draft ${draftId}`, err);
        });
        return this._saveQueue;
    }

    /**
     * Applies partial updates to a draft (mutex safe).
     */
    async applyPartialUpdate(draftId, updates) {
        this._saveQueue = this._saveQueue.then(async () => {
            let stored = await StorageHelper.get(StorageKeys.BUILDER_DRAFTS);
            let drafts = Array.isArray(stored) ? stored : (stored ? Object.values(stored) : []);

            const idx = drafts.findIndex(d => String(d.id) === String(draftId));
            if (idx !== -1) {
                drafts[idx] = { ...drafts[idx], ...updates, updatedAt: Date.now() };
                await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, drafts);
            }
        }).catch(err => {
            console.error('DraftStateManager: Partial update error:', err);
        });
        return this._saveQueue;
    }

    /**
     * Saves a full draft object safely (Mutex).
     */
    async saveSafe(updatedDraft) {
        this._saveQueue = this._saveQueue.then(async () => {
            let stored = await StorageHelper.get(StorageKeys.BUILDER_DRAFTS);
            let drafts = Array.isArray(stored) ? stored : (stored ? Object.values(stored) : []);

            const idx = drafts.findIndex(d => String(d.id) === String(updatedDraft.id));
            if (idx !== -1) {
                const existing = drafts[idx];

                // Consistency check: Log if UI reset state unexpectedly
                if (existing.status === 'draft' && updatedDraft.status === 'processing') {
                    logger.warn(`DraftStateManager: UI reset draft ${updatedDraft.id} to draft while processing. Overwriting.`, null, true);
                }

                drafts[idx] = updatedDraft;
                await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, drafts);
            }
        }).catch(err => {
            console.error('DraftStateManager: Save queue error:', err);
        });

        return this._saveQueue;
    }
}

export const draftStateManager = new DraftStateManager();

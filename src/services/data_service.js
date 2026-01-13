import { StorageHelper, StorageKeys } from '../utils/storage.js';

export const DataService = {
    /**
     * Export all critical data (Vocab, Drafts, Settings) to a JSON object
     */
    async exportAll() {
        try {
            const vocab = await StorageHelper.get(StorageKeys.VOCAB_LIST) || {};
            const drafts = await StorageHelper.get(StorageKeys.BUILDER_DRAFTS) || [];
            const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};

            const backup = {
                version: 1,
                timestamp: Date.now(),
                data: {
                    vocab,
                    drafts,
                    settings
                }
            };
            return backup;
        } catch (e) {
            console.error("Export failed", e);
            throw e;
        }
    },

    /**
     * Import data from a JSON object, replacing existing data
     * @param {Object} backupData 
     */
    async importAll(backupData) {
        if (!backupData || !backupData.data) {
            throw new Error("Invalid backup file: Missing data field");
        }

        const { vocab, drafts, settings } = backupData.data;

        // Validation (Basic)
        if (vocab && typeof vocab !== 'object') throw new Error("Invalid Vocab data");
        if (drafts && !Array.isArray(drafts)) throw new Error("Invalid Drafts data");
        if (settings && typeof settings !== 'object') throw new Error("Invalid Settings data");

        try {
            // Restore sequentially to prevent race conditions
            if (vocab) await StorageHelper.set(StorageKeys.VOCAB_LIST, vocab);
            if (drafts) await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, drafts);
            if (settings) await StorageHelper.set(StorageKeys.USER_SETTINGS, settings);

            return true;
        } catch (e) {
            console.error("Import failed", e);
            throw e;
        }
    }
};

import { StorageHelper, StorageKeys } from '../utils/storage.js';
import { vocabService } from './vocab_service.js';

export const SyncService = {
    async getSettings() {
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS);
        return settings?.sync || {};
    },

    async saveConfig(config) {
        let settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
        settings.sync = { ...settings.sync, ...config };
        await StorageHelper.set(StorageKeys.USER_SETTINGS, settings);
    },

    // ... (createGist remains same) ...

    /**
     * Pull data and smart-merge
     */
    async pull() {
        const config = await this.getSettings();
        if (!config.provider) throw new Error("Sync provider not selected");

        let remoteData = null;

        // Fetch Remote Data
        if (config.provider === 'gist') {
            if (!config.githubToken || !config.gistId) throw new Error("Gist not configured");
            const response = await fetch(`https://api.github.com/gists/${config.gistId}`, {
                headers: { 'Authorization': `token ${config.githubToken}` }
            });
            if (!response.ok) throw new Error("Failed to fetch Gist");
            const json = await response.json();
            if (json.files['aidu_vocab.json']) {
                remoteData = JSON.parse(json.files['aidu_vocab.json'].content);
            }
        } else if (config.provider === 'custom') {
            if (!config.customUrl || !config.customToken) throw new Error("Custom Endpoint not configured");
            const response = await fetch(config.customUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${config.customToken}` }
            });
            if (!response.ok) {
                if (response.status === 404) remoteData = {}; // New DB
                else throw new Error("Failed to fetch Custom Endpoint");
            } else {
                const json = await response.json();
                remoteData = json.vocab || json;
            }
        }

        if (remoteData) {
            // Use Profile-Aware VocabService
            const localVocab = await vocabService.getAll();
            const mergedVocab = this._mergeVocab(localVocab, remoteData);

            // Save back using dynamic key
            await StorageHelper.set(vocabService.STORAGE_KEY, mergedVocab);
        }
        return true;
    },

    /**
     * Push local data
     */
    async push() {
        const config = await this.getSettings();

        // Use Profile-Aware VocabService
        const localVocab = await vocabService.getAll();

        const meta = { timestamp: Date.now(), device: 'browser' };

        if (config.provider === 'gist') {
            const payload = {
                files: {
                    "aidu_vocab.json": { content: JSON.stringify(localVocab) },
                    "aidu_meta.json": { content: JSON.stringify(meta) }
                }
            };
            const response = await fetch(`https://api.github.com/gists/${config.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${config.githubToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Failed to push to Gist");
        } else if (config.provider === 'custom') {
            const payload = {
                vocab: localVocab,
                meta: meta
            };
            const response = await fetch(config.customUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.customToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Failed to push to Custom Endpoint");
        }
    },

    /**
     * Conflict Resolution: prefer newer updatedAt
     */
    _mergeVocab(local, remote) {
        const merged = { ...local };
        for (const [key, rItem] of Object.entries(remote)) {
            const lItem = merged[key];
            if (!lItem) {
                merged[key] = rItem; // New from remote
            } else {
                // Conflict
                const lTime = lItem.updatedAt || 0;
                const rTime = rItem.updatedAt || 0;
                if (rTime > lTime) {
                    merged[key] = rItem; // Remote is newer
                }
            }
        }
        return merged;
    }
};

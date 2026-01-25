import { StorageHelper, StorageKeys } from '../utils/storage.js';
import { vocabService } from './vocab_service.js';

/**
 * Sync Service - Custom Worker Only
 * v4.7.0: Removed Gist support for simplicity. User deploys their own Worker.
 */
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

    async getSyncStatus() {
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS);
        return settings?.syncStatus || {
            lastSyncAt: null,
            lastSyncResult: null,
            pendingChanges: 0,
            lastError: null
        };
    },

    async updateSyncStatus(updates) {
        let settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
        settings.syncStatus = { ...settings.syncStatus, ...updates };
        await StorageHelper.set(StorageKeys.USER_SETTINGS, settings);
    },

    /**
     * Pull data from Custom Worker and smart-merge
     */
    async pull() {
        try {
            const config = await this.getSettings();
            if (!config.customUrl || !config.customToken) {
                throw new Error("Sync endpoint not configured. Please set URL and Token in Settings.");
            }

            const profileId = vocabService.currentProfileId || 'default';
            const separator = config.customUrl.includes('?') ? '&' : '?';
            const profiledUrl = `${config.customUrl}${separator}profile=${profileId}`;

            const response = await fetch(profiledUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${config.customToken}` }
            });

            let remoteData = null;
            if (!response.ok) {
                if (response.status === 404) {
                    remoteData = {}; // Fresh start
                } else {
                    throw new Error(`Sync Pull Failed (${response.status} ${response.statusText})`);
                }
            } else {
                try {
                    const json = await response.json();
                    remoteData = json.vocab || json;
                } catch (e) {
                    throw new Error('Sync endpoint returned invalid JSON');
                }
            }

            if (remoteData) {
                const localVocab = await vocabService.getAll();
                const mergedVocab = this._mergeVocab(localVocab, remoteData);
                await StorageHelper.set(vocabService.STORAGE_KEY, mergedVocab);
            }

            await this.updateSyncStatus({ lastSyncAt: Date.now(), lastSyncResult: 'success', lastError: null });
            return true;
        } catch (e) {
            console.error("Pull Failed:", e);
            await this.updateSyncStatus({ lastSyncResult: 'error', lastError: e.message });
            throw e;
        }
    },

    /**
     * Push data to Custom Worker
     */
    async push(forcePullFirst = true) {
        try {
            // CRITICAL: Always pull first to prevent overwriting remote SRS states
            if (forcePullFirst) {
                await this.pull();
            }

            const config = await this.getSettings();
            if (!config.customUrl || !config.customToken) {
                throw new Error("Sync endpoint not configured.");
            }

            const profileId = vocabService.currentProfileId || 'default';
            const localVocab = await vocabService.getAll();
            const meta = { timestamp: Date.now(), device: 'browser', profile: profileId };

            const payload = {
                vocab: localVocab,
                meta: meta
            };
            const separator = config.customUrl.includes('?') ? '&' : '?';
            const profiledUrl = `${config.customUrl}${separator}profile=${profileId}`;

            const response = await fetch(profiledUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.customToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`Sync Push Failed (${response.status} ${response.statusText})`);

            // Push Profile Metadata (List of available profiles)
            try {
                const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS);
                const profileList = Object.keys(settings.profiles || {});
                const metaPayload = { profiles: profileList, updatedAt: Date.now() };
                const metaUrl = `${config.customUrl}?key=meta`;

                await fetch(metaUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config.customToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(metaPayload)
                });
            } catch (e) {
                console.warn('Failed to push profile meta', e);
            }

            await this.updateSyncStatus({ lastSyncAt: Date.now(), lastSyncResult: 'success', lastError: null });
        } catch (e) {
            console.error("Push Failed:", e);
            await this.updateSyncStatus({ lastSyncResult: 'error', lastError: e.message });
            throw e;
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

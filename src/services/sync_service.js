import { RemoteKVDriver } from './drivers/remote_kv_driver.js';
import { SyncManager } from './sync_manager.js';
import { vocabService } from './vocab_service.js';
import { StorageHelper, StorageKeys } from '../utils/storage.js';

// Initialize Driver with placeholder (will be updated on use)
const driver = new RemoteKVDriver({ url: '', token: '' });

// Initialize Manager
export const syncManager = new SyncManager(driver, vocabService);

/**
 * Legacy SyncService Wrapper
 * Maintains backward compatibility while delegating to SyncManager
 */
export const SyncService = {
    async _ensureConfig() {
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS);
        const config = settings?.sync || {};
        driver.updateConfig({
            url: config.customUrl,
            token: config.customToken
        });
        return config;
    },

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

    async push(force = false) {
        await this._ensureConfig();
        // Map SyncManager's safePush to legacy expectation
        // Legacy 'push' was auto-executing. 
        // New 'safePush' returns a decision.

        try {
            const decision = await syncManager.safePush({ force });

            if (decision.action === 'SAFE_TO_PUSH') {
                await this.updateSyncStatus({ lastSyncAt: Date.now(), lastSyncResult: 'success', lastError: null });
                return true; // Already executed
            } else if (decision.action === 'REQUIRE_CONFIRMATION') {
                // Throw special error to let UI handle confirmation
                const e = new Error('SYNC_CONFIRMATION_NEEDED');
                e.code = 'CONFIRMATION_NEEDED';
                e.decision = decision; // Attach for UI
                throw e;
            }
            return false;
        } catch (e) {
            if (e.code !== 'CONFIRMATION_NEEDED') {
                await this.updateSyncStatus({ lastSyncResult: 'error', lastError: e.message });
            }
            throw e;
        }
    },

    // Legacy Pull - wired to SyncManager's logic? 
    // Actually safePush does a pull-merge-push. 
    // If we just want "Pull", we can use driver directly or add 'safePull' to manager.
    // But legacy 'pull' in SyncService was "Fetch & Merge & Save".
    async pull() {
        try {
            await this._ensureConfig();
            const remoteData = await driver.get(vocabService.currentProfileId);
            if (remoteData) {
                const localData = await vocabService.getAll();
                const merged = syncManager._merge(localData, remoteData);
                await vocabService.importData(merged);
                await this.updateSyncStatus({ lastSyncAt: Date.now(), lastSyncResult: 'success', lastError: null });
                return true;
            }
            return false;
        } catch (e) {
            await this.updateSyncStatus({ lastSyncResult: 'error', lastError: e.message });
            throw e;
        }
    },

    // Expose manager for advanced UI
    manager: syncManager
};

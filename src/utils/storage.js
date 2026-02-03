// Storage Helper
// Wrapper for chrome.storage.local

export const StorageKeys = {
    USER_SETTINGS: 'userSettings',
    PAGE_ARCHIVE: 'pageArchive',
    USER_STATS: 'userStats',
    BUILDER_DRAFTS: 'builderDrafts',
    LOGS: 'aidu_logs',
    LOGGER_SETTINGS: 'aidu_logger_settings'
};

export class StorageHelper {
    static async get(key) {
        const result = await chrome.storage.local.get(key);
        return result[key];
    }

    static async set(key, value) {
        await chrome.storage.local.set({ [key]: value });
    }

    static async remove(key) {
        await chrome.storage.local.remove(key);
    }
}

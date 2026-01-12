import { StorageHelper, StorageKeys } from '../../utils/storage.js';
import { SchemaDefaults } from '../../core/schema.js';

export class DraftService {
    static async getAll() {
        const stored = await StorageHelper.get(StorageKeys.BUILDER_DRAFTS);
        if (stored && !Array.isArray(stored)) {
            return Object.values(stored);
        }
        return stored || [];
    }

    static async saveAll(drafts) {
        return StorageHelper.set(StorageKeys.BUILDER_DRAFTS, drafts);
    }

    static async add(draft) {
        let drafts = await this.getAll();
        // Check for duplicates? Usually draft.id is unique (UUID)
        drafts.unshift(draft);
        await this.saveAll(drafts);
    }

    static async update(draftId, updates) {
        let drafts = await this.getAll();
        const index = drafts.findIndex(d => d.id === draftId);
        if (index !== -1) {
            drafts[index] = { ...drafts[index], ...updates, updatedAt: Date.now() };
            await this.saveAll(drafts);
            return drafts[index];
        }
        return null; // Not found
    }

    static async delete(draftId) {
        let drafts = await this.getAll();
        const filtered = drafts.filter(d => d.id !== draftId);
        await this.saveAll(filtered);
        return filtered;
    }

    static async getById(draftId) {
        const drafts = await this.getAll();
        return drafts.find(d => d.id === draftId);
    }
}

import { StorageHelper, StorageKeys } from '../utils/storage.js';

export class VocabService {
    constructor() {
        this.currentProfileId = 'default';
        this.baseKey = 'vocab_';

        // Auto-run migration check on instantiation (async but non-blocking)
        this.checkMigration();
    }

    setProfile(profileId) {
        this.currentProfileId = profileId || 'default';
        console.log(`VocabService: Switched to profile '${this.currentProfileId}'`);
    }

    get STORAGE_KEY() {
        return `${this.baseKey}${this.currentProfileId}`;
    }

    async checkMigration() {
        // Check for legacy "user_vocab"
        const legacyKey = 'user_vocab';
        const legacyData = await StorageHelper.get(legacyKey);

        if (legacyData && Object.keys(legacyData).length > 0) {
            console.log('VocabService: Found legacy data. Migrating to default profile...');

            // 1. Write to default profile (vocab_default)
            // We assume default profile because that's where existing users' data belongs
            const targetKey = 'vocab_default';
            const existingDefault = await StorageHelper.get(targetKey) || {};

            // Merge to be safe, though target should be empty if first run
            const merged = { ...legacyData, ...existingDefault };
            await StorageHelper.set(targetKey, merged);

            // 2. Remove legacy key
            await StorageHelper.remove(legacyKey);
            console.log('VocabService: Migration complete. Legacy data moved to vocab_default.');
        }
    }

    /**
     * Add a word to vocab list
     * @param {Object} entry { word, lemma, meaning, phonetic, context, level }
     */
    async add(entry) {
        const vocab = await this.getAll();
        // Deduplicate by lemma
        const key = entry.lemma ? entry.lemma.toLowerCase() : entry.word.toLowerCase();

        if (vocab[key]) return false; // Already exists

        vocab[key] = {
            ...entry,
            addedAt: Date.now(),
            reviews: 0,
            nextReview: Date.now(), // Due immediately
            stage: 'new',
            easeFactor: 2.5,
            interval: 0,
            updatedAt: Date.now()
        };

        await StorageHelper.set(this.STORAGE_KEY, vocab);
        console.log(`Vocab (${this.currentProfileId}): Added ${key}`);
        return true;
    }

    async updateEntry(lemma, updates) {
        const vocab = await this.getAll();
        const key = lemma.toLowerCase();
        if (vocab[key]) {
            vocab[key] = {
                ...vocab[key],
                ...updates,
                updatedAt: Date.now() // For Sync Conflict Resolution
            };
            await StorageHelper.set(this.STORAGE_KEY, vocab);
            return true;
        }
        return false;
    }

    async remove(lemma) {
        const vocab = await this.getAll();
        const key = lemma.toLowerCase();
        if (vocab[key]) {
            delete vocab[key];
            await StorageHelper.set(this.STORAGE_KEY, vocab);
        }
    }

    async getAll() {
        const key = this.STORAGE_KEY;
        // console.log(`VocabService: Fetching from ${key}`);
        const data = await StorageHelper.get(key) || {};

        // Migration: Ensure fields exist if old data (Just in case)
        let changed = false;
        Object.values(data).forEach(v => {
            if (!v.stage) {
                v.stage = 'new';
                v.reviews = 0;
                v.nextReview = Date.now();
                v.interval = 0;
                v.easeFactor = 2.5;
                changed = true;
            }
        });
        if (changed) {
            await StorageHelper.set(key, data);
        }
        return data;
    }

    async isSaved(lemma) {
        const vocab = await this.getAll();
        return !!vocab[lemma?.toLowerCase()];
    }

    async getSavedSet() {
        const vocab = await this.getAll();
        return new Set(Object.keys(vocab));
    }
}

export const vocabService = new VocabService();

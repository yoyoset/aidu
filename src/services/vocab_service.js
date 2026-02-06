import { StorageHelper, StorageKeys } from '../utils/storage.js';

export class VocabService {
    constructor() {
        this.currentProfileId = 'default';
        this.baseKey = 'vocab_';

        // Critical: Concurrency & Performance Guards
        this.queue = Promise.resolve(); // 串行写入锁
        this._cache = null;             // 内存缓存

        // Auto-run migration check on instantiation (async but non-blocking)
        this._migrationComplete = this.checkMigration();
    }

    setProfile(profileId) {
        if (this.currentProfileId === profileId) return;
        this.currentProfileId = profileId || 'default';
        this._cache = null; // Clear cache on profile switch
        console.log(`VocabService: Switched to profile '${this.currentProfileId}'`);
    }

    get STORAGE_KEY() {
        return `${this.baseKey}${this.currentProfileId}`;
    }

    async checkMigration() {
        // ... (Migration logic remains same but safer to not block cache init)
        const legacyKey = 'user_vocab';
        const legacyData = await StorageHelper.get(legacyKey);

        if (legacyData && Object.keys(legacyData).length > 0) {
            console.log('VocabService: Found legacy data. Migrating to default profile...');
            const targetKey = 'vocab_default';
            const existingDefault = await StorageHelper.get(targetKey) || {};
            const merged = { ...legacyData, ...existingDefault };
            await StorageHelper.set(targetKey, merged);
            await StorageHelper.remove(legacyKey);
            console.log('VocabService: Migration complete.');
        }
    }

    // --- Core: Read with Cache ---
    async getAll() {
        await this._migrationComplete;

        // Return memory cache if available (Performance)
        if (this._cache) return this._cache;

        const key = this.STORAGE_KEY;
        const data = await StorageHelper.get(key) || {};

        // Data Integrity Check & Cleaning
        let changed = false;
        const cleanedData = {};

        Object.entries(data).forEach(([key, v]) => {
            // 1. Prune completely broken entries
            if (!v || (!v.word && !v.lemma) || key === 'undefined' || key === 'null') {
                console.warn(`VocabService: Pruning invalid entry at key '${key}'`, v);
                changed = true;
                return;
            }

            // 2. Ensure basic fields
            if (!v.stage) {
                v.stage = 'new';
                v.reviews = 0;
                v.nextReview = Date.now();
                v.interval = 0;
                v.easeFactor = 2.5;
                changed = true;
            }

            cleanedData[key] = v;
        });

        this._cache = cleanedData; // Hydrate cache

        if (changed) {
            // Background save fixed data (using cleaned version)
            this._save(cleanedData);
        }
        return cleanedData;
    }

    // --- Core: Write with Queue (Concurrency Safety) ---

    /**
     * Internal atomic save helper (Do not call directly without queue)
     */
    async _save(data) {
        this._cache = data; // Update cache immediately
        await StorageHelper.set(this.STORAGE_KEY, data);
    }

    async add(entry) {
        // Enqueue operation
        return this.queue = this.queue.then(async () => {
            const vocab = await this.getAll();
            if (!entry || (!entry.lemma && !entry.word)) return false;
            const key = (entry.lemma || entry.word).toLowerCase();

            if (vocab[key]) return false;

            vocab[key] = {
                word: entry.word,
                lemma: entry.lemma,
                meaning: entry.meaning || '',
                phonetic: entry.phonetic || '',
                context: entry.context || '',
                level: entry.level || '',
                collocations: entry.collocations || [],
                deepData: null,
                addedAt: Date.now(),
                reviews: 0,
                nextReview: Date.now(),
                stage: 'new',
                easeFactor: 2.5,
                interval: 0,
                updatedAt: Date.now()
            };

            await this._save(vocab);
            console.log(`Vocab (${this.currentProfileId}): Added ${key}`);
            return true;
        }).catch(e => {
            console.error('VocabService: Add failed', e);
            return false;
        });
    }

    async updateEntry(lemma, updates) {
        return this.queue = this.queue.then(async () => {
            if (!lemma) return false;
            const vocab = await this.getAll();
            const key = lemma.toLowerCase();
            if (vocab[key]) {
                vocab[key] = {
                    ...vocab[key],
                    ...updates,
                    updatedAt: Date.now()
                };
                await this._save(vocab);
                return true;
            }
            return false;
        });
    }

    async remove(lemma) {
        return this.queue = this.queue.then(async () => {
            if (!lemma) return false;
            const vocab = await this.getAll();
            const key = lemma.toLowerCase();
            if (vocab[key]) {
                delete vocab[key];
                await this._save(vocab);
            }
            return true;
        });
    }

    // Read-only helpers (Safe to use getAll which is cached)
    async isSaved(lemma) {
        if (!lemma) return false;
        const vocab = await this.getAll();
        return !!vocab[lemma.toLowerCase()];
    }

    async getEntry(lemma) {
        if (!lemma) return null;
        const vocab = await this.getAll();
        return vocab[lemma.toLowerCase()] || null;
    }

    async getSavedSet() {
        const vocab = await this.getAll();
        return new Set(Object.keys(vocab));
    }
}

export const vocabService = new VocabService();

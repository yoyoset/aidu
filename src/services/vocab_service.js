import { StorageHelper, StorageKeys } from '../utils/storage.js';

export class VocabService {
    constructor() {
        this.STORAGE_KEY = 'user_vocab';
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
            interval: 0
        };

        await StorageHelper.set(this.STORAGE_KEY, vocab);
        console.log(`Vocab: Added ${key}`);
        return true;
    }

    async updateEntry(lemma, updates) {
        const vocab = await this.getAll();
        const key = lemma.toLowerCase();
        if (vocab[key]) {
            vocab[key] = { ...vocab[key], ...updates };
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
        const data = await StorageHelper.get(this.STORAGE_KEY) || {};
        // Migration: Ensure fields exist if old data
        let changed = false;
        Object.values(data).forEach(v => {
            if (!v.stage) {
                v.stage = 'neue'; // typo safe later -> 'new'
                v.stage = 'new';
                v.reviews = 0;
                v.nextReview = Date.now();
                v.interval = 0;
                v.easeFactor = 2.5;
                changed = true;
            }
        });
        if (changed) {
            await StorageHelper.set(this.STORAGE_KEY, data);
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

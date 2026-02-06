import { dictionaryService } from './dictionary_service.js';
import { vocabService } from './vocab_service.js';

/**
 * AnalysisQueueManager
 * Implements a background queue for Deep Analysis (Tier 2).
 * Fast Dictionary (Tier 1) remains unaffected.
 */
class AnalysisQueueManager {
    constructor() {
        this.queue = [];
        this.processing = new Set();
        this.cache = new Map(); // Session-level memory cache
        this.concurrencyLimit = 2;
        this.listeners = [];
    }

    /**
     * Push a word into the analysis queue.
     * @param {string} word Original word
     * @param {string} lemma Lemmatized form
     * @param {string} context Context sentence
     */
    async push(word, lemma, context) {
        const key = lemma.toLowerCase();

        // 1. Check Session Cache
        if (this.cache.has(key)) {
            this.notify(key, 'ready', this.cache.get(key));
            return;
        }

        // Bounded Cache: If > 100 items, clear half to prevent infinite growth
        if (this.cache.size > 100) {
            const keys = Array.from(this.cache.keys());
            for (let i = 0; i < 50; i++) this.cache.delete(keys[i]);
        }

        // 2. Check Vocab Book (for already saved deepData)
        const entry = await vocabService.getEntry(key);
        if (entry && entry.deepData) {
            this.cache.set(key, entry.deepData);
            this.notify(key, 'ready', entry.deepData);
            return;
        }

        // 3. Add to Queue if not already processing or queued
        if (!this.processing.has(key) && !this.queue.some(item => item.key === key)) {
            this.queue.push({ word, key, context });
            this.notify(key, 'pending', null);
            this.process();
        }
    }

    async process() {
        if (this.processing.size >= this.concurrencyLimit || this.queue.length === 0) return;

        const task = this.queue.shift();
        this.processing.add(task.key);
        this.notify(task.key, 'loading', null);

        try {
            const deepData = await dictionaryService.fetchTier2(task.key, task.context);
            this.cache.set(task.key, deepData);
            this.notify(task.key, 'ready', deepData);

            // Auto-update vocab if it exists (background sync)
            const entry = await vocabService.getEntry(task.key);
            if (entry) {
                vocabService.updateEntry(task.key, { deepData });
            }
        } catch (e) {
            console.error(`AnalysisQueue: Failed to process ${task.key}`, e);
            this.notify(task.key, 'failed', null);
        } finally {
            this.processing.delete(task.key);
            this.process(); // Next
        }
    }

    notify(lemma, status, data) {
        this.listeners.forEach(cb => cb({ lemma, status, data }));
    }

    subscribe(callback) {
        this.listeners.push(callback);
        // Lifecycle: Return an unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    getCache(lemma) {
        return this.cache.get(lemma.toLowerCase());
    }

    clearSession() {
        this.cache.clear();
        this.queue = [];
        this.processing.clear();
    }
}

export const analysisQueue = new AnalysisQueueManager();

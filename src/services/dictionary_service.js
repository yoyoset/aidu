import { ApiClient } from '../background/llm/api_client.js';
import { StorageHelper, StorageKeys } from '../utils/storage.js';

const DICT_CACHE_KEY = 'aidu_dict_cache';

export class DictionaryService {
    constructor() {
        this.apiClient = new ApiClient();
        this.memCache = {}; // Fast memory access
        this.initPromise = this.loadCache();
    }

    async loadCache() {
        try {
            const stored = await StorageHelper.get(DICT_CACHE_KEY) || {};
            this.memCache = stored;
        } catch (e) {
            console.error('Failed to load dictionary cache', e);
        }
    }

    /**
     * Lookup a word. Checks memory/storage cache first, then API.
     * @param {string} word - The lemma/word to define
     * @param {string} contextSentence - Optional context
     * @returns {Promise<Object>} { m: meaning, p: phonetic, l: level }
     */
    async lookup(word, contextSentence = "") {
        if (!word) return null;
        await this.initPromise; // Ensure cache is loaded

        const lemma = word.toLowerCase();

        // 1. Check Cache
        if (this.memCache[lemma]) return this.memCache[lemma];

        // 2. Fetch from API (LLM)
        try {
            const def = await this.fetchDefinition(lemma, contextSentence);

            // Validate Response
            if (def && (def.m || def.p)) {
                this.memCache[lemma] = def;
                // Async save to storage (don't await to block UI)
                this.saveCache();
                return def;
            }
            throw new Error('Invalid dictionary response');

        } catch (err) {
            console.error('Dictionary Lookup Failed:', err);
            return { m: 'Definition unavailable.', p: '', l: '' };
        }
    }

    async saveCache() {
        try {
            await StorageHelper.set(DICT_CACHE_KEY, this.memCache);
        } catch (e) {
            console.error('Failed to save dictionary cache', e);
        }
    }

    async fetchDefinition(word, context) {
        // Construct a specialized prompt for definition
        const systemPrompt = `You are a dictionary API. Output ONLY valid JSON.
        Format: { "m": "Concise Chinese definition (max 12 chars)", "p": "IPA", "l": "CEFR Level (A1/A2/B1...)" }
        If word is proper noun, identify it. No markdown.`;

        const userPrompt = `Word: "${word}"
        Context: "${context}"`;

        const jsonStr = await this.apiClient.streamCompletion(userPrompt, systemPrompt);
        return JSON.parse(jsonStr);
    }

    /**
     * Generate an example sentence for a word.
     * @param {string} word 
     * @returns {Promise<string>} The example sentence.
     */
    async generateExample(word) {
        const systemPrompt = `You are a helpful language tutor for a young student. 
        Generate ONE English sentence using the word "${word}".
        Constraints:
        1. Structure: Interesting and varied (not just Subject-Verb-Object).
        2. Vocabulary: Simple and easy to understand (CEFR A2 level).
        3. Content: Engaging for a child or young learner.
        4. Output: ONLY the sentence. No quotes.`;

        // Add random seed to user prompt to ensure variety
        const userPrompt = `Word: "${word}" (Random Seed: ${Date.now()})`;

        try {
            const sentence = await this.apiClient.streamCompletion(userPrompt, systemPrompt, {
                responseFormat: 'text',
                temperature: 0.9 // High creativity
            });
            return sentence.trim();
        } catch (e) {
            console.error("Failed to generate example", e);
            throw e;
        }
    }
}

export const dictionaryService = new DictionaryService();

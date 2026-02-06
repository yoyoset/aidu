import { ApiClient } from '../background/llm/api_client.js';
import { StorageHelper, StorageKeys } from '../utils/storage.js';
import { withRetry } from '../utils/retry.js';

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
     * @param {boolean} skipCache - Whether to bypass existing cache
     * @returns {Promise<Object>} { m: meaning, p: phonetic, l: level }
     */
    async lookup(word, contextSentence = "", skipCache = false) {
        if (!word) return null;
        await this.initPromise; // Ensure cache is loaded

        const lemma = word.toLowerCase();

        // 1. Check Cache
        if (!skipCache && this.memCache[lemma]) return this.memCache[lemma];

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
        return withRetry(async () => {
            const systemPrompt = `You are a vocabulary API. Output ONLY valid JSON.
Format: {
    "m": "中文释义 (完整，不限字数)",
    "p": "IPA phonetic",
    "l": "CEFR Level (A1-C2)",
    "collocations": ["常见搭配1", "搭配2", "搭配3"]
}
Rules:
- "m": 核心含义，可包含多义项用分号分隔
- "collocations": 3-5个常见词组搭配
- Keep response concise for speed
- No markdown, no examples`;

            const userPrompt = `Word: "${word}"
Context: "${context}"`;

            const jsonStr = await this.apiClient.streamCompletion(userPrompt, systemPrompt);
            return JSON.parse(jsonStr);
        }, { maxRetries: 2, delayMs: 500 });
    }

    /**
     * Generate an example sentence for a word.
     * @param {string} word 
     * @returns {Promise<string>} The example sentence.
     */
    async generateExample(word) {
        return withRetry(async () => {
            const systemPrompt = `You are a helpful language tutor for a young student. 
        Generate ONE English sentence using the word "${word}".
        Constraints:
        1. Structure: Interesting and varied (not just Subject-Verb-Object).
        2. Vocabulary: Simple and easy to understand (CEFR A2 level).
        3. Content: Engaging for a child or young learner.
        4. Output: ONLY the sentence. No quotes.`;

            // Add random seed to user prompt to ensure variety
            const userPrompt = `Word: "${word}" (Random Seed: ${Date.now()})`;

            const sentence = await this.apiClient.streamCompletion(userPrompt, systemPrompt, {
                responseFormat: 'text',
                temperature: 0.9 // High creativity
            });
            return sentence.trim();
        }, { maxRetries: 2 });
    }

    /**
     * Fetch Tier 2 deep analysis data
     * @param {string} word
     * @param {string} context
     * @returns {Promise<Object>} Deep analysis data
     */
    async fetchTier2(word, context = '') {
        return withRetry(async () => {
            const systemPrompt = `You are a linguistics expert. Output ONLY valid JSON.
Format: {
    "etymology": "词源故事 (中文，简洁)",
    "wordFamily": ["变形1", "变形2"],
    "synonyms": [
        { "word": "同义词", "diff": "区别说明" }
    ],
    "antonyms": ["反义词1", "反义词2"],
    "register": "formal/informal/academic/neutral",
    "commonMistakes": [
        { "wrong": "错误用法", "correct": "正确用法", "note": "说明" }
    ],
    "culturalNotes": "语用/文化提示 (可选)"
}
Rules:
- All explanations in Chinese
- Focus on practical usage for Chinese learners
- No markdown`;

            const userPrompt = `Word: "${word}"
Context: "${context}"`;

            const jsonStr = await this.apiClient.streamCompletion(userPrompt, systemPrompt);
            return JSON.parse(jsonStr);
        }, { maxRetries: 2, delayMs: 800 });
    }
}

export const dictionaryService = new DictionaryService();

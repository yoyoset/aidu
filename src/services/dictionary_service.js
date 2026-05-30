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
     * @param {string} pos - Part of speech (optional)
     * @param {string} contextSentence - Optional context
     * @param {boolean} skipCache - Whether to bypass existing cache
     * @returns {Promise<Object>} { m: meaning, p: phonetic, l: level }
     */
    async lookup(word, pos = "", contextSentence = "", skipCache = false) {
        if (!word) return null;
        await this.initPromise; // Ensure cache is loaded

        const lemma = word.toLowerCase();
        const cacheKey = `${lemma}:${pos || ''}`;

        // 1. Check Cache
        if (!skipCache && this.memCache[cacheKey]) return this.memCache[cacheKey];

        // 2. Fetch from API (LLM)
        try {
            const def = await this.fetchDefinition(lemma, pos, contextSentence);

            // Validate Response
            if (def && (def.m || def.p)) {
                this.memCache[cacheKey] = def;
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

    async _getProfileScopedPrompts() {
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
        const activeProfileId = settings.activeProfileId || 'default';
        const profile = settings.profiles?.[activeProfileId] || {};
        const provider = profile.provider || 'gemini';
        const model = profile.model || 'gemini-2.0-flash';
        const modelKey = `${provider}:${model}`;

        let allExpertPrompts = await StorageHelper.get(StorageKeys.EXPERT_PROMPTS);
        if (!allExpertPrompts || typeof allExpertPrompts !== 'object' || Array.isArray(allExpertPrompts)) {
            allExpertPrompts = {};
        }
        
        // Detect if allExpertPrompts is flat (which is legacy)
        const isFlat = Object.keys(allExpertPrompts).some(key => key.startsWith('analysis_mode_') || key.startsWith('dict_') || key.startsWith('persona_'));
        
        if (isFlat) {
            return allExpertPrompts;
        }
        
        // Return modelKey scoped prompts, falling back to activeProfileId scoped, then empty object
        return allExpertPrompts[modelKey] || allExpertPrompts[activeProfileId] || {};
    }

    async fetchDefinition(word, pos, context) {
        return withRetry(async () => {
            const expertPrompts = await this._getProfileScopedPrompts();
            const systemPrompt = expertPrompts.dict_lookup || `Role: Balanced Dictionary API | Output: JSON ONLY
Constraints:
- Meaning (m): Provide precise meanings in Simplified Chinese. IMPORTANT: Lead with the meaning that matches the provided Part of Speech (POS) and Context.
- Polysemy: If the word has multiple senses, include the primary contextual one first, then others separated by semicolons.
- Schema: {"m":"","p":"","l":"","collocations":[]}

Example:
Input: "lead" | POS: "NOUN" | Context: "The pipe is made of lead."
Output: {"m":"铅; 领导; 领先","p":"led","l":"B2","collocations":["lead pipe"]}`;

            const userPrompt = `Word: "${word}"\nPOS: "${pos || 'UNKNOWN'}"\nContext: "${context}"\n\n{"m":"`;

            const jsonStr = await this.apiClient.streamCompletion(userPrompt, systemPrompt);
            return JSON.parse(jsonStr);
        }, { maxRetries: 2, delayMs: 500 });
    }

    /**
     * Cache Management
     */
    async getCacheStats() {
        await this.initPromise;
        const keys = Object.keys(this.memCache);
        const json = JSON.stringify(this.memCache);
        const sizeInBytes = new TextEncoder().encode(json).length;
        
        return {
            count: keys.length,
            size: (sizeInBytes / 1024).toFixed(1) + ' KB'
        };
    }

    async clearCache() {
        this.memCache = {};
        await StorageHelper.remove(DICT_CACHE_KEY);
        console.log('DictionaryService: Cache cleared.');
    }

    /**
     * Generate an example sentence for a word.
     * @param {string} word 
     * @returns {Promise<string>} The example sentence.
     */
    async generateExample(word) {
        return withRetry(async () => {
            const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
            const profile = settings.profiles?.[settings.activeProfileId] || {};
            const expertPrompts = await this._getProfileScopedPrompts();

            const personaStyle = profile.teachingStyle || 'casual';
            // Simple mapping for difficulty
            const difficulty = personaStyle === 'primary_school' ? 'A2' : (personaStyle === 'academic' ? 'C1' : 'B1');

            const systemPrompt = expertPrompts.example_gen || `Role: Supportive Language Tutor (${personaStyle})
Generate ONE English sentence using "${word}" for a student at ${difficulty} level.
    Constraints:
    1. Tone: Match the style of a "${personaStyle}" persona.
    2. Vocabulary: Strictly ${difficulty} level.
    3. Output: ONLY the sentence. No quotes, no explanation.`;

            const userPrompt = `Word: "${word}" (Style: ${personaStyle}, Level: ${difficulty}, Seed: ${Date.now()})`;

            const sentence = await this.apiClient.streamCompletion(userPrompt, systemPrompt, {
                responseFormat: 'text',
                temperature: 0.9
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
            const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
            const profile = settings.profiles?.[settings.activeProfileId] || {};
            const expertPrompts = await this._getProfileScopedPrompts();

            const personaStyle = profile.teachingStyle || 'casual';

            const systemPrompt = expertPrompts.deep_analysis || `Role: Linguistics Expert (${personaStyle}) | Output: JSON ONLY
Schema: {"etymology":"","wordFamily":[],"synonyms":[{"word":"","diff":""}],"antonyms":["string"],"register":"","commonMistakes":[{"wrong":"","correct":"","note":""}],"culturalNotes":""}
Constraints: 
1. Language: Simplified Chinese.
2. Style: Match the "${personaStyle}" teaching persona.
3. Content: Concise & Practical.`;

            const userPrompt = `Word: "${word}"\nContext: "${context}"\n\n{"etymology":"`;

            const jsonStr = await this.apiClient.streamCompletion(userPrompt, systemPrompt);
            return JSON.parse(jsonStr);
        }, { maxRetries: 2, delayMs: 800 });
    }
}

export const dictionaryService = new DictionaryService();

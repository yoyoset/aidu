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
            const expertPrompts = await StorageHelper.get(StorageKeys.EXPERT_PROMPTS) || {};
            const systemPrompt = expertPrompts.dict_lookup || `Role: Balanced Dictionary API | Output: JSON ONLY
Constraints:
- Meaning: Provide 1-2 precise primary meanings in Simplified Chinese. If the word has multiple distinct common meanings, include up to 3, separated by semicolons.
- Context: Prioritize the meaning that fits the provided context, but don't omit other common senses if they are important.
- Schema: {"m":"","p":"","l":"","collocations":[]}

Example:
Input: "snail" | Context: "Slow"
Output: {"m":"蜗牛","p":"sneɪl","l":"A2","collocations":["garden snail"]}`;

            const userPrompt = `Word: "${word}"\nContext: "${context}"\n\n{"m":"`;

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
            const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
            const profile = settings.profiles?.[settings.activeProfileId] || {};
            const expertPrompts = await StorageHelper.get(StorageKeys.EXPERT_PROMPTS) || {};

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
            const expertPrompts = await StorageHelper.get(StorageKeys.EXPERT_PROMPTS) || {};

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

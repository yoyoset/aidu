/**
 * SmartRouter
 * Determines the analysis strategy and constructs prompts.
 */
export class SmartRouter {
    constructor() {
        this.strategies = {
            1: 'TRANSLATION', // Basic
            2: 'STANDARD',    // Segmentation + POS
            3: 'DEEP'         // + Explanation
        };
    }

    selectStrategy(text) {
        // Simplest: Always Standard for now?
        // Or detect complexity.
        return 'STANDARD';
    }

    /**
     * Constructs the message payload for the LLM
     */
    route(draft) {
        const strategyId = draft.analysisMode || 2;
        // eslint-disable-next-line no-unused-vars
        const strategy = this.strategies[strategyId] || 'STANDARD';

        const sysPrompt = this.getSystemPrompt(strategyId);
        const userPrompt = this.getUserPrompt(draft.rawText);

        return { system: sysPrompt, user: userPrompt };
    }

    getSystemPrompt(mode) {
        const base = `You are a linguistic expert backend optimization for language learning.
Analyze the provided text and output valid JSON only.

STRICT JSON RULES:
1. Output MUST be a single valid JSON object.
2. NO Markdown code blocks (e.g. \`\`\`json).
3. NO conversational text or preamble.
4. NO trailing commas.`;

        if (mode === 1) {
            // TRANSLATION ONLY
            return `${base}
            Schema: { "sentences": [ { "original_text": string, "translation": string } ] }
            Rules:
            1. Split text into semantic sentences.
            2. Translate naturally and accurately to Simplified Chinese.`;
        } else if (mode === 3) {
            // DEEP ANALYSIS
            return `${base}
            Schema: { 
                "sentences": [ 
                    { 
                        "original_text": string, 
                        "translation": string,
                        "segments": [ [string (word/phrase), string (POS), string (lemma)]... ],
                        "explanation": string
                    } 
                ] 
            }
            Rules:
            1. Split text into semantic sentences.
            2. Translate naturally to Simplified Chinese.
            3. Segment each sentence into [Word/Phrase, POS, Lemma] tuples.
               - IMPORTANT: Identify and group phrasal verbs or collocations (e.g., "such as", "look forward to") as a SINGLE segment.
               - Lemma for phrasal verbs should be the base form (e.g. "look forward to").
            4. POS tags: NOUN, VERB, ADJ, ADV, PRON, PREP, CONJ, PART, INTJ, DET, NUM, PUNCT, STOP.
            5. Explanation: REQUIRED. Provide a detailed grammatical analysis in SIMPLIFIED CHINESE.
               - Identify clauses, tenses, and sentence structure.
               - explaining idioms or diffcult vocabulary in context.
               - STRICTLY USE CHINESE for the explanation content.`;
        } else {
            // STANDARD (Default)
            return `${base}
            Schema: { 
                "sentences": [ 
                    { 
                        "original_text": string, 
                        "translation": string,
                        "segments": [ [string (word/phrase), string (POS), string (lemma)]... ],
                        "explanation": string
                    } 
                ] 
            }
            Rules:
            1. Split text into semantic sentences.
            2. Translate naturally to Simplified Chinese.
            3. Segment each sentence into [Word/Phrase, POS, Lemma] tuples.
               - IMPORTANT: Identify and group phrasal verbs or collocations (e.g., "such as", "give up") as a SINGLE segment.
            4. POS tags: NOUN, VERB, ADJ, ADV, PRON, PREP, CONJ, PART, INTJ, DET, NUM, PUNCT, STOP.
            5. Explanation: Optional. Brief notes on key idioms or structures in Simplified Chinese. Return empty string if simple.`;
        }
    }

    getUserPrompt(text) {
        return `Text to analyze:\n${text}`;
    }
}

export const AnalysisStrategies = {
    TRANSLATION: 1,
    STANDARD: 2,
    DEEP: 3
};

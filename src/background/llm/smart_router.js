/**
 * SmartRouter
 * Determines the analysis strategy and constructs prompts.
 * Uses PromptTemplates for static prompt generation.
 */
import { getPersonaPrompt } from './persona.js';
import { getSystemPrompt } from './prompt_templates.js';

export class SmartRouter {
    constructor() {
        this.strategies = {
            1: 'TRANSLATION', // Basic
            2: 'STANDARD',    // Segmentation + POS
            3: 'DEEP'         // + Explanation
        };
        this.teachingStyle = 'casual'; // Default
    }

    setTeachingStyle(style) {
        this.teachingStyle = style;
    }

    selectStrategy(text) {
        // Simplest: Always Standard for now
        return 'STANDARD';
    }

    /**
     * Constructs the message payload for the LLM
     */
    async route(draft) {
        const strategyId = draft.analysisMode || 2;

        // Removed Expert Overrides (SRP / Complexity Reduction)
        // System now strictly follows internal templates.

        const personaPrompt = getPersonaPrompt(this.teachingStyle);
        const sysPrompt = getSystemPrompt(strategyId, personaPrompt);
        const userPrompt = this.getUserPrompt(draft.rawText);

        return { system: sysPrompt, user: userPrompt };
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

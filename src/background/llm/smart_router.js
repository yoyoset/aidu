/**
 * SmartRouter
 * Determines the analysis strategy and constructs prompts.
 * Uses PromptTemplates for static prompt generation.
 */
import { getPersonaPrompt } from './persona.js';
import { getSystemPrompt } from './prompt_templates.js';
import { StorageHelper, StorageKeys } from '../../utils/storage.js';

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

        // Fetch latest settings for every request to ensure Persona/Expert sync
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
        const profile = settings.profiles?.[settings.activeProfileId] || {};
        const expertPrompts = await StorageHelper.get(StorageKeys.EXPERT_PROMPTS) || {};

        const personaStyle = profile.teachingStyle || this.teachingStyle;
        const personaPrompt = getPersonaPrompt(personaStyle);

        // Expert override for this specific mode
        const expertOverride = expertPrompts[`analysis_mode_${strategyId}`];

        const sysPrompt = getSystemPrompt(strategyId, personaPrompt, expertOverride);
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

import { FetchUtils } from '../../../utils/fetch_utils.js';
import { LlmErrorHelper } from '../../../utils/llm_error_helper.js';
import { logger } from '../../../utils/logger.js';
import { JsonCleaner } from '../utils/json_cleaner.js';

/**
 * GeminiProvider
 * Logic for interacting with Google Gemini API.
 */
export class GeminiProvider {
    static async call(config, prompt, systemPrompt, options = {}) {
        const model = config.model || 'gemini-2.0-flash-exp';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

        const fullPrompt = `${systemPrompt}\n\nUser Input:\n${prompt}`;

        const payload = {
            contents: [{
                parts: [{ text: fullPrompt }]
            }],
            generationConfig: {
                temperature: options.temperature || 0.1,
                maxOutputTokens: 8192
            }
        };

        const response = await FetchUtils.fetchWithRetry(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            logger.error(`GeminiProvider: Gemini returned error ${response.status}`);
            throw await LlmErrorHelper.interpret(response, 'gemini');
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) {
            logger.error('GeminiProvider: Gemini returned empty response', data);
            throw await LlmErrorHelper.interpret(data, 'gemini');
        }

        if (options.responseFormat === 'text') {
            return content.trim();
        }

        return JsonCleaner.clean(content);
    }
}

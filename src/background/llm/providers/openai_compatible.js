import { FetchUtils } from '../../../utils/fetch_utils.js';
import { LlmErrorHelper } from '../../../utils/llm_error_helper.js';
import { logger } from '../../../utils/logger.js';
import { JsonCleaner } from '../utils/json_cleaner.js';

/**
 * OpenAICompatibleProvider
 * Logic for interacting with DeepSeek, GLM, OpenAI, and custom endpoints.
 */
export class OpenAICompatibleProvider {
    static async call(config, prompt, systemPrompt, options = {}) {
        let baseUrl;
        if (config.provider === 'custom') {
            baseUrl = config.baseUrl || 'https://api.openai.com/v1';
        } else if (config.provider === 'deepseek') {
            baseUrl = 'https://api.deepseek.com/v1';
        } else if (config.provider === 'glm') {
            baseUrl = 'https://open.bigmodel.cn/api/paas/v4';
        } else {
            baseUrl = 'https://api.openai.com/v1';
        }

        if (config.baseUrl) baseUrl = config.baseUrl;

        const sysMsg = systemPrompt || "You are a helpful assistant. Output pure JSON only.";
        const payload = {
            model: config.model,
            messages: [
                { role: "system", content: sysMsg },
                { role: "user", content: prompt }
            ],
            temperature: options.temperature || 0.7,
            response_format: { type: "json_object" },
            stream: false,
            max_tokens: 4096
        };

        const response = await FetchUtils.fetchWithRetry(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            logger.error(`OpenAICompatibleProvider: Error ${response.status}`);
            throw await LlmErrorHelper.interpret(response, config.provider);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            logger.error('OpenAICompatibleProvider: Empty response', data);
            throw await LlmErrorHelper.interpret(data, config.provider);
        }

        if (options.responseFormat === 'text') {
            return content.trim();
        }

        return JsonCleaner.clean(content);
    }
}

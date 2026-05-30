import { FetchUtils } from '../../../utils/fetch_utils.js';
import { LlmErrorHelper } from '../../../utils/llm_error_helper.js';
import { logger } from '../../../utils/logger.js';
import { JsonCleaner } from '../utils/json_cleaner.js';
import { getStandardSchema } from '../utils/response_schema.js';

/**
 * OpenAICompatibleProvider
 * Logic for interacting with DeepSeek, GLM, OpenAI, and custom endpoints.
 */
export class OpenAICompatibleProvider {
    static async call(config, prompt, systemPrompt, options = {}) {
        let baseUrl;
        const provider = config.provider;

        if (provider === 'custom') {
            baseUrl = config.baseUrl || 'https://api.openai.com/v1';
        } else if (provider === 'deepseek') {
            baseUrl = 'https://api.deepseek.com/v1';
        } else if (provider === 'glm') {
            baseUrl = 'https://open.bigmodel.cn/api/paas/v4';
        } else {
            baseUrl = 'https://api.openai.com/v1';
        }

        if (config.baseUrl) baseUrl = config.baseUrl;

        const mode = options.mode || 2;
        const sysMsg = systemPrompt || "You are a helpful assistant. Output pure JSON only.";

        // 构造响应格式：仅 OpenAI 原生通道支持 json_schema (Structured Outputs)；DeepSeek 等兼容端使用 json_object
        let responseFormat = { type: "json_object" };
        if (provider === 'openai') {
            responseFormat = {
                type: "json_schema",
                json_schema: {
                    name: "analysis_result",
                    strict: true,
                    schema: getStandardSchema(mode)
                }
            };
        }

        const payload = {
            model: config.model,
            messages: [
                { role: "system", content: sysMsg },
                { role: "user", content: prompt }
            ],
            temperature: options.temperature || 0.7,
            response_format: responseFormat,
            stream: false,
            max_tokens: options.maxTokens || 8192
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
            const finishReason = data.choices?.[0]?.finish_reason;
            logger.error(`OpenAICompatibleProvider: Empty response (Reason: ${finishReason})`, data);
            throw await LlmErrorHelper.interpret(data, config.provider);
        }

        if (options.responseFormat === 'text') {
            return content.trim();
        }

        return JsonCleaner.clean(content);
    }
}

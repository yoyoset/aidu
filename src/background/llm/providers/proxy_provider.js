import { FetchUtils } from '../../../utils/fetch_utils.js';
import { LlmErrorHelper } from '../../../utils/llm_error_helper.js';
import { logger } from '../../../utils/logger.js';
import { JsonCleaner } from '../utils/json_cleaner.js';
import { StorageHelper, StorageKeys } from '../../../utils/storage.js';

/**
 * ProxyProvider
 * Logic for interacting with the secure AIDU proxy.
 */
export class ProxyProvider {
    static async call(config, prompt, systemPrompt, options = {}) {
        const installId = await this.getInstallId();
        const providerMapping = {
            'gemini': 'gemini',
            'glm': 'zhipu',
            'deepseek': 'openai',
            'openai': 'openai'
        };

        const providerIdent = providerMapping[config.provider] || 'gemini';
        let payload = {};

        if (providerIdent === 'gemini') {
            payload = {
                contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
                generationConfig: {
                    temperature: options.temperature || 0.1,
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json"
                }
            };
        } else {
            payload = {
                model: config.model || 'glm-4-flash',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ]
            };
        }

        const response = await FetchUtils.fetchWithRetry(config.proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Install-ID': installId
            },
            body: JSON.stringify({
                provider: providerIdent,
                payload: payload
            })
        });

        if (!response.ok) {
            logger.error(`ProxyProvider: Proxy returned error ${response.status}`);
            throw await LlmErrorHelper.interpret(response, config.provider);
        }

        const data = await response.json();
        let content = '';
        if (providerIdent === 'gemini') {
            content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        } else {
            content = data.choices?.[0]?.message?.content;
        }

        if (!content) {
            logger.warn('ProxyProvider: Empty content returned', data);
            throw await LlmErrorHelper.interpret(data, config.provider);
        }

        return JsonCleaner.clean(content);
    }

    static async getInstallId() {
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
        if (!settings.installId) {
            settings.installId = crypto.randomUUID();
            await StorageHelper.set(StorageKeys.USER_SETTINGS, settings);
        }
        return settings.installId;
    }
}

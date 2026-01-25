import { StorageHelper, StorageKeys } from '../../utils/storage.js';

// Obfuscated default key for GLM-4-Flash free tier (split + reversed)
const _k = ['rjJG', 'fm9F', '2Aoi', 'fBEC'];
const _p = ['a321', 'aaaa', '79cb', '4f96', 'a98a', 'c046', 'f976', 'fcbc'];
const getDefaultGlmKey = () => _p.join('') + '.' + _k.join('');

/**
 * ApiClient
 * Handling external LLM API calls with configuration from user settings.
 */
export class ApiClient {
    constructor() {
        this._configCache = null;
        this._configCacheTime = 0;
        this._configCacheTTL = 30000; // 30 seconds
    }

    /**
     * Helper: Get active provider and config
     */
    async getConfig() {
        // Return cached config if valid
        if (this._configCache && (Date.now() - this._configCacheTime) < this._configCacheTTL) {
            return this._configCache;
        }

        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
        const activeProfileId = settings.activeProfileId;
        const profile = settings.profiles?.[activeProfileId];

        if (!profile) throw new Error('No active profile found');

        const providerName = profile.provider || 'gemini';

        // Handle glm-free provider (uses built-in key)
        if (providerName === 'glm-free') {
            const config = {
                provider: 'glm-free',
                apiKey: getDefaultGlmKey(),
                model: 'glm-4-flash',
                baseUrl: 'https://open.bigmodel.cn/api/paas/v4'
            };
            this._configCache = config;
            this._configCacheTime = Date.now();
            return config;
        }

        const providerConfig = profile.providerConfig?.[providerName];
        const apiKey = providerConfig?.apiKey || profile.apiKey;

        if (!apiKey) throw new Error(`Missing API Key for provider: ${providerName}`);

        const config = {
            provider: providerName,
            apiKey: apiKey,
            model: providerConfig?.model,
            baseUrl: providerConfig?.baseUrl
        };

        // Cache the result
        this._configCache = config;
        this._configCacheTime = Date.now();

        return config;
    }

    /**
     * Stream completion (Simulated for now via blocking call)
     * Updated to accept systemPrompt
     */
    async streamCompletion(textChunk, systemPrompt, options = {}) {
        const config = await this.getConfig();
        const prompt = `${textChunk}`; // User just sends text. System Prompt handles instructions.

        console.log(`[ApiClient] Requesting ${config.provider} (${config.model || 'default'})`);

        if (config.provider === 'deepseek' || config.provider === 'openai' || config.provider === 'custom' || config.provider === 'glm' || config.provider === 'glm-free') {
            return this.callOpenAICompatible(config, prompt, systemPrompt, options);
        } else if (config.provider === 'gemini') {
            return this.callGemini(config, prompt, systemPrompt, options);
        } else {
            throw new Error(`Unsupported provider: ${config.provider}`);
        }
    }

    async callOpenAICompatible(config, prompt, systemPrompt, options = {}) {
        // Generic OpenAI Compatible (DeepSeek, ChatGPT, GLM, Custom)
        let baseUrl;
        if (config.provider === 'custom') {
            baseUrl = config.baseUrl || 'https://api.openai.com/v1';
        } else if (config.provider === 'deepseek') {
            baseUrl = 'https://api.deepseek.com/v1';
        } else if (config.provider === 'glm' || config.provider === 'glm-free') {
            baseUrl = 'https://open.bigmodel.cn/api/paas/v4';
        } else {
            baseUrl = 'https://api.openai.com/v1';
        }

        // Allow user override via config.baseUrl if provided and valid (except for known fixed providers where we might want to enforce it, but flexibility is better)
        if (config.baseUrl) baseUrl = config.baseUrl;

        const sysMsg = systemPrompt || "You are a helpful assistant. Output pure JSON only.";

        const payload = {
            model: config.model || 'deepseek-chat',
            messages: [
                { role: "system", content: sysMsg },
                { role: "user", content: prompt }
            ],
            temperature: options.temperature || 0.7,
            stream: false, // Streaming is separate Phase
            max_tokens: 4096
        };

        const response = await this.fetchWithRetry(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error('Empty response from API');

        if (options.responseFormat === 'text') {
            return content.trim();
        }
        return this.cleanJson(content);
    }

    async callGemini(config, prompt, systemPrompt, options = {}) {
        // Google Gemini REST API
        // Gemini handles System Instructions differently (beta), 
        // fallback: Prepend system prompt to user prompt for now.

        const model = config.model || 'gemini-pro';
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

        const response = await this.fetchWithRetry(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) throw new Error('Empty response from Gemini');

        if (options.responseFormat === 'text') {
            return content.trim();
        }
        return this.cleanJson(content);
    }


    async fetchWithRetry(url, options, maxRetries = 3) {
        const delays = [1000, 2000, 4000];
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, options);
                if (response.ok) return response;

                // Rate Limit: Use Retry-After header
                if (response.status === 429) {
                    const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
                    console.warn(`Rate limited. Waiting ${retryAfter}s before retry...`);
                    await new Promise(r => setTimeout(r, retryAfter * 1000));
                    continue; // Retry without counting as attempt
                }

                // 5xx errors are retryable, 4xx are not
                if (response.status >= 400 && response.status < 500) {
                    const errText = await response.text();
                    throw new Error(`API Error ${response.status}: ${errText}`);
                }
                throw new Error(`Server Error ${response.status}`);
            } catch (e) {
                if (attempt === maxRetries) throw e;
                console.warn(`API retry ${attempt + 1}/${maxRetries}: ${e.message}`);
                await new Promise(r => setTimeout(r, delays[attempt] || 5000));
            }
        }
    }

    /**
     * Helper to extract JSON from markdown code blocks or raw text
     */
    cleanJson(text) {
        if (!text) return text;
        let clean = text.trim();

        // 1. Try to unwrap markdown code blocks
        const matches = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (matches && matches[1]) {
            clean = matches[1].trim();
        }

        // 2. Detect JSON type (object or array)
        const firstOpen = clean.indexOf('{');
        const firstBracket = clean.indexOf('[');
        const lastClose = clean.lastIndexOf('}');
        const lastBracket = clean.lastIndexOf(']');

        // Determine which comes first and is valid
        if (firstBracket !== -1 && (firstOpen === -1 || firstBracket < firstOpen)) {
            // Array response
            if (lastBracket >= firstBracket) {
                clean = clean.substring(firstBracket, lastBracket + 1);
            }
        } else if (firstOpen !== -1) {
            // Object response
            if (lastClose >= firstOpen) {
                clean = clean.substring(firstOpen, lastClose + 1);
            }
        } else {
            throw new Error(`No JSON found in response. Raw start: "${text.substring(0, 50)}..."`);
        }

        return clean;
    }
}

import { StorageHelper, StorageKeys } from '../../utils/storage.js';

/**
 * ApiClient
 * Handling external LLM API calls with configuration from user settings.
 */
export class ApiClient {
    constructor() {
    }

    /**
     * Helper: Get active provider and config
     */
    async getConfig() {
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
        const activeProfileId = settings.activeProfileId;
        const profile = settings.profiles?.[activeProfileId];

        if (!profile) throw new Error('No active profile found');

        const providerName = profile.provider || 'gemini';
        const providerConfig = profile.providerConfig?.[providerName];
        const apiKey = providerConfig?.apiKey || profile.apiKey;

        if (!apiKey) throw new Error(`Missing API Key for provider: ${providerName}`);

        return {
            provider: providerName,
            apiKey: apiKey,
            model: providerConfig?.model
        };
    }

    /**
     * Stream completion (Simulated for now via blocking call)
     * Updated to accept systemPrompt
     */
    async streamCompletion(textChunk, systemPrompt, options = {}) {
        const config = await this.getConfig();
        const prompt = `${textChunk}`; // User just sends text. System Prompt handles instructions.

        console.log(`[ApiClient] Requesting ${config.provider} (${config.model || 'default'})`);

        if (config.provider === 'deepseek' || config.provider === 'openai') {
            return this.callOpenAICompatible(config, prompt, systemPrompt, options);
        } else if (config.provider === 'gemini') {
            return this.callGemini(config, prompt, systemPrompt, options);
        } else {
            throw new Error(`Unsupported provider: ${config.provider}`);
        }
    }

    async callOpenAICompatible(config, prompt, systemPrompt, options = {}) {
        // Generic OpenAI Compatible (DeepSeek, ChatGPT)
        const baseUrl = config.provider === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1';

        const sysMsg = systemPrompt || "You are a helpful assistant. Output pure JSON only.";

        const payload = {
            model: config.model || 'deepseek-chat',
            messages: [
                { role: "system", content: sysMsg },
                { role: "user", content: prompt }
            ],
            temperature: options.temperature || 0.7,
            stream: false // Streaming is separate Phase
        };

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API Error ${response.status}: ${errText}`);
        }

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
                temperature: options.temperature || 0.1
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API Error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) throw new Error('Empty response from Gemini');

        if (options.responseFormat === 'text') {
            return content.trim();
        }
        return this.cleanJson(content);
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

        // 2. Locate first '{' and last '}' to handle conversational prefix/suffix
        const firstOpen = clean.indexOf('{');
        const lastClose = clean.lastIndexOf('}');

        if (firstOpen !== -1 && lastClose !== -1 && lastClose >= firstOpen) {
            clean = clean.substring(firstOpen, lastClose + 1);
        } else if (firstOpen === -1) {
            // Hard failure: No JSON object detected
            throw new Error(`No JSON object found in response. Raw start: "${text.substring(0, 50)}..."`);
        }

        return clean;
    }
}

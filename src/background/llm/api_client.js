import { profileManager } from '../../core/profile_manager.js';
import { logger } from '../../utils/logger.js';
import { GeminiProvider } from './providers/gemini_provider.js';
import { OpenAICompatibleProvider } from './providers/openai_compatible.js';
import { ProxyProvider } from './providers/proxy_provider.js';

/**
 * ApiClient
 * Light orchestration layer for external LLM API calls.
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
        if (this._configCache && (Date.now() - this._configCacheTime) < this._configCacheTTL) {
            return this._configCache;
        }

        await profileManager.load();
        const profile = profileManager.getActiveProfile();
        if (!profile) throw new Error('No active profile found');

        const providerName = profile.provider || 'gemini';

        const providerConfig = profile.providerConfig?.[providerName];
        const apiKey = providerConfig?.apiKey || profile.apiKey;
        const proxyUrl = providerConfig?.proxyUrl;

        if (!apiKey && !proxyUrl) {
            throw new Error(`Missing API Key for provider: ${providerName}`);
        }

        const config = {
            provider: providerName,
            apiKey: apiKey || '',
            model: providerConfig?.model || profile.model,
            baseUrl: providerConfig?.baseUrl || profile.baseUrl,
            proxyUrl: proxyUrl
        };

        this._configCache = config;
        this._configCacheTime = Date.now();
        return config;
    }

    /**
     * Executes an LLM completion request
     */
    async streamCompletion(textChunk, systemPrompt, options = {}) {
        const config = await this.getConfig();
        const prompt = `${textChunk}`;
        
        // Ensure mode is passed in options
        const providerOptions = { ...options };

        logger.info(`[ApiClient] Routing request for ${config.provider} via ${config.proxyUrl ? 'Proxy' : 'Direct'}`);

        // 1. Delegate to Proxy if configured
        if (config.proxyUrl) {
            return ProxyProvider.call(config, prompt, systemPrompt, providerOptions);
        }

        // 2. Delegate to specific Direct providers
        switch (config.provider) {
            case 'gemini':
                return GeminiProvider.call(config, prompt, systemPrompt, providerOptions);

            case 'deepseek':
            case 'openai':
            case 'custom':
            case 'glm':
            case 'glm-free':
                return OpenAICompatibleProvider.call(config, prompt, systemPrompt, providerOptions);

            default:
                throw new Error(`Unsupported provider: ${config.provider}`);
        }
    }
}

import { t } from '../locales/index.js';

/**
 * LlmErrorHelper
 * Responsibility: Extracting and interpreting error messages from different LLM providers and the secure proxy.
 */
export class LlmErrorHelper {
    /**
     * Interprets a failed response or a structured error JSON
     * @param {Response|Object} source - The fetch response object or a parsed JSON error
     * @param {string} provider - Provider name (e.g., 'glm-free', 'gemini', 'openai')
     * @returns {Promise<Error>} - A descriptive error object with localizable message
     */
    static async interpret(source, provider) {
        let errorCode = null;
        let technicalMsg = '';
        let status = 0;

        if (source instanceof Response) {
            status = source.status;
            try {
                const data = await source.json();
                return this.parseErrorData(data, status, provider);
            } catch (e) {
                technicalMsg = await source.text().catch(() => 'No response body');
            }
        } else if (typeof source === 'object') {
            return this.parseErrorData(source, 0, provider);
        }

        // Fallback for raw status codes if JSON parsing failed
        const message = this.mapStatusToMessage(status || 500, technicalMsg);
        return new Error(message);
    }

    /**
     * Parses structured JSON error data from different providers
     */
    static parseErrorData(data, status, provider) {
        // 1. Proxy level errors (Generic)
        if (data.error && typeof data.error === 'string') {
            return new Error(this.mapTechnicalToUser(data.error));
        }

        // 2. OpenAI Style (DeepSeek, GLM, etc)
        if (data.error && data.error.message) {
            return new Error(this.mapTechnicalToUser(data.error.message, data.error.code));
        }

        // 3. Gemini Style
        if (data.error && Array.isArray(data.error.details)) {
            const detail = data.error.details[0];
            const reason = detail?.reason || data.error.status;
            return new Error(this.mapTechnicalToUser(data.error.message, reason));
        }

        // 4. Zhipu (GLM) direct errors sometimes use a different top-level 'msg' or 'error_msg'
        if (data.msg || data.error_msg) {
            return new Error(this.mapTechnicalToUser(data.msg || data.error_msg));
        }

        // Default fallback
        const msg = this.mapStatusToMessage(status, JSON.stringify(data));
        return new Error(msg);
    }

    /**
     * Maps status codes to localizable messages
     */
    static mapStatusToMessage(status, raw) {
        if (status === 401) return t('error.llm.unauthorized') || 'API Key 校验失败，请检查设置。';
        if (status === 403) return t('error.llm.quota') || '额度不足或访问被拒绝。';
        if (status === 429) return t('error.llm.rate_limit') || '请求过于频繁，请稍后再试。';
        if (status >= 500) return t('error.llm.server_error') || '服务商内部错误 (5xx)，请稍后重试。';

        return `${t('error.llm.general') || 'LLM 请求失败'}: ${status} (${raw.substring(0, 100)})`;
    }

    /**
     * Maps technical error strings/codes to user-friendly hints
     */
    static mapTechnicalToUser(technicalMsg, code) {
        const msg = technicalMsg.toLowerCase();

        // Quota / Credit errors
        if (msg.includes('quota') || msg.includes('credit') || msg.includes('insufficient') || msg.includes('balance')) {
            return t('error.llm.quota') || '当前模型额度已耗尽，请尝试更换模型或在设置中充值。';
        }

        // Safe Search / Content Filter
        if (msg.includes('safety') || msg.includes('content') || msg.includes('block')) {
            return t('error.llm.safety_blocked') || '请求内容涉及敏感话题已被模型拦截。';
        }

        // Rate Limit
        if (msg.includes('rate limit') || msg.includes('too many requests')) {
            return t('error.llm.rate_limit') || '由于请求过于频繁，当前已被临时限流。';
        }

        // Model not found
        if (msg.includes('model_not_found') || msg.includes('not found')) {
            return t('error.llm.model_error') || '模型配置错误或该模型已下线。';
        }

        return technicalMsg; // Fallback to raw if no better match
    }
}

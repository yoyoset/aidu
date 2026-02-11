/**
 * FetchUtils
 * Advanced fetch wrappers with retry and notification logic.
 */
export class FetchUtils {
    /**
     * Fetch with automatic retries and rate limit handling
     */
    static async fetchWithRetry(url, options, maxRetries = 3) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, options);
                if (response.ok) return response;

                // Rate Limit: 429 Too Many Requests
                if (response.status === 429) {
                    if (attempt === maxRetries) {
                        throw new Error(`多次重试后仍被限频 (429: Too Many Requests)`);
                    }

                    const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
                    const jitter = Math.random() * 2000;
                    const waitMs = (retryAfter * 1000) + jitter;

                    console.warn(`[FetchUtils] 429 Rate limited. Attempt ${attempt + 1}/${maxRetries}. Waiting ${Math.round(waitMs / 1000)}s...`);

                    this.notifyUser(`接口频繁 (429)，正在尝试第 ${attempt + 1} 次重试...`, 'warn');

                    await new Promise(r => setTimeout(r, waitMs));
                    continue;
                }

                if (response.status >= 400 && response.status < 500) {
                    const errText = await response.text().catch(() => 'No Body');
                    throw new Error(`API Error ${response.status}: ${errText}`);
                }
                throw new Error(`Server Error ${response.status}`);
            } catch (e) {
                if (attempt === maxRetries) {
                    console.error(`[FetchUtils] Final attempt failed for ${url}:`, e);
                    this.notifyUser(`请求最终失败: ${e.message}`, 'error');
                    throw e;
                }

                const baseDelay = Math.pow(2, attempt) * 1000;
                const jitter = Math.random() * 1000;
                const waitMs = baseDelay + jitter;

                console.warn(`[FetchUtils] Retry ${attempt + 1}/${maxRetries} for ${url}: ${e.message}.`);
                await new Promise(r => setTimeout(r, waitMs));
            }
        }
    }

    /**
     * Helper to send Toast notifications via MessageRouter
     */
    static notifyUser(message, type = 'info') {
        chrome.runtime.sendMessage({
            type: 'SHOW_TOAST',
            payload: { message, type }
        }).catch(() => {
            // Background context might be disconnected, ignore
        });
    }
}

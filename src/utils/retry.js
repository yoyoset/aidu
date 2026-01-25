/**
 * 带重试的异步请求封装
 * @param {Function} fn - 异步函数
 * @param {Object} options - { maxRetries: 3, delayMs: 1000, backoff: 2 }
 */
export async function withRetry(fn, options = {}) {
    const { maxRetries = 3, delayMs = 1000, backoff = 2 } = options;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (attempt < maxRetries) {
                // Check if error is retryable (optional logic could go here)
                const wait = delayMs * Math.pow(backoff, attempt);
                // console.log(`Retry ${attempt + 1}/${maxRetries} in ${wait}ms...`);
                await new Promise(r => setTimeout(r, wait));
            }
        }
    }
    throw lastError;
}

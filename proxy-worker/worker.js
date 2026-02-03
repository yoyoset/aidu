export default {
    async fetch(request, env, ctx) {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Install-ID",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
        }

        const installId = request.headers.get("X-Install-ID");
        if (!installId) {
            return new Response("Unauthorized: Missing Install ID", { status: 401, headers: corsHeaders });
        }

        // --- Rate Limiting Logic (KV) ---
        const now = Date.now();
        const minuteKey = `min:${installId}:${Math.floor(now / 60000)}`;
        const dayKey = `day:${installId}:${new Date().toISOString().split('T')[0]}`;

        // Per-minute check (Max 5)
        // NOTE: This will fail if KV is removed, but we are diagnosing why KV creation fails first.
        // If we fix KV creation, we need this logic back.
        if (env.AIDU_LIMITS) {
            const minCount = parseInt(await env.AIDU_LIMITS.get(minuteKey) || "0");
            if (minCount >= 5) {
                return new Response(JSON.stringify({
                    error: "RATE_LIMIT_EXCEEDED",
                    message: "⚠️ 调用太频繁了！公共节点每分钟限 5 次，请稍后再试，或在设置中填入您自己的 API Key 以通过私有通道访问。"
                }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // Per-day check (Max 50)
            const dayCount = parseInt(await env.AIDU_LIMITS.get(dayKey) || "0");
            if (dayCount >= 50) {
                return new Response(JSON.stringify({
                    error: "DAILY_LIMIT_EXCEEDED",
                    message: "今日免费额度已用完 (50/50)。公共节点资源有限，建议在插件设置中填入您自己的 API Key 以解锁无限额度。"
                }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }

            // Update Counters
            ctx.waitUntil(env.AIDU_LIMITS.put(minuteKey, (minCount + 1).toString(), { expirationTtl: 120 }));
            ctx.waitUntil(env.AIDU_LIMITS.put(dayKey, (dayCount + 1).toString(), { expirationTtl: 172800 })); // 48h safety
        }

        try {
            const body = await request.json();
            const { provider, payload } = body;

            if (provider === "zhipu" || provider === "glm") {
                return handleZhipu(payload, env.ZHIPU_API_KEY, corsHeaders);
            }

            return new Response("Unsupported Provider", { status: 400, headers: corsHeaders });
        } catch (err) {
            return new Response(err.message, { status: 500, headers: corsHeaders });
        }
    }
};

async function handleZhipu(payload, apiKey, corsHeaders) {
    const url = "https://open.bigmodel.cn/api/paas/v4/chat/completions";

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
        }
    });
}

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var worker_default = {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Install-ID"
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
    const now = Date.now();
    const minuteKey = `min:${installId}:${Math.floor(now / 6e4)}`;
    const dayKey = `day:${installId}:${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`;
    const minCount = parseInt(await env.AIDU_LIMITS.get(minuteKey) || "0");
    if (minCount >= 5) {
      return new Response(JSON.stringify({
        error: "RATE_LIMIT_EXCEEDED",
        message: "\u26A0\uFE0F \u8C03\u7528\u592A\u9891\u7E41\u4E86\uFF01\u516C\u5171\u8282\u70B9\u6BCF\u5206\u949F\u9650 5 \u6B21\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5\uFF0C\u6216\u5728\u8BBE\u7F6E\u4E2D\u586B\u5165\u60A8\u81EA\u5DF1\u7684 API Key \u4EE5\u901A\u8FC7\u79C1\u6709\u901A\u9053\u8BBF\u95EE\u3002"
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const dayCount = parseInt(await env.AIDU_LIMITS.get(dayKey) || "0");
    if (dayCount >= 50) {
      return new Response(JSON.stringify({
        error: "DAILY_LIMIT_EXCEEDED",
        message: "\u4ECA\u65E5\u514D\u8D39\u989D\u5EA6\u5DF2\u7528\u5B8C (50/50)\u3002\u516C\u5171\u8282\u70B9\u8D44\u6E90\u6709\u9650\uFF0C\u5EFA\u8BAE\u5728\u63D2\u4EF6\u8BBE\u7F6E\u4E2D\u586B\u5165\u60A8\u81EA\u5DF1\u7684 API Key \u4EE5\u89E3\u9501\u65E0\u9650\u989D\u5EA6\u3002"
      }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    ctx.waitUntil(env.AIDU_LIMITS.put(minuteKey, (minCount + 1).toString(), { expirationTtl: 120 }));
    ctx.waitUntil(env.AIDU_LIMITS.put(dayKey, (dayCount + 1).toString(), { expirationTtl: 172800 }));
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
__name(handleZhipu, "handleZhipu");
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map

/**
 * Aidu Sync Worker (Multi-Profile)
 * Handles GET (Pull) and POST (Push) requests for Aidu extension data.
 * Supports ?profile=xxx query parameter for data segregation.
 * 
 * Binding: DB (KV Namespace)
 * Secret: AUTH_TOKEN
 */

export default {
    async fetch(request, env, ctx) {
        // CORS Headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // 1. Auth Check
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || authHeader !== `Bearer ${env.AUTH_TOKEN}`) {
            return new Response('Unauthorized', { status: 401, headers: corsHeaders });
        }

        // 2. Resolve Profile & Key
        const url = new URL(request.url);
        const keyParam = url.searchParams.get("key");

        // Special: Meta Request
        if (keyParam === 'meta') {
            try {
                if (request.method === 'GET') {
                    const meta = await env.DB.get('profile_meta') || '{"profiles":[]}';
                    return new Response(meta, {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                } else if (request.method === 'POST' || request.method === 'PUT') {
                    const body = await request.text();
                    await env.DB.put('profile_meta', body);
                    return new Response('Meta Saved', { status: 200, headers: corsHeaders });
                }
            } catch (e) {
                return new Response(`Meta Error: ${e.message}`, { status: 500, headers: corsHeaders });
            }
        }

        const profile = url.searchParams.get("profile") || "default";
        const key = `vocab_${profile}`;

        try {
            if (request.method === 'GET') {
                let data = await env.DB.get(key);

                // Legacy Fallback for 'default' profile
                if (!data && profile === 'default') {
                    // Try old key 'user_data' to prevent data loss on migration
                    data = await env.DB.get('user_data');
                }

                if (!data) {
                    // 404 is useful for client to know it's a fresh start
                    return new Response(JSON.stringify({}), {
                        status: 404,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                return new Response(data, {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            } else if (request.method === 'POST' || request.method === 'PUT') {
                const body = await request.text();
                // Validate JSON
                try { JSON.parse(body); } catch (e) {
                    return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
                }

                await env.DB.put(key, body);
                return new Response('Saved', { status: 200, headers: corsHeaders });
            }

            return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

        } catch (e) {
            return new Response(`Worker Error: ${e.message}`, { status: 500, headers: corsHeaders });
        }
    }
};

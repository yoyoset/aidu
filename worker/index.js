/**
 * Aidu Sync Worker
 * Handles GET (Pull) and POST (Push) requests for Aidu extension data.
 * Secured by a simple Bearer Token (AUTH_TOKEN).
 * 
 * Setup:
 * 1. Create KV Namespace named 'AIDU_DB' and bind it to variable 'DB'.
 * 2. Set Secret Variable 'AUTH_TOKEN' to your desired password.
 */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const method = request.method;

        // 1. Security Check
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || authHeader !== `Bearer ${env.AUTH_TOKEN}`) {
            return new Response('Unauthorized', { status: 401 });
        }

        // 2. Handle Requests
        const KEY = 'user_data'; // Single key for now, can be per-user if needed

        if (method === 'GET') {
            // PULL: Get data from KV
            const data = await env.DB.get(KEY);
            if (!data) {
                return new Response(JSON.stringify({ files: {} }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return new Response(data, {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (method === 'POST' || method === 'PUT') {
            // PUSH: Save data to KV
            try {
                const body = await request.text();
                // Basic validation: ensure it's JSON
                JSON.parse(body);

                await env.DB.put(KEY, body);
                return new Response('Saved', { status: 200 });
            } catch (e) {
                return new Response('Invalid JSON', { status: 400 });
            }
        }

        return new Response('Method Not Allowed', { status: 405 });
    }
};

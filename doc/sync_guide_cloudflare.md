# Cloudflare Worker Synchronization Guide

This guide explains how to set up a private, high-speed synchronization server for AIDU using Cloudflare Workers.

## 1. Prerequisites

- A [Cloudflare](https://dash.cloudflare.com/) account.
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-setup/) installed (optional, can use web editor).

## 2. Worker Secret Setup

1. Create a new **KV Namespace** named `AIDU_KV`.
2. Create a new **Worker** and bind it to the `AIDU_KV` namespace with the variable name `AIDU_DATA`.
3. Set an environment variable (Secret) named `AUTH_TOKEN` to a strong, random password.

## 3. Worker Script

Copy and paste the following code into your Worker editor:

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const auth = request.headers.get('Authorization');
    
    // Auth Check
    if (auth !== `Bearer ${env.AUTH_TOKEN}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const profile = url.searchParams.get('profile') || 'default';
    const key = `vocab_${profile}`;

    if (request.method === 'GET') {
      const data = await env.AIDU_DATA.get(key);
      return new Response(data || '{}', {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'POST') {
      const body = await request.text();
      await env.AIDU_DATA.put(key, body);
      return new Response('OK', { status: 200 });
    }

    return new Response('Method not allowed', { status: 405 });
  }
}
```

## 4. Extension Configuration

1. Open AIDU **Settings** -> **Sync**.
2. Select **Cloudflare Worker** if available, or use **Custom Endpoint**.
3. **URL**: Enter your Worker's `.workers.dev` URL.
4. **Token**: Enter your `AUTH_TOKEN`.
5. Click **Test & Sync**.

## 5. Security Note

Your data is stored in **your** Cloudflare account. The `AUTH_TOKEN` ensures only your extension can access the data.

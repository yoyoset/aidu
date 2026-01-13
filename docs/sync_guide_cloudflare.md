# ⚡ Cloudflare Sync Setup Guide

Since you prefer a "Home Server" / self-controlled approach, Cloudflare Workers + KV is an excellent, free, and serverless way to host your own sync backend.

## 1. Create the Worker
1.  Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2.  Go to **Workers & Pages** -> **Create Application** -> **Create Worker**.
3.  Name it `aidu-sync` (or whatever you like).
4.  Click **Deploy**.

## 2. Configure Storage (KV)
1.  In the Cloudflare Dashboard sidebar, go to **Workers & Pages** -> **KV**.
2.  Click **Create a Namespace**.
3.  Name it `AIDU_DB` and click **Add**.

## 3. Link Worker to Storage
1.  Go back to your `aidu-sync` Worker > **Settings** > **Variables**.
2.  Scroll to **KV Namespace Bindings**.
3.  Click **Add Binding**.
    *   **Variable name**: `DB` (Must be exact).
    *   **KV Namespace**: Select `AIDU_DB`.
4.  Click **Save and deploy**.

## 4. Set Password (Security)
1.  Still in **Settings** > **Variables**, scroll to **Environment Variables**.
2.  Click **Add Variable**.
    *   **Variable name**: `AUTH_TOKEN`.
    *   **Value**: Enter a long, random password (e.g., `my-super-secret-sync-password-2026`).
    *   Click **Encrypt** (important!).
3.  Click **Save and deploy**.

## 5. Deploy Code
1.  Click the **Edit code** button (top right).
2.  Delete existing code.
3.  **Paste the code below** (from `cloudflare_worker.js`).
4.  Click **Save and deploy**.

## 6. Access
1.  Go to **Settings** > **Triggers**.
2.  (Recommended) Click **Add Custom Domain** if you have one managed by CF (e.g., `sync.yoyoset.com`). This ensures best access in China.
3.  Otherwise, use the `.workers.dev` subdomain provided.

## 7. Connect Extension
1.  Open Aidu Extension -> Settings -> **Cloud Sync**.
2.  Select Provider: **Custom / Cloudflare**.
3.  **Endpoint URL**: Paste your Worker URL (e.g., `https://sync.yoyoset.com` or `https://aidu-sync.yoyoset.workers.dev`).
4.  **Access Token**: Enter the password you set in Step 4 (`AUTH_TOKEN`).
5.  Click **Connect**.

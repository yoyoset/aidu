# Cloudflare Worker 同步部署教程

本教程将指导您如何利用 Cloudflare Workers 为 AIDU 搭建一个私有、高速且稳定的同步服务器。

## 1. 准备工作

- 一个 [Cloudflare](https://dash.cloudflare.com/) 账号。
- （可选）本地安装过 [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-setup/)，也可以直接使用网页版编辑器。

## 2. 配置 Cloudflare 服务

1. **创建 KV 命名空间**：在 Cloudflare 控制台，创建一个名为 `AIDU_KV` 的 **KV Namespace**。
2. **创建 Worker**：
   - 创建一个新的 **Worker**。
   - 在该 Worker 的 **Settings** -> **Variables** 中，将刚才创建的 `AIDU_KV` 绑定到变量名 `AIDU_DATA`。
3. **设置密钥 (Secret)**：
   - 在同一个页面，添加一个 **Environment Variable**。
   - 变量名为 `AUTH_TOKEN`，值设为一个强随机密码（这相当于您的同步密码）。

## 3. 部署代码

将以下代码复制并替换掉 Worker 编辑器中的所有内容：

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const auth = request.headers.get('Authorization');
    
    // 权限校验
    if (auth !== `Bearer ${env.AUTH_TOKEN}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const profile = url.searchParams.get('profile') || 'default';
    const key = `vocab_${profile}`;

    // 获取数据 (GET)
    if (request.method === 'GET') {
      const data = await env.AIDU_DATA.get(key);
      return new Response(data || '{}', {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 保存数据 (POST)
    if (request.method === 'POST') {
      const body = await request.text();
      await env.AIDU_DATA.put(key, body);
      return new Response('OK', { status: 200 });
    }

    return new Response('Method not allowed', { status: 405 });
  }
}
```

## 4. 在 AIDU 插件中配置

1. 点击 AIDU 插件图标 -> **设置 (Settings)** -> **同步 (Sync)**。
2. 选择 **Cloudflare Worker** (或自定义端点)。
3. **URL**: 输入您 Worker 的 `.workers.dev` 地址。
4. **Token**: 输入您在第 2 步设置的 `AUTH_TOKEN`。
5. 点击 **测试并同步**。

## 5. 安全提示

您的数据存储在您**自己的** Cloudflare 账户中。`AUTH_TOKEN` 确保了只有您的插件副本可以访问这些数据，极大地保障了隐私。

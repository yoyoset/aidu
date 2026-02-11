# [DEPRECATED / �ѹ���]

> [!CAUTION]
> ���ĵ���ӳ���� v4.13.0 ֮ǰ�ľɰ汾����ܹ���������ʷ�ο���
> �����Ȳο� [doc/architecture_v4.13.0.md](architecture_v4.13.0.md)��

---

# ☁️ Aidu 云同步使用指�?(Cloud Sync Guide)

Aidu 现已支持利用 GitHub Gist 进行多端数据同步。这允许您在办公室添加单词，回家后在另一台电脑上进行复习，进度无缝衔接�?

## 🛠�?第一步：准备 GitHub Token

为了让插件能读写您的 GitHub 数据，需要申请一个专属的访问令牌 (Token)�?

1.  登录您的 GitHub 账号�?
2.  访问 **[GitHub Settings > Developer settings > Personal access tokens (Tokens classic)](https://github.com/settings/tokens/new)**�?
3.  点击 **Generate new token (classic)**�?
4.  **Note (备注)**: 填入 `Aidu Sync`�?
5.  **Expiration (过期时间)**: 建议选择 `No expiration` (永不过期) �?`90 days`�?
6.  **Select scopes (勾选权�?**: ⚠️ **必须勾�?`gist`** (Create gists)。其他的都不需要�?
7.  点击页面底部�?**Generate token**�?
8.  **复制**生成�?Token (�?`ghp_` 开�?�?注意：刷新页面后就看不到了！*

## 🔌 第二步：连接设备 (电脑 A - 您的电脑)

1.  打开 Aidu 插件，点击右上角�?**设置 (⚙️)** 图标�?
2.  滚动�?**"Cloud Sync (GitHub Gist)"** 区域�?
3.  �?**GitHub Personal Access Token** 框中粘贴刚才复制�?Token�?
4.  **Gist ID** �?*留空**�?
5.  点击 **"🔌 Connect / Create"** 按钮�?
6.  插件会自动为您创建一个私有的 `aidu_vocab.json` 数据库，并弹出一�?**Gist ID**�?
7.  **复制这个 Gist ID** (例如 `a1b2c3d4e5...`)，并通过微信/QQ 发送给您儿子的电脑�?

## 🔄 第三步：连接设备 (电脑 B - 儿子/复习专用)

1.  打开 Aidu 插件 -> 设置 (⚙️)�?
2.  **粘贴同一�?GitHub Token**�?
3.  **粘贴刚才发送过来的 Gist ID**�?
4.  点击 **"🔌 Connect / Create"**�?
    *   插件会提�?`�?Connection Verified!`，说明连接成功�?
5.  点击 **"🔄 Sync Now"**，数据就会从云端同步下来了！

## 📝 日常使用

*   **同步逻辑**: 插件会对比每个单词的最后修改时间。无论哪边修改了单词（添加例句、点击复习），都会汇总到云端，保留最新的状态�?
*   **手动同步**: 建议在开始复习前和结束复习后，顺手点一�?**"🔄 Sync Now"** (未来版本会支持自动同�?�?

---

## �?常见问题

**Q: 我的数据公开吗？**
A: 不会。插件创建的�?**Private Gist (私有)**，只有拥�?Token 的人才能看到�?

**Q: 换了新电脑怎么办？**
A: 只要填入 Token �?Gist ID，点�?Sync Now，所有数据瞬间恢复�?

**Q: 忘了 Gist ID 怎么办？**
A: 登录 GitHub，点击头�?-> **Your gists**，找到描述为 "Aidu Storage (Private)" 的条目，URL 最后的长字符串就是 ID�?


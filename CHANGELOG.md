# Changelog

## [4.11.0] - 2026-02-03

### New Features (新功能)

- **Security Proxy Gateway (安全网关)**:
  - Implemented a Cloudflare Worker proxy for third-party LLM providers.
  - **Zero-Config Experience**: Free tier users now get instant access without configuring API keys.
  - **Enhanced Security**: API Keys are now strictly server-side, protected by Installation ID authentication and Rate Limiting (5 req/min, 50 req/day).
- **Reading Time Tracker (阅读时长统计)**:
  - Automatically tracks time spent on each article.
  - **Visual Progress**: Added a progress bar in the Dashboard (capped at 60m) to differentiate between unread, in-progress, and mastered content.
- **Smart Theme System (智能主题系统)**:
  - New **Visual Palette** entrance in the Dashboard header.
  - Redesigned Theme Modal with real-time CSS variable updating for a seamless customization experience.

### Improvements (改进项目)

- **UI Robustness**: Optimized "Deep Analysis" loading feedback with pulse animations and staggered message delivery.
- **Cloud Sync Fixes**: Resolved a bug where custom sync server URLs were not persisting correctly in settings.

---

## [4.10.0] - 2026-01-25

### New Features (新功能)

- **Granular Reader Controls**: Added per-sentence Play/Stop and Visibility (Show/Blur) toggles for translation and explanation.
- **UI Refinement**:
  - **Precise Alignment**: Fixed icon vertical alignment using a unified flex-container layout.
  - **Visual Sizing**: Icons now use `em` units to scale automatically with the reader's font size settings.
  - **Clean UI**: Removed redundant borders and minimized visual clutter for a more focused reading experience.

---

### New Features

- **Donation Page**: ❤️ "Support Author" button on Dashboard and Mobile.
  - Author info card with avatar and website link.
  - Author info card with avatar and website link.
  - Tab-based QR codes for Alipay, WeChat Pay, and PayPal.
- **Default AI Provider**: Added "Zhipu AI (Free)" option.
  - No API Key required (uses built-in default key).
  - Powered by GLM-4-Flash model.

---

## [4.8.0] - 2026-01-20

### New Features

- **UI Localization (i18n)**: Complete Simplified Chinese (zh-CN) and English (en-US) support.
  - New `src/locales/` module with modular architecture.
  - Language switching available in Settings.
  - All UI components now use `t()` translation function.

### Documentation

- Added `docs2.0/09_localization.md` with i18n architecture and usage guide.

---

## [4.7.0] - 2026-01-19

### New Features

- **Cross-Platform Profile Sync**: Profile 列表现在会自动通过云端同步到 Mobile PWA。
- **Mobile Profile Switching**: 手机端设置页新增 Profile 下拉选择，支持多场景切换。
- **Data Integrity**: 删除 Profile 时现在会彻底清理关联的 Vocabulary 数据，防止存储泄漏。

### Improvements

- **Profile Validation**: 增强了 Dashboard 和 Service Worker 启动时的 Profile 存在性检查，防止加载无效配置。
- **Mobile UX**: 统一了移动端和桌面端的 Profile 字段名 (`activeProfileId`)。
- **Worker**: Cloudflare Worker 新增 Profile Meta (`?key=meta`) 支持。

### Fixes

- 修复了 Mobile 端无法识别桌面端创建的新 Profile 的问题。
- 修复了删除 Profile 后旧数据残留的问题。

### Breaking Changes

- **Removed Gist Support**: Cloud Sync 现在仅支持 Custom Worker (Cloudflare Worker / 自建服务)。Gist 用户需迁移到 Worker。

All notable changes to this project will be documented in this file.

## [4.6.0] - 2026-01-19

### New Features (新功能)

- **Smart Sync UX (智能同步体验)**:
  - **Header Sync Hub**: 顶部栏新增云同步图标 (☁️)，支持点击立即同步，Badge 显示状态 (🟡待同/🔴错误)。
  - **Auto Sync**: 后台服务每 30 分钟自动执行 Pull-Push 同步。
  - **Proactive Prompts**:
    - **Reader Exit**: 阅读太久未同步时，返回生词本会自动提示同步。
    - **Review Complete**: 复习结束后自动提示同步，确保 SRS 进度不丢。
- **Sync Reliability (同步可靠性)**:
  - **Pull-Before-Push**: 强制推送前先拉取，防止覆盖远端 SRS 进度。
  - **Gist Creator**: 修复了创建 Gist 的逻辑。

## [4.5.0] - 2026-01-19

### New Features (新功能)

- **Teaching Persona (讲解风格)**: 阅读界面句子讲解支持四种风格个性化选择：
  - **Casual** (轻松口语): 像朋友聊天 (默认)
  - **Academic** (学术严谨): 适合备考
  - **Humorous** (幽默有趣): 缓解压力
  - **Concise** (简洁高效): 直击重点
- **Settings UI**: 新增「讲解风格」选择器。

## [4.4.0] - 2026-01-19

### New Features (新功能)

- **Two-Tier Vocabulary System (两段式词汇系统)**:
  - **Tier 1**: 查词时返回丰富释义 + 常见搭配 (移除了12字限制)
  - **Tier 2**: 新增「深度解析」按钮，按需生成词源/词族/同义词辨析
- **Robustness Enhancements (健壮性增强)**:
  - 全局 Toast 通知组件
  - API 调用自动重试 (指数退避)
  - 网络状态监听 (离线/在线提示)

### Improvements (改进)

- 优化初次响应时间 (目标 < 3秒)
- 代码文档 (docs2.0) 与代码同步更新

## [4.3.0] - 2026-01-13

### New Features (新功能)

- **Cloud Sync 2.0**:
  - Added support for **Cloudflare Worker** as a custom synchronization backend (Fast & Accessible in China).
  - Maintained **GitHub Gist** support for users preferring raw GitHub storage.
  - Implemented conflict resolution using `updatedAt` timestamps.
- **Profile Isolation (Multi-User)**:
  - Vocabulary data is now strictly isolated per profile.
  - Automatic migration of existing data to the default profile.
  - Zero-latency profile switching without page reload.
- **Data Migration**:
  - Added **Backup** feature: Export all vocabulary, settings, and drafts to a JSON file.
  - Added **Restore** feature: Import data from a JSON backup, enabling easy device migration.
- **Settings UI**:
  - Completely redesigned Settings Modal for better categorization.
  - Separated Cloud Sync configuration into a dedicated section.

### Improvements (改进)

- **Settings Layout**: Fixed nesting issues in the Settings modal where sections were incorrectly stacked.
- **Performance**: Optimized sync logic to reduce unnecessary API calls (only sync on explicit action or change).

### Documentation (文档)

- Added `docs/sync_guide_cloudflare.md` with detailed instructions for deploying the Sync Worker.
- Added `worker/index.js` and `wrangler.toml` for easy one-click deployment.

## [4.2.1] - 2026-01-11

- Initial release with local-first architecture.
- Core SRS Algorithm implementation.

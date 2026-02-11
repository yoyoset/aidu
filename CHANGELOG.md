# Changelog

## [4.15.7] - 2026-02-12

### Features (新特性)

- **Enhanced Spacing**: Updated the default line-height to `2.0` for a more comfortable, "breathable" reading experience.

### Bug Fixes (缺陷修复)

- **Ironclad Font Scaling**: Fixed a persistent issue where font size adjustments were blocked by local CSS overrides. Now uses `!important` global variables.

## [4.15.6] - 2026-02-12

### Features (新特性)

- **Line Height Customization**: Added custom line-height (line spacing) control in Reader view for improved reading comfort.

### Bug Fixes (缺陷修复)

- **Font Scaling Fix**: Resolved a critical issue where the Reader font size adjustment would not take effect due to CSS styling overrides.

## [4.15.5] - 2026-02-11

### Presentation & Documentation (展示与手册)

- **README Overhaul**: Completely rewritten the project `README.md` with a professional, high-authority layout. Added technical badges, clear feature pillars, and standardized English/Chinese bilingual sections.

## [4.15.3] - 2026-02-11

### Bug Fixes (缺陷修复)

- **Fixed Dashboard Duplication**: Fixed a critical UI bug where the article list or filters would duplicate when switching filters or updating drafts on the same tab. The interface now strictly clears previous content before re-rendering.

## [4.15.2] - 2026-02-11

### UI Cleanup (界面精简)

- **Removed Appearance Customization**: Removed "Custom Appearance" (Palette/Theme) buttons from the Dashboard and Reader settings to simplify the interface as requested. Global settings like "Teaching Persona" and "Language" remain available in the main configuration.

## [4.15.1] - 2026-02-11

### Developer Experience & Debugging (开发者体验与调试)

- **Debug Mode Toggle**: Added a "开发调试模式" switch in Settings -> Logging. When disabled (default), all debug icons in the reader are hidden for a clean experience.
- **Custom Debug Modal**: Replaced manual console logs/alerts with a professional `DebugModal`. It provides a beautiful JSON view of raw sentence data and word indices.
- **Copy-to-Clipboard**: Enhanced the debug modal with a "Copy" button for rapid data extraction during bug reports.

## [4.15.0] - 2026-02-11

### Dual-Identity Prompt Refactor (双重专家提示词重构)

- **Strict Identity Roles**: Optimized LLM prompts using a "Dual-Identity" architecture.
  - **Identify A (Translator)** handles technical data structure (segmentation, phrasal verbs, indexing).
  - **Identity B (Teacher)** handles stylistic explanations (${EX}), ensuring high-priority alignment with selected educational levels (e.g., Primary School).
- **Style Priority**: Fixed the issue where "Primary School" explanations were too formal by decoupling role-playing from technical constraints.

---

## [4.14.9] - 2026-02-11

### Reader Interaction & Typography Refinement (阅读交互与排版优化)

- **Atomic Interaction Model**: Refactored `AtomicBlock` logic to prevent interaction conflicts. Clicks on translation/explanation text now correctly bubble up to select the parent sentence block. The blur toggle is now strictly isolated to the "eye" icon button, preventing accidental toggling when selecting text.
- **Robust Font Scaling**: Transitioned from direct DOM manipulation to a CSS variable-based scaling system (`--user-font-size`). This fixes the bug where font size settings in the Reader View were intermittent or failing to apply.
- **Smooth Typography Transitions**: Added CSS transitions for font-size changes to ensure a premium, non-jarring user experience when adjusting settings.

---

## [4.14.8] - 2026-02-11

### Unified Ironclad Precision (统一铁甲精准修复)

- **Coordinate Self-Healing (v4)**: Implemented a robust "coordinate snapper" in `AtomicBlock.js` that not only corrects rendering offsets but also synchronizes these corrections into the Phrasal Verb objects themselves. This ensures that hover effects and click-highlights are perfectly aligned with the visual text, even when LLM-provided indices are incorrect.
- **Enhanced Debugging**: The "Raw Data" debug console output now includes a rich, formatted table of segments, indices, and phrasal verb member status for instant verification.
- **Harden Prompt Rules**: Updated LLM segmentation instructions to strictly forbid skipping punctuation in index calculations and to enforce physical array alignment.
- **Possessive Spacing Stability**: Finalized rules for apostrophe stickiness to ensure possessives like "Earth's" remain visually unified.

---

## [4.14.7] - 2026-02-11

### Ironclad Alignment Fix (铁甲排版对齐修复)

- **Ironclad Fuzzy Snapping (v3)**: Enhanced the self-healing logic in `AtomicBlock.js` to handle extreme punctuation drift (up to 8 segments). It now uses fuzzy string matching to "snap" phrasal verb highlights to the correct words even when LLM indices are significantly off.
- **Debug Table**: The "Raw Data" debug button now also prints a formatted `console.table` of all segments for easier manual index verification.
- **Improved Stem Matching**: Refined the snapping algorithm to handle possessives and partial word matches more robustly.

---

## [4.14.6] - 2026-02-11

### Self-Healing Rendering & Dashboard Fix (自修复渲染与仪表盘修复)

- **Self-Healing PV Alignment**: Fixed phrasal verb displacement caused by LLM skip-counting. Added runtime "Snapping" logic to auto-correct misaligned highlights by searching nearby segments.
- **Strict Indexing Prompt**: Hardened LLM instructions to enforce physical array indexing, reducing coordinate drift.
- **Possessive Spacing Fix**: Added apostrophes (`'` and `’`) to spacing stickiness rules to prevent ghost spaces in split possessives (e.g., `Earth’ s` -> `Earth’s`).
- **Dashboard Categorization**: Removed the "grace period" logic in `preparation_dashboard.js`. READY items now strictly appear in the Completed tab, preventing them from popping back into Drafts during sync.

---

## [4.14.5] - 2026-02-11

### Precision Layout Fix (高精度排版修复)

- **Phrasal Verb Alignment**: Fixed a regression where phrasal verb marks were shifted when preceded by punctuation. The system now correctly uses raw segment indices instead of word-only indices.
- **Smart Spacing (v4.14.5)**: Refined the punctuation stickiness logic to prevent the generic quote `"` from "eating" surrounding spaces. Spaces are now correctly preserved around all quote types.

---

## [4.14.4] - 2026-02-11

### Expert Rendering Fix (高级排版修复)

- **Atomic Continuous Spacing (原子化连续间距)**:
  - Resolved "no space" regression by implementing a **Smart Space** algorithm that dynamic injects spaces based on punctuation stickiness.
  - Fixed **Phrasal Verb Continuity**: Underlines are now contiguous across words and spaces, while background highlights remain precisely on words.
  - Optimized **Quotation Handling**: Quotes are now "sticky" and correctly positioned without causing layout drift.
- **Pure Inline Architecture**: Reverted to full `inline` layout for superior text wrapping and baseline stability.

---

## [4.14.3] - 2026-02-11

### Stability & System Fixes (系统稳定性修复)

- **Context Menu Race Condition (右键菜单热修复)**:
  - Resolved "duplicate id" console errors by consolidating lifecycle setup and adding defensive callbacks.
- **Improved Lifecycle Management**:
  - Optimized Service Worker initialization to prevent redundant state re-creation.

---

## [4.14.2] - 2026-02-11

### Bug Fixes & Stability (修复与稳定性优化)

- **TypeError Fix (防止崩溃)**:
  - Resolved `Cannot read properties of null (reading 'status')` in the dashboard by adding defensive null checks during data loading and filtering.
- **Improved Data Sanitization**:
  - Automatically filters out corrupted/null draft entries during storage retrieval.

---

## [4.14.1] - 2026-02-11

### Bug Fixes & UX Optimization (修复与体验优化)

- **Rendering Alignment (渲染错位修复)**:
  - Fixed phrasal verb underlines and background highlights "drifting" after punctuation.
  - Optimized segment rendering using `inline` layout and discrete text nodes for spaces.
- **Dictionary Enhancement (词典功能增强)**:
  - Relaxed AI definition constraints to provide more comprehensive, multi-sense meanings.
  - Improved context-awareness for words with multiple distinct definitions.
- **Dashboard Visibility (控制面板优化)**:
  - Implemented a 2-minute "grace period" for completed drafts to remain in the processing list, preventing sudden disappearance.

---

## [4.14.0] - 2026-02-11

### New Features & Robustness (新功能与健壮性)

- **Safe Sync Protocol (安全同步协议)**:
  - Implemented conflict detection and explicit user warnings for destructive operations.
  - Added modular `SyncManager` state machine for reliable background synchronization.
- **Vocab Filtering (生词过滤增强)**:
  - Added filters based on review quality: **Easy**, **Good**, **Hard**, and **Forgot**.
  - Persisted the last review grade for each vocabulary item.
- **UI Localization (界面本地化)**:
  - Completed Chinese translation for Reader View: Bookmark tray, Analysis tray, and toast notifications.
- **Layout & Scrolling Fixes (布局与滚动修复)**:
  - Resolved "Main-Level Scroll" failure across various resolutions.
  - Optimized height inheritance and overflow settings for consistent UI behavior.

---

## [4.13.0] - 2026-02-07

### Architectural Overhaul (架构模块化重构)

- **Modular ApiClient (后端调度重构)**:
  - Extracted **Provider Pattern**: Individual modules for Gemini, OpenAI, and Proxy (located in `src/background/llm/providers/`).
  - Extracted **JsonCleaner**: Dedicated tool for stream parsing and automatic JSON repair.
  - Extracted **FetchUtils**: Unified networking logic with progressive retry/backoff and user notifications.
- **Component-Based Dashboard (面板组件化)**:
  - Extracted **DraftItem** component from `PreparationDashboard.js`.
  - Reduced main dashboard file size by 35% through logic decoupling.
- **Atomic Reader (阅读器原子化)**:
  - Extracted **AtomicBlock** component from `ReaderView.js`.
  - Isolated sentence-level interaction logic (TTS, Dictionary, Translation visibility), reducing controller complexity by 40%.
- **CSS & Visual Optimization (视觉与体积优化)**:
  - **RemixIcon Pruning**: Reduced icon CSS size by **98%** (153KB -> 2.4KB).
  - **Asset Archiving**: Removed **10MB+** of redundant static assets (SVG, EOT, TTF).
  - **MD3 Tokenization**: Synchronized all module CSS with Material Design 3 design tokens for perfect visual consistency.
- **Schema Hardening (架构加硬)**:
  - Finalized `SENTENCE_SCHEMA` standardization across the entire analysis pipeline.

---

## [4.12.0] - 2026-02-06

### New Features (新功能)

- **DPV Support (离散短语支持)**:
  - **Smart Recognition**: Automatically identifies split phrasal verbs (e.g., "set it up") via a new indexing protocol.
  - **Linked Interaction**: Hoover or click any member of a phrase to highlight the entire group.
  - **Phrase Aggregation**: Dictionary lookups now prioritize the definition of the whole phrase over individual words.
- **Reader Typography (排版升级)**:
  - Added **Font Family** switcher (Serif, Sans, Mono).
  - Added **Bold Toggle** for enhanced readability.
  - Both settings are persistent and cloud-synced.

### Improvements & Fixes (改进与修复)

- **Visual Polish**: Fixed the donate button color scope and updated it to a premium pink (#ff3366).
- **Console Cleaning**: Resolved "invalid color format" warnings and unified Vite import strategies to eliminate build noise.

---

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

### v4.11.0 Improvements (改进项目)

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

### v4.10.0 New Features (新功能追加)

- **Donation Page**: ❤️ "Support Author" button on Dashboard and Mobile.
  - Author info card with avatar and website link.
  - Author info card with avatar and website link.
  - Tab-based QR codes for Alipay, WeChat Pay, and PayPal.
- **Default AI Provider**: Added "Zhipu AI (Free)" option.
  - No API Key required (uses built-in default key).
  - Powered by GLM-4-Flash model.

---

## [4.8.0] - 2026-01-20

### v4.8.0 New Features (功能详情)

- **UI Localization (i18n)**: Complete Simplified Chinese (zh-CN) and English (en-US) support.
  - New `src/locales/` module with modular architecture.
  - Language switching available in Settings.
  - All UI components now use `t()` translation function.

### Documentation

- Added `docs2.0/09_localization.md` with i18n architecture and usage guide.

---

## [4.7.0] - 2026-01-19

### v4.7.0 New Features (核心功能)

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

### v4.6.0 New Features (新功能详情)

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

### v4.5.0 New Features (新功能追加)

- **Teaching Persona (讲解风格)**: 阅读界面句子讲解支持四种风格个性化选择：
  - **Casual** (轻松口语): 像朋友聊天 (默认)
  - **Academic** (学术严谨): 适合备考
  - **Humorous** (幽默有趣): 缓解压力
  - **Concise** (简洁高效): 直击重点
- **Settings UI**: 新增「讲解风格」选择器。

## [4.4.0] - 2026-01-19

### v4.4.0 New Features (新功能详情)

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

### v4.3.0 New Features (功能发布)

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

### v4.3.0 Improvements (改进)

- **Settings Layout**: Fixed nesting issues in the Settings modal where sections were incorrectly stacked.
- **Performance**: Optimized sync logic to reduce unnecessary API calls (only sync on explicit action or change).

### Documentation (文档)

- Added `docs/sync_guide_cloudflare.md` with detailed instructions for deploying the Sync Worker.
- Added `worker/index.js` and `wrangler.toml` for easy one-click deployment.

## [4.2.1] - 2026-01-11

- Initial release with local-first architecture.
- Core SRS Algorithm implementation.

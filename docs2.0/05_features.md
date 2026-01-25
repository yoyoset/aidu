# 功能模块 (Features)

AIDU 的核心功能分为以下四个主要模块，位于 `src/sidepanel/features/` 目录下。

## 1. Article Builder (文章构建器)
**目录**: `features/builder/`

**功能**:
- 接收用户输入的英文文章 (Raw Text)。
- 调用后台 Pipeline 进行分词与分析。
- 展示分析进度条和状态。

**关键交互**:
- **INPUT**: 文本框输入。
- **PROCESS**: 提交 Draft 到 PipelineManager。
- **OUTPUT**: 生成 Draft 对象并存储。

## 2. Reader View (沉浸式阅读)
**目录**: `features/reader/`

**功能**:
- 渲染已分析的文章，支持句子级对齐。
- **交互式查词**: 点击单词 (Bubble) 弹出释义。
- **深度解析**: 在弹窗中点击 🔍 (Deep Dive) 查看词源、同义词辨析。
- **音频播放**: 支持句子朗读。
- **生词收藏**: 在 Popover 中点击 ADD 保存生词 (自动包含搭配数据)。

**关键组件**:
- `reader_view.js`: 主视图，负责 DOM 渲染和事件代理。
- `reader_dictionary.js`: 管理查词弹窗 (Popover)。
- `reader_audio.js`: 句子朗读与音频控制。

## 3. Vocabulary (生词本)
**目录**: `features/vocab/`

**功能**:
- 展示已收藏的生词列表。
- **深度解析 (Deep Dive)**: 单词卡片支持一键生成词源、同义词辨析、易错点等深度内容。
- 提供 SRS (间隔重复) 复习入口。
- 支持单词卡片编辑与删除。
- 导出生词表 (CSV)。

## 4. Settings (设置)
**目录**: `features/settings/`

**功能**:
- **Profile Management (多配置管理)** (New in v4.7.0):
  - **独立隔离**: 每个 Profile 拥有独立的 API 配置 (Key/Model) 和生词本 (Vocabulary)。
  - **跨端同步**: PC 端创建的 Profile 列表会自动同步到手机端 (Mobile PWA)。
  - **无缝切换**: 支持在不同使用场景 (如 "工作模式", "日语学习") 间快速切换。
  - **数据安全**: 删除 Profile 时彻底清理关联数据。
- **AI Model Customization**:
  - 支持 DeepSeek, Google Gemini, OpenAI 及 Custom Endpoint。
  - 针对每个 Profile 独立保存模型参数。
- **Teaching Persona**: 选择 AI 的讲解风格 (轻松、学术、幽默等)。
- **Cloud Sync (云同步)**:
  - **双向同步**: 插件与手机端数据通过 Pull-Before-Push 策略保持一致。
  - **自动同步**: 后台每 30 分钟静默同步活跃 Profile。
  - **Smart Prompts**: 智能提示同步时机。
- **数据管理**: 缓存清理与硬重置。

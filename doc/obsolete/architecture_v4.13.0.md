# AIDU v4.13.0 架构组件说明文档 (Architectural Overview)

本项目在 v4.13.0 版本完成了从“单体巨石文件”向“单一职责模块化”架构的重大转型。本文档记录了当前核心组件的结构与职责，作为开发冻结资料。

---

## 1. 核心架构模式 (Core Architecture Patterns)

本项目遵循 **Orchestrator-Worker (调度器-执行者)** 模式和 **Component-Based UI (基于组件的UI)** 模式。

---

## 2. 后端逻辑：LLM 服务层 (Background LLM Layer)

### 2.1 ApiClient 调度中心

- **文件**: `src/background/llm/api_client.js`
- **职责**: 作为统一入口，负责配置加载、Token/Key 校验，并根据 Provider 设置将请求分发至具体的执行模块。
- **模块依赖**:
  - `JsonCleaner`: 负责 LLM 输出的流式解析与 JSON 自动修复。
  - `FetchUtils`: 封装了指数退避重试和错误弹窗通知逻辑。

### 2.2 Provider 执行者 (Specialized Providers)

- **目录**: `src/background/llm/providers/`
- **模块**:
  - `GeminiProvider`: 封装 Google Gemini API 专有格式。
  - `OpenAICompatibleProvider`: 兼容 OpenAI、DeepSeek、GLM、中转服务等。
  - `ProxyProvider`: 负责通过安全代理转发请求。

---

## 3. 前端逻辑：视图组件层 (Sidepanel View Layer)

### 3.1 PreparationDashboard (准备面板)

- **控制器**: `preparation_dashboard.js`
- **子组件**: `src/sidepanel/features/builder/components/draft_item.js`
- **职责**:
  - 控制器负责列表过滤、全局数据加载、对话框管理。
  - `DraftItem` 负责单个卡片的渲染、状态视觉化（如分片进度条）、事件分发。

### 3.2 ReaderView (阅读视图)

- **控制器**: `reader_view.js`
- **子组件**: `src/sidepanel/features/reader/components/atomic_block.js`
- **职责**:
  - 控制器负责全文播放调度、计时器管理、分章加载。
  - `AtomicBlock` 负责单个句子的点选交互、气泡渲染、翻译层级控制。

---

## 4. 视觉系统与优化 (Visual System & Optimization)

### 4.1 Material Design 3 令牌化

- **全局样式**: `src/sidepanel/styles/main.css` 集中定义了 MD3 颜色和阴影令牌。
- **模块 CSS**: `dashboard.module.css` 和 `reader.module.css` 已彻底移除硬编码颜色，全面对接设计令牌，确保视觉一致性。

### 4.2 资源极简优化 (Asset Pruning)

- **图标库**: 移除了 95% 以上的冗余 RemixIcon 样式，仅提取了项目实际使用的 36 个核心图标。
- **字体策略**: 强制使用 `woff2` 格式，大幅削减了首屏 CSS 解析开销和扩展体积。

---

## 5. 关键数据合约 (Key Data Contracts)

- **SENTENCE_SCHEMA**: 统一了 `original_text`, `translation`, `explanation`, `segments`, `phrasal_verbs` 等字段。
- **STATUS_FLOW**: 统一了 `draft` -> `processing` -> `ready` / `error` 的生命周期状态。

---

## 6. 资源统计 (Resource Stats)

| 核心组件 | 物理文件职责 | 状态 |
| :--- | :--- | :--- |
| ApiClient | 调度与路由 | 💎 极致精简 (~4KB) |
| Dashboard | 库管理 | 📦 逻辑隔离 (~26KB) |
| Reader | 渲染与交互 | 🎨 业务隔离 (~16KB) |
| RemixIcon | 基础图标 | ⚡ 极致裁剪 (~2KB) |

**冻结日期**: 2026-02-07
**签署版本**: v4.13.0

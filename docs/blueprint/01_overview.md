# 1. 系统概览 (System Overview)

AIDE (Adaptive Immersive Deep English) 是一个基于 Chrome Manifest V3 架构的英语深度阅读辅助系统。其核心设计理念是通过**结构化语义解析 (Structured Semantic Analysis)**，将线性文本重构为交互式学习单元，实现从“被动阅读”到“主动习得”的认知升维。

系统主要包含三大核心能力：
1.  **自适应解析 (Adaptive Parsing)**: 根据文本复杂度自动调度 LLM 模型策略。
2.  **交互式阅读 (Interactive Reading)**: 提供单词级、句子级、段落级的多维交互。
3.  **认知强化 (Cognitive Reinforcement)**: 通过 SRS 间隔复习算法巩固短期记忆。

## 1.1 技术架构 (Technical Stack)
- **运行环境**: Chrome Extension Manifest V3 (Service Worker 驱动)。
- **构建系统**: Vite 5.x + ES Modules (Native ESM)。
- **视图层**: Vanilla JS (ESNext) + CSS Variables (原子化/函数式)。
- **测试框架**: Vitest (单元测试) + Puppeteer (E2E 集成测试)。

## 1.2 核心设计原则 (Core Design Principles)
1.  **显式上下文 (Explicit Context)**: 所有 UI 组件必须通过构造函数注入 `Context ID` (Sentence Index / Segment ID) 和 `Data Source`，严禁依赖隐式全局变量或 DOM 状态推导。
2.  **可观测流程 (Observable Process)**: 所有异步长任务 (Analysis, Drafting) 必须实现确定性状态机 (Finite State Machine)，并通过 `MessageRouter` 广播状态变更。
3.  **视觉一致性 (Visual Consistency)**: 严格遵循 4x4 视觉矩阵，任何交互反馈 (Hover, Active, Focus) 必须在所有视图中保持像素级一致。

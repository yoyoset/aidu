# AIDU 项目概述

## 一句话介绍
AIDU (AI-Driven Understanding) 是一款 Chrome 扩展，通过 LLM 将英文阅读变为 1v1 私教体验。

## 核心价值
- **文章智能分析**: 自动分词、识别短语、提供上下文释义。
- **点击即查**: 交互式阅读，点击单词即显示详细解释和例句。
- **私教级体验**: 提供个性化讲解风格（如幽默、学术）和深度词汇解析。
- **SRS 复习系统**: 内置间隔重复复习算法，帮助长期记忆。

## 技术栈
| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | Vanilla JS, CSS Modules | 轻量级、高性能 UI |
| **构建** | Vite | 快速构建和热更新 |
| **扩展框架** | Chrome Extension MV3 | Service Worker 后台处理 |
| **AI 模型** | Gemini / DeepSeek / Custom | 灵活的模型支持 |
| **存储** | chrome.storage.local | 本地数据持久化 |

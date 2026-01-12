# 7. 核心模块：文章构建器 (Module F: Article Builder)

## 7.1 后台架构
- **架构**: Headless Processing。不依赖 UI 存活，全权委托 Service Worker 执行。
- **恢复**: 支持进程被杀后的断点续传 (Resumable Upload/Processing)。

## 7.2 分析模式 (Modes)
- **Mode 1 (Translation)**: 仅翻译，低延迟。
- **Mode 2 (Standard)**: 完整的分词、词性标注、原型提取 (Lemma)。
- **Mode 3 (Deep Analysis)**: 增加句法分析、修辞解析、语境含义。

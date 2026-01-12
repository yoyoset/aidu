# 8. 运维与质量保证 (Operations & QA)

## 8.1 错误处理 (Error Handling)
- **全局边界**: 顶层 `try-catch` 捕获未处理异常，记录至 `ErrorLog` 存储。
- **优雅降级**: UI 组件加载失败时，必须显示占位符或重试按钮，禁止白屏。
- **网络韧性**: 所有网络请求包含 `Exponential Backoff` 重试机制。

## 8.2 构建与发布 (Build & Deploy)
- **环境**: 使用 `.env` 文件管理构建时变量 (`VITE_API_ENDPOINT`, `VITE_DEBUG`).
- **优化**: 生产构建必须开启 Minification 和 Dead Code Elimination.

## 8.3 目录结构 (Directory Structure) [v3.0 Refactored]
```text
src/
├── core/                   # [Proposed] 领域逻辑
├── background/             # Service Worker (业务逻辑)
│   ├── pipeline_manager.js
│   └── llm/
├── sidepanel/              # UI 层 (表现层)
│   ├── index.html          # 静态 UI 结构
│   ├── index.js            # 主控制器
│   ├── message_router.js   # 消息处理
│   ├── components/         # 共享组件
│   └── features/           # 功能模块
│       ├── reading/        # 核心阅读流
│       ├── builder/        # 文章构建器
│       ├── review/         # SRS 复习
│       └── settings/       # 设置与管理
├── options/
├── utils/                  # 共享工具 (Storage, Logger)
└── srs/                    # SRS 核心逻辑 (后端)
```

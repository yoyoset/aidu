# 4. 核心模块：数据与持久化 (Module C: Data)

## 4.1 数据协议 (Schema)
- **Sentence Analysis**: 定义了最小渲染单元。详见 **DATA_MODELS.md**。
- **数据完整性**: 必须保证 `segments` 数组与 `original_text` 的字符级对齐。

## 4.2 存储策略 (Storage Strategy)
- **持久化**: `chrome.storage.local` (容量: 5MB+).
- **命名空间**:
    - `userSettings`: 全局配置与 Profile 数据。
        - Schema: `{ activeProfileId: "default", profiles: { "default": { name, provider, baseUrl, model, apiKey, realtimeMode, builderMode } } }`
    - `pageArchive`: 已解析文章的归档库 (LRU)。
    - `userStats`: 学习进度与统计数据。
    - `builderDrafts`: 创作与准备工作区数据。
        - Type: `Array<BuilderDraft>` (Ordered by creation/update, Newest First).

## 4.3 安全架构 (Security Architecture)
- **凭证存储**: API Keys 存储在 `profiles` 对象中，仅在内存中解密。
- **隔离**: 不同 Profile 之间的数据 (Vocabulary, History) 严格逻辑隔离。

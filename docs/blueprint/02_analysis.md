# 2. 核心模块：数据准备与分析 (Module A: Analysis)

本模块负责数据流的 ETL (Extract, Transform, Load) 处理，将非结构化 HTML/Text 转换为结构化语义对象。

## 2.1 流程管道 (Pipeline Architecture)
采用 **DVE (Decomposition-Verification-Execution)** 模式：

1.  **草稿阶段 (Drafting)**:
    - **输入**: 用户选中文本 / 剪贴板 / 页面内容。
    - **动作**: 在 `chrome.storage.local` 中创建 `BuilderDraft` 对象。
2.  **准备阶段 (Preparation)**:
    - **策略**: `TextChunker` 创建自适应分块 (100-500 词)。
    - **干预**: 用户通过 "准备仪表盘" (Preparation Dashboard) 审查分块。
3.  **执行阶段 (Execution)**:
    - **路由**: `SmartRouter` 根据 Draft 的 `analysisMode` (1/2/3) 选择对应的 System Prompt。
    - **流式处理**: Server-Sent Events (SSE) 处理与渐进式 JSON 解析。

## 2.3 提示词策略 (Prompt Strategy)
系统根据不同模式注入差异化 System Prompt：
1.  **Mode 1 (Translation)**: `Role: Translator`.
2.  **Mode 2 (Standard)**: `Role: Linguist`.
3.  **Mode 3 (Deep)**: `Role: Literature Professor`.

### 3. Output Schema (JSON)
The LLM output focuses on structural segmentation and translation. **Dictionary details (Definition, Phonetic, Audio) are NOT included** in this initial payload to minimize tokens and latency. They are fetched on-demand by the Client (Reader View).

```json
{
  "sentences": [
    {
      "original_text": "Full sentence text...",
      "translation": "Translated sentence...",
      "explanation": "Optional deep dive (Mode 3)...",
      "segments": [
        ["word", "POS_TAG", "base_lemma"]
      ]
    }
  ]
}
```

*Note: POS tags (e.g., `STOP`, `PUNCT`) determine interactivity.*

## 2.5 数据持久化 (Data Persistence)
系统必须同时保存 "生肉" 与 "熟肉"，以支持重分析和离线阅读：
1.  **Raw Meat (生肉)**: `draft.rawText`.
2.  **Cooked Meat (熟肉)**: `draft.data` (JSON).

## 2.6 统一增量分析引擎 (Unified Incremental Analysis Engine)
(Details on Incremental Loop/Error Handling retained)

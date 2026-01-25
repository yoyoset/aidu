# 数据流分析

## 文章分析与查词流程 (当前诊断)

### 阶段 1: 文章分析 (Article Analysis)
用户输入文章，系统进行预处理和分词。

- **Input**: Raw Text
- **Process**:
  1. `[TextChunker](file:///f:/mycode/aidu/src/background/llm/text_chunker.js)`: 切分句子，清洗文本。
  2. `[SmartRouter](file:///f:/mycode/aidu/src/background/llm/smart_router.js)`: 构建 Prompt (STANDARD/DEEP 模式)。
  3. `ApiClient`: 调用 LLM。
- **Output**: `Draft` Object (包含 segments)
  - Segments 格式: `[[word, POS, lemma], ...]`
  - **注意**: 此时仅包含分词信息，**不包含**释义。

### 阶段 2: 阅读与查词 (Reading & Lookup)
用户在阅读界面点击单词进行查询。

- **Trigger**: 用户点击 Reader 中的单词 Bubble。
- **Process**:
  1. `[reader_dictionary.js](file:///f:/mycode/aidu/src/sidepanel/features/reader/reader_dictionary.js)`: 捕获点击事件。
  2. `[dictionary_service.js](file:///f:/mycode/aidu/src/services/dictionary_service.js)`: `lookup(lemma, context)`
     - **Check Cache**: 检查内存 `memCache`。
     - **Cache Miss**: 调用 LLM `fetchDefinition`。
     - **Prompt**: 要求 "Concise Chinese definition (max 12 chars)"。
- **Output**: `Definition` Object
  - `{ m: "释义", p: "音标", l: "CEFR等级" }`
  - **问题**: 释义受到 Prompt 限制，过于简单。

### 阶段 3: 保存生词 (Save Vocabulary)
用户点击 Popover 中的 ADD 按钮保存单词。

- **Trigger**: 点击 "ADD" 按钮。
- **Process**:
  1. `reader_dictionary.js`: 从缓存中获取当前 Definition。
  2. `[vocab_service.js](file:///f:/mycode/aidu/src/services/vocab_service.js)`: `add(entry)`
  3. **Storage**: 保存到 `vocab_default`。
- **Data**:
  - `{ word, lemma, meaning, phonetic, context, ... }`
  - **问题**: 保存的 `meaning` 依然是简单的短释义。

### 阶段 4: 词汇复习 (Review)
SRS 系统调用保存的数据进行复习。

- **Process**: 读取 Storage 中的 Vocab 数据。
- **Display**: 显示单词卡片。
- **现有缺陷**: 缺乏例句、词源、搭配等深度学习资料。

## 改进方向 (Summary)
数据流的主要瓶颈在于 **阶段 2 (查词)** 的 Prompt 设计限制了数据丰富度，进而影响了 **阶段 3 (保存)** 的数据质量。

Docs 2.0 改进计划将着重于：
1. **两段式数据**: 区分 Tier 1 (基础) 和 Tier 2 (深度)。
2. **提前生成**: 尝试在文章分析阶段生成 Tier 1 数据。
3. **按需增强**: 在查词阶段提供 Tier 2 深度解析入口。

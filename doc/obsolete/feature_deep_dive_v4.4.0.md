# [DEPRECATED / �ѹ���]

> [!CAUTION]
> ���ĵ���ӳ���� v4.13.0 ֮ǰ�ľɰ汾����ܹ���������ʷ�ο���
> �����Ȳο� [doc/architecture_v4.13.0.md](architecture_v4.13.0.md)��

---

# Feature Specification: Deep Dive Vocabulary Analysis (v4.4.0)

## 1. 概述 (Overview)
**Deep Dive (深度解析)** �?AIDU v4.4.0 引入的一项核心功能，旨在为英语学习者提供超越简单释义的语言学分析。通过两层架构 (Two-Tier Architecture)，我们在保持阅读流畅性（毫秒级查词）的同时，支持按需获取深度知识�?

## 2. 核心架构 (Core Architecture)

### 2.1 Two-Tier Vocabulary System
为了平衡速度与深度，我们将字典服务重构为两层�?

*   **Tier 1: Core Definition (核心释义)**
    *   **触发场景**: 用户点击阅读界面中的单词 (Reader View Popover)�?
    *   **特点**: 极�?(>300ms 缓存, <3s API)�?
    *   **包含数据**:
        *   `m` (Meaning): 核心中文释义�?
        *   `p` (Phonetic): IPA 音标�?
        *   `l` (Level): CEFR 分级 (A1-C2)�?
        *   `collocations`: 3-5 个常见搭�?(v4.4.0 新增)�?
    
*   **Tier 2: Deep Dive (深度解析)**
    *   **触发场景**: 用户点击字典卡片或生词本卡片上的 "🔍" (Deep Dive) 按钮�?
    *   **特点**: 按需加载 (On-Demand)，内容丰富�?
    *   **包含数据**:
        *   `etymology`: 词源故事�?
        *   `wordFamily`: 词族/变形�?
        *   `synonyms`: 同义词辨析�?
        *   `antonyms`: 反义词�?
        *   `register`: 语域 (Formal/Informal/Academic)�?
        *   `commonMistakes`: 中式英语/常见错误纠正�?
        *   `culturalNotes`: 文化背景/语用提示�?

### 2.2 数据流变�?
*   **Dictionary Service**: 新增 `fetchTier2(lemma)` 接口�?
*   **Vocab Service**: Schema 扩展，支持存�?`deepData` 字段�?
*   **Cache Strategy**: 
    *   Tier 1 数据自动缓存 (Memory + Storage)�?
    *   Tier 2 数据在请求成功后并入生词�?(Vocab Storage)，避免重复计费�?

## 3. UI 交互 (User Interaction)

### 3.1 Reader View (阅读界面)
*   **Popover**: 在单词释义弹窗的底部操作栏增�?"🔍" 按钮�?
*   **Logic**:
    1.  点击 "🔍" 按钮�?
    2.  检查生词本是否已有该词的深度数据�?
    3.  如果有，直接展示 Modal�?
    4.  如果没有，调�?API 获取 Tier 2 数据 -> **自动保存**进生词本 -> 展示 Modal�?

### 3.2 Vocab View (生词�?
*   **Vocab Card**: 每张卡片增加 "🔍" 按钮�?
*   **Shared Modal**: 复用同一�?`DeepDiveModal` 组件展示数据�?

## 4. 技术实现细�?
*   **Shared Component**: `DeepDiveModal` (`src/sidepanel/components/deep_dive_modal.js`) 处理复杂的排版渲染�?
*   **Prompt Engineering**: 针对 Tier 1 (速度优先) �?Tier 2 (质量优先) 设计了不同的 System Prompts�?
*   **Database Schema**:
    ```javascript
    // vocab entry
    {
       // ... basic fields
       collocations: ["take place", "in place of"], // Tier 1
       deepData: { ... } // Tier 2 (Lazy loaded)
    }
    ```

## 5. API 成本控制
*   Tier 1 消耗极�?(Concise JSON)�?
*   Tier 2 消耗较�?(Rich Content)，但仅在用户**主动点击**时触发�?

## 6. 后续计划
*   支持 Deep Dive 数据的导�?(Anki/PDF)�?
*   根据语域 (Register) 自动标注文章的正式程度�?


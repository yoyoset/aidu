# AIDU v4.13.0 数据协议规范 (Data Schema Specification)

本文档定义了 AIDU v4.13.0 版本的核心数据契约，确保前端组件、后端 Service Worker 以及 LLM 解析逻辑之间的数据流一致性。

---

## 1. 核心模型：句子分析 (SENTENCE_SCHEMA)

这是阅读器渲染和分析的核心协议。

```typescript
interface Sentence {
  original_text: string;    // 原文
  translation: string;      // 译文
  explanation: string;      // 语法/语境详细讲解
  segments: [string, string, string][]; // [word, pos, lemma]
  phrasal_verbs?: {         // 离散短语识别 (DPV)
    text: string;
    indices: number[];      // 匹配 segments 的数组下标
    lemma: string;
    translation: string;
  }[];
}
```

---

## 2. 存储模型：草稿卡片 (DRAFT_SCHEMA)

对应 `BUILDER_DRAFTS` 存储键。

```typescript
interface BuilderDraft {
  id: string;               // 唯一指纹
  title: string;            // 文章标题
  sourceUrl?: string;
  status: 'draft' | 'processing' | 'ready' | 'error';
  progress: number;         // 0-100 进度百分比
  content: {
    chunks: {
      sentences: Sentence[]; // 核心分析数据
      status: 'pending' | 'processing' | 'done' | 'error';
    }[];
  };
  stats: {
    readingTime: number;    // 累计阅读时间 (ms)
    wordCount: number;
  };
  updatedAt: number;        // 时间戳 (用于云同步冲突解决)
}
```

---

## 3. 存储模型：生词本 (VOCAB_SCHEMA)

对应 `VOCAB_LIST` 存储键。

```typescript
interface VocabEntry {
  id: string;               // 通常为 word_id
  word: string;
  phonetic?: string;
  meaning: string;
  context: string;          // 查词时的上下文句子
  stage: 'learning' | 'reviewing' | 'mastered';
  lastReview: number;
  srsLevel: number;         // 0-7 间隔复习等级
  nextReview: number;       // 下次复习的时间戳
}
```

---

## 4. 健壮性保障 (Robustness Protocols)

1. **JSON 修复**: 所有 LLM 原始输出必须经过 `JsonCleaner` 模块进行流式修复和格式对齐。
2. **默认值保护**: 如果 LLM 未返回 `phrasal_verbs` 或 `segments`，前端必须能够优雅降级显示原始行。
3. **时间戳优先**: 冲突解决（Conflict Resolution）始终以本地与远端 `updatedAt` 的最大值为准。

**版本**: v4.13.0 (Contract v1)
**最近更新**: 2026-02-07

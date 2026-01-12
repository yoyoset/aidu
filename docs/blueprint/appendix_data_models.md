# Appendix A: 数据模型 (Data Models Schema)

## 句子分析概要 (Sentence Analysis Schema JSON)
```json
{
        {
            "original_text": "I am a student.",
            "translation": "我是学生。",
            "explanation?": "Deep analysis...",
            "segments?": [ 
                ["I", "PRON", "i"], 
                ["am", "STOP", "be"], 
                ["student", "NOUN", "student"] 
            ],
            "dict?": {
                "student": { 
                    "p": "/ˈstjuːdnt/",  // Phonetic (音标)
                    "l": "A1",           // Level (分级)
                    "m": "学生"          // Meaning (释义)
                }
            }
        }
    ]
}
```

## D. 数据交互标准 (Data Interchange Standards)
定义 "生肉" (Input) 和 "熟肉" (Output) 的严格校验标准。

### D.1 生肉标准 (Raw Meat Schema)
所有进入 Pipeline 的文本必须经过以下二阶段清洗：

1.  **Normalization (标准化)**:
    - **Line Breaks**: 修复断行。单个换行符 `\n` 替换为空格 (Soft Wrap)，连续两个换行符 `\n\n` 保留为段落分隔。
    - **Characters**: 移除零宽字符，标准化引号 (Smart Quotes -> Straight Quotes)，统一 Unicode (NFC)。

2.  **Segmentation (分句)**:
    - **Algorithm**: 使用浏览器原生 `Intl.Segmenter` ('en', { granularity: 'sentence' }) 以确保最佳兼容性。
    - **Quote Safety**: 必须确保断句不破坏引号内的完整性 (如 `"Hello world." said he.` 视为一句，或正确切分)。
    - **Apostrophe**: 智能识别缩写符 (Identifier `don't`) 与单引号 (Quote `'Hello'`) 的区别。
    - **Length**: `10 < length < 50000`。

### D.2 熟肉标准 (Cooked Meat Schema)
所有进入 Renderer 的 JSON 必须符合此 Schema，否则视为无效：
```typescript
interface CookedMeat {
  sentences: SentenceBlock[];
}

interface SentenceBlock {
  original_text: string;     // 原文 (Source of Truth)
  translation: string;       // 译文
  segments: SegmentTuple[];  // 语法分词
}

// [Word, POS, Lemma, Phonetic?]
type SegmentTuple = [string, string, string] | [string, string, string, string];
```
- **Validation**: Ingestion Gate 会校验 `sentences` 数组及其内部结构。如果某些字段缺失 (如 Lemma)，Renderer 需提供降级显示 (Fallback)。

## 构建器草稿概要 (Builder Draft Schema JSON)
```json
{
    "id": "hash",
    "title": "标题",
    "status": "draft | processing | ready | error",
    "rawText": "原始文本",
    "analysisMode": "standard",
    "data": { "sentences": [] },
    "progress": { "current": 0, "total": 0, "percentage": 0 },
    "createdAt": 1700000000,
    "updatedAt": 1700000000
}
```

## 用户配置概要 (User Settings Schema)
```json
{
    "activeProfileId": "uuid",
    "profiles": {
        "uuid": {
            "name": "Profile Name",
            "provider": "deepseek",
            "providerConfig": {
                "deepseek": { "apiKey": "...", "model": "..." },
                "gemini": { "apiKey": "...", "model": "..." }
            },
            "builderMode": "3",
            "realtimeMode": "2"
        }
    }
}
```

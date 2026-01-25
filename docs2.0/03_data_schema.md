# 核心数据结构 (Data Schemas)

## 1. Builder Draft (文章草稿)
来源: `src/core/schema.js`

```javascript
/**
 * @typedef {Object} LemmaInfo
 * @property {string} c - CEFR Level (e.g. "A1", "B2")
 * @property {string} p - Phonetic IPA
 * @property {string} m - Contextual Meaning
 */

/**
 * @typedef {Object} BuilderDraft
 * @property {string} id - Unique Hash ID (UUID)
 * @property {string} title - Draft Title
 * @property {'draft'|'processing'|'ready'|'error'} status - Processing Status
 * @property {string} rawText - Input text
 * @property {'standard'|'deep'} analysisMode - Analysis Mode
 * @property {{ sentences: SentenceData[] }} data - Structured Data
 * @property {{ current: number, total: number, percentage: number }} progress
 * @property {number} createdAt - Timestamp
 * @property {number} updatedAt - Timestamp
 */

/**
 * @typedef {Object} SentenceData
 * @property {string} original_text - Full sentence text
 * @property {string} translation - Sentence translation
 * @property {string} explanation - Deep analysis explanation
 * @property {Object.<string, LemmaInfo>} dict - Dictionary of lemmas
 * @property {Array<[string, string, string]>} segments - [Text, Type, Lemma]
 */
```

## 2. Vocab Entry (生词本条目)
来源: `src/services/vocab_service.js` (add 方法)

```javascript
/* 存储在 vocab_[profileId] 下的 HashMap */
{
    [lemma_key]: {
        word: string,       // 单词原文
        lemma: string,      // 原型
        meaning: string,    // 释义 (完整中文)
        phonetic: string,   // 音标
        context: string,    // 原文上下文句子
        level: string,      // CEFR 等级

        // Tier 1 Extension
        collocations: string[], // 常见搭配 (3-5个)

        // Tier 2 Extension (On Demand)
        deepData: {
            etymology: string,  // 词源
            wordFamily: string[],
            synonyms: { word: string, diff: string }[],
            antonyms: string[],
            register: string,
            commonMistakes: { wrong: string, correct: string, note: string }[],
            culturalNotes: string
        },

        // SRS 间隔复习数据
        stage: 'new',       // 状态: new, learning, review, graduated
        reviews: 0,         // 复习次数
        nextReview: number, // 下次复习时间戳
        interval: 0,        // 间隔时间
        easeFactor: 2.5,    // 难度系数
        addedAt: number,    // 添加时间
        updatedAt: number   // 更新时间
    }
}
```

## 3. Dictionary Cache (字典缓存)
来源: `src/services/dictionary_service.js`

```javascript
/* 存储在 StorageKeys.DICT_CACHE_KEY 下 */
{
    [lemma_key]: {
        m: string,          // 中文释义 (完整，无字数限制)
        p: string,          // IPA Phonetic
        l: string,          // CEFR Level
        collocations: string[] // 常见搭配 (Tier 1)
    }
}
```

## 4. User Settings (用户设置)
来源: `src/utils/storage.js` -> `userSettings`

```javascript
{
    activeProfileId: "default", // Current active profile ID
    teachingStyle: "casual",    // 'specialized' | 'casual' | 'humorous'
    
    // Multi-Profile Configuration
    profiles: {
        [profileId]: {
            name: "My Profile",
            provider: "deepseek", // 'deepseek' | 'gemini' | 'openai' | 'custom'
            baseUrl: "...",
            model: "...",
            apiKey: "...",
            providerConfig: {     // Per-provider independent config
                [providerName]: {
                    apiKey: string,
                    model: string,
                    baseUrl: string
                }
            },
            realtimeMode: "2",
            builderMode: "3",
            updatedAt: number
        }
    },

    // Global Sync Settings
    sync: {
        provider: "gist" | "custom",
        gistId: "...",
        githubToken: "...",
        customUrl: "...",
        customToken: "..."
    },
    
    // Sync Status State
    syncStatus: {
        lastSyncAt: number,
        lastSyncResult: "success" | "error",
        lastError: string | null
    }
}
```

## Storage Keys
```javascript
export const StorageKeys = {
    USER_SETTINGS: 'userSettings',
    PAGE_ARCHIVE: 'pageArchive',
    USER_STATS: 'userStats',
    BUILDER_DRAFTS: 'builderDrafts'
};
```

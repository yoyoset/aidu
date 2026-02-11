# AIDU AI-First Data Protocols (v4.14.4)

High-precision JSON schema definitions for core data entities.

## 1. Article Draft (`DRAFT_SCHEMA`)

Stored in `chrome.storage.local[BUILDER_DRAFTS]`.

```typescript
interface ArticleDraft {
  id: string;               // UUID/Fingerprint
  title: string;
  sourceUrl?: string;
  status: 'draft' | 'processing' | 'ready' | 'error';
  progress: number;         // 0-100 sum of chunk completion
  content: {
    chunks: {
      sentences: Sentence[];
      status: 'pending' | 'processing' | 'done' | 'error';
    }[];
  };
  stats: {
    wordCount: number;
    readingTime: number;    // Cumulative ms
  };
  gracePeriodUntil?: number; // v4.14.1 visibility logic
  updatedAt: number;        // Conflict resolution timestamp
}
```

## 2. Sentence Analysis (`SENTENCE_SCHEMA`)

The unit of interactive reading.

```typescript
interface Sentence {
  original_text: string;
  translation: string;
  explanation: string;
  segments: [word: string, pos: string, lemma: string][];
  phrasal_verbs?: {
    text: string;
    indices: number[];      // Relative to wordIndexToSegIndex mapping
    lemma: string;
    translation: string;
    pos?: 'VERB';
  }[];
}
```

## 3. Vocabulary Entry (`VOCAB_SCHEMA`)

Stored in `chrome.storage.local[VOCAB_LIST]`.

```typescript
interface VocabEntry {
  id: string;               // Normalized lemma
  word: string;             // Display form
  phonetic?: string;
  meaning: string;          // Multi-sense supported in v4.14.1
  context: string;          // Original sentence environment
  stage: 'learning' | 'reviewing' | 'mastered';
  srsLevel: number;         // 0-7
  lastReview: number;
  nextReview: number;
  lastGrade?: number;       // v4.14.0 quality filter (1-5)
  updatedAt: number;
}
```

## 4. Interaction Constraints

- **Word ID**: All vocabulary lookups are case-insensitive and lemma-based.
- **Index Sensitivity**: `phrasal_verbs.indices` require mapping against `wordIndexToSegIndex` in `AtomicBlock.js` to avoid punctuation-induced drift.

import { StorageHelper, StorageKeys } from '../../utils/storage.js';
import { SENTENCE_SCHEMA } from '../../utils/schema_constants.js';

const CURRENT_SCHEMA_VERSION = 1;

/**
 * DraftProcessor - 专门负责草案数据的聚合、展平与容量治理
 * 符合 SRP 原则：仅处理数据转换，不涉及 I/O 调度或异步流控
 */
export class DraftProcessor {
    /**
     * [Phase 1] 归一化单个句子对象 (Field Mapping)
     * 确保数据在进入存储前就已符合标准 Schema
     */
    static normalizeSentence(s) {
        if (!s) return null;

        // 1. Alias Handling: Map inconsistent field names to standardized keys
        // Support all known variations: standard, expert, legacy, and common LLM alternatives
        const text = s[SENTENCE_SCHEMA.original_text] || s.original || s.text || s.q || s.sentence || s.english || s.en || s.input || s.source || '';
        const trans = s[SENTENCE_SCHEMA.translation] || s.simplified_chinese || s.chinese || s.t || s.zh || s.cn || s.translation_zh || s['中文'] || '';
        const exp = s[SENTENCE_SCHEMA.explanation] || s.grammar_notes || s.notes || s.e || s.analysis || s.grammar || s.comment || s.note || '';

        // 2. Normalize segments (Handle POS vs segments, Array vs Object)
        let segments = s[SENTENCE_SCHEMA.segments] || s.pos;
        if (segments && Array.isArray(segments) && segments.length > 0) {
            if (typeof segments[0] === 'string') {
                segments = segments.map(item => [item, 'UNKNOWN', item.toLowerCase()]);
            } else if (!Array.isArray(segments[0]) && typeof segments[0] === 'object') {
                segments = segments.map(item => [
                    item.word || item.w || item.text || '',
                    item.pos || item.p || item.tag || 'UNKNOWN',
                    (item.lemma || item.l || item.word || item.text || '').toLowerCase()
                ]);
            }
        } else if (!segments && text) {
            // Heuristic fallback if segments are missing
            segments = [[text, 'SENTENCE', text.toLowerCase()]];
        }

        return {
            ...s,
            [SENTENCE_SCHEMA.original_text]: text,
            [SENTENCE_SCHEMA.translation]: trans,
            [SENTENCE_SCHEMA.explanation]: exp,
            [SENTENCE_SCHEMA.segments]: segments || [],
            [SENTENCE_SCHEMA.phrasal_verbs]: s[SENTENCE_SCHEMA.phrasal_verbs] || s.phrasal_verbs || []
        };
    }

    /**
     * 容量治理：强制截断草案列表
     * @param {Array} drafts 
     * @param {number} limit 
     */
    static truncate(drafts, limit = 50) {
        if (!Array.isArray(drafts)) return [];
        if (drafts.length <= limit) return drafts;

        // 保留最新的 limit 条
        return drafts
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, limit);
    }

    /**
     * 增量式进度更新与聚合 (Expert Recommendation #3)
     * 不再进行 O(N log N) 的重排，直接根据索引插入
     * @param {Object} draft - 当前草案对象
     * @param {number} chunkIndex - 分块索引
     * @param {Object} result - LLM 返回的结果 { sentences: [...] }
     */
    static applyChunkResult(draft, chunkIndex, result) {
        if (!draft.data) draft.data = {};
        if (!draft.data.chunks) draft.data.chunks = {};

        // [Phase 1] Normalize raw LLM output before storage
        const rawSentences = Array.isArray(result.sentences) ? result.sentences : [];
        const normalizedSentences = rawSentences
            .map(s => this.normalizeSentence(s))
            .filter(s => s && s[SENTENCE_SCHEMA.original_text]);

        console.log(`[DraftProcessor] Chunk ${chunkIndex} normalized count: ${normalizedSentences.length}/${rawSentences.length}`);
        if (normalizedSentences.length === 0 && rawSentences.length > 0) {
            console.warn(`[DraftProcessor] All sentences filtered! First raw item keys:`, Object.keys(rawSentences[0] || {}));
        }

        draft.data.chunks[chunkIndex] = {
            index: chunkIndex,
            result: normalizedSentences,
            status: 'done',
            completedAt: Date.now()
        };

        // 2. 统计进度
        const total = draft.progress?.total || 1;
        const completed = Object.keys(draft.data.chunks).length;
        const percentage = Math.round((completed / total) * 100);

        draft.progress = {
            current: completed,
            total: total,
            percentage: percentage
        };

        // 3. 增量展平逻辑：基于索引构建句子列表，避免全量重排
        const sentences = [];
        const indices = Object.keys(draft.data.chunks).map(Number).sort((a, b) => a - b);

        for (const idx of indices) {
            const chunkData = draft.data.chunks[idx];
            if (chunkData && Array.isArray(chunkData.result)) {
                sentences.push(...chunkData.result);
            }
        }

        draft.data.sentences = sentences;
        draft.updatedAt = Date.now();

        return draft;
    }

    /**
     * [Phase 3] 全量数据迁移 (Migration Service)
     * 遍历所有存储的草案，将其句子结构统一升级到最新版
     */
    static async migrateAllDrafts() {
        try {
            const drafts = await StorageHelper.get(StorageKeys.BUILDER_DRAFTS) || [];
            let changed = false;

            const migrated = drafts.map(draft => {
                // If already on current version, skip
                if (draft.schemaVersion >= CURRENT_SCHEMA_VERSION) return draft;

                console.log(`[DraftProcessor] Migrating draft ${draft.id} to v${CURRENT_SCHEMA_VERSION}...`);

                if (draft.data && Array.isArray(draft.data.sentences)) {
                    draft.data.sentences = draft.data.sentences
                        .map(s => this.normalizeSentence(s))
                        .filter(s => s && s[SENTENCE_SCHEMA.original_text]);
                }

                draft.schemaVersion = CURRENT_SCHEMA_VERSION;
                changed = true;
                return draft;
            });

            if (changed) {
                await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, migrated);
                console.log(`[DraftProcessor] Successfully migrated ${drafts.length} drafts.`);
            }
        } catch (e) {
            console.error('[DraftProcessor] Migration failed', e);
        }
    }

    /**
     * 初始化草案结构
     */
    static createInitialState(text, title, url, totalChunks) {
        return {
            id: 'dr_' + Date.now() + Math.random().toString(36).substr(2, 5),
            title: title || 'Untitled Analysis',
            url: url || '',
            rawText: text,
            schemaVersion: CURRENT_SCHEMA_VERSION, // Track version from birth
            progress: {
                current: 0,
                total: totalChunks,
                percentage: 0
            },
            status: 'draft',
            data: {
                chunks: {},
                sentences: []
            },
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    }
}

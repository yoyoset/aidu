import { MessageTypes } from '../../../utils/message_router.js';
import { SENTENCE_SCHEMA } from '../../../utils/schema_constants.js';

/**
 * ReaderState - 管理阅读会话的领域服务
 * 负责计时、进度保存与数据清洗，将非 UI 逻辑从 ReaderView 中移除
 */
export class ReaderState {
    constructor() {
        this.draftId = null;
        this.readingTime = 0;
        this.timerInterval = null;
        this.onTick = null;
    }

    /**
     * 初始化会话
     * @param {Object} draft - 原始草案对象
     */
    init(draft) {
        this.draftId = draft.id;
        this.readingTime = draft.readingTime || 0;

        // Bookmark Migration: Transition single bookmarkIndex to bookmarkIndices array
        if (!draft.bookmarkIndices) {
            draft.bookmarkIndices = [];
            if (draft.bookmarkIndex !== undefined) {
                draft.bookmarkIndices.push(draft.bookmarkIndex);
                delete draft.bookmarkIndex;
            }
        }

        // Data Cleaning & Normalization: Support multiple schema versions (Standard vs Expert vs Legacy)
        const rawSentences = draft.data?.sentences || [];
        const sentences = rawSentences.map((s, idx) => {
            if (!s) return null;

            // 1. Normalize Text Fields using SENTENCE_SCHEMA as target
            // Support all known variations: standard, expert, legacy, and common LLM alternatives
            const text = s[SENTENCE_SCHEMA.original_text] || s.original || s.text || s.q || s.sentence || s.english || s.en || s.input || s.source || '';
            const trans = s[SENTENCE_SCHEMA.translation] || s.simplified_chinese || s.chinese || s.t || s.zh || s.cn || s.translation_zh || s['中文'] || '';
            const exp = s[SENTENCE_SCHEMA.explanation] || s.grammar_notes || s.notes || s.e || s.analysis || s.grammar || s.comment || s.note || '';

            // 2. Normalize segments (Complex handling)
            let segments = s[SENTENCE_SCHEMA.segments] || s.pos;
            if (segments && Array.isArray(segments) && segments.length > 0) {
                if (typeof segments[0] === 'string') {
                    // LLM returned just words or POS tags array
                    segments = segments.map(item => [item, 'UNKNOWN', item.toLowerCase()]);
                } else if (!Array.isArray(segments[0]) && typeof segments[0] === 'object') {
                    // Object style? {word, pos, lemma}
                    segments = segments.map(item => [
                        item.word || item.w || item.text || '',
                        item.pos || item.p || item.tag || 'UNKNOWN',
                        (item.lemma || item.l || item.word || item.text || '').toLowerCase()
                    ]);
                }
            } else if (!segments && text) {
                // Fallback: If no segments, create a placeholder
                segments = [[text, 'SENTENCE', text.toLowerCase()]];
            }

            // Construct standardized object
            const normalized = {
                ...s,
                [SENTENCE_SCHEMA.original_text]: text,
                [SENTENCE_SCHEMA.translation]: trans,
                [SENTENCE_SCHEMA.explanation]: exp,
                [SENTENCE_SCHEMA.segments]: segments || [],
                [SENTENCE_SCHEMA.phrasal_verbs]: s[SENTENCE_SCHEMA.phrasal_verbs] || s.phrasal_verbs || []
            };

            // 3. Heuristic Recovery
            if (!normalized[SENTENCE_SCHEMA.original_text] && normalized[SENTENCE_SCHEMA.segments].length > 0) {
                console.warn(`ReaderState: Recovering text from segments for index ${idx}`);
                normalized[SENTENCE_SCHEMA.original_text] = normalized[SENTENCE_SCHEMA.segments].map(seg => seg[0]).join(' ');
            }

            return normalized;
        }).filter((s, idx) => {
            const isValid = s && s[SENTENCE_SCHEMA.original_text] && s[SENTENCE_SCHEMA.original_text].trim() !== '' && s[SENTENCE_SCHEMA.original_text] !== 'undefined';
            if (!isValid) {
                console.warn(`ReaderState: Filtering sentence ${idx} - Still invalid after normalization`, s);
            }
            return isValid;
        });

        console.log(`ReaderState: Init session for ${draft.id}. Raw: ${rawSentences.length}, Valid: ${sentences.length}`);
        return { sentences, readingTime: this.readingTime };
    }

    /**
     * 启动计时
     * @param {Function} callback - 每秒触发的回调
     */
    startTimer(callback) {
        this.stopTimer();
        this.onTick = callback;

        this.timerInterval = setInterval(() => {
            this.readingTime++;
            if (this.onTick) this.onTick(this.readingTime);

            // 每 10 秒自动保存一次，防止长时间阅读数据丢失
            if (this.readingTime % 10 === 0) {
                this.save();
            }
        }, 1000);
    }

    /**
     * 停止计时并执行最终保存
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            this.save();
        }
    }

    /**
     * 持久化进度
     */
    async save() {
        if (!this.draftId) return;

        try {
            // Atomic cross-process update via Background Service Worker
            chrome.runtime.sendMessage({
                type: MessageTypes.UPDATE_DRAFT,
                payload: {
                    draftId: this.draftId,
                    updates: {
                        readingTime: this.readingTime,
                        lastReadAt: Date.now()
                    }
                }
            });
        } catch (e) {
            console.error('ReaderState: Failed to send update message', e);
        }
    }

    /**
     * 格式化时间显示 (分:秒)
     */
    static formatTime(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

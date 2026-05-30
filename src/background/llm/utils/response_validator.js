import { SENTENCE_SCHEMA } from '../../../utils/schema_constants.js';
import { logger } from '../../../utils/logger.js';

/**
 * ResponseValidator
 * 职责：校验 LLM 返回的数据结构，进行类型转换，并执行启发式修复（如索引纠偏）。
 * 它是系统中的“标准裁判”，确保无论模型如何，输出给 UI 的数据都是一致的。
 */
export class ResponseValidator {
    /**
     * 验证并规范化 LLM 响应
     * @param {Object} rawJson - JSON.parse 后的原始对象
     * @param {number} mode - 分析模式 (1, 2, 3)
     * @returns {Object} 规范化后的对象
     */
    static validate(rawJson, mode) {
        if (!rawJson || typeof rawJson !== 'object') {
            throw new Error('Validator: Input is not a valid object');
        }

        // 1. 根结构对齐: 确保包含 sentences 数组
        let sentences = rawJson.sentences;
        if (!Array.isArray(sentences)) {
            // 如果模型直接返回了数组或单个对象，进行包裹
            if (typeof rawJson === 'object' && rawJson[SENTENCE_SCHEMA.original_text]) {
                sentences = [rawJson];
            } else if (Array.isArray(rawJson)) {
                sentences = rawJson;
            } else {
                sentences = [];
            }
        }

        // 2. 逐句规范化
        const normalizedSentences = sentences
            .map(s => this.normalizeSentence(s, mode))
            .filter(s => s !== null);

        return {
            sentences: normalizedSentences,
            _metadata: {
                validatedAt: Date.now(),
                mode: mode,
                originalCount: sentences.length,
                validCount: normalizedSentences.length
            }
        };
    }

    /**
     * 规范化单个句子对象
     */
    static normalizeSentence(s, mode) {
        if (!s || typeof s !== 'object') return null;

        // A. 字段别名映射 (从 DraftProcessor 迁移并增强)
        const text = s[SENTENCE_SCHEMA.original_text] || s.original || s.text || s.q || s.sentence || s.english || s.en || s.input || s.source || '';
        const trans = s[SENTENCE_SCHEMA.translation] || s.simplified_chinese || s.chinese || s.t || s.zh || s.cn || s.translation_zh || s['中文'] || '';
        const exp = s[SENTENCE_SCHEMA.explanation] || s.grammar_notes || s.notes || s.e || s.analysis || s.grammar || s.comment || s.note || '';

        if (!text) {
            logger.warn('Validator: Sentence missing original_text, skipping', s);
            return null;
        }

        // B. 分词规范化 (Segments)
        let segments = s[SENTENCE_SCHEMA.segments] || s.pos || s.tokens;
        if (!Array.isArray(segments) || segments.length === 0) {
            if (text) {
                // 启发式分词：利用正则切分单词和标点
                const matches = text.matchAll(/[a-zA-Z0-9]+(?:'[a-zA-Z0-9]+)?|[.,!?;:"“”‘’()\[\]{}]/g);
                segments = [];
                for (const match of matches) {
                    const word = match[0];
                    const isPunct = /^[.,!?;:"“”‘’()\[\]{}]$/.test(word);
                    const pos = isPunct ? 'PUNCT' : 'UNKNOWN';
                    segments.push([word, pos, word.toLowerCase()]);
                }
            } else {
                segments = [];
            }
        }

        if (Array.isArray(segments)) {
            segments = segments.map(seg => {
                // 处理不同格式: [word, pos, lemma] vs {word, pos, lemma}
                if (Array.isArray(seg)) {
                    return [
                        String(seg[0] || ''), 
                        this.normalizePos(seg[1]), 
                        String(seg[2] || (seg[0] || '')).toLowerCase()
                    ];
                } else if (seg && typeof seg === 'object') {
                    const word = seg.word || seg.w || seg.text || '';
                    return [
                        String(word),
                        this.normalizePos(seg.pos || seg.p || seg.tag),
                        String(seg.lemma || seg.l || word).toLowerCase()
                    ];
                }
                return [String(seg || ''), 'UNKNOWN', String(seg || '').toLowerCase()];
            });
        }

        // C. 短语动词修复 (Phrasal Verbs & Indices)
        let pvs = s[SENTENCE_SCHEMA.phrasal_verbs] || s.phrasal_verbs || s.idioms || [];
        if (Array.isArray(pvs)) {
            pvs = pvs.map(pv => {
                const normalizedPv = {
                    text: pv.text || pv.t || '',
                    indices: Array.isArray(pv.indices) ? pv.indices.map(Number) : [],
                    lemma: pv.lemma || pv.l || pv.text || '',
                    translation: pv.translation || pv.trans || ''
                };

                // 执行启发式索引修复
                normalizedPv.indices = this.repairIndices(normalizedPv, segments);
                return normalizedPv;
            });
        }

        return {
            [SENTENCE_SCHEMA.original_text]: text,
            [SENTENCE_SCHEMA.translation]: trans,
            [SENTENCE_SCHEMA.explanation]: exp,
            [SENTENCE_SCHEMA.segments]: segments,
            [SENTENCE_SCHEMA.phrasal_verbs]: pvs
        };
    }

    /**
     * 词性标签规范化
     */
    static normalizePos(pos) {
        const p = String(pos || 'UNKNOWN').toUpperCase();
        const map = {
            'ADJECTIVE': 'ADJ', 'NOUN': 'NOUN', 'VERB': 'VERB', 'ADVERB': 'ADV',
            'PRONOUN': 'PRON', 'PREPOSITION': 'PREP', 'CONJUNCTION': 'CONJ',
            'DETERMINER': 'DET', 'NUMBER': 'NUM', 'PUNCTUATION': 'PUNCT',
            'PARTICLE': 'PART', 'INTERJECTION': 'INTJ'
        };
        // 模糊匹配: 如果包含标准词根
        for (const [full, short] of Object.entries(map)) {
            if (p.includes(full) || p === short) return short;
        }
        
        const VALID_POS = ['NOUN', 'VERB', 'ADJ', 'ADV', 'PRON', 'PREP', 'CONJ', 'PART', 'INTJ', 'DET', 'NUM', 'PUNCT', 'STOP'];
        return VALID_POS.includes(p) ? p : 'UNKNOWN';
    }

    /**
     * 在 segments 中寻找匹配 targetWords 且呈递增关系的索引序列。
     * 支持非连续匹配（例如：give ... up，最多允许 gap 长度）
     * @param {Array<string>} targetWords - 目标单词数组（已转为小写）
     * @param {Array} segments - 分词数组
     * @returns {Array<number>|null} 匹配的索引序列，若无匹配则返回 null
     */
    static findSequenceIndices(targetWords, segments) {
        if (!targetWords.length || !segments.length) return null;

        const maxGap = 5; // 允许的最大单词间隔

        function search(wordIdx, currentIndices, startFrom) {
            if (wordIdx === targetWords.length) {
                return currentIndices;
            }

            const targetWord = targetWords[wordIdx];

            for (let i = startFrom; i < segments.length; i++) {
                if (currentIndices.length > 0) {
                    const prevIdx = currentIndices[currentIndices.length - 1];
                    if (i - prevIdx > maxGap) {
                        break;
                    }
                }

                const word = String(segments[i][0] || '').toLowerCase();
                const lemma = String(segments[i][2] || '').toLowerCase();

                const isMatch = word === targetWord || 
                                lemma === targetWord ||
                                (targetWord.length > 2 && word.startsWith(targetWord)) ||
                                (word.length > 2 && targetWord.startsWith(word));

                if (isMatch) {
                    const result = search(wordIdx + 1, [...currentIndices, i], i + 1);
                    if (result) return result;
                }
            }

            return null;
        }

        return search(0, [], 0);
    }

    /**
     * 启发式索引修复逻辑
     * 解决 LLM 经常给错索引的问题
     */
    static repairIndices(pv, segments) {
        if (!pv.text || !segments.length) return [];

        const targetWords = pv.text.toLowerCase().split(/\s+/).filter(w => w && w !== '...' && w !== '..');

        // A. 如果原索引为空，或者全部是 -1，或者长度与 targetWords 不一致，或者有任何索引越界：
        //    我们先尝试使用 findSequenceIndices 自动寻址。
        const isInvalid = !pv.indices || 
                          pv.indices.length !== targetWords.length || 
                          pv.indices.every(idx => idx === -1) || 
                          pv.indices.some(idx => idx < 0 || idx >= segments.length);

        if (isInvalid) {
            const found = this.findSequenceIndices(targetWords, segments);
            if (found) {
                return found;
            }
        }

        // B. 否则，使用原有的修正逻辑进行局部微调
        const corrected = [];
        pv.indices.forEach((suggestion, i) => {
            const targetWord = targetWords[i];
            if (!targetWord) {
                corrected.push(suggestion);
                return;
            }

            const checkMatch = (idx) => {
                const seg = segments[idx];
                if (!seg) return false;
                const word = String(seg[0] || '').toLowerCase();
                const lemma = String(seg[2] || '').toLowerCase();

                if (word.length <= 2 || targetWord.length <= 2) {
                    return word === targetWord || lemma === targetWord;
                }
                return word.startsWith(targetWord) || targetWord.startsWith(word) || lemma === targetWord;
            };

            // 如果原始索引在有效范围内且匹配，保留
            if (suggestion >= 0 && suggestion < segments.length && checkMatch(suggestion)) {
                corrected.push(suggestion);
            } else {
                // 否则在附近 10 个跨度内搜索
                let bestIdx = -1;
                for (let offset = 1; offset <= 10; offset++) {
                    if (suggestion + offset < segments.length && checkMatch(suggestion + offset)) { 
                        bestIdx = suggestion + offset; 
                        break; 
                    }
                    if (suggestion - offset >= 0 && checkMatch(suggestion - offset)) { 
                        bestIdx = suggestion - offset; 
                        break; 
                    }
                }
                
                if (bestIdx !== -1) {
                    corrected.push(bestIdx);
                } else {
                    const globalIdx = segments.findIndex((seg, idx) => checkMatch(idx));
                    corrected.push(globalIdx !== -1 ? globalIdx : suggestion);
                }
            }
        });

        // C. 过滤越界，确保安全性
        return corrected.filter(idx => idx >= 0 && idx < segments.length);
    }
}

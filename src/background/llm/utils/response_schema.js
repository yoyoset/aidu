import { SENTENCE_SCHEMA, PHRASAL_VERB_SCHEMA } from '../../../utils/schema_constants.js';

/**
 * ResponseSchema
 * 定义各模式的标准 JSON Schema。
 * 同时提供 Gemini (Google) 和 OpenAI (Standard) 两种格式。
 * 支持 OpenAI 严格模式 (strict: true)：
 * 1. 所有对象级属性必须具有 additionalProperties: false
 * 2. 对应的 required 数组必须包含所有在 properties 中定义的属性。
 */

/**
 * 获取标准 JSON Schema (OpenAI 格式)
 * @param {number} mode - 分析模式 (1 = 仅翻译, 2 = 简单分析, 3 = 深度分析)
 */
export function getStandardSchema(mode) {
    const numericMode = parseInt(mode) || 2;

    // Mode 1: 仅翻译 (Translation Only)
    if (numericMode === 1) {
        return {
            type: 'object',
            properties: {
                sentences: {
                    type: 'array',
                    description: 'Array of translated sentences',
                    items: {
                        type: 'object',
                        properties: {
                            [SENTENCE_SCHEMA.original_text]: { 
                                type: 'string', 
                                description: 'The exact original sentence text from input' 
                            },
                            [SENTENCE_SCHEMA.translation]: { 
                                type: 'string', 
                                description: 'Simplified Chinese translation of the sentence' 
                            }
                        },
                        required: [
                            SENTENCE_SCHEMA.original_text, 
                            SENTENCE_SCHEMA.translation
                        ],
                        additionalProperties: false
                    }
                }
            },
            required: ['sentences'],
            additionalProperties: false
        };
    }

    // Mode 2 & 3: 简单分析与深度分析 (Full analysis)
    return {
        type: 'object',
        properties: {
            sentences: {
                type: 'array',
                description: 'Array of analyzed sentences',
                items: {
                    type: 'object',
                    properties: {
                        [SENTENCE_SCHEMA.original_text]: { 
                            type: 'string', 
                            description: 'The exact original sentence text from input' 
                        },
                        [SENTENCE_SCHEMA.translation]: { 
                            type: 'string', 
                            description: 'Simplified Chinese translation of the sentence' 
                        },
                        [SENTENCE_SCHEMA.explanation]: { 
                            type: 'string', 
                            description: 'Pedagogical grammar explanation (Max 10 words for mode 2, max 2 sentences for mode 3)' 
                        },
                        [SENTENCE_SCHEMA.segments]: {
                            type: 'array',
                            description: 'Word segmentation and POS tags. Items are [word, POS, lemma]',
                            items: {
                                type: 'array',
                                items: { type: 'string' },
                                description: '[word, POS, lemma]'
                            }
                        },
                        [SENTENCE_SCHEMA.phrasal_verbs]: {
                            type: 'array',
                            description: 'Phrasal verbs found in this sentence',
                            items: {
                                type: 'object',
                                properties: {
                                    [PHRASAL_VERB_SCHEMA.text]: { 
                                        type: 'string',
                                        description: 'The phrasal verb text (e.g. "break up" or "look after")'
                                    },
                                    [PHRASAL_VERB_SCHEMA.indices]: { 
                                        type: 'array', 
                                        description: '0-based segment indices of the words forming this phrasal verb',
                                        items: { type: 'integer' } 
                                    },
                                    [PHRASAL_VERB_SCHEMA.lemma]: { 
                                        type: 'string',
                                        description: 'The base form dictionary entry of the phrasal verb'
                                    },
                                    [PHRASAL_VERB_SCHEMA.translation]: { 
                                        type: 'string',
                                        description: 'Chinese translation of the phrasal verb'
                                    }
                                },
                                required: [
                                    PHRASAL_VERB_SCHEMA.text,
                                    PHRASAL_VERB_SCHEMA.indices,
                                    PHRASAL_VERB_SCHEMA.lemma,
                                    PHRASAL_VERB_SCHEMA.translation
                                ],
                                additionalProperties: false
                            }
                        }
                    },
                    required: [
                        SENTENCE_SCHEMA.original_text,
                        SENTENCE_SCHEMA.translation,
                        SENTENCE_SCHEMA.explanation,
                        SENTENCE_SCHEMA.segments,
                        SENTENCE_SCHEMA.phrasal_verbs
                    ],
                    additionalProperties: false
                }
            }
        },
        required: ['sentences'],
        additionalProperties: false
    };
}

/**
 * 获取 Gemini 专用 Schema 格式
 * @param {number} mode - 分析模式
 */
export function getGeminiSchema(mode) {
    // Gemini 采用标准 JSON Schema，与 OpenAI 格式一致
    return getStandardSchema(mode);
}

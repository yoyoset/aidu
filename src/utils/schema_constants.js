/**
 * SchemaConstants
 * Central source of truth for all JSON structures used between LLM and UI.
 */
export const SENTENCE_SCHEMA = {
    original_text: "original_text",
    translation: "translation",
    segments: "segments",
    explanation: "explanation",
    phrasal_verbs: "phrasal_verbs"
};

export const SEGMENT_FIELDS = {
    WORD: 0,
    POS: 1,
    LEMMA: 2
};

// Simplified phrasal_verbs schema for LLM
export const PHRASAL_VERB_SCHEMA = {
    text: "text",
    indices: "indices",
    lemma: "lemma",
    translation: "translation"
};

export const PROMPTING_SCHEMA_EXAMPLE = JSON.stringify({
    sentences: [{
        [SENTENCE_SCHEMA.original_text]: "",
        [SENTENCE_SCHEMA.translation]: "",
        [SENTENCE_SCHEMA.segments]: [["word", "POS", "lemma"]],
        [SENTENCE_SCHEMA.phrasal_verbs]: [{
            [PHRASAL_VERB_SCHEMA.text]: "",
            [PHRASAL_VERB_SCHEMA.indices]: [],
            [PHRASAL_VERB_SCHEMA.lemma]: "",
            [PHRASAL_VERB_SCHEMA.translation]: ""
        }],
        [SENTENCE_SCHEMA.explanation]: ""
    }]
});

export const VOCAB_SCHEMA = {
    word: "word",
    lemma: "lemma",
    meaning: "meaning",
    phonetic: "phonetic",
    context: "context",
    level: "level",
    collocations: "collocations",
    deepData: "deepData"
};

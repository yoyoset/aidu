/**
 * AIDU Data Schemas
 * Based on Blueprint Appendix A
 */

/**
 * @typedef {Object} LemmaInfo
 * @property {string} c - CEFR Level (e.g. "A1", "B2")
 * @property {string} p - Phonetic IPA
 * @property {string} m - Contextual Meaning
 */

/**
 * @typedef {Object} SentenceData
 * @property {string} original_text - Full sentence text
 * @property {string} translation - Sentence translation
 * @property {string} explanation - Deep analysis explanation
 * @property {Object.<string, LemmaInfo>} dict - Dictionary of lemmas
 * @property {Array<[string, string, string]>} segments - [Text, Type, Lemma]
 */

/**
 * @typedef {Object} BuilderDraft
 * @property {string} id - Unique Hash ID
 * @property {string} title - Draft Title
 * @property {'draft'|'processing'|'ready'|'error'} status - Processing Status
 * @property {string} rawText - Input text
 * @property {'standard'|'deep'} analysisMode - Analysis Mode
 * @property {{ sentences: SentenceData[] }} data - Structured Data
 * @property {{ current: number, total: number, percentage: number }} progress
 * @property {number} createdAt - Timestamp
 * @property {number} updatedAt - Timestamp
 */

export const SchemaDefaults = {
    createDraft: (rawText) => ({
        id: crypto.randomUUID(),
        title: 'New Draft',
        status: 'draft',
        rawText,
        analysisMode: 'standard',
        data: { sentences: [] },
        progress: { current: 0, total: 0, percentage: 0 },
        createdAt: Date.now(),
        updatedAt: Date.now()
    })
};

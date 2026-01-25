/**
 * TextChunker
 * Splits text into semantic chunks based on sentence boundaries.
 */

export class TextChunker {
    constructor(options = {}) {
        this.minSize = options.minSize || 100;
        this.maxSize = options.maxSize || 2000; // Default 2000 chars

        // Check for Intl.Segmenter support
        if (typeof Intl.Segmenter !== 'undefined') {
            this.segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
        } else {
            // Fallback: Regex-based sentence splitting
            this.segmenter = {
                segment: (text) => text.split(/(?<=[.!?])\s+/)
                    .filter(s => s.trim())
                    .map(s => ({ segment: s }))
            };
            console.warn('TextChunker: Intl.Segmenter unavailable, using regex fallback');
        }
    }

    /**
     * Splits text into chunks.
     * @param {string} rawText 
     * @returns {string[]} Array of text chunks
     */
    chunk(rawText) {
        if (!rawText) return [];

        const cleanText = this.sanitize(rawText);
        console.log(`TextChunker input length: ${rawText.length}, sanitized: ${cleanText.length}`);

        const sentences = Array.from(this.segmenter.segment(cleanText))
            .map(s => s.segment);
        console.log(`TextChunker found ${sentences.length} sentences`);

        const chunks = [];
        let currentChunk = '';

        for (const sentence of sentences) {
            // Oversized sentence: Keep independent, do not split
            if (sentence.length > this.maxSize) {
                if (currentChunk.length > 0) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }
                chunks.push(sentence.trim());
                console.warn(`TextChunker: Oversized sentence (${sentence.length} chars) kept as single chunk`);
                continue;
            }

            if (currentChunk.length + sentence.length > this.maxSize && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }

            currentChunk += sentence;
        }

        if (currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    sanitize(text) {
        return text
            .replace(/&nbsp;/gi, ' ')           // HTML space
            .replace(/<br\s*\/?>/gi, '\n')      // HTML line break
            .replace(/<[^>]+>/g, '')            // Strip remaining HTML tags
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/([^\n])\n(?!\n)/g, '$1 ')
            .replace(/\n{2,}/g, '\n')
            .trim();
    }

    countWords(str) {
        return str.trim().split(/\s+/).length;
    }
}

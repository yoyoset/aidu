/**
 * TextChunker
 * Splits text into semantic chunks based on sentence boundaries.
 */

export class TextChunker {
    constructor(options = {}) {
        this.minSize = options.minSize || 100;
        this.maxSize = options.maxSize || 2000; // Default 2000 chars

        // Native Segmenter (Chrome 87+)
        this.segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
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
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/([^\n])\n(?!\n)/g, '$1 ')
            .replace(/\n{2,}/g, '\n')
            .trim();
    }

    countWords(str) {
        return str.trim().split(/\s+/).length;
    }
}

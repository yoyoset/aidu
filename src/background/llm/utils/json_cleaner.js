/**
 * JsonCleaner
 * Standalone utility to extract, clean, and repair JSON from LLM responses.
 */
export class JsonCleaner {
    /**
     * Extracts and repairs JSON from raw LLM text
     * @param {string} text 
     * @returns {string} 
     */
    static clean(text) {
        if (!text) return text;
        let clean = text.trim();

        // 0. Partial JSON Recovery (Handle Pre-filling/Prefixing)
        // If the model starts directly with a key like "m": or "sentences":
        if (clean.startsWith('"') && !clean.startsWith('{') && !clean.startsWith('[')) {
            clean = '{' + clean;
        }

        // Handle common pre-fill cases
        if (clean.startsWith('"sentences"')) clean = '{' + clean;
        if (clean.startsWith('"m"')) clean = '{' + clean;
        if (clean.startsWith('"etymology"')) clean = '{' + clean;

        // 1. Try to unwrap markdown code blocks
        const markdownMatch = clean.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);
        if (markdownMatch && markdownMatch[1]) {
            clean = markdownMatch[1].trim();
        }

        // 2. Heuristic Extraction: Find the widest possible JSON object/array
        const firstOpen = clean.indexOf('{');
        const firstBracket = clean.indexOf('[');
        let startIndex = -1;
        let isArray = false;

        if (firstOpen !== -1 && (firstBracket === -1 || firstOpen < firstBracket)) {
            startIndex = firstOpen;
        } else if (firstBracket !== -1) {
            startIndex = firstBracket;
            isArray = true;
        }

        if (startIndex !== -1) {
            const lastClose = clean.lastIndexOf('}');
            const lastBracket = clean.lastIndexOf(']');
            const endIndex = isArray ? lastBracket : lastClose;

            if (endIndex !== -1 && endIndex > startIndex) {
                clean = clean.substring(startIndex, endIndex + 1);
            }
        }

        // 3. Structural Completion (Fix for cut-off responses)
        if (clean.includes('"original_text"') && !clean.startsWith('{"sentences":')) {
            if (clean.startsWith('[')) clean = '{"sentences":' + clean + '}';
            else if (clean.startsWith('{') && !clean.includes('"sentences"')) clean = '{"sentences":[' + clean + ']}';
        }

        // 4. Closing Fix: Iterate and attempt to close brackets
        let retryCount = 0;
        while (retryCount < 3) {
            try {
                JSON.parse(clean);
                break; // Valid!
            } catch (e) {
                // Try appending closures
                if (clean.endsWith('"')) clean += ':""';
                if (!clean.endsWith('}')) {
                    if (clean.includes('[') && !clean.includes(']')) clean += ']';
                    clean += '}';
                } else break;
            }
            retryCount++;
        }

        return clean;
    }
}

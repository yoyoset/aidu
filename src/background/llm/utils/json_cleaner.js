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

            // If we found a start but no valid end, we keep from start to end of string for recovery
            if (endIndex !== -1 && endIndex > startIndex) {
                clean = clean.substring(startIndex, endIndex + 1);
            } else {
                clean = clean.substring(startIndex);
            }
        }

        // 3. Remove Trailing Commas (Crucial for LLMs)
        // Remove comma before closing brace or bracket
        clean = clean.replace(/,\s*([}\]])/g, '$1');
        // Remove comma at the very end of the string
        clean = clean.replace(/,\s*$/g, '');

        // 4. Structural Completion (Fix for cut-off responses)
        // If it starts with specific known keys but isn't wrapped
        if (clean.includes('"original_text"') && !clean.startsWith('{"sentences":')) {
            if (clean.startsWith('[')) clean = '{"sentences":' + clean;
            else if (clean.startsWith('{') && !clean.includes('"sentences"')) clean = '{"sentences":[' + clean;
        }

        // 4.5. Repair Missing Commas between properties
        clean = JsonCleaner.repairMissingCommas(clean);

        // 5. Stack-Based Structural Repair
        clean = JsonCleaner.repairTrailingClosures(clean);

        // 6. Fallback Recursive Closure Fix (for extremely corrupted edge cases)
        let retryCount = 0;
        while (retryCount < 20) { 
            try {
                JSON.parse(clean);
                return clean; // Valid!
            } catch (e) {
                const msg = e.message;
                
                if (msg.includes('Expected \':\'')) {
                    clean += ':""';
                } else if (msg.includes('Unterminated string')) {
                    clean += '"';
                } else {
                    // Count opens vs closes to decide what to add
                    const openBraces = (clean.match(/{/g) || []).length;
                    const closeBraces = (clean.match(/}/g) || []).length;
                    const openBrackets = (clean.match(/\[/g) || []).length;
                    const closeBrackets = (clean.match(/\]/g) || []).length;

                    if (openBrackets > closeBrackets) {
                        clean += ']';
                    } else if (openBraces > closeBraces) {
                        clean += '}';
                    } else {
                        break; // Nothing more we can easily do
                    }
                }
            }
            retryCount++;
        }

        return clean;
    }

    /**
     * Stateful character-by-character missing comma repair outside of string literals
     * @param {string} clean 
     * @returns {string}
     */
    static repairMissingCommas(clean) {
        let result = '';
        let inString = false;
        let escaped = false;

        for (let i = 0; i < clean.length; i++) {
            const char = clean[i];

            if (escaped) {
                result += char;
                escaped = false;
                continue;
            }
            if (char === '\\') {
                result += char;
                escaped = true;
                continue;
            }

            if (char === '"') {
                if (!inString) {
                    // This double quote starts a string (key or value).
                    // Look backwards in the result string to see if we need a comma.
                    let j = result.length - 1;
                    while (j >= 0 && (result[j] === ' ' || result[j] === '\t' || result[j] === '\r' || result[j] === '\n')) {
                        j--;
                    }
                    if (j >= 0) {
                        const prevChar = result[j];
                        if (prevChar === '"' || prevChar === '}' || prevChar === ']' || /[a-zA-Z0-9]/.test(prevChar)) {
                            // Insert a comma before the whitespace
                            result = result.substring(0, j + 1) + ',' + result.substring(j + 1);
                        }
                    }
                }
                inString = !inString;
                result += char;
                continue;
            }

            result += char;
        }

        return result;
    }

    /**
     * Stack-based JSON structural closure and trailing mismatch repair
     * @param {string} clean 
     * @returns {string}
     */
    static repairTrailingClosures(clean) {
        let stack = [];
        let inString = false;
        let escaped = false;

        for (let i = 0; i < clean.length; i++) {
            const char = clean[i];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === '"') {
                inString = !inString;
                continue;
            }
            if (inString) {
                continue;
            }

            if (char === '{') {
                stack.push('}');
            } else if (char === '[') {
                stack.push(']');
            } else if (char === '}' || char === ']') {
                if (stack.length > 0 && stack[stack.length - 1] === char) {
                    stack.pop();
                } else {
                    // Mismatch!
                    // If this mismatch occurs near the end of the string (whitespace/commas/braces/brackets),
                    // truncate from here and rebuild the correct closing sequence based on the remaining stack.
                    const remainingStr = clean.substring(i);
                    if (/^[ \t\r\n,}\]]*$/.test(remainingStr)) {
                        let corrected = clean.substring(0, i);
                        while (stack.length > 0) {
                            corrected += stack.pop();
                        }
                        return corrected;
                    }
                }
            }
        }

        // If the string is cut off inside a string literal
        if (inString) {
            clean += '"';
        }

        // Complete any unclosed brackets or braces in the stack
        while (stack.length > 0) {
            clean += stack.pop();
        }

        return clean;
    }
}

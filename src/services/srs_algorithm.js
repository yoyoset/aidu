/**
 * SRS Algorithm - Simplified SM-2 inspired logic
 */
export class SRSAlgorithm {
    /**
     * Calculate next review schedule
     * @param {string} currentStage - 'new', 'learning', 'review', 'mastered'
     * @param {number} quality - 0 (Forgot), 1 (Hard), 2 (Good/Got it), 3 (Easy)
     * @param {number} currentInterval - Current interval in days
     * @param {number} easeFactor - Current ease factor (default 2.5)
     */
    static calculate(currentStage, quality, currentInterval = 0, easeFactor = 2.5) {
        let nextInterval = 1;
        let nextStage = currentStage;
        let nextEase = easeFactor;

        // 0 = Forgot / Reset
        if (quality === 0) {
            return {
                nextReview: Date.now(), // Review immediately (or tomorrow?) -> Let's say immediate re-queue or +1m
                // Actually for "Forgot", we usually reset to 'learning' and interval 0
                nextInterval: 0,
                nextStage: 'learning',
                nextEase: Math.max(1.3, easeFactor - 0.2)
            };
        }

        // Mastered Manually
        if (currentStage === 'mastered') {
            return { nextReview: null, nextInterval: 9999, nextStage: 'mastered', nextEase };
        }

        // New / Learning Phase
        if (currentStage === 'new' || currentStage === 'learning') {
            if (quality >= 1) {
                // Graduate to review if Good (2) or Easy (3)
                // Or just bump interval
                nextInterval = 1; // 1 day
                nextStage = 'review';
            }
        } else if (currentStage === 'review') {
            // Review Phase
            if (currentInterval === 0) currentInterval = 1;

            if (quality === 1) { // Hard
                nextInterval = currentInterval * 1.2;
                nextEase = Math.max(1.3, easeFactor - 0.15);
            } else if (quality === 2) { // Good
                nextInterval = currentInterval * easeFactor;
            } else if (quality === 3) { // Easy
                nextInterval = currentInterval * easeFactor * 1.3;
                nextEase = easeFactor + 0.15;
            }
            nextStage = 'review';
        }

        // Cap Interval? (e.g. 365 days)
        if (nextInterval > 365) nextInterval = 365;

        // Convert Interval (Days) to Timestamp
        // Add randomness/fuzz to prevent stacking?
        const dayMs = 24 * 60 * 60 * 1000;
        const nextReviewTime = Date.now() + (nextInterval * dayMs);

        return {
            nextReview: nextReviewTime,
            nextInterval: parseFloat(nextInterval.toFixed(2)),
            nextStage,
            nextEase: parseFloat(nextEase.toFixed(2))
        };
    }
}

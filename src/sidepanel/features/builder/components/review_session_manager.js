import { VocabReview } from '../../vocab/vocab_review.js';
import { vocabService } from '../../../../services/vocab_service.js';
import { notificationService } from '../../../../utils/notification_service.js';
import { t } from '../../../../locales/index.js';

export class ReviewSessionManager {
    constructor() {
        this.vocabReview = new VocabReview();
    }

    async startReview(mode = 'due') {
        const vocab = await vocabService.getAll();
        const list = Object.values(vocab);
        let candidates = [];

        if (mode === 'due') {
            const now = Date.now();
            candidates = list.filter(v => v.nextReview && v.nextReview <= now && v.stage !== 'mastered');
        } else if (mode === 'all') {
            candidates = list.filter(v => v.stage !== 'mastered');
        } else if (mode === 'forgotten') {
            // Logic for forgotten/leech items could go here
            candidates = list.filter(v => v.easeFactor < 2.0 && v.stage !== 'mastered');
        }

        if (candidates.length === 0) {
            notificationService.toast(t('review.noDue') || '没有需要复习的单词');
            return;
        }

        // Shuffle
        candidates.sort(() => Math.random() - 0.5);

        // Limit session size (e.g. 20)
        const session = candidates.slice(0, 20);

        this.vocabReview.start(session);

        return new Promise((resolve) => {
            this.vocabReview.onFinish = () => {
                resolve();
            };
        });
    }
}

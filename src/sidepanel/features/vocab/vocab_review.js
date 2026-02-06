import { Component } from '../../components/component.js';
import styles from '../builder/dashboard.module.css';
import { vocabService } from '../../../services/vocab_service.js';
import { SRSAlgorithm } from '../../../services/srs_algorithm.js';
import { t } from '../../../locales/index.js';
import { notificationService } from '../../../utils/notification_service.js';

export class VocabReview extends Component {
    constructor(element) {
        super(element);
        this.queue = [];
        this.currentCard = null;
        this.isFlipped = false;
        this.stats = { reviewed: 0, forgotten: 0, mastered: 0 };
    }

    async start(candidates) {
        this.queue = candidates;
        this.totalCount = candidates.length;
        this.stats = { reviewed: 0, forgotten: 0, mastered: 0 };
        this.show();
        this.render();
    }

    render() {
        // Create container if not exists, preventing body class overwrite
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = styles.reviewOverlay;
            document.body.appendChild(this.container);
        }

        this.container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = styles.reviewContainer;

        // Close Button
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '10px';
        header.style.padding = '0 4px';

        const counter = document.createElement('span');
        counter.style.color = 'var(--md-sys-color-on-surface-variant)';
        counter.style.fontSize = '0.9em';
        counter.style.fontWeight = 'bold';
        // Calculate progress: 1-based index
        const current = this.totalCount - this.queue.length + 1;
        counter.textContent = t('vocab.card', { current, total: this.totalCount });

        const closeBtn = document.createElement('button');
        closeBtn.className = styles.closeReviewBtn;
        closeBtn.innerHTML = '<i class="ri-close-line"></i>';
        closeBtn.onclick = () => this.finish();

        header.appendChild(counter);
        header.appendChild(closeBtn);
        wrapper.appendChild(header);

        // Content
        if (this.queue.length === 0) {
            this.renderEmpty(wrapper);
        } else {
            this.currentCard = this.queue[0];
            this.renderCard(wrapper);
        }

        this.container.appendChild(wrapper);
    }

    renderEmpty(container) {
        container.innerHTML += `
            <div style="text-align:center; padding: 40px;">
                <h2 style="font-size: 2em; margin-bottom: 20px;">${t('review.allDone')}</h2>
                <div style="font-size: 1.1em; color: var(--md-sys-color-on-surface-variant); margin-bottom: 30px;">
                    <p>${t('review.summary', { reviewed: this.stats.reviewed })}</p>
                    <p>${t('review.stats', { mastered: this.stats.mastered, forgotten: this.stats.forgotten })}</p>
                </div>
                <button class="${styles.btnPrimary}" id="close-review" style="padding: 10px 24px; font-size: 1.2em;">${t('common.close')}</button>
            </div>
        `;
        container.querySelector('#close-review').onclick = () => this.finish();
    }

    renderCard(container) {
        const word = this.currentCard;
        this.isFlipped = false;

        const card = document.createElement('div');
        card.className = `${styles.flashcard}`;
        // Add animation class if needed for transition

        // Front (Question)
        const front = document.createElement('div');
        front.className = styles.cardFront;
        front.innerHTML = `
            <div class="${styles.cardWord}">${word.word}</div>
            <div class="${styles.cardPhonetic}">${word.phonetic || ''}</div>
            <div class="${styles.cardContext}" style="margin-top:20px; font-size:1.1em; color:var(--md-sys-color-on-surface-variant);">
                ${this.createCloze(word.context, word.word)}
            </div>
            <div class="${styles.cardHint}">${t('review.flip')}</div>
        `;

        // Back (Answer)
        const back = document.createElement('div');
        back.className = styles.cardBack;
        back.innerHTML = `
            <div class="${styles.cardHeader}">
                <span class="${styles.cardWordSmall}">${word.word}</span>
                <span class="${styles.cardPos}">${word.pos}</span>
                <button class="${styles.iconBtn}" id="edit-btn" title="${t('dashboard.draft.edit')}"><i class="ri-edit-line"></i></button>
            </div>
            <div class="${styles.cardMeaning}">${word.meaning}</div>
            <div class="${styles.cardContext}">"${word.context}"</div>
            <div class="${styles.cardActions}">
                <button class="${styles.srsBtn} ${styles.srsFail}" data-grade="0">${t('review.forgot')}</button>
                <button class="${styles.srsBtn} ${styles.srsHard}" data-grade="1">${t('review.hard')}</button>
                <button class="${styles.srsBtn} ${styles.srsGood}" data-grade="2">${t('review.good')}</button>
                <button class="${styles.srsBtn} ${styles.srsEasy}" data-grade="3">${t('review.easy')}</button>
            </div>
            <button class="${styles.btnDestructive} ${styles.masterBtn}" id="master-btn">${t('review.masterRemove')}</button>
        `;

        card.appendChild(front);
        card.appendChild(back);

        // Interaction
        card.onclick = (e) => {
            if (e.target.tagName === 'BUTTON') return;
            if (!this.isFlipped) {
                this.isFlipped = true;
                card.classList.add(styles.flipped);
            }
        };

        // SRS Actions
        // Critical Fix: select by attribute, not class (CSS Modules hashing issue)
        back.querySelectorAll('button[data-grade]').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                // Ensure we get the dataset from the button even if clicking child spans (if added later)
                const quality = parseInt(e.currentTarget.dataset.grade);

                // Visual feedback before next
                card.style.opacity = '0.5';
                card.style.transform = 'translateX(-20px)';
                setTimeout(() => this.handleGrade(quality), 150);
            };
        });

        // Master Action
        back.querySelector('#master-btn').onclick = (e) => {
            e.stopPropagation();
            card.style.opacity = '0.5';
            setTimeout(() => this.handleMaster(), 150);
        };

        // Edit Action
        back.querySelector('#edit-btn').onclick = (e) => {
            e.stopPropagation();
            this.handleEdit();
        };

        container.appendChild(card);
    }

    createCloze(context, word) {
        if (!context) return t('review.noContext');
        // Simple case-insensitive replacement
        // Note: Ideally this would handle lemmas/inflections, but for now exact match or simple substring
        try {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            if (regex.test(context)) {
                return context.replace(regex, '______');
            }
            // Fallback: if exact match not found (e.g. inflected), show as is or try looser match?
            // Let's just return the context for now if regex fails, user still gets context.
            // Or maybe partial masking? No, keep it simple.
            return context;
        } catch (e) {
            return context;
        }
    }

    async handleGrade(quality) {
        const item = this.currentCard;
        const result = SRSAlgorithm.calculate(item.stage || 'new', quality, item.interval, item.easeFactor);

        // Update Stats
        this.stats.reviewed++;
        if (quality === 0) this.stats.forgotten++;

        // Save
        await vocabService.updateEntry(item.lemma || item.word, {
            ...result,
            reviews: (item.reviews || 0) + 1,
            lastReview: Date.now()
        });

        this.nextCard();
    }

    async handleMaster() {
        const item = this.currentCard;
        await vocabService.updateEntry(item.lemma || item.word, {
            stage: 'mastered',
            nextReview: null, // Never
            masteredAt: Date.now()
        });
        this.stats.mastered++;
        this.nextCard();
    }

    async handleEdit() {
        const newMeaning = await notificationService.prompt(t('review.editMeaning'), this.currentCard.meaning);
        if (newMeaning !== null) {
            vocabService.updateEntry(this.currentCard.lemma, { meaning: newMeaning });
            this.currentCard.meaning = newMeaning;
            this.render(); // Re-render current
        }
    }

    nextCard() {
        this.queue.shift();
        this.render();
    }

    finish() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        if (this.onFinish) this.onFinish();
    }
}

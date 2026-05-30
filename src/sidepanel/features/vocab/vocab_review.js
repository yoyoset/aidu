import { Component } from '../../components/component.js';
import navStyles from '../builder/styles/dashboard_nav.module.css';
import reviewStyles from '../builder/components/review_overlay.module.css';
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
            this.container.className = reviewStyles.reviewOverlay;
            document.body.appendChild(this.container);
        }

        this.container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = reviewStyles.reviewContainer;

        // Progress bar header
        const topBar = document.createElement('div');
        topBar.className = reviewStyles.reviewTop || 'reviewTop';

        const progressTrack = document.createElement('div');
        progressTrack.className = reviewStyles.reviewProgTrack || 'reviewProgTrack';
        const progressFill = document.createElement('div');
        progressFill.className = reviewStyles.reviewProgFill || 'reviewProgFill';
        const completed = this.totalCount - this.queue.length;
        const progressPct = this.totalCount > 0 ? (completed / this.totalCount) * 100 : 0;
        progressFill.style.width = progressPct + '%';
        progressTrack.appendChild(progressFill);

        const counter = document.createElement('span');
        counter.className = reviewStyles.reviewCount || 'reviewCount';
        const current = completed + 1;
        counter.textContent = `${current} / ${this.totalCount}`;

        topBar.appendChild(progressTrack);
        topBar.appendChild(counter);
        wrapper.appendChild(topBar);

        // Close Button
        const closeBtn = document.createElement('button');
        closeBtn.className = reviewStyles.closeReviewBtn;
        closeBtn.innerHTML = '<i class="ri-close-line"></i>';
        closeBtn.onclick = () => this.finish();
        wrapper.appendChild(closeBtn);

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
        const done = document.createElement('div');
        done.className = reviewStyles.reviewDone || 'reviewDone';
        done.style.textAlign = 'center';
        done.style.flex = '1';
        done.style.display = 'flex';
        done.style.flexDirection = 'column';
        done.style.alignItems = 'center';
        done.style.justifyContent = 'center';
        done.style.padding = '30px';

        const trophy = document.createElement('div');
        trophy.style.width = '84px';
        trophy.style.height = '84px';
        trophy.style.borderRadius = '99px';
        trophy.style.background = 'var(--primary-soft)';
        trophy.style.color = 'var(--primary)';
        trophy.style.display = 'grid';
        trophy.style.placeItems = 'center';
        trophy.style.fontSize = '2.6rem';
        trophy.style.marginBottom = '12px';
        trophy.innerHTML = '<i class="ri-medal-2-line"></i>';

        const title = document.createElement('h2');
        title.style.fontFamily = 'var(--font-display)';
        title.style.fontWeight = '800';
        title.style.fontSize = '1.6rem';
        title.style.color = 'var(--ink)';
        title.style.marginBottom = '18px';
        title.textContent = t('review.allDone');

        const stats = document.createElement('div');
        stats.style.display = 'flex';
        stats.style.gap = '24px';
        stats.style.margin = '18px 0 24px';
        stats.style.justifyContent = 'center';

        const statReviewed = document.createElement('div');
        const numReviewed = document.createElement('div');
        numReviewed.style.fontFamily = 'var(--font-display)';
        numReviewed.style.fontWeight = '800';
        numReviewed.style.fontSize = '1.8rem';
        numReviewed.style.color = 'var(--ink)';
        numReviewed.textContent = this.stats.reviewed.toString();
        const capReviewed = document.createElement('div');
        capReviewed.style.fontSize = '0.72rem';
        capReviewed.style.color = 'var(--ink-3)';
        capReviewed.style.fontWeight = '600';
        capReviewed.style.marginTop = '2px';
        capReviewed.textContent = t('review.summary', { reviewed: this.stats.reviewed });
        statReviewed.appendChild(numReviewed);
        statReviewed.appendChild(capReviewed);

        stats.appendChild(statReviewed);
        done.appendChild(trophy);
        done.appendChild(title);
        done.appendChild(stats);

        const closeBtn = document.createElement('button');
        closeBtn.className = navStyles.btnPrimary;
        closeBtn.style.padding = '12px 28px';
        closeBtn.style.marginTop = 'auto';
        closeBtn.textContent = t('common.close');
        closeBtn.onclick = () => this.finish();
        done.appendChild(closeBtn);

        container.appendChild(done);
    }

    renderCard(container) {
        const word = this.currentCard;
        this.isFlipped = false;

        const card = document.createElement('div');
        card.className = `${reviewStyles.flashcard}`;
        // Add animation class if needed for transition

        // Front (Question)
        const front = document.createElement('div');
        front.className = reviewStyles.cardFront;

        const frontWord = document.createElement('div');
        frontWord.className = reviewStyles.cardWord;
        frontWord.textContent = word.word;
        front.appendChild(frontWord);

        if (word.phonetic) {
            const frontPhon = document.createElement('div');
            frontPhon.className = reviewStyles.cardPhonetic;
            frontPhon.textContent = word.phonetic;
            front.appendChild(frontPhon);
        }

        const frontCloze = document.createElement('div');
        frontCloze.className = reviewStyles['fc-cloze'] || 'fc-cloze';
        frontCloze.style.marginTop = '26px';
        frontCloze.style.maxWidth = '320px';
        frontCloze.innerHTML = this.createCloze(word.context, word.word);
        front.appendChild(frontCloze);

        const frontHint = document.createElement('div');
        frontHint.className = reviewStyles.cardHint;
        frontHint.innerHTML = '<i class="ri-arrow-up-line"></i>' + t('review.flip');
        front.appendChild(frontHint);

        // Back (Answer)
        const back = document.createElement('div');
        back.className = reviewStyles.cardBack;

        // Header
        const backHeader = document.createElement('div');
        backHeader.className = reviewStyles.cardHeader;

        const backWord = document.createElement('span');
        backWord.className = reviewStyles.cardWordSmall;
        backWord.textContent = word.word;
        backHeader.appendChild(backWord);

        const backPos = document.createElement('span');
        backPos.className = reviewStyles.cardPos;
        backPos.textContent = word.pos;
        backHeader.appendChild(backPos);

        const editBtn = document.createElement('button');
        editBtn.className = navStyles.iconBtn;
        editBtn.id = 'edit-btn';
        editBtn.title = t('dashboard.draft.edit');
        editBtn.innerHTML = '<i class="ri-edit-line"></i>';
        editBtn.style.marginLeft = 'auto';
        backHeader.appendChild(editBtn);

        back.appendChild(backHeader);

        // Meaning
        const backMeaning = document.createElement('div');
        backMeaning.className = reviewStyles.cardMeaning;
        backMeaning.textContent = word.meaning;
        back.appendChild(backMeaning);

        // Context
        const backContext = document.createElement('div');
        backContext.className = reviewStyles.cardContext;
        backContext.innerHTML = word.context ? `"${word.context}"` : '';
        back.appendChild(backContext);

        // Spacer
        const spacer = document.createElement('div');
        spacer.style.flex = '1';
        back.appendChild(spacer);

        // Actions
        const backActions = document.createElement('div');
        backActions.className = reviewStyles.cardActions;

        const grades = [
            { grade: 0, label: t('review.forgot'), class: reviewStyles.srsFail },
            { grade: 1, label: t('review.hard'), class: reviewStyles.srsHard },
            { grade: 2, label: t('review.good'), class: reviewStyles.srsGood },
            { grade: 3, label: t('review.easy'), class: reviewStyles.srsEasy }
        ];

        grades.forEach(g => {
            const btn = document.createElement('button');
            btn.className = `${reviewStyles.srsBtn} ${g.class}`;
            btn.dataset.grade = g.grade;
            btn.innerHTML = `${g.label}<span class="${reviewStyles.gk || ''}">(${g.grade})</span>`;
            backActions.appendChild(btn);
        });

        back.appendChild(backActions);

        // Master button
        const masterBtn = document.createElement('button');
        masterBtn.className = reviewStyles.masterBtn;
        masterBtn.id = 'master-btn';
        masterBtn.textContent = t('review.masterRemove');
        back.appendChild(masterBtn);

        card.appendChild(front);
        card.appendChild(back);

        // Interaction
        card.onclick = (e) => {
            if (e.target.closest('button')) return;
            this.isFlipped = !this.isFlipped;
            card.classList.toggle(reviewStyles.flipped, this.isFlipped);
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
        try {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            if (regex.test(context)) {
                return context.replace(regex, '<span class="blank">______</span>');
            }
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
            lastReview: Date.now(),
            lastGrade: quality
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

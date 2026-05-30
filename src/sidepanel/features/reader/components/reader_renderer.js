import styles from '../reader_layout.module.css';
import { AtomicBlock } from '../components/atomic_block.js';
import { t } from '../../../../locales/index.js';

export class ReaderRenderer {
    constructor(rootElement) {
        this.root = rootElement;
        this.contentArea = null;
    }

    /**
     * Renders the full reader UI structure.
     * @param {Object} state - { draft, sentences, showTranslations, savedSet, fontSize }
     * @param {Object} components - { header, typography } (Components to render into the frame)
     * @param {Object} handlers - { onPlay, onBubbleClick }
     */
    render(state, components, handlers) {
        const { draft, sentences, showTranslations, savedSet, fontSize, debugMode } = state;
        const bookmarkIndices = new Set(draft.bookmarkIndices || []);

        // 1. Frame Setup
        const container = document.createElement('div');
        container.className = styles.readerContainer || 'readerContainer';

        // 2. Inject Sub-Components (Header, Settings)
        if (components.header) components.header.render(container);
        if (components.typography) components.typography.render(container);

        // 3. Progress bar
        const progressBar = document.createElement('div');
        progressBar.className = styles.readerProgress || 'readerProgress';
        const progressFill = document.createElement('div');
        progressFill.style.width = '0%';
        progressBar.appendChild(progressFill);
        this.progressFill = progressFill;
        container.appendChild(progressBar);

        // 4. Content Area
        const content = document.createElement('div');
        content.className = styles.readerContent || 'readerContent';
        this.contentArea = content;

        // 4a. Byline (title + metadata)
        const byline = document.createElement('div');
        byline.className = styles.readerByline || 'readerByline';
        const bylineTitle = document.createElement('h1');
        bylineTitle.textContent = draft?.title || 'Untitled';
        byline.appendChild(bylineTitle);

        const bylineMeta = document.createElement('div');
        bylineMeta.className = 'meta';
        const sentenceCount = sentences?.length || 0;
        const estimatedMinutes = Math.ceil(sentenceCount / 10) || 0;
        bylineMeta.innerHTML = `
            <span>${sentenceCount} ${sentenceCount === 1 ? 'sentence' : 'sentences'}</span>
            <span>${estimatedMinutes} min read</span>
        `;
        byline.appendChild(bylineMeta);
        content.appendChild(byline);

        // 4. Empty State or Content Loop
        if (!sentences || sentences.length === 0) {
            this.renderEmptyState(content, draft);
        } else {
            this.renderSentences(content, sentences, showTranslations, savedSet, handlers, bookmarkIndices, debugMode);
        }

        container.appendChild(content);
        this.root.appendChild(container);

        // 5. Progress bar scroll tracking
        content.addEventListener('scroll', () => {
            if (this.progressFill) {
                const scrollTop = content.scrollTop;
                const scrollHeight = content.scrollHeight - content.clientHeight;
                const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
                this.progressFill.style.width = progress + '%';
            }
        });

        return { contentArea: content };
    }

    renderEmptyState(container, draft) {
        const emptyHint = document.createElement('div');
        emptyHint.style.cssText = 'padding:40px 20px; color:#999; text-align:center;';
        emptyHint.innerHTML = `
            <div style="font-size:32px; margin-bottom:16px;"><i class="ri-ghost-line"></i></div>
            <div>${t('reader.empty')}</div>
            <div style="font-size:12px; margin-top:24px; opacity:0.6;">
                Draft Status: ${draft?.status}<br>
                Raw Content Length: ${(draft?.rawText || '').length} chars<br>
                Stored Sentence Count: ${(draft?.data?.sentences || []).length}
            </div>
            <button class="debug-data-btn" style="margin-top:16px; padding:4px 12px; font-size:11px; border:1px solid #ccc; border-radius:4px; cursor:pointer;">
                View Raw Data (Debug)
            </button>
        `;

        emptyHint.querySelector('.debug-data-btn').onclick = () => {
            console.log('--- DEBUG DATA for Draft', draft?.id, '---');
            console.log('Full Draft Object:', draft);
            console.log('Raw Text (first 500):', draft?.rawText?.substring(0, 500));
            console.log('Sentences[0]:', draft?.data?.sentences?.[0]);
            alert('Raw data logged to Console. Please check DevTools.');
        };
        container.appendChild(emptyHint);
    }

    renderSentences(container, sentences, showTranslations, savedSet, handlers, bookmarkIndices, debugMode = false) {
        console.log('[ReaderRenderer Debug] renderSentences called with:', sentences?.length, 'sentences');
        const bookmarkSet = bookmarkIndices instanceof Set ? bookmarkIndices : new Set(bookmarkIndices || []);
        sentences.forEach((sentence, index) => {
            const block = AtomicBlock.create(sentence, index, {
                onPlay: handlers.onPlay,
                onSelect: handlers.onSelect,
                onBubbleClick: handlers.onBubbleClick,
                onBookmark: handlers.onBookmark
            }, {
                showTranslations: showTranslations,
                savedSet: savedSet,
                bookmarkIndices: bookmarkSet,
                debugMode: debugMode
            });
            container.appendChild(block);
        });
    }

    // --- Dynamic UI Updates (DOM Manipulation) ---

    updateTranslationVisibility(show) {
        if (!this.root) return;
        const method = show ? 'remove' : 'add';
        const cls = styles.obscured || 'obscured';
        const icon = show ? '<i class="ri-eye-line"></i>' : '<i class="ri-eye-off-line"></i>';

        // Update Text
        this.root.querySelectorAll('.js-trans-text').forEach(el => el.classList[method](cls));
        this.root.querySelectorAll('.js-exp-text').forEach(el => el.classList[method](cls));
    }

    updateHighlights(savedSet) {
        if (!this.root) return;
        const bubbles = this.root.querySelectorAll(`.${styles.interactive || 'interactive'}`);
        bubbles.forEach(bubble => {
            const lemma = bubble.dataset.lemma;
            if (!lemma) return;
            if (savedSet.has(lemma)) {
                bubble.classList.add(styles.savedBubble || 'savedBubble');
            } else {
                bubble.classList.remove(styles.savedBubble || 'savedBubble');
            }
        });
    }

    refreshWordStyling(lemma) {
        const bubbles = this.root.querySelectorAll(`span[data-lemma="${lemma.toLowerCase()}"]`);
        bubbles.forEach(b => b.classList.add(styles.deepReady || 'deepReady'));
    }

    highlightSentence(index) {
        if (!this.contentArea) return;

        // Remove old
        const oldActive = this.contentArea.querySelector(`.${styles.active || 'active'}`);
        if (oldActive) oldActive.classList.remove(styles.active || 'active');

        // Add new
        if (index !== null && index !== undefined && index >= 0) {
            const newBlock = this.contentArea.querySelector(`div[data-index="${index}"]`);
            if (newBlock) {
                newBlock.classList.add(styles.active || 'active');
                newBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }

    locateWordInText(lemma) {
        if (!this.contentArea) return;

        // Clear previous locate highlight if any (transient)
        const selector = `span[data-lemma="${lemma.toLowerCase()}"]`;
        const target = this.contentArea.querySelector(selector);

        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add(styles.active || 'active');

            setTimeout(() => {
                target.classList.remove(styles.active || 'active');
            }, 2000);
        }
    }
}

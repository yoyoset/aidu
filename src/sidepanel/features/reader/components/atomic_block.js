import { t } from '../../../../locales/index.js';
import styles from '../reader_layout.module.css';
import { DebugModal } from '../../../components/debug_modal.js';

const debugModal = new DebugModal();

/**
 * AtomicBlock
 * Encapsulates the rendering and logic for a single sentence block in the reader.
 */
export class AtomicBlock {
    static create(sentence, index, handlers, options = {}) {
        const { onPlay, onBubbleClick } = handlers;
        const { showTranslations = false, savedSet = new Set(), bookmarkIndices = new Set(), debugMode = false } = options;

        if (!sentence || typeof sentence.original_text === 'undefined') {
            const err = document.createElement('div');
            err.className = styles.atomicBlock || 'atomicBlock';
            err.innerHTML = `<b style="color:var(--md-sys-color-error)">[Data Error: Block ${index} is missing content]</b>`;
            return err;
        }

        const block = document.createElement('div');
        block.className = styles.atomicBlock || 'atomicBlock';
        block.dataset.index = index;

        // Visual State: Is Bookmarked?
        const isBookmarked = bookmarkIndices.has(index);
        if (isBookmarked) {
            block.classList.add(styles.bookmarkActive || 'bookmarkActive');
        }

        console.log(`[AtomicBlock Debug] Rendering block ${index}, Text:`, sentence.original_text?.substring(0, 50));

        // Interaction: Single Click to Select, Double Click to Bookmark
        block.onclick = (e) => {
            // Ignore clicks on buttons or interactive bubbles
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            if (styles.bubble && e.target.closest(`.${styles.bubble}`)) return;

            // Just highlight/select, do NOT play
            if (handlers.onSelect) handlers.onSelect(index);
        };

        block.ondblclick = (e) => {
            // Bookmark action
            if (handlers.onBookmark) {
                e.preventDefault();
                handlers.onBookmark(index);
            }
        };

        // --- 1. Original Text Row ---
        const originalDiv = document.createElement('div');
        originalDiv.className = `${styles.originalRow || 'originalRow'} ${styles.controlRow || 'controlRow'}`;

        const playBtn = document.createElement('button');
        playBtn.className = `${styles.controlBtn || 'controlBtn'} ${styles.playBtn || 'playBtn'} js-play-btn`;
        playBtn.title = t('reader.play') || 'Play';
        playBtn.innerHTML = '<i class="ri-play-mini-line"></i>';
        playBtn.onclick = (e) => {
            e.stopPropagation();
            onPlay(index);
        };
        originalDiv.appendChild(playBtn);

        // --- Debug Button (Visible only in Debug Mode) ---
        if (debugMode) {
            const debugBtn = document.createElement('button');
            debugBtn.className = styles.controlBtn || 'controlBtn';
            debugBtn.style.opacity = '0.5';
            debugBtn.title = 'View Raw Data & Indices';
            debugBtn.innerHTML = '<i class="ri-terminal-box-line"></i>';
            debugBtn.onclick = (e) => {
                e.stopPropagation();
                debugModal.show(sentence, `Atomic Data (Block ${index})`);
            };
            originalDiv.appendChild(debugBtn);
        }

        const textContainer = document.createElement('div');
        textContainer.style.flex = '1';

        // Phrasal Verb Mapping
        const indexToPv = new Map();

        if (sentence.phrasal_verbs) {
            sentence.phrasal_verbs.forEach(pv => {
                const targetWords = (pv.text || '').toLowerCase().split(/\s+/).filter(w => w && w !== '...' && w !== '..');
                pv.correctedIndices = [];

                pv.indices.forEach((suggestion, i) => {
                    const targetWord = targetWords[i];
                    if (!targetWord) {
                        indexToPv.set(suggestion, pv);
                        pv.correctedIndices.push(suggestion);
                        return;
                    }

                    const checkMatch = (idx) => {
                        const seg = sentence.segments[idx];
                        if (!seg) return false;
                        const word = (Array.isArray(seg) ? seg[0] : (seg.word || seg.w || '')).toLowerCase();

                        // Stricter matching:
                        // 1. If either word is very short (<=2 chars), require exact match to avoid collisions like 'a' in 'back'
                        if (word.length <= 2 || targetWord.length <= 2) {
                            return word === targetWord;
                        }
                        // 2. Otherwise allow prefix matching (e.g. 'swimming' vs 'swim')
                        return word.startsWith(targetWord) || targetWord.startsWith(word);
                    };

                    if (checkMatch(suggestion)) {
                        indexToPv.set(suggestion, pv);
                        pv.correctedIndices.push(suggestion);
                    } else {
                        let bestIdx = -1;
                        for (let offset = 1; offset <= 10; offset++) {
                            if (checkMatch(suggestion + offset)) { bestIdx = suggestion + offset; break; }
                            if (suggestion - offset >= 0 && checkMatch(suggestion - offset)) { bestIdx = suggestion - offset; break; }
                        }
                        const finalIdx = bestIdx !== -1 ? bestIdx : suggestion;
                        indexToPv.set(finalIdx, pv);
                        pv.correctedIndices.push(finalIdx);
                    }
                });
            });
        }

        if (sentence.segments && Array.isArray(sentence.segments) && sentence.segments.length > 0) {
            // Expert Spacing Definitions
            const STICKY_PRE = ['(', '[', '{', '“', '‘'];
            const STICKY_POST = ['.', ',', '!', '?', ':', ';', ')', ']', '}', '”', '’', "'", '’'];
            // Note: Added ' and ’ to STICKY_POST to handle cases where AI splits possessives (e.g., Earth | ’s)

            sentence.segments.forEach((seg, segIdx) => {
                const [word, pos, lemma] = Array.isArray(seg) ? seg : [seg.word || seg.w, seg.pos || seg.p, seg.lemma || seg.l];

                const bubble = document.createElement('span');
                bubble.textContent = word || '';
                bubble.className = styles.bubble || 'bubble';
                bubble.dataset.segIdx = segIdx;

                // Check if this segment is part of a phrasal verb (using the remapped index)
                const linkedPv = indexToPv.get(segIdx);

                // It is interactive if:
                // 1. It is NOT a restricted POS (STOP, NUM, PUNCT)
                // 2. OR it is part of a known Phrasal Verb (force interactivity for particles/prepositions)
                const isInteractive = linkedPv || !['STOP', 'NUM', 'PUNCT'].includes(pos);

                if (isInteractive) {
                    bubble.classList.add(styles.interactive || 'interactive');
                    if (lemma) bubble.dataset.lemma = lemma.toLowerCase();

                    if (savedSet.has(lemma?.toLowerCase())) {
                        bubble.classList.add(styles.savedBubble || 'savedBubble');
                    }

                    if (linkedPv) {
                        bubble.classList.add(styles.phrasalMember || 'phrasalMember');
                        bubble.title = `${t('deep.phrasalVerb') || 'Phrasal Verb'}: ${linkedPv.lemma}`;
                    }

                    // Hover effects
                    bubble.onmouseenter = () => {
                        const pv = indexToPv.get(segIdx);
                        if (pv) {
                            block.querySelectorAll(`.${styles.bubble}, .${styles.phrasalSpace}`).forEach(b => {
                                if (b.dataset.pvId === pv.lemma) {
                                    b.classList.add(styles.linkedHover || 'linkedHover');
                                }
                            });
                        }
                    };
                    bubble.onmouseleave = () => {
                        block.querySelectorAll(`.${styles.linkedHover}`).forEach(b => b.classList.remove(styles.linkedHover || 'linkedHover'));
                    };

                    bubble.onclick = (e) => {
                        e.stopPropagation();
                        const pv = indexToPv.get(segIdx);
                        let finalSeg = seg;

                        block.querySelectorAll(`.${styles.linkedHighlight}`).forEach(b => b.classList.remove(styles.linkedHighlight || 'linkedHighlight'));
                        if (pv) {
                            block.querySelectorAll(`.${styles.bubble}`).forEach(b => {
                                const targetIdx = parseInt(b.dataset.segIdx);
                                if (pv.correctedIndices.includes(targetIdx)) {
                                    b.classList.add(styles.linkedHighlight || 'linkedHighlight');
                                }
                            });
                            finalSeg = [pv.text, 'VERB', pv.lemma];
                        }
                        onBubbleClick(bubble, finalSeg, sentence.original_text);
                    };
                }
                textContainer.appendChild(bubble);

                // --- Smart Spacing Algorithm ---
                if (segIdx < sentence.segments.length - 1) {
                    const nextSeg = sentence.segments[segIdx + 1];
                    const nextWord = Array.isArray(nextSeg) ? nextSeg[0] : (nextSeg.word || nextSeg.w || '');

                    // Determine if we should skip the space
                    const isStickyPre = STICKY_PRE.includes(word);
                    const isStickyPost = STICKY_POST.includes(nextWord);

                    if (!isStickyPre && !isStickyPost) {
                        const spaceSpan = document.createElement('span');
                        spaceSpan.textContent = ' ';

                        // Bridge: If current and next are both in the SAME Phrasal Verb, underline the space too
                        const nextLinkedPv = indexToPv.get(segIdx + 1);
                        if (linkedPv && nextLinkedPv && linkedPv.lemma === nextLinkedPv.lemma) {
                            spaceSpan.className = styles.phrasalSpace || 'phrasalSpace';
                            spaceSpan.dataset.pvId = linkedPv.lemma; // For hover linking
                            bubble.dataset.pvId = linkedPv.lemma; // Also tag the bubble
                        }

                        textContainer.appendChild(spaceSpan);
                    }
                }
            });
        } else {
            textContainer.textContent = sentence.original_text;
        }

        originalDiv.appendChild(textContainer);
        block.appendChild(originalDiv);

        // --- 2. Translation & Explanation Rows ---
        this._addObscurableRow(block, sentence.translation, styles.translationRow, showTranslations);
        if (sentence.explanation) {
            this._addObscurableRow(block, sentence.explanation, styles.explanationRow, showTranslations, true);
        }

        return block;
    }

    static _addObscurableRow(block, text, rowClass, isVisible, isLightbulb = false) {
        const row = document.createElement('div');
        row.className = `${rowClass || ''} ${styles.controlRow || 'controlRow'}`;
        row.style.marginTop = '4px';

        const toggleBtn = document.createElement('button');
        toggleBtn.className = `${styles.controlBtn || 'controlBtn'} ${styles.transBtn || 'transBtn'}`;
        toggleBtn.innerHTML = isVisible ? '<i class="ri-eye-line"></i>' : '<i class="ri-eye-off-line"></i>';

        const textEl = document.createElement('span');
        textEl.className = 'js-obscurable-text';
        textEl.style.flex = '1';
        if (isLightbulb) {
            textEl.style.color = '#795548';
            textEl.innerHTML = `<i class="ri-lightbulb-line" style="margin-right:4px;"></i>${text}`;
        } else {
            textEl.textContent = text;
        }

        if (!isVisible) textEl.classList.add(styles.obscured || 'obscured');

        const toggle = (e) => {
            e.stopPropagation();
            const obscured = textEl.classList.toggle(styles.obscured || 'obscured');
            toggleBtn.innerHTML = obscured ? '<i class="ri-eye-off-line"></i>' : '<i class="ri-eye-line"></i>';
        };

        toggleBtn.onclick = toggle;
        // Removed textEl.onclick = toggle; to allow clicking text to bubble up for block selection.

        row.appendChild(toggleBtn);
        row.appendChild(textEl);
        block.appendChild(row);
    }
}

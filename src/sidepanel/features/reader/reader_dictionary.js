import { dictionaryService } from '../../../services/dictionary_service.js';
import { vocabService } from '../../../services/vocab_service.js';
import { Toast } from '../../components/toast.js';
import { showDeepDiveModal } from '../../components/deep_dive_modal.js';
import styles from './reader.module.css';
import { t } from '../../../locales/index.js';
import { analysisQueue } from '../../../services/analysis_queue_manager.js';

export class ReaderDictionary {
    constructor(container) {
        this.container = container;
        this.popover = null;
        this.activeBubble = null;
    }

    close() {
        if (this.popover) {
            this.popover.remove();
            this.popover = null;
        }
        if (this.activeBubble) {
            this.activeBubble.classList.remove(styles.active || 'active');
            this.activeBubble = null;
        }
    }

    async handleBubbleClick(element, segment, contextText, onPlayAudio, onStatusChange) {
        // Close existing
        this.close();

        // Highlight new
        this.activeBubble = element;
        element.classList.add(styles.active || 'active');

        const [word, pos, lemma] = segment;

        // Analysis Tray integration (Optional: show 'pending' if not analyzed)
        // We no longer auto-push to queue here per user request.

        // Show Loading State (Dictionary Popup)
        this.showPopover({
            word, lemma, pos,
            phonetic: '...', meaning: t('dict.loading'), level: ''
        }, onPlayAudio, contextText, onStatusChange);

        try {
            // Fetch Data (Fast Path)
            const def = await dictionaryService.lookup(lemma, contextText);
            this.currentDef = def; // Cache for Add button

            // Update if still open and matching
            if (this.popover && this.activeBubble === element) {
                this.updatePopover({
                    word, lemma, pos,
                    phonetic: def.p || '',
                    meaning: def.m || t('dict.noDef'),
                    level: def.l
                }, onPlayAudio, contextText, onStatusChange);
            }
        } catch (e) {
            console.error("Dictionary Error:", e);
            Toast.error(t('dict.error'));
            if (this.popover) {
                this.updatePopover({
                    word, lemma, pos,
                    phonetic: '', meaning: t('dict.error'), level: ''
                }, onPlayAudio, contextText, onStatusChange);
            }
        }
    }

    showPopover(data, onPlayAudio, contextText, onStatusChange) {
        if (this.popover) this.popover.remove();

        const popover = document.createElement('div');
        popover.className = styles.popover || 'popover';

        // Render Content
        this.renderContent(popover, data, onPlayAudio, contextText, onStatusChange);

        this.container.appendChild(popover);
        this.popover = popover;
        popover.onclick = (e) => e.stopPropagation();
    }

    updatePopover(data, onPlayAudio, contextText, onStatusChange) {
        if (!this.popover) return;
        this.popover.innerHTML = ''; // Clear
        this.renderContent(this.popover, data, onPlayAudio, contextText, onStatusChange);
    }

    renderContent(popover, data, onPlayAudio, contextText, onStatusChange) {
        const pHeader = styles.popoverHeader || 'popoverHeader';
        const pWord = styles.popoverWord || 'popoverWord';
        const pPhonetic = styles.popoverPhonetic || 'popoverPhonetic';
        const pMeaning = styles.popoverMeaning || 'popoverMeaning';
        const pActions = styles.popoverActions || 'popoverActions';
        const btnClass = styles.iconBtn || 'iconBtn';
        const actionBtn = styles.actionBtn || 'actionBtn';
        const addBtnClass = styles.addBtn || 'addBtn';

        const closeBtnClass = styles.closeBtn || 'closeBtn';
        const savedBtnClass = styles.savedBtn || 'savedBtn';

        popover.innerHTML = `
            <div class="${pHeader}">
                <div style="display:flex; align-items:center;">
                    <span class="${pWord}">${data.word}</span>
                    <button class="${btnClass}" data-role="word-tts" title="${t('dict.pronounce')}" style="font-size:1.1em; margin-left:8px; color:#7c4dff;"><i class="ri-volume-up-line"></i></button>
                    <span class="${pPhonetic}">${data.phonetic ? `[${data.phonetic}]` : ''}</span>
                    ${data.level ? `<span style="font-size:0.75em; color:#64748b; background:#f1f5f9; padding:2px 6px; border-radius:4px; margin-left:8px; font-weight:600;">${data.level}</span>` : ''}
                </div>
                <div style="display:flex; align-items:center;">
                    <div style="font-style:italic; color:#94a3b8; font-size:0.85em; margin-right:12px;">${data.pos}</div>
                    <button class="${closeBtnClass}" data-role="close-popover" title="${t('common.close')}"><i class="ri-close-line"></i></button>
                </div>
            </div>
            <div class="${pMeaning}">
                ${data.meaning}
            </div>
            <div class="${pActions}">
                 <button class="${actionBtn} ${addBtnClass}" data-role="add-vocab">${t('dict.add')}</button>
                 <button class="${actionBtn} ${savedBtnClass}" data-role="deep-dive" style="margin-left:8px; display:flex; align-items:center; gap:4px; min-width:auto; padding:8px 16px;" title="${t('dict.deepDive')}"><i class="ri-search-line"></i> <span>${t('dict.expand') || '展开'}</span></button>
            </div>
        `;

        // Bind Events
        const closeBtn = popover.querySelector('[data-role="close-popover"]');
        if (closeBtn) closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.close();
        };

        const wordTtsBtn = popover.querySelector('[data-role="word-tts"]');
        if (wordTtsBtn && onPlayAudio) wordTtsBtn.onclick = () => onPlayAudio(data.word);

        const addBtn = popover.querySelector('[data-role="add-vocab"]');
        if (addBtn) {
            // Initial State
            const checkStatus = async () => {
                const entry = await vocabService.getEntry(data.lemma);
                const isSaved = !!entry;
                const isMastered = entry && entry.stage === 'mastered';
                updateBtnState(isSaved, isMastered);
            };
            checkStatus();

            const updateBtnState = (isSaved, isMastered) => {
                // Clear old classes
                addBtn.classList.remove(savedBtnClass, addBtnClass, 'masteredBtn');

                if (isMastered) {
                    addBtn.textContent = t('dict.mastered');
                    addBtn.classList.add(savedBtnClass);
                    addBtn.style.background = '#16a34a'; // Green override
                    addBtn.title = t('dict.masteredHint');
                } else if (isSaved) {
                    addBtn.textContent = t('dict.saved');
                    addBtn.classList.add(savedBtnClass);
                    addBtn.title = t('dict.savedHint');
                    addBtn.style.background = ''; // Reset
                } else {
                    addBtn.textContent = t('dict.add');
                    addBtn.classList.add(addBtnClass);
                    addBtn.title = t('dict.addHint');
                    addBtn.style.background = ''; // Reset
                }
            };

            addBtn.onclick = async () => {
                const entry = await vocabService.getEntry(data.lemma);

                if (entry) {
                    await vocabService.remove(data.lemma);
                    updateBtnState(false, false);
                    if (onStatusChange) onStatusChange(false);
                } else {
                    addBtn.textContent = t('dict.saving');
                    try {
                        await vocabService.add({
                            word: data.word,
                            lemma: data.lemma,
                            pos: data.pos,
                            meaning: data.meaning,
                            phonetic: data.phonetic,
                            context: contextText.substring(0, 300),
                            level: data.level,
                            collocations: this.currentDef?.collocations || []
                        });
                        updateBtnState(true, false);
                        if (onStatusChange) onStatusChange(true);
                    } catch (err) {
                        console.error('Add failed', err);
                        Toast.error(t('dict.saveFailed'));
                        addBtn.textContent = t('dict.add');
                    };
                }

            };
        }

        // Deep Dive Logic (On-demand)
        const deepDiveBtn = popover.querySelector('[data-role="deep-dive"]');
        if (deepDiveBtn) {
            deepDiveBtn.onclick = async () => {
                const lemma = data.lemma.toLowerCase();

                // Always call push to notify AnalysisTray (via subscription)
                analysisQueue.push(data.word, data.lemma, contextText);

                const entry = await vocabService.getEntry(lemma);
                const deepData = (entry && entry.deepData) ? entry.deepData : analysisQueue.getCache(lemma);

                if (deepData) {
                    showDeepDiveModal({ word: data.word }, deepData);
                } else {
                    Toast.info(t('vocab.deepDive.queued') || '已加入深度解析队列');
                    this.close();
                }
            };
        }
    }
}

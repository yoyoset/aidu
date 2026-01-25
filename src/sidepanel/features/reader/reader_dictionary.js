import { dictionaryService } from '../../../services/dictionary_service.js';
import { vocabService } from '../../../services/vocab_service.js';
import { Toast } from '../../components/toast.js';
import { showDeepDiveModal } from '../../components/deep_dive_modal.js';
import styles from './reader.module.css';
import { t } from '../../../locales/index.js';

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

        // Show Loading State
        this.showPopover({
            word, lemma, pos,
            phonetic: '...', meaning: t('dict.loading'), level: ''
        }, onPlayAudio, contextText, onStatusChange);

        try {
            // Fetch Data
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
                    <button class="${btnClass}" data-role="word-tts" title="${t('dict.pronounce')}" style="font-size:1em; margin-left:8px;">🔊</button>
                    <span class="${pPhonetic}">${data.phonetic ? `[${data.phonetic}]` : ''}</span>
                    ${data.level ? `<span style="font-size:0.8em; color:#999; border:1px solid #ddd; padding:0 4px; border-radius:4px; margin-left:4px;">${data.level}</span>` : ''}
                </div>
                <div style="display:flex; align-items:center;">
                    <div style="font-style:italic; color:#999; font-size:0.9em; margin-right:8px;">${data.pos}</div>
                    <button class="${closeBtnClass}" data-role="close-popover" title="${t('common.close')}">✕</button>
                </div>
            </div>
            <div class="${pMeaning}">
                ${data.meaning}
            </div>
            <div class="${pActions}">
                 <button class="${actionBtn} ${addBtnClass}" data-role="add-vocab">${t('dict.add')}</button>
                 <button class="${actionBtn}" data-role="deep-dive" style="margin-left:8px; background:transparent; border:1px solid #ddd; color:#666;" title="${t('dict.deepDive')}">🔍</button>
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

        // Deep Dive Logic
        const deepDiveBtn = popover.querySelector('[data-role="deep-dive"]');
        if (deepDiveBtn) {
            deepDiveBtn.onclick = async () => {
                Toast.info(t('vocab.deepDive.generating'));
                deepDiveBtn.disabled = true;
                try {
                    const entry = await vocabService.getEntry(data.lemma);
                    let deepData = null;

                    if (entry && entry.deepData) {
                        deepData = entry.deepData;
                    } else {
                        deepData = await dictionaryService.fetchTier2(data.lemma, contextText);
                        if (entry) {
                            await vocabService.updateEntry(data.lemma, { deepData });
                        }
                    }

                    showDeepDiveModal({ word: data.word }, deepData);
                } catch (e) {
                    console.error('Deep dive failed', e);
                    Toast.error(t('vocab.deepDive.failed'));
                } finally {
                    deepDiveBtn.disabled = false;
                }
            };
        }
    }
}

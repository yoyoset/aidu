import { dictionaryService } from '../../../services/dictionary_service.js';
import { vocabService } from '../../../services/vocab_service.js';
import styles from './reader.module.css';

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
            phonetic: '...', meaning: 'Loading...', level: ''
        }, onPlayAudio, contextText, onStatusChange);

        try {
            // Fetch Data
            const def = await dictionaryService.lookup(lemma, contextText);

            // Update if still open and matching
            if (this.popover && this.activeBubble === element) {
                this.updatePopover({
                    word, lemma, pos,
                    phonetic: def.p || '',
                    meaning: def.m || 'No definition found.',
                    level: def.l
                }, onPlayAudio, contextText, onStatusChange);
            }
        } catch (e) {
            console.error("Dictionary Error:", e);
            if (this.popover) {
                this.updatePopover({
                    word, lemma, pos,
                    phonetic: '', meaning: 'Error loading definition.', level: ''
                }, onPlayAudio, contextText, onStatusChange);
            }
        }
    }

    showPopover(data, onPlayAudio, contextText) {
        if (this.popover) this.popover.remove();

        const popover = document.createElement('div');
        popover.className = styles.popover || 'popover';

        // Render Content
        this.renderContent(popover, data, onPlayAudio, contextText);

        this.container.appendChild(popover);
        this.popover = popover;
        popover.onclick = (e) => e.stopPropagation();
    }

    updatePopover(data, onPlayAudio, contextText) {
        if (!this.popover) return;
        this.popover.innerHTML = ''; // Clear
        this.renderContent(this.popover, data, onPlayAudio, contextText);
    }

    renderContent(popover, data, onPlayAudio, contextText) {
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
                    <button class="${btnClass}" data-role="word-tts" title="Pronounce" style="font-size:1em; margin-left:8px;">🔊</button>
                    <span class="${pPhonetic}">${data.phonetic ? `[${data.phonetic}]` : ''}</span>
                    ${data.level ? `<span style="font-size:0.8em; color:#999; border:1px solid #ddd; padding:0 4px; border-radius:4px; margin-left:4px;">${data.level}</span>` : ''}
                </div>
                <div style="display:flex; align-items:center;">
                    <div style="font-style:italic; color:#999; font-size:0.9em; margin-right:8px;">${data.pos}</div>
                    <button class="${closeBtnClass}" data-role="close-popover" title="Close">✕</button>
                </div>
            </div>
            <div class="${pMeaning}">
                ${data.meaning}
            </div>
            <div class="${pActions}">
                 <button class="${actionBtn} ${addBtnClass}" data-role="add-vocab">+ Add to Vocab</button>
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
            const updateBtnState = (isSaved) => {
                if (isSaved) {
                    addBtn.textContent = '✓ Saved (Undo)';
                    addBtn.classList.add(savedBtnClass);
                    addBtn.classList.remove(addBtnClass);
                    addBtn.title = "Click to remove from vocabulary";
                } else {
                    addBtn.textContent = '+ Add to Vocab';
                    addBtn.classList.remove(savedBtnClass);
                    addBtn.classList.add(addBtnClass);
                    addBtn.title = "Add to vocabulary";
                }
            };

            // Initial State
            vocabService.isSaved(data.lemma).then(saved => updateBtnState(saved));

            addBtn.onclick = async () => {
                const isSaved = addBtn.classList.contains(savedBtnClass);

                if (isSaved) {
                    // Remove (Undo)
                    await vocabService.remove(data.lemma);
                    updateBtnState(false);
                    if (onStatusChange) onStatusChange(false);
                } else {
                    // Add
                    addBtn.textContent = 'Saving...';
                    await vocabService.add({
                        word: data.word, lemma: data.lemma, pos: data.pos,
                        meaning: data.meaning, phonetic: data.phonetic,
                        context: contextText.substring(0, 300) // Increased from 50 to capture full sentence
                    });
                    updateBtnState(true);
                    if (onStatusChange) onStatusChange(true);
                }
            };
        }
    }
}

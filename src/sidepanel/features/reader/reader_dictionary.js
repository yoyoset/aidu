import { dictionaryService } from '../../../services/dictionary_service.js';
import { vocabService } from '../../../services/vocab_service.js';
import { notificationService } from '../../../utils/notification_service.js';
import { showDeepDiveModal } from '../../components/deep_dive_modal.js';
import popoverStyles from './reader_popover.module.css';
import layoutStyles from './reader_layout.module.css';
import { t } from '../../../locales/index.js';
import { analysisQueue } from '../../../services/analysis_queue_manager.js';

const styles = { ...popoverStyles, ...layoutStyles };

export class ReaderDictionary {
    constructor(container) {
        this.container = container;
        this.popover = null;
        this.activeBubble = null;
    }

    close() {
        if (this.activeBubble) {
            this.activeBubble.classList.remove(styles.active || 'active');
            this.activeBubble = null;
        }

        // Capture refs locally and clear instance state immediately, so a new
        // showPopover() can't collide with this pending teardown.
        const scrim = this.scrim;
        const popover = this.popover;
        this.scrim = null;
        this.popover = null;

        const showCls = styles.show || 'show';
        if (scrim) scrim.classList.remove(showCls);
        if (popover) popover.classList.remove(showCls);

        // Remove BOTH from the DOM after the exit animation (.4s). Using the
        // local refs guarantees the full-screen scrim is always detached —
        // previously this.scrim was nulled before the timeout, so the scrim
        // element leaked and kept capturing clicks/scroll (page froze).
        setTimeout(() => {
            if (popover && popover.parentNode) popover.remove();
            if (scrim && scrim.parentNode) scrim.remove();
        }, 400);
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
            const def = await dictionaryService.lookup(lemma, pos, contextText);
            this.currentDef = def; // Cache for Add button

            // Update if still open and matching
            if (this.popover && this.activeBubble === element) {
                this.updatePopover({
                    word, lemma, pos,
                    phonetic: def.p || '',
                    meaning: def.m || t('dict.noDef'),
                    level: def.l,
                    collocations: def.collocations
                }, onPlayAudio, contextText, onStatusChange);
            }
        } catch (e) {
            console.error("Dictionary Error:", e);
            notificationService.error(t('dict.error'));
            if (this.popover) {
                this.updatePopover({
                    word, lemma, pos,
                    phonetic: '', meaning: t('dict.error'), level: ''
                }, onPlayAudio, contextText, onStatusChange);
            }
        }
    }

    showPopover(data, onPlayAudio, contextText, onStatusChange) {
        if (this.popover) this.close();

        // Create scrim (overlay)
        const scrim = document.createElement('div');
        scrim.className = styles['sheet-scrim'] || 'sheet-scrim';
        scrim.onclick = () => this.close();
        this.container.appendChild(scrim);
        this.scrim = scrim;

        // Create sheet container
        const sheet = document.createElement('div');
        sheet.className = styles.popover || 'popover';

        // Create grip handle
        const grip = document.createElement('div');
        grip.className = styles['sheet-grip'] || 'sheet-grip';
        sheet.appendChild(grip);

        // Create scrollable content area
        const scroll = document.createElement('div');
        scroll.className = styles['sheet-scroll'] || 'sheet-scroll';
        sheet.appendChild(scroll);

        // Render content into scroll area
        this.renderContent(scroll, data, onPlayAudio, contextText, onStatusChange);

        this.container.appendChild(sheet);
        this.popover = sheet;
        sheet.onclick = (e) => e.stopPropagation();

        // Trigger enter animation (use setTimeout, NOT requestAnimationFrame)
        setTimeout(() => {
            scrim.classList.add(styles.show || 'show');
            sheet.classList.add(styles.show || 'show');
        }, 30);
    }

    updatePopover(data, onPlayAudio, contextText, onStatusChange) {
        if (!this.popover) return;

        // Clear scroll container (preserve grip)
        const scroll = this.popover.querySelector(`.${styles['sheet-scroll']}`) || this.popover.querySelector('.sheet-scroll');
        if (scroll) {
            scroll.innerHTML = '';
            this.renderContent(scroll, data, onPlayAudio, contextText, onStatusChange);
        }
    }

    renderContent(container, data, onPlayAudio, contextText, onStatusChange) {
        // Clear container
        container.innerHTML = '';

        // Dict head: word + phonetic + POS + speak button
        const dictHead = document.createElement('div');
        dictHead.className = styles['dict-head'] || 'dict-head';

        const dictWord = document.createElement('span');
        dictWord.className = styles['dict-word'] || 'dict-word';
        dictWord.textContent = (data.lemma || data.word).toLowerCase();
        dictHead.appendChild(dictWord);

        if (data.phonetic) {
            const dictPhon = document.createElement('span');
            dictPhon.className = styles['dict-phon'] || 'dict-phon';
            dictPhon.textContent = `[${data.phonetic}]`;
            dictHead.appendChild(dictPhon);
        }

        const dictPos = document.createElement('span');
        dictPos.className = styles['dict-pos'] || 'dict-pos';
        dictPos.textContent = data.pos || '';
        dictHead.appendChild(dictPos);

        const dictSpeak = document.createElement('button');
        dictSpeak.className = styles['dict-speak'] || 'dict-speak';
        dictSpeak.innerHTML = '<i class="ri-volume-up-line"></i>';
        dictSpeak.title = t('dict.pronounce');
        if (onPlayAudio) dictSpeak.onclick = () => onPlayAudio(data.word);
        dictHead.appendChild(dictSpeak);

        container.appendChild(dictHead);

        // Meaning
        const dictMeaning = document.createElement('div');
        dictMeaning.className = styles['dict-meaning'] || 'dict-meaning';
        dictMeaning.textContent = data.meaning || t('dict.noDef');
        container.appendChild(dictMeaning);

        // Context with highlight
        if (contextText) {
            const dictContext = document.createElement('div');
            dictContext.className = styles['dict-context'] || 'dict-context';
            // Highlight the lemma in context with <b> tags (CSS handles amber-wash + underline)
            const highlighted = contextText.replace(
                new RegExp(`\\b${data.lemma}\\b`, 'gi'),
                `<b>${data.lemma}</b>`
            );
            dictContext.innerHTML = highlighted;
            container.appendChild(dictContext);
        }

        // Actions
        const dictActions = document.createElement('div');
        dictActions.className = styles['dict-actions'] || 'dict-actions';

        const addBtn = document.createElement('button');
        addBtn.className = styles.addBtn || 'addBtn';
        addBtn.textContent = t('dict.add');
        addBtn.dataset.role = 'add-vocab';

        const deepDiveBtn = document.createElement('button');
        deepDiveBtn.className = styles.addBtn || 'addBtn';
        deepDiveBtn.textContent = t('dict.expand') || '展开';
        deepDiveBtn.dataset.role = 'deep-dive';

        dictActions.appendChild(addBtn);
        dictActions.appendChild(deepDiveBtn);
        container.appendChild(dictActions);

        // ===== EVENT BINDING (unchanged logic) =====
        const addBtnClass = styles.addBtn || 'addBtn';
        const savedBtnClass = styles.savedBtn || 'savedBtn';

        // Add to vocab button
        const checkStatus = async () => {
            const entry = await vocabService.getEntry(data.lemma);
            const isSaved = !!entry;
            const isMastered = entry && entry.stage === 'mastered';
            updateBtnState(isSaved, isMastered);
        };
        checkStatus();

        const updateBtnState = (isSaved, isMastered) => {
            addBtn.classList.remove(savedBtnClass, addBtnClass, 'masteredBtn');
            if (isMastered) {
                addBtn.textContent = t('dict.mastered');
                addBtn.classList.add(savedBtnClass);
                addBtn.style.background = 'var(--green)';
                addBtn.title = t('dict.masteredHint');
            } else if (isSaved) {
                addBtn.textContent = t('dict.saved');
                addBtn.classList.add(savedBtnClass);
                addBtn.title = t('dict.savedHint');
                addBtn.style.background = '';
            } else {
                addBtn.textContent = t('dict.add');
                addBtn.classList.add(addBtnClass);
                addBtn.title = t('dict.addHint');
                addBtn.style.background = '';
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
                    notificationService.error(t('dict.saveFailed'));
                    addBtn.textContent = t('dict.add');
                }
            }
        };

        // Deep Dive button
        deepDiveBtn.onclick = async () => {
            const lemma = data.lemma.toLowerCase();
            analysisQueue.push(data.word, data.lemma, contextText);
            const entry = await vocabService.getEntry(lemma);
            const deepData = (entry && entry.deepData) ? entry.deepData : analysisQueue.getCache(lemma);
            if (deepData) {
                showDeepDiveModal({ word: data.word }, deepData);
            } else {
                notificationService.info(t('vocab.deepDive.queued') || '已加入深度解析队列');
                this.close();
            }
        };
    }
}

import { Component } from '../../components/component.js';
import styles from './reader_layout.module.css';
import { ReaderAudio } from './reader_audio.js';
import { ReaderDictionary } from './reader_dictionary.js';
import { ReaderState } from './reader_state.js';
import { vocabService } from '../../../services/vocab_service.js';
import { t } from '../../../locales/index.js';
import { analysisQueue } from '../../../services/analysis_queue_manager.js';
import { AnalysisTray } from './analysis_tray.js';
import { ThemeModal } from '../settings/theme_modal.js';
import { logger } from '../../../utils/logger.js';
import { notificationService } from '../../../utils/notification_service.js';
import { profileManager } from '../../../core/profile_manager.js';

// Sections & Renderer
import { ReaderHeader } from './sections/reader_header.js';
import { ReaderTypography } from './sections/reader_typography.js';
import { ReaderRenderer } from './components/reader_renderer.js';
import { BookmarkTray } from './bookmark_tray.js';

export class ReaderView extends Component {
    constructor(element, callbacks) {
        super(element);
        this.callbacks = callbacks || {};

        // Sub-modules
        this.audio = new ReaderAudio();
        this.state = new ReaderState();
        this.dictionary = null; // Init on render
        this.header = new ReaderHeader(this);
        this.typography = new ReaderTypography(this);

        // Renderer
        this.renderer = new ReaderRenderer(element);

        // UI Refs
        this.timerEl = null;

        // Session & State
        this.draft = null;
        this.sentences = [];
        this.currentHighlightIndex = null;
        this.showTranslations = false;
        this.locateTimeout = null;
        this.fontSize = 100;
        this.lineHeight = 2.0;
    }

    async show(draft) {
        try {


            // Lifecycle Governance: Cleanup previous state if any
            this.destroy();

            this.element.classList.remove('hidden');
            this.element.style.display = 'block';
            this.draft = draft || { data: { sentences: [] }, title: 'Error' };

            // Initialize State (Domain: Cleaning & Time Loading)
            const session = this.state.init(this.draft);
            this.settings = await profileManager.load();
            this.sentences = session.sentences;

            if (this.sentences.length < (this.draft.data?.sentences || []).length) {
                logger.warn(`ReaderView: Filtered malformed sentences.`, { draftId: draft?.id });
            }

            // Initialize Timer (Domain delegation)
            this.startTimer();

            // Apply Custom Appearance (Persistence Fix)
            new ThemeModal().initTheme();

            this.render();



        } catch (e) {
            console.error("ReaderView Show Error:", e);
            this.element.innerHTML = `<div style="padding:20px; color:red">${t('reader.error', { error: e.message })}</div>`;
        }
    }

    destroy() {
        // 1. Stop Intervals
        this.stopTimer();
        if (this.audio) this.audio.cancel();

        // 2. Kill Subscriptions
        if (this.queueUnsubscribe) {
            this.queueUnsubscribe();
            this.queueUnsubscribe = null;
        }

        // 3. Destroy Sub-components
        if (this.tray) {
            this.tray.destroy();
            this.tray = null;
        }
        if (this.bookmarkTray) {
            this.bookmarkTray.destroy();
            this.bookmarkTray = null;
        }
        if (this.dictionary) {
            this.dictionary.close();
            this.dictionary = null;
        }

        // 4. Remove Global Listeners
        if (this.isListening && this.storageHandler) {
            chrome.storage.onChanged.removeListener(this.storageHandler);
            this.isListening = false;
        }

        // 5. Reset State
        if (this.locateTimeout) {
            clearTimeout(this.locateTimeout);
            this.locateTimeout = null;
        }
        this.currentHighlightIndex = null;
        this.sentences = [];
        analysisQueue.clearSession(); // Prevent cache growth between articles
    }

    startTimer() {
        this.state.startTimer((newTime) => {
            this.updateTimerUI(newTime);
        });
    }

    updateTimerUI(currentTime) {
        if (!this.timerEl) return;
        const time = currentTime !== undefined ? currentTime : this.state.readingTime;
        const formatted = ReaderState.formatTime(time);
        this.timerEl.innerHTML = `<i class="ri-time-line" style="margin-right:4px;"></i>${formatted}`;
    }

    stopTimer() {
        this.state.stopTimer();
    }

    async render() {
        this.element.innerHTML = '';
        this.dictionary = new ReaderDictionary(this.element); // Pass container for popovers

        // Analysis Tray
        this.tray = new AnalysisTray(this.element, {
            onLocate: (lemma) => this.locateWordInText(lemma)
        });

        // Bookmark Tray
        this.bookmarkTray = new BookmarkTray(this.element, {
            onLocate: (idx) => {
                this.highlightSentence(idx);
                const block = this.element.querySelector(`div[data-index="${idx}"]`);
                if (block) block.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });

        // Listen for analysis completion & Store unsubscribe
        this.queueUnsubscribe = analysisQueue.subscribe(({ lemma, status }) => {
            if (status === 'ready') {
                this.renderer.refreshWordStyling(lemma);
                // AnalysisTray will update itself via its own subscription
            }
        });

        // Auto-Refresh Listener
        this.startStorageListener();

        // Preload saved words and analysis status
        let vocabData = {};
        try {
            vocabData = await vocabService.getAll();
        } catch (e) { console.error("Failed to load vocab data", e); }
        const savedSet = new Set(Object.keys(vocabData));

        // Use Renderer

        this.renderer.render(
            { // State
                draft: this.draft,
                sentences: this.sentences,
                showTranslations: this.showTranslations,
                savedSet: savedSet,
                fontSize: this.fontSize || 100,
                debugMode: this.settings?.debugMode
            },
            { // Components
                header: this.header,
                typography: this.typography
            },
            { // Handlers
                onPlay: (idx) => this.playSequence(idx, { continuous: false }),
                onSelect: (idx) => {
                    // Just highlight, don't play
                    this.stopPlayback(); // Stop any current playback
                    this.highlightSentence(idx);
                },
                onBookmark: async (idx) => {
                    if (!this.draft.bookmarkIndices) this.draft.bookmarkIndices = [];

                    const set = new Set(this.draft.bookmarkIndices);
                    const isRemoved = set.has(idx);

                    if (isRemoved) {
                        set.delete(idx);
                    } else {
                        set.add(idx);
                    }

                    this.draft.bookmarkIndices = Array.from(set);

                    // Persist to storage
                    chrome.runtime.sendMessage({
                        type: 'UPDATE_DRAFT',
                        payload: {
                            draftId: this.draft.id,
                            updates: {
                                bookmarkIndices: this.draft.bookmarkIndices
                            }
                        }
                    });

                    notificationService.toast(isRemoved ? t('reader.bookmarks.removed') : t('reader.bookmark.set'));

                    // Local UI Update: Truly "Lock Location" - No Re-render
                    const block = this.element.querySelector(`div[data-index="${idx}"]`);
                    if (block) {
                        const method = isRemoved ? 'remove' : 'add';
                        block.classList[method](styles.bookmarkActive || 'bookmarkActive');
                    }

                    // Refresh tray if open
                    if (this.bookmarkTray && this.bookmarkTray.isOpen) {
                        this.bookmarkTray.refresh();
                    }
                },
                onBubbleClick: (bubble, seg, txt) => {
                    this.dictionary.handleBubbleClick(
                        bubble,
                        seg,
                        txt,
                        (t) => this.audio.speak(t),
                        (isSaved) => {
                            if (isSaved) bubble.classList.add(styles.savedBubble || 'savedBubble');
                            else bubble.classList.remove(styles.savedBubble || 'savedBubble');
                        }
                    );
                }
            }
        );

        // Render Tray (Overlay)
        this.tray.render();
        this.bookmarkTray.render(this);

        // 5. Auto-scroll to first bookmark if exists
        const firstIdx = this.draft?.bookmarkIndices?.[0];
        if (this.draft && firstIdx !== undefined) {
            setTimeout(() => {
                this.highlightSentence(firstIdx);
                const block = this.element.querySelector(`div[data-index="${firstIdx}"]`);
                if (block) {
                    block.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);
        }

        // Post-render setup: Use renderer's contentArea instead of querying DOM
        const contentEl = this.renderer.contentArea;
        if (contentEl) {
            contentEl.onclick = (e) => {
                // Close dictionary if clicking background
                if (e.target === contentEl) {
                    this.dictionary.close();
                }
            };
        }

        this.updateTranslationVisibility();

        // Sync existing deep analysis results to the tray
        const uniqueLemmas = new Set();
        this.sentences.forEach(s => {
            if (s.segments) {
                s.segments.forEach(seg => {
                    const l = seg[2];
                    if (l) uniqueLemmas.add(l.toLowerCase());
                });
            }
        });

        uniqueLemmas.forEach(l => {
            const entry = vocabData[l];
            if (entry && entry.deepData) {
                analysisQueue.push(entry.word, l, '');
            }
        });
    }

    // --- Renderer Delegates ---

    updateTranslationVisibility() {
        this.renderer.updateTranslationVisibility(this.showTranslations);
    }

    refreshWordStyling(lemma) {
        this.renderer.refreshWordStyling(lemma);
    }

    async updateHighlights() {
        try {
            const savedSet = await vocabService.getSavedSet();
            this.renderer.updateHighlights(savedSet);
        } catch (e) {
            console.error("ReaderView: Failed to update highlights", e);
        }
    }

    // --- Interaction Logic ---

    toggleTTS(btn) {
        if (this.audio.isPlaying) {
            this.stopPlayback();
        } else {
            const startIdx = this.currentHighlightIndex !== null && this.currentHighlightIndex !== undefined ? this.currentHighlightIndex : 0;
            this.playSequence(startIdx, { continuous: true });
        }
    }

    stopPlayback() {
        this.audio.cancel();
        this.element.querySelectorAll('.js-play-btn').forEach(b => b.innerHTML = '<i class="ri-play-mini-line"></i>');
        const btn = this.element.querySelector('#tts-btn');
        if (btn) btn.innerHTML = '<i class="ri-volume-up-line"></i>';
        this.highlightSentence(null);
    }

    playSequence(index, options = {}) {
        const { isAuto = false, continuous = true } = options;

        if (!isAuto && this.audio.isPlaying && this.currentIndex === index) {
            this.stopPlayback();
            return;
        }

        if (index >= this.sentences.length) {
            this.stopPlayback();
            return;
        }

        const btn = this.element.querySelector('#tts-btn');
        if (btn) btn.innerHTML = '<i class="ri-stop-mini-line"></i>';

        this.currentIndex = index;

        this.element.querySelectorAll('.js-play-btn').forEach(b => b.innerHTML = '<i class="ri-play-mini-line"></i>');
        // We need access to contentArea to find specific block. 
        // Renderer exposes it. We can query on this.element
        const currentBlock = this.element.querySelector(`div[data-index="${index}"]`);
        if (currentBlock) {
            const playBtn = currentBlock.querySelector('.js-play-btn');
            if (playBtn) playBtn.innerHTML = '<i class="ri-stop-mini-line"></i>';
        }

        if (!isAuto) {
            this.highlightSentence(index);
        }

        const text = this.sentences[index].original_text;
        this.audio.cancel();

        setTimeout(() => {
            this.audio.speak(text,
                () => {
                    if (this.audio.isPlaying && continuous) {
                        this.playSequence(index + 1, { isAuto: true, continuous: true });
                    } else if (this.audio.isPlaying && !continuous) {
                        this.stopPlayback();
                    }
                },
                (e) => {
                    if (e.error !== 'interrupted' && e.error !== 'canceled') {
                        console.error("TTS Playback Error:", e);
                    }
                },
                () => {
                    if (isAuto) {
                        this.highlightSentence(index);
                    }
                }
            );
        }, 50);
    }

    highlightSentence(index) {
        this.currentHighlightIndex = index;
        this.renderer.highlightSentence(index);
    }

    locateWordInText(lemma) {
        if (this.locateTimeout) {
            clearTimeout(this.locateTimeout);
            this.locateTimeout = null;
        }

        const target = this.element.querySelector(`span[data-lemma="${lemma.toLowerCase()}"]`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add(styles.active || 'active');
            this.locateTimeout = setTimeout(() => {
                target.classList.remove(styles.active || 'active');
                this.locateTimeout = null;
            }, 2000);
        }
    }

    startStorageListener() {
        if (this.isListening) return;
        this.isListening = true;

        this.storageHandler = (changes, area) => {
            if (area === 'local') {
                const hasVocabChange = Object.keys(changes).some(k => k.startsWith('vocab_'));
                if (hasVocabChange) {
                    this.updateHighlights();
                }
            }
        };
        chrome.storage.onChanged.addListener(this.storageHandler);
    }
}

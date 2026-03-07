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
            this.destroy();
            this.element.style.display = 'block';
            this.draft = draft || { data: { sentences: [] }, title: 'Error' };

            const session = this.state.init(this.draft);
            this.settings = await profileManager.load();
            this.sentences = session.sentences;

            this.audio.init(this.sentences, {
                onHighlight: (idx) => this.highlightSentence(idx),
                onStatusChange: (status) => this.handleTTSStatusChange(status)
            });

            this.startTimer();
            new ThemeModal().initTheme();
            this.render();

        } catch (e) {
            console.error("ReaderView Show Error:", e);
            this.element.innerHTML = `<div style="padding:20px; color:red">${t('reader.error', { error: e.message })}</div>`;
        }
    }

    destroy() {
        this.stopTimer();
        if (this.audio) this.audio.stopPlayback();

        if (this.queueUnsubscribe) {
            this.queueUnsubscribe();
            this.queueUnsubscribe = null;
        }

        if (this.tray) { this.tray.destroy(); this.tray = null; }
        if (this.bookmarkTray) { this.bookmarkTray.destroy(); this.bookmarkTray = null; }
        if (this.dictionary) { this.dictionary.close(); this.dictionary = null; }

        if (this.isListening && this.storageHandler) {
            chrome.storage.onChanged.removeListener(this.storageHandler);
            this.isListening = false;
        }

        this.currentHighlightIndex = null;
        this.sentences = [];
        analysisQueue.clearSession();
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
        this.dictionary = new ReaderDictionary(this.element);
        this.tray = new AnalysisTray(this.element, {
            onLocate: (lemma) => this.renderer.locateWordInText(lemma)
        });

        this.bookmarkTray = new BookmarkTray(this.element, {
            onLocate: (idx) => {
                this.highlightSentence(idx);
                const block = this.element.querySelector(`div[data-index="${idx}"]`);
                if (block) block.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });

        this.queueUnsubscribe = analysisQueue.subscribe(({ lemma, status }) => {
            if (status === 'ready') this.renderer.refreshWordStyling(lemma);
        });

        this.startStorageListener();

        const vocabData = await vocabService.getAll().catch(() => ({}));
        const savedSet = new Set(Object.keys(vocabData));

        this.renderer.render(
            {
                draft: this.draft,
                sentences: this.sentences,
                showTranslations: this.showTranslations,
                savedSet: savedSet,
                fontSize: this.fontSize || 100,
                debugMode: this.settings?.debugMode
            },
            { header: this.header, typography: this.typography },
            {
                onPlay: (idx) => this.audio.playSequence(idx, { continuous: false }),
                onSelect: (idx) => {
                    this.audio.cancel();
                    this.highlightSentence(idx);
                },
                onBookmark: (idx) => this.handleBookmark(idx),
                onBubbleClick: (bubble, seg, txt) => {
                    this.dictionary.handleBubbleClick(bubble, seg, txt, (t) => this.audio.speak(t), (isSaved) => {
                        const method = isSaved ? 'add' : 'remove';
                        bubble.classList[method](styles.savedBubble || 'savedBubble');
                    });
                }
            }
        );

        this.tray.render();
        this.bookmarkTray.render(this);

        // Auto-scroll to first bookmark
        const firstIdx = this.draft?.bookmarkIndices?.[0];
        if (firstIdx !== undefined) {
            setTimeout(() => {
                this.highlightSentence(firstIdx);
                const block = this.element.querySelector(`div[data-index="${firstIdx}"]`);
                if (block) block.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        }

        this.renderer.updateTranslationVisibility(this.showTranslations);
        this.syncAnalysisResults(vocabData);
    }

    syncAnalysisResults(vocabData) {
        const uniqueLemmas = new Set();
        this.sentences.forEach(s => {
            s.segments?.forEach(seg => { if (seg[2]) uniqueLemmas.add(seg[2].toLowerCase()); });
        });
        uniqueLemmas.forEach(l => {
            if (vocabData[l]?.deepData) analysisQueue.push(vocabData[l].word, l, '');
        });
    }

    handleBookmark(idx) {
        const set = new Set(this.draft.bookmarkIndices || []);
        const isRemoved = set.has(idx);
        isRemoved ? set.delete(idx) : set.add(idx);
        this.draft.bookmarkIndices = Array.from(set);

        chrome.runtime.sendMessage({
            type: 'UPDATE_DRAFT',
            payload: { draftId: this.draft.id, updates: { bookmarkIndices: this.draft.bookmarkIndices } }
        });

        notificationService.toast(isRemoved ? t('reader.bookmarks.removed') : t('reader.bookmark.set'));
        const block = this.element.querySelector(`div[data-index="${idx}"]`);
        if (block) block.classList[isRemoved ? 'remove' : 'add'](styles.bookmarkActive || 'bookmarkActive');
        if (this.bookmarkTray?.isOpen) this.bookmarkTray.refresh();
    }

    handleTTSStatusChange({ isPlaying, index }) {
        const btn = this.element.querySelector('#tts-btn');
        if (btn) btn.innerHTML = isPlaying ? '<i class="ri-stop-mini-line"></i>' : '<i class="ri-volume-up-line"></i>';

        this.element.querySelectorAll('.js-play-btn').forEach(b => b.innerHTML = '<i class="ri-play-mini-line"></i>');
        if (index >= 0) {
            const block = this.element.querySelector(`div[data-index="${index}"]`);
            if (block) {
                const playBtn = block.querySelector('.js-play-btn');
                if (playBtn) playBtn.innerHTML = isPlaying ? '<i class="ri-stop-mini-line"></i>' : '<i class="ri-play-mini-line"></i>';
            }
        }
    }

    highlightSentence(index) {
        this.currentHighlightIndex = index;
        this.renderer.highlightSentence(index);
    }

    startStorageListener() {
        if (this.isListening) return;
        this.isListening = true;
        this.storageHandler = (changes, area) => {
            if (area === 'local' && Object.keys(changes).some(k => k.startsWith('vocab_'))) {
                vocabService.getSavedSet().then(set => this.renderer.updateHighlights(set));
            }
        };
        chrome.storage.onChanged.addListener(this.storageHandler);
    }
}

import { Component } from '../../components/component.js';
import styles from './reader.module.css';
import { ReaderAudio } from './reader_audio.js';
import { ReaderDictionary } from './reader_dictionary.js';
import { vocabService } from '../../../services/vocab_service.js';
import { StorageHelper, StorageKeys } from '../../../utils/storage.js';
import { t } from '../../../locales/index.js';

export class ReaderView extends Component {
    constructor(element, callbacks) {
        super(element);
        this.callbacks = callbacks || {};
        this.draft = null;
        this.fontSize = 100;
        this.showTranslations = false;

        // Sub-modules
        this.audio = new ReaderAudio();
        this.dictionary = null; // Init on render

        this.currentIndex = 0;
        this.sentences = [];

        // Timer
        this.readingTime = 0;
        this.timerInterval = null;
    }

    show(draft) {
        try {
            console.log('ReaderView: Showing draft', draft?.id);
            this.element.classList.remove('hidden');
            this.element.style.display = 'block';
            this.draft = draft || { data: { sentences: [] }, title: 'Error' };
            this.sentences = this.draft.data?.sentences || [];

            // Initialize Timer
            this.readingTime = this.draft.readingTime || 0;
            this.startTimer();

            this.render();
        } catch (e) {
            console.error("ReaderView Show Error:", e);
            this.element.innerHTML = `<div style="padding:20px; color:red">${t('reader.error', { error: e.message })}</div>`;
        }
    }

    startTimer() {
        this.stopTimer(); // Safety
        this.timerInterval = setInterval(() => {
            this.readingTime++;
            // Save every 10 seconds to avoid data loss
            if (this.readingTime % 10 === 0) {
                this.saveProgress();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            this.saveProgress(); // Final save
        }
    }

    async saveProgress() {
        if (!this.draft || !this.draft.id) return;
        try {
            // We read fresh drafts to avoid overwriting other changes (race condition mitigation)
            const drafts = await StorageHelper.get(StorageKeys.BUILDER_DRAFTS) || [];
            if (Array.isArray(drafts)) {
                const index = drafts.findIndex(d => d.id === this.draft.id);
                if (index !== -1) {
                    drafts[index].readingTime = this.readingTime;
                    drafts[index].lastReadAt = Date.now();
                    await StorageHelper.set(StorageKeys.BUILDER_DRAFTS, drafts);
                }
            }
        } catch (e) {
            console.error("Failed to save reading progress", e);
        }
    }

    async render() {
        this.element.innerHTML = '';
        this.dictionary = new ReaderDictionary(this.element); // Pass container for popovers

        // Auto-Refresh Listener
        this.startStorageListener();

        // Preload saved words for highlighting
        let savedSet = new Set();
        try {
            savedSet = await vocabService.getSavedSet();
        } catch (e) { console.error("Failed to load saved words", e); }

        const container = document.createElement('div');
        container.className = styles.readerContainer || 'readerContainer';

        // --- 1. Header ---
        this.renderHeader(container);

        // --- 2. Settings ---
        this.renderSettings(container);

        // --- 3. Content ---
        const content = document.createElement('div');
        content.className = styles.readerContent || 'readerContent';
        content.style.fontSize = `${this.fontSize}%`;
        this.contentArea = content;

        content.onclick = (e) => {
            if (e.target === content) this.dictionary.close();
        };

        if (this.sentences.length === 0) {
            content.innerHTML = `<div style="padding:20px; color:#999; text-align:center;">${t('reader.empty')}</div>`;
        } else {
            this.sentences.forEach((sentence, index) => {
                const block = this.createAtomicBlock(sentence, index, savedSet);
                content.appendChild(block);
            });
        }

        container.appendChild(content);
        this.element.appendChild(container);

        this.updateTranslationVisibility();
    }

    renderHeader(container) {
        const header = document.createElement('div');
        header.className = styles.readerHeader || 'readerHeader';

        const backBtn = document.createElement('button');
        backBtn.className = styles.iconBtn || 'iconBtn';
        backBtn.innerHTML = '←';
        backBtn.onclick = () => {
            this.audio.cancel();
            this.stopTimer(); // Stop Timer on exit
            if (this.callbacks.onExit) this.callbacks.onExit();
        };

        const title = document.createElement('div');
        title.className = styles.readerTitle || 'readerTitle';
        title.textContent = (this.draft?.title || t('reader.title')).substring(0, 20) + '...';

        const controls = document.createElement('div');
        controls.className = styles.headerControls || 'headerControls';

        // Translation Toggle
        const transBtn = document.createElement('button');
        transBtn.className = styles.iconBtn || 'iconBtn';
        transBtn.innerHTML = this.showTranslations ? '👁️' : '👁️‍🗨️';
        transBtn.title = t('reader.toggleTrans');
        transBtn.onclick = () => {
            this.showTranslations = !this.showTranslations;
            transBtn.innerHTML = this.showTranslations ? '👁️' : '👁️‍🗨️';
            this.updateTranslationVisibility();
        };

        // TTS Button
        const ttsBtn = document.createElement('button');
        ttsBtn.className = styles.iconBtn || 'iconBtn';
        ttsBtn.id = 'tts-btn';
        ttsBtn.innerHTML = '🔊';
        ttsBtn.onclick = () => this.toggleTTS(ttsBtn);

        // Settings Button
        const settingsBtn = document.createElement('button');
        settingsBtn.className = styles.iconBtn || 'iconBtn';
        settingsBtn.innerHTML = '⚙️';
        settingsBtn.onclick = () => {
            const panel = container.querySelector(`.${styles.settingsPanel || 'settingsPanel'}`);
            if (panel) panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        };

        controls.appendChild(transBtn);
        controls.appendChild(ttsBtn);
        controls.appendChild(settingsBtn);

        header.appendChild(backBtn);
        header.appendChild(title);
        header.appendChild(controls);
        container.appendChild(header);
    }


    renderSettings(container) {
        const settingsPanel = document.createElement('div');
        settingsPanel.className = styles.settingsPanel || 'settingsPanel';
        settingsPanel.style.display = 'none';

        settingsPanel.innerHTML = `
            <div class="${styles.settingGroup}"><label>${t('reader.settings.voice')}:</label><select id="tts-voice" style="max-width:120px;"><option>${t('common.loading')}</option></select></div>
            <div class="${styles.settingGroup}"><label>${t('reader.settings.speed')}:</label><select id="tts-speed"><option value="0.8">0.8x</option><option value="1.0" selected>1.0x</option><option value="1.2">1.2x</option></select></div>
            <div class="${styles.settingGroup}"><label>${t('reader.settings.size')}:</label><button id="font-dec">-</button><span id="font-val">${this.fontSize}%</span><button id="font-inc">+</button></div>
        `;

        container.appendChild(settingsPanel);

        // Bind Audio Settings
        this.audio.loadVoices(settingsPanel.querySelector('#tts-voice'));
        settingsPanel.querySelector('#tts-speed').onchange = (e) => this.audio.setRate(e.target.value);

        // Bind Font Settings
        const val = settingsPanel.querySelector('#font-val');
        settingsPanel.querySelector('#font-inc').onclick = () => {
            this.fontSize = Math.min(150, this.fontSize + 10);
            val.textContent = this.fontSize + '%';
            if (this.contentArea) this.contentArea.style.fontSize = this.fontSize + '%';
        };
        settingsPanel.querySelector('#font-dec').onclick = () => {
            this.fontSize = Math.max(80, this.fontSize - 10);
            val.textContent = this.fontSize + '%';
            if (this.contentArea) this.contentArea.style.fontSize = this.fontSize + '%';
        };
    }

    createAtomicBlock(sentence, index, savedSet) {
        const block = document.createElement('div');
        block.className = styles.atomicBlock || 'atomicBlock';
        block.dataset.index = index;

        block.onclick = (e) => {
            // Ignore if clicking bubble or button
            if (e.target.tagName === 'BUTTON' || (e.target.closest && e.target.closest('button'))) return;
            if (styles.bubble && e.target.closest && e.target.closest(`.${styles.bubble}`)) return;
            this.playSequence(index);
        };

        // --- 1. Original Text Row ---
        const originalDiv = document.createElement('div');
        originalDiv.className = `${styles.originalRow || 'originalRow'} ${styles.controlRow || 'controlRow'}`;

        // Play Button
        const playBtn = document.createElement('button');
        playBtn.className = `${styles.controlBtn || 'controlBtn'} ${styles.playBtn || 'playBtn'} js-play-btn`;
        playBtn.innerHTML = '▶️';
        playBtn.onclick = (e) => {
            e.stopPropagation();
            this.playSequence(index);
        };
        originalDiv.appendChild(playBtn);

        const textContainer = document.createElement('div');
        textContainer.style.flex = '1';

        if (sentence.segments && Array.isArray(sentence.segments)) {
            sentence.segments.forEach(seg => {
                const [word, pos, lemma] = seg;
                const bubble = document.createElement('span');
                bubble.textContent = word + ' ';
                bubble.className = styles.bubble || 'bubble';
                const isInteractive = !['STOP', 'NUM', 'PUNCT'].includes(pos);

                if (isInteractive) {
                    bubble.classList.add(styles.interactive || 'interactive');

                    if (lemma) bubble.dataset.lemma = lemma.toLowerCase(); // For auto-update

                    if (savedSet && savedSet.has(lemma?.toLowerCase())) {
                        bubble.classList.add(styles.savedBubble || 'savedBubble');
                    }

                    bubble.onclick = (e) => {
                        e.stopPropagation();
                        // Delegate to Dictionary Module
                        this.dictionary.handleBubbleClick(
                            bubble,
                            seg,
                            sentence.original_text,
                            (txt) => this.audio.speak(txt),
                            (isSaved) => {
                                if (isSaved) bubble.classList.add(styles.savedBubble || 'savedBubble');
                                else bubble.classList.remove(styles.savedBubble || 'savedBubble');
                            }
                        );
                    };
                }
                textContainer.appendChild(bubble);
            });
        } else {
            textContainer.textContent = sentence.original_text;
        }
        originalDiv.appendChild(textContainer);
        block.appendChild(originalDiv);

        // --- 2. Translation Row ---
        const transDiv = document.createElement('div');
        transDiv.className = `${styles.translationRow || 'translationRow'} ${styles.controlRow || 'controlRow'}`;

        // Toggle Button
        const transToggle = document.createElement('button');
        transToggle.className = `${styles.controlBtn || 'controlBtn'} ${styles.transBtn || 'transBtn'} js-trans-toggle`;
        transToggle.innerHTML = this.showTranslations ? '👁️' : '👁️‍🗨️';

        transToggle.onclick = (e) => {
            e.stopPropagation();
            const textEl = transDiv.querySelector('.js-trans-text');
            if (textEl) {
                const isObscured = textEl.classList.contains(styles.obscured || 'obscured');
                if (isObscured) {
                    textEl.classList.remove(styles.obscured || 'obscured');
                    transToggle.innerHTML = '👁️';
                } else {
                    textEl.classList.add(styles.obscured || 'obscured');
                    transToggle.innerHTML = '👁️‍🗨️';
                }
            }
        };
        transDiv.appendChild(transToggle);

        const transText = document.createElement('span');
        transText.className = 'js-trans-text';
        transText.textContent = sentence.translation;
        transText.style.flex = '1';

        // Initialize visibility
        if (!this.showTranslations) {
            transText.classList.add(styles.obscured || 'obscured');
        }

        // Keep existing click-to-reveal on text logic as backup/complement
        transText.onclick = (e) => {
            e.stopPropagation();
            if (transText.classList.contains(styles.obscured || 'obscured')) {
                transText.classList.remove(styles.obscured || 'obscured');
                transToggle.innerHTML = '👁️';
            }
        };

        transDiv.appendChild(transText);
        block.appendChild(transDiv);

        // --- 3. Explanation Row ---
        if (sentence.explanation) {
            const expDiv = document.createElement('div');
            expDiv.className = `${styles.explanationRow || 'explanationRow'} ${styles.controlRow || 'controlRow'}`;
            expDiv.style.marginTop = '4px';

            const expToggle = document.createElement('button');
            expToggle.className = `${styles.controlBtn || 'controlBtn'} ${styles.transBtn || 'transBtn'} js-exp-toggle`;
            expToggle.innerHTML = this.showTranslations ? '👁️' : '👁️‍🗨️';

            expToggle.onclick = (e) => {
                e.stopPropagation();
                const textEl = expDiv.querySelector('.js-exp-text');
                if (textEl) {
                    const isObscured = textEl.classList.contains(styles.obscured || 'obscured');
                    if (isObscured) {
                        textEl.classList.remove(styles.obscured || 'obscured');
                        expToggle.innerHTML = '👁️';
                    } else {
                        textEl.classList.add(styles.obscured || 'obscured');
                        expToggle.innerHTML = '👁️‍🗨️';
                    }
                }
            };
            expDiv.appendChild(expToggle);

            const expText = document.createElement('span');
            expText.className = 'js-exp-text';
            expText.style.fontSize = '0.85em';
            expText.style.color = '#795548';
            expText.textContent = `💡 ${sentence.explanation}`;
            expText.style.flex = '1';

            if (!this.showTranslations) {
                expText.classList.add(styles.obscured || 'obscured');
            }

            expText.onclick = (e) => {
                e.stopPropagation();
                if (expText.classList.contains(styles.obscured || 'obscured')) {
                    expText.classList.remove(styles.obscured || 'obscured');
                    expToggle.innerHTML = '👁️';
                }
            };

            expDiv.appendChild(expText);
            block.appendChild(expDiv);
        }

        return block;
    }

    updateTranslationVisibility() {
        const method = this.showTranslations ? 'remove' : 'add';
        const cls = styles.obscured || 'obscured';
        const icon = this.showTranslations ? '👁️' : '👁️‍🗨️';

        // Update Text
        this.element.querySelectorAll('.js-trans-text').forEach(el => el.classList[method](cls));
        this.element.querySelectorAll('.js-exp-text').forEach(el => el.classList[method](cls));

        // Update Buttons
        this.element.querySelectorAll('.js-trans-toggle').forEach(btn => btn.innerHTML = icon);
        this.element.querySelectorAll('.js-exp-toggle').forEach(btn => btn.innerHTML = icon);
    }

    toggleTTS(btn) {
        if (this.audio.isPlaying) {
            this.stopPlayback();
        } else {
            const startIdx = this.currentHighlightIndex !== null && this.currentHighlightIndex !== undefined ? this.currentHighlightIndex : 0;
            this.playSequence(startIdx);
        }
    }

    stopPlayback() {
        this.audio.cancel();

        // Reset all individual play buttons
        this.element.querySelectorAll('.js-play-btn').forEach(b => b.innerHTML = '▶️');

        this.highlightSentence(null);
        const btn = this.element.querySelector('#tts-btn');
        if (btn) btn.innerHTML = '🔊';
    }

    playSequence(index, isAuto = false) {
        const btn = this.element.querySelector('#tts-btn');
        if (btn) btn.innerHTML = '⏹️';

        // Toggle Logic: If manual click and already playing this index, stop it.
        if (!isAuto && this.audio.isPlaying && this.currentIndex === index) {
            this.stopPlayback();
            return;
        }

        if (index >= this.sentences.length) {
            this.stopPlayback();
            return;
        }

        this.currentIndex = index;

        // Update individual buttons
        this.element.querySelectorAll('.js-play-btn').forEach(b => b.innerHTML = '▶️');
        const currentBlock = this.contentArea.querySelector(`div[data-index="${index}"]`);
        if (currentBlock) {
            const playBtn = currentBlock.querySelector('.js-play-btn');
            if (playBtn) playBtn.innerHTML = '⏹️';
        }

        // Manual interactions should highlight immediately for feedback
        if (!isAuto) {
            this.highlightSentence(index);
        }

        const text = this.sentences[index].original_text;

        // Safety: ensure any previous audio is fully stopped before starting new
        this.audio.cancel();

        // Slight delay to allow browser TTS cleanup prevents "interrupted" errors
        setTimeout(() => {
            this.audio.speak(text,
                () => {
                    // On End -> Play Next
                    // Only continue if we are still in "playing" mode (user didn't stop)
                    if (this.audio.isPlaying) {
                        this.playSequence(index + 1, true);
                    } else {
                        // If stopped naturally (e.g. end of sequence but isPlaying false?), ensure button reset
                        // But isPlaying is likely true here if we are chaining.
                        // If we are here, it means this sentence finished. 
                        // If we DON'T recurse, we should reset buttons.
                        // But playSequence recurses.
                    }
                },
                (e) => {
                    // Ignore interruption errors (user clicked stop/next)
                    if (e.error !== 'interrupted' && e.error !== 'canceled') {
                        console.error("TTS Playback Error:", e);
                    }
                },
                () => {
                    // On Start -> Highlight (Sync for auto-advance)
                    if (isAuto) {
                        this.highlightSentence(index);
                    }
                }
            );
        }, 50);
    }

    highlightSentence(index) {
        if (this.currentHighlightIndex === index) return;

        if (this.currentHighlightIndex !== null && this.currentHighlightIndex !== undefined) {
            const oldBlock = this.contentArea.querySelector(`div[data-index="${this.currentHighlightIndex}"]`);
            if (oldBlock) oldBlock.classList.remove(styles.active || 'active');
        }

        this.currentHighlightIndex = index;

        if (index !== null) {
            const newBlock = this.contentArea.querySelector(`div[data-index="${index}"]`);
            if (newBlock) {
                newBlock.classList.add(styles.active || 'active');
                newBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    startStorageListener() {
        if (this.isListening) return;
        this.isListening = true;

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local') {
                // Check if changes involve vocab (any key starting with vocab_)
                const hasVocabChange = Object.keys(changes).some(k => k.startsWith('vocab_'));
                if (hasVocabChange) {
                    this.updateHighlights();
                }
            }
        });
    }

    async updateHighlights() {
        try {
            const savedSet = await vocabService.getSavedSet();
            const bubbles = this.element.querySelectorAll(`.${styles.interactive || 'interactive'}`);

            bubbles.forEach(bubble => {
                const lemma = bubble.dataset.lemma;
                if (!lemma) return;

                if (savedSet.has(lemma)) {
                    bubble.classList.add(styles.savedBubble || 'savedBubble');
                } else {
                    bubble.classList.remove(styles.savedBubble || 'savedBubble');
                }
            });
            // console.log('ReaderView: Highlights updated automatically');
        } catch (e) {
            console.error("ReaderView: Failed to update highlights", e);
        }
    }
}

import { Component } from '../../components/component.js';
import styles from './reader.module.css';
import { ReaderAudio } from './reader_audio.js';
import { ReaderDictionary } from './reader_dictionary.js';
import { vocabService } from '../../../services/vocab_service.js';

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
    }

    show(draft) {
        try {
            console.log('ReaderView: Showing draft', draft?.id);
            this.element.classList.remove('hidden');
            this.element.style.display = 'block';
            this.draft = draft || { data: { sentences: [] }, title: 'Error' };
            this.sentences = this.draft.data?.sentences || [];
            this.render();
        } catch (e) {
            console.error("ReaderView Show Error:", e);
            this.element.innerHTML = `<div style="padding:20px; color:red">Error loading reader: ${e.message}</div>`;
        }
    }

    async render() {
        this.element.innerHTML = '';
        this.dictionary = new ReaderDictionary(this.element); // Pass container for popovers

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
            content.innerHTML = '<div style="padding:20px; color:#999; text-align:center;">No content available.</div>';
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
            if (this.callbacks.onExit) this.callbacks.onExit();
        };

        const title = document.createElement('div');
        title.className = styles.readerTitle || 'readerTitle';
        title.textContent = (this.draft?.title || 'Reader Mode').substring(0, 20) + '...';

        const controls = document.createElement('div');
        controls.className = styles.headerControls || 'headerControls';

        // Translation Toggle
        const transBtn = document.createElement('button');
        transBtn.className = styles.iconBtn || 'iconBtn';
        transBtn.innerHTML = this.showTranslations ? '👁️' : '👁️‍🗨️';
        transBtn.title = "Toggle Translations";
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
            <div class="${styles.settingGroup}"><label>Voice:</label><select id="tts-voice" style="max-width:120px;"><option>Loading...</select></div>
            <div class="${styles.settingGroup}"><label>Speed:</label><select id="tts-speed"><option value="0.8">0.8x</option><option value="1.0" selected>1.0x</option><option value="1.2">1.2x</option></select></div>
            <div class="${styles.settingGroup}"><label>Size:</label><button id="font-dec">-</button><span id="font-val">${this.fontSize}%</span><button id="font-inc">+</button></div>
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
            // Ignore if clicking bubble
            if (styles.bubble && e.target.closest && e.target.closest(`.${styles.bubble}`)) return;
            this.playSequence(index);
        };

        const originalDiv = document.createElement('div');
        originalDiv.className = styles.originalRow || 'originalRow';

        if (sentence.segments && Array.isArray(sentence.segments)) {
            sentence.segments.forEach(seg => {
                const [word, pos, lemma] = seg;
                const bubble = document.createElement('span');
                bubble.textContent = word + ' ';
                bubble.className = styles.bubble || 'bubble';
                const isInteractive = !['STOP', 'NUM', 'PUNCT'].includes(pos);

                if (isInteractive) {
                    bubble.classList.add(styles.interactive || 'interactive');

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
                originalDiv.appendChild(bubble);
            });
        } else {
            originalDiv.textContent = sentence.original_text;
        }
        block.appendChild(originalDiv);

        // Translation
        const transDiv = document.createElement('div');
        transDiv.className = `${styles.translationRow || 'translationRow'} js-translation`;
        transDiv.textContent = sentence.translation;

        // Single Click Reveal
        transDiv.onclick = (e) => {
            e.stopPropagation();
            if (transDiv.classList.contains(styles.obscured || 'obscured')) {
                transDiv.classList.remove(styles.obscured || 'obscured');
            }
        };

        block.appendChild(transDiv);

        // Explanation
        if (sentence.explanation) {
            const expDiv = document.createElement('div');
            expDiv.className = 'js-explanation';
            expDiv.style.fontSize = '0.85em';
            expDiv.style.marginTop = '4px';
            expDiv.style.color = '#795548';
            expDiv.textContent = `💡 ${sentence.explanation}`;

            expDiv.onclick = (e) => {
                e.stopPropagation();
                if (expDiv.classList.contains(styles.obscured || 'obscured')) {
                    expDiv.classList.remove(styles.obscured || 'obscured');
                }
            };
            block.appendChild(expDiv);
        }

        return block;
    }

    updateTranslationVisibility() {
        // Mode 1: All Visible (showTranslations = true) -> Remove 'obscured'
        // Mode 2: Blur Mode (showTranslations = false) -> Add 'obscured'

        const method = this.showTranslations ? 'remove' : 'add';
        const cls = styles.obscured || 'obscured';

        this.element.querySelectorAll('.js-translation').forEach(el => el.classList[method](cls));
        this.element.querySelectorAll('.js-explanation').forEach(el => el.classList[method](cls));
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
}

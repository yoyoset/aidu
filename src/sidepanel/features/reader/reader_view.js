import { Component } from '../../components/component.js';
import styles from './reader.module.css';
import { ReaderAudio } from './reader_audio.js';
import { ReaderDictionary } from './reader_dictionary.js';
import { vocabService } from '../../../services/vocab_service.js';
import { StorageHelper, StorageKeys } from '../../../utils/storage.js';
import { t } from '../../../locales/index.js';
import { analysisQueue } from '../../../services/analysis_queue_manager.js';
import { AnalysisTray } from './analysis_tray.js';
import { ThemeModal } from '../settings/theme_modal.js';

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

        // Timer
        this.readingTime = 0;
        this.timerInterval = null;
        this.locateTimeout = null;
        this.tray = null;
        this.currentHighlightIndex = null;
        this.sentences = [];
    }

    show(draft) {
        try {
            console.log('ReaderView: Showing draft', draft?.id);

            // Lifecycle Governance: Cleanup previous state if any
            this.destroy();

            this.element.classList.remove('hidden');
            this.element.style.display = 'block';
            this.draft = draft || { data: { sentences: [] }, title: 'Error' };
            this.sentences = this.draft.data?.sentences || [];

            // Initialize Timer
            this.readingTime = this.draft.readingTime || 0;
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
        this.stopTimer(); // Safety
        this.updateTimerUI(); // Initial draw
        this.timerInterval = setInterval(() => {
            this.readingTime++;
            this.updateTimerUI();

            // Save every 10 seconds to avoid data loss
            if (this.readingTime % 10 === 0) {
                this.saveProgress();
            }
        }, 1000);
    }

    updateTimerUI() {
        if (!this.timerEl) return;
        const totalSecs = this.readingTime;
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        this.timerEl.innerHTML = `<i class="ri-time-line" style="margin-right:4px;"></i>${formatted}`;
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

        // Analysis Tray
        this.tray = new AnalysisTray(this.element, {
            onLocate: (lemma) => this.locateWordInText(lemma)
        });
        this.tray.render();

        // Listen for analysis completion & Store unsubscribe
        this.queueUnsubscribe = analysisQueue.subscribe(({ lemma, status }) => {
            if (status === 'ready') {
                this.refreshWordStyling(lemma);
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

        // 4. Sync existing deep analysis results to the tray
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
                // Notifying analysisQueue will update AnalysisTray and Dashed Underlines
                analysisQueue.push(entry.word, l, '');
            }
        });
    }

    renderHeader(container) {
        const header = document.createElement('div');
        header.className = styles.readerHeader || 'readerHeader';

        const backBtn = document.createElement('button');
        backBtn.className = styles.iconBtn || 'iconBtn';
        backBtn.innerHTML = '<i class="ri-arrow-left-s-line"></i>';
        backBtn.onclick = () => {
            this.destroy(); // Full cleanup on exit
            if (this.callbacks.onExit) this.callbacks.onExit();
        };

        const title = document.createElement('div');
        title.className = styles.readerTitle || 'readerTitle';
        title.textContent = (this.draft?.title || t('reader.title')).substring(0, 15) + '...';

        const timerCapsule = document.createElement('div');
        timerCapsule.className = styles.timerCapsule || 'timerCapsule';
        timerCapsule.title = t('reader.readingTime') || 'Reading Time';
        this.timerEl = timerCapsule;
        this.updateTimerUI(); // Render current time immediately

        const controls = document.createElement('div');
        controls.className = styles.headerControls || 'headerControls';

        // Analysis Tray Toggle (New Position)
        const trayBtn = document.createElement('button');
        trayBtn.className = styles.iconBtn || 'iconBtn';
        trayBtn.innerHTML = '<i class="ri-flask-line"></i>';
        trayBtn.title = t('deep.analysis');
        trayBtn.onclick = () => {
            if (this.tray) this.tray.toggle();
        };

        // Translation Toggle
        const transBtn = document.createElement('button');
        transBtn.className = styles.iconBtn || 'iconBtn';
        transBtn.innerHTML = this.showTranslations ? '<i class="ri-eye-line"></i>' : '<i class="ri-eye-off-line"></i>';
        transBtn.title = t('reader.toggleTrans');
        transBtn.onclick = () => {
            this.showTranslations = !this.showTranslations;
            transBtn.innerHTML = this.showTranslations ? '<i class="ri-eye-line"></i>' : '<i class="ri-eye-off-line"></i>';
            this.updateTranslationVisibility();
        };

        // TTS Button
        const ttsBtn = document.createElement('button');
        ttsBtn.className = styles.iconBtn || 'iconBtn';
        ttsBtn.id = 'tts-btn';
        ttsBtn.innerHTML = '<i class="ri-volume-up-line"></i>';
        ttsBtn.onclick = () => this.toggleTTS(ttsBtn);

        // Settings Button
        const settingsBtn = document.createElement('button');
        settingsBtn.className = styles.iconBtn || 'iconBtn';
        settingsBtn.innerHTML = '<i class="ri-equalizer-line"></i>';
        settingsBtn.onclick = () => {
            const panel = container.querySelector(`.${styles.settingsPanel || 'settingsPanel'}`);
            if (panel) panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        };

        controls.appendChild(trayBtn);
        controls.appendChild(transBtn);
        controls.appendChild(ttsBtn);
        controls.appendChild(settingsBtn);

        header.appendChild(backBtn);
        header.appendChild(title);
        header.appendChild(timerCapsule);
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
            <div class="${styles.settingGroup}">
                <label>${t('reader.settings.font')}:</label>
                <select id="reader-font-family">
                    <option value="'Inter', sans-serif">${t('reader.font.sans')}</option>
                    <option value="'Merriweather', serif">${t('reader.font.serif')}</option>
                    <option value="'JetBrains Mono', monospace">${t('reader.font.mono')}</option>
                </select>
            </div>
            <div class="${styles.settingGroup}">
                <label>${t('reader.settings.bold')}:</label>
                <input type="checkbox" id="reader-font-bold" style="cursor:pointer;">
            </div>
            <div class="${styles.settingGroup}"><label>${t('settings.appearance')}:</label><button id="open-theme-btn" class="${styles.iconBtnInline}"><i class="ri-palette-line"></i></button></div>
        `;

        container.appendChild(settingsPanel);

        // Bind Theme Modal
        settingsPanel.querySelector('#open-theme-btn').onclick = () => {
            const modal = new ThemeModal(document.body);
            modal.show();
        };

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
            this.saveTypography();
        };

        // Typography Settings
        const fontSelect = settingsPanel.querySelector('#reader-font-family');
        const boldCheck = settingsPanel.querySelector('#reader-font-bold');

        fontSelect.onchange = (e) => {
            document.documentElement.style.setProperty('--user-font-family', e.target.value);
            this.saveTypography();
        };

        boldCheck.onchange = (e) => {
            document.documentElement.style.setProperty('--user-font-weight', e.target.checked ? '700' : '400');
            this.saveTypography();
        };

        // Load Typography
        this.loadTypography(fontSelect, boldCheck);
    }

    async saveTypography() {
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
        const fontSelect = this.element.querySelector('#reader-font-family');
        const boldCheck = this.element.querySelector('#reader-font-bold');

        settings.typography = {
            fontSize: this.fontSize,
            fontFamily: fontSelect?.value || "'Inter', sans-serif",
            fontWeight: boldCheck?.checked ? '700' : '400'
        };
        await StorageHelper.set(StorageKeys.USER_SETTINGS, settings);
    }

    async loadTypography(fontSelect, boldCheck) {
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
        const typo = settings.typography || { fontSize: 100, fontFamily: "'Inter', sans-serif", fontWeight: '400' };

        this.fontSize = typo.fontSize || 100;
        if (fontSelect) fontSelect.value = typo.fontFamily;
        if (boldCheck) boldCheck.checked = typo.fontWeight === '700';

        document.documentElement.style.setProperty('--user-font-family', typo.fontFamily);
        document.documentElement.style.setProperty('--user-font-weight', typo.fontWeight);
        if (this.contentArea) this.contentArea.style.fontSize = `${this.fontSize}%`;

        const val = this.element.querySelector('#font-val');
        if (val) val.textContent = this.fontSize + '%';
    }

    createAtomicBlock(sentence, index, savedSet) {
        const block = document.createElement('div');
        block.className = styles.atomicBlock || 'atomicBlock';
        block.dataset.index = index;

        block.onclick = (e) => {
            // Ignore if clicking bubble or button
            if (e.target.tagName === 'BUTTON' || (e.target.closest && e.target.closest('button'))) return;
            if (styles.bubble && e.target.closest && e.target.closest(`.${styles.bubble}`)) return;
            this.playSequence(index, { continuous: false });
        };

        // --- 1. Original Text Row ---
        const originalDiv = document.createElement('div');
        originalDiv.className = `${styles.originalRow || 'originalRow'} ${styles.controlRow || 'controlRow'}`;

        // Play Button
        const playBtn = document.createElement('button');
        playBtn.className = `${styles.controlBtn || 'controlBtn'} ${styles.playBtn || 'playBtn'} js-play-btn`;
        playBtn.innerHTML = '<i class="ri-play-mini-line"></i>';
        playBtn.onclick = (e) => {
            e.stopPropagation();
            this.playSequence(index, { continuous: false });
        };
        originalDiv.appendChild(playBtn);

        const textContainer = document.createElement('div');
        textContainer.style.flex = '1';

        // Build Index-to-PV mapping
        const indexToPv = new Map();
        if (sentence.phrasal_verbs) {
            sentence.phrasal_verbs.forEach(pv => {
                pv.indices.forEach(idx => indexToPv.set(idx, pv));
            });
        }

        if (sentence.segments && Array.isArray(sentence.segments)) {
            sentence.segments.forEach((seg, segIdx) => {
                const [word, pos, lemma] = seg;
                const bubble = document.createElement('span');
                bubble.textContent = word + ' ';
                bubble.className = styles.bubble || 'bubble';
                bubble.dataset.segIdx = segIdx;
                const isInteractive = !['STOP', 'NUM', 'PUNCT'].includes(pos);

                if (isInteractive) {
                    bubble.classList.add(styles.interactive || 'interactive');

                    if (lemma) bubble.dataset.lemma = lemma.toLowerCase(); // For auto-update

                    // Initial styling if already analyzed
                    if (analysisQueue.getCache(lemma)) {
                        bubble.classList.add(styles.deepReady || 'deepReady');
                    }

                    if (savedSet && savedSet.has(lemma?.toLowerCase())) {
                        bubble.classList.add(styles.savedBubble || 'savedBubble');
                    }

                    const linkedPv = indexToPv.get(segIdx);
                    if (linkedPv) {
                        bubble.classList.add(styles.phrasalMember || 'phrasalMember');
                        bubble.title = `${t('deep.phrasalVerb') || 'Phrasal Verb'}: ${linkedPv.lemma}`;
                    }

                    // Hover Pre-highlight
                    bubble.onmouseenter = () => {
                        const pv = indexToPv.get(segIdx);
                        if (pv) {
                            block.querySelectorAll(`.${styles.bubble}`).forEach(b => {
                                if (pv.indices.includes(parseInt(b.dataset.segIdx))) {
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

                        // 1. Phrasal Verb Special Case
                        const pv = indexToPv.get(segIdx);
                        let finalSeg = seg;

                        if (pv) {
                            // Highlighting members
                            block.querySelectorAll(`.${styles.linkedHighlight}`).forEach(b => b.classList.remove(styles.linkedHighlight || 'linkedHighlight'));
                            block.querySelectorAll(`.${styles.bubble}`).forEach(b => {
                                if (pv.indices.includes(parseInt(b.dataset.segIdx))) {
                                    b.classList.add(styles.linkedHighlight || 'linkedHighlight');
                                }
                            });

                            // Create synthetic segment for the whole phrase
                            finalSeg = [pv.text, 'VERB', pv.lemma];
                        } else {
                            // Standard single word click: clear PV highlights
                            block.querySelectorAll(`.${styles.linkedHighlight}`).forEach(b => b.classList.remove(styles.linkedHighlight || 'linkedHighlight'));
                        }

                        // Delegate to Dictionary Module with (possibly synthetic) segment
                        this.dictionary.handleBubbleClick(
                            bubble,
                            finalSeg,
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
        transToggle.innerHTML = this.showTranslations ? '<i class="ri-eye-line"></i>' : '<i class="ri-eye-off-line"></i>';

        transToggle.onclick = (e) => {
            e.stopPropagation();
            const textEl = transDiv.querySelector('.js-trans-text');
            if (textEl) {
                const isObscured = textEl.classList.contains(styles.obscured || 'obscured');
                if (isObscured) {
                    textEl.classList.remove(styles.obscured || 'obscured');
                    transToggle.innerHTML = '<i class="ri-eye-line"></i>';
                } else {
                    textEl.classList.add(styles.obscured || 'obscured');
                    transToggle.innerHTML = '<i class="ri-eye-off-line"></i>';
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
                transToggle.innerHTML = '<i class="ri-eye-line"></i>';
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
            expToggle.innerHTML = this.showTranslations ? '<i class="ri-eye-line"></i>' : '<i class="ri-eye-off-line"></i>';

            expToggle.onclick = (e) => {
                e.stopPropagation();
                const textEl = expDiv.querySelector('.js-exp-text');
                if (textEl) {
                    const isObscured = textEl.classList.contains(styles.obscured || 'obscured');
                    if (isObscured) {
                        textEl.classList.remove(styles.obscured || 'obscured');
                        expToggle.innerHTML = '<i class="ri-eye-line"></i>';
                    } else {
                        textEl.classList.add(styles.obscured || 'obscured');
                        expToggle.innerHTML = '<i class="ri-eye-off-line"></i>';
                    }
                }
            };
            expDiv.appendChild(expToggle);

            const expText = document.createElement('span');
            expText.className = 'js-exp-text';
            expText.style.fontSize = '0.85em';
            expText.style.color = '#795548';
            expText.innerHTML = `<i class="ri-lightbulb-line" style="margin-right:4px;"></i>${sentence.explanation}`;
            expText.style.flex = '1';

            if (!this.showTranslations) {
                expText.classList.add(styles.obscured || 'obscured');
            }

            expText.onclick = (e) => {
                e.stopPropagation();
                if (expText.classList.contains(styles.obscured || 'obscured')) {
                    expText.classList.remove(styles.obscured || 'obscured');
                    expToggle.innerHTML = '<i class="ri-eye-line"></i>';
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
        const icon = this.showTranslations ? '<i class="ri-eye-line"></i>' : '<i class="ri-eye-off-line"></i>';

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
            this.playSequence(startIdx, { continuous: true });
        }
    }

    stopPlayback() {
        this.audio.cancel();

        // Reset all individual play buttons
        this.element.querySelectorAll('.js-play-btn').forEach(b => b.innerHTML = '<i class="ri-play-mini-line"></i>');

        this.highlightSentence(null);
        const btn = this.element.querySelector('#tts-btn');
        if (btn) btn.innerHTML = '<i class="ri-volume-up-line"></i>';
    }

    playSequence(index, options = {}) {
        const { isAuto = false, continuous = true } = options;

        // Toggle Logic: If manual click and already playing this index, stop it.
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

        // Update individual buttons
        this.element.querySelectorAll('.js-play-btn').forEach(b => b.innerHTML = '<i class="ri-play-mini-line"></i>');
        const currentBlock = this.contentArea.querySelector(`div[data-index="${index}"]`);
        if (currentBlock) {
            const playBtn = currentBlock.querySelector('.js-play-btn');
            if (playBtn) playBtn.innerHTML = '<i class="ri-stop-mini-line"></i>';
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
                    // On End -> Play Next if continuous mode
                    // Only continue if we are still in "playing" mode (user didn't stop)
                    if (this.audio.isPlaying && continuous) {
                        this.playSequence(index + 1, { isAuto: true, continuous: true });
                    } else if (this.audio.isPlaying && !continuous) {
                        // If single sentence finished, just stop visual indicators but keep global state clean
                        this.stopPlayback();
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
                newBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }

    refreshWordStyling(lemma) {
        const bubbles = this.element.querySelectorAll(`span[data-lemma="${lemma.toLowerCase()}"]`);
        bubbles.forEach(b => b.classList.add(styles.deepReady || 'deepReady'));
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
                // Check if changes involve vocab (any key starting with vocab_)
                const hasVocabChange = Object.keys(changes).some(k => k.startsWith('vocab_'));
                if (hasVocabChange) {
                    this.updateHighlights();
                }
            }
        };
        chrome.storage.onChanged.addListener(this.storageHandler);
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

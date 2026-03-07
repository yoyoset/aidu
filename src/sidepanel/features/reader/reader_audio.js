export class ReaderAudio {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voice = null;
        this.rate = 1.0;
        this.isPlaying = false;

        // Sequence Management
        this.sentences = [];
        this.currentIndex = -1;
        this.isContinuous = false;
        this.callbacks = null; // { onHighlight, onStatusChange }
    }

    // ... loadVoices and setRate ...

    init(sentences, callbacks) {
        this.sentences = sentences || [];
        this.callbacks = callbacks || {};
    }

    loadVoices(selectElement) {
        const populate = () => {
            const voices = this.synth.getVoices();
            if (!selectElement) return;

            selectElement.innerHTML = '';

            // Sort: Natural > Google > Others
            voices.sort((a, b) => {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                const aScore = (aName.includes('natural') ? 2 : 0) + (aName.includes('google') ? 1 : 0);
                const bScore = (bName.includes('natural') ? 2 : 0) + (bName.includes('google') ? 1 : 0);
                return bScore - aScore;
            });

            voices.forEach((v, i) => {
                const option = document.createElement('option');
                option.textContent = `${v.name} (${v.lang})`;
                option.value = v.name; // Use name as value for stability
                selectElement.appendChild(option);
            });

            // Auto-select best English voice
            const best = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google')));
            if (best) {
                selectElement.value = best.name;
                this.voice = best;
            }
        };

        populate();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = populate;
        }

        // Bind Change Event
        selectElement.onchange = (e) => {
            const name = e.target.value;
            this.voice = this.synth.getVoices().find(v => v.name === name);
        };
    }

    setRate(rate) {
        this.rate = parseFloat(rate);
    }

    toggleTTS(startIndex = 0) {
        if (this.isPlaying) {
            this.stopPlayback();
        } else {
            const index = this.currentIndex >= 0 ? this.currentIndex : startIndex;
            this.playSequence(index, { continuous: true });
        }
    }

    stopPlayback() {
        this.cancel();
        this.currentIndex = -1;
        if (this.callbacks?.onStatusChange) {
            this.callbacks.onStatusChange({ isPlaying: false, index: -1 });
        }
    }

    playSequence(index, options = {}) {
        const { isAuto = false, continuous = true } = options;

        if (!isAuto && this.isPlaying && this.currentIndex === index) {
            this.stopPlayback();
            return;
        }

        if (index < 0 || index >= this.sentences.length) {
            this.stopPlayback();
            return;
        }

        this.currentIndex = index;
        this.isContinuous = continuous;

        if (this.callbacks?.onHighlight) {
            this.callbacks.onHighlight(index, isAuto);
        }

        if (this.callbacks?.onStatusChange) {
            this.callbacks.onStatusChange({ isPlaying: true, index });
        }

        const text = this.sentences[index].original_text;
        this.cancel();

        // Small delay to ensure synth reset
        setTimeout(() => {
            this.speak(text,
                () => { // onEnd
                    if (this.isPlaying && this.isContinuous) {
                        this.playSequence(index + 1, { isAuto: true, continuous: true });
                    } else if (this.isPlaying && !this.isContinuous) {
                        // Keep currentHighlight but stop playback
                        this.isPlaying = false;
                        if (this.callbacks?.onStatusChange) {
                            this.callbacks.onStatusChange({ isPlaying: false, index });
                        }
                    }
                },
                (e) => { // onError
                    if (e.error !== 'interrupted' && e.error !== 'canceled') {
                        console.error("ReaderAudio: Playback Error:", e);
                    }
                }
            );
        }, 50);
    }

    speak(text, onEnd, onError) {
        if (!text) return;

        this.isPlaying = true;
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = this.rate;
        if (this.voice) utt.voice = this.voice;

        utt.onend = () => {
            if (onEnd) onEnd();
        };

        utt.onerror = (e) => {
            if (e.error === 'interrupted' || e.error === 'canceled') {
                this.isPlaying = false;
                if (onError) onError(e);
                return;
            }
            this.isPlaying = false;
            if (onError) onError(e);
        };

        this.synth.speak(utt);
    }

    cancel() {
        this.isPlaying = false;
        this.synth.cancel();
    }
}

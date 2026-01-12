export class ReaderAudio {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voice = null;
        this.rate = 1.0;
        this.isPlaying = false;
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

    speak(text, onEnd, onError, onStart) {
        this.cancel(); // Stop strict
        if (!text) return;

        this.isPlaying = true;
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = this.rate;
        if (this.voice) utt.voice = this.voice;

        utt.onstart = () => {
            if (onStart) onStart();
        };

        utt.onend = () => {
            // this.isPlaying = false; // logic handled by caller usually for sequences
            if (onEnd) onEnd();
        };

        utt.onerror = (e) => {
            // Suppress expected errors
            if (e.error === 'interrupted' || e.error === 'canceled') {
                this.isPlaying = false;
                if (onError) onError(e); // Pass it up, but don't log error here
                return;
            }

            console.error("TTS Error:", e.error, e);
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

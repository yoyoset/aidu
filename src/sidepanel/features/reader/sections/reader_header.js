import { t } from '../../../../locales/index.js';
import layoutStyles from '../reader_layout.module.css';
import settingsStyles from '../reader_settings.module.css';
const styles = { ...layoutStyles, ...settingsStyles };

export class ReaderHeader {
    constructor(parent) {
        this.parent = parent;
    }

    render(container) {
        const header = document.createElement('div');
        header.className = styles.readerHeader || 'readerHeader';

        const backBtn = document.createElement('button');
        backBtn.className = styles.iconBtn || 'iconBtn';
        backBtn.innerHTML = '<i class="ri-arrow-left-s-line"></i>';
        backBtn.onclick = () => {
            this.parent.destroy(); // Full cleanup on exit
            if (this.parent.callbacks.onExit) this.parent.callbacks.onExit();
        };

        const title = document.createElement('div');
        title.className = styles.readerTitle || 'readerTitle';
        title.textContent = (this.parent.draft?.title || t('reader.title')).substring(0, 15) + '...';

        const timerCapsule = document.createElement('div');
        timerCapsule.className = styles.timerCapsule || 'timerCapsule';
        timerCapsule.title = t('reader.readingTime') || 'Reading Time';
        this.parent.timerEl = timerCapsule;
        this.parent.updateTimerUI(); // Render current time immediately

        const controls = document.createElement('div');
        controls.className = styles.headerControls || 'headerControls';

        // Analysis Tray Toggle
        const trayBtn = document.createElement('button');
        trayBtn.className = styles.iconBtn || 'iconBtn';
        trayBtn.innerHTML = '<i class="ri-flask-line"></i>';
        trayBtn.title = t('deep.analysis');
        trayBtn.onclick = () => {
            if (this.parent.tray) this.parent.tray.toggle();
        };

        // Bookmark Tray Toggle
        const bookmarkBtn = document.createElement('button');
        bookmarkBtn.className = styles.iconBtn || 'iconBtn';
        bookmarkBtn.innerHTML = '<i class="ri-bookmark-3-line"></i>';
        bookmarkBtn.title = t('reader.bookmarks') || 'Bookmarks';
        bookmarkBtn.onclick = () => {
            if (this.parent.bookmarkTray) this.parent.bookmarkTray.toggle();
        };

        // Translation Toggle
        const transBtn = document.createElement('button');
        transBtn.className = styles.iconBtn || 'iconBtn';
        transBtn.innerHTML = this.parent.showTranslations ? '<i class="ri-eye-line"></i>' : '<i class="ri-eye-off-line"></i>';
        transBtn.title = t('reader.toggleTrans');
        transBtn.onclick = () => {
            this.parent.showTranslations = !this.parent.showTranslations;
            transBtn.innerHTML = this.parent.showTranslations ? '<i class="ri-eye-line"></i>' : '<i class="ri-eye-off-line"></i>';
            this.parent.updateTranslationVisibility(this.parent.showTranslations);
        };

        // TTS Button
        const ttsBtn = document.createElement('button');
        ttsBtn.className = styles.iconBtn || 'iconBtn';
        ttsBtn.id = 'tts-btn';
        ttsBtn.innerHTML = '<i class="ri-volume-up-line"></i>';
        ttsBtn.onclick = () => this.parent.audio.toggleTTS(this.parent.currentHighlightIndex || 0);

        // Settings Button
        const settingsBtn = document.createElement('button');
        settingsBtn.className = styles.iconBtn || 'iconBtn';
        settingsBtn.innerHTML = '<i class="ri-equalizer-line"></i>';
        settingsBtn.onclick = () => {
            const panel = container.querySelector(`.${styles.settingsPanel || 'settingsPanel'}`);
            if (panel) panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        };

        controls.appendChild(trayBtn);
        controls.appendChild(bookmarkBtn);
        controls.appendChild(transBtn);
        controls.appendChild(ttsBtn);
        controls.appendChild(settingsBtn);

        header.appendChild(backBtn);
        header.appendChild(title);
        header.appendChild(timerCapsule);
        header.appendChild(controls);
        container.appendChild(header);
    }
}

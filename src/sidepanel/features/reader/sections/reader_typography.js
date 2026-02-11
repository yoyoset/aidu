import { t } from '../../../../locales/index.js';
import styles from '../reader_settings.module.css';
import { StorageHelper, StorageKeys } from '../../../../utils/storage.js';
import { ThemeModal } from '../../settings/theme_modal.js';

export class ReaderTypography {
    constructor(parent) {
        this.parent = parent;
    }

    render(container) {
        const settingsPanel = document.createElement('div');
        settingsPanel.className = styles.settingsPanel || 'settingsPanel';
        settingsPanel.style.display = 'none';

        settingsPanel.innerHTML = `
            <div class="${styles.settingGroup}"><label>${t('reader.settings.voice')}:</label><select id="tts-voice" style="max-width:120px;"><option>${t('common.loading')}</option></select></div>
            <div class="${styles.settingGroup}"><label>${t('reader.settings.speed')}:</label><select id="tts-speed"><option value="0.8">0.8x</option><option value="1.0" selected>1.0x</option><option value="1.2">1.2x</option></select></div>
            <div class="${styles.settingGroup}"><label>${t('reader.settings.size')}:</label><button id="font-dec">-</button><span id="font-val">${this.parent.fontSize}%</span><button id="font-inc">+</button></div>
            <div class="${styles.settingGroup}"><label>${t('reader.settings.lineHeight')}:</label><button id="lh-dec">-</button><span id="lh-val">${this.parent.lineHeight || 2.0}</span><button id="lh-inc">+</button></div>
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
        `;

        container.appendChild(settingsPanel);

        // Bind Audio Settings
        this.parent.audio.loadVoices(settingsPanel.querySelector('#tts-voice'));
        settingsPanel.querySelector('#tts-speed').onchange = (e) => this.parent.audio.setRate(e.target.value);

        // Bind Font Settings
        const val = settingsPanel.querySelector('#font-val');
        settingsPanel.querySelector('#font-inc').onclick = () => {
            this.parent.fontSize = Math.min(150, this.parent.fontSize + 10);
            val.textContent = this.parent.fontSize + '%';
            document.documentElement.style.setProperty('--user-font-size', this.parent.fontSize + '%');
            this.save();
        };
        settingsPanel.querySelector('#font-dec').onclick = () => {
            this.parent.fontSize = Math.max(80, this.parent.fontSize - 10);
            val.textContent = this.parent.fontSize + '%';
            document.documentElement.style.setProperty('--user-font-size', this.parent.fontSize + '%');
            this.save();
        };

        // Bind Line Height
        const lhVal = settingsPanel.querySelector('#lh-val');
        settingsPanel.querySelector('#lh-inc').onclick = () => {
            let lh = parseFloat(this.parent.lineHeight || 2.0);
            lh = Math.min(3.0, lh + 0.1).toFixed(1);
            this.parent.lineHeight = lh;
            lhVal.textContent = lh;
            document.documentElement.style.setProperty('--user-line-height', lh);
            this.save();
        };
        settingsPanel.querySelector('#lh-dec').onclick = () => {
            let lh = parseFloat(this.parent.lineHeight || 2.0);
            lh = Math.max(1.0, lh - 0.1).toFixed(1);
            this.parent.lineHeight = lh;
            lhVal.textContent = lh;
            document.documentElement.style.setProperty('--user-line-height', lh);
            this.save();
        };

        // Typography Settings
        const fontSelect = settingsPanel.querySelector('#reader-font-family');
        const boldCheck = settingsPanel.querySelector('#reader-font-bold');

        fontSelect.onchange = (e) => {
            document.documentElement.style.setProperty('--user-font-family', e.target.value);
            this.save();
        };

        boldCheck.onchange = (e) => {
            document.documentElement.style.setProperty('--user-font-weight', e.target.checked ? '700' : '400');
            this.save();
        };

        // Load Typography
        this.load(fontSelect, boldCheck);
    }

    async save() {
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
        const fontSelect = this.parent.element.querySelector('#reader-font-family');
        const boldCheck = this.parent.element.querySelector('#reader-font-bold');

        settings.typography = {
            fontSize: this.parent.fontSize,
            lineHeight: this.parent.lineHeight || 2.0,
            fontFamily: fontSelect?.value || "'Inter', sans-serif",
            fontWeight: boldCheck?.checked ? '700' : '400'
        };
        await StorageHelper.set(StorageKeys.USER_SETTINGS, settings);
    }

    async load(fontSelect, boldCheck) {
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
        const typo = settings.typography || { fontSize: 100, lineHeight: 2.0, fontFamily: "'Inter', sans-serif", fontWeight: '400' };

        this.parent.fontSize = typo.fontSize || 100;
        this.parent.lineHeight = typo.lineHeight || 2.0;
        if (fontSelect) fontSelect.value = typo.fontFamily;
        if (boldCheck) boldCheck.checked = typo.fontWeight === '700';

        document.documentElement.style.setProperty('--user-font-family', typo.fontFamily);
        document.documentElement.style.setProperty('--user-font-weight', typo.fontWeight);
        document.documentElement.style.setProperty('--user-font-size', `${this.parent.fontSize}%`);
        document.documentElement.style.setProperty('--user-line-height', this.parent.lineHeight);

        const val = this.parent.element.querySelector('#font-val');
        if (val) val.textContent = this.parent.fontSize + '%';
        const lhVal = this.parent.element.querySelector('#lh-val');
        if (lhVal) lhVal.textContent = this.parent.lineHeight;
    }
}

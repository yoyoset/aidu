import { Component } from '../../components/component.js';
import { StorageHelper, StorageKeys } from '../../../utils/storage.js';
import { t } from '../../../locales/index.js';
import { notificationService } from '../../../utils/notification_service.js';
import styles from './settings.module.css'; // Re-use settings styles for consistency

export class ThemeModal extends Component {
    constructor(element) {
        super(element);
        this.settings = null;
    }

    async show() {
        this.settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
        this.render();
    }

    async initTheme() {
        // Load settings and apply variables without showing modal
        const settings = await StorageHelper.get(StorageKeys.USER_SETTINGS) || {};
        if (settings.theme) {
            const themeMap = {
                '--user-color-highlight-bg': settings.theme.highlightBg,
                '--user-color-highlight-text': settings.theme.highlightText,
                '--user-color-hover-bg': settings.theme.hoverBg,
                '--user-color-hover-text': settings.theme.hoverText,
                '--user-color-saved-bg': settings.theme.savedBg,
                '--user-color-saved-underline': settings.theme.savedUnderline,
                '--user-color-reader-active-bg': settings.theme.readerActiveBg,
                '--user-color-deep-marker': settings.theme.deepMarker,
                '--user-color-page-bg': settings.theme.pageBg
            };
            Object.entries(themeMap).forEach(([key, value]) => {
                if (value) document.documentElement.style.setProperty(key, value);
            });
        }
    }

    render() {
        if (this.overlay) this.overlay.remove();

        const overlay = document.createElement('div');
        overlay.className = styles.modalOverlay;
        overlay.onclick = (e) => {
            if (e.target === overlay) this.close();
        };

        const content = document.createElement('div');
        content.className = styles.modalContent;
        content.style.maxWidth = '450px';

        const presets = [
            { id: 'emerald', label: '默认', bg: '#ffffff', highlight: '#fff9c4', saved: '#e8f5e9', deep: '#7c4dff', hover: '#f0fdf4' },
            { id: 'sepia', label: '纸墨', bg: '#f4ecd8', highlight: '#e1d4b1', saved: '#efdbb2', deep: '#d4a017', hover: '#efdbb2' },
            { id: 'forest', label: '森林', bg: '#f1f8e9', highlight: '#dcedc8', saved: '#c5e1a5', deep: '#2e7d32', hover: '#dcedc8' },
            { id: 'ocean', label: '海洋', bg: '#e3f2fd', highlight: '#bbdefb', saved: '#90caf9', deep: '#1565c0', hover: '#e0f2fe' },
            { id: 'midnight', label: '暗夜', bg: '#121212', highlight: '#333333', saved: '#1b5e20', deep: '#bb86fc', hover: '#1e1e1e' }
        ];

        content.innerHTML = `
            <div class="${styles.modalHeader}">
                <div class="${styles.headerLeft}">
                    <h3 class="${styles.modalTitle}">${t('settings.appearance')}</h3>
                </div>
                <button class="${styles.closeBtn}">&times;</button>
            </div>
            
            <div class="${styles.scrollArea}" style="max-height: 75vh; padding: 20px;">
                <!-- 1. Palettes Matrix -->
                <div style="margin-bottom: 24px;">
                    <label class="${styles.label}" style="display:block; margin-bottom:12px; font-weight:600;">选择阅读氛围 (Presets)</label>
                    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">
                        ${presets.map(p => `
                            <button class="palette-preset" data-id="${p.id}" 
                                style="border: 2px solid transparent; border-radius: 12px; padding: 4px; background: #f5f5f5; cursor: pointer; transition: all 0.2s;">
                                <div style="height: 40px; background: ${p.bg}; border-radius: 8px; border: 1px solid #ddd; position: relative; overflow:hidden;">
                                    <div style="position:absolute; bottom:0; left:0; right:0; height:12px; background: ${p.saved}; opacity:0.6;"></div>
                                    <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:60%; height:4px; border-bottom: 2px dotted ${p.deep};"></div>
                                </div>
                                <div style="font-size: 11px; margin-top: 4px; color: #666;">${p.label}</div>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- 2. Live Preview Area -->
                <div style="margin-bottom: 24px; padding: 16px; border-radius: 12px; background: #f9f9f9; border: 1px solid #eee;">
                    <label class="${styles.label}" style="display:block; margin-bottom:10px; font-size: 0.85em; opacity: 0.7;">当前效果预览 (Live Preview)</label>
                    <div id="theme-preview" style="padding: 15px; border-radius: 8px; font-size: 1.1em; line-height: 1.6; border: 1px solid #ddd;">
                        Normally reading text. 
                        <span class="preview-saved" style="padding: 0 4px; border-radius: 2px;">Vocabulary</span> 
                        and 
                        <span class="preview-deep" style="border-bottom: 2.5px dotted #7c4dff; cursor: zoom-in;">AI Deep Analysis</span>.
                    </div>
                </div>

                <!-- 3. Advanced Settings (Collapsed) -->
                <details style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 15px;">
                    <summary style="cursor: pointer; color: var(--md-sys-color-primary); font-size: 0.9em; font-weight: 500;">
                        ${t('settings.theme.advanced') || '高级微调 (Advanced Adjustments)'}
                    </summary>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 15px;">
                        <div class="${styles.formGroup}"><label class="${styles.label}">选中背景</label>
                            <input type="color" id="color-highlight-bg" class="color-picker" value="${this.settings.theme?.highlightBg || '#fff9c4'}"></div>
                        <div class="${styles.formGroup}"><label class="${styles.label}">选中文字</label>
                            <input type="color" id="color-highlight-text" class="color-picker" value="${this.settings.theme?.highlightText || '#000000'}"></div>
                        <div class="${styles.formGroup}"><label class="${styles.label}">生词背景</label>
                            <input type="color" id="color-saved-bg" class="color-picker" value="${this.settings.theme?.savedBg || '#e8f5e9'}"></div>
                        <div class="${styles.formGroup}"><label class="${styles.label}">生词下划线</label>
                            <input type="color" id="color-saved-underline" class="color-picker" value="${this.settings.theme?.savedUnderline || '#a5d6a7'}"></div>
                        <div class="${styles.formGroup}"><label class="${styles.label}">页面背景色</label>
                            <input type="color" id="color-page-bg" class="color-picker" value="${this.settings.theme?.pageBg || '#ffffff'}"></div>
                        <div class="${styles.formGroup}"><label class="${styles.label}">解析标记色</label>
                            <input type="color" id="color-deep-marker" class="color-picker" value="${this.settings.theme?.deepMarker || '#7c4dff'}"></div>
                        <div class="${styles.formGroup}"><label class="${styles.label}">悬停背景色</label>
                            <input type="color" id="color-hover-bg" class="color-picker" value="${this.settings.theme?.hoverBg || '#f0fdf4'}"></div>
                        <div class="${styles.formGroup}"><label class="${styles.label}">悬停文字色</label>
                            <input type="color" id="color-hover-text" class="color-picker" value="${(this.settings.theme?.hoverText && this.settings.theme.hoverText !== 'inherit') ? this.settings.theme.hoverText : '#000000'}"></div>
                    </div>
                </details>
            </div>

            <div class="${styles.modalFooter}" style="display:flex; gap:10px;">
                <button id="reset-theme-btn" class="${styles.btnSecondary}" style="flex:1;">${t('settings.theme.reset')}</button>
                <button id="save-btn" class="${styles.btnPrimary}" style="flex:2;">${t('settings.save')}</button>
            </div>
        `;

        overlay.appendChild(content);
        this.element.appendChild(overlay);
        this.overlay = overlay;

        this.bindEvents(content, presets);
        this.updatePreview();
    }

    bindEvents(content, presets) {
        content.querySelector(`.${styles.closeBtn}`).onclick = () => this.close();

        // 1. Preset Clicks
        const presetButtons = content.querySelectorAll('.palette-preset');
        presetButtons.forEach(btn => {
            btn.onclick = () => {
                presetButtons.forEach(b => b.style.borderColor = 'transparent');
                btn.style.borderColor = 'var(--md-sys-color-primary)';

                const p = presets.find(x => x.id === btn.dataset.id);
                if (p) this.applyPreset(p);
            };
        });

        // 2. Individual Pickers
        const pickers = {
            '#color-highlight-bg': '--user-color-highlight-bg',
            '#color-highlight-text': '--user-color-highlight-text',
            '#color-saved-bg': '--user-color-saved-bg',
            '#color-saved-underline': '--user-color-saved-underline',
            '#color-page-bg': '--user-color-page-bg',
            '#color-deep-marker': '--user-color-deep-marker',
            '#color-hover-bg': '--user-color-hover-bg',
            '#color-hover-text': '--user-color-hover-text'
        };

        const stateMap = {
            '#color-highlight-bg': 'highlightBg',
            '#color-highlight-text': 'highlightText',
            '#color-saved-bg': 'savedBg',
            '#color-saved-underline': 'savedUnderline',
            '#color-page-bg': 'pageBg',
            '#color-deep-marker': 'deepMarker',
            '#color-hover-bg': 'hoverBg',
            '#color-hover-text': 'hoverText'
        };

        if (!this.settings.theme) this.settings.theme = {};

        Object.keys(pickers).forEach(sel => {
            const input = content.querySelector(sel);
            if (input) {
                input.oninput = (e) => {
                    const val = e.target.value;
                    document.documentElement.style.setProperty(pickers[sel], val);
                    this.settings.theme[stateMap[sel]] = val;
                    this.updatePreview();
                };
            }
        });

        // 3. Reset
        content.querySelector('#reset-theme-btn').onclick = async () => {
            if (await notificationService.confirm(t('settings.theme.resetConfirm'))) {
                this.applyPreset(presets[0]);
                this.settings.theme = {};
                this.updatePreview();
            }
        };

        // 4. Save
        content.querySelector('#save-btn').onclick = async () => {
            await StorageHelper.set(StorageKeys.USER_SETTINGS, this.settings);
            notificationService.toast(t('settings.theme.saved'));
            this.close();
        };
    }

    applyPreset(p) {
        if (!this.settings.theme) this.settings.theme = {};

        const mapping = {
            '--user-color-page-bg': p.bg,
            '--user-color-highlight-bg': p.highlight,
            '--user-color-saved-bg': p.saved,
            '--user-color-deep-marker': p.deep,
            '--user-color-hover-bg': p.hover,
            '--user-color-hover-text': p.bg === '#121212' ? '#ffffff' : '#000000'
        };

        Object.entries(mapping).forEach(([k, v]) => {
            document.documentElement.style.setProperty(k, v);
        });

        this.settings.theme = {
            ...this.settings.theme,
            pageBg: p.bg,
            highlightBg: p.highlight,
            savedBg: p.saved,
            deepMarker: p.deep,
            hoverBg: p.hover,
            hoverText: p.bg === '#121212' ? '#ffffff' : '#000000'
        };

        // Update Inputs if open
        const container = this.overlay;
        if (container) {
            const setVal = (id, val) => { const el = container.querySelector(id); if (el) el.value = val; };
            setVal('#color-page-bg', p.bg);
            setVal('#color-highlight-bg', p.highlight);
            setVal('#color-saved-bg', p.saved);
            setVal('#color-deep-marker', p.deep);
            setVal('#color-hover-bg', p.hover);
            setVal('#color-hover-text', p.bg === '#121212' ? '#ffffff' : '#000000');
        }

        this.updatePreview();
    }

    updatePreview() {
        const preview = this.overlay?.querySelector('#theme-preview');
        if (!preview) return;

        const t = this.settings.theme || {};
        preview.style.backgroundColor = t.pageBg || '#ffffff';
        preview.style.color = (t.pageBg === '#121212') ? '#e0e0e0' : '#333';

        const saved = preview.querySelector('.preview-saved');
        if (saved) {
            saved.style.backgroundColor = t.savedBg || 'rgba(30, 107, 63, 0.08)';
            saved.style.borderBottom = `1px solid ${t.savedUnderline || '#a5d6a7'}`;
        }

        const deep = preview.querySelector('.preview-deep');
        if (deep) {
            deep.style.borderBottomColor = t.deepMarker || '#7c4dff';
        }
    }

    close() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}

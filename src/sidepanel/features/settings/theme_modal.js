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
                '--user-color-saved-underline': settings.theme.savedUnderline
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
        content.style.maxWidth = '500px';
        // A bit narrower than full settings

        content.innerHTML = `
            <div class="${styles.modalHeader}">
                <div class="${styles.headerLeft}">
                    <h3 class="${styles.modalTitle}">${t('settings.appearance') || '调色盘 (Palette)'}</h3>
                </div>
                <button class="${styles.closeBtn}">&times;</button>
            </div>
            
            <div class="${styles.scrollArea}" style="max-height: 70vh;">
                <div class="${styles.formSection}">
                   <p style="color:#666; font-size:0.9em; margin-bottom:15px;">
                       自定义阅读器颜色，修改后实时生效。
                   </p>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <!-- Highlight -->
                        <div class="${styles.formGroup}">
                            <label class="${styles.label}">选中背景 (Highlight BG)</label>
                            <input type="color" id="color-highlight-bg" class="${styles.input} color-picker" 
                                style="height:40px; padding:2px; cursor:pointer;" 
                                value="${this.settings.theme?.highlightBg || '#fff9c4'}">
                        </div>
                        <div class="${styles.formGroup}">
                            <label class="${styles.label}">选中文字 (Highlight Text)</label>
                            <input type="color" id="color-highlight-text" class="${styles.input} color-picker" 
                                style="height:40px; padding:2px; cursor:pointer;"
                                value="${this.settings.theme?.highlightText || '#000000'}"> 
                        </div>

                        <!-- Hover -->
                        <div class="${styles.formGroup}">
                            <label class="${styles.label}">悬停背景 (Hover BG)</label>
                            <input type="color" id="color-hover-bg" class="${styles.input} color-picker" 
                             style="height:40px; padding:2px; cursor:pointer;"
                             value="${this.settings.theme?.hoverBg || '#dcfce7'}">
                        </div>
                        <div class="${styles.formGroup}">
                            <label class="${styles.label}">悬停文字 (Hover Text)</label>
                             <input type="color" id="color-hover-text" class="${styles.input} color-picker" 
                             style="height:40px; padding:2px; cursor:pointer;"
                             value="${this.settings.theme?.hoverText || '#14532d'}">
                        </div>

                         <!-- Saved Word -->
                        <div class="${styles.formGroup}">
                            <label class="${styles.label}">生词背景 (Saved BG)</label>
                            <input type="color" id="color-saved-bg" class="${styles.input} color-picker" 
                             style="height:40px; padding:2px; cursor:pointer;"
                             value="${this.settings.theme?.savedBg || '#e8f5e9'}">
                        </div>
                        <div class="${styles.formGroup}">
                            <label class="${styles.label}">生词下划线 (Saved Line)</label>
                             <input type="color" id="color-saved-underline" class="${styles.input} color-picker" 
                             style="height:40px; padding:2px; cursor:pointer;"
                             value="${this.settings.theme?.savedUnderline || '#a5d6a7'}">
                        </div>
                    </div>

                    <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                        <button id="reset-theme-btn" class="${styles.btnSecondary}" style="width:100%;">
                            恢复默认 (Reset Defaults)
                        </button>
                    </div>
                </div>
            </div>

            <div class="${styles.modalFooter}">
                <button id="save-btn" class="${styles.btnPrimary}" style="width:100%">${t('settings.save')}</button>
            </div>
        `;

        overlay.appendChild(content);
        this.element.appendChild(overlay);
        this.overlay = overlay;

        this.bindEvents(content);
    }

    bindEvents(content) {
        content.querySelector(`.${styles.closeBtn}`).onclick = () => this.close();

        // Save
        content.querySelector('#save-btn').onclick = async () => {
            await StorageHelper.set(StorageKeys.USER_SETTINGS, this.settings);
            notificationService.toast('颜色配置已保存');
            this.close();
        };

        // Theme Logic
        const applyTheme = (key, value) => {
            document.documentElement.style.setProperty(key, value);
        };

        const themeMap = {
            '#color-highlight-bg': '--user-color-highlight-bg',
            '#color-highlight-text': '--user-color-highlight-text',
            '#color-hover-bg': '--user-color-hover-bg',
            '#color-hover-text': '--user-color-hover-text',
            '#color-saved-bg': '--user-color-saved-bg',
            '#color-saved-underline': '--user-color-saved-underline'
        };

        const mapping = {
            '#color-highlight-bg': 'highlightBg',
            '#color-highlight-text': 'highlightText',
            '#color-hover-bg': 'hoverBg',
            '#color-hover-text': 'hoverText',
            '#color-saved-bg': 'savedBg',
            '#color-saved-underline': 'savedUnderline'
        };

        // Initialize object if missing
        if (!this.settings.theme) this.settings.theme = {};

        Object.keys(themeMap).forEach(selector => {
            const input = content.querySelector(selector);
            if (input) {
                input.oninput = (e) => {
                    const newVal = e.target.value;
                    // Apply to CSS
                    applyTheme(themeMap[selector], newVal);
                    // Update State
                    const key = mapping[selector];
                    if (key) this.settings.theme[key] = newVal;
                };
            }
        });

        // Reset
        const resetThemeBtn = content.querySelector('#reset-theme-btn');
        if (resetThemeBtn) {
            resetThemeBtn.onclick = async () => {
                const ok = await notificationService.confirm('确定要恢复默认颜色吗？');
                if (ok) {
                    const defaults = {
                        '--user-color-highlight-bg': '#fff9c4',
                        '--user-color-highlight-text': 'inherit',
                        '--user-color-hover-bg': '#dcfce7',
                        '--user-color-hover-text': '#14532d',
                        '--user-color-saved-bg': '#e8f5e9',
                        '--user-color-saved-underline': '#a5d6a7'
                    };
                    const defaultValues = {
                        highlightBg: '#fff9c4',
                        highlightText: '#000000',
                        hoverBg: '#dcfce7',
                        hoverText: '#14532d',
                        savedBg: '#e8f5e9',
                        savedUnderline: '#a5d6a7'
                    };

                    Object.entries(defaults).forEach(([k, v]) => applyTheme(k, v));

                    // Update DOM Inputs
                    content.querySelector('#color-highlight-bg').value = defaultValues.highlightBg;
                    content.querySelector('#color-highlight-text').value = defaultValues.highlightText;
                    content.querySelector('#color-hover-bg').value = defaultValues.hoverBg;
                    content.querySelector('#color-hover-text').value = defaultValues.hoverText;
                    content.querySelector('#color-saved-bg').value = defaultValues.savedBg;
                    content.querySelector('#color-saved-underline').value = defaultValues.savedUnderline;

                    // Update State
                    this.settings.theme = { ...defaultValues };
                }
            };
        }
    }

    close() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}

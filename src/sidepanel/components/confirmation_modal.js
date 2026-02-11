

import { t } from '../../locales/index.js';

export class ConfirmationModal {
    constructor(container) {
        this.container = container;
        this.overlay = null;
        this.init();
    }

    init() {
        if (!document.getElementById('modal-styles')) {
            const style = document.createElement('style');
            style.id = 'modal-styles';
            style.textContent = `
                .confirm-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2147483647 !important; 
                    transition: opacity 0.2s, visibility 0.2s;
                    visibility: hidden;
                    opacity: 0;
                }
                .confirm-overlay.active {
                    opacity: 1;
                    visibility: visible;
                }
                .confirm-box {
                    background: #ffffff;
                    color: #000000;
                    padding: 24px;
                    border-radius: 16px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                    width: 90%;
                    max-width: 320px;
                    transform: scale(0.9);
                    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                    text-align: center;
                    opacity: 0;
                    margin: auto;
                }
                .confirm-overlay.active .confirm-box {
                    transform: scale(1);
                    opacity: 1;
                }
                .confirm-title {
                    font-size: 1.125rem;
                    font-weight: 700;
                    margin-bottom: 12px;
                    color: var(--md-sys-color-on-surface);
                }
                .confirm-text {
                    color: var(--md-sys-color-on-surface-variant);
                    margin-bottom: 24px;
                    line-height: 1.5;
                    font-size: 0.95rem;
                }
                .confirm-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }
                .confirm-btn {
                    padding: 10px 16px;
                    border-radius: var(--md-sys-radius-pill);
                    border: none;
                    cursor: pointer;
                    font-weight: 600;
                    flex: 1;
                    transition: all 0.2s;
                    font-size: 0.9rem;
                }
                .btn-cancel { 
                    background: var(--md-sys-color-surface-variant); 
                    color: var(--md-sys-color-on-surface-variant); 
                }
                .btn-delete { 
                    background: var(--md-sys-color-primary); 
                    color: var(--md-sys-color-on-primary); 
                }
                .btn-delete.destructive {
                    background: var(--md-sys-color-error);
                    color: var(--md-sys-color-on-error);
                }
            `;
            document.head.appendChild(style);
        }

        this.overlay = document.createElement('div');
        this.overlay.className = 'confirm-overlay';
        this.overlay.innerHTML = `
            <div class="confirm-box">
                <div class="confirm-title"></div>
                <div class="confirm-text"></div>
                <div class="confirm-prompt" style="display:none; margin-bottom: 20px;">
                    <input type="text" id="confirm-input" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="confirm-actions">
                    <button class="confirm-btn btn-cancel">${t('common.cancel')}</button>
                    <button class="confirm-btn btn-delete">${t('common.confirm')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        this.overlay.querySelector('.btn-cancel').onclick = () => this.hide();
    }

    /**
     * @param {Object} options
     * @param {string} options.type - 'alert' | 'confirm' | 'prompt'
     */
    show({
        title = t('confirm.defaultTitle') || 'Confirm Action',
        message = t('confirm.defaultMessage') || 'Are you sure?',
        onConfirm,
        onCancel,
        confirmText = t('common.confirm'),
        cancelText = t('common.cancel'),
        isDestructive = false,
        type = 'confirm',
        defaultValue = ''
    }) {
        this.overlay.querySelector('.confirm-title').textContent = title;
        this.overlay.querySelector('.confirm-text').textContent = message;

        const confirmBtn = this.overlay.querySelector('.btn-delete');
        const cancelBtn = this.overlay.querySelector('.btn-cancel');
        const promptContainer = this.overlay.querySelector('.confirm-prompt');
        const input = promptContainer.querySelector('input');

        confirmBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;
        confirmBtn.classList.toggle('destructive', isDestructive);

        // 切换模式
        cancelBtn.style.display = type === 'alert' ? 'none' : 'block';
        promptContainer.style.display = type === 'prompt' ? 'block' : 'none';
        if (type === 'prompt') {
            input.value = defaultValue;
            setTimeout(() => input.focus(), 100);
        }

        confirmBtn.onclick = () => {
            const value = type === 'prompt' ? input.value : true;
            if (onConfirm) onConfirm(value);
            this.hide();
        };

        cancelBtn.onclick = () => {
            if (onCancel) onCancel();
            this.hide();
        };

        this.overlay.classList.add('active');
    }

    hide() {
        this.overlay.classList.remove('active');
    }
}

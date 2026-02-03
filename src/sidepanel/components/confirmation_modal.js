

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
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    opacity: 0;
                    transition: opacity 0.2s;
                    visibility: hidden;
                }
                .confirm-overlay.active {
                    opacity: 1;
                    visibility: visible;
                }
                .confirm-box {
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                    width: 90%;
                    max-width: 320px;
                    transform: scale(0.95);
                    transition: transform 0.2s;
                    text-align: center;
                }
                .confirm-overlay.active .confirm-box {
                    transform: scale(1);
                }
                .confirm-title {
                    font-size: 1.1em;
                    font-weight: bold;
                    margin-bottom: 12px;
                    color: #333;
                }
                .confirm-text {
                    color: #666;
                    margin-bottom: 24px;
                    line-height: 1.4;
                }
                .confirm-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }
                .confirm-btn {
                    padding: 8px 16px;
                    border-radius: 6px;
                    border: none;
                    cursor: pointer;
                    font-weight: 500;
                    flex: 1;
                    transition: opacity 0.2s;
                }
                .confirm-btn:hover { opacity: 0.8; }
                .btn-cancel { background: #f0f0f0; color: #333; }
                .btn-delete { background: #ef4444; color: white; }
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
        title = t('confirm.defaultTitle'),
        message = t('confirm.defaultMessage'),
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
        confirmBtn.style.background = isDestructive ? '#ef4444' : '#2e7d32';

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

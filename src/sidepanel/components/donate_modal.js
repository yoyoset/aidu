import { t } from '../../locales/index.js';

/**
 * DonateModal - 支持作者弹窗
 */
export class DonateModal {
    constructor() {
        this.overlay = null;
        this.activeTab = 'alipay';
        this.escHandler = null;
    }

    show() {
        if (this.overlay) this.overlay.remove();

        this.overlay = document.createElement('div');
        this.overlay.className = 'donate-overlay';
        this.overlay.onclick = (e) => { if (e.target === this.overlay) this.close(); };

        const modal = document.createElement('div');
        modal.className = 'donate-modal';

        // Header
        const header = document.createElement('div');
        header.className = 'donate-header';

        const title = document.createElement('h3');
        title.textContent = t('donate.title');
        header.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'donate-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => this.close();
        header.appendChild(closeBtn);

        // Author Card
        const author = document.createElement('div');
        author.className = 'donate-author';

        const avatar = document.createElement('img');
        avatar.src = chrome.runtime.getURL('src/icons/donate/SUlogo.jpg');
        avatar.alt = 'Avatar';
        avatar.className = 'donate-avatar';
        avatar.onerror = () => { avatar.style.display = 'none'; };

        const info = document.createElement('div');
        info.className = 'donate-info';

        const name = document.createElement('div');
        name.className = 'donate-name';
        name.textContent = t('donate.author');

        const link = document.createElement('a');
        link.href = 'https://squareuncle.com';
        link.target = '_blank';
        link.className = 'donate-link';
        link.textContent = '🔗 ' + t('donate.website');

        info.appendChild(name);
        info.appendChild(link);
        author.appendChild(avatar);
        author.appendChild(info);

        // Thanks
        const thanks = document.createElement('p');
        thanks.className = 'donate-thanks';
        thanks.textContent = t('donate.thanks');

        // Tabs
        const tabs = document.createElement('div');
        tabs.className = 'donate-tabs';
        ['alipay', 'wechat', 'paypal'].forEach(key => {
            const btn = document.createElement('button');
            btn.className = `donate-tab ${this.activeTab === key ? 'active' : ''}`;
            btn.textContent = t(`donate.${key}`);
            btn.onclick = () => {
                this.activeTab = key;
                this.updateQR(modal);
                tabs.querySelectorAll('.donate-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
            tabs.appendChild(btn);
        });

        // QR Container
        const qrContainer = document.createElement('div');
        qrContainer.className = 'donate-qr';
        qrContainer.id = 'donate-qr-container';

        modal.appendChild(header);
        modal.appendChild(author);
        modal.appendChild(thanks);
        modal.appendChild(tabs);
        modal.appendChild(qrContainer);

        this.overlay.appendChild(modal);
        document.body.appendChild(this.overlay);

        this.updateQR(modal);
        this.injectStyles();

        // ESC key handler
        this.escHandler = (e) => {
            if (e.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this.escHandler);
    }

    updateQR(modal) {
        const container = modal.querySelector('#donate-qr-container');
        container.innerHTML = '';

        const imgMap = {
            alipay: 'src/icons/donate/donate_alipay.png',
            wechat: 'src/icons/donate/donate_wechat.png',
            paypal: 'src/icons/donate/donate_paypal.png'
        };

        const img = document.createElement('img');
        img.src = chrome.runtime.getURL(imgMap[this.activeTab]);
        img.alt = this.activeTab;
        img.className = 'donate-qr-img';
        img.onerror = () => {
            img.style.display = 'none';
            tip.textContent = t('common.error') + ': Image not found';
        };

        const tip = document.createElement('p');
        tip.className = 'donate-scan-tip';
        tip.textContent = t('donate.scanTip');

        container.appendChild(img);
        container.appendChild(tip);
    }

    close() {
        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
            this.escHandler = null;
        }
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }

    injectStyles() {
        if (document.getElementById('donate-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'donate-modal-styles';
        style.textContent = `
            .donate-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                animation: fadeIn 0.2s;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .donate-modal {
                background: white;
                border-radius: 16px;
                width: 90%;
                max-width: 360px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.25);
                overflow: hidden;
                animation: slideUp 0.3s ease-out;
            }
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .donate-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
                color: white;
            }
            .donate-header h3 {
                margin: 0;
                font-size: 1.2em;
            }
            .donate-close {
                background: none;
                border: none;
                color: white;
                font-size: 1.5em;
                cursor: pointer;
                opacity: 0.8;
            }
            .donate-close:hover { opacity: 1; }
            .donate-author {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 20px;
                border-bottom: 1px solid #eee;
            }
            .donate-avatar {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid #eee;
            }
            .donate-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .donate-name {
                font-weight: bold;
                font-size: 1.1em;
                color: #333;
            }
            .donate-link {
                color: #3b82f6;
                text-decoration: none;
                font-size: 0.9em;
            }
            .donate-link:hover { text-decoration: underline; }
            .donate-thanks {
                padding: 12px 20px;
                margin: 0;
                color: #666;
                font-size: 0.9em;
                line-height: 1.5;
                text-align: center;
                background: #fafafa;
            }
            .donate-tabs {
                display: flex;
                border-bottom: 1px solid #eee;
            }
            .donate-tab {
                flex: 1;
                padding: 12px;
                border: none;
                background: none;
                cursor: pointer;
                font-size: 0.95em;
                color: #666;
                transition: all 0.2s;
            }
            .donate-tab:hover { background: #f5f5f5; }
            .donate-tab.active {
                color: #ee5a5a;
                font-weight: bold;
                border-bottom: 2px solid #ee5a5a;
            }
            .donate-qr {
                padding: 20px;
                text-align: center;
                max-width: 100%;
            }
            .donate-qr-img {
                max-width: 180px;
                max-height: 180px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                object-fit: contain;
            }
            .donate-scan-tip {
                margin: 12px 0 0;
                color: #999;
                font-size: 0.85em;
            }
        `;
        document.head.appendChild(style);
    }
}

// Singleton instance
let donateModalInstance = null;

export function showDonateModal() {
    if (!donateModalInstance) {
        donateModalInstance = new DonateModal();
    }
    donateModalInstance.show();
}

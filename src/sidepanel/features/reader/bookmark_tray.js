import { Component } from '../../components/component.js';
import styles from './reader_tray.module.css';
import { t } from '../../../locales/index.js';

export class BookmarkTray extends Component {
    constructor(element, callbacks) {
        super(element);
        this.callbacks = callbacks || {}; // { onLocate: (index) => ... }
        this.isOpen = false;
        this.parent = null; // Will set in render if needed
    }

    async render(readerInstance) {
        this.reader = readerInstance;

        // 1. Tray Panel Container
        const tray = document.createElement('div');
        tray.className = styles.analysisTray || 'analysisTray'; // Reuse analysis tray layout
        this.trayPanel = tray;

        // 2. Header
        const header = document.createElement('div');
        header.className = styles.trayHeader || 'trayHeader';
        header.innerHTML = `
            <div style="font-weight:bold; color:#1e293b; display:flex; align-items:center; gap:8px;">
                <i class="ri-bookmark-3-fill" style="color:#7c4dff"></i>
                <span>${t('reader.bookmarks') || 'Bookmarks'}</span>
            </div>
            <button style="background:none; border:none; font-size:1.2em; cursor:pointer; color:#94a3b8; padding:4px; display:flex; align-items:center; justify-content:center;"><i class="ri-close-line"></i></button>
        `;
        header.querySelector('button').onclick = () => this.toggle(false);

        const content = document.createElement('div');
        content.className = styles.trayContent || 'trayContent';
        this.contentArea = content;

        tray.appendChild(header);
        tray.appendChild(content);

        this.element.appendChild(tray);

        this.refresh();
    }

    refresh() {
        if (!this.contentArea || !this.reader) return;
        this.contentArea.innerHTML = '';

        const bookmarkIndices = this.reader.draft?.bookmarkIndices || [];
        if (bookmarkIndices.length === 0) {
            this.contentArea.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:40px 10px; font-size:0.9em;">${t('reader.bookmarks.empty') || '暂无书签，双击句子即可收藏'}</div>`;
            return;
        }

        // Sort indices to show them in reading order
        [...bookmarkIndices].sort((a, b) => a - b).forEach(idx => {
            const sentence = this.reader.sentences[idx];
            if (!sentence) return;

            const card = document.createElement('div');
            card.className = styles.analysisCard || 'analysisCard';
            card.style.borderLeft = '3px solid #7c4dff';

            card.innerHTML = `
                <div style="font-size:0.9em; color:#1e293b; line-height:1.5; margin-bottom:4px;">${sentence.original_text}</div>
                <div style="font-size:0.8em; color:#64748b;">${sentence.translation?.substring(0, 30)}...</div>
                <div style="margin-top:8px; display:flex; align-items:center; gap:4px; font-size:0.7em; color:#94a3b8;">
                    <i class="ri-map-pin-line"></i> ${t('deep.retrace') || '点击跳转'}
                </div>
            `;

            card.onclick = () => {
                if (this.callbacks.onLocate) this.callbacks.onLocate(idx);
                this.toggle(false);
            };
            this.contentArea.appendChild(card);
        });
    }

    toggle(force) {
        this.isOpen = force !== undefined ? force : !this.isOpen;
        if (this.trayPanel) {
            this.trayPanel.classList.toggle(styles.open || 'open', this.isOpen);
            if (this.isOpen) this.refresh();
        }
    }

    destroy() {
        if (this.trayPanel && this.trayPanel.parentNode) {
            this.trayPanel.parentNode.removeChild(this.trayPanel);
        }
        this.trayPanel = null;
    }
}

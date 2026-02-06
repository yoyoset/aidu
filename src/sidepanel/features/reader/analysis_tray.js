import { Component } from '../../components/component.js';
import styles from './reader.module.css';
import { t } from '../../../locales/index.js';
import { analysisQueue } from '../../../services/analysis_queue_manager.js';
import { showDeepDiveModal } from '../../components/deep_dive_modal.js';

export class AnalysisTray extends Component {
    constructor(element, callbacks) {
        super(element);
        this.callbacks = callbacks || {}; // { onLocate: (lemma) => ... }
        this.isOpen = false;
        this.words = []; // List of analyzed words
    }

    async render() {
        this.element.innerHTML = '';

        // 1. Tray Panel Container (Absolute positioned)
        const tray = document.createElement('div');
        tray.className = styles.analysisTray || 'analysisTray';
        this.trayPanel = tray;

        // 2. Head with Title and Close button
        const header = document.createElement('div');
        header.className = styles.trayHeader || 'trayHeader';
        header.innerHTML = `
            <div style="font-weight:bold; color:#1e293b; display:flex; align-items:center; gap:8px;">
                <span>${t('deep.analysis')}</span>
                <span class="${styles.badge || 'badge'}" style="display:none; position:static;">0</span>
            </div>
            <button style="background:none; border:none; font-size:1.2em; cursor:pointer; color:#94a3b8; padding:4px; display:flex; align-items:center; justify-content:center;"><i class="ri-close-line"></i></button>
        `;
        header.querySelector('button').onclick = () => this.toggle(false);
        this.badge = header.querySelector(`.${styles.badge || 'badge'}`);

        const content = document.createElement('div');
        content.className = styles.trayContent || 'trayContent';
        this.contentArea = content;

        tray.appendChild(header);
        tray.appendChild(content);

        this.element.appendChild(tray);

        // 3. Sync Existing Cache (Backwards Traceability)
        const currentCache = analysisQueue.cache;
        if (currentCache && currentCache.size > 0) {
            currentCache.forEach((data, lemma) => {
                this.addWord(lemma, data);
            });
        }

        // 4. Listen to Queue & Store Unsubscribe Function
        this.unsubscribe = analysisQueue.subscribe(({ lemma, status, data }) => {
            if (status === 'ready') {
                this.addWord(lemma, data);
            }
        });
    }

    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        if (this.trayPanel && this.trayPanel.parentNode) {
            this.trayPanel.parentNode.removeChild(this.trayPanel);
        }
        this.trayPanel = null;
        this.words = [];
    }

    toggle(force) {
        this.isOpen = force !== undefined ? force : !this.isOpen;
        if (this.trayPanel) {
            this.trayPanel.classList.toggle(styles.open || 'open', this.isOpen);
        }
    }

    addWord(lemma, data) {
        if (this.words.some(w => w.lemma === lemma)) return;
        this.words.push({ lemma, data });
        this.updateBadge();
        this.renderList();
    }

    updateBadge() {
        if (!this.badge) return;
        const count = this.words.length;
        if (count > 0) {
            this.badge.textContent = count;
            this.badge.style.display = 'inline-block';
        } else {
            this.badge.style.display = 'none';
        }
    }

    renderList() {
        if (!this.contentArea) return;
        this.contentArea.innerHTML = '';

        if (this.words.length === 0) {
            this.contentArea.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:40px 10px; font-size:0.9em;">暂无解析，点击文章单词开始探索</div>`;
            return;
        }

        this.words.slice().reverse().forEach(item => {
            const card = document.createElement('div');
            card.className = styles.analysisCard || 'analysisCard';

            const summary = item.data.etymology ? item.data.etymology.substring(0, 40) + '...' : t('deep.sentence');

            card.innerHTML = `
                <div class="${styles.word}">${item.lemma}</div>
                <div style="font-size:0.85em; color:#64748b; line-height:1.4;">${summary}</div>
                <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.75em; color:#94a3b8; display:flex; align-items:center; gap:4px;"><i class="ri-map-pin-line"></i> ${t('deep.retrace') || '追溯原文'}</span>
                    <button style="font-size:0.8em; color:#7c4dff; background:none; border:none; cursor:pointer; font-weight:bold; display:flex; align-items:center; gap:2px;">${t('deep.details') || '详情'} <i class="ri-arrow-right-s-line"></i></button>
                </div>
            `;

            card.onclick = (e) => {
                if (e.target.tagName === 'BUTTON') {
                    showDeepDiveModal({ word: item.lemma }, item.data);
                } else {
                    if (this.callbacks.onLocate) this.callbacks.onLocate(item.lemma);
                    this.toggle(false); // Close tray on locate
                }
            };
            this.contentArea.appendChild(card);
        });
    }
}

import { Component } from '../../components/component.js';
import layoutStyles from '../builder/styles/dashboard_layout.module.css';
import navStyles from '../builder/styles/dashboard_nav.module.css';
import itemStyles from '../builder/styles/dashboard_items.module.css';
import { vocabService } from '../../../services/vocab_service.js';
import { HandwritingSheet } from './handwriting_sheet.js';
import { VocabReview } from './vocab_review.js';
import { dictionaryService } from '../../../services/dictionary_service.js';
import { SyncService } from '../../../services/sync_service.js';
import { t } from '../../../locales/index.js';
import { notificationService } from '../../../utils/notification_service.js';

// Components
import { VocabItem } from './components/vocab_item.js';
import { VocabActions } from './components/vocab_actions.js';

export class VocabView extends Component {
    constructor(element) {
        super(element);
        this.filter = 'all'; // 'all' | 'today' | 'week'
        this.filter = 'all'; // 'all' | 'today' | 'week' | 'mastered'
        this.selectedSet = new Set(); // Multi-select tracking
        this.displayLimit = 50; // Pagination limit
        this.itemRenderer = new VocabItem(this);
        this.actions = new VocabActions(this);
    }

    async render() {
        this.clear();
        this.element.style.position = 'relative'; // Ensure positioning context

        // 1. Fetch & Sort
        const vocab = await vocabService.getAll();
        this.fullList = Object.values(vocab).sort((a, b) => b.addedAt - a.addedAt);

        // 2. Filter
        let list = this.fullList;
        if (this.filter === 'today') {
            const today = new Date().setHours(0, 0, 0, 0);
            list = list.filter(v => v.addedAt >= today);
        } else if (this.filter === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            list = list.filter(v => v.addedAt >= weekAgo.getTime());
        } else if (this.filter === 'forgot') {
            list = list.filter(v => v.lastGrade === 0);
        } else if (this.filter === 'hard') {
            list = list.filter(v => v.lastGrade === 1);
        } else if (this.filter === 'recognized' || this.filter === 'good') {
            list = list.filter(v => v.stage === 'review' || v.lastGrade === 2);
        } else if (this.filter === 'easy') {
            list = list.filter(v => v.lastGrade === 3);
        } else if (this.filter === 'mastered') {
            // Show ONLY mastered
            list = list.filter(v => v.stage === 'mastered');
        } else if (this.filter === 'loading') {
            // Show only incomplete
            list = list.filter(v => !v.meaning || v.meaning === 'Loading...' || v.meaning === t('dict.loading'));
        } else if (this.filter === 'all') {
            // Show all ACTIVE (exclude mastered to keep "loop" clean, as per request?) 
            // User asked for "Mastered" filter, implies "All" might usually hide them? 
            // Let's keep "All" as truly ALL for now, or maybe "Active" vs "Mastered".
            // Standard "All" usually means everything. Let's stick to that but sort Mastered to bottom?
            // Actually, usually users want to see their "To Do" list. 
            // Let's leave 'all' as is, but 'mastered' option allows specifically viewing them.
        }
        this.filteredList = list; // Save for partial updates

        // 3. Render API
        const container = document.createElement('div');
        container.classList.add(itemStyles['vocab-grid']);
        this.listContainer = container; // Reference

        // Header (Actions) - Container for easy refreshing
        this.actionsContainer = document.createElement('div');
        this.renderActions(this.actionsContainer, list);
        container.appendChild(this.actionsContainer);

        // List Content
        const listContent = document.createElement('div');
        this.listContent = listContent;

        const visibleList = list.slice(0, this.displayLimit);

        if (list.length === 0) {
            listContent.innerHTML = `<div style="color:var(--md-sys-color-on-surface-variant); text-align:center; padding:40px;">${t('vocab.empty')}</div>`;
        } else {
            visibleList.forEach(v => {
                const item = this.createVocabItem(v);
                listContent.appendChild(item);
            });

            // Load More / Pagination
            if (list.length > this.displayLimit) {
                const loadMoreDiv = document.createElement('div');
                loadMoreDiv.style.textAlign = 'center';
                loadMoreDiv.style.padding = '20px';

                const loadMoreBtn = document.createElement('button');
                loadMoreBtn.className = navStyles['btn-secondary'];
                loadMoreBtn.innerHTML = `${t('vocab.loadMore')} (${this.displayLimit} / ${list.length})`;
                loadMoreBtn.onclick = () => {
                    this.saveScroll();
                    const currentLimit = this.displayLimit;
                    const nextLimit = currentLimit + 50;
                    const nextBatch = list.slice(currentLimit, nextLimit);

                    // Remove self
                    loadMoreDiv.remove();

                    // Append new items
                    nextBatch.forEach(v => {
                        const item = this.createVocabItem(v);
                        listContent.appendChild(item);
                    });

                    this.displayLimit = nextLimit;

                    // Add new Load More if needed
                    if (list.length > this.displayLimit) {
                        const newLoadMoreDiv = document.createElement('div');
                        newLoadMoreDiv.style.textAlign = 'center';
                        newLoadMoreDiv.style.padding = '20px';

                        const newBtn = document.createElement('button');
                        newBtn.className = navStyles['btn-secondary'];
                        newBtn.innerHTML = `${t('vocab.loadMore')} (${this.displayLimit} / ${list.length})`;
                        newBtn.onclick = loadMoreBtn.onclick; // Re-bind SAME logic

                        newLoadMoreDiv.appendChild(newBtn);
                        listContent.appendChild(newLoadMoreDiv);
                    }

                    this.restoreScroll();
                };

                loadMoreDiv.appendChild(loadMoreBtn);
                listContent.appendChild(loadMoreDiv);
            }
        }

        container.appendChild(listContent);
        this.element.appendChild(container);

        // Restore Scroll
        this.restoreScroll();
    }

    // Refresh only the top bar (Selection stats/buttons) without re-rendering list
    refreshActionBar() {
        if (this.actionsContainer && this.filteredList) {
            this.actionsContainer.innerHTML = '';
            this.actions.render(this.actionsContainer, this.filteredList);
        }
    }

    renderActions(container, list) {
        this.actions.render(container, list);
    }

    updateCheckboxes() {
        if (!this.listContent) return;
        const checkboxes = this.listContent.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            const key = cb.dataset.key;
            cb.checked = this.selectedSet.has(key);
        });
    }

    saveScroll() {
        this.scrollTop = this.element.scrollTop;
        this.windowScroll = window.scrollY;
    }

    restoreScroll() {
        if (this.scrollTop) this.element.scrollTop = this.scrollTop;
        if (this.windowScroll) window.scrollTo(0, this.windowScroll);
    }

    createVocabItem(v) {
        return this.itemRenderer.render(v);
    }

    styleActionBtn(btn, color) {
        btn.style.background = 'transparent';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '1.25rem';
        btn.style.padding = '8px';
        btn.style.color = color || 'var(--md-sys-color-on-surface-variant)';
        btn.style.borderRadius = 'var(--md-sys-radius-sm)';
        btn.style.display = 'inline-flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
        btn.style.lineHeight = '0';

        btn.onmouseover = () => {
            btn.style.background = 'var(--md-sys-state-hover)';
            btn.style.transform = 'scale(1.08)';
        };
        btn.onmouseout = () => {
            btn.style.background = 'transparent';
            btn.style.transform = 'scale(1)';
        };
    }

    exportVocab(list) {
        if (!list || list.length === 0) {
            notificationService.alert(t('vocab.export.empty'));
            return;
        }

        let csv = '\uFEFFWord,POS,Phonetic,Meaning,Level,Context,AddedAt\n';
        list.forEach(v => {
            const row = [
                v.word,
                v.pos,
                v.phonetic,
                v.meaning,
                v.level,
                `"${(v.context || '').replace(/"/g, '""')}"`,
                new Date(v.addedAt).toISOString()
            ];
            csv += row.join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `aidu_vocab_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }



    showHelpModal() {
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.5)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '9999';

        const content = document.createElement('div');
        content.className = 'vocab-help-modal-content';
        content.style.background = 'white';
        content.style.padding = '24px';
        content.style.borderRadius = '12px';
        content.style.maxWidth = '400px';
        content.style.width = '90%';
        content.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
        content.style.lineHeight = '1.6';

        content.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h2 style="margin:0; font-size:1.4em; color:var(--md-sys-color-primary);">${t('vocab.help.title')}</h2>
                <button id="close-help" style="background:none; border:none; font-size:1.5em; cursor:pointer; color:var(--md-sys-color-on-surface-variant);">&times;</button>
            </div>
            
                <div style="display:flex; gap:12px; margin-bottom:12px;">
                    <div style="font-size:1.5rem; color:var(--md-sys-color-on-surface-variant);"><i class="ri-download-2-line"></i></div>
                    <div>
                        <strong style="color:var(--md-sys-color-on-surface);">${t('vocab.help.step1')}</strong>
                        <div style="color:var(--md-sys-color-on-surface-variant); font-size:0.9em;">${t('vocab.help.step1.desc')}</div>
                    </div>
                </div>

                <div style="display:flex; gap:12px; margin-bottom:12px;">
                    <div style="font-size:1.5rem; color:var(--md-sys-color-on-surface-variant);"><i class="ri-delete-bin-line"></i></div>
                    <div>
                        <strong style="color:var(--md-sys-color-on-surface);">${t('vocab.help.step2')}</strong>
                        <div style="color:var(--md-sys-color-on-surface-variant); font-size:0.9em;">${t('vocab.help.step2.desc')}</div>
                    </div>
                </div>

                <div style="display:flex; gap:12px; margin-bottom:12px;">
                    <div style="font-size:1.5rem; color:var(--md-sys-color-on-surface-variant);"><i class="ri-brain-line"></i></div>
                    <div>
                        <strong style="color:var(--md-sys-color-on-surface);">${t('vocab.help.step3')}</strong>
                        <div style="color:var(--md-sys-color-on-surface-variant); font-size:0.9em;">${t('vocab.help.step3.desc')}</div>
                    </div>
                </div>

                <div style="display:flex; gap:12px; margin-bottom:12px;">
                    <div style="font-size:1.5rem; color:var(--md-sys-color-primary);"><i class="ri-medal-2-line"></i></div>
                    <div>
                        <strong style="color:var(--md-sys-color-on-surface);">${t('vocab.help.step4')}</strong>
                        <div style="color:var(--md-sys-color-on-surface-variant); font-size:0.9em;">${t('vocab.help.step4.desc')}</div>
                    </div>
                </div>
            </div>
            
            <div style="text-align:right;">
                <button id="ok-help" style="background:var(--md-sys-color-primary); color:var(--md-sys-color-on-primary); border:none; padding:10px 24px; border-radius:100px; cursor:pointer; font-weight:500;">${t('common.gotIt')}</button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        const close = () => {
            document.body.removeChild(modal);
        };

        modal.querySelector('#close-help').onclick = close;
        modal.querySelector('#ok-help').onclick = close;
        modal.onclick = (e) => {
            if (e.target === modal) close();
        };
    }
}

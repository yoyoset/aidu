import { Component } from '../../components/component.js';
import styles from '../builder/dashboard.module.css'; // Reusing dashboard styles for consistency
import { vocabService } from '../../../services/vocab_service.js';
import { HandwritingSheet } from './handwriting_sheet.js';
import { VocabReview } from './vocab_review.js';
import { dictionaryService } from '../../../services/dictionary_service.js';
import { SyncService } from '../../../services/sync_service.js';
import { t } from '../../../locales/index.js';
import { notificationService } from '../../../utils/notification_service.js';

export class VocabView extends Component {
    constructor(element) {
        super(element);
        this.filter = 'all'; // 'all' | 'today' | 'week'
        this.filter = 'all'; // 'all' | 'today' | 'week' | 'mastered'
        this.selectedSet = new Set(); // Multi-select tracking
        this.displayLimit = 50; // Pagination limit
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
        container.classList.add(styles.draftList);
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
                loadMoreBtn.className = styles.btnSecondary;
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

                        // Recursively recreate the button (simplified inline for now or call render logic?)
                        // Actually, we can just re-append the same logic loop or a helper.
                        // Easiest is to trigger a render IF we needed to, but we want to avoid it.
                        // Let's copy the button creation logic here for the new button.
                        const newBtn = document.createElement('button');
                        newBtn.className = styles.btnSecondary;
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
            this.renderActions(this.actionsContainer, this.filteredList);
        }
    }

    renderActions(container, list) {
        const actionsDiv = document.createElement('div');
        actionsDiv.style.padding = '10px 16px';
        actionsDiv.style.display = 'flex';
        actionsDiv.style.justifyContent = 'space-between';
        actionsDiv.style.alignItems = 'center';
        actionsDiv.style.borderBottom = '1px solid var(--md-sys-color-outline-variant)';
        actionsDiv.style.marginBottom = '10px';
        actionsDiv.style.gap = '10px';
        actionsDiv.style.background = 'var(--md-sys-color-surface)';
        actionsDiv.style.position = 'sticky';
        actionsDiv.style.top = '0';
        actionsDiv.style.zIndex = '10'; // Keep header visible

        // Filter Group
        const filterGroup = document.createElement('div');
        filterGroup.style.display = 'flex';
        filterGroup.style.alignItems = 'center';
        filterGroup.style.gap = '8px';

        const filterSelect = document.createElement('select');
        filterSelect.style.padding = '4px 8px';
        filterSelect.style.borderRadius = '4px';
        filterSelect.style.border = '1px solid var(--md-sys-color-outline-variant)';
        filterSelect.innerHTML = `
            <option value="all" ${this.filter === 'all' ? 'selected' : ''}>${t('vocab.filter.all')}</option>
            <option value="today" ${this.filter === 'today' ? 'selected' : ''}>${t('vocab.filter.today')}</option>
            <option value="week" ${this.filter === 'week' ? 'selected' : ''}>${t('vocab.filter.week')}</option>
            <option value="mastered" ${this.filter === 'mastered' ? 'selected' : ''}>${t('vocab.filter.mastered')}</option>
            <option value="loading" ${this.filter === 'loading' ? 'selected' : ''}>${t('common.loading')}</option>
        `;
        filterSelect.onchange = (e) => {
            this.filter = e.target.value;
            this.displayLimit = 50; // Reset pagination on filter change
            this.selectedSet.clear(); // Clear selection on filter change
            this.render();
        };

        // Help Button
        const helpBtn = document.createElement('button');
        helpBtn.innerHTML = '<i class="ri-question-line"></i>';
        helpBtn.title = t('vocab.actions.help');
        helpBtn.style.background = 'none';
        helpBtn.style.border = 'none';
        helpBtn.style.cursor = 'pointer';
        helpBtn.style.fontSize = '1.25rem';
        helpBtn.style.display = 'flex';
        helpBtn.style.alignItems = 'center';
        helpBtn.style.color = 'var(--md-sys-color-on-surface-variant)';
        helpBtn.style.padding = '4px';
        helpBtn.onclick = () => this.showHelpModal();

        // Select All Checkbox
        const selectAllLabel = document.createElement('label');
        selectAllLabel.style.display = 'flex';
        selectAllLabel.style.alignItems = 'center';
        selectAllLabel.style.gap = '4px';
        selectAllLabel.style.fontSize = '0.9em';
        selectAllLabel.style.color = 'var(--md-sys-color-on-surface-variant)';
        selectAllLabel.style.cursor = 'pointer';

        const selectAll = document.createElement('input');
        selectAll.type = 'checkbox';
        // Check if all VISIBLE are selected (easier behavior)
        const visibleKeys = list.slice(0, this.displayLimit).map(v => v.lemma || v.word);
        const allSelected = visibleKeys.length > 0 && visibleKeys.every(k => this.selectedSet.has(k));
        selectAll.checked = allSelected;

        selectAll.onchange = (e) => {
            if (e.target.checked) {
                // Select all VISIBLE
                visibleKeys.forEach(k => this.selectedSet.add(k));
            } else {
                this.selectedSet.clear(); // Deselect All
            }
            this.refreshActionBar(); // Update UI
            // Need to update checkboxes in the DOM
            this.updateCheckboxes();
        };

        selectAllLabel.appendChild(selectAll);
        selectAllLabel.appendChild(document.createTextNode(t('vocab.all')));

        const countSpan = document.createElement('span');
        countSpan.textContent = `(${list.length})`;
        countSpan.style.color = 'var(--md-sys-color-secondary)';
        countSpan.style.fontSize = '0.85em';

        const selectAllLoading = document.createElement('button');
        selectAllLoading.innerHTML = '<i class="ri-loader-2-line"></i>';
        selectAllLoading.title = t('vocab.actions.selectAllLoading');
        selectAllLoading.style.background = 'none';
        selectAllLoading.style.border = 'none';
        selectAllLoading.style.cursor = 'pointer';
        selectAllLoading.style.fontSize = '1.1rem';
        selectAllLoading.style.color = 'var(--md-sys-color-primary)';
        selectAllLoading.style.display = 'flex';
        selectAllLoading.style.alignItems = 'center';
        selectAllLoading.style.padding = '4px';
        selectAllLoading.onclick = () => {
            const loadingKeys = list.filter(v => !v.meaning || v.meaning === 'Loading...' || v.meaning === t('dict.loading')).map(v => v.lemma || v.word);
            if (loadingKeys.length > 0) {
                loadingKeys.forEach(k => this.selectedSet.add(k));
                this.refreshActionBar();
                this.updateCheckboxes();
            }
        };

        filterGroup.appendChild(filterSelect);
        filterGroup.appendChild(helpBtn);
        filterGroup.appendChild(selectAllLabel);
        filterGroup.appendChild(selectAllLoading);
        filterGroup.appendChild(countSpan);

        // Bulk Actions Bar (Replaces Buttons if selection > 0)
        if (this.selectedSet.size > 0) {
            const bulkGroup = document.createElement('div');
            bulkGroup.style.display = 'flex';
            bulkGroup.style.alignItems = 'center';
            bulkGroup.style.gap = '8px';

            const selLabel = document.createElement('span');
            selLabel.textContent = `${this.selectedSet.size}`;
            selLabel.style.fontWeight = 'bold';
            selLabel.style.color = 'var(--md-sys-color-primary)';
            selLabel.style.marginRight = '4px';

            // Delete Selected
            const delBtn = document.createElement('button');
            delBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
            delBtn.title = t('vocab.actions.deleteSelected');
            this.styleActionBtn(delBtn, 'var(--md-sys-color-error)');
            delBtn.onclick = async () => {
                const ok = await notificationService.confirm(t('vocab.confirm.deleteBatch', { count: this.selectedSet.size }));
                if (ok) {
                    this.saveScroll();
                    const keys = Array.from(this.selectedSet);
                    await Promise.all(keys.map(k => vocabService.remove(k)));
                    this.selectedSet.clear();
                    this.render();
                }
            };

            // Master Selected
            const masterBtn = document.createElement('button');
            masterBtn.innerHTML = '<i class="ri-medal-2-line"></i>';
            masterBtn.title = t('vocab.actions.masterSelected');
            this.styleActionBtn(masterBtn, 'var(--md-sys-color-primary)');
            masterBtn.onclick = async () => {
                const ok = await notificationService.confirm(t('vocab.confirm.masterBatch', { count: this.selectedSet.size }));
                if (ok) {
                    this.saveScroll();
                    const keys = Array.from(this.selectedSet);
                    await Promise.all(keys.map(k => vocabService.updateEntry(k, { stage: 'mastered', nextReview: null })));
                    this.selectedSet.clear();
                    this.render();
                }
            };

            // Export Selected
            const exportBtn = document.createElement('button');
            exportBtn.innerHTML = '<i class="ri-download-2-line"></i>';
            exportBtn.title = t('vocab.actions.exportSelected');
            this.styleActionBtn(exportBtn, 'var(--md-sys-color-on-surface-variant)');
            exportBtn.onclick = () => {
                const selectedItems = list.filter(v => this.selectedSet.has(v.lemma || v.word));
                this.exportVocab(selectedItems);
            };

            // Print Selected
            const printBtn = document.createElement('button');
            printBtn.innerHTML = '<i class="ri-printer-line"></i>';
            printBtn.title = t('vocab.actions.printSelected');
            this.styleActionBtn(printBtn, 'var(--md-sys-color-on-surface-variant)');
            printBtn.onclick = () => {
                const selectedItems = list.filter(v => this.selectedSet.has(v.lemma || v.word));
                HandwritingSheet.generate(selectedItems, t('vocab.print.titleBatch', { count: selectedItems.length }));
            };

            // Batch Re-lookup Selected
            const relookupSelectedBtn = document.createElement('button');
            relookupSelectedBtn.innerHTML = '<i class="ri-book-read-line"></i>';
            relookupSelectedBtn.title = t('vocab.actions.relookupSelected');
            this.styleActionBtn(relookupSelectedBtn, 'var(--md-sys-color-primary)');
            relookupSelectedBtn.onclick = async () => {
                const ok = await notificationService.confirm(t('vocab.confirm.relookupBatch', { count: this.selectedSet.size }));
                if (ok) {
                    this.saveScroll();
                    const keys = Array.from(this.selectedSet);
                    let processed = 0;
                    selLabel.style.fontSize = '0.8em';

                    for (const k of keys) {
                        try {
                            processed++;
                            selLabel.textContent = `${processed}/${keys.length}`;
                            const def = await dictionaryService.lookup(k, '', true);
                            if (def) {
                                await vocabService.updateEntry(k, {
                                    meaning: def.m,
                                    phonetic: def.p,
                                    level: def.l,
                                    pos: def.pos || (list.find(v => (v.lemma || v.word) === k)?.pos)
                                });
                            }
                        } catch (e) {
                            console.error(`Batch relookup failed for ${k}`, e);
                        }
                    }

                    this.selectedSet.clear();
                    this.render();
                }
            };

            // Batch Magic Wand (Clean)
            const wandBtn = document.createElement('button');
            wandBtn.innerHTML = '<i class="ri-magic-line"></i>';
            wandBtn.title = t('vocab.actions.autoContextSelected');
            this.styleActionBtn(wandBtn, 'var(--md-sys-color-primary)');
            wandBtn.onclick = async () => {
                const ok = await notificationService.confirm(t('vocab.confirm.generateBatch', { count: this.selectedSet.size }));
                if (ok) {
                    this.saveScroll();
                    const keys = Array.from(this.selectedSet);
                    let processed = 0;

                    // Visual feedback during process (simple override of button or label)
                    selLabel.style.fontSize = '0.8em';

                    for (const k of keys) {
                        try {
                            processed++;
                            selLabel.textContent = `${processed}/${keys.length}`;
                            const newContext = await dictionaryService.generateExample(k);
                            await vocabService.updateEntry(k, { context: newContext });
                        } catch (e) {
                            console.error(`Batch wand failed for ${k}`, e);
                        }
                    }

                    this.selectedSet.clear();
                    this.render();
                }
            };

            bulkGroup.appendChild(selLabel);
            bulkGroup.appendChild(relookupSelectedBtn);
            bulkGroup.appendChild(wandBtn); // Add Wand first
            bulkGroup.appendChild(masterBtn);
            bulkGroup.appendChild(delBtn);
            bulkGroup.appendChild(exportBtn);
            bulkGroup.appendChild(printBtn);

            actionsDiv.appendChild(filterGroup);
            actionsDiv.appendChild(bulkGroup);
        } else {
            // Default Buttons
            const btnGroup = document.createElement('div');
            btnGroup.style.display = 'flex';
            btnGroup.style.gap = '8px';

            const reviewCandidates = list.filter(v => v.stage !== 'mastered');
            const dueCount = reviewCandidates.length;

            if (dueCount > 0) {
                const reviewBtn = document.createElement('button');
                reviewBtn.innerHTML = `${t('vocab.review')} (${dueCount})`; // Simplified text
                reviewBtn.title = t('vocab.review.title', { count: dueCount });
                reviewBtn.className = styles.btnPrimary;
                reviewBtn.style.padding = '4px 12px';
                reviewBtn.style.fontSize = '0.85em';
                reviewBtn.style.background = 'var(--md-sys-color-primary)';
                reviewBtn.onclick = () => {
                    if (!this.reviewComponent) this.reviewComponent = new VocabReview(document.body);
                    this.reviewComponent.onFinish = async () => {
                        this.render();
                        this.reviewComponent = null;

                        // Sync Suggestion
                        const status = await SyncService.getSyncStatus();

                        const ok = await notificationService.confirm(t('vocab.review.syncPrompt'));
                        if (ok) {
                            notificationService.toast(t('settings.sync.syncing'));
                            try {
                                await SyncService.pull();
                                await SyncService.push();
                                notificationService.toast(t('dashboard.sync.success'), 'success');
                            } catch (e) {
                                notificationService.toast(t('dashboard.sync.failed', { error: e.message }), 'error');
                            }
                        }
                    };
                    this.reviewComponent.start(reviewCandidates);
                };
                btnGroup.appendChild(reviewBtn);
            }

            const printBtn = document.createElement('button');
            printBtn.innerHTML = '<i class="ri-printer-line"></i>';
            this.styleActionBtn(printBtn, 'var(--md-sys-color-on-surface-variant)');
            printBtn.onclick = () => HandwritingSheet.generate(list, t('vocab.print.titleAll', { count: list.length }));

            const exportBtn = document.createElement('button');
            exportBtn.innerHTML = '<i class="ri-download-2-line"></i>';
            this.styleActionBtn(exportBtn, 'var(--md-sys-color-on-surface-variant)');
            exportBtn.onclick = () => this.exportVocab(list);

            btnGroup.appendChild(printBtn);
            btnGroup.appendChild(exportBtn);

            actionsDiv.appendChild(filterGroup);
            actionsDiv.appendChild(btnGroup);
        }

        container.appendChild(actionsDiv);
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
        // ... (Item creation logic same until actions)
        const item = document.createElement('div');
        item.style.padding = '12px 16px';
        item.style.background = 'var(--md-sys-color-surface-container-low)';
        item.style.marginBottom = '8px';
        item.style.borderRadius = 'var(--md-sys-radius-md)';
        item.style.border = '1px solid var(--md-sys-color-outline-variant)';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'flex-start';
        // Tighten gap
        item.style.gap = '8px';

        // Check for incomplete data
        const isIncomplete = !v.meaning || v.meaning === 'Loading...';

        // Checkbox Container
        const checkboxDiv = document.createElement('div');
        checkboxDiv.style.paddingTop = '6px'; // Align with text
        checkboxDiv.style.flexShrink = '0';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.key = v.lemma || v.word;
        checkbox.checked = this.selectedSet.has(v.lemma || v.word);
        checkbox.onchange = (e) => {
            const key = v.lemma || v.word;
            if (e.target.checked) this.selectedSet.add(key);
            else this.selectedSet.delete(key);
            this.refreshActionBar();
        };
        checkboxDiv.appendChild(checkbox);

        // Content
        const contentDiv = document.createElement('div');
        contentDiv.style.flexGrow = '1';
        contentDiv.innerHTML = `
            <div style="font-weight:bold; font-size:1.1em; color:var(--md-sys-color-primary); margin-bottom:2px;">${v.word} 
               ${v.phonetic ? `<span style="font-weight:normal; font-size:0.85em; color:var(--md-sys-color-outline); margin-left:6px; font-family:monospace;">[${v.phonetic}]</span>` : ''}
               ${v.pos ? `<span style="font-weight:normal; font-size:0.85em; color:var(--md-sys-color-on-surface-variant); margin-left:6px;">(${v.pos})</span>` : ''}
               ${v.stage === 'mastered' ? `<span style="font-size:0.75em; background:var(--md-sys-color-secondary-container); color:var(--md-sys-color-on-secondary-container); padding:1px 6px; border-radius:100px; margin-left:8px;">${t('vocab.mastered')}</span>` : ''}
            </div>
            <div style="font-size:0.95em; color:var(--md-sys-color-on-surface); margin-bottom:4px;">${v.meaning}</div>
            <div style="font-size:0.85em; color:var(--md-sys-color-on-surface-variant); font-style:italic; border-left:3px solid var(--md-sys-color-primary-container); padding-left:8px;">"${v.context || ''}"</div>
            <div style="font-size:0.75em; color:var(--md-sys-color-outline); margin-top:4px;">${t('vocab.added', { date: new Date(v.addedAt).toLocaleDateString() })}</div>
        `;

        // Actions Column
        const actionsCol = document.createElement('div');
        actionsCol.style.display = 'flex';
        actionsCol.style.flexDirection = 'column';
        actionsCol.style.gap = '4px';
        actionsCol.style.flexShrink = '0';

        // Re-lookup Button
        const relookupBtn = document.createElement('button');
        relookupBtn.innerHTML = '<i class="ri-book-read-line"></i>';
        relookupBtn.title = t('vocab.actions.relookup');
        this.styleActionBtn(relookupBtn, 'var(--md-sys-color-primary)');
        relookupBtn.onclick = async () => {
            relookupBtn.innerHTML = '<i class="ri-loader-2-line ri-spin"></i>';
            try {
                const def = await dictionaryService.lookup(v.lemma || v.word, v.context || '', true);
                if (def) {
                    await vocabService.updateEntry(v.lemma || v.word, {
                        meaning: def.m,
                        phonetic: def.p,
                        level: def.l,
                        pos: def.pos || v.pos
                    });

                    // In-place update
                    const updatedV = { ...v, meaning: def.m, phonetic: def.p, level: def.l, pos: def.pos || v.pos };
                    const newItem = this.createVocabItem(updatedV);
                    item.replaceWith(newItem);
                }
            } catch (e) {
                console.error("Relookup failed", e);
                relookupBtn.innerHTML = '<i class="ri-error-warning-line"></i>';
            }
        };
        actionsCol.appendChild(relookupBtn);

        // Fetch Context (Magic Wand) - Always show
        const ctxBtn = document.createElement('button');
        ctxBtn.innerHTML = '<i class="ri-magic-line"></i>';
        ctxBtn.title = t('vocab.actions.regenerate');
        this.styleActionBtn(ctxBtn, 'var(--md-sys-color-primary)');
        ctxBtn.onclick = async () => {
            this.saveScroll();
            ctxBtn.innerHTML = '<i class="ri-loader-2-line ri-spin"></i>';
            try {
                const newContext = await dictionaryService.generateExample(v.word);
                await vocabService.updateEntry(v.lemma || v.word, { context: newContext });

                // In-place update: Create new element with updated data and swap
                const updatedV = { ...v, context: newContext };
                const newItem = this.createVocabItem(updatedV);
                item.replaceWith(newItem);

                // Note: We don't call this.render(), preserving specific scroll completely.
            } catch (e) {
                console.error("Context fetch failed", e);
                ctxBtn.innerHTML = '<i class="ri-error-warning-line"></i>';
            }
        };
        actionsCol.appendChild(ctxBtn);

        const deepDiveBtn = document.createElement('button');
        deepDiveBtn.innerHTML = '<i class="ri-zoom-in-line"></i>';
        deepDiveBtn.title = t('vocab.actions.deepDive');
        this.styleActionBtn(deepDiveBtn, 'var(--md-sys-color-primary)');
        deepDiveBtn.onclick = async () => {
            Toast.info(t('vocab.deepDive.generating'));
            deepDiveBtn.disabled = true;
            try {
                // Check if already has data
                let deepData = v.deepData;
                if (!deepData) {
                    deepData = await dictionaryService.fetchTier2(v.lemma || v.word, v.context);
                    await vocabService.updateEntry(v.lemma || v.word, { deepData });
                    // Update local object
                    v.deepData = deepData;
                }
                showDeepDiveModal(v, deepData);
            } catch (e) {
                console.error(e);
                notificationService.toast(t('vocab.deepDive.failed'), 'error');
            } finally {
                deepDiveBtn.disabled = false;
            }
        };
        actionsCol.appendChild(deepDiveBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
        deleteBtn.title = t('vocab.actions.delete');
        this.styleActionBtn(deleteBtn, 'var(--md-sys-color-error)');
        deleteBtn.style.opacity = '0.5';
        deleteBtn.onclick = async () => {
            const ok = await notificationService.confirm(`Delete "${v.word}"?`);
            if (ok) {
                this.saveScroll();
                await vocabService.remove(v.lemma || v.word);
                this.render();
            }
        };

        const masterBtn = document.createElement('button');
        masterBtn.innerHTML = v.stage === 'mastered' ? '<i class="ri-medal-2-line"></i>' : '<i class="ri-graduation-cap-line"></i>';
        masterBtn.title = v.stage === 'mastered' ? t('vocab.actions.alreadyMastered') : t('vocab.actions.master');
        this.styleActionBtn(masterBtn, 'var(--md-sys-color-primary)');
        masterBtn.style.opacity = v.stage === 'mastered' ? '1' : '0.5';
        if (v.stage !== 'mastered') {
            masterBtn.onclick = async () => {
                this.saveScroll();
                await vocabService.updateEntry(v.lemma || v.word, { stage: 'mastered', nextReview: null });
                this.render();
            };
        }

        actionsCol.appendChild(masterBtn);
        actionsCol.appendChild(deleteBtn);

        item.appendChild(checkboxDiv);
        item.appendChild(contentDiv);
        item.appendChild(actionsCol);
        return item;
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
        content.className = styles.modalContent || 'modal-content'; // Fallback
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

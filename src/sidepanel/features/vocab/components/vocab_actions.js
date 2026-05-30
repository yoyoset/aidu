import { t } from '../../../../locales/index.js';
import { vocabService } from '../../../../services/vocab_service.js';
import { dictionaryService } from '../../../../services/dictionary_service.js';
import { SyncService } from '../../../../services/sync_service.js';
import { notificationService } from '../../../../utils/notification_service.js';
import { HandwritingSheet } from '../handwriting_sheet.js';
import { VocabReview } from '../vocab_review.js';
import navStyles from '../../builder/styles/dashboard_nav.module.css';
import itemStyles from '../styles/vocab_dashboard_shared.module.css';

export class VocabActions {
    constructor(parent) {
        this.parent = parent;
    }

    render(container, list) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = itemStyles['vocab-actions-header'];

        // Left Section: Filters & Select All
        const leftGroup = this._renderLeftGroup(list);

        // Right Section: Bulk Actions or Default Buttons
        const rightGroup = this.parent.selectedSet.size > 0
            ? this._renderBulkGroup(list)
            : this._renderDefaultGroup(list);

        actionsDiv.appendChild(leftGroup);
        actionsDiv.appendChild(rightGroup);
        container.appendChild(actionsDiv);
    }

    _renderLeftGroup(list) {
        const group = document.createElement('div');
        group.className = itemStyles['vocab-actions-left'];

        // Filter Select
        const filterSelect = document.createElement('select');
        filterSelect.className = itemStyles['vocab-filter-select'];
        filterSelect.innerHTML = `
            <option value="all" ${this.parent.filter === 'all' ? 'selected' : ''}>${t('vocab.filter.all')}</option>
            <option value="today" ${this.parent.filter === 'today' ? 'selected' : ''}>${t('vocab.filter.today')}</option>
            <option value="week" ${this.parent.filter === 'week' ? 'selected' : ''}>${t('vocab.filter.week')}</option>
            <option value="forgot" ${this.parent.filter === 'forgot' ? 'selected' : ''}>${t('vocab.filter.forgot')}</option>
            <option value="hard" ${this.parent.filter === 'hard' ? 'selected' : ''}>${t('vocab.filter.hard')}</option>
            <option value="recognized" ${this.parent.filter === 'recognized' ? 'selected' : ''}>${t('vocab.filter.recognized')}</option>
            <option value="easy" ${this.parent.filter === 'easy' ? 'selected' : ''}>${t('vocab.filter.easy')}</option>
            <option value="mastered" ${this.parent.filter === 'mastered' ? 'selected' : ''}>${t('vocab.filter.mastered')}</option>
            <option value="loading" ${this.parent.filter === 'loading' ? 'selected' : ''}>${t('common.loading')}</option>
        `;
        filterSelect.onchange = (e) => {
            this.parent.filter = e.target.value;
            this.parent.displayLimit = 50;
            this.parent.selectedSet.clear();
            this.parent.render();
        };

        // Help Button
        const helpBtn = document.createElement('button');
        helpBtn.innerHTML = '<i class="ri-question-line"></i>';
        helpBtn.title = t('vocab.actions.help');
        helpBtn.className = navStyles.iconBtn;
        helpBtn.onclick = () => this.parent.showHelpModal();

        // Select All
        const selectAllLabel = document.createElement('label');
        selectAllLabel.className = itemStyles['vocab-select-all-label'];

        const selectAll = document.createElement('input');
        selectAll.type = 'checkbox';
        const visibleKeys = list.slice(0, this.parent.displayLimit).map(v => v.lemma || v.word);
        selectAll.checked = visibleKeys.length > 0 && visibleKeys.every(k => this.parent.selectedSet.has(k));
        selectAll.onchange = (e) => {
            if (e.target.checked) visibleKeys.forEach(k => this.parent.selectedSet.add(k));
            else this.parent.selectedSet.clear();
            this.parent.refreshActionBar();
            this.parent.updateCheckboxes();
        };
        selectAllLabel.appendChild(selectAll);
        selectAllLabel.appendChild(document.createTextNode(t('vocab.all')));

        const countSpan = document.createElement('span');
        countSpan.textContent = `(${list.length})`;
        countSpan.className = itemStyles['vocab-count-badge'];

        group.appendChild(filterSelect);
        group.appendChild(helpBtn);
        group.appendChild(selectAllLabel);
        group.appendChild(countSpan);
        return group;
    }

    _renderBulkGroup(list) {
        const group = document.createElement('div');
        group.className = itemStyles['vocab-actions-right'];

        const selLabel = document.createElement('span');
        selLabel.textContent = `${this.parent.selectedSet.size}`;
        selLabel.className = itemStyles['vocab-selection-count'];

        // Relookup Selected
        const reBtn = this._createActionBtn('<i class="ri-book-read-line"></i>', t('vocab.actions.relookupSelected'), 'var(--md-sys-color-primary)');
        reBtn.onclick = async () => {
            const ok = await notificationService.confirm(t('vocab.confirm.relookupBatch', { count: this.parent.selectedSet.size }));
            if (ok) {
                const keys = Array.from(this.parent.selectedSet);
                for (let i = 0; i < keys.length; i++) {
                    selLabel.textContent = `${i + 1}/${keys.length}`;
                    const entry = await vocabService.getEntry(keys[i]);
                    const def = await dictionaryService.lookup(keys[i], entry?.pos || '', entry?.context || '', true);
                    if (def) await vocabService.updateEntry(keys[i], { meaning: def.m, phonetic: def.p, level: def.l });
                }
                this.parent.selectedSet.clear();
                this.parent.render();
            }
        };

        // Delete Selected
        const delBtn = this._createActionBtn('<i class="ri-delete-bin-line"></i>', t('vocab.actions.deleteSelected'), 'var(--md-sys-color-error)');
        delBtn.onclick = async () => {
            const ok = await notificationService.confirm(t('vocab.confirm.deleteBatch', { count: this.parent.selectedSet.size }));
            if (ok) {
                await Promise.all(Array.from(this.parent.selectedSet).map(k => vocabService.remove(k)));
                this.parent.selectedSet.clear();
                this.parent.render();
            }
        };

        group.appendChild(selLabel);
        group.appendChild(reBtn);
        group.appendChild(delBtn);
        return group;
    }

    _renderDefaultGroup(list) {
        const group = document.createElement('div');
        group.className = itemStyles['vocab-actions-right'];


        const reviewItems = list.filter(v => v.stage !== 'mastered');
        if (reviewItems.length > 0) {
            const reviewBtn = document.createElement('button');
            reviewBtn.innerHTML = `${t('vocab.review')} (${reviewItems.length})`;
            reviewBtn.className = navStyles.btnPrimary;
            reviewBtn.style.padding = '4px 12px';
            reviewBtn.style.fontSize = '0.85em';
            reviewBtn.onclick = () => {
                if (!this.parent.reviewComponent) this.parent.reviewComponent = new VocabReview(document.body);
                this.parent.reviewComponent.onFinish = async () => {
                    this.parent.render();
                    this.parent.reviewComponent = null;
                    // Trigger Safe Sync after review
                    const ok = await notificationService.confirm(t('vocab.review.syncPrompt'));
                    if (ok) {
                        await this._handleSync();
                    }
                };
                this.parent.reviewComponent.start(reviewItems);
            };
            group.appendChild(reviewBtn);
        }

        // Standard Sync Button removed per user request (redundant with main dashboard)
        // const syncBtn = this._createActionBtn('<i class="ri-refresh-line"></i>', t('vocab.actions.sync'), 'var(--md-sys-color-primary)');
        // syncBtn.onclick = () => this._handleSync();
        // group.appendChild(syncBtn);

        const printBtn = this._createActionBtn('<i class="ri-printer-line"></i>', t('vocab.actions.printSelected'), 'var(--md-sys-color-on-surface-variant)');
        printBtn.onclick = () => HandwritingSheet.generate(list, t('vocab.print.titleAll', { count: list.length }));
        group.appendChild(printBtn);

        return group;
    }

    async _handleSync(force = false) {
        const loadingToast = notificationService.toast(t('dashboard.sync.start'), 'info');
        try {
            await SyncService.push(force);
            notificationService.toast(t('dashboard.sync.success'), 'success');
            this.parent.render(); // Refresh UI to show merged items
        } catch (e) {
            // Check for our custom confirmation error
            if (e.code === 'CONFIRMATION_NEEDED') {
                await this._showSyncConflictModal(e.decision);
            } else {
                console.error("Sync Error:", e);
                notificationService.alert(`${t('dashboard.sync.failed', { error: e.message })}`, t('common.error'));
            }
        }
    }

    async _showSyncConflictModal(decision) {
        const diff = decision.diff;

        // Construct Warning Message
        let warningHtml = `
            <div style="margin-bottom: 20px;">
                <p><strong>Cloud Status:</strong> ${diff.remoteCount} items</p>
                <p><strong>Local Status:</strong> ${diff.localCount} items</p>
                <hr style="border:0; border-top:1px solid #ddd; margin: 10px 0;">
                <div style="color: var(--md-sys-color-error); font-weight: bold;">
                    ⚠️ Potential Data Loss Warning
                </div>
                <ul style="text-align: left; color: var(--md-sys-color-on-surface-variant);">
                    ${diff.deletions > 0 ? `<li>This action will <strong>DELETE ${diff.deletions}</strong> items from the Cloud.</li>` : ''}
                    ${diff.conflicts > 0 ? `<li>There are <strong>${diff.conflicts}</strong> conflicting items (Remote is newer).</li>` : ''}
                    ${diff.isDestructive ? `<li><strong>Large Scale Change Detected!</strong></li>` : ''}
                </ul>
                <p>How would you like to proceed?</p>
            </div>
        `;

        // Create Modal
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.6)';
        modal.style.zIndex = '10000';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';

        const content = document.createElement('div');
        content.style.background = 'var(--md-sys-color-surface)';
        content.style.padding = '24px';
        content.style.borderRadius = '16px';
        content.style.width = '90%';
        content.style.maxWidth = '500px';
        content.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
        content.style.textAlign = 'center';
        content.innerHTML = `<h3 style="margin-top:0;">Sync Conflict Resolution</h3>${warningHtml}`;

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '10px';
        btnContainer.style.justifyContent = 'center';
        btnContainer.style.marginTop = '20px';
        btnContainer.style.flexWrap = 'wrap';

        // 1. Merge (Safe)
        const mergeBtn = document.createElement('button');
        mergeBtn.textContent = "Merge (Safe)";
        mergeBtn.className = navStyles.btnPrimary;
        mergeBtn.onclick = async () => {
            modal.remove();
            try {
                notificationService.toast(t('settings.sync.syncing'), "info");
                await SyncService.manager.resolveChoice('MERGE'); // Access manager directly
                notificationService.success(t('dashboard.sync.success'));
                this.parent.render(); // Refresh UI with merged data
            } catch (e) { notificationService.error(e.message); }
        };

        // 2. Overwrite (Destructive)
        const overwriteBtn = document.createElement('button');
        overwriteBtn.textContent = "Overwrite Cloud";
        overwriteBtn.className = navStyles.btnDestructive || navStyles.btnPrimary;
        overwriteBtn.style.backgroundColor = 'var(--md-sys-color-error)';
        overwriteBtn.onclick = async () => {
            if (!confirm("Are you ABSOLUTELY sure? This deletes cloud data permanently.")) return;
            modal.remove();
            try {
                notificationService.toast(t('settings.sync.syncing'), "warning");
                await SyncService.manager.resolveChoice('OVERWRITE');
                notificationService.success(t('settings.sync.completed'));
            } catch (e) { notificationService.error(e.message); }
        };

        // 3. Cancel
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = "Cancel";
        cancelBtn.className = navStyles.btnSecondary;
        cancelBtn.onclick = async () => {
            modal.remove();
            notificationService.toast(t('settings.expert.cancelSave'), 'info');
            await SyncService.manager.resolveChoice('CANCEL');
        };

        btnContainer.appendChild(mergeBtn);
        btnContainer.appendChild(overwriteBtn);
        btnContainer.appendChild(cancelBtn);

        content.appendChild(btnContainer);
        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    _createActionBtn(html, title, color) {
        const btn = document.createElement('button');
        btn.innerHTML = html;
        btn.title = title;
        btn.className = navStyles.iconBtn;
        if (color) btn.style.color = color;
        return btn;
    }
}

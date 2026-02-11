import { t } from '../../../../locales/index.js';
import navStyles from '../styles/dashboard_nav.module.css';
import itemStyles from '../styles/dashboard_items.module.css';


/**
 * DraftItem
 * Encapsulates the rendering and logic for a single draft card in the dashboard.
 */
export class DraftItem {
    static create(draft, handlers) {
        const {
            onEdit,
            onDelete,
            onAction,
            onManualAi,
            onReset,
            onToggleSelection,
            isSelected
        } = handlers;

        // Card Container Structure
        const item = document.createElement('div');
        const statusClass = itemStyles[`status-${draft.status}`] || '';
        item.className = `${itemStyles['draft-item']} ${statusClass}`;
        item.dataset.id = draft.id;

        const contentCol = document.createElement('div');
        contentCol.className = itemStyles['draft-content'];

        // Slot 1: Header (Title)
        const header = document.createElement('div');
        header.className = itemStyles['draft-header'];
        const titleDiv = document.createElement('div');
        titleDiv.className = itemStyles['draft-title'];
        titleDiv.textContent = draft.title || t('dashboard.draft.untitled');
        header.appendChild(titleDiv);
        contentCol.appendChild(header);

        // Sidebar Actions (Float Top-Right)
        const actionsCol = document.createElement('div');
        actionsCol.className = itemStyles['draft-actions'];
        if (['draft', 'error', 'processing', 'ready'].includes(draft.status)) {
            actionsCol.appendChild(this._createIconBtn('<i class="ri-edit-line"></i>', t('dashboard.draft.edit'), (e) => {
                e.stopPropagation(); onEdit(draft);
            }));
        }
        if (['draft', 'error', 'processing'].includes(draft.status)) {
            actionsCol.appendChild(this._createIconBtn('<i class="ri-robot-line"></i>', t('dashboard.draft.manualAi'), (e) => {
                e.stopPropagation(); onManualAi(draft);
            }));
        }
        actionsCol.appendChild(this._createIconBtn('<i class="ri-delete-bin-line"></i>', t('dashboard.draft.delete'), (e) => {
            e.stopPropagation(); onDelete(draft);
        }));
        item.appendChild(actionsCol);

        // Slot 2: Body (Preview)
        const preview = document.createElement('div');
        preview.className = itemStyles['draft-preview'];
        const raw = draft.rawText || '';
        preview.textContent = raw.substring(0, 120) + (raw.length > 120 ? '...' : '');
        contentCol.appendChild(preview);

        // Slot 3: Progress (Chunks)
        const progressSlot = document.createElement('div');
        const chunks = draft.data?.chunks || [];
        if (chunks.length > 0) {
            if (chunks.length <= 24) {
                const chunkGrid = document.createElement('div');
                chunkGrid.className = itemStyles['chunk-grid'];
                chunks.forEach(chunk => {
                    const block = document.createElement('div');
                    block.className = `${itemStyles['chunk-block']} ${itemStyles[`chunk-${chunk.status}`] || itemStyles['chunk-pending']}`;
                    chunkGrid.appendChild(block);
                });
                progressSlot.appendChild(chunkGrid);
            } else {
                // Overflow mode: Summary line
                const summary = document.createElement('div');
                summary.className = itemStyles['chunk-summary'];
                const doneCount = chunks.filter(c => c.status === 'done').length;
                summary.textContent = `Progress: ${doneCount}/${chunks.length} chunks analyzed`;
                progressSlot.appendChild(summary);
            }
        } else {
            // Draft mode: Ghost line to reserve height
            const ghost = document.createElement('div');
            ghost.className = itemStyles['chunk-grid'];
            const line = document.createElement('div');
            line.className = itemStyles['chunk-ghost-line'];
            ghost.appendChild(line);
            progressSlot.appendChild(ghost);
        }
        contentCol.appendChild(progressSlot);

        // Slot 4: Standardized Footer (A | B | C)
        const footer = document.createElement('div');
        footer.className = itemStyles['draft-meta'];

        // A: Left (Metadata)
        const left = document.createElement('div');
        left.className = itemStyles['meta-left'];
        const badge = document.createElement('span');
        badge.className = itemStyles.badge;
        badge.textContent = draft.status.toUpperCase();
        left.appendChild(badge);
        if (draft.createdAt) {
            const dateSpan = document.createElement('span');
            dateSpan.className = itemStyles['date-text'];
            dateSpan.textContent = new Date(draft.createdAt).toLocaleDateString();
            left.appendChild(dateSpan);
        }
        footer.appendChild(left);

        // B: Center (Context/Processing)
        const center = document.createElement('div');
        center.className = itemStyles['meta-center'];
        if (draft.status === 'processing') {
            center.innerHTML = `${draft.progress?.percentage || 0}% <span class="loading-dots"><i class="ri-more-line"></i></span>`;
        } else if (draft.status === 'error') {
            center.textContent = 'Failed';
            center.style.color = 'var(--md-sys-color-error)';
        }
        footer.appendChild(center);

        // C: Right (Actions)
        const right = document.createElement('div');
        right.className = itemStyles['action-area'];

        const hasData = draft.data?.sentences?.length > 0;
        if (draft.status === 'ready' && hasData) {
            // Ready Segment: Time + Read
            const minutes = Math.floor((draft.readingTime || 0) / 60);
            const percentage = Math.min(100, ((draft.readingTime || 0) / 3600) * 100);
            const timeCapsule = this._createTimeCapsule(minutes, percentage);
            right.appendChild(timeCapsule);

            const btn = document.createElement('button');
            btn.className = itemStyles['btn-read-now'];
            btn.innerHTML = `<span>${t('dashboard.draft.readNow')}</span> <i class="ri-arrow-right-line"></i>`;
            btn.onclick = (e) => { e.stopPropagation(); onAction(draft); };
            right.appendChild(btn);
        } else if (['draft', 'error'].includes(draft.status)) {
            // Draft/Error Segment: Standard + Deep
            const simpleBtn = document.createElement('button');
            simpleBtn.className = navStyles['btn-primary'];
            simpleBtn.innerHTML = `<i class="ri-flashlight-line"></i> ${t('settings.mode.standard')}`;
            simpleBtn.onclick = (e) => { e.stopPropagation(); onAction(draft, 'standard'); };
            right.appendChild(simpleBtn);

            const deepBtn = document.createElement('button');
            deepBtn.className = navStyles['btn-primary'];
            deepBtn.innerHTML = `<i class="ri-magic-line"></i> ${t('settings.mode.deep')}`;
            deepBtn.onclick = (e) => { e.stopPropagation(); onAction(draft, 'deep'); };
            right.appendChild(deepBtn);
        } else if (draft.status === 'processing') {
            // Processing Segment: Reset Stuck
            const resetBtn = document.createElement('button');
            resetBtn.className = navStyles['btn-ghost-destructive'];
            resetBtn.style.flex = "1";
            resetBtn.innerHTML = `<span><i class="ri-restart-line"></i></span> ${t('dashboard.draft.resetStuck')}`;
            resetBtn.onclick = () => onReset(draft);
            right.appendChild(resetBtn);
        }
        footer.appendChild(right);

        contentCol.appendChild(footer);
        item.appendChild(contentCol);

        return item;
    }

    static _createTimeCapsule(minutes, percentage) {
        const timeContainer = document.createElement('div');
        timeContainer.className = itemStyles['reading-time-container'];
        timeContainer.style.flex = "1";

        const bar = document.createElement('div');
        bar.className = itemStyles['reading-progress-bar'];
        const fill = document.createElement('div');
        fill.className = itemStyles['reading-progress-fill'];
        fill.style.width = `${percentage}%`;
        bar.appendChild(fill);

        const text = document.createElement('span');
        text.className = itemStyles['reading-time-text'];
        text.innerHTML = `<i class="ri-time-line ${itemStyles['time-icon']}"></i>${minutes}m`;

        timeContainer.appendChild(bar);
        timeContainer.appendChild(text);
        return timeContainer;
    }

    static _createIconBtn(iconHtml, title, onClick) {
        const btn = document.createElement('button');
        btn.className = navStyles['icon-btn'];
        btn.innerHTML = iconHtml;
        btn.title = title;
        btn.onclick = onClick;
        return btn;
    }
}

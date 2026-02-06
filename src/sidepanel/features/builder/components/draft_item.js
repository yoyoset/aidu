import { Component } from '../../../components/component.js';
import styles from '../dashboard.module.css';
import { t } from '../../../../locales/index.js';
// Reusing dashboard.module.css for now to avoid breaking styles, until we split CSS.

export class DraftItem extends Component {
    constructor(element, options = {}) {
        // element is the PARENT container? No, usually Component takes its OWN element.
        // But here we are creating many items.
        // Pattern: new DraftItem(null, { draft, checkboxState, callbacks }).mount(parent)
        // OR: static render(draft) -> HTMLElement?
        // Let's stick to simple Component pattern, or just a render function/class.
        // Since we need event binding, a Class is good.
        // But `Component` base class expects `this.element` in constructor.

        super(null); // We will create element
        this.draft = options.draft;
        this.isSelected = options.isSelected || false;
        this.callbacks = options.callbacks || {};

        // callbacks: { onSelect, onEdit, onDelete, onManual, onProcess, onAction }
        this.render();
    }

    render() {
        const draft = this.draft;
        const item = document.createElement('div');
        const statusClass = styles[`status${draft.status.charAt(0).toUpperCase() + draft.status.slice(1)}`] || '';
        item.className = `${styles.draftItem} ${statusClass}`;
        item.dataset.id = draft.id;

        // 1. Checkbox
        if (draft.status === 'draft') {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = styles.draftCheckbox;
            checkbox.checked = this.isSelected;
            checkbox.onclick = (e) => {
                e.stopPropagation();
                if (this.callbacks.onSelect) this.callbacks.onSelect(draft.id, checkbox.checked);
            };
            item.appendChild(checkbox);
        }

        // 2. Content Column
        const contentCol = document.createElement('div');
        contentCol.className = styles.draftContent;

        // Header
        const header = document.createElement('div');
        header.className = styles.draftHeader;

        const titleDiv = document.createElement('div');
        titleDiv.className = styles.draftTitle;
        titleDiv.textContent = draft.title || t('dashboard.draft.untitled');
        titleDiv.title = draft.title;
        header.appendChild(titleDiv);

        const controls = document.createElement('div');
        controls.className = styles.draftControls;

        // Allow Edit/Manual/Process for Draft AND Error states
        if (draft.status === 'draft' || draft.status === 'error') {
            controls.appendChild(this.createIconBtn('<i class="ri-edit-line"></i>', 'Edit', (e) => this.callbacks.onEdit(draft)));
            controls.appendChild(this.createIconBtn('<i class="ri-robot-line"></i>', 'Manual AI', (e) => this.callbacks.onManual(draft)));

            // Only show BG Process if 'draft' (Error has Resume below, prevent duplicate visual clutter?)
            // Actually user might want to BG Process from Error.
            // But Resume button does 'retry'.
            // Let's keep Process button for consistency? Or just let Resume handle it?
            // User compliant "only resume visible, others disappear".
            // So they WANT others.
            controls.appendChild(this.createIconBtn('<i class="ri-time-line"></i>', 'BG Process', (e) => this.callbacks.onProcess(draft)));
        }
        controls.appendChild(this.createIconBtn('<i class="ri-delete-bin-line"></i>', 'Delete', (e) => this.callbacks.onDelete(draft)));

        header.appendChild(controls);
        contentCol.appendChild(header);

        // Preview
        const preview = document.createElement('div');
        preview.className = styles.draftPreview;
        const raw = draft.rawText || '';
        preview.textContent = raw.substring(0, 150) + (raw.length > 150 ? '...' : '');
        contentCol.appendChild(preview);

        // Meta
        const meta = document.createElement('div');
        meta.className = styles.draftMeta;

        const badge = document.createElement('span');
        badge.className = styles.badge;
        badge.textContent = draft.status.toUpperCase();
        meta.appendChild(badge);

        if (draft.createdAt) {
            const dateSpan = document.createElement('span');
            dateSpan.className = styles.dateText;
            dateSpan.textContent = new Date(draft.createdAt).toLocaleDateString();
            meta.appendChild(dateSpan);
        }

        if (draft.status === 'processing') {
            const progress = document.createElement('span');
            progress.textContent = `${draft.progress?.percentage || 0}%`;
            meta.appendChild(progress);
        }
        contentCol.appendChild(meta);

        // Action Area
        const actionArea = document.createElement('div');
        actionArea.className = styles.actionArea;
        const hasData = draft.data?.sentences?.length > 0;
        const isCorrupt = draft.status === 'ready' && !hasData;

        if (draft.status === 'ready' && !isCorrupt) {
            actionArea.appendChild(this.createBtn(styles.btnPrimary, t('dashboard.draft.readNow'), () => this.callbacks.onAction(draft)));
        } else if (draft.status === 'draft') {
            actionArea.appendChild(this.createBtn(styles.btnPrimary, t('dashboard.draft.startAnalysis'), () => this.callbacks.onAction(draft)));
        } else if (draft.status === 'error') {
            actionArea.appendChild(this.createBtn(styles.btnDestructive, t('dashboard.draft.resume'), () => this.callbacks.onAction(draft, 'retry')));
            if (hasData) {
                actionArea.appendChild(this.createBtn(styles.btnSecondary, t('dashboard.draft.readPartial'), () => this.callbacks.onAction(draft, 'read_partial')));
            }
        } else if (draft.status === 'processing' && hasData) {
            const btn = this.createBtn(styles.btnSecondary, t('dashboard.draft.readLive'), () => this.callbacks.onAction(draft, 'read_partial'));
            btn.style.fontSize = '0.8em';
            actionArea.appendChild(btn);
        }

        if (actionArea.children.length > 0) contentCol.appendChild(actionArea);

        item.appendChild(contentCol);
        this.element = item;
        return item;
    }

    createIconBtn(icon, title, onClick) {
        const btn = document.createElement('button');
        btn.className = styles.iconBtn;
        btn.innerHTML = icon;
        btn.title = title;
        btn.onclick = (e) => { e.stopPropagation(); onClick(e); };
        return btn;
    }

    createBtn(className, html, onClick) {
        const btn = document.createElement('button');
        btn.className = className;
        btn.innerHTML = html;
        btn.onclick = onClick;
        return btn;
    }
}

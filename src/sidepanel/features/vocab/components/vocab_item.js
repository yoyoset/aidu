import { t } from '../../../../locales/index.js';
import styles from '../styles/vocab_items.module.css';
import { vocabService } from '../../../../services/vocab_service.js';
import { dictionaryService } from '../../../../services/dictionary_service.js';
import { notificationService } from '../../../../utils/notification_service.js';
import { showDeepDiveModal } from '../../../components/deep_dive_modal.js';

export class VocabItem {
    constructor(parent) {
        this.parent = parent;
    }

    render(v) {
        const item = document.createElement('div');
        item.className = styles['vocab-item-card'];
        item.dataset.id = v.lemma || v.word;

        // 1. Header (Checkbox + Title)
        const header = document.createElement('div');
        header.className = styles['card-header'] || 'card-header';

        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = styles['checkbox-container'];
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = styles['checkbox'];
        checkbox.checked = this.parent.selectedSet.has(v.lemma || v.word);
        checkbox.onchange = (e) => {
            const key = v.lemma || v.word;
            if (e.target.checked) this.parent.selectedSet.add(key);
            else this.parent.selectedSet.delete(key);
            this.parent.refreshActionBar();
        };
        checkboxDiv.appendChild(checkbox);

        // Title Row
        const titleRow = document.createElement('div');
        titleRow.className = styles['title-row'];
        titleRow.innerHTML = `
            <span class="${styles['word']}">${v.word}</span>
            ${v.phonetic ? `<span class="${styles['phonetic']}">[${v.phonetic}]</span>` : ''}
            ${v.pos ? `<span class="${styles['pos']}">(${v.pos})</span>` : ''}
            ${v.stage === 'mastered' ? `<span class="${styles['mastered-badge']}">${t('vocab.mastered')}</span>` : ''}
        `;

        // Wrap title row content for flex layout
        const titleWrapper = document.createElement('div');
        titleWrapper.style.flex = '1';
        titleWrapper.style.minWidth = '0'; // Allow shrink
        titleWrapper.appendChild(titleRow);

        header.appendChild(checkboxDiv);
        header.appendChild(titleWrapper);


        // 2. Main Content
        const contentDiv = document.createElement('div');
        contentDiv.className = styles['content'];
        contentDiv.appendChild(header);

        // Meaning
        const meaning = document.createElement('div');
        meaning.className = styles['meaning'];
        meaning.textContent = v.meaning;
        meaning.title = v.meaning; // Tooltip for full text
        contentDiv.appendChild(meaning);

        // Context (Boxed & Truncated)
        if (v.context) {
            const contextBox = document.createElement('div');
            contextBox.className = styles['context-box'];
            contextBox.innerHTML = `<span class="${styles['context-text']}" title="${(v.context || '').replace(/"/g, '&quot;')}">${v.context}</span>`;
            contentDiv.appendChild(contextBox);
        }

        // Footer Meta & Actions
        const footer = document.createElement('div');
        footer.className = styles['footer-meta'];

        const dateSpan = document.createElement('span');
        dateSpan.className = styles['date'];
        dateSpan.textContent = `${new Date(v.addedAt).toLocaleDateString()}`;
        footer.appendChild(dateSpan);

        // Actions (Horizontal)
        const actionsRow = document.createElement('div');
        actionsRow.className = styles['actions-row'];
        this._addButtons(v, actionsRow, item);
        footer.appendChild(actionsRow);

        contentDiv.appendChild(footer);

        item.appendChild(contentDiv);
        return item;
    }

    _addButtons(v, container, item) {
        // Relookup (Dictionary)
        const relookupBtn = this._createActionBtn('ri-book-open-line', t('vocab.actions.relookup'), 'primary');
        relookupBtn.onclick = async () => {
            const icon = relookupBtn.querySelector('i');
            icon.className = 'ri-loader-2-line ri-spin';
            try {
                const def = await dictionaryService.lookup(v.lemma || v.word, v.pos || '', v.context || '', true);
                if (def) {
                    await vocabService.updateEntry(v.lemma || v.word, {
                        meaning: def.m, phonetic: def.p, level: def.l, pos: def.pos || v.pos
                    });
                    const updatedV = { ...v, meaning: def.m, phonetic: def.p, level: def.l, pos: def.pos || v.pos };
                    item.replaceWith(this.render(updatedV));
                    notificationService.success(t('vocab.relookup.success'));
                }
            } finally {
                icon.className = 'ri-book-open-line';
            }
        };
        container.appendChild(relookupBtn);

        // Regenerate (AI Magic)
        const ctxBtn = this._createActionBtn('ri-magic-line', t('vocab.actions.regenerate'), 'primary');
        ctxBtn.onclick = async () => {
            const icon = ctxBtn.querySelector('i');
            icon.className = 'ri-loader-2-line ri-spin';
            try {
                const newContext = await dictionaryService.generateExample(v.word);
                await vocabService.updateEntry(v.lemma || v.word, { context: newContext });
                const updatedV = { ...v, context: newContext };
                item.replaceWith(this.render(updatedV));
                notificationService.success(t('vocab.regenerate.success'));
            } finally {
                icon.className = 'ri-magic-line';
            }
        };
        container.appendChild(ctxBtn);

        // Deep Dive (Analysis)
        const deepBtn = this._createActionBtn('ri-search-eye-line', t('vocab.actions.deepDive'), 'primary');
        deepBtn.onclick = async () => {
            let deepData = v.deepData;
            if (!deepData) {
                notificationService.info(t('vocab.deepDive.generating'));
                deepData = await dictionaryService.fetchTier2(v.lemma || v.word, v.context);
                await vocabService.updateEntry(v.lemma || v.word, { deepData });
                v.deepData = deepData;
            }
            showDeepDiveModal(v, deepData);
        };
        container.appendChild(deepBtn);

        // Master (Graduation)
        const isMastered = v.stage === 'mastered';
        const masterBtn = this._createActionBtn(
            isMastered ? 'ri-medal-fill' : 'ri-graduation-cap-line',
            isMastered ? t('vocab.actions.alreadyMastered') : t('vocab.actions.master'),
            'primary'
        );
        if (!isMastered) {
            masterBtn.onclick = async () => {
                this.parent.saveScroll();
                await vocabService.updateEntry(v.lemma || v.word, { stage: 'mastered', nextReview: null });
                this.parent.render();
                notificationService.success(t('vocab.master.success'));
            };
        } else {
            masterBtn.style.color = 'var(--md-sys-color-primary)';
            masterBtn.style.opacity = '1';
        }
        container.appendChild(masterBtn);

        // Delete
        const delBtn = this._createActionBtn('ri-delete-bin-line', t('vocab.actions.delete'), 'delete');
        delBtn.onclick = async () => {
            const ok = await notificationService.confirm(t('common.confirmDelete', { name: v.word }));
            if (ok) {
                this.parent.saveScroll();
                await vocabService.remove(v.lemma || v.word);
                this.parent.render();
            }
        };
        container.appendChild(delBtn);
    }

    _createActionBtn(iconClass, title, type) {
        const btn = document.createElement('button');
        btn.className = `${styles['action-btn']} ${styles[type] || ''}`;
        btn.title = title;
        btn.innerHTML = `<i class="${iconClass}"></i>`;
        return btn;
    }
}

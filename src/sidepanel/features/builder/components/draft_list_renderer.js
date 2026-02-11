import navStyles from '../styles/dashboard_nav.module.css';
import itemStyles from '../styles/dashboard_items.module.css';
import { DraftItem } from './draft_item.js';
import { t } from '../../../../locales/index.js';

export class DraftListRenderer {
    constructor(container) {
        this.container = container;
        this.activeFilter = 'all';
        this.lastDrafts = [];
    }

    render(drafts, handlers, activeFilter = 'all') {
        const isFilterChange = this.activeFilter !== activeFilter;
        this.activeFilter = activeFilter;

        // 1. Stable Filter Tabs
        if (!this.filterContainer || isFilterChange) {
            this.container.innerHTML = '';
            this.filterContainer = document.createElement('div');
            this.filterContainer.className = navStyles['filter-tabs'];

            const tabs = [
                { id: 'all', label: t('dashboard.filter.all') },
                { id: 'draft', label: t('dashboard.filter.draft') },
                { id: 'ready', label: t('dashboard.filter.ready') },
                { id: 'error', label: t('dashboard.filter.error') }
            ];

            tabs.forEach(tab => {
                const btn = document.createElement('button');
                btn.className = `${navStyles['filter-tab']} ${this.activeFilter === tab.id ? navStyles.active : ''}`;
                btn.textContent = tab.label;
                btn.onclick = () => handlers.onFilterChange(tab.id);
                this.filterContainer.appendChild(btn);
            });
            this.container.appendChild(this.filterContainer);

            this.listContainer = document.createElement('div');
            this.listContainer.className = itemStyles['draft-list'];
            this.container.appendChild(this.listContainer);
        }

        // 2. Efficient List Update
        this.listContainer.innerHTML = '';
        if (drafts.length === 0) {
            this.listContainer.innerHTML = `<div class="${itemStyles['empty-state']}"><h3>${t('dashboard.empty')}</h3></div>`;
        } else {
            drafts.forEach(draft => {
                const item = DraftItem.create(draft, handlers);
                this.listContainer.appendChild(item);
            });
        }
    }

}

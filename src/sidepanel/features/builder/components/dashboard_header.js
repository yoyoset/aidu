import { t } from '../../../../locales/index.js';
import { showDonateModal } from '../../../components/donate_modal.js';
import navStyles from '../styles/dashboard_nav.module.css';

/**
 * DashboardHeader
 * Handles the rendering of top-level navigation and actions.
 */
export class DashboardHeader {
    constructor(dashboard, alignmentWrapper) {
        this.dashboard = dashboard;
        this.alignmentWrapper = alignmentWrapper;
    }

    render() {
        if (!this.alignmentWrapper) return;
        this.alignmentWrapper.innerHTML = '';

        // Left Side: Navigation Tabs
        const navDiv = document.createElement('div');
        navDiv.className = navStyles['header-nav'];

        const makeTab = (id, label) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.className = this.dashboard.activeTab === id ? navStyles['nav-active-tab'] : navStyles['nav-tab'];

            btn.onclick = () => {
                this.dashboard.activeTab = id;
                this.dashboard.render();
            };
            return btn;
        };

        navDiv.appendChild(makeTab('library', t('nav.library')));
        navDiv.appendChild(makeTab('vocab', t('nav.vocabulary')));
        this.alignmentWrapper.appendChild(navDiv);

        // Right Side: Action Buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = navStyles['header-actions'];

        // Merge Button (Contextual)
        if (this.dashboard.activeTab === 'library' && this.dashboard.selectedDrafts.size > 1) {
            const mergeBtn = this.createIconBtn(
                `${t('dashboard.merge')} (${this.dashboard.selectedDrafts.size})`,
                t('dashboard.mergeSelected'),
                () => this.dashboard.handlers.handleMerge()
            );
            mergeBtn.id = 'merge-btn';
            mergeBtn.className = navStyles['merge-btn'];
            actionsDiv.appendChild(mergeBtn);
        }

        // New Article Button
        if (this.dashboard.activeTab === 'library') {
            const addBtn = this.createIconBtn(
                `<i class="ri-add-line"></i> ${t('dashboard.new')}`,
                t('dashboard.addArticle'),
                () => this.dashboard.creatorModal.show()
            );
            addBtn.className = navStyles['create-btn'];
            actionsDiv.appendChild(addBtn);
        }

        // Sync Cloud
        const syncBtn = this.createIconBtn(
            `
            <span class="sync-icon"><i class="ri-cloud-line"></i></span>
            <span class="sync-badge" id="sync-badge"></span>
            `,
            t('dashboard.cloudSync'),
            () => this.dashboard.handlers.triggerSync()
        );
        syncBtn.id = 'sync-status-btn';
        actionsDiv.appendChild(syncBtn);

        // Donate Heart
        const donateBtn = this.createIconBtn(
            '<i class="ri-heart-3-fill"></i>',
            t('donate.title'),
            () => showDonateModal()
        );
        donateBtn.classList.add(navStyles['donate-btn'] || 'donate-btn');
        actionsDiv.appendChild(donateBtn);

        // Settings Gear
        actionsDiv.appendChild(this.createIconBtn(
            '<i class="ri-settings-3-line"></i>',
            t('dashboard.settings'),
            () => this.dashboard.settingsModal.show()
        ));

        this.alignmentWrapper.appendChild(actionsDiv);
        this.dashboard.updateSyncBadge(); // Ensure badge is updated after render
    }

    createIconBtn(html, title, onClick) {
        const btn = document.createElement('button');
        btn.className = navStyles['icon-btn'];
        btn.innerHTML = html;
        btn.title = title;
        btn.onclick = onClick;
        return btn;
    }
}

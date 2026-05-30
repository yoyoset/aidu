import { t } from '../../../../locales/index.js';
import { StorageHelper, StorageKeys } from '../../../../utils/storage.js';
import { notificationService } from '../../../../utils/notification_service.js';

export class AnalysisOverlay {
    constructor(parent) {
        this.parent = parent;
        this.overlay = null;
        this._boundOnProgress = this._onProgress.bind(this);
    }

    show(draftId, onComplete) {
        this.draftId = draftId;
        this.onComplete = onComplete;

        this._render();
        chrome.storage.onChanged.addListener(this._boundOnProgress);
    }

    _render() {
        if (this.overlay) this.overlay.remove();

        const overlay = document.createElement('div');
        overlay.className = 'aidu-realtime-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: var(--md-sys-color-surface); display: flex;
            flex-direction: column; align-items: center; justify-content: center;
            z-index: 99999; backdrop-filter: blur(10px);
        `;

        overlay.innerHTML = `
            <div style="font-size: 2.5rem; color: var(--md-sys-color-primary); margin-bottom: 20px;">
                <i class="ri-loader-4-line ri-spin"></i>
            </div>
            <h2 style="margin: 0; color: var(--md-sys-color-on-surface); font-weight: 600;">${t('creator.bgProcess.processing') || '处理中...'}</h2>
            
            <div style="width: 300px; height: 6px; background: var(--md-sys-color-surface-variant); border-radius: 3px; margin-top: 30px; overflow: hidden;">
                <div class="progress-bar-fill" style="width: 5%; height: 100%; background: var(--md-sys-color-primary); transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);"></div>
            </div>
            
            <button id="cancel-overlay-btn" style="margin-top: 40px; border: 1px solid var(--md-sys-color-outline-variant); background: transparent; color: var(--md-sys-color-on-surface-variant); padding: 8px 24px; border-radius: 20px; cursor: pointer;">
                ${t('common.close')}
            </button>
        `;

        overlay.querySelector('#cancel-overlay-btn').onclick = () => this.remove();

        const target = this.parent.modalContent || document.body;
        target.appendChild(overlay);
        this.overlay = overlay;
    }

    _onProgress(changes, area) {
        if (area === 'local' && changes[StorageKeys.BUILDER_DRAFTS]) {
            StorageHelper.get(StorageKeys.BUILDER_DRAFTS).then(drafts => {
                const draftList = Object.values(drafts || {});
                const draft = draftList.find(d => d.id === this.draftId);
                if (draft && draft.progress) {
                    const pct = draft.progress.percentage || 0;
                    const fill = this.overlay.querySelector('.progress-bar-fill');
                    if (fill) fill.style.width = `${pct}%`;

                    const status = draft.status;
                    if (status === 'ready' || status === 'error') {
                        this._cleanup();
                        if (status === 'ready' && this.onComplete) {
                            setTimeout(() => { this.overlay.remove(); this.onComplete(); }, 500);
                        } else {
                            this.overlay.remove();
                            if (status === 'error') notificationService.alert(t('creator.error.general'));
                        }
                    }
                }
            });
        }
    }

    _cleanup() {
        chrome.storage.onChanged.removeListener(this._boundOnProgress);
    }

    remove() {
        this._cleanup();
        if (this.overlay) this.overlay.remove();
        notificationService.toast(t('creator.bgProcess.toast'));
    }
}

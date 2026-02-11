import { t } from '../../locales/index.js';

/**
 * DebugModal
 * A specialized modal for viewing and copying raw JSON data for debugging purposes.
 */
export class DebugModal {
    constructor(parent = document.body) {
        this.parent = parent;
        this.overlay = null;
    }

    show(data, title = 'Raw Data Debug') {
        if (this.overlay) this.overlay.remove();

        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '20000',
            display: 'flex', alignItems: 'center', justifyItems: 'center', padding: '20px',
            boxSizing: 'border-box', backdropFilter: 'blur(4px)'
        });

        const modal = document.createElement('div');
        Object.assign(modal.style, {
            backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '500px',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column', margin: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)', overflow: 'hidden'
        });

        const formattedJson = JSON.stringify(data, null, 2);

        modal.innerHTML = `
            <div style="padding: 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #f8f9fa;">
                <h3 style="margin: 0; font-size: 1.1rem; color: #333;">${title}</h3>
                <button class="js-close-debug" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999;">&times;</button>
            </div>
            <div style="padding: 16px; overflow-y: auto; flex: 1; background: #1e1e1e;">
                <pre style="margin: 0; font-family: 'Consolas', 'Monaco', monospace; font-size: 0.85rem; color: #d4d4d4; white-space: pre-wrap; word-break: break-all;">${this._escapeHtml(formattedJson)}</pre>
            </div>
            <div style="padding: 12px 16px; border-top: 1px solid #eee; display: flex; gap: 10px; justify-content: flex-end; background: #f8f9fa;">
                <button class="js-copy-debug" style="padding: 8px 16px; border-radius: 6px; border: 1px solid #3b82f6; background: #3b82f6; color: #fff; cursor: pointer; font-weight: 500;">
                    <i class="ri-file-copy-line"></i> ${t('common.copy') || 'Copy'}
                </button>
                <button class="js-close-debug-btn" style="padding: 8px 16px; border-radius: 6px; border: 1px solid #ddd; background: #fff; color: #666; cursor: pointer;">
                    ${t('common.close') || 'Close'}
                </button>
            </div>
        `;

        overlay.appendChild(modal);
        this.parent.appendChild(overlay);
        this.overlay = overlay;

        // Bind Events
        const close = () => {
            overlay.remove();
            this.overlay = null;
        };

        overlay.onclick = (e) => { if (e.target === overlay) close(); };
        modal.querySelector('.js-close-debug').onclick = close;
        modal.querySelector('.js-close-debug-btn').onclick = close;

        const copyBtn = modal.querySelector('.js-copy-debug');
        copyBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(formattedJson);
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="ri-check-line"></i> Copied!';
                copyBtn.style.background = '#10b981';
                copyBtn.style.borderColor = '#10b981';
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.style.background = '#3b82f6';
                    copyBtn.style.borderColor = '#3b82f6';
                }, 2000);
            } catch (err) {
                alert('Failed to copy text.');
            }
        };
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

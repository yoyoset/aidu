import { t } from '../../locales/index.js';

// HTML Escape Utility to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Helper to safely render string or object arrays (handles [object Object] issues)
function renderChipGroup(data, colorClass = '') {
    if (!Array.isArray(data)) return '';
    return data.map(item => {
        const text = typeof item === 'object' ? (item.word || item.lemma || JSON.stringify(item)) : String(item);
        const style = `background:#f1f5f9; padding:4px 10px; border-radius:6px; font-size:0.85rem; color:#475569; border:1px solid #e2e8f0; ${colorClass}`;
        return `<span style="${style}">${escapeHTML(text)}</span>`;
    }).join('');
}

export function showDeepDiveModal(entry, deepData) {
    const modal = document.createElement('div');
    modal.id = 'deep-dive-overlay';
    Object.assign(modal.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(8px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: '10000', transition: 'all 0.3s ease'
    });

    const content = document.createElement('div');
    Object.assign(content.style, {
        background: 'var(--md-sys-color-surface, #ffffff)', padding: '0', borderRadius: '24px',
        maxWidth: '480px', width: '92%', maxHeight: '80vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', border: '1px solid var(--md-sys-color-outline-variant, #e2e8f0)',
        animation: 'modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
    });

    // Add Animation Keyframes
    if (!document.getElementById('dd-modal-styles')) {
        const styleTag = document.createElement('style');
        styleTag.id = 'dd-modal-styles';
        styleTag.textContent = `
            @keyframes modalSlideUp {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .dd-section-title { font-size: 0.8rem !important; font-weight: 800 !important; color: var(--md-sys-color-primary, #3b82f6) !important; text-transform: uppercase !important; letter-spacing: 0.1em !important; margin-bottom: 12px !important; display: flex !important; align-items: center !important; gap: 8px !important; opacity: 0.8; }
            .dd-content-p { font-size: 1rem !important; line-height: 1.7 !important; color: var(--md-sys-color-on-surface, #334155) !important; margin: 0 !important; }
            .dd-card { background: var(--md-sys-color-surface-container-low, #fff) !important; border: 1px solid var(--md-sys-color-outline-variant, #e2e8f0) !important; padding: 12px 16px !important; border-radius: 12px !important; transition: all 0.2s ease; }
            .dd-card:hover { border-color: var(--md-sys-color-primary, #3b82f6); background: var(--md-sys-color-surface-container-high, #f8fafc) !important; }
        `;
        document.head.appendChild(styleTag);
    }

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
        padding: '20px 24px', borderBottom: '1px solid var(--md-sys-color-outline-variant, #eee)',
        background: 'var(--md-sys-color-surface-container, #f8fafc)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    });

    const safeWord = escapeHTML(entry?.word || 'Analysis');
    header.innerHTML = `
        <div>
            <h2 style="margin:0; font-size:1.5rem; font-weight:800; color:var(--md-sys-color-on-surface, #1e293b); letter-spacing:-0.02em;">${safeWord}</h2>
            <div style="font-size:0.8rem; font-weight:600; color:var(--md-sys-color-primary, #3b82f6); margin-top:2px;">${t('deep.analysis')}</div>
        </div>
        <button id="close-dd" style="background:var(--md-sys-color-surface-variant, #f1f5f9); border:none; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#64748b; transition:all 0.2s;"><i class="ri-close-line" style="font-size:1.2rem;"></i></button>
    `;

    // Body
    const body = document.createElement('div');
    Object.assign(body.style, {
        padding: '24px', overflowY: 'auto', scrollbarWidth: 'thin'
    });

    if (!deepData || typeof deepData !== 'object') {
        body.innerHTML = `<div style="text-align:center; color:#999; padding:60px 0;">${t('deep.noData')}</div>`;
    } else {
        let html = '';
        const sectionStyle = 'margin-bottom:28px;';

        // Etymology
        if (deepData.etymology) {
            html += `
                <div style="${sectionStyle}">
                    <h3 class="dd-section-title"><i class="ri-history-line"></i> ${t('deep.etymology')}</h3>
                    <p class="dd-content-p">${escapeHTML(deepData.etymology)}</p>
                </div>`;
        }

        // Word Family
        if (deepData.wordFamily && deepData.wordFamily.length) {
            html += `
                <div style="${sectionStyle}">
                    <h3 class="dd-section-title"><i class="ri-node-tree"></i> ${t('deep.wordFamily')}</h3>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                        ${renderChipGroup(deepData.wordFamily)}
                    </div>
                </div>`;
        }

        // Synonyms
        if (deepData.synonyms && deepData.synonyms.length) {
            html += `
                <div style="${sectionStyle}">
                    <h3 class="dd-section-title"><i class="ri-exchange-box-line"></i> ${t('deep.synonyms')}</h3>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        ${deepData.synonyms.map(s => `
                            <div class="dd-card">
                                <strong style="color:var(--md-sys-color-primary, #2563eb); font-size:1.05rem;">${escapeHTML(s.word)}</strong>
                                <div style="color:var(--md-sys-color-on-surface-variant, #64748b); font-size:0.9rem; margin-top:4px; line-height:1.5;">${escapeHTML(s.diff)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        }

        // Antonyms
        if (deepData.antonyms && deepData.antonyms.length) {
            html += `
                <div style="${sectionStyle}">
                    <h3 class="dd-section-title"><i class="ri-arrow-left-right-line"></i> ${t('deep.antonyms')}</h3>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                        ${renderChipGroup(deepData.antonyms, 'background:#fff1f2; color:#be123c; border-color:#fecdd3;')}
                    </div>
                </div>`;
        }

        // Register
        if (deepData.register) {
            html += `
                <div style="${sectionStyle}">
                    <h3 class="dd-section-title"><i class="ri-git-repository-private-line"></i> ${t('deep.register')}</h3>
                    <div class="dd-card" style="border-left:4px solid var(--md-sys-color-tertiary, #10b981); background:#f0fdf4 !important;">
                        <p class="dd-content-p" style="font-style:italic;">${escapeHTML(deepData.register)}</p>
                    </div>
                </div>`;
        }

        // Common Mistakes
        if (deepData.commonMistakes && deepData.commonMistakes.length) {
            html += `
                <div style="${sectionStyle}">
                    <h3 class="dd-section-title"><i class="ri-error-warning-line"></i> ${t('deep.commonMistakes')}</h3>
                    ${deepData.commonMistakes.map(m => `
                        <div style="background:var(--md-sys-color-error-container, #fef2f2); border:1px solid #fecaca; padding:16px; border-radius:16px; margin-bottom:12px;">
                            <div style="color:#dc2626; font-weight:700; display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                                <i class="ri-close-circle-fill" style="font-size:1.2rem;"></i> ${escapeHTML(m.wrong)}
                            </div>
                            <div style="color:#16a34a; font-weight:700; display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                                <i class="ri-checkbox-circle-fill" style="font-size:1.2rem;"></i> ${escapeHTML(m.correct)}
                            </div>
                            <div style="font-size:0.9rem; line-height:1.6; color:#64748b; background:rgba(255,255,255,0.5); padding:8px 12px; border-radius:8px;">
                                ${escapeHTML(m.note)}
                            </div>
                        </div>
                    `).join('')}
                </div>`;
        }

        // Cultural Notes
        if (deepData.culturalNotes) {
            html += `
                <div style="${sectionStyle}; margin-bottom:10px;">
                    <h3 class="dd-section-title"><i class="ri-earth-line"></i> ${t('deep.cultural')}</h3>
                    <div style="padding:12px 0; border-top:1px dashed #e2e8f0;">
                         <p class="dd-content-p" style="font-size:0.95rem;">${escapeHTML(deepData.culturalNotes)}</p>
                    </div>
                </div>`;
        }

        body.innerHTML = html;
    }

    content.appendChild(header);
    content.appendChild(body);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close Logic
    const close = () => {
        content.style.animation = 'modalSlideUp 0.2s reverse forwards';
        modal.style.opacity = '0';
        setTimeout(() => {
            if (modal.parentNode) document.body.removeChild(modal);
        }, 200);
    };

    header.querySelector('#close-dd').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };
}

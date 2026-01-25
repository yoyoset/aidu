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

export function showDeepDiveModal(entry, deepData) {
    const modal = document.createElement('div');
    Object.assign(modal.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: '9999'
    });

    const content = document.createElement('div');
    Object.assign(content.style, {
        background: 'white', padding: '0', borderRadius: '12px',
        maxWidth: '500px', width: '90%', maxHeight: '85vh',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
    });

    // Header - use escapeHTML for user-provided word
    const header = document.createElement('div');
    Object.assign(header.style, {
        padding: '16px 24px', borderBottom: '1px solid #eee', background: '#f8fafc',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    });
    const safeWord = escapeHTML(entry?.word || 'Unknown');
    header.innerHTML = `
        <div>
            <h2 style="margin:0; font-size:1.3rem; color:#1e293b;">${safeWord}</h2>
            <div style="font-size:0.85rem; color:#64748b;">${t('deep.analysis')}</div>
        </div>
        <button id="close-dd" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#94a3b8;">&times;</button>
    `;

    // Body with Scroll
    const body = document.createElement('div');
    Object.assign(body.style, {
        padding: '24px', overflowY: 'auto'
    });

    // Null/Invalid Data Check - Early Return for invalid data
    if (!deepData || typeof deepData !== 'object') {
        body.innerHTML = `<div style="text-align:center; color:#999; padding:40px 0;">${t('deep.noData')}</div>`;
        content.appendChild(header);
        content.appendChild(body);
        modal.appendChild(content);
        document.body.appendChild(modal);

        const close = () => document.body.removeChild(modal);
        header.querySelector('#close-dd').onclick = close;
        modal.onclick = (e) => { if (e.target === modal) close(); };
        return;
    }

    // Build HTML with escaped content
    const sectionStyle = 'margin-bottom:20px;';
    const h3Style = 'font-size:0.95rem; font-weight:700; color:#3b82f6; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px; display:flex; align-items:center; gap:6px;';
    const pStyle = 'font-size:0.95rem; line-height:1.6; color:#334155; margin:0;';

    let html = '';

    // Etymology
    if (deepData.etymology) {
        html += `<div style="${sectionStyle}"><h3 style="${h3Style}">${t('deep.etymology')}</h3><p style="${pStyle}">${escapeHTML(deepData.etymology)}</p></div>`;
    }

    // Word Family
    if (deepData.wordFamily && deepData.wordFamily.length) {
        html += `<div style="${sectionStyle}"><h3 style="${h3Style}">${t('deep.wordFamily')}</h3>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
            ${deepData.wordFamily.map(w => `<span style="background:#f1f5f9; padding:4px 8px; border-radius:4px; font-size:0.9rem; color:#475569;">${escapeHTML(w)}</span>`).join('')}
        </div></div>`;
    }

    // Synonyms
    if (deepData.synonyms && deepData.synonyms.length) {
        html += `<div style="${sectionStyle}"><h3 style="${h3Style}">${t('deep.synonyms')}</h3>
        <ul style="margin:0; padding-left:0; list-style:none; display:flex; flex-direction:column; gap:8px;">
            ${deepData.synonyms.map(s => `
                <li style="background:#fff; border:1px solid #e2e8f0; padding:8px 12px; border-radius:6px;">
                    <strong style="color:#0f172a;">${escapeHTML(s.word)}</strong>: <span style="color:#64748b;">${escapeHTML(s.diff)}</span>
                </li>
            `).join('')}
        </ul></div>`;
    }

    // Antonyms
    if (deepData.antonyms && deepData.antonyms.length) {
        html += `<div style="${sectionStyle}"><h3 style="${h3Style}">${t('deep.antonyms')}</h3>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
            ${deepData.antonyms.map(a => `<span style="background:#fef2f2; padding:4px 8px; border-radius:4px; font-size:0.9rem; color:#dc2626;">${escapeHTML(a)}</span>`).join('')}
        </div></div>`;
    }

    // Register
    if (deepData.register) {
        html += `<div style="${sectionStyle}"><h3 style="${h3Style}">${t('deep.register')}</h3><p style="${pStyle}">${escapeHTML(deepData.register)}</p></div>`;
    }

    // Common Mistakes
    if (deepData.commonMistakes && deepData.commonMistakes.length) {
        html += `<div style="${sectionStyle}"><h3 style="${h3Style}">${t('deep.commonMistakes')}</h3>
        ${deepData.commonMistakes.map(m => `
            <div style="background:#fef2f2; border:1px solid #fecaca; padding:10px; border-radius:6px; margin-bottom:8px;">
                <div style="color:#dc2626; margin-bottom:4px;">❌ ${escapeHTML(m.wrong)}</div>
                <div style="color:#16a34a; margin-bottom:4px;">✅ ${escapeHTML(m.correct)}</div>
                <div style="font-size:0.85rem; color:#64748b;">${escapeHTML(m.note)}</div>
            </div>
        `).join('')}
        </div>`;
    }

    // Cultural Notes
    if (deepData.culturalNotes) {
        html += `<div style="${sectionStyle}"><h3 style="${h3Style}">${t('deep.cultural')}</h3><p style="${pStyle}">${escapeHTML(deepData.culturalNotes)}</p></div>`;
    }

    body.innerHTML = html || `<div style="text-align:center; color:#999;">${t('deep.noData')}</div>`;

    content.appendChild(header);
    content.appendChild(body);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close Logic
    const close = () => document.body.removeChild(modal);
    header.querySelector('#close-dd').onclick = close;
    modal.onclick = (e) => { if (e.target === modal) close(); };
}

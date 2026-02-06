import { t } from '../../../locales/index.js';
import { notificationService } from '../../../utils/notification_service.js';

export class HandwritingSheet {
    static generate(vocabList, title = t('print.title')) {
        if (!vocabList || vocabList.length === 0) {
            notificationService.alert(t('print.empty'));
            return;
        }

        const win = window.open('', '_blank');
        if (!win) {
            notificationService.alert(t('print.popupBlock'));
            return;
        }

        const vocabRows = vocabList.map((v, index) => {
            return `
            <div class="word-row">
                <div class="word-info">
                    <span class="word-number">${index + 1}.</span>
                    <strong class="word-text">${v.word}</strong>
                    <span class="word-phonetic">${v.phonetic ? `[${v.phonetic}]` : ''}</span>
                    <span class="word-pos">${v.pos ? `(${v.pos})` : ''}</span>
                </div>
                <div class="word-meaning">${v.meaning || ''}</div>
                <div class="writing-area">
                    <div class="line"></div>
                    <div class="line"></div>
                </div>
            </div>
            `;
        }).join('');

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                @page { size: A4; margin: 20mm; }
                body { font-family: 'Segoe UI', serif; color: #333; margin: 0; padding: 20px; }
                h1 { text-align: center; color: #2e7d32; font-size: 24px; margin-bottom: 30px; border-bottom: 2px solid #2e7d32; padding-bottom: 10px; }
                .meta { text-align: right; color: #666; font-size: 0.9em; margin-bottom: 20px; }
                
                .word-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 15px;
                    border-bottom: 1px dashed #ccc;
                    padding-bottom: 15px;
                    page-break-inside: avoid;
                }
                .word-info { width: 25%; padding-right: 15px; }
                .word-number { color: #999; font-size: 0.8em; display: inline-block; width: 20px;}
                .word-text { font-size: 1.4em; color: #000; display: block; }
                .word-phonetic { font-family: "Lucida Console", monospace; color: #555; font-size: 0.9em; }
                .word-pos { font-style: italic; color: #777; font-size: 0.8em; margin-left: 5px; }
                
                .word-meaning { width: 20%; font-size: 0.95em; color: #444; padding-right: 15px; }
                
                .writing-area { flex: 1; display: flex; flex-direction: column; gap: 12px; }
                .line {
                    height: 24px;
                    border-bottom: 1px solid #333; /* Main line */
                    position: relative;
                }
                /* Dotted middle line hint */
                .line::after {
                    content: "";
                    position: absolute;
                    top: 50%;
                    left: 0; right: 0;
                    border-bottom: 1px dotted #ccc;
                    z-index: -1;
                }

                @media print {
                    .no-print { display: none; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="no-print" style="position:fixed; top:20px; right:20px; z-index:1000;">
                <button id="print-btn" style="background:#2e7d32; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-size:16px; box-shadow:0 4px 12px rgba(0,0,0,0.15); font-weight:bold;">${t('print.btn')}</button>
            </div>
            <h1>${title}</h1>
            <div class="meta">${t('print.meta', { date: new Date().toLocaleDateString(), count: vocabList.length })}</div>
            
            <div class="sheet-content">
                ${vocabRows}
            </div>
        </body>
        </html>
        `;

        win.document.write(html);
        win.document.close();
        win.focus();

        // CSP Safe Event Binding
        const btn = win.document.getElementById('print-btn');
        if (btn) {
            btn.addEventListener('click', () => win.print());
        }
    }
}

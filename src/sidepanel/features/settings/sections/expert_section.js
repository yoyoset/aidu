import { t } from '../../../../locales/index.js';
import styles from '../settings.module.css';

export class ExpertSection {
    constructor(parent) {
        this.parent = parent;
    }

    render() {
        const { expertPrompts } = this.parent;
        return `
            <div class="${styles.expertSection}" style="border: 1px dashed #ef4444 !important; margin: 15px 0 !important; background: #fff5f5 !important; border-radius: 8px !important; overflow: hidden !important; display: block !important;">
                <div class="${styles.expertHeader}" id="expert-toggle" style="padding: 14px 20px !important; background: #fee2e2 !important; color: #991b1b !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: space-between !important; font-weight: bold !important; border-bottom: 1px solid #fca5a5 !important; min-height: 48px !important;">
                    <div style="display:flex; align-items:center; gap:8px; pointer-events: none;">
                        <i class="ri-flask-line"></i>
                        <strong>实验室：自定义提示词 (Expert)</strong>
                    </div>
                    <span id="expert-arrow" style="pointer-events: none;">▼</span>
                </div>
                <div class="${styles.expertContent}" id="expert-content">
                    <p style="font-size:0.75rem; color:#b91c1c; margin-bottom:15px; background:#fff; border: 1px solid #fee2e2; padding:10px; border-radius:4px; line-height:1.4;">
                        ${t('settings.expert.warning') || '警告：修改 System Prompt 可能导致 AI 输出失效。非专业人士请勿改动。'}
                    </p>
                    
                    ${this.renderPromptGroup('analysis_mode_1', '分析：基础翻译 (Mode 1)', expertPrompts.analysis_mode_1)}
                    ${this.renderPromptGroup('analysis_mode_2', '分析：标准解析 (Mode 2)', expertPrompts.analysis_mode_2)}
                    ${this.renderPromptGroup('analysis_mode_3', '分析：深度解析 (Mode 3)', expertPrompts.analysis_mode_3)}

                    <hr style="border:none; border-top:1px dashed #fca5a5; margin:20px 0;">

                    ${this.renderPromptGroup('dict_lookup', '词典：简明查词 (Translation)', expertPrompts.dict_lookup)}
                    ${this.renderPromptGroup('example_gen', '例句：地道解说实例 (Example)', expertPrompts.example_gen)}
                    ${this.renderPromptGroup('deep_analysis', '深度：语言专家模式 (Deep Dive)', expertPrompts.deep_analysis)}
                </div>
            </div>
        `;
    }

    renderPromptGroup(key, label, value) {
        const id = `prompt-${key.replace(/_/g, '-')}`;
        return `
            <div class="${styles.expertGroup}">
                <div class="${styles.expertLabel}">
                    <span>${label}</span>
                    <button class="${styles.resetMiniBtn}" data-reset="${key}">${t('settings.expert.reset') || '恢复默认'}</button>
                </div>
                <textarea class="${styles.promptTextarea}" id="${id}" placeholder="${t('settings.expert.placeholder') || '默认逻辑已内置'}">${value || ''}</textarea>
            </div>
        `;
    }

    bind(content) {
        const expertToggle = content.querySelector('#expert-toggle');
        const expertContent = content.querySelector('#expert-content');
        const expertArrow = content.querySelector('#expert-arrow');

        if (expertToggle) {
            expertToggle.onclick = () => {
                const isExpanded = expertContent.classList.toggle(styles.expanded);
                expertArrow.textContent = isExpanded ? '▲' : '▼';
            };
        }

        content.querySelectorAll('[data-reset]').forEach(btn => {
            btn.onclick = (e) => {
                const key = e.target.dataset.reset;
                const textareaId = `prompt-${key.replace(/_/g, '-')}`;
                const textarea = content.querySelector(`#${textareaId}`);
                if (textarea) textarea.value = '';
            };
        });
    }

    collectData(content) {
        const keys = ['analysis_mode_1', 'analysis_mode_2', 'analysis_mode_3', 'dict_lookup', 'example_gen', 'deep_analysis'];
        const prompts = {};
        keys.forEach(key => {
            const id = `prompt-${key.replace(/_/g, '-')}`;
            const el = content.querySelector(`#${id}`);
            if (el) {
                const val = el.value.trim();
                if (val) prompts[key] = val;
            }
        });
        return { expertPrompts: prompts };
    }
}

import { PERSONAS } from '../../../background/llm/persona.js';
import { SENTENCE_SCHEMA } from '../../../utils/schema_constants.js';
import { StorageHelper, StorageKeys } from '../../../utils/storage.js';
import { notificationService } from '../../../utils/notification_service.js';
import styles from './settings.module.css';

const DEFAULT_PROMPTS = {
    // Analysis Modes
    analysis_mode_1: `Role: Professional Translator | Output: JSON ONLY | Lang: Simplified Chinese
Rule: Preserve original_text exactly. Natural translation.

Format: {"sentences":[{"original_text":"","translation":""}]}

## EXAMPLES
Input: "Hello world."
Output: {"sentences":[{"original_text":"Hello world.","translation":"你好，世界。"}]}`,

    analysis_mode_2: `Role: English Language Coach
Strategy: Standard Coaching: Brief grammar. Avoid depth.
CONSTRAINTS:
- **CRITICAL: You MUST respond ONLY in Simplified Chinese (简体中文) for all translations and explanations.**
- **CRITICAL: You MUST segment the input into individual sentences. Each object in the 'sentences' array represents ONE complete sentence.**
- Output: VALID JSON ONLY. NO MARKDOWN.
- POS: Use only from [NOUN, VERB, ADJ, ADV, PRON, PREP, CONJ, PART, INTJ, DET, NUM, PUNCT, STOP].
- Explanation: Max 10 words or null.

Format: {"sentences":[{"original_text":"","translation":"","segments":[["phrase","POS","lemma"]],"phrasal_verbs":[{"text":"","indices":[],"lemma":"","translation":""}],"explanation":""}]}

## EXAMPLES
Input: "I am happy."
Output: {"sentences":[{"original_text":"I am happy.","translation":"我很开心。","segments":[["I","PRON","i"],["am","VERB","be"],["happy","ADJ","happy"],[".","PUNCT","."]],"phrasal_verbs":[],"explanation":""}]}`,

    analysis_mode_3: `Role: English Language Coach
Strategy: Expert Coaching: Nuance, idioms, and syntax parsing.
CONSTRAINTS:
- **CRITICAL: You MUST respond ONLY in Simplified Chinese (简体中文) for all translations and explanations.**
- **CRITICAL: You MUST segment the input into individual sentences. Each object in the 'sentences' array represents ONE complete sentence.**
- Output: VALID JSON ONLY. NO MARKDOWN.
- POS: Use only from [NOUN, VERB, ADJ, ADV, PRON, PREP, CONJ, PART, INTJ, DET, NUM, PUNCT, STOP].
- Explanation: Focus on linguistic nuance, max 2 sentences.

Format: {"sentences":[{"original_text":"","translation":"","segments":[["phrase","POS","lemma"]],"phrasal_verbs":[{"text":"","indices":[],"lemma":"","translation":""}],"explanation":""}]}

## EXAMPLES
Input: "He broke it up."
Output: {"sentences":[{"original_text":"He broke it up.","translation":"他把它弄碎了。","segments":[["He","PRON","he"],["broke","VERB","break"],["it","PRON","it"],["up","PART","up"],[".","PUNCT","."]],"phrasal_verbs":[{"text":"broke ... up","indices":[1,3],"lemma":"break up","translation":"弄碎"}],"explanation":"'break up' is a phrasal verb meaning to disintegrate or end something."}]}`,

    // Dictionary Modes
    dict_lookup: `Role: Minimalist Dictionary API | Output: JSON ONLY
Constraints:
- Meaning: 1-3 core Chinese words.
- Context: Prioritize if provided.
- Schema: {"m":"","p":"","l":"","collocations":[]}

## EXAMPLES
Input: "snail" | Context: "Slow"
Output: {"m":"蜗牛","p":"sneɪl","l":"A2","collocations":["garden snail"]}`,

    example_gen: `You are a helpful language tutor for a young student. 
Generate ONE English sentence using the provided word.
Constraints:
1. Structure: Interesting and varied (not just Subject - Verb - Object).
2. Vocabulary: Simple and easy to understand (CEFR A2 level).
3. Content: Engaging for a child or young learner.
4. Output: ONLY the sentence. No quotes.

## EXAMPLES
Input: "apple"
Output: The red apple fell from the tree with a loud thud.`,

    deep_analysis: `Role: Linguistics Expert | Output: JSON ONLY
Schema: {"etymology":"","wordFamily":[],"synonyms":[{"word":"","diff":""}],"antonyms":[],"register":"","commonMistakes":[{"wrong":"","correct":"","note":""}],"culturalNotes":""}
Constraints: All explanations in Simplified Chinese. Concise & Practical.

## EXAMPLES
Input: "serendipity"
Output: {"etymology":"Coined by Horace Walpole in 1754...","wordFamily":["serendipitous"],"synonyms":[{"word":"fluke","diff":"More informal"}],"antonyms":[],"register":"Formal","commonMistakes":[],"culturalNotes":""}`,

    // Teaching Personas
    persona_casual: PERSONAS.casual || '你是一位亲切的英语私教，讲解轻松自然。',
    persona_academic: PERSONAS.academic || '你是一位语言学教授，讲解风格严谨专业。',
    persona_humorous: PERSONAS.humorous || '你是一位幽默的老师，喜欢用梗和吐槽。',
    persona_concise: PERSONAS.concise || '你惜字如金，只说最核心的要点。',
    persona_primary_school: PERSONAS.primary_school || '你是一位小学英语老师。'
};

/**
 * ExpertPromptsModal
 * Dedicated modal for advanced users to customize LLM prompts.
 */
export class ExpertPromptsModal {
    constructor() {
        this.element = null;
        this.overlay = null;
    }

    async open() {
        this.render();
        await this.load();
    }

    render() {
        this.element = document.createElement('div');
        this.element.className = styles.modalRoot;

        const overlay = document.createElement('div');
        overlay.className = styles.modalOverlay;
        overlay.onclick = (e) => {
            if (e.target === overlay) this.close();
        };

        const content = document.createElement('div');
        content.className = styles.modalContent;
        content.style.maxWidth = '900px';
        content.style.height = '90vh';

        // Header
        const header = document.createElement('div');
        header.className = styles.modalHeader;
        header.style.background = '#fee2e2';
        header.style.borderBottom = '2px solid #ef4444';

        const title = document.createElement('h2');
        title.innerHTML = '<i class="ri-flask-line" style="margin-right:8px;color:#dc2626;"></i>实验室：自定义提示词';
        title.style.color = '#991b1b';

        const closeBtn = document.createElement('button');
        closeBtn.className = styles.closeBtn;
        closeBtn.innerHTML = '<i class="ri-close-line"></i>';
        closeBtn.onclick = () => this.close();

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Body
        const body = document.createElement('div');
        body.className = styles.modalBody;
        body.style.overflowY = 'auto';
        body.style.padding = '20px';

        const warning = document.createElement('div');
        warning.style.cssText = 'background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;margin-bottom:20px;border-radius:4px;';
        warning.innerHTML = '<strong>⚠️ 警告</strong><br>修改提示词可能导致解析失败或返回格式错误。仅在充分理解提示词工程后使用此功能。';
        body.appendChild(warning);

        // Section: Analysis Modes
        body.appendChild(this.createSectionHeader('文章分析模式', 'ri-article-line'));
        body.appendChild(this.createPromptSection('analysis_mode_1', '模式1：仅翻译', '#10b981', 8));
        body.appendChild(this.createPromptSection('analysis_mode_2', '模式2：简单分析', '#3b82f6', 10));
        body.appendChild(this.createPromptSection('analysis_mode_3', '模式3：深度分析', '#8b5cf6', 12));

        // Section: Dictionary
        body.appendChild(this.createSectionHeader('词典查询', 'ri-book-2-line'));
        body.appendChild(this.createPromptSection('dict_lookup', '简单词典', '#f59e0b', 8));
        body.appendChild(this.createPromptSection('example_gen', '例句生成', '#ec4899', 6));
        body.appendChild(this.createPromptSection('deep_analysis', '深度解析', '#6366f1', 8));

        // Section: Personas
        body.appendChild(this.createSectionHeader('教学风格', 'ri-user-star-line'));
        body.appendChild(this.createPromptSection('persona_casual', '轻松口语 😊', '#14b8a6', 3));
        body.appendChild(this.createPromptSection('persona_academic', '学术严谨 📚', '#6366f1', 3));
        body.appendChild(this.createPromptSection('persona_humorous', '幽默有趣 😂', '#f59e0b', 3));
        body.appendChild(this.createPromptSection('persona_concise', '简洁高效 ⚡', '#10b981', 3));
        body.appendChild(this.createPromptSection('persona_primary_school', '小学模式 🎒', '#ec4899', 3));

        // Footer
        const footer = document.createElement('div');
        footer.className = styles.footer;
        footer.style.borderTop = '1px solid #e5e7eb';
        footer.style.padding = '16px 24px';

        const resetBtn = document.createElement('button');
        resetBtn.className = styles.btnSecondary;
        resetBtn.innerHTML = '<i class="ri-restart-line" style="margin-right:6px;"></i>恢复默认';
        resetBtn.onclick = () => this.resetToDefaults();

        const saveBtn = document.createElement('button');
        saveBtn.className = styles.btnPrimary;
        saveBtn.style.background = '#dc2626';
        saveBtn.innerHTML = '<i class="ri-save-line" style="margin-right:6px;"></i>保存';
        saveBtn.onclick = () => this.save();

        footer.appendChild(resetBtn);
        footer.appendChild(saveBtn);

        content.appendChild(header);
        content.appendChild(body);
        content.appendChild(footer);
        overlay.appendChild(content);
        this.element.appendChild(overlay);
        document.body.appendChild(this.element);
        this.overlay = overlay;
    }

    createSectionHeader(title, icon) {
        const header = document.createElement('div');
        header.style.cssText = 'margin:24px 0 12px;padding-bottom:8px;border-bottom:2px solid #e5e7eb;font-size:16px;font-weight:700;color:#374151;';
        header.innerHTML = `<i class="${icon}" style="margin-right:6px;color:#dc2626;"></i>${title}`;
        return header;
    }

    createPromptSection(key, label, color, rows = 8) {
        const section = document.createElement('div');
        section.style.marginBottom = '16px';

        const labelEl = document.createElement('label');
        labelEl.style.cssText = `display:block;font-weight:600;margin-bottom:6px;color:${color};font-size:13px;`;
        labelEl.innerHTML = `<i class="ri-code-s-slash-line" style="margin-right:4px;"></i>${label}`;

        const textarea = document.createElement('textarea');
        textarea.id = `expert-${key}`;
        textarea.className = styles.promptTextarea;
        textarea.rows = rows;
        textarea.style.cssText = 'width:100%;font-family:monospace;font-size:12px;padding:10px;border:1px solid #d1d5db;border-radius:6px;resize:vertical;';

        section.appendChild(labelEl);
        section.appendChild(textarea);
        return section;
    }

    async load() {
        const expertPrompts = await StorageHelper.get(StorageKeys.EXPERT_PROMPTS) || {};
        let migrated = false;

        // Auto-Migration: Detect and fix common schema drifts
        Object.keys(DEFAULT_PROMPTS).forEach(key => {
            if (expertPrompts[key]) {
                const p = expertPrompts[key];
                // Check if it's using the old 'original' instead of 'original_text'
                if (p.includes('"original":') && !p.includes('"original_text":')) {
                    console.log(`ExpertPrompts: Migrating ${key} to new schema...`);
                    expertPrompts[key] = p
                        .replace(/"original":/g, '"original_text":')
                        .replace(/"simplified_chinese":/g, '"translation":')
                        .replace(/"grammar_notes":/g, '"explanation":')
                        .replace(/"pos":/g, '"segments":');
                    migrated = true;
                }
            }
        });

        if (migrated) {
            await StorageHelper.set(StorageKeys.EXPERT_PROMPTS, expertPrompts);
            notificationService.success('提示词已自动升级至最新架构');
        }

        Object.keys(DEFAULT_PROMPTS).forEach(key => {
            const textarea = this.overlay.querySelector(`#expert-${key}`);
            if (textarea) {
                textarea.value = expertPrompts[key] || DEFAULT_PROMPTS[key] || '';
            }
        });
    }

    async save() {
        const expertPrompts = {};
        let hasError = false;

        Object.keys(DEFAULT_PROMPTS).forEach(key => {
            const textarea = this.overlay.querySelector(`#expert-${key}`);
            if (textarea) {
                const val = textarea.value.trim();

                // Simple Validation: Ensure schema keys are present if Format is defined
                if (key.startsWith('analysis_mode_')) {
                    const requiredKeys = [SENTENCE_SCHEMA.original_text, SENTENCE_SCHEMA.translation];
                    if (val.includes('Format:')) {
                        const missing = requiredKeys.filter(k => !val.includes(k));
                        if (missing.length > 0) {
                            notificationService.alert(`${key} 格式不包含必填字段: ${missing.join(', ')}`);
                            hasError = true;
                        }
                    }
                }

                expertPrompts[key] = val;
            }
        });

        if (hasError) return;

        // Strict confirmation - user must type "yes"
        const confirmation = await notificationService.prompt(
            '⚠️ 修改提示词可能影响系统功能（如阅读器白屏）。\n\n请输入 "yes" 确认保存：',
            '',
            '高风险操作确认'
        );

        if (confirmation !== 'yes') {
            if (confirmation !== null) {
                notificationService.toast('保存已取消', 'info');
            }
            return;
        }

        await StorageHelper.set(StorageKeys.EXPERT_PROMPTS, expertPrompts);
        notificationService.success('自定义提示词已保存');
        this.close();
    }

    async resetToDefaults() {
        const confirmed = confirm('确定要恢复所有提示词为默认值吗？');
        if (!confirmed) return;

        await StorageHelper.set(StorageKeys.EXPERT_PROMPTS, DEFAULT_PROMPTS);
        await this.load();
        notificationService.success('已恢复默认提示词');
    }

    close() {
        if (this.element) {
            this.element.remove();
            this.element = null;
            this.overlay = null;
        }
    }
}

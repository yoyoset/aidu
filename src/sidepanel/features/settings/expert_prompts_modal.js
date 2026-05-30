import { PERSONAS } from '../../../background/llm/persona.js';
import { SENTENCE_SCHEMA } from '../../../utils/schema_constants.js';
import { StorageHelper, StorageKeys } from '../../../utils/storage.js';
import { notificationService } from '../../../utils/notification_service.js';
import sharedStyles from './settings_shared.module.css';
import expertStyles from './settings_expert.module.css';
import { AlignmentWizard } from './alignment_wizard.js';
import { profileManager } from '../../../core/profile_manager.js';
import { t } from '../../../locales/index.js';
const styles = { ...sharedStyles, ...expertStyles };


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
        this.wizard = new AlignmentWizard();
    }

    async open() {
        try {
            if (!profileManager.settings) {
                await profileManager.load();
            }
            this.render();
            await this.load();
        } catch (err) {
            console.error('[ExpertPromptsModal] Failed to initialize modal:', err);
            notificationService.alert('加载提示词实验室失败，正在为您重置该模块: ' + err.message);
            this.close();
            throw err;
        }
    }

    render() {
        const activeProfile = profileManager.getActiveProfile() || {};
        const provider = activeProfile.provider || 'gemini';
        const model = activeProfile.model || 'gemini-2.0-flash';
        const modelKey = `${provider}:${model}`;

        this.element = document.createElement('div');
        this.element.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:9999; pointer-events:auto;';

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
        title.innerHTML = `<i class="ri-flask-line" style="margin-right:8px;color:#dc2626;"></i>${t('settings.expert.title') || '提示词实验室'}`;
        title.style.color = '#991b1b';

        // Add a beautiful model-scoped indicator badge next to the title
        const badge = document.createElement('span');
        badge.style.cssText = 'margin-left:12px;font-size:11px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:2px 8px;border-radius:12px;font-weight:600;display:inline-block;vertical-align:middle;';
        badge.textContent = `🎯 专属模型: ${model}`;
        title.appendChild(badge);

        const closeBtn = document.createElement('button');
        closeBtn.className = styles.closeBtn;
        closeBtn.innerHTML = '<i class="ri-close-line"></i>';
        closeBtn.onclick = () => this.close();

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Body
        const body = document.createElement('div');
        body.className = styles.scrollArea;
        body.style.overflowY = 'auto';
        body.style.padding = '20px';

        const warning = document.createElement('div');
        warning.style.cssText = 'background:#fffbeb;border-left:4px solid #d97706;padding:12px;margin-bottom:20px;border-radius:6px;box-shadow:0 1px 2px 0 rgba(0,0,0,0.05);';
        warning.innerHTML = `
            <div style="font-weight:700;color:#92400e;display:flex;align-items:center;gap:6px;font-size:13px;">
                <i class="ri-alert-fill" style="font-size:14px;color:#d97706;"></i> 提示词专属存档已激活
            </div>
            <div style="font-size:12px;margin-top:6px;color:#b45309;line-height:1.4;">
                当前配置已与模型 <code style="background:#fef3c7;padding:1px 4px;border-radius:4px;font-family:monospace;font-weight:600;">${modelKey}</code> 深度绑定。当您更改模型或切换 Profile 时，系统将<b>自动加载</b>对应模型的专属对齐提示词，您无需重新对齐或担心配置覆盖！
            </div>
        `;
        body.appendChild(warning);

        // Section: Analysis Modes
        body.appendChild(this.createSectionHeader(t('settings.expert.section.analysis') || '分析模式 (Analysis Modes)', 'ri-article-line'));
        body.appendChild(this.createPromptSection('analysis_mode_1', t('settings.mode.translation') || '极速翻译', '#10b981', 8));
        body.appendChild(this.createPromptSection('analysis_mode_2', t('settings.mode.standard') || '标准教学', '#3b82f6', 10));
        body.appendChild(this.createPromptSection('analysis_mode_3', t('settings.mode.deep') || '深度精读', '#8b5cf6', 12));

        // Section: Dictionary
        body.appendChild(this.createSectionHeader(t('settings.expert.section.dict') || '查词释义 (Dictionary Lookup)', 'ri-book-2-line'));
        body.appendChild(this.createPromptSection('dict_lookup', t('dict.expand') || '释义生成', '#f59e0b', 8));
        body.appendChild(this.createPromptSection('example_gen', t('vocab.actions.regenerate') || '例句扩写', '#ec4899', 6));
        body.appendChild(this.createPromptSection('deep_analysis', t('dict.deepDive') || '深度分析', '#6366f1', 8));

        // Section: Personas
        body.appendChild(this.createSectionHeader(t('settings.expert.section.persona') || '教学人设 (Teaching Personas)', 'ri-user-star-line'));
        body.appendChild(this.createPromptSection('persona_casual', '轻松口语 😊', '#14b8a6', 3));
        body.appendChild(this.createPromptSection('persona_academic', '学术严谨 📚', '#6366f1', 3));
        body.appendChild(this.createPromptSection('persona_humorous', '幽默有趣 😂', '#f59e0b', 3));
        body.appendChild(this.createPromptSection('persona_concise', '简洁高效 ⚡', '#10b981', 3));
        body.appendChild(this.createPromptSection('persona_primary_school', '小学模式 🎒', '#ec4899', 3));

        // Footer
        const footer = document.createElement('div');
        footer.className = styles.modalFooter;
        footer.style.borderTop = '1px solid #e5e7eb';
        footer.style.padding = '16px 24px';

        const resetBtn = document.createElement('button');
        resetBtn.className = styles.btnSecondary;
        resetBtn.innerHTML = `<i class="ri-restart-line" style="margin-right:6px;"></i>${t('settings.theme.reset') || '重置默认值'}`;
        resetBtn.onclick = () => this.resetToDefaults();

        const saveBtn = document.createElement('button');
        saveBtn.className = styles.btnPrimary;
        saveBtn.style.background = '#dc2626';
        saveBtn.innerHTML = `<i class="ri-save-line" style="margin-right:6px;"></i>${t('common.save') || '保存'}`;
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

        const headerRow = document.createElement('div');
        headerRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;';

        const labelEl = document.createElement('label');
        labelEl.style.cssText = `font-weight:600; color:${color}; font-size:13px;`;
        labelEl.innerHTML = `<i class="ri-code-s-slash-line" style="margin-right:4px;"></i>${label}`;
        headerRow.appendChild(labelEl);

        // 为分析模式增加“自动对齐”按钮
        if (key.startsWith('analysis_mode_')) {
            const alignBtn = document.createElement('button');
            alignBtn.className = styles.btnGhost || 'btn-ghost-aligned';
            alignBtn.style.padding = '4px 10px';
            alignBtn.style.fontSize = '11px';
            alignBtn.innerHTML = `<i class="ri-magic-line"></i> ${t('settings.expert.align.btn') || '探测与对齐'}`;
            alignBtn.onclick = () => this.handleAlign(key);
            headerRow.appendChild(alignBtn);
        }

        const textarea = document.createElement('textarea');
        textarea.id = `expert-${key}`;
        textarea.className = styles.promptTextarea;
        textarea.rows = rows;
        textarea.style.cssText = 'width:100%;font-family:monospace;font-size:12px;padding:10px;border:1px solid #d1d5db;border-radius:6px;resize:vertical;';

        section.appendChild(headerRow);
        section.appendChild(textarea);
        return section;
    }

    handleAlign(key) {
        const mode = parseInt(key.split('_').pop());
        const textarea = this.overlay.querySelector(`#expert-${key}`);
        this.wizard.open(mode, textarea);
    }

    async load() {
        if (!profileManager.settings) {
            await profileManager.load();
        }
        const activeProfile = profileManager.getActiveProfile() || {};
        const provider = activeProfile.provider || 'gemini';
        const model = activeProfile.model || 'gemini-2.0-flash';
        const modelKey = `${provider}:${model}`;
        const activeProfileId = profileManager.settings?.activeProfileId || 'default';

        let allExpertPrompts = await StorageHelper.get(StorageKeys.EXPERT_PROMPTS);
        
        // Quiet initialization to prevent console warnings on first run or corrupted storage
        if (!allExpertPrompts || typeof allExpertPrompts !== 'object' || Array.isArray(allExpertPrompts)) {
            allExpertPrompts = {};
        }

        // Backward Compatibility: Detect if allExpertPrompts is flat (which is legacy)
        const isFlat = Object.keys(DEFAULT_PROMPTS).some(key => key in allExpertPrompts);
        if (isFlat) {
            const flatPrompts = { ...allExpertPrompts };
            allExpertPrompts = {
                'default': flatPrompts
            };
            await StorageHelper.set(StorageKeys.EXPERT_PROMPTS, allExpertPrompts);
        }

        // Initialize modelKey scoped bucket if none exists
        if (!allExpertPrompts[modelKey] || typeof allExpertPrompts[modelKey] !== 'object') {
            // First try to copy from the legacy activeProfileId bucket if it has customized data
            if (allExpertPrompts[activeProfileId] && typeof allExpertPrompts[activeProfileId] === 'object') {
                allExpertPrompts[modelKey] = {
                    ...allExpertPrompts[activeProfileId]
                };
            } else {
                // Otherwise copy from 'default' bucket or DEFAULT_PROMPTS
                allExpertPrompts[modelKey] = {
                    ...(allExpertPrompts['default'] || DEFAULT_PROMPTS)
                };
            }
            await StorageHelper.set(StorageKeys.EXPERT_PROMPTS, allExpertPrompts);
        }

        const profilePrompts = allExpertPrompts[modelKey];
        let migrated = false;

        // Auto-Migration: Detect and fix common schema drifts
        Object.keys(DEFAULT_PROMPTS).forEach(key => {
            if (profilePrompts && profilePrompts[key]) {
                const p = profilePrompts[key];
                if (typeof p === 'string') {
                    // Check if it's using the old 'original' instead of 'original_text'
                    if (p.includes('"original":') && !p.includes('"original_text":')) {
                        console.log(`ExpertPrompts: Migrating ${key} to new schema...`);
                        profilePrompts[key] = p
                            .replace(/"original":/g, '"original_text":')
                            .replace(/"simplified_chinese":/g, '"translation":')
                            .replace(/"grammar_notes":/g, '"explanation":')
                            .replace(/"pos":/g, '"segments":');
                        migrated = true;
                    }
                }
            }
        });

        if (migrated) {
            allExpertPrompts[modelKey] = profilePrompts;
            await StorageHelper.set(StorageKeys.EXPERT_PROMPTS, allExpertPrompts);
            notificationService.success(t('settings.expert.migrated') || '提示词配置已成功完成 Schema 对齐升级！');
        }

        Object.keys(DEFAULT_PROMPTS).forEach(key => {
            const textarea = this.overlay.querySelector(`#expert-${key}`);
            if (textarea) {
                textarea.value = (profilePrompts && profilePrompts[key]) || DEFAULT_PROMPTS[key] || '';
            }
        });
    }

    async save() {
        if (!profileManager.settings) {
            await profileManager.load();
        }
        const activeProfile = profileManager.getActiveProfile() || {};
        const provider = activeProfile.provider || 'gemini';
        const model = activeProfile.model || 'gemini-2.0-flash';
        const modelKey = `${provider}:${model}`;

        let allExpertPrompts = await StorageHelper.get(StorageKeys.EXPERT_PROMPTS);
        
        // Defensive check
        if (!allExpertPrompts || typeof allExpertPrompts !== 'object' || Array.isArray(allExpertPrompts)) {
            allExpertPrompts = {};
        }
        
        const isFlat = Object.keys(DEFAULT_PROMPTS).some(key => key in allExpertPrompts);
        let nestedPrompts = isFlat ? { 'default': { ...allExpertPrompts } } : allExpertPrompts;

        const profilePrompts = {};
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
                            notificationService.alert(t('settings.expert.invalidSchema', { key, missing: missing.join(', ') }) || `错误: [${key}] 缺少必需的返回字段: ${missing.join(', ')}。请不要修改 JSON Schema 结构定义。`);
                            hasError = true;
                        }
                    }
                }

                profilePrompts[key] = val;
            }
        });

        if (hasError) return;

        // Strict confirmation - user must type "yes"
        const confirmation = await notificationService.prompt(
            t('settings.expert.riskConfirm') || '请输入 "yes" 确认您已知晓自定义提示词的系统风险并保存配置。',
            '',
            t('common.confirmTitle') || '高风险配置确认'
        );

        if (confirmation !== 'yes') {
            if (confirmation !== null) {
                notificationService.toast(t('settings.expert.cancelSave') || '已取消保存', 'info');
            }
            return;
        }

        nestedPrompts[modelKey] = profilePrompts;
        await StorageHelper.set(StorageKeys.EXPERT_PROMPTS, nestedPrompts);
        notificationService.success(t('settings.expert.saveSuccess') || '自定义提示词实验室配置保存成功！');
        this.close();
    }

    async resetToDefaults() {
        if (!profileManager.settings) {
            await profileManager.load();
        }
        const activeProfile = profileManager.getActiveProfile() || {};
        const provider = activeProfile.provider || 'gemini';
        const model = activeProfile.model || 'gemini-2.0-flash';
        const modelKey = `${provider}:${model}`;

        const confirmed = confirm(t('settings.theme.resetConfirm') || `您确定要重置当前配置到初始默认状态吗？这会抹除当前模型 (${model}) 下的所有自定义改动且无法撤销。`);
        if (!confirmed) return;

        let allExpertPrompts = await StorageHelper.get(StorageKeys.EXPERT_PROMPTS);
        
        if (!allExpertPrompts || typeof allExpertPrompts !== 'object' || Array.isArray(allExpertPrompts)) {
            allExpertPrompts = {};
        }
        
        const isFlat = Object.keys(DEFAULT_PROMPTS).some(key => key in allExpertPrompts);
        let nestedPrompts = isFlat ? { 'default': { ...allExpertPrompts } } : allExpertPrompts;

        nestedPrompts[modelKey] = { ...DEFAULT_PROMPTS };
        await StorageHelper.set(StorageKeys.EXPERT_PROMPTS, nestedPrompts);
        await this.load();
        notificationService.success(t('settings.expert.resetSuccess') || '当前模型提示词实验室配置已重置！');
    }

    close() {
        if (this.element) {
            this.element.remove();
            this.element = null;
            this.overlay = null;
        }
    }
}

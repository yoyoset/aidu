/**
 * SmartRouter
 * Determines the analysis strategy and constructs prompts.
 */
import { getPersonaPrompt } from './persona.js';
export class SmartRouter {
    constructor() {
        this.strategies = {
            1: 'TRANSLATION', // Basic
            2: 'STANDARD',    // Segmentation + POS
            3: 'DEEP'         // + Explanation
        };
        this.teachingStyle = 'casual'; // Default
    }

    setTeachingStyle(style) {
        this.teachingStyle = style;
    }

    selectStrategy(text) {
        // Simplest: Always Standard for now
        return 'STANDARD';
    }

    /**
     * Constructs the message payload for the LLM
     */
    route(draft) {
        const strategyId = draft.analysisMode || 2;
        const sysPrompt = this.getSystemPrompt(strategyId);
        const userPrompt = this.getUserPrompt(draft.rawText);

        return { system: sysPrompt, user: userPrompt };
    }

    getSystemPrompt(mode) {
        // 1. 基础约束 (System Level)
        const baseProtocol = `你是一个专业的英语语言教练。
## 核心约束
- 必须返回纯 JSON，禁止包含 \`\`\`json 标记。
- 所有解释性内容（translation, explanation）必须使用【简体中文】。
- 词性标签 (POS) 仅限使用: [NOUN, VERB, ADJ, ADV, PRON, PREP, CONJ, PART, INTJ, DET, NUM, PUNCT, STOP]。
- 如果输入包含非英文或无意义字符，请在 JSON explanation 中返回说明。`;

        // 2. 模式差异化配置
        const config = {
            1: {
                schema: '{ "sentences": [ { "original_text": "string", "translation": "string" } ] }',
                detail: "仅需拆分句子并翻译。每个句子必须准确、自然地翻译成简体中文。"
            },
            2: {
                schema: '{ "sentences": [ { "original_text": "", "translation": "", "segments": [["phrase", "POS", "lemma"]], "explanation": "" } ] }',
                detail: "简要说明关键语法点或习语，简单句 explanation 返回空字符串。"
            },
            3: {
                schema: '{ "sentences": [ { "original_text": "", "translation": "", "segments": [["phrase", "POS", "lemma"]], "explanation": "" } ] }',
                detail: "深度解析句法结构（时态、从句）、核心词汇用法及语境。Explanation 字段必须使用简体中文。"
            }
        }[mode] || {
            // Default
            schema: '{ "sentences": [ { "original_text": "", "translation": "", "segments": [["phrase", "POS", "lemma"]], "explanation": "" } ] }',
            detail: "简要说明关键语法点或习语。"
        };

        // 3. 关键规则：分词逻辑 (Few-shot 引导) - 仅非翻译模式
        const segmentationRules = mode !== 1 ? `
## 分词规则
1. 颗粒度：优先识别“固定短语” (Phrasal Verbs / Collocations) 而非单纯拆分单词。
2. 标点符号：**务必包含**。句号、逗号等必须作为单独的 [".", "PUNCT", "."] 片段。
3. Lemma 规则：动词提供原形，名词提供单数。Phrasal Verb 的 Lemma 应该是基础形式 (如 "look forward to")。` : "";

        // 4. One-Shot 示例 (仅在非翻译模式开启，显著提升稳定性)
        const example = mode !== 1 ? `
## 示例 (Example)
Input: "He gave up smoking."
Output: {
  "sentences": [{
    "original_text": "He gave up smoking.",
    "translation": "他戒烟了。",
    "segments": [
      ["He", "PRON", "he"],
      ["gave up", "VERB", "give up"],
      ["smoking", "NOUN", "smoke"],
      [".", "PUNCT", "."]
    ],
    "explanation": "gave up 是 give up 的过去式，表示放弃或戒掉某习惯。"
  }]
}` : "";

        const personaPrompt = getPersonaPrompt(this.teachingStyle);

        // 5. 组合最终 Prompt
        return `${baseProtocol}

## 当前任务
${config.detail}
输出 Schema: ${config.schema}
${segmentationRules}
${example}

## 风格偏好
${personaPrompt}`;
    }

    getUserPrompt(text) {
        return `Text to analyze:\n${text}`;
    }
}

export const AnalysisStrategies = {
    TRANSLATION: 1,
    STANDARD: 2,
    DEEP: 3
};

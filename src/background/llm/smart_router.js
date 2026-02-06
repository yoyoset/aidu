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
- 字段 original_text 必须严格保留原文（包括标点符号），严禁重写、纠错或缩略。
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
                schema: '{ "sentences": [ { "original_text": "", "translation": "", "segments": [["phrase", "POS", "lemma"]], "phrasal_verbs": [{"text": "set ... up", "indices": [0, 2], "lemma": "set up", "translation": ""}], "explanation": "" } ] }',
                detail: "简要说明关键语法点或习语，简单句 explanation 返回空字符串。"
            },
            3: {
                schema: '{ "sentences": [ { "original_text": "", "translation": "", "segments": [["phrase", "POS", "lemma"]], "phrasal_verbs": [{"text": "set ... up", "indices": [0, 2], "lemma": "set up", "translation": ""}], "explanation": "" } ] }',
                detail: "深度解析句法结构（时态、从句）、核心词汇用法及语境。Explanation 字段必须使用简体中文。"
            }
        }[mode] || {
            // Default
            schema: '{ "sentences": [ { "original_text": "", "translation": "", "segments": [["phrase", "POS", "lemma"]], "phrasal_verbs": [], "explanation": "" } ] }',
            detail: "简要说明关键语法点或习语。"
        };

        // 3. 关键规则：分词逻辑 (Few-shot 引导) - 仅非翻译模式
        const segmentationRules = mode !== 1 ? `
## 分词与短语索引规则 (Critical)
1. 物理序：\`segments\` 数组必须严格按照原文中的单词出现顺序排列，严禁移动或重组单词。
2. 离散短语 (Discontiguous Phrasal Verbs)：如果短语被其他词分隔（如 "set it up"），不要在 segments 中强行合并。
3. 索引协议：在 \`phrasal_verbs\` 字段中记录离散或紧凑短语的成员：
   - \`indices\`: 记录该短语成员在当前句子 \`segments\` 数组中的 0 基索引位置。
   - \`text\`: 短语在原文中的片段组合（如 "set ... up"）。
   - \`lemma\`: 短语的标准原形。
4. 标点符号：必须作为独立的 ["...", "PUNCT", "..."] 片段。` : "";

        // 4. One-Shot 示例
        const example = mode !== 1 ? `
## 示例 (Example)
Input: "He broke it all up last night."
Output: {
  "sentences": [{
    "original_text": "He broke it all up last night.",
    "translation": "他昨晚把那一切都搞砸了。",
    "segments": [
      ["He", "PRON", "he"],
      ["broke", "VERB", "break"],
      ["it", "PRON", "it"],
      ["all", "DET", "all"],
      ["up", "PART", "up"],
      ["last", "ADJ", "last"],
      ["night", "NOUN", "night"],
      [".", "PUNCT", "."]
    ],
    "phrasal_verbs": [
      {
        "text": "broke ... up",
        "indices": [1, 4],
        "lemma": "break up",
        "translation": "弄碎/终结/搞砸"
      }
    ],
    "explanation": "broke ... up 是 break up 的离散用法，中间插入了受词 it all。"
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

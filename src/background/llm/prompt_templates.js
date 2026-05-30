
import { SENTENCE_SCHEMA } from '../../utils/schema_constants.js';

// Dynamic field names from schema constants
const OT = SENTENCE_SCHEMA.original_text;
const TR = SENTENCE_SCHEMA.translation;
const SG = SENTENCE_SCHEMA.segments;
const PV = SENTENCE_SCHEMA.phrasal_verbs;
const EX = SENTENCE_SCHEMA.explanation;

export const BASE_PROTOCOL = `你现在拥有双重专家身份，请协同工作并输出结果：

## 角色分工
1. **精锐翻译官 (Role A)**: 负责 ${OT}, ${TR}, ${SG}, ${PV} 字段。要求分词精准、索引严丝合缝、翻译符合中文习惯。
2. **教学导师 (Role B)**: 负责 ${EX} 字段。你必须完全代入选定的“风格偏好”角色来撰写给学生的解说。

## 核心技术约束 (Role A 负责)
- 必须返回纯 JSON，禁止包含 \`\`\`json 标记。
- 所有非英语内容必须使用简体中文。
- 词性标签 (POS) 限于：[NOUN, VERB, ADJ, ADV, PRON, PREP, CONJ, PART, INTJ, DET, NUM, PUNCT, STOP]。标点必须作为 PUNCT 独立占位。
- 索引规则：${PV} 的 indices 必须指向 ${SG} 的物理真实下标。`;

export const SEGMENTATION_RULES = `
## 分词与索引规则
1. 物理序：${SG} 必须按单词在原始文本中出现的绝对物理顺序排列。
2. 离散短语：在 ${PV} 中使用 indices 标记（如 ["broke", "up"] -> [1, 4]）。
3. 严禁跳过标点：所有标点符号必须作为独立的 ["...", "PUNCT", "..."] 放入 ${SG} 中，并且必须计算它们的索引位。
4. 索引强制匹配：${PV} 的 indices 必须指向 ${SG} 数组的实际下标。严禁跳过标点符号进行计数。
5. 撇号处理：如 "Earth's" 应拆分为 ["Earth", "NOUN", "earth"] 和 ["'s", "PART", "'s"]，或保持 ["Earth's", "NOUN", "earth"] 但必须与实际分词保持一致。`;

export const EXAMPLES = `
## 示例
Input: "He broke it all up."
Output: {
  "sentences": [{
    "${OT}": "He broke it all up.",
    "${TR}": "他把一切都搞砸了。",
    "${SG}": [["He", "PRON", "he"], ["broke", "VERB", "break"], ["it", "PRON", "it"], ["all", "DET", "all"], ["up", "PART", "up"], [".", "PUNCT", "."]],
    "${PV}": [{"text": "broke ... up", "indices": [1, 4], "lemma": "break up", "translation": "搞砸"}],
    "${EX}": "broke ... up 是 break up 的离散用法。"
  }]
}`;

export const MODE_CONFIGS = {
    2: {
        schema: `{ "sentences": [ { "${OT}": "", "${TR}": "", "${SG}": [["phrase", "POS", "lemma"]], "${PV}": [], "${EX}": "" } ] }`,
        detail: "标准教学逻辑：简要说明核心语法。explanation 仅限1句或留空。追求响应速度。"
    },
    3: {
        schema: `{ "sentences": [ { "${OT}": "", "${TR}": "", "${SG}": [["phrase", "POS", "lemma"]], "${PV}": [], "${EX}": "" } ] }`,
        detail: "深度教学逻辑：解析复杂句法、习语或核心词汇。explanation 必须精炼有力（2句以内）。若句子过于复杂，优先解析最重要的语法结构。"
    }
};

export const DEFAULT_CONFIG = {
    schema: `{ "sentences": [ { "${OT}": "", "${TR}": "" } ] }`,
    detail: "基础翻译模式。"
};

export const TRANSLATION_PROMPT = `You are a professional translator. Output ONLY valid JSON.
Schema: { "sentences": [ { "${OT}": "string", "${TR}": "string" } ] }
Rules:
- Must return pure JSON, no markdown blocks.
- Start with '{' and end with '}'.
- IMPORTANT: The output must be a SINGLE LINE of JSON to minimize latency.
- No whitespace outside of string values.
- Preserve ${OT} exactly (punctuation included).
- Translation must be natural, fluent, and accurate Simplified Chinese.
- NO grammatical analysis or segments needed.
- SPEED IS PRIORITY.`;

export function getSystemPrompt(mode, personaPrompt, expertOverride = null) {
    if (mode === 1) return TRANSLATION_PROMPT;

    const config = MODE_CONFIGS[mode] || DEFAULT_CONFIG;

    // 1. Extract Alignment Fixes from expertOverride if present
    let alignmentFixes = '';
    let cleanedOverride = expertOverride;
    if (expertOverride) {
        const matches = [...expertOverride.matchAll(/\/\* --- START ALIGNMENT FIX --- \*\/([\s\S]*?)\/\* --- END ALIGNMENT FIX --- \*\//g)];
        if (matches.length > 0) {
            alignmentFixes = matches.map(m => m[1].trim()).join('\n');
            cleanedOverride = expertOverride.replace(/\/\* --- START ALIGNMENT FIX --- \*\/[\s\S]*?\/\* --- END ALIGNMENT FIX --- \*\//g, '').trim();
        }
    }

    // 2. Determine Role B teaching instructions
    // Preference: cleanedOverride > personaPrompt > config.detail
    const pedagogicalInstruction = cleanedOverride || personaPrompt || config.detail;

    // 3. Assemble the prompt cleanly with dedicated, prioritized alignment constraints
    let finalPrompt = BASE_PROTOCOL;

    if (alignmentFixes) {
        finalPrompt += `\n\n## 强制对齐修正约束 (Role A & B 共同遵守，最高优先级)\n${alignmentFixes}`;
    }

    finalPrompt += `

## 职责边界
- 在撰写 \`${EX}\` 字段时，你必须严格遵守下方的“教学指令”。
- 角色 A 的技术性分词与索引逻辑不应受到角色 B 讲解风格的影响。

## 教学指令 (由角色 B 执行)
${pedagogicalInstruction}

Output Schema: ${config.schema}
${SEGMENTATION_RULES}
${EXAMPLES}`;

    return finalPrompt;
}

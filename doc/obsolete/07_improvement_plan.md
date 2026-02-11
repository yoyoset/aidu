# [DEPRECATED / �ѹ���]

> [!CAUTION]
> ���ĵ���ӳ���� v4.13.0 ֮ǰ�ľɰ汾����ܹ���������ʷ�ο���
> �����Ȳο� [doc/architecture_v4.13.0.md](architecture_v4.13.0.md)��

---

# 系统改进计划 (Improvement Plan)

基于 `agent_execution_plan.md` 的诊断，以下�?AIDU 2.0 的核心改进方向�?

## 1. 两段式词汇增�?(Two-Tier Vocabulary)

**核心理念**: 区分"使用�? (Tier 1) �?深度记忆�? (Tier 2) 数据�?

### Tier 1: 核心词汇�?(Essential)
- **生成时机**: 建议提取�?**文章分析阶段 (Stage 1)**，LLM 直接输出完整信息�?
- **包含内容**:
  - 音标、词�?
  - 核心释义 (用户常用�?
  - 1-2 例句 (附中�?
  - 3-5 个常用搭�?
- **优势**: 查词与保存操�?**零延�?*�?

### Tier 2: 深度词汇�?(Deep Dive)
- **生成时机**: 用户在阅读或复习时，手动点击 "深度解析"�?
- **包含内容**:
  - 词源故事 (Etymology)
  - 词族变形 (Word Family)
  - 同义�?反义词辨�?
  - 常见错误 & 语域提示
- **优势**: 按需消�?Token，提供私教级深度�?

## 2. 讲解风格个性化 (Teaching Persona)

**目标**: �?AI 的解释不再千篇一律，而是具备"人设"�?

### 风格选项
用户可在设置中选择�?
1. **Academic (学术严谨)**: 适合备考，术语精确�?
2. **Casual (轻松口语)**: 像朋友聊天，多用比喻�?
3. **Humorous (幽默有趣)**: 缓解枯燥，加�?meme 或梗�?
4. **Concise (简洁高�?**: 仅核心信息，无废话�?

### 实现方案
�?`smart_router.js` �?`dictionary_service.js` �?System Prompt 中注�?Persona 描述�?

```javascript
const PERSONA_PROMPTS = {
    humorous: "You are a witty, humorous English teacher...",
    academic: "You are a strict linguistics professor..."
};
```

## 3. 优先级与路线�?

| 优先�?| 任务 | 描述 |
|--------|------|------|
| **P0** | **Prompt 优化** | 修复 Dictionary Service �?"max 12 chars" 的限制�?|
| **P1** | **Tier 1 数据�?* | 改�?Draft Schema，使其在分析阶段包含例句和搭配�?|
| **P2** | **Tier 2 入口** | �?Reader Popover �?Vocab Card 增加 "Deep Dive" 按钮�?|
| **P3** | **Persona UI** | Settings 界面增加风格选择器�?|


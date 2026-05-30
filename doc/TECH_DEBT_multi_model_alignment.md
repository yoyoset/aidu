# 技术债务：多模型数据对齐系统

> **状态**: 待修复 | **优先级**: P1 | **创建日期**: 2026-05-13

---

## 一、背景

AIDU 支持多个 LLM Provider（Gemini、DeepSeek、OpenAI、GLM、自定义/本地模型）。不同模型对同一 Prompt 的 JSON 输出在字段命名、嵌套结构、索引准确性上存在显著差异，导致 UI 渲染异常或数据丢失。

## 二、已实施的变更（需修复）

### 2.1 新增文件

| 文件 | 状态 | 说明 |
|:--|:--|:--|
| `src/background/llm/utils/response_validator.js` | ⚠️ 有缺陷 | 中央数据校验器。有未使用导入 |
| `src/background/llm/utils/response_schema.js` | ⚠️ 有缺陷 | JSON Schema 定义。OpenAI strict 不合规 |
| `src/sidepanel/features/settings/alignment_wizard.js` | 🔴 需重写 | 当前实现方向错误，见第三节 |

### 2.2 修改的文件

| 文件 | 变更内容 | 状态 |
|:--|:--|:--|
| `execution_engine.js` | 引入 ResponseValidator，新增 mode 参数 | ⚠️ strategyId 未透传（L72） |
| `draft_processor.js` | normalizeSentence 委托给 ResponseValidator | ⚠️ 双重归一化冗余 |
| `atomic_block.js` | 移除索引修复逻辑至数据层 | ✅ 正确 |
| `gemini_provider.js` | 增加 response_schema | ⚠️ minItems/maxItems 兼容性 |
| `openai_compatible.js` | OpenAI/DeepSeek 启用 json_schema+strict | ⚠️ Schema 不合规会 400 |
| `api_client.js` | 透传 providerOptions | ✅ 正确 |
| `expert_prompts_modal.js` | 增加 Auto-Align 按钮 | 🔴 未 import wizard，点击崩溃 |

---

## 三、待修复缺陷清单

### 🔴 阻断性 (Blocker)

#### B1: `strategyId` 未透传
- **位置**: `execution_engine.js` L72
- **现象**: `processChunk` 的 `mode` 始终为 `undefined`，导致 Schema 约束和 Validator 模式判断全部失效
- **修复**:
```diff
+ const strategyId = draft.analysisMode || 2;
  // ...
- const result = await this.processChunk(chunkText, systemPrompt, i, rawChunks.length);
+ const result = await this.processChunk(chunkText, systemPrompt, i, rawChunks.length, strategyId);
```

#### B2: `ExpertPromptsModal` 缺少 wizard 导入和实例化
- **位置**: `expert_prompts_modal.js` L1-L7, L93-L97
- **现象**: 点击 Auto-Align 按钮 → `this.wizard` 为 `undefined` → TypeError 崩溃
- **修复**: 添加 `import { AlignmentWizard }` 和 `this.wizard = new AlignmentWizard()`

#### B3: OpenAI `strict` 模式 Schema 不合规
- **位置**: `response_schema.js`
- **现象**: 缺少 `additionalProperties: false`，缺少完整 `required`，OpenAI API 返回 400
- **修复**: 为所有对象层级添加 `additionalProperties: false` 和完整的 `required` 数组

### 🟡 非阻断性

#### N1: `ResponseValidator` 未使用导入
- **位置**: `response_validator.js` L1
- **修复**: 移除 `SEGMENT_FIELDS` 导入

#### N2: `response_schema.js` 使用 `minItems`/`maxItems`
- **现象**: Gemini 支持不稳定，OpenAI strict 不支持
- **修复**: 移除这些关键字，在 ResponseValidator 后置处理

#### N3: 双重归一化冗余
- **位置**: `ExecutionEngine.processChunk` 和 `DraftProcessor.applyChunkResult` 各执行一次归一化
- **修复**: 在 `applyChunkResult` 中检查 `result._metadata` 跳过已验证数据

---

## 四、AlignmentWizard 重新设计

### 4.1 原方案问题

当前实现将"采样"和"分析修复"都放在扩展内部，用同一个模型自我分析。

### 4.2 正确的设计意图

AlignmentWizard 是一个**提示词工程工作台**，核心流程：

```
取样本 → 导出诊断包 → 用户拿到外部更强AI分析 → 拿回修正提示词 → 粘贴回来 → 无需编译即生效
```

### 4.3 v2 设计规格

**功能 A: 取样**
- 用户点击「诊断当前模型」按钮
- 系统发送标准探测文本到当前模型
- 在 UI 中展示原始输出（可展开/折叠）

**功能 B: 导出诊断包**
- 一键复制到剪贴板，内容包含：
  1. 标准 Schema（期望的数据结构）
  2. 实际输出（模型返回的原始数据）
  3. 分析指引（指导外部 AI 如何分析差异并生成修正提示词）
- 用户粘贴到 ChatGPT/Claude 网页版等更强大的 AI 中

**功能 C: 应用修正**
- 用户将外部 AI 生成的修正提示词粘贴回 Expert Prompts 的 textarea
- 保存后立即生效，无需重新编译扩展

**功能 D: 迭代验证**
- 可重复执行「取样」来验证修正效果
- 如果仍有问题，再次导出、调整、粘贴，形成快速迭代闭环

### 4.4 关键设计约束

- 扩展内部**不做** AI 分析（不再有第二次 API 调用）
- 诊断包的格式应该对外部 AI 友好（清晰的标记、简洁的指引）
- 保留确定性的本地预检（如字段名别名检测），作为辅助信息附在诊断包中

---

## 五、数据流架构（修正后目标状态）

```
用户输入文本
    ↓
TextChunker (分块)
    ↓
SmartRouter (组装提示词 + 确定 mode)
    ↓
ApiClient (透传 mode)
    ↓
Provider (尝试 response_schema → 降级 json_object → 降级纯文本)
    ↓
JsonCleaner (修复截断/markdown)
    ↓
JSON.parse
    ↓
ResponseValidator (别名映射 + POS规范化 + 索引修复)
    ↓
DraftProcessor (聚合/展平，跳过已验证数据)
    ↓
Storage → AtomicBlock (纯渲染，无修复逻辑)
```

---

## 六、执行优先级

```
P0 (立即): 修复 B1 B2 B3 — 否则扩展无法正常工作
P1 (近期): 修复 N1 N2 N3 — 代码卫生和性能
P2 (规划): 重写 AlignmentWizard v2 — 提示词工程工作台
P3 (待定): 降级策略 — json_schema → json_object → 纯文本 fallback
```

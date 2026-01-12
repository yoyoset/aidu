# 10. 开发规范 (Development Standards)

## 10.1 代码质量 (Code Quality)
- **规模限制**: 单文件 < 600 行。超过限制必须重构拆分。
- **命名**: 变量名需具备语义 (例如 `isProcessing` vs `flag`).
- **注释**: 复杂逻辑需包含 `/** JSDoc */` 注释，解释 "Why" 而非 "What".

## 10.2 上下文与流程 (Context & Process)
- **状态管理**: 使用状态机管理异步流程。
- **幂等性**: 所有数据处理函数应具备幂等性 (Idempotent)。

## 10.3 渲染一致性 (Rendering Consistency)
- **CSS优先**: 样式变更优先通过 CSS Class 切换，避免行内样式操作。
- **可还原**: UI 状态必须可由数据完全还原 (Rehydration)。

## 10.4 前端命名规范 (Frontend Naming Conventions)
为了避免变量作用域混淆 (Variable Shadowing) 和引用错误，所有 DOM 元素变量必须遵循以下匈牙利命名法变体：

### 10.4.1 DOM 变量后缀 (DOM Variable Suffixes)
变量名必须包含语义化后缀，禁止使用通用单次 (如 `content`, `item`, `data`)。

*   **容器类**: `~Container`, `~Wrapper`, `~Col` (Column), `~Row`, `~Area`.
    *   ❌ `const content = ...`
    *   ✅ `const contentCol = ...` (明确是列容器)
    *   ✅ `const mainWrapper = ...`
*   **控件类**: `~Btn`, `~Input`, `~Select`, `~Checkbox`.
    *   ❌ `const save = ...`
    *   ✅ `const saveBtn = ...`
*   **文本类**: `~Title`, `~Label`, `~Text`, `~Badge`.
    *   ✅ `const statusBadge = ...`

### 10.4.2 作用域安全 (Scope Safety)
*   **禁止重用**: 禁止在同一函数内重用变量名 (e.g. `let item` loop inside `const item`).
*   **显式所有权**: `appendChild` 时，父元素变量名必须清晰 (e.g. `contentCol.appendChild` vs `parent.appendChild`).

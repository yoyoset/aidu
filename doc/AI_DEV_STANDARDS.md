# 前端重构与解耦标准作业程序 (SOP)

为了避免在模块解耦和重构过程中出现样式失效、逻辑断层等问题，所有重构任务必须遵循以下标准化准备流程。

## 1. 规范先行 (The North Star)

在改动任何代码前，必须先确定最终的目标状态。

### CSS 命名规范

* **文件命名**：使用 `snake_case` 或 `kebab-case`（如 `dashboard_layout.module.css`）。
* **类名命名**：强制统一使用 **`kebab-case`**（如 `.btn-primary`，`.nav-item`）。
* **JS 引用规范**：即使构建工具支持自动转换，JS 中必须统一使用 **Bracket Notation**：

    ```javascript
    // ✅ 正确
    className={styles['btn-primary']}
    
    // ❌ 错误（易在重构中丢失映射）
    className={styles.btnPrimary}
    ```

### 目录分层规范

* `components/`：存放纯 UI 组件（无状态或仅有 UI 状态）。
* `handlers/` 或 `services/`：存放业务逻辑、API 调用。
* `styles/`：存放 CSS Modules 文件。

## 2. 建立“依赖审计地图” (Audit & Mapping)

在拆分一个 Monolithic（巨石型）文件前，先认清它的边界：

* **引用审计**：找出所有引用该文件的外部文件。例如，拆分 `dashboard.module.css` 前，需列出 `VocabView.js`, `VocabItem.js` 等所有依赖它的文件。
* **动态类名清单**：统计旧 CSS 文件中哪些类名是被 JS 动态拼接的。
  * 风险点：`styles['status-' + draft.status]`
  * 应对：在 CSS 文件中显式保留所有动态变体（如 `.status-draft`, `.status-ready`）。

## 3. 增量迁移策略 (The Shim Strategy)

**严禁**直接删除旧文件。

1. **创建新文件**：创建新文件（如 `layout.module.css`），将样式搬过去。
2. **保留旧映射**：在过渡期，旧文件保留映射关系，或者在 JS 里临时同时导入新旧两个样式对象。
3. **逐个替换**：逐个组件替换引用，每替换一个就验证一个，而不是最后一起验证。

## 4. 关键 UI 路径清单 (Smoke Test Checklist)

在重构提交前，必须验证以下核心场景：

* [ ] **布局完整性**：所有容器是否居中？是否有意外的滚动条？
* [ ] **交互反馈**：鼠标悬停（Hover）、点击（Active）状态是否正常？
* [ ] **弹窗与覆盖层**：模态框是否能正常弹出且背景遮罩层级正确？
* [ ] **图标显隐**：RemixIcon 或其他图标库是否正常加载？

## 5. 防御性编程

为了避免 `undefined` 导致的白屏或无样式：

* **防御性变量引用**：

    ```javascript
    // 即使 styles 没加载成功，也不会报错，且容易定位问题
    const className = styles['btn-primary'] || 'btn-fallback-missing';
    ```

* **工具辅助**：安装支持 CSS Modules 自动补全的 IDE 插件，利用静态检查发现死链。

## 6. 自动化校验

* **预构建检查**：在每个 Checkpoint，运行 `npm run build`。生产构建能发现开发环境忽略的路径错误。
* **Lint 规则**：配置 Stylelint，强制要求所有类名符合 `kebab-case`。

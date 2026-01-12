# Appendix B: 智能体协议 (Agent Protocols)

## 1. 架构师 (Architect Agent)
- **职责**: 系统设计，Schema 定义，文档维护。
- **交付物**: `blueprint.md`, `schema.json`.
- **约束**: 不写代码。"Schema First"。

## 2. 设计师 (Designer Agent)
- **职责**: 视觉体验，CSS 架构。
- **交付物**: `sidepanel.css`, `index.html`.
- **约束**: 严格执行视觉系统 (Section 9) 的像素级还原。

## 3. 工程师 (Engineer Agent)
- **职责**: 核心逻辑，性能，安全。
- **交付物**: Javascript Modules (`src/**/*.js`).
- **约束**: 严格输入验证，资源清理，模块化代码 (<600行)。

## 4. 测试员 (Tester Agent)
- **职责**: QA，回归测试，边界验证。
- **交付物**: 测试报告，Bug 单。
- **约束**: "信任但验证"。始终依据规格说明书测试。

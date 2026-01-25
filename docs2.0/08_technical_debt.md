# 技术债务清单 (Technical Debt)

本文档记录已知的技术债务和待优化项，按优先级排序。

---

## 🟡 低优先级 (Low Priority)

### TD-001: Deep Dive Modal 样式内联实现
**创建日期**: 2026-01-19  
**来源**: v4.4.0 两段式词汇系统实现  
**位置**: `src/sidepanel/features/vocab/vocab_view.js` L671-773

**问题描述**:  
`showDeepDiveModal` 方法使用 `Object.assign(element.style, {...})` 内联样式，未遵循项目 CSS 模块化规范。

**计划方案**:
```diff
- Object.assign(modal.style, { position: 'fixed', ... });
+ modal.className = styles.deepDiveModal;
```

**涉及文件**:
- `vocab_view.js`: 重构为使用 CSS 类
- `dashboard.module.css`: 添加 `.deepDiveModal` 样式

**影响**: 无功能影响，仅代码一致性问题

**优先级理由**: 样式可用，无 Bug，可延后至下一轮重构

---

## ✅ 已解决 (Resolved)

| ID | 描述 | 解决版本 | 日期 |
|----|------|----------|------|
| - | - | - | - |

---

## 债务统计
- **总计**: 1 项
- **高优先级**: 0
- **中优先级**: 0
- **低优先级**: 1

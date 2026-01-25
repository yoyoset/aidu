# UI 组件映射表

本文档列出了 `src/sidepanel/` 下的关键 UI 组件及其职责。

## Builder 模块 (`features/builder/`)
| 文件 | 类型 | 职责 |
|------|------|------|
| `preparation_dashboard.js` | Component | 主面板逻辑，草稿列表与进度展示 |
| `creator_modal.js` | Component | 新建/编辑草稿弹窗 |
| `components/draft_item.js` | Sub-Component | 草稿列表项 |
| `dashboard.module.css` | Style | 主面板样式 |
| `creator.module.css` | Style | 创建弹窗样式 |

## Reader 模块 (`features/reader/`)
| 文件 | 类型 | 职责 |
|------|------|------|
| `reader_view.js` | Component | 文章渲染引擎，处理点击事件 |
| `reader_dictionary.js` | Logic/UI | 查词弹窗控制器 (Popover) |
| `reader_audio.js` | Feature | 句子朗读与音频控制 |
| `reader.module.css` | Style | 阅读器与气泡样式 |

## Vocab 模块 (`features/vocab/`)
| 文件 | 类型 | 职责 |
|------|------|------|
| `vocab_view.js` | Component | 生词列表展示 |
| `vocab_review.js` | Component | SRS 复习卡片界面 |
| `handwriting_sheet.js` | Feature | 生成字帖功能 |

## Settings 模块 (`features/settings/`)
| 文件 | 类型 | 职责 |
|------|------|------|
| `settings_modal.js` | Component | 设置弹窗逻辑 |
| `settings.module.css` | Style | 设置界面样式 |

## 通用组件 (`components/`)
| 文件 | 类型 | 职责 |
|------|------|------|
| `component.js` | Base | 基础组件类 |
| `confirmation_modal.js` | Component | 通用确认对话框 |

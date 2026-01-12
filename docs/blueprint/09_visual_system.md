# 9. 视觉系统 (Visual System) [4x4 Matrix]
本系统定义了 AIDE 的核心视觉规范，确保视觉一致性与可访问性。

## 9.1 气泡样式 (Bubble Styles)
1.  **Standard**: `#e8f5e9` (背景), `#1b5e20` (文字) - 默认阅读状态。
2.  **Outline**: `transparent` (背景), `#4caf50` (边框) - 低干扰模式。
3.  **Active**: `#2e7d32` (背景), `#ffffff` (文字) - 交互激活态。
4.  **Ghost**: `transparent` (背景), `dashed #bdbdbd` (边框) - 仅 Hover 显示。

## 9.2 高亮体系 (Highlighting)
1.  **Karaoke**: `#fff9c4` (淡黄) - TTS 播放进度。
2.  **Cursor**: `border-bottom: 2px solid #2196f3` - 鼠标跟随。
3.  **Selection**: `::selection { background: #b3d4fc }` - 系统级选中。
4.  **Review**: `#ffcc80` (橙色) - SRS 复习提示。

## 9.3 词汇状态 (Vocabulary Status)
1.  **New (❤️)**: 生词，未收录。
2.  **Learning (🟡)**: 复习队列中。
3.  **Mastered (Shielded)**: 已掌握，视觉屏蔽。
4.  **Ignored (Stop)**: 停用词，无交互。

## 9.4 辅助标记 (Underline Styles)
1.  **Phrase**: `solid` - 词组连线。
2.  **Grammar**: `wavy` - 语法重点。
3.  **Entity**: `double` - 专有名词。
4.  **Dotted**: `dotted` - 弱强调。

## 9.5 沉浸式阅读器 (Immersive Reader)

阅读器采用 **Atomic Block Stack (原子块堆叠)** 架构，确保最佳的阅读节奏与交互响应。

#### 9.5.1 视觉结构 (Visual Structure)
- **Container**: 垂直滚动的无限流容器。
- **Atomic Block**: 每个句子作为一个独立的原子块 (Sentence Block)。
    - **Original Text**: 上方显示原文，单词为独立交互单元 (Bubble)。
    - **Translation**: 下方显示译文，颜色较淡，提供辅助理解。
    - **Controls**: 右侧/左侧包含播放按钮 (Play/Pause) 和状态指示。
    - **Highlight**: 当前正在朗读的句子背景高亮，当前朗读单词加粗/变色。

#### 9.5.2 气泡交互 (Bubble Interaction)
每个单词 (Bubble) 具备以下状态：
- **Normal**: 普通文本显示。
- **Hover**: 微微浮起，暗示可点击。
- **Active (Popover)**: 点击后弹出多功能托盘 (Tray/Popover)。
    - **Content**: 显示音标 (Phonetic)、释义 (Sense)、词性 (POS)。
    - **Action**: "Add to Vocab" 按钮，点击触发加入生词本动画。
- **Stop Words**: 标记为 `STOP` 的单词 (is/the) 不响应点击 (或仅显示极简信息)，减少干扰。

#### 9.5.3 错误与降级 (Fault Tolerance)
- **Dirty Data**: 如果 Draft 数据缺失某些字段 (如无 segments)，气泡退化为不可点击的纯文本，保证阅读不中断。
- **Partial Read**: 支持渲染正在 Processing 中的不完整数据 (自动补全结尾 ...)。

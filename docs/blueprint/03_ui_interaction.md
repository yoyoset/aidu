# 3. 核心模块：UI 与交互 (Module B: UI & Interaction)

本模块实现 MVC 架构中的 View 与 Controller 层，负责数据渲染与用户指令响应。

## 3.1 侧边栏布局 (Sidepanel Layout)
- **容器**: Flexbox 布局，分为 `Header` (吸顶), `Content` (滚动), `Footer` (吸底).
- **组件生命周期**: `init()` -> `bindEvents()` -> `render()` -> `destroy()`.
- **内存管理**: `destroy()` 方法必须显式移除 Event Listeners 和 Observers。

## 3.2 准备仪表盘 (Preparation Dashboard)
- **目标**: 提供 Analysis Pipeline 的可视化干预接口。
- **交互**: 支持拖拽合并 (Merge Down) 和快捷键操作 (Enter 启动).

### 3.2.1 入口策略 (Entry Points)
1.  **扩展图标 (Extension Icon)**: 点击打开 Sidepanel，进入 Dashboard。
2.  **全局右键菜单 (Global Context Menu)**:
    *   **Context**: Page (无选中内容时).
    *   **Label**: "Open AIDU Dashboard".
    *   **Action**: 打开 Sidepanel，进入 Dashboard。
3.  **选中右键菜单 (Selection Context Menu)**:
    *   **Context**: Selection (选中内容时).
    *   **Label**: "Save to AIDU Library".
    *   **Action**: **Silent Save (静默保存)**。不打开 Sidepanel，直接后台创建 Draft (Raw Meat)，并在图标上显示 "OK" 或 "Saved" 徽标反馈（如有权限）。

### 3.2.3 Draft Creator Modal
**Entry**: Dashboard 顶部 "**+**" 按钮 或 Draft Item 的 "**✏️**" 按钮。
**Tabs**:
- **Text Tab (Default)**: Raw Text 输入。
- **JSON Tab**: 外部 LLM 生成的 JSON 导入。
**Context-Aware Actions**:
- **Create Mode (新建)**:
    - **Primary**: "Analyze Now" (Start Pipeline).
    - **Secondary**: "Save Draft" (Save to Library).
- **Edit Mode (编辑)**:
    - **Primary**: "Update & Analyze" (Restart Pipeline).
    - **Secondary**: "Save Changes" (Update Library).

## 3.4 UI 实现策略 (Implementation Strategy)
**原则**: 静态结构，动态状态。
- **HTML**: 所有主要的模态框 (Modals)、面板 (Panels) 结构必须在 `index.html` 中预定义。
- **CSS**: 使用 CSS Modules (e.g. `dashboard.module.css`) 管理组件样式，实现样式隔离。
- **安全**: 严禁使用 `innerHTML` 渲染用户生成内容 (UGC)，必须使用 `textContent` 或 `Sanitizer` API。

## 3.5 控制器架构 (Controller Architecture)
**模式**: Mediator / Coordinator.
- **Controller (`index.js`)**: 应用入口，负责初始化子模块依赖注入 (Dependency Injection)。
- **MessageRouter**: 负责 Service Worker 与 UI 线程的 IPC 通信。
- **Sub-Controllers**: `Renderer`, `DraftUI`, `ReviewUI` 负责具体业务逻辑，互不直接依赖。

## 3.6 新增 UI 功能 (UI Expansion) [v4.1]
## 3.6 新增 UI 功能 (UI Expansion) [v4.1]
- **设置模态框 (Settings Modal)**:
    - **Header**: Profile Selector (Default / + Create New).
    - **Provider Configuration**:
        - **Provider**: Selector (DeepSeek, Gemini, OpenAI, Custom).
        - **Base URL**: Input (Auto-fill default, editable for proxy).
        - **Model ID**: ComboBox with presets (e.g., `deepseek-chat`, `gemini-1.5-pro`) but editable.
        - **API Key**: Password Input (Local encrypted).
    - **Analysis Configuration**:
        - **Real-time Mode**: 3-State Toggle (Translation / Standard / Deep) - For text selection.
        - **Builder Mode**: 3-State Toggle (Translation / Standard / Deep) - For background article processing.
        - **Note**: Modes map to strategy definitions in Module 2.3.
    - **Header**: Editable Profile Name.
    - **Action**: Save Profile / Delete Profile.
- **导入/导出 (Import/Export)**:
    - **位置**: Dashboard Header (Icon Buttons).
    - **Export**: 导出所有 draft 为 `aidu_drafts_Backup.json`.
    - **Import**: 读取 JSON，根据 `draft.id` 去重 (Skip duplicates)，刷新列表。
- **创作入口 (Draft Creator Modal)**:
    - **Trigger**: Dashboard 顶部 "**+**" 按钮。
    - **Tab A: New Material (新建素材)**:
        - **Label**: "Content Source"
        - **Input**: Title (Optional), Content (Textarea).
        - **Action 1: Save Draft**: 存入 `Drafts` 列表 (Status: draft)。
        - **Action 2: Analyze Now**: 存入并立即触发分析 (Status: processing)。
    - **Tab B: Import Result (导入结果)**:
        - **Label**: "Data Import"
        - **Helper**: "Smart Recipe" (Copy Prompt + Optional Content).
        - **Input**: JSON Payload.
        - **Action**: Import & Render (Status: ready).

- **仪表盘视图 (Dashboard Views)**:
    - **View 1: Library (素材库)**: 展示 `status: draft`。等待分析。
        - **Actions**: **Edit** (Modify content), **Delete** (Remove), **Start Analysis**.
        - **Merge Strategy (Collection Mode)**:
            - **Scenario**: 用户通过 "Silent Save" 收集多个片段 (e.g., Chapter 1, Chapter 2).
            - **Interaction**: 支持 **Drag & Drop** (拖拽 A 到 B) 或 **Multi-Select** (复选框) 进行合并。
            - **Result**: 合并为一个新 Draft，Title 自动拼接或重命名，Raw Text 使用 **双换行 (`\n\n`)** 连接。
    - **View 2: Processing (处理中)**: 展示 `status: processing`。实时进度。
    - **View 3: Completed (已完成)**: 展示 `status: ready`。点击阅读。
    - **Navigation**: 顶部 Tabs: `Library` | `Processing` | `Completed`。
- **草稿编辑器 (Draft Editor)**: 允许用户修正识别错误的文本。

# 6. 功能模块 (Module E: Features)

## 6.1 间隔复习 (SRS)
- **算法**: Leitner System (5-Box Method).
- **调度器**: 基于上次复习时间和当前 Box Level 计算下次复习时间。

## 6.2 语音合成 (TTS)
- **引擎**: Chrome TTS API 优先，Web Speech API 为各种 Fallback。
- **同步**: 支持句子级 (Sentence-level) 和单词级 (Word-level) 的高亮同步。

## 6.3 历史归档 (Archive)
- **管理**: 支持 JSON 格式的导出与导入，用于跨设备迁移。
- **CRUD**: 提供标准的 Create/Read/Update/Delete 接口。

## 6.4 词汇管理 (Vocabulary Manager)
- **状态**: `Hidden` (已掌握) vs `Shown` (学习中).
- **同步**: 词汇表变更通过 `StorageHelper` 实时广播至所有活跃 Tab 的 Renderer。

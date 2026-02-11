# AIDU: Adaptive Immersive Deep English (AIDE) Assistant

<div align="center">
  <img src="src/icons/icon128.png" alt="AIDU Logo" width="80"/>
  <h3><b>AIDU</b> - Your Intelligent AI Reading Tutor</h3>
  <p><i>Transform any web content into a structured, personalized language-learning experience.</i></p>

  <p>
    <img src="https://img.shields.io/badge/version-4.15.5-blue.svg?style=flat-square" alt="Version" />
    <img src="https://img.shields.io/badge/license-MIT-green.svg?style=flat-square" alt="License" />
    <img src="https://img.shields.io/badge/Manifest-V3-orange.svg?style=flat-square" alt="Manifest V3" />
    <img src="https://img.shields.io/badge/Engine-Vite%20%2B%20Vello-8A2BE2?style=flat-square" alt="Tech Stack" />
  </p>

  [English](#english) • [简体中文](#简体中文)
</div>

---

## English

### 🌟 Vision

AIDU is not just a translator; it is a **Full-Lifecycle Reading Tutor**. Built for serious learners and young students alike, it focuses on **Context-Aware Mastery** rather than superficial dictionary definitions. AIDU bridges the gap between passive consumption and active retention.

### 🚀 Core Pillars

#### 1. 🧠 Intelligent Context Analysis

- **Dynamic Persona**: AI adopts specific teaching styles (e.g., *Primary School*, *Humorous*) to explain nuances.
- **Phrase Detection**: Automatically identifies and explains phrasal verbs that standard translators miss.
- **Dual-Identity Engine**: Separates technical translation from educational pedagogy for superior explanation quality.

#### 2. 📚 Retention-First Vocabulary

- **Sentence-First Capture**: Every word is saved with its original context—never in isolation.
- **AI Magic Wand (🪄)**: Generate creative, contextually relevant example sentences for any word.
- **FSRS Algorithm**: Powered by advanced spaced-repetition logic for long-term memory optimization.

#### 3. 🛡️ Data & Privacy Sovereignty

- **Local-First Architecture**: Your reading history and vocabulary live in your browser, not our servers.
- **Universal Cloud Sync**: Seamlessly sync across devices via **GitHub Gist** or high-speed **Cloudflare Workers**.
- **Full Data Portability**: Import/Export everything as standardized JSON.

### 🛠️ Quick Start

#### Install via Release (Recommended)

1. Download `dist.zip` from the [Releases](../../releases) page.
2. Unzip the file to a local directory.
3. Open `chrome://extensions/` in Chrome and enable **Developer Mode**.
4. Click **Load unpacked** and select the unzipped folder.

#### Build from Source

```bash
git clone https://github.com/yoyoset/aidu.git
cd aidu
npm install
npm run build
```

### 📖 Documentation Index

- [System Architecture (Manifest)](doc/AI_SYSTEM_MANIFEST.md)
- [Data Protocols & Schemas](doc/AI_DATA_PROTOCOLS.md)
- [Cloudflare Sync Deployment](doc/sync_guide_cloudflare_zh.md)
- [Privacy Policy (Bilingual)](doc/privacy_policy_zh.md)

---

## 简体中文

### 🌟 愿景

AIDU 不仅仅是一个翻译器，它是一个**全周期的阅读导师**。专为深度学习者和学生打造，强调**语境式掌握**而非死记硬背。AIDU 通过 AI 技术将碎片化的阅读转变为结构化的知识积累。

### 🚀 核心价值

#### 1. 🧠 深度语义分析 (AI 阅读助手)

- **多变讲解风格**: 支持“小学模式”、“幽默风”等多种教学身份，让复杂的文本变得亲切易懂。
- **短语自动捕捉**: 自动识别标准翻译容易漏掉的动词短语与固定搭配。
- **双引擎重构**: 独立处理“技术翻译”与“教学解说”，确保每个词的来源都有据可查。

#### 2. 📚 语境化词汇构建 (生词本)

- **拒绝孤立记忆**: 每个单词都紧跟阅读原句，记忆在鲜活的语境中发生。
- **AI 魔法棒 (🪄)**: 即使查词时没有例句，AI 也能瞬间为您生成极具创意的专属例句。
- **科学记忆排程**: 内置 FSRS 复习算法，根据您的记忆强度自动生成复习计划。

#### 3. 🛡️ 数据主权与隐私

- **本地化架构**: 您的所有阅读数据和词汇量都在本地存储，我们不持有任何用户敏感信息。
- **极速云同步**: 支持 **GitHub Gist** 或 **Cloudflare Workers** 自定义同步，速度由您做主。
- **隐私合规**: 极简权限申请，完全支持 JSON 数据的一键导入/导出。

### 🛠️ 快速安装

#### 下载安装 (推荐)

1. 前往 [Releases](../../releases) 页面下载最新的 `dist.zip`。
2. 将压缩包解压到本地文件夹。
3. 在 Chrome 中打开 `chrome://extensions/`，开启右上角的**开发者模式**。
4. 点击左上角的**加载已解压的扩展程序**，选择刚才解压的文件夹。

---

## 📄 License

Released under the [MIT License](LICENSE).  
© 2026 SquareUncle 方砖叔.  
[squareuncle.com](https://squareuncle.com)

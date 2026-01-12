# Aidu (AI-Driven Utility for Reading & Vocabulary)

<div align="center">
  <img src="docs/icon_128.png" alt="Aidu Logo" width="100"/>
  <br>
  <em>Your All-in-One AI Reading Assistant & Vocabulary Builder</em>
  <br>
  <strong>Reading • Translation • Vocabulary • Spaced Repetition</strong>
</div>

<br>

<div align="center">

[English](#english) | [中文 (Chinese)](#中文)

</div>

---

<br>

## English

### 📖 Introduction
Aidu is a powerful Chrome Extension designed to bridge the gap between casual reading and serious language learning. By leveraging advanced LLMs (Gemini, DeepSeek, OpenAI), Aidu transforms any web article into an interactive learning resource.

### ✨ Key Features (核心功能)

#### 1. 🧠 Intelligent Reading Tutor (你的 AI 私教)
*   **Context-Aware Explanations**: Unlike Google Translate, Aidu acts as a tutor. It explains the *nuance* of words in their specific context rather than just giving a dictionary definition.
*   **Interactive Learning**: Click any word while reading to get an instant, context-rich explanation.
*   **Simple Management**: Easily organize and "clean up" your reading list.

#### 2. 🤖 Flexible AI Core
*   **Multi-Model Support**: Switch between Gemini, DeepSeek, or OpenAI to find the best "teacher" for you.
*   **Customizable Prompts**: You decide how the AI teaches—whether you want simple definitions for kids or detailed etymology for advanced learners.

#### 3. 📚 Vocabulary & Context (生词本与语境)
*   **Sentence Capture**: Words are never saved alone. Aidu captures the *exact sentence* where you found the word, ensuring you learn it in context.
*   **Magic Wand (🪄)**: If a word is missing a sentence, the AI automatically generates a unique, creative example to help you understand it.
*   **Management Tools**: Batch delete, export, and manage your vocabulary list efficiently.

#### 4. 📉 Memory Reinforcement (记忆强化)
*   **Spaced Repetition (SRS)**: Built-in algorithm (similar to Anki) schedules reviews at the perfect time to prevent forgetting.
*   **Cram Mode (突击复习)**: Focused review sessions for specific batches of words.
*   **Mastery Tracking**: Mark words as "Mastered" to see your library grow.

### 🛠️ Installation (安装指南)

**Method 1: Ready-to-Use (Recommended for Most Users)**
1.  Go to the [Releases](../../releases) page.
2.  Download the latest `dist.zip` file.
3.  Unzip it to a folder on your computer.
4.  Load into Chrome:
    *   Open `chrome://extensions/`
    *   Turn on **Developer mode** (top right switch).
    *   Click **Load unpacked** (top left).
    *   Select the folder you just unzipped.

**Method 2: Developers (Build from Source)**
For those who want to modify the code:
1.  Clone repo: `git clone ...`
2.  Install: `npm install`
3.  Build: `npm run build`

### 🚀 Usage

1.  **Setup**: Click the extension icon -> Settings ⚙️ -> Enter your API Key.
2.  **Save**: Right-click any article page -> "Save to Aidu".
3.  **Learn**: Open the Side Panel to read, click words to learn, and review your vocabulary.

---

<br>

## 中文

### 📖 项目背景 (Project Background)
本项目最初的开发初衷是**为小朋友打造一款"英语阅读私教"**。

市面上的翻译插件多是"生硬的翻译"，对于处于语言学习关键期的孩子来说，我更希望有一个**"AI 陪伴者"**。它不只是把英文变成中文，而是像老师一样，**结合上下文**讲解单词的含义、用法和细微差别。

我自己也在日常使用这个工具，觉得对**英语学习者**非常有帮助，所以开源出来。希望能得到大家的建议，也欢迎更多朋友一起交流、完善它！

它不是简单的查词工具，而是一个完整的**阅读-积累-复习**闭环系统。

### ✨ 核心亮点

#### 1. � 你的 AI 阅读私教
*   **语境解说**: 它不会扔给你一个冷冰冰的字典释义，而是结合当前文章的上下文，告诉你这个词在这里究竟是什么意思。
*   **交互式学习**: 阅读时遇到不懂的词，点一下即可获得 AI 的详细讲解。

#### 2. 📚 拒绝孤立背单词 (Vocabulary)
*   **原句记忆**: 所有的生词都会自动带上它所在的**原句**。你记忆的不是一个孤立的符号，而是一个鲜活的用法。
*   **魔法棒 (🪄)**: 如果单词没有例句，AI "魔法棒" 会自动生成一个富有创意、独一无二的例句，帮助你理解。
*   **高效管理**: 支持批量清理、导出，让生词本井井有条。

#### 3. 📉 科学复习 (SRS System)
*   **智能排程**: 内置间隔重复算法 (类似 Anki)，自动安排复习时间，抗遗忘。
*   **可视化进度**: 清晰展示"已掌握"的词汇量，让进步看得见。

#### 4. 🤖 自由的 AI 内核
*   **多模型切换**: 支持 Gemini / DeepSeek / OpenAI。想用谁教你，你自己说了算。
*   **自定义提示词**: 你可以调整 AI 的"教学风格"，是适合儿童的简单解释，还是适合考研的深度解析，完全自定义。

### 🛠️ 安装说明

**方法 1: 直接下载 (推荐普通用户)**
1.  前往本项目的 [Releases](../../releases) 页面。
2.  下载最新的 `dist.zip` 压缩包。
3.  解压到一个文件夹。
4.  安装到 Chrome:
    *   在浏览器地址栏输入 `chrome://extensions/` 并回车。
    *   打开右上角的 **开发者模式 (Developer mode)** 开关。
    *   点击左上角的 **加载已解压的扩展程序 (Load unpacked)**。
    *   选择您刚才解压的文件夹。

**方法 2: 开发者自行编译**
如果您想修改代码：
1.  克隆项目
2.  `npm install`
3.  `npm run build`
4.  加载 `dist` 目录

---

## 📄 License
MIT License © 2026 Aidu Project
